"""
Topics API routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.models.database import db
from app.middleware.auth import get_user_id

router = APIRouter(prefix="/api/topics", tags=["topics"])

class TopicCreate(BaseModel):
    subject_id: str
    title: str
    description: Optional[str] = None
    parent_topic_id: Optional[str] = None
    difficulty_level: Optional[int] = 1
    estimated_hours: Optional[float] = None
    order_index: Optional[int] = 0

class TopicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty_level: Optional[int] = None
    estimated_hours: Optional[float] = None
    order_index: Optional[int] = None

class TopicBatchCreate(BaseModel):
    topics: List[TopicCreate]

class ExtractedTopicCreate(BaseModel):
    """For topics extracted from AI (with parent_topic_title instead of parent_topic_id)"""
    title: str
    description: Optional[str] = None
    parent_topic_title: Optional[str] = None
    difficulty_level: Optional[int] = 1
    estimated_hours: Optional[float] = None

class ExtractedTopicsBatchCreate(BaseModel):
    """Batch create topics from AI extraction"""
    subject_id: str
    topics: List[ExtractedTopicCreate]

@router.post("/")
async def create_topic(topic: TopicCreate, user_id: str = Depends(get_user_id)):
    """Create a new topic"""
    # Verify subject belongs to user
    supabase = db.get_client()
    subject_result = supabase.table("subjects").select("id").eq("id", topic.subject_id).eq("user_id", user_id).execute()
    
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    topic_data = {
        "subject_id": topic.subject_id,
        "title": topic.title,
        "description": topic.description,
        "parent_topic_id": topic.parent_topic_id,
        "difficulty_level": topic.difficulty_level or 1,
        "estimated_hours": topic.estimated_hours,
        "order_index": topic.order_index or 0
    }
    
    result = supabase.table("topics").insert(topic_data).execute()
    return result.data[0]

@router.post("/batch")
async def create_topics_batch(batch: TopicBatchCreate, user_id: str = Depends(get_user_id)):
    """Create multiple topics at once"""
    supabase = db.get_client()
    
    # Verify subject belongs to user
    if batch.topics:
        subject_id = batch.topics[0].subject_id
        subject_result = supabase.table("subjects").select("id").eq("id", subject_id).eq("user_id", user_id).execute()
        if not subject_result.data:
            raise HTTPException(status_code=404, detail="Subject not found")
    
    topics_data = []
    for topic in batch.topics:
        # Verify subject belongs to user
        subject_result = supabase.table("subjects").select("id").eq("id", topic.subject_id).eq("user_id", user_id).execute()
        if not subject_result.data:
            continue
        
        topics_data.append({
            "subject_id": topic.subject_id,
            "title": topic.title,
            "description": topic.description,
            "parent_topic_id": topic.parent_topic_id,
            "difficulty_level": topic.difficulty_level or 1,
            "estimated_hours": topic.estimated_hours,
            "order_index": topic.order_index or 0
        })
    
    if topics_data:
        result = supabase.table("topics").insert(topics_data).execute()
        return {"created": len(result.data), "topics": result.data}
    
    return {"created": 0, "topics": []}

@router.post("/batch-from-extraction")
async def create_topics_from_extraction(
    batch: ExtractedTopicsBatchCreate,
    user_id: str = Depends(get_user_id)
):
    """
    Create topics from AI extraction
    Handles parent topic relationships by title
    """
    supabase = db.get_client()
    
    # Verify subject belongs to user
    subject_result = supabase.table("subjects").select("id").eq("id", batch.subject_id).eq("user_id", user_id).execute()
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Separate main topics and subtopics
    main_topics = [t for t in batch.topics if not t.parent_topic_title]
    subtopics = [t for t in batch.topics if t.parent_topic_title]
    
    # Create a map of title to topic_id for parent topics
    title_to_id_map = {}
    
    # Insert main topics first
    main_topics_data = []
    for idx, topic in enumerate(main_topics):
        main_topics_data.append({
            "subject_id": batch.subject_id,
            "title": topic.title,
            "description": topic.description,
            "parent_topic_id": None,
            "difficulty_level": topic.difficulty_level or 1,
            "estimated_hours": topic.estimated_hours,
            "order_index": idx
        })
    
    # Insert main topics first
    all_created_ids = []
    if main_topics_data:
        result_main = supabase.table("topics").insert(main_topics_data).execute()
        all_created_ids.extend([t["id"] for t in result_main.data])
        # Build title to ID mapping for subtopics
        for topic_data, inserted_topic in zip(main_topics_data, result_main.data):
            title_to_id_map[topic_data["title"]] = inserted_topic["id"]
    
    # Insert subtopics with parent_topic_id
    subtopics_data = []
    for idx, topic in enumerate(subtopics):
        parent_id = title_to_id_map.get(topic.parent_topic_title)
        if not parent_id:
            # Parent topic not found, skip this subtopic
            continue
        
        subtopics_data.append({
            "subject_id": batch.subject_id,
            "title": topic.title,
            "description": topic.description,
            "parent_topic_id": parent_id,
            "difficulty_level": topic.difficulty_level or 1,
            "estimated_hours": topic.estimated_hours,
            "order_index": idx
        })
    
    if subtopics_data:
        result_subtopics = supabase.table("topics").insert(subtopics_data).execute()
        all_created_ids.extend([t["id"] for t in result_subtopics.data])
    
    # Get all created topics
    if all_created_ids:
        all_created = supabase.table("topics").select("*").in_("id", all_created_ids).execute().data
        return {"created": len(all_created), "topics": all_created}
    
    return {"created": 0, "topics": []}

@router.get("/subject/{subject_id}")
async def list_topics_by_subject(subject_id: str, user_id: str = Depends(get_user_id)):
    """List all topics for a subject"""
    # Verify subject belongs to user
    supabase = db.get_client()
    subject_result = supabase.table("subjects").select("id").eq("id", subject_id).eq("user_id", user_id).execute()
    
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    result = supabase.table("topics").select("*").eq("subject_id", subject_id).order("order_index").execute()
    return result.data

@router.get("/subject/{subject_id}/with-progress")
async def list_topics_with_progress(subject_id: str, user_id: str = Depends(get_user_id)):
    """Get all topics for a subject with progress data"""
    supabase = db.get_client()
    
    # Verify subject belongs to user
    subject_result = supabase.table("subjects").select("id").eq("id", subject_id).eq("user_id", user_id).execute()
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get topics
    topics_result = supabase.table("topics").select("*").eq("subject_id", subject_id).order("order_index").execute()
    topics = topics_result.data
    
    # Get progress data for all topics
    topic_ids = [t["id"] for t in topics]
    progress_result = supabase.table("topic_progress").select("*").eq("user_id", user_id).in_("topic_id", topic_ids).execute()
    
    # Create a map of topic_id -> progress
    progress_map = {p["topic_id"]: p for p in progress_result.data}
    
    # Merge progress data into topics
    topics_with_progress = []
    for topic in topics:
        topic_progress = progress_map.get(topic["id"], {})
        topics_with_progress.append({
            **topic,
            "mastery_score": topic_progress.get("mastery_score"),
            "is_weak_area": topic_progress.get("is_weak_area", False),
            "completion_percentage": topic_progress.get("completion_percentage", 0),
            "last_studied_at": topic_progress.get("last_studied_at"),
        })
    
    return topics_with_progress

# IMPORTANT: Specific routes (with more path segments) must come BEFORE general routes
# This prevents FastAPI from matching "toggle-completion" as a topic_id

@router.post("/{topic_id}/toggle-completion")
async def toggle_topic_completion(topic_id: str, user_id: str = Depends(get_user_id)):
    """
    Toggle topic completion status (manual progress tracking)
    Creates or updates topic_progress with manual completion flag
    """
    supabase = db.get_client()
    
    # Verify topic belongs to user
    topic_result = supabase.table("topics").select("*, subjects!inner(user_id)").eq("id", topic_id).execute()
    if not topic_result.data or topic_result.data[0]["subjects"]["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Get current progress
    progress_result = supabase.table("topic_progress").select("*").eq("user_id", user_id).eq("topic_id", topic_id).execute()
    
    if progress_result.data:
        # Toggle existing completion
        current_progress = progress_result.data[0]
        current_completion = current_progress.get("completion_percentage", 0)
        new_completion = 0 if current_completion >= 100 else 100
        new_mastery = 0 if current_completion >= 100 else 100
        
        update_data = {
            "completion_percentage": new_completion,
            "mastery_score": new_mastery,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("topic_progress").update(update_data).eq("id", current_progress["id"]).execute()
        return {
            "topic_id": topic_id,
            "completed": new_completion >= 100,
            "completion_percentage": new_completion,
            "mastery_score": new_mastery
        }
    else:
        # Create new progress record (mark as complete)
        progress_data = {
            "user_id": user_id,
            "topic_id": topic_id,
            "completion_percentage": 100,
            "mastery_score": 100,
            "is_weak_area": False,
            "time_spent_minutes": 0,
            "last_studied_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("topic_progress").insert(progress_data).execute()
        return {
            "topic_id": topic_id,
            "completed": True,
            "completion_percentage": 100,
            "mastery_score": 100
        }

@router.get("/{topic_id}")
async def get_topic(topic_id: str, user_id: str = Depends(get_user_id)):
    """Get a specific topic"""
    supabase = db.get_client()
    result = supabase.table("topics").select("*, subjects!inner(user_id)").eq("id", topic_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Check user ownership through subject
    topic = result.data[0]
    if topic["subjects"]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Remove nested subject data
    topic.pop("subjects", None)
    return topic

@router.put("/{topic_id}")
async def update_topic(topic_id: str, topic: TopicUpdate, user_id: str = Depends(get_user_id)):
    """Update a topic"""
    supabase = db.get_client()
    
    # Verify ownership
    topic_result = supabase.table("topics").select("*, subjects!inner(user_id)").eq("id", topic_id).execute()
    if not topic_result.data or topic_result.data[0]["subjects"]["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    update_data = {}
    if topic.title is not None:
        update_data["title"] = topic.title
    if topic.description is not None:
        update_data["description"] = topic.description
    if topic.difficulty_level is not None:
        update_data["difficulty_level"] = topic.difficulty_level
    if topic.estimated_hours is not None:
        update_data["estimated_hours"] = topic.estimated_hours
    if topic.order_index is not None:
        update_data["order_index"] = topic.order_index
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("topics").update(update_data).eq("id", topic_id).execute()
    return result.data[0]

@router.delete("/{topic_id}")
async def delete_topic(topic_id: str, user_id: str = Depends(get_user_id)):
    """Delete a topic"""
    supabase = db.get_client()
    
    # Verify ownership
    topic_result = supabase.table("topics").select("*, subjects!inner(user_id)").eq("id", topic_id).execute()
    if not topic_result.data or topic_result.data[0]["subjects"]["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    result = supabase.table("topics").delete().eq("id", topic_id).execute()
    return {"message": "Topic deleted successfully"}
