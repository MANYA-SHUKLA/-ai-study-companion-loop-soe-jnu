"""
Subjects API routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.database import db
from app.middleware.auth import get_user_id

router = APIRouter(prefix="/api/subjects", tags=["subjects"])

class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    exam_date: Optional[str] = None

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    exam_date: Optional[str] = None

@router.post("/")
async def create_subject(subject: SubjectCreate, user_id: str = Depends(get_user_id)):
    """Create a new subject"""
    supabase = db.get_client()
    
    subject_data = {
        "user_id": user_id,
        "name": subject.name,
        "description": subject.description,
        "exam_date": subject.exam_date
    }
    
    result = supabase.table("subjects").insert(subject_data).execute()
    return result.data[0]

@router.get("/")
async def list_subjects(user_id: str = Depends(get_user_id)):
    """List all subjects for a user"""
    supabase = db.get_client()
    result = supabase.table("subjects").select("*").eq("user_id", user_id).execute()
    return result.data

@router.get("/{subject_id}")
async def get_subject(subject_id: str, user_id: str = Depends(get_user_id)):
    """Get a specific subject"""
    supabase = db.get_client()
    result = supabase.table("subjects").select("*").eq("id", subject_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return result.data[0]

@router.put("/{subject_id}")
async def update_subject(subject_id: str, subject: SubjectUpdate, user_id: str = Depends(get_user_id)):
    """Update a subject"""
    supabase = db.get_client()
    
    update_data = {}
    if subject.name is not None:
        update_data["name"] = subject.name
    if subject.description is not None:
        update_data["description"] = subject.description
    if subject.exam_date is not None:
        update_data["exam_date"] = subject.exam_date
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("subjects").update(update_data).eq("id", subject_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return result.data[0]

@router.delete("/{subject_id}")
async def delete_subject(subject_id: str, user_id: str = Depends(get_user_id)):
    """Delete a subject"""
    supabase = db.get_client()
    result = supabase.table("subjects").delete().eq("id", subject_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return {"message": "Subject deleted successfully"}

# Add this route to get notes for a subject
@router.get("/{subject_id}/notes")
async def get_subject_notes(subject_id: str, user_id: str = Depends(get_user_id)):
    """Get all notes for a specific subject"""
    from app.models.database import db
    
    supabase = db.get_client()
    
    # Verify subject belongs to user
    subject_result = supabase.table("subjects").select("id").eq("id", subject_id).eq("user_id", user_id).execute()
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get notes for this subject
    notes_result = supabase.table("notes").select("*").eq("user_id", user_id).eq("subject_id", subject_id).order("created_at", desc=True).execute()
    
    return notes_result.data