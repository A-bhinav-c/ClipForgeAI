
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.script import router as script_router
from app.api.image import router as image_router


# Initialize FastAPI
app = FastAPI(
    title="ClipForge AI",
    description="AI-powered video creation and YouTube automation",
    version="1.0.0"
)


# Register API routers
app.include_router(script_router)
app.include_router(image_router)


# Connect React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Welcome to ClipForge AI!",
        "status": "running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "ClipForge AI",
        "version": "1.0.0"
    }


@app.get("/api/workflows")
def get_workflows():
    return {
        "workflows": [
            "Podcast to Shorts",
            "AI Video Generator",
            "Educational Videos"
        ]
    }
