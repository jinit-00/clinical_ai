import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from core.gemini_client import gemini_client
from routers import patients, mri, bloodwork, prescription, live_or

load_dotenv()

app = FastAPI(
    title="Clinical AI Copilot API",
    description="Portfolio-grade healthcare decision support assistant backend",
    version="1.0.0"
)

# Enable CORS for frontend Vite dev server & production origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(patients.router, prefix="/api")
app.include_router(mri.router, prefix="/api")
app.include_router(bloodwork.router, prefix="/api")
app.include_router(prescription.router, prefix="/api")
app.include_router(live_or.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    """Health check endpoint confirming service status and Gemini API key presence."""
    return {
        "status": "healthy",
        "service": "Clinical AI Copilot API",
        "gemini_configured": gemini_client.is_configured()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
