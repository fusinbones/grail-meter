from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import logging
import os
import tempfile
from PIL import Image
import io
import google.generativeai as genai
from pytrends.request import TrendReq
import pandas as pd
from typing import Dict, List, Optional, Any
import json
import requests
from datetime import datetime, timedelta
import re
from bs4 import BeautifulSoup
import psutil
import signal
import sys

# Load environment variables
load_dotenv()

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://grail-meter.vercel.app",
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - ℹ️ INFO: %(message)s'
)

def log_info(message: str):
    logging.info(message)

def log_error(message: str, error: Optional[Exception] = None):
    if error:
        logging.error(f"{message}: {str(error)}")
    else:
        logging.error(message)

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

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

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

async def get_trend_data(search_term: str) -> List[Dict[str, Any]]:
    try:
        log_info(f"[PyTrends] Starting trend data fetch for: {search_term}")
        
        # Create search terms from specific to broad
        terms = []
        words = search_term.split()
        
        # Original term
        terms.append(search_term)
        
        # Try without brand name if it's a multi-word term
        if len(words) > 1:
            terms.append(words[-1])  # Just the item type (e.g., "hoodie")
            
        # Add category term
        category_term = None
        if 'hoodie' in search_term.lower():
            category_term = 'hoodie fashion'
        elif 'jacket' in search_term.lower():
            category_term = 'jacket fashion'
        elif 'shirt' in search_term.lower():
            category_term = 'shirt fashion'
        elif 'pants' in search_term.lower():
            category_term = 'pants fashion'
        
        if category_term:
            terms.append(category_term)
        
        log_info(f"[PyTrends] Search terms from specific to broad: {terms}")
        
        pytrends = TrendReq(hl='en-US', tz=360, timeout=(3.0, 10.0))
        
        # Try each term until we get data
        for term in terms:
            try:
                # Fashion & Style category ID: 185
                pytrends.build_payload(
                    [term],
                    cat=185,  # Fashion & Style category
                    timeframe='today 12-m',
                    geo='',
                    gprop=''
                )
                
                trend_data = pytrends.interest_over_time()
                
                if not trend_data.empty:
                    # Convert to list of dictionaries
                    result = []
                    for date, row in trend_data.iterrows():
                        result.append({
                            'date': date.strftime('%Y-%m-%d'),
                            'volume': int(row[term])
                        })
                    
                    # Check if we have any non-zero values
                    if any(item['volume'] > 0 for item in result):
                        log_info(f"[PyTrends] Found data for term: {term}")
                        return result
                    
                log_info(f"[PyTrends] No data found for term: {term}")
                
            except Exception as e:
                log_error(f"[PyTrends] Error fetching data for term '{term}'", e)
                continue
        
        # If we get here, try one last time with a very broad fashion term
        try:
            pytrends.build_payload(
                ['fashion trends'],
                cat=185,
                timeframe='today 12-m',
                geo='',
                gprop=''
            )
            
            trend_data = pytrends.interest_over_time()
            
            if not trend_data.empty:
                result = []
                for date, row in trend_data.iterrows():
                    result.append({
                        'date': date.strftime('%Y-%m-%d'),
                        'volume': int(row['fashion trends'])
                    })
                return result
                
        except Exception as e:
            log_error("[PyTrends] Error fetching fallback data", e)
            
        return []
        
    except Exception as e:
        log_error("[PyTrends] Error fetching trend data", e)
        return []

@app.post("/analyze")
async def analyze_image(file: UploadFile):
    try:
        log_info("Starting image analysis")
        
        # Validate file
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
            
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
            
        # Log request details
        log_info(f"Processing file: {file.filename}")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image file.")
        
        # Read and validate file content
        try:
            contents = await file.read()
            if not contents:
                raise HTTPException(status_code=400, detail="Empty file received")
            log_info(f"File size: {len(contents)} bytes")
        except Exception as e:
            log_error("Error reading file", e)
            raise HTTPException(status_code=400, detail=str(e))
            
        # Process file and get results
        try:
            result = await process_image(contents, file.filename)
            if not result:
                raise HTTPException(status_code=500, detail="Failed to process image")
            return JSONResponse(
                status_code=200,
                content=result
            )
        except Exception as e:
            log_error("Error processing image", e)
            raise HTTPException(status_code=500, detail=str(e))
            
    except HTTPException as he:
        log_error(f"HTTP Exception: {he.detail}")
        return JSONResponse(
            status_code=he.status_code,
            content={"detail": he.detail}
        )
    except Exception as e:
        log_error("Unexpected error", e)
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )

async def process_image(contents, filename):
    # Save the uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
        try:
            temp_file.write(contents)
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
                        trend_result = await get_trend_data(search_term)
                        log_info(f"PyTrends data: {trend_result}")

                        # Combine results
                        result.update(trend_result)
                        return result
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
