import os
import jwt
import logging
from jwt import PyJWKClient
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

security = HTTPBearer()

@lru_cache(maxsize=1)
def get_jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to verify Supabase JWT token.
    Extracts the Bearer token, validates it against the SUPABASE_JWT secret,
    and returns the decoded user payload if valid.
    """
    token = credentials.credentials
    
    # 1. Inspect the algorithm in the token header
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
    except Exception as e:
        logger.warning(f"Failed to parse token header: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid token format."
        )

    # 2. Decode the token using the appropriate method
    if alg == "ES256":
        try:
            from urllib.parse import urlparse
            supabase_url = os.getenv("SUPABASE_URL")
            if not supabase_url:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="SUPABASE_URL is not configured on the backend server."
                )
            
            parsed = urlparse(supabase_url)
            jwks_url = f"{parsed.scheme}://{parsed.netloc}/auth/v1/.well-known/jwks.json"
            
            jwks_client = get_jwks_client(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
                leeway=60  # Account for clock skew/drift (e.g. Docker container vs host or Supabase server)
            )
            return payload
        except jwt.ExpiredSignatureError as e:
            logger.warning(f"Authentication failed (ExpiredSignatureError): {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired. Please log in again."
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Authentication failed (InvalidTokenError): {e}. Token: {token[:15]}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}"
            )
    else:
        # Fall back to HS256 (symmetric)
        jwt_secret_raw = os.getenv("SUPABASE_JWT") or os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret_raw:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase JWT secret is not configured on the backend server."
            )
            
        import base64
        try:
            jwt_secret = base64.b64decode(jwt_secret_raw)
        except Exception:
            jwt_secret = jwt_secret_raw.encode("utf-8")
            
        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                leeway=60  # Account for clock skew/drift (e.g. Docker container vs host or Supabase server)
            )
            return payload
        except jwt.ExpiredSignatureError as e:
            logger.warning(f"Authentication failed (ExpiredSignatureError): {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired. Please log in again."
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Authentication failed (InvalidTokenError): {e}. Token: {token[:15]}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}"
            )
