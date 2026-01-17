"""
AI Study Companion - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
import os
import traceback
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="AI Study Companion API",
    description="""
    Backend API for personalized learning assistant.
    
    ## Features
    
    * **Authentication**: User authentication and session management
    * **Subjects**: Manage study subjects and courses
    * **Topics**: Organize topics within subjects
    * **Notes**: Upload and manage study notes (PDF, text, markdown)
    * **Study Plans**: Generate and manage personalized study plans
    * **Search**: Semantic search across your notes
    
    ## AI Provider
    
    This API uses **Google Gemini** (free tier) for AI-powered features like:
    - Study plan creation
    - Topic extraction from notes
    - Semantic search
    
    Note: OpenAPI/Swagger documentation (available at /docs) is for API endpoints only and is unrelated to the AI provider choice.
    
    ## Authentication
    
    Most endpoints require authentication via Bearer token in the Authorization header.
    Get your token from the `/api/auth/me` endpoint after logging in.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
# Allow common Next.js dev ports (3000, 3001, 3002) by default
default_origins = "http://localhost:3000,http://localhost:3001,http://localhost:3002"
allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", default_origins).split(",")]

# Custom middleware to ensure CORS headers are always present
class CORSEnforcementMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        response = await call_next(request)
        
        # Always add CORS headers if origin is present and allowed
        if origin and origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        
        return response

# Add CORS enforcement middleware first (runs last in the stack)
app.add_middleware(CORSEnforcementMiddleware)

# Add FastAPI CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler to ensure CORS headers are always included
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions and ensure CORS headers are included"""
    # Get the origin from the request
    origin = request.headers.get("origin")
    
    # Check if origin is allowed
    headers = {}
    if origin and origin in allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
    elif not origin:
        # If no origin header, allow all (for same-origin requests)
        headers["Access-Control-Allow-Origin"] = "*"
    
    # Handle specific exception types
    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "error": str(exc)},
            headers=headers
        )
    elif isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors(), "error": "Validation error"},
            headers=headers
        )
    else:
        # Handle Supabase/PostgREST API errors
        error_type = type(exc).__name__
        error_message = str(exc)
        
        # Check if it's a Supabase API error
        if "APIError" in error_type or "postgrest" in str(type(exc)).lower():
            # Extract error details if available
            if hasattr(exc, 'message'):
                error_message = exc.message
            elif hasattr(exc, 'args') and exc.args:
                error_message = str(exc.args[0])
            
            # Log the error
            print(f"Supabase API Error: {error_message}")
            print(traceback.format_exc())
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": error_message,
                    "error": "Database error",
                    "type": error_type
                },
                headers=headers
            )
        
        # Log the full traceback for debugging
        print(f"Unhandled exception: {exc}")
        print(traceback.format_exc())
        
        # Return a generic error response
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": str(exc),
                "error": "Internal server error",
                "type": error_type
            },
            headers=headers
        )

@app.get("/", tags=["General"])
async def root():
    """
    Root endpoint - API information
    """
    return {
        "message": "AI Study Companion API",
        "status": "running",
        "made_with": "❤️",
        "creators": ["Manya Shukla", "Rajkumar Yogi"],
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health", tags=["General"])
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"}

# Handle OPTIONS requests for CORS preflight
@app.options("/{full_path:path}")
async def options_handler(full_path: str, request: Request):
    """Handle CORS preflight OPTIONS requests"""
    origin = request.headers.get("origin")
    headers = {}
    
    if origin and origin in allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        headers["Access-Control-Max-Age"] = "3600"
    
    return JSONResponse(content={}, headers=headers)

@app.middleware("http")
async def ignore_favicon(request: Request, call_next):
    if request.url.path == "/favicon.ico":
        return Response(status_code=204)
    response = await call_next(request)
    return response

# Import routes
from app.routes import auth, subjects, topics, study_plans, notes, search

# Include all routers - they already have prefixes and tags defined
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(topics.router)
app.include_router(study_plans.router)
app.include_router(notes.router)
app.include_router(search.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

