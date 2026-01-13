"""
Backend validation utilities
"""

from fastapi import HTTPException, UploadFile
from typing import Optional
import os

# File upload constraints
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.markdown']
ALLOWED_MIME_TYPES = {
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'text/markdown': '.md',
    'text/x-markdown': '.md',
}

def validate_file_upload(file: UploadFile) -> tuple[str, bytes]:
    """
    Validate file upload with size and type checks
    
    Returns:
        (file_extension, file_content)
    
    Raises:
        HTTPException if validation fails
    """
    # Validate filename exists
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate MIME type (if provided)
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File MIME type not allowed: {file.content_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES.keys())}"
        )
    
    return file_ext, None  # Content will be read separately

async def validate_file_size(file: UploadFile) -> bytes:
    """
    Validate and read file content with size check
    
    Returns:
        file_content (bytes)
    
    Raises:
        HTTPException if file exceeds size limit
    """
    file_content = await file.read()
    file_size_mb = len(file_content) / (1024 * 1024)
    
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File size ({file_size_mb:.2f}MB) exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB"
        )
    
    return file_content

