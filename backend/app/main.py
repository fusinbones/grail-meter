from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root() -> Dict:
    return {"status": "success", "message": "Hello World"}

@app.get("/test")
def test_endpoint() -> Dict:
    return {"status": "success", "message": "Test endpoint is working"}

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)) -> Dict:
    if not file:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "No file uploaded"}
        )
    
    try:
        # Just return the filename for now to test if upload works
        return {
            "status": "success",
            "filename": file.filename,
            "content_type": file.content_type
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(e)
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
