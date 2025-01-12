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
import PIL
from PIL import Image
import io
import re
from dotenv import load_dotenv
import signal
from tempfile import NamedTemporaryFile
import requests
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Create a console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)

# Get the root logger and add the console handler
root_logger = logging.getLogger()
root_logger.addHandler(console_handler)

def log_error(message: str, error: Exception = None):
    """Log error with a visible format for Railway logs."""
    error_message = f"❌ ERROR: {message}"
    if error:
        error_message += f"\n🔍 DETAILS: {str(error)}"
        if hasattr(error, '__traceback__'):
            import traceback
            trace = ''.join(traceback.format_tb(error.__traceback__))
            error_message += f"\n📚 TRACE:\n{trace}"
    logging.error(error_message)

def log_info(message: str):
    """Log info with a visible format for Railway logs."""
    logging.info(f"ℹ️ INFO: {message}")

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # Frontend URL
        "http://localhost:8000",    # Backend URL
        "http://127.0.0.1:8000",    # Backend URL alternative
        "http://127.0.0.1:3000",    # Frontend URL alternative
        "https://grail-meter.vercel.app",  # Production frontend
        "https://grail-meter-production.up.railway.app",  # Production backend
        "*"  # Allow all origins temporarily for debugging
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicitly list allowed methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"],  # Expose all headers
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    log_error("GEMINI_API_KEY not found in environment variables!")
else:
    log_info("GEMINI_API_KEY found in environment")
    
try:
    genai.configure(api_key=GEMINI_API_KEY)
    log_info("Gemini API configured successfully")
except Exception as e:
    log_error(f"Failed to configure Gemini API: {str(e)}")

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
            log_error(f"Failed to clean JSON string: {str(e)}")
            return json.dumps({
                "brand": "Unknown",
                "category": "Unknown",
                "condition": 0,
                "seo_keywords": [],
                "error": "Failed to parse AI response"
            })

def analyze_with_gemini(image_path: str) -> str:
    """Analyze an image with Gemini Vision API."""
    try:
        if not GEMINI_API_KEY:
            raise Exception("GEMINI_API_KEY not configured")
            
        log_info("Starting Gemini analysis...")
        
        try:
            # Load and verify the image
            img = Image.open(image_path)
            log_info(f"Image loaded successfully: size={img.size}, mode={img.mode}")
            
            # Convert image to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
                log_info("Converted image to RGB mode")

            # Use the new model name
            model = genai.GenerativeModel('gemini-1.5-flash')
            log_info("Created model instance with gemini-1.5-flash")
            
            # Prepare the prompt
            prompt = """Analyze this image and provide a JSON response with the following fields:
            - brand: the brand name or "Generic" if no clear brand
            - category: the type of clothing (e.g. hoodie, t-shirt, etc.)
            - condition: a rating from 1-10 of the item's condition
            - seo_keywords: list of relevant search terms
            Format as valid JSON only, no other text."""

            # Generate the analysis
            log_info("Sending request to Gemini API...")
            response = model.generate_content([prompt, img])
            if not response or not response.text:
                raise Exception("Empty response from Gemini API")
                
            log_info("Gemini API response received")
            log_info(f"Response text: {response.text}")

            # Parse the response as JSON
            try:
                # Clean up the response text
                response_text = response.text.strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                # Parse JSON
                result = json.loads(response_text)
                log_info(f"Parsed Gemini result: {result}")
                return result
            except json.JSONDecodeError as e:
                log_error(f"Failed to parse Gemini response as JSON: {response_text}", e)
                raise

        except Exception as e:
            log_error(f"Error in Gemini API call", e)
            raise

    except Exception as e:
        log_error(f"Error in analyze_with_gemini", e)
        return {
            "brand": "Unknown",
            "category": "Unknown",
            "condition": 5,
            "seo_keywords": []
        }

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
        log_error(f"Gemini fallback error: {str(e)}")
    
    return {
        'trend_data': [],
        'keywords_data': []
    }

def get_free_proxies():
    """Get a list of free proxies from free-proxy-list.net."""
    try:
        url = "https://free-proxy-list.net/"
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        proxies = []
        # Find the table with proxies
        proxy_table = soup.find('table')
        if proxy_table:
            for row in proxy_table.find_all('tr')[1:]:  # Skip header row
                columns = row.find_all('td')
                if len(columns) >= 7:  # Ensure row has enough columns
                    ip = columns[0].text.strip()
                    port = columns[1].text.strip()
                    https = columns[6].text.strip()
                    country = columns[3].text.strip()
                    
                    # Only use HTTPS proxies from reliable countries
                    reliable_countries = {'US', 'CA', 'GB', 'DE', 'FR', 'NL', 'JP', 'KR', 'SG'}
                    if https == 'yes' and country in reliable_countries:
                        proxy = f'http://{ip}:{port}'
                        proxies.append(proxy)
                        
        log_info(f"[Proxy] Found {len(proxies)} potential proxies")
        return proxies
    except Exception as e:
        log_error(f"[Proxy] Error fetching proxy list: {str(e)}")
        return []

def get_trend_data(search_term):
    """Get trend data using PyTrends with specific proxy."""
    try:
        log_info(f"[PyTrends] Starting trend data fetch for: {search_term}")
        
        # Clean search term and prepare fallback terms
        search_term = search_term.strip()
        if not search_term or len(search_term) < 2:
            log_info(f"[PyTrends] Invalid search term: {search_term}")
            return {'trend_data': [], 'keywords_data': []}
        
        # Create list of search terms from specific to broad
        terms = []
        # Original term
        terms.append(search_term)
        # Remove brand if present
        if ' ' in search_term:
            terms.append(search_term.split(' ', 1)[1])
        # Add general category
        if 'hoodie' in search_term.lower():
            terms.append('hoodie fashion')
        elif 'jacket' in search_term.lower():
            terms.append('jacket fashion')
        elif 'shirt' in search_term.lower():
            terms.append('shirt fashion')
        elif 'pants' in search_term.lower():
            terms.append('pants fashion')
        else:
            terms.append('streetwear fashion')
            
        log_info(f"[PyTrends] Search terms from specific to broad: {terms}")

        # Custom headers to make requests look more like a browser
        custom_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://trends.google.com/',
            'DNT': '1',
        }

        # Use rotating proxy with authentication
        proxy_host = "usa.rotating.proxyrack.net"
        proxy_port = "10100"  # Try a different port
        proxy_auth = "mcherchSUH5TDY-APM77K0-K703SNY-JIMAOKI-YIEAGRU-LVFTB2M-ZJOG99K"
        
        # Format the proxy URL with the auth token as the username
        proxy_url = f"http://{proxy_auth}@{proxy_host}:{proxy_port}"
        
        # Configure proxy with authentication
        proxy_config = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        # Custom headers to mimic a real browser
        custom_headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        })
        
        log_info(f"[PyTrends] Using rotating proxy: {proxy_host}:{proxy_port}")
        
        # Test proxy connection with retries
        max_retries = 3
        retry_ports = [10100, 10150, 10200]  # Try different ports if one fails
        
        for attempt, port in enumerate(retry_ports, 1):
            try:
                if attempt > 1:
                    proxy_url = f"http://{proxy_auth}@{proxy_host}:{port}"
                    proxy_config = {'http': proxy_url, 'https': proxy_url}
                    log_info(f"[PyTrends] Retry {attempt} with port {port}")
                
                log_info("[PyTrends] Testing proxy connection...")
                session = requests.Session()
                session.proxies = proxy_config
                session.headers.update(custom_headers)
                session.verify = True
                
                test_response = session.get('https://trends.google.com/trends/explore', 
                                         timeout=15,
                                         allow_redirects=True)
                
                if test_response.status_code == 200:
                    log_info(f"[PyTrends] Proxy test successful with port {port}")
                    log_info(f"[PyTrends] Status code: {test_response.status_code}")
                    break
                else:
                    log_info(f"[PyTrends] Proxy test failed with status {test_response.status_code}")
                    if attempt == len(retry_ports):
                        raise Exception(f"All proxy attempts failed. Last status: {test_response.status_code}")
                    
            except Exception as e:
                log_error(f"[PyTrends] Proxy test attempt {attempt} failed", e)
                if attempt == len(retry_ports):
                    raise

        try:
            # Initialize PyTrends with proxy settings
            log_info("[PyTrends] Initializing TrendReq with proxy settings...")
            pytrends = TrendReq(
                hl='en-US',
                tz=360,
                timeout=(15,15),
                retries=2,
                backoff_factor=1.5,
                requests_args={
                    'verify': True,
                    'headers': custom_headers,
                    'allow_redirects': True,
                    'proxies': proxy_config
                }
            )
            log_info("[PyTrends] TrendReq initialized successfully")
        except Exception as e:
            log_error("[PyTrends] Failed to initialize TrendReq", e)
            raise
        
        # Try each term until we get data
        for term in terms:
            try:
                log_info(f"[PyTrends] Trying search term: {term}")
                
                # Add a small delay between requests
                import time
                time.sleep(1.5)
                
                try:
                    log_info(f"[PyTrends] Building payload for term: {term}")
                    pytrends.build_payload(
                        kw_list=[term],
                        cat=0,
                        timeframe='today 12-m',
                        geo='US'
                    )
                    log_info("[PyTrends] Payload built successfully")
                except Exception as e:
                    log_error("[PyTrends] Failed to build payload", e)
                    continue
                
                # Get interest over time
                try:
                    log_info("[PyTrends] Fetching interest over time data...")
                    interest_df = pytrends.interest_over_time()
                    log_info("[PyTrends] Successfully fetched interest over time data")
                except Exception as e:
                    log_error("[PyTrends] Failed to fetch interest over time data", e)
                    continue
                
                if interest_df is not None and not interest_df.empty:
                    log_info(f"[PyTrends] Found data for term: {term}")
                    trend_data = [{
                        'date': date.strftime('%Y-%m-%d'),
                        'volume': int(row[term])
                    } for date, row in interest_df.iterrows() 
                    if term in row and pd.notna(row[term])]
                    
                    # Add delay before getting related queries
                    time.sleep(1.5)
                    
                    try:
                        # Get related queries
                        log_info("[PyTrends] Fetching related queries...")
                        related = pytrends.related_queries()
                        log_info("[PyTrends] Successfully fetched related queries")
                        keywords_data = []
                        if related and term in related:
                            top_df = related[term].get('top')
                            if isinstance(top_df, pd.DataFrame) and not top_df.empty:
                                keywords_data = [{
                                    'keyword': str(row['query']),
                                    'volume': int(row['value'])
                                } for _, row in top_df.iterrows()]
                    except Exception as e:
                        log_error("[PyTrends] Failed to fetch related queries", e)
                        keywords_data = []
                    
                    log_info(f"[PyTrends] Got {len(trend_data)} trend points and {len(keywords_data)} keywords")
                    return {
                        'trend_data': trend_data,
                        'keywords_data': keywords_data
                    }
                else:
                    log_info(f"[PyTrends] No data found for term: {term}")
                    continue
                    
            except Exception as e:
                log_error(f"[PyTrends] Error with term {term}", e)
                continue
        
        # If we get here, no terms worked
        log_error("[PyTrends] No data found with any search terms")
        return {'trend_data': [], 'keywords_data': []}
            
    except Exception as e:
        log_error("[PyTrends] Critical error", e)
        return {'trend_data': [], 'keywords_data': []}

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Grail Meter API"}

@app.get("/test")
async def test_endpoint():
    return {"message": "API is working"}

@app.get("/ip")
async def get_ip():
    """Get the server's public IP address."""
    try:
        response = requests.get('https://api.ipify.org?format=json')
        return response.json()
    except Exception as e:
        log_error(f"Error getting IP: {str(e)}")
        return {"error": str(e)}

@app.post("/analyze")
async def analyze_images(files: List[UploadFile] = File(...)):
    """Analyze uploaded images."""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        log_info("Starting image analysis")
        results = []
        for file in files:
            try:
                log_info(f"Processing file: {file.filename}")
                # Save the uploaded file temporarily
                with NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
                    try:
                        content = await file.read()
                        if not content:
                            raise ValueError("Empty file uploaded")
                        log_info(f"File size: {len(content)} bytes")
                        
                        temp_file.write(content)
                        temp_file.flush()
                        log_info(f"Saved to temp file: {temp_file.name}")

                        # Process the image
                        try:
                            with Image.open(temp_file.name) as img:
                                img_bytes = io.BytesIO()
                                img.save(img_bytes, format='JPEG')
                                img_bytes = img_bytes.getvalue()
                                log_info(f"Image processed, size: {len(img_bytes)} bytes")

                            # Get Gemini analysis
                            try:
                                log_info("Starting Gemini analysis")
                                result = analyze_with_gemini(temp_file.name)
                                if not result:
                                    raise ValueError("Empty result from Gemini")
                                log_info(f"Gemini analysis result: {result}")

                                # Extract brand and category
                                brand = result.get('brand', 'Unknown')
                                category = result.get('category', 'Unknown')
                                search_term = f"{brand} {category}".strip()
                                log_info(f"Search term: {search_term}")

                                # Get trend data
                                try:
                                    log_info("Starting PyTrends data fetch")
                                    trend_result = get_trend_data(search_term)
                                    log_info(f"PyTrends data: {trend_result}")

                                    # Combine results
                                    result.update(trend_result)
                                    results.append(result)
                                    log_info("Successfully combined results")
                                except Exception as e:
                                    log_error("Error getting trend data", e)
                                    raise

                            except Exception as e:
                                log_error("Error in Gemini analysis", e)
                                raise

                        except Exception as e:
                            log_error("Error processing image", e)
                            raise

                    except Exception as e:
                        log_error("Error handling temp file", e)
                        raise

                    finally:
                        # Clean up temp file
                        try:
                            os.unlink(temp_file.name)
                            log_info(f"Cleaned up temp file: {temp_file.name}")
                        except Exception as e:
                            log_error("Error deleting temp file", e)

            except Exception as e:
                log_error(f"Error processing file {file.filename}", e)
                raise HTTPException(status_code=500, detail=f"Error processing file {file.filename}: {str(e)}")

        if not results:
            raise HTTPException(status_code=500, detail="No results generated")

        log_info(f"Final results: {results[0]}")
        return results[0]

    except HTTPException:
        raise
    except Exception as e:
        log_error("Critical error in analyze endpoint", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_file(files: List[UploadFile] = File(...)):
    log_info("Received file upload request")
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
            log_info(f"Raw AI analysis: {result}")
            
            # Clean the JSON string
            cleaned_json = clean_json_string(result)
            log_info(f"Cleaned analysis: {cleaned_json}")
            
            try:
                analysisJson = json.loads(cleaned_json)
                analyses.append(analysisJson)
            except json.JSONDecodeError as e:
                log_error(f"Failed to parse AI analysis: {str(e)}")
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
            log_info(f"[PyTrends] Building payload with search term: {search_term}")
            try:
                pytrends.build_payload(
                    kw_list=[search_term],
                    cat=0,
                    timeframe='today 12-m',
                    geo='US',
                    gprop=''
                )
                log_info(f"[PyTrends] Payload built successfully for {search_term}")
            except Exception as e:
                log_error(f"[PyTrends] Error building payload: {str(e)}", exc_info=True)
                # Try one more time with a different timeframe in production
                if os.getenv('IS_PRODUCTION', 'False') == 'True':
                    try:
                        log_info("[PyTrends] Retrying with shorter timeframe")
                        pytrends.build_payload(
                            kw_list=[search_term],
                            cat=0,
                            timeframe='today 3-m',  # Try shorter timeframe
                            geo='US',
                            gprop=''
                        )
                        log_info(f"[PyTrends] Second payload built successfully for {search_term}")
                    except Exception as e:
                        log_error(f"[PyTrends] Second attempt failed: {str(e)}", exc_info=True)
                        raise
                else:
                    raise
            
            # Get interest over time with error handling
            log_info("[PyTrends] Fetching interest over time data")
            try:
                interest_over_time_df = pytrends.interest_over_time()
                log_info(f"[PyTrends] Interest over time data fetched: {interest_over_time_df.shape[0]} rows")
                if interest_over_time_df is None or interest_over_time_df.empty:
                    log_info(f"[PyTrends] No trend data found for {search_term}")
                    return {
                        'trend_data': [],
                        'keywords_data': []
                    }
                log_info(f"[PyTrends] Retrieved {len(interest_over_time_df)} data points")
            except Exception as e:
                log_error(f"[PyTrends] Error getting interest over time: {str(e)}", exc_info=True)
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
                    log_error(f"Error processing trend data row: {e}")
                    continue
            
            if trend_data_list:
                log_info(f"Successfully processed {len(trend_data_list)} trend data points")
            else:
                log_info("No valid trend data points")
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
                                log_error(f"Error processing keyword: {e}")
                                continue
                        
                        if keywords:
                            log_info(f"Successfully found {len(keywords)} related keywords from PyTrends")
                        else:
                            log_info("No valid keywords found from PyTrends")
                    else:
                        log_info("No related queries data from PyTrends")
                else:
                    log_info("No related queries result from PyTrends")
            except Exception as e:
                log_error(f"Error fetching related queries from PyTrends: {e}")
            
            return {
                "message": "Analysis completed successfully",
                "analysis": best_analysis,
                "trend_data": trend_data_list,
                "keywords": keywords  # Only use PyTrends keywords
            }
            
        except Exception as e:
            log_error(f"Error in pytrends request: {str(e)}")
            return {
                "message": "Analysis completed but trend data fetch failed",
                "analysis": best_analysis,
                "trend_data": [],
                "keywords": []  # Return empty list if PyTrends fails
            }
            
    except Exception as e:
        log_error(f"Error processing files: {str(e)}")
        return {"message": f"Error processing files: {str(e)}", "error": True}

def cleanup():
    """Cleanup function to remove temporary files and close connections."""
    log_info("Cleaning up server resources...")
    try:
        # Remove only temporary image files
        if os.path.exists('temp_image.jpg'):
            os.remove('temp_image.jpg')
            
        # Close any open connections
        for proc in psutil.process_iter(['pid', 'name']):
            if proc.info['name'] == 'python.exe' and proc.pid != os.getpid():
                if any('uvicorn' in cmd for cmd in proc.cmdline()):
                    log_info(f"Terminating previous uvicorn process: {proc.pid}")
                    proc.terminate()
                    
    except Exception as e:
        log_error(f"Error during cleanup: {e}")

def signal_handler(signum, frame):
    """Handle termination signals gracefully."""
    log_info(f"Received signal {signum}")
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
        log_error(f"Error starting server: {e}")
    finally:
        cleanup()
