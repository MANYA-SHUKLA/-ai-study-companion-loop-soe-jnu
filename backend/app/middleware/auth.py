"""
Authentication middleware for Supabase JWT
"""

from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import os
import requests
from functools import lru_cache
from supabase import create_client, Client
import json

security = HTTPBearer()

@lru_cache()
def get_jwt_secret():
    """Get JWT secret from environment"""
    # Supabase JWT secret - get from project settings
    # You can find this in Supabase Dashboard > Settings > API > JWT Secret
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        raise ValueError("SUPABASE_JWT_SECRET must be set for JWT verification. Get it from Supabase Dashboard > Settings > API")
    
    # Warn if JWT secret looks too short (might be UUID instead of actual JWT secret)
    if len(jwt_secret) < 100:
        print(f"WARNING: SUPABASE_JWT_SECRET appears to be too short ({len(jwt_secret)} chars).")
        print(f"Supabase JWT secrets are typically 200+ characters long base64-encoded strings.")
        print(f"If you're using a UUID, that's incorrect. Please get the JWT Secret from:")
        print(f"Supabase Dashboard -> Settings -> API -> JWT Secret")
    
    return jwt_secret

@lru_cache()
def get_supabase_client():
    """Get Supabase client for user verification"""
    url = os.getenv("SUPABASE_URL")
    # Try service role key first (for admin operations), then anon key
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)

def verify_jwt_token(token: str) -> Optional[dict]:
    """
    Verify Supabase JWT token and extract user information
    Returns user_id if token is valid, None otherwise
    
    Tries multiple verification methods:
    1. Manual JWT decode with HS256 (standard Supabase method)
    2. Manual JWT decode with algorithm from token header
    3. Supabase client verification (fallback)
    """
    try:
        jwt_secret = get_jwt_secret()
        
        # First, decode token header to check algorithm
        algorithm = "HS256"  # Default
        kid = None  # Key ID for ES256 tokens
        try:
            import base64
            # Get the header
            header_part = token.split('.')[0]
            # Add padding if needed for base64 decoding
            header_part += '=' * (4 - len(header_part) % 4)
            header = json.loads(base64.urlsafe_b64decode(header_part))
            algorithm = header.get('alg', 'HS256')
            kid = header.get('kid')  # Key ID for ES256 tokens
            print(f"JWT verification: Token algorithm = {algorithm}, kid = {kid}")
            
            # Decode payload without verification to see structure
            unverified = jwt.decode(token, options={"verify_signature": False})
            print(f"JWT verification: Token payload keys = {list(unverified.keys())}")
        except Exception as e:
            print(f"JWT verification: Cannot decode token structure - {str(e)}")
        
        payload = None
        last_error = None
        
        # Handle ES256 (asymmetric) tokens - verify via Supabase REST API
        if algorithm == "ES256":
            print(f"JWT verification: Detected ES256 algorithm, verifying via Supabase REST API...")
            try:
                supabase_url = os.getenv("SUPABASE_URL")
                if not supabase_url:
                    print(f"JWT verification: SUPABASE_URL not set, cannot verify ES256 token")
                else:
                    # Verify token by calling Supabase auth API
                    auth_url = f"{supabase_url}/auth/v1/user"
                    headers = {
                        "Authorization": f"Bearer {token}",
                        "apikey": os.getenv("SUPABASE_KEY", "")  # Anon key
                    }
                    
                    print(f"JWT verification: Verifying token with Supabase auth API...")
                    auth_response = requests.get(auth_url, headers=headers, timeout=5)
                    
                    if auth_response.status_code == 200:
                        user_data = auth_response.json()
                        user_id = user_data.get("id")
                        email = user_data.get("email")
                        
                        if user_id:
                            print(f"JWT verification: Successfully verified ES256 token via Supabase API for user {user_id}")
                            # Also decode payload to get full info
                            unverified_payload = jwt.decode(token, options={"verify_signature": False})
                            return {
                                "user_id": user_id,
                                "email": email,
                                "payload": unverified_payload
                            }
                        else:
                            print(f"JWT verification: Supabase API returned user data without id")
                    else:
                        print(f"JWT verification: Supabase API verification failed - HTTP {auth_response.status_code}: {auth_response.text[:200]}")
                        last_error = Exception(f"Supabase API returned {auth_response.status_code}")
            except Exception as e:
                print(f"JWT verification: Error verifying ES256 token - {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()
                last_error = e
        
        # If ES256 failed or algorithm is HS256, try HS256 with JWT secret
        if not payload:
            # Method 1: Try manual JWT verification with HS256 (standard Supabase method)
            # Supabase access tokens typically use HS256 with the JWT secret
            algorithms_to_try = ["HS256"]
            if algorithm and algorithm != "HS256" and algorithm != "ES256":
                # Also try the algorithm from the token header if it's something else
                algorithms_to_try.append(algorithm)
            
            print(f"JWT verification: Will try algorithms: {algorithms_to_try}")
            
            for algo in algorithms_to_try:
                try:
                    payload = jwt.decode(token, jwt_secret, algorithms=[algo], options={"verify_exp": True})
                    print(f"JWT verification: Successfully verified with {algo}")
                    break
                except jwt.ExpiredSignatureError as e:
                    print(f"JWT verification: Token expired - {str(e)}")
                    return None
                except jwt.InvalidSignatureError as e:
                    last_error = e
                    print(f"JWT verification: {algo} signature verification failed - {str(e)}")
                    continue
                except jwt.InvalidTokenError as e:
                    last_error = e
                    print(f"JWT verification: {algo} invalid token - {str(e)}")
                    continue
                except Exception as e:
                    last_error = e
                    print(f"JWT verification: {algo} verification error - {type(e).__name__}: {str(e)}")
                    continue
        
        # If manual verification failed, try using Supabase client (if available)
        if not payload:
            print(f"JWT verification: Manual verification failed, trying Supabase client verification...")
            try:
                supabase_client = get_supabase_client()
                if supabase_client:
                    # Create a temporary client with the token as the auth header
                    # Use the token to make an authenticated request to Supabase
                    from supabase import create_client as create_supabase_client
                    url = os.getenv("SUPABASE_URL")
                    anon_key = os.getenv("SUPABASE_KEY")
                    if url and anon_key:
                        # Create client with token in session
                        temp_client = create_supabase_client(url, anon_key)
                        # Try to get user with the token
                        try:
                            # Set the session with the token
                            temp_client.auth.set_session(token, "")
                            response = temp_client.auth.get_user(token)
                            if response.user:
                                print(f"JWT verification: Successfully verified via Supabase client")
                                return {
                                    "user_id": response.user.id,
                                    "email": response.user.email,
                                    "payload": {}
                                }
                        except Exception as get_user_error:
                            print(f"JWT verification: Supabase get_user failed - {str(get_user_error)}")
                            # Try alternative: verify token by making a request to Supabase API
                            # with the token in Authorization header
                            pass
            except Exception as e:
                print(f"JWT verification: Supabase client verification also failed - {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()
        
        if not payload:
            error_msg = str(last_error) if last_error else "Token verification failed with all methods"
            print(f"JWT verification: All verification methods failed - {error_msg}")
            if isinstance(last_error, jwt.InvalidSignatureError):
                print(f"JWT verification: INVALID SIGNATURE - Check that SUPABASE_JWT_SECRET matches your Supabase project's JWT Secret")
            return None
        
        # Extract user_id from Supabase JWT payload
        # Supabase JWT has 'sub' field containing the user ID (UUID)
        user_id = payload.get("sub")
        if not user_id:
            print(f"JWT verification: No 'sub' field in token payload. Available keys: {list(payload.keys())}")
            return None
            
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "payload": payload
        }
    except jwt.ExpiredSignatureError as e:
        print(f"JWT verification: Token expired - {str(e)}")
        return None
    except Exception as e:
        # Log error for debugging
        print(f"JWT verification: Unexpected error - {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Dependency to get current authenticated user
    Extract JWT from Authorization header and verify it
    """
    token = credentials.credentials
    
    # Log token prefix for debugging (first 20 chars)
    token_prefix = token[:20] if len(token) > 20 else token
    print(f"JWT auth: Attempting to verify token (prefix: {token_prefix}...)")
    
    user_info = verify_jwt_token(token)
    if not user_info:
        print(f"JWT auth: Token verification failed")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"JWT auth: Token verified successfully for user {user_info.get('user_id')}")
    return user_info

def get_user_id(current_user: dict = Depends(get_current_user)) -> str:
    """
    Dependency to extract user_id from authenticated user
    Use this in routes that need user_id
    """
    return current_user["user_id"]

