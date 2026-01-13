"""
Pydantic schemas for Notes and File Uploads
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Literal


class FileMetadata(BaseModel):
    """Schema for file metadata"""
    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    file_type: Literal["pdf", "txt", "md", "docx"] = Field(..., description="File type/extension")
    file_size: int = Field(..., ge=1, le=10485760, description="File size in bytes (max 10MB)")
    content_type: Optional[str] = Field(None, description="MIME type of the file")

    @validator('filename')
    def validate_filename(cls, v):
        if not v or not v.strip():
            raise ValueError('Filename cannot be empty')
        # Check for invalid characters
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        if any(char in v for char in invalid_chars):
            raise ValueError(f'Filename contains invalid characters: {invalid_chars}')
        return v.strip()

    @validator('file_size')
    def validate_file_size(cls, v):
        max_size = 10 * 1024 * 1024  # 10MB
        if v > max_size:
            raise ValueError(f'File size ({v} bytes) exceeds maximum allowed size (10MB)')
        return v

    @validator('file_type')
    def validate_file_type(cls, v):
        allowed_types = ["pdf", "txt", "md", "docx"]
        if v.lower() not in allowed_types:
            raise ValueError(f'File type must be one of: {", ".join(allowed_types)}')
        return v.lower()

    class Config:
        json_schema_extra = {
            "example": {
                "filename": "mathematics_syllabus.pdf",
                "file_type": "pdf",
                "file_size": 524288,
                "content_type": "application/pdf"
            }
        }


class NoteUploadMetadata(BaseModel):
    """Schema for note upload request metadata"""
    subject_id: Optional[str] = Field(None, description="Subject UUID (optional)")
    topic_id: Optional[str] = Field(None, description="Topic UUID (optional)")
    title: Optional[str] = Field(None, max_length=255, description="Note title (optional, defaults to filename)")

    @validator('subject_id', 'topic_id')
    def validate_uuid(cls, v):
        if v is not None and (not v or len(v) < 10):
            raise ValueError('Invalid UUID format')
        return v

    @validator('title')
    def validate_title(cls, v):
        if v is not None:
            if not v.strip():
                raise ValueError('Title cannot be empty if provided')
            if len(v.strip()) > 255:
                raise ValueError('Title cannot exceed 255 characters')
        return v.strip() if v else None

    class Config:
        json_schema_extra = {
            "example": {
                "subject_id": "123e4567-e89b-12d3-a456-426614174000",
                "topic_id": "123e4567-e89b-12d3-a456-426614174001",
                "title": "Mathematics Chapter 1 Notes"
            }
        }


class NoteResponse(BaseModel):
    """Schema for note response"""
    id: str
    user_id: str
    subject_id: Optional[str]
    topic_id: Optional[str]
    title: str
    content: str
    file_type: Optional[str]
    file_url: Optional[str]
    embeddings_stored: bool
    created_at: str
    updated_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "subject_id": "123e4567-e89b-12d3-a456-426614174002",
                "topic_id": "123e4567-e89b-12d3-a456-426614174003",
                "title": "Mathematics Chapter 1 Notes",
                "content": "Linear equations are...",
                "file_type": "pdf",
                "file_url": "https://...",
                "embeddings_stored": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }

