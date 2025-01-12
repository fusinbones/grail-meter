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
from urllib.parse import quote_plus

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

# Configure OpenAI
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    log_error("OPENAI_API_KEY not found in environment variables!")
else:
    log_info("OPENAI_API_KEY found in environment")
    openai.api_key = OPENAI_API_KEY

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
            
            # Format the response to match frontend expectations
            return {
                "product": {
                    "title": f"{result['brand']} {result['category']}",
                    "description": f"A {result['condition']}/10 condition {result['category']} from {result['brand']}.",
                    "details": result.get('details', {}),
                    "authenticity_indicators": result.get('authenticity_indicators', []),
                    "estimated_retail_range": result.get('estimated_retail_range', {"min": "N/A", "max": "N/A"})
                },
                "seo": {
                    "primary_keywords": result.get('seo_keywords', []),
                    "brand": result['brand'],
                    "category": result['category'],
                    "condition": result['condition']
                }
            }
            
        except Exception as e:
            log_error("Failed to analyze image with Gemini", e)
            # Return a structured error response
            return {
                "product": {
                    "title": "Error",
                    "description": str(e),
                    "details": {
                        "error_type": type(e).__name__,
                        "timestamp": datetime.now().isoformat()
                    }
                },
                "seo": {
                    "primary_keywords": [],
                    "brand": "Error",
                    "category": "Error",
                    "condition": 0
                }
            }
            
    except Exception as e:
        log_error("Failed to analyze image with Gemini", e)
        # Return a structured error response
        return {
            "product": {
                "title": "Error",
                "description": str(e),
                "details": {
                    "error_type": type(e).__name__,
                    "timestamp": datetime.now().isoformat()
                }
            },
            "seo": {
                "primary_keywords": [],
                "brand": "Error",
                "category": "Error",
                "condition": 0
            }
        }

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
            result = gemini_result
            
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
    return sorted_keywords[:count]  # Ensure we only return 5 keywords

class ProxyManager:
    def __init__(self):
        self.username = 'mcherch'
        self.password = 'SUH5TDY-APM77K0-K703SNY-JIMAOKI-YIEAGRU-LVFTB2M-ZJOG99K'
        self.proxy_dns = 'usa.rotating.proxyrack.net:9000'
        
    def get_proxy(self):
        return {
            'http': 'http://{}:{}@{}'.format(self.username, self.password, self.proxy_dns),
            'https': 'http://{}:{}@{}'.format(self.username, self.password, self.proxy_dns)
        }

def analyze_images(image_path):
    try:
        log_info("Starting image analysis...")
        
        # Extract basic image info
        log_info("Processing image...")
        img = Image.open(image_path)
        
        # First prompt for product details
        model = genai.GenerativeModel('gemini-1.5-flash')
        initial_prompt = """Analyze this streetwear/fashion item and provide details in this exact format:
        {
            "product": {
                "title": "Specific product name with brand if visible",
                "color": "Main colors",
                "category": "Type of clothing (e.g., hoodie, t-shirt, sneakers)",
                "gender": "Men/Women/Unisex",
                "size": "Size if visible, otherwise 'Regular'",
                "material": "Main material if visible"
            },
            "keywords": [
                "5 most relevant keywords for marketplace listings"
            ],
            "longTailKeywords": [
                "5 detailed search phrases that combine brand, style, and features"
            ]
        }
        Provide ONLY valid JSON, no additional text."""
        
        log_info("Sending initial request to Gemini API...")
        response = model.generate_content([initial_prompt, img])
        
        if not response or not response.text:
            raise Exception("Empty response from Gemini API")
            
        # Clean and parse the response
        cleaned_json = clean_json_string(response.text)
        result = json.loads(cleaned_json)
        
        # Get eBay listings based on the product title
        log_info(f"Getting eBay listings for: {result['product']['title']}")
        ebay_result = get_ebay_listings(result['product']['title'])
        
        # Add eBay data and SEO score to final result
        result["ebayListings"] = ebay_result["listings"]
        result["averagePrice"] = ebay_result["averagePrice"]
        result["seo"] = {
            "condition": random.randint(7, 10)
        }
        
        log_info(f"Final result: {json.dumps(result, indent=2)}")
        return result
        
    except Exception as e:
        log_error(f"Error in analyze_images: {str(e)}")
        return {
            "product": {
                "title": "Unknown Product",
                "color": "Not specified",
                "category": "Unknown",
                "gender": "Unisex",
                "size": "N/A",
                "material": "Not specified"
            },
            "keywords": ["vintage", "rare", "authentic", "collectible", "unique"],
            "longTailKeywords": [],
            "ebayListings": [],
            "averagePrice": 0,
            "seo": {
                "condition": 7
            }
        }

def get_ebay_listings(query):
    try:
        username = 'mcherch'
        password = 'SUH5TDY-APM77K0-K703SNY-JIMAOKI-YIEAGRU-LVFTB2M-ZJOG99K'
        proxy_dns = 'usa.rotating.proxyrack.net:9000'
        
        proxies = {
            'http': f'http://{username}:{password}@{proxy_dns}',
            'https': f'http://{username}:{password}@{proxy_dns}'
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        # Format the search URL - only Buy It Now listings
        search_url = f"https://www.ebay.com/sch/i.html?_nkw={quote_plus(query)}&_sacat=0&LH_BIN=1&rt=nc&LH_ItemCondition=1000|1500|2000|2500|3000"
        
        log_info(f"Searching eBay for: {query}")
        response = requests.get(search_url, headers=headers, proxies=proxies, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml')
        listings = []
        
        # Find all listing items
        items = soup.find_all('div', class_='s-item__info')
        for item in items[:5]:  # Get top 5 listings
            try:
                title_elem = item.find('div', class_='s-item__title')
                price_elem = item.find('span', class_='s-item__price')
                condition_elem = item.find('span', class_='SECONDARY_INFO')
                link_elem = item.find('a', class_='s-item__link')
                
                if not all([title_elem, price_elem, link_elem]):
                    continue
                    
                title = title_elem.get_text(strip=True)
                if title.lower().startswith('new listing'):
                    title = title[11:].strip()
                    
                price_text = price_elem.get_text(strip=True).replace('$', '').replace(',', '')
                try:
                    price = float(re.search(r'\d+\.?\d*', price_text).group())
                except:
                    continue
                    
                condition = condition_elem.get_text(strip=True) if condition_elem else "Not Specified"
                url = link_elem.get('href', '')
                
                # Only include valid eBay item URLs
                if not url.startswith('https://www.ebay.com/itm/'):
                    continue
                    
                listings.append({
                    "title": title,
                    "price": price,
                    "condition": condition,
                    "url": url
                })
                
            except Exception as e:
                log_error(f"Error processing listing: {str(e)}")
                continue
                
        if not listings:
            raise Exception("No valid listings found")
            
        # Calculate average price
        prices = [listing["price"] for listing in listings]
        average_price = round(sum(prices) / len(prices), 2)
        
        return {
            "listings": listings,
            "averagePrice": average_price
        }
        
    except Exception as e:
        log_error(f"Error in get_ebay_listings: {str(e)}")
        return {
            "listings": [],
            "averagePrice": 0
        }

@app.post("/analyze")
async def analyze_image_endpoint(file: UploadFile):
    try:
        # Process and save the uploaded file
        temp_path = await process_uploaded_file(file)
        
        # Analyze the image using our new function
        result = analyze_images(temp_path)
        
        # Clean up the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return result
    except Exception as e:
        log_error(f"Error in analyze_image_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
