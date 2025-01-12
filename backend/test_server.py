from typing import Optional, Dict, List, Union
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
import json
import requests
from datetime import datetime, timedelta
import re
from bs4 import BeautifulSoup
import psutil
import signal
import sys
import random
import asyncio

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

def analyze_with_gemini(image_path: str) -> Dict[str, Union[str, int, List[str]]]:
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
            prompt = """Analyze this streetwear image in detail and provide a JSON response with the following fields:
            {
                "brand": "Brand name or 'Generic' if unclear",
                "category": "Specific type of clothing (e.g., hoodie, t-shirt, sneakers)",
                "condition": "Rating from 1-10 of item condition",
                "details": {
                    "materials": "Main materials used",
                    "colorway": "Primary and secondary colors",
                    "style": "Style description (e.g., oversized, fitted, vintage)",
                    "notable_features": "List of distinctive features"
                },
                "seo_keywords": ["List", "of", "relevant", "search", "terms"],
                "authenticity_indicators": ["List", "of", "authenticity", "features"],
                "estimated_retail_range": {
                    "min": "Minimum retail price in USD",
                    "max": "Maximum retail price in USD"
                }
            }
            Provide only valid JSON, no additional text."""

            # Generate the analysis
            log_info("Sending request to Gemini API...")
            response = model.generate_content([prompt, img])
            if not response or not response.text:
                raise Exception("Empty response from Gemini API")
                
            # Clean and parse the response
            cleaned_json = clean_json_string(response.text)
            result = json.loads(cleaned_json)
            
            # Validate required fields
            required_fields = ['brand', 'category', 'condition', 'seo_keywords']
            missing_fields = [field for field in required_fields if field not in result]
            
            if missing_fields:
                log_error(f"Missing required fields in API response: {missing_fields}")
                # Provide default values for missing fields
                for field in missing_fields:
                    if field == 'brand':
                        result['brand'] = 'Unknown'
                    elif field == 'category':
                        result['category'] = 'Unspecified'
                    elif field == 'condition':
                        result['condition'] = 0
                    elif field == 'seo_keywords':
                        result['seo_keywords'] = []
            
            # Ensure condition is within valid range
            if 'condition' in result:
                try:
                    condition = float(result['condition'])
                    result['condition'] = max(1, min(10, condition))  # Clamp between 1 and 10
                except (ValueError, TypeError):
                    result['condition'] = 5  # Default to middle value if invalid
            
            # Log successful analysis
            log_info(f"Successfully analyzed image: {result['brand']} {result['category']}")
            
            return result
            
        except Exception as e:
            log_error("Failed to analyze image with Gemini", e)
            # Return a structured error response
            return {
                "brand": "Error",
                "category": "Error",
                "condition": 0,
                "error": str(e),
                "seo_keywords": [],
                "details": {
                    "error_type": type(e).__name__,
                    "timestamp": datetime.now().isoformat()
                }
            }
{{ ... }}

async def process_uploaded_file(file: UploadFile) -> str:
    """Process the uploaded file and save it temporarily."""
    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            # Read the uploaded file content
            content = await file.read()
            
            # Convert to PIL Image for validation and processing
            img = Image.open(io.BytesIO(content))
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Save to temporary file
            img.save(temp_file.name, format='JPEG')
            log_info(f"Saved uploaded file to temporary location: {temp_file.name}")
            
            return temp_file.name
            
    except Exception as e:
        log_error("Error processing uploaded file", e)
        if 'temp_file' in locals() and os.path.exists(temp_file.name):
            os.remove(temp_file.name)
        return None

async def analyze_image(file: UploadFile):
    """Analyze an uploaded image using Google's Gemini Vision API."""
    try:
        log_info("Starting image analysis")
        
        # Process the uploaded file
        temp_file_path = await process_uploaded_file(file)
        if not temp_file_path:
            raise HTTPException(status_code=400, detail="Failed to process uploaded file")
            
        # Get Gemini analysis
        gemini_result = analyze_with_gemini(temp_file_path)
        if not gemini_result:
            raise HTTPException(status_code=500, detail="Failed to analyze image with Gemini")
            
        # Parse and structure the Gemini result
        try:
            result = {
                'product': {
                    'brand': gemini_result.get('brand', 'Unknown Brand'),
                    'category': gemini_result.get('category', 'Unknown Category'),
                    'condition': gemini_result.get('condition', 5),
                    'title': f"{gemini_result.get('brand', '')} {gemini_result.get('category', '')}".strip(),
                    'description': generate_product_description(gemini_result),
                },
                'seo': {
                    'primary_keywords': get_top_keywords(gemini_result.get('seo_keywords', []), 5),
                    'all_keywords': gemini_result.get('seo_keywords', [])
                }
            }
            
            log_info(f"Analysis complete: {result}")
            return result
            
        except Exception as e:
            log_error("Error parsing Gemini result", e)
            raise HTTPException(status_code=500, detail="Failed to parse analysis results")
            
    except Exception as e:
        log_error("Error in image analysis", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up any temporary files
        if 'temp_file_path' in locals():
            try:
                os.remove(temp_file_path)
                log_info(f"Cleaned up temp file: {temp_file_path}")
            except Exception as e:
                log_error(f"Error cleaning up temp file: {temp_file_path}", e)

def generate_product_description(result: Dict) -> str:
    """Generate a detailed product description from Gemini analysis."""
    brand = result.get('brand', '')
    category = result.get('category', '')
    condition_score = result.get('condition', 5)
    
    # Convert condition score to descriptive text
    condition_text = "Brand New" if condition_score >= 9 else \
                    "Excellent" if condition_score >= 8 else \
                    "Very Good" if condition_score >= 7 else \
                    "Good" if condition_score >= 6 else \
                    "Fair" if condition_score >= 5 else "Used"
    
    description = f"Authentic {brand} {category} in {condition_text} condition. "
    
    # Add style details from keywords if available
    keywords = result.get('seo_keywords', [])
    style_keywords = [k for k in keywords if any(style in k.lower() for style in ['style', 'design', 'fit'])]
    if style_keywords:
        description += f"Features include: {', '.join(style_keywords[:3])}. "
    
    return description.strip()

def get_top_keywords(keywords: List[str], count: int) -> List[str]:
    """Get the top N keywords, prioritizing brand and product type."""
    if not keywords:
        return []
        
    # Prioritize keywords that are likely to have high search volume
    def keyword_priority(keyword: str) -> int:
        lower_keyword = keyword.lower()
        if 'brand' in lower_keyword or 'designer' in lower_keyword:
            return 3
        if any(category in lower_keyword for category in ['hoodie', 'jacket', 'shirt', 'pants']):
            return 2
        if any(modifier in lower_keyword for modifier in ['style', 'fashion', 'trending']):
            return 1
        return 0
    
    sorted_keywords = sorted(keywords, key=keyword_priority, reverse=True)
    return sorted_keywords[:count]

@app.post("/analyze")
async def analyze_image_endpoint(file: UploadFile):
    return await analyze_image(file)

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
