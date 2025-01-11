import os
import json
import logging
import pandas as pd
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pytrends.request import TrendReq
import google.generativeai as genai
from PIL import Image
import io
import re
from dotenv import load_dotenv
import signal
from tempfile import NamedTemporaryFile

# Configure logging
logging.basicConfig(filename='server.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # Frontend URL
        "http://localhost:8000",    # Backend URL
        "http://127.0.0.1:8000",    # Backend URL alternative
        "http://127.0.0.1:3000"     # Frontend URL alternative
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    logging.error("GEMINI_API_KEY not found in environment variables!")
else:
    logging.info("GEMINI_API_KEY found in environment")
    
try:
    genai.configure(api_key=GEMINI_API_KEY)
    logging.info("Gemini API configured successfully")
except Exception as e:
    logging.error(f"Failed to configure Gemini API: {str(e)}")

def clean_json_string(json_str: str) -> str:
    """Clean and format the JSON string from AI response."""
    try:
        # Try to parse as is first
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError:
        try:
            # Find the first { and last }
            start = json_str.find('{')
            end = json_str.rfind('}') + 1
            if start == -1 or end == 0:
                raise ValueError("No JSON object found in string")
            
            json_str = json_str[start:end]
            
            # Replace any remaining newlines and extra spaces
            json_str = re.sub(r'\s+', ' ', json_str)
            
            # Parse it to validate and return
            parsed = json.loads(json_str)
            
            # Ensure seo_keywords is an array if present
            if 'seo_keywords' in parsed:
                if not isinstance(parsed['seo_keywords'], list):
                    parsed['seo_keywords'] = []
            
            return json.dumps(parsed)
            
        except Exception as e:
            logging.error(f"Failed to clean JSON string: {str(e)}")
            return json.dumps({
                "brand": "Unknown",
                "category": "Unknown",
                "condition": 0,
                "seo_keywords": [],
                "error": "Failed to parse AI response"
            })

def analyze_with_gemini(image_path: str) -> str:
    """
    Analyze an image using Google's Gemini Vision model.
    """
    try:
        if not GEMINI_API_KEY:
            raise Exception("GEMINI_API_KEY not configured")
            
        logging.info("Starting Gemini analysis...")
        
        try:
            # Load and verify the image
            img = PIL.Image.open(image_path)
            logging.info(f"Image loaded successfully: size={img.size}, mode={img.mode}")
            
            # Convert image to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
                logging.info("Converted image to RGB mode")

            # Use the new model name
            model = genai.GenerativeModel('gemini-1.5-flash')
            logging.info("Created model instance with gemini-1.5-flash")
            
            # Prepare the prompt
            prompt = """Analyze this image and provide a JSON response with the following fields:
            - brand (string): The brand name visible in the image, or best guess based on style
            - category (string): Specific category like 'mens hoodie', 'womens dress', etc.
            - condition (number): Rating from 1-10 of the item's condition
            - seo_keywords (array): 5 most relevant search terms for this item
            
            Format as valid JSON only, no other text."""

            # Generate the analysis
            logging.info("Sending request to Gemini API...")
            response = model.generate_content([prompt, img])
            if not response or not response.text:
                raise Exception("Empty response from Gemini API")
                
            logging.info("Gemini API response received")
            logging.info(f"Response text: {response.text}")
            return response.text
                
        except Exception as e:
            logging.error(f"Error in Gemini API call: {str(e)}")
            raise

    except Exception as e:
        logging.error(f"Error in analyze_with_gemini: {str(e)}")
        return json.dumps({
            "brand": "Unknown",
            "category": "Unknown",
            "condition": 0,
            "seo_keywords": [],
            "error": str(e)
        })

def get_gemini_fallback_data(search_term):
    """Get suggested keywords from Gemini when PyTrends fails."""
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        prompt = f"""Generate 5 relevant search keywords for '{search_term}' in the fashion/clothing context.
        Return as JSON array of objects with 'keyword' and estimated 'volume' (1-100).
        Example: [{{"keyword": "example term", "volume": 80}}]"""
        
        response = model.generate_content(prompt)
        if response and response.text:
            try:
                keywords = json.loads(response.text)
                if isinstance(keywords, list):
                    return {
                        'trend_data': [],
                        'keywords_data': keywords
                    }
            except json.JSONDecodeError:
                pass
                
    except Exception as e:
        logging.error(f"Gemini fallback error: {str(e)}")
    
    return {
        'trend_data': [],
        'keywords_data': []
    }

def get_trend_data(search_term):
    """Get trend data using PyTrends."""
    try:
        logging.info(f"[PyTrends] Starting trend data fetch for: {search_term}")
        
        # Initialize PyTrends with robust settings
        pytrends = TrendReq(
            hl='en-US',
            tz=360,  # Central Time (US & Canada)
            timeout=(10,10),  # Connection timeout, Read timeout
            retries=2,
            backoff_factor=0.5,
            requests_args={'verify': True}
        )
        
        # Clean search term
        search_term = search_term.strip()
        if not search_term or len(search_term) < 2:
            logging.warning(f"[PyTrends] Invalid search term: {search_term}")
            return {'trend_data': [], 'keywords_data': []}
            
        # Build payload
        try:
            logging.info(f"[PyTrends] Building payload for: {search_term}")
            pytrends.build_payload(
                kw_list=[search_term],
                cat=0,
                timeframe='today 12-m',
                geo='US'
            )
        except Exception as e:
            logging.error(f"[PyTrends] Failed to build payload: {str(e)}", exc_info=True)
            return {'trend_data': [], 'keywords_data': []}
        
        # Get interest over time
        try:
            logging.info("[PyTrends] Fetching interest over time data")
            interest_df = pytrends.interest_over_time()
            
            if interest_df is None or interest_df.empty:
                logging.error("[PyTrends] No interest over time data found")
                return {'trend_data': [], 'keywords_data': []}
                
            trend_data = [{
                'date': date.strftime('%Y-%m-%d'),
                'volume': int(row[search_term])
            } for date, row in interest_df.iterrows() 
            if search_term in row and pd.notna(row[search_term])]
            
            logging.info(f"[PyTrends] Got {len(trend_data)} trend points")
            
        except Exception as e:
            logging.error(f"[PyTrends] Failed to get interest over time: {str(e)}", exc_info=True)
            return {'trend_data': [], 'keywords_data': []}
        
        # Get related queries
        try:
            logging.info("[PyTrends] Fetching related queries")
            related = pytrends.related_queries()
            
            keywords_data = []
            if related and search_term in related:
                top_df = related[search_term].get('top')
                if isinstance(top_df, pd.DataFrame) and not top_df.empty:
                    keywords_data = [{
                        'keyword': str(row['query']),
                        'volume': int(row['value'])
                    } for _, row in top_df.iterrows()]
                    
            logging.info(f"[PyTrends] Got {len(keywords_data)} related keywords")
            
            return {
                'trend_data': trend_data,
                'keywords_data': keywords_data
            }
            
        except Exception as e:
            logging.error(f"[PyTrends] Failed to get related queries: {str(e)}", exc_info=True)
            return {'trend_data': trend_data, 'keywords_data': []}
            
    except Exception as e:
        logging.error(f"[PyTrends] Critical error: {str(e)}", exc_info=True)
        return {'trend_data': [], 'keywords_data': []}

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Grail Meter API"}

@app.get("/test")
async def test_endpoint():
    return {"message": "API is working"}

@app.post("/analyze")
async def analyze_image_route(files: List[UploadFile] = File(...)):
    """
    Analyze uploaded images using Google's Gemini Vision model.
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")

        # Process the first image (for now)
        file = files[0]
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Create a temporary file to store the upload
        with NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            try:
                # Read and write the file
                contents = await file.read()
                if not contents:
                    raise HTTPException(status_code=400, detail="Empty file uploaded")
                
                temp_file.write(contents)
                temp_file.flush()
                
                logging.info(f"Temporary file created: {temp_file.name}")
                
                try:
                    # Get the analysis from Gemini
                    analysis_text = analyze_with_gemini(temp_file.name)
                    if not analysis_text:
                        raise HTTPException(status_code=500, detail="Failed to analyze image with Gemini")
                    
                    try:
                        analysis_json = json.loads(clean_json_string(analysis_text))
                        logging.info(f"Parsed analysis result: {analysis_json}")
                    except json.JSONDecodeError as e:
                        logging.error(f"Failed to parse Gemini response: {str(e)}")
                        raise HTTPException(status_code=500, detail="Failed to parse analysis results")
                    
                    # Get real trend data
                    trend_data = {
                        'trend_data': [],
                        'keywords_data': []
                    }
                    
                    if analysis_json.get('brand') != 'Unknown' and analysis_json.get('category') != 'Unknown':
                        search_term = f"{analysis_json['brand']} {analysis_json['category']}"
                        logging.info(f"Getting trend data for search term: {search_term}")
                        
                        # Clean brand name for better search results
                        search_term = search_term.replace('A|X ', '').replace('A/X ', '')
                        search_term = search_term.strip()
                        
                        trend_data = get_trend_data(search_term)
                        logging.info(f"Received trend data: {trend_data}")
                    else:
                        logging.warning("Brand or category is Unknown, using Gemini fallback")
                        search_term = analysis_json.get('category', 'fashion item')
                        trend_data = get_gemini_fallback_data(search_term)
                    
                    # Update keywords if we have them
                    if trend_data['keywords_data']:
                        analysis_json['seo_keywords'] = trend_data['keywords_data']
                        logging.info(f"Updated SEO keywords with {len(trend_data['keywords_data'])} items")
                    
                    # Create the response
                    response = {
                        **analysis_json,  # Include all fields from analysis
                        "trend_data": trend_data['trend_data'],
                        "seo_keywords": trend_data['keywords_data']  # Use consistent key name
                    }
                    
                    logging.info("Successfully created response with trend data and analysis")
                    return response
                    
                except Exception as e:
                    logging.error(f"Error in analysis: {str(e)}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")
                
            except HTTPException:
                raise
            except Exception as e:
                logging.error(f"Error processing file: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
            finally:
                # Clean up the temporary file
                try:
                    os.unlink(temp_file.name)
                    logging.info(f"Temporary file deleted: {temp_file.name}")
                except Exception as e:
                    logging.error(f"Error deleting temporary file: {str(e)}")
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in analyze_image_route: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/upload")
async def upload_file(files: List[UploadFile] = File(...)):
    logging.info("Received file upload request")
    try:
        analyses = []
        
        # Process each image
        for file in files:
            content = await file.read()
            
            # Save the file temporarily
            with open("temp_image.jpg", "wb") as temp_file:
                temp_file.write(content)
            
            # Get AI analysis for this image
            result = analyze_with_gemini("temp_image.jpg")
            logging.info(f"Raw AI analysis: {result}")
            
            # Clean the JSON string
            cleaned_json = clean_json_string(result)
            logging.info(f"Cleaned analysis: {cleaned_json}")
            
            try:
                analysisJson = json.loads(cleaned_json)
                analyses.append(analysisJson)
            except json.JSONDecodeError as e:
                logging.error(f"Failed to parse AI analysis: {str(e)}")
                continue
        
        if not analyses:
            return {
                "message": "No valid analyses found",
                "error": True
            }
        
        # Get the best analysis (one with most information)
        best_analysis = max(analyses, key=lambda x: len([v for v in x.values() if v != "Unknown"]))
        
        # Extract brand and category for trends
        brand = best_analysis.get("brand", "Unknown")
        category = best_analysis.get("category", "Unknown")
        
        if brand == "Unknown":
            return {
                "message": "Analysis completed but no brand detected",
                "analysis": best_analysis,
                "trend_data": [],
                "keywords": []
            }
            
        # Use Pytrends to fetch trend data
        try:
            # Clean brand name for better search results
            brand = brand.replace('A|X ', '').replace('A/X ', '')
            brand = brand.strip()
            
            # Create search terms
            search_term = f"{brand} {category}"
            
            pytrends = TrendReq(hl='en-US')
            logging.info(f"[PyTrends] Building payload with search term: {search_term}")
            try:
                pytrends.build_payload(
                    kw_list=[search_term],
                    cat=0,
                    timeframe='today 12-m',
                    geo='US',
                    gprop=''
                )
                logging.info(f"[PyTrends] Payload built successfully for {search_term}")
            except Exception as e:
                logging.error(f"[PyTrends] Error building payload: {str(e)}", exc_info=True)
                # Try one more time with a different timeframe in production
                if os.getenv('IS_PRODUCTION', 'False') == 'True':
                    try:
                        logging.info("[PyTrends] Retrying with shorter timeframe")
                        pytrends.build_payload(
                            kw_list=[search_term],
                            cat=0,
                            timeframe='today 3-m',  # Try shorter timeframe
                            geo='US',
                            gprop=''
                        )
                        logging.info(f"[PyTrends] Second payload built successfully for {search_term}")
                    except Exception as e:
                        logging.error(f"[PyTrends] Second attempt failed: {str(e)}", exc_info=True)
                        raise
                else:
                    raise
            
            # Get interest over time with error handling
            logging.info("[PyTrends] Fetching interest over time data")
            try:
                interest_over_time_df = pytrends.interest_over_time()
                logging.info(f"[PyTrends] Interest over time data fetched: {interest_over_time_df.shape[0]} rows")
                if interest_over_time_df is None or interest_over_time_df.empty:
                    logging.warning(f"[PyTrends] No trend data found for {search_term}")
                    return {
                        'trend_data': [],
                        'keywords_data': []
                    }
                logging.info(f"[PyTrends] Retrieved {len(interest_over_time_df)} data points")
            except Exception as e:
                logging.error(f"[PyTrends] Error getting interest over time: {str(e)}", exc_info=True)
                raise Exception(f"Failed to get trend data: {str(e)}")
            
            # Convert to list format
            trend_data = interest_over_time_df.reset_index()
            
            # Create trend data list with proper error handling
            trend_data_list = []
            for _, row in trend_data.iterrows():
                try:
                    if pd.notna(row[search_term]):  # Check if value is not NaN
                        trend_data_list.append({
                            'date': row['date'].strftime('%Y-%m-%d'),
                            'volume': int(row[search_term])
                        })
                except (ValueError, KeyError, TypeError) as e:
                    logging.error(f"Error processing trend data row: {e}")
                    continue
            
            if trend_data_list:
                logging.info(f"Successfully processed {len(trend_data_list)} trend data points")
            else:
                logging.info("No valid trend data points")
                trend_data_list = []
            
            # Get related queries for keyword suggestions from PyTrends only
            keywords = []
            try:
                related_queries = pytrends.related_queries()
                if related_queries and search_term in related_queries:
                    top_queries = related_queries[search_term].get('top')
                    if isinstance(top_queries, pd.DataFrame) and not top_queries.empty:
                        # Convert to our keyword format
                        for _, row in top_queries.iterrows():
                            try:
                                keywords.append({
                                    'keyword': str(row['query']),
                                    'volume': int(row['value'])
                                })
                            except (ValueError, KeyError, TypeError) as e:
                                logging.error(f"Error processing keyword: {e}")
                                continue
                        
                        if keywords:
                            logging.info(f"Successfully found {len(keywords)} related keywords from PyTrends")
                        else:
                            logging.info("No valid keywords found from PyTrends")
                    else:
                        logging.info("No related queries data from PyTrends")
                else:
                    logging.info("No related queries result from PyTrends")
            except Exception as e:
                logging.error(f"Error fetching related queries from PyTrends: {e}")
            
            return {
                "message": "Analysis completed successfully",
                "analysis": best_analysis,
                "trend_data": trend_data_list,
                "keywords": keywords  # Only use PyTrends keywords
            }
            
        except Exception as e:
            logging.error(f"Error in pytrends request: {str(e)}")
            return {
                "message": "Analysis completed but trend data fetch failed",
                "analysis": best_analysis,
                "trend_data": [],
                "keywords": []  # Return empty list if PyTrends fails
            }
            
    except Exception as e:
        logging.error(f"Error processing files: {str(e)}")
        return {"message": f"Error processing files: {str(e)}", "error": True}

def cleanup():
    """Cleanup function to remove temporary files and close connections."""
    logging.info("Cleaning up server resources...")
    try:
        # Remove only temporary image files
        if os.path.exists('temp_image.jpg'):
            os.remove('temp_image.jpg')
            
        # Close any open connections
        for proc in psutil.process_iter(['pid', 'name']):
            if proc.info['name'] == 'python.exe' and proc.pid != os.getpid():
                if any('uvicorn' in cmd for cmd in proc.cmdline()):
                    logging.info(f"Terminating previous uvicorn process: {proc.pid}")
                    proc.terminate()
                    
    except Exception as e:
        logging.error(f"Error during cleanup: {e}")

def signal_handler(signum, frame):
    """Handle termination signals gracefully."""
    logging.info(f"Received signal {signum}")
    cleanup()
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    import uvicorn
    try:
        # Clean up any existing processes first
        cleanup()
        # Start the server
        port = int(os.getenv('PORT', 8080))
        uvicorn.run(app, host="0.0.0.0", port=port)
    except Exception as e:
        logging.error(f"Error starting server: {e}")
    finally:
        cleanup()
