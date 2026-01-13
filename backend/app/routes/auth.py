"""
Authentication routes
"""

from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from app.middleware.auth import get_current_user

security = HTTPBearer()

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserInfo(BaseModel):
    user_id: str
    email: Optional[str] = None

@router.get("/me", response_model=UserInfo)
async def get_current_user_info(current_user: dict = get_current_user):
    """Get current authenticated user information"""
    return {
        "user_id": current_user["user_id"],
        "email": current_user.get("email")
    }

@router.get("/verify")
async def verify_token(current_user: dict = get_current_user):
    """Verify if token is valid"""
    return {
        "valid": True,
        "user_id": current_user["user_id"]
    }

@router.post("/debug/token")
async def debug_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Debug endpoint to check token verification details"""
    from app.middleware.auth import verify_jwt_token
    import os
    import jwt
    import base64
    import json
    
    token = credentials.credentials
    result = {
        "token_received": True,
        "token_prefix": token[:20] if len(token) > 20 else token,
        "token_length": len(token),
    }
    
    # Try to decode token header
    try:
        header_part = token.split('.')[0]
        header_part += '=' * (4 - len(header_part) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_part))
        result["token_header"] = header
        result["algorithm"] = header.get('alg', 'unknown')
    except Exception as e:
        result["header_decode_error"] = str(e)
    
    # Try to decode payload without verification
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        result["unverified_payload"] = {
            "keys": list(unverified.keys()),
            "sub": unverified.get("sub"),
            "email": unverified.get("email"),
            "exp": unverified.get("exp"),
            "iat": unverified.get("iat"),
        }
    except Exception as e:
        result["payload_decode_error"] = str(e)
    
    # Check environment variables
    result["env_check"] = {
        "has_jwt_secret": bool(os.getenv("SUPABASE_JWT_SECRET")),
        "has_supabase_url": bool(os.getenv("SUPABASE_URL")),
        "has_supabase_key": bool(os.getenv("SUPABASE_KEY")),
        "jwt_secret_length": len(os.getenv("SUPABASE_JWT_SECRET", "")),
    }
    
    # Try verification
    user_info = verify_jwt_token(token)
    result["verification_result"] = {
        "success": user_info is not None,
        "user_id": user_info.get("user_id") if user_info else None,
        "email": user_info.get("email") if user_info else None,
    }
    
    return result

