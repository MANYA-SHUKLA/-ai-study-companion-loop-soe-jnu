"""
Notes API routes - Handle file uploads and note management
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid
from datetime import datetime, timedelta

from app.models.database import db
from app.services.file_parser import FileParser
from app.services.ai_service import AIService
from app.services.pinecone_service import PineconeService
from app.services.study_plan_service import StudyPlanService
from app.middleware.auth import get_user_id
import json
import asyncio

def log_embedding_operation(
    supabase,
    note_id: str,
    user_id: str,
    action_type: str,
    status: str,
    error_message: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """
    Log embedding operation to audit table
    
    Args:
        supabase: Supabase client
        note_id: Note ID
        user_id: User ID
        action_type: 'upsert', 'delete', or 'reindex'
        status: 'success', 'failed', or 'pending'
        error_message: Error message if status is 'failed'
        metadata: Additional metadata (JSON)
    """
    try:
        log_data = {
            "note_id": note_id,
            "user_id": user_id,
            "action_type": action_type,
            "status": status,
            "error_message": error_message,
            "metadata": metadata or {}
        }
        supabase.table("note_embedding_logs").insert(log_data).execute()
    except Exception as e:
        # Don't fail the main operation if logging fails
        print(f"Warning: Failed to log embedding operation: {str(e)}")

router = APIRouter(prefix="/api/notes", tags=["notes"])

# Temporary upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_note(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    user_id: str = Depends(get_user_id)
):
    """Upload and parse a note file (PDF, text, markdown)"""
    file_path = None
    try:
        # Validate file type and size using utility functions
        from app.utils.validators import validate_file_upload, validate_file_size
        
        file_ext, _ = validate_file_upload(file)
        file_content = await validate_file_size(file)
        
        # Save file temporarily
        file_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
        
        # Ensure upload directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Parse file
        file_type = file_ext[1:]  # Remove dot
        parser = FileParser()
        text_content = parser.parse_file(file_path, file_type)
        
        # Determine file type for database
        if file_ext == '.pdf':
            db_file_type = 'pdf'
        elif file_ext in ['.md', '.markdown']:
            db_file_type = 'md'
        else:
            db_file_type = 'txt'
        
        # Verify subject belongs to user if provided
        supabase = db.get_client()
        if subject_id:
            subject_result = supabase.table("subjects").select("id").eq("id", subject_id).eq("user_id", user_id).execute()
            if not subject_result.data:
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(status_code=404, detail="Subject not found")
        
        # Store in database
        note_data = {
            "id": file_id,
            "user_id": user_id,
            "subject_id": subject_id,
            "topic_id": topic_id,
            "title": file.filename,
            "content": text_content,
            "file_type": db_file_type,
            "file_url": file_path,  # In production, upload to S3/cloud storage
            "embeddings_stored": False
        }
        
        result = supabase.table("notes").insert(note_data).execute()
        
        # Clean up temp file immediately (don't wait for embeddings)
        os.remove(file_path)
        
        # Store embeddings in Pinecone asynchronously (non-blocking)
        # This will run in the background and not delay the response
        def store_embeddings_background():
            try:
                # Log pending operation
                log_embedding_operation(
                    supabase, file_id, user_id, "upsert", "pending",
                    metadata={"reason": "initial_upload", "file_name": file.filename}
                )
                
                pinecone = PineconeService()
                metadata = {
                    "user_id": user_id,
                    "subject_id": subject_id or "",
                    "topic_id": topic_id or "",
                    "title": file.filename,
                    "file_type": db_file_type
                }
                pinecone.upsert_note(file_id, text_content, metadata)
                
                # Update note to mark embeddings as stored
                supabase.table("notes").update({"embeddings_stored": True}).eq("id", file_id).execute()
                
                # Log success
                log_embedding_operation(
                    supabase, file_id, user_id, "upsert", "success",
                    metadata={"reason": "initial_upload", "file_name": file.filename, "content_length": len(text_content)}
                )
            except Exception as e:
                error_msg = str(e)
                print(f"Error storing embeddings: {error_msg}")
                
                # Log failure
                log_embedding_operation(
                    supabase, file_id, user_id, "upsert", "failed",
                    error_message=error_msg,
                    metadata={"reason": "initial_upload", "file_name": file.filename}
                )
        
        # Add embedding storage to background tasks (non-blocking)
        background_tasks.add_task(store_embeddings_background)
        
        # Return response immediately - embeddings will be processed in background
        # User can check embedding status later or reindex if needed
        embeddings_stored = False  # Will be updated by background task
        
        # Remove automatic study plan generation from upload endpoint
        # Users should generate study plans manually after uploading notes
        # This significantly speeds up the upload process
        study_plan_generated = False
        study_plan_id = None
        study_plan_error = None
        
        if False:  # Disabled automatic study plan generation
            try:
                # Get subject details
                subject_result = supabase.table("subjects").select("*").eq("id", subject_id).eq("user_id", user_id).execute()
                if subject_result.data:
                    subject = subject_result.data[0]
                    
                    # Initialize AI service
                    ai_service = AIService()
                    
                    # Get topics for the subject (or generate them if none exist)
                    topics_result = supabase.table("topics").select("*").eq("subject_id", subject_id).order("order_index").execute()
                    topics = topics_result.data
                    
                    # If no topics exist, try to extract topics from the uploaded note
                    if not topics:
                        try:
                            print(f"[Auto Study Plan] No topics found, extracting from note...")
                            extracted_topics = await ai_service.extract_topics(text_content, subject.get("name", "Subject"))
                            
                            # Save extracted topics
                            if extracted_topics:
                                topics_data = []
                                for idx, topic in enumerate(extracted_topics):
                                    topics_data.append({
                                        "subject_id": subject_id,
                                        "title": topic.get("title", f"Topic {idx + 1}"),
                                        "description": topic.get("description"),
                                        "difficulty_level": topic.get("difficulty_level", 2),
                                        "estimated_hours": topic.get("estimated_hours", 2.0),
                                        "order_index": idx,
                                        "parent_topic_id": None
                                    })
                                
                                if topics_data:
                                    insert_result = supabase.table("topics").insert(topics_data).execute()
                                    topics = insert_result.data
                                    print(f"[Auto Study Plan] Extracted and saved {len(topics)} topics from note")
                        except Exception as e:
                            print(f"[Auto Study Plan] Error extracting topics from note: {str(e)}")
                            # Continue without topics - will auto-generate in study plan generation
                    
                    # Prepare study plan parameters
                    today = datetime.now().date()
                    start_date = today.strftime("%Y-%m-%d")
                    
                    # Use exam_date from subject if available, otherwise default to 30 days from now
                    if subject.get("exam_date"):
                        exam_date_str = subject["exam_date"]
                        if isinstance(exam_date_str, str) and "T" in exam_date_str:
                            exam_date_str = exam_date_str.split("T")[0]
                        end_date = exam_date_str
                    else:
                        end_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
                    
                    # Default available hours per day
                    available_hours_per_day = 3.0
                    
                    # Prepare topics for AI
                    if topics:
                        topics_for_ai = [
                            {
                                "title": t["title"],
                                "estimated_hours": t.get("estimated_hours", 2.0),
                                "difficulty_level": t.get("difficulty_level", 2)
                            }
                            for t in topics
                        ]
                        
                        # Get weak areas
                        weak_areas_result = supabase.table("topic_progress").select("*, topics!inner(*)").eq("user_id", user_id).eq("is_weak_area", True).execute()
                        weak_areas = [
                            {
                                "topic_title": area["topics"]["title"],
                                "mastery_score": area.get("mastery_score", 0),
                                "topic_id": area["topics"]["id"]
                            }
                            for area in weak_areas_result.data if area.get("topics")
                        ]
                        weak_area_titles = [area["topic_title"] for area in weak_areas]
                        
                        # Adjust difficulty for weak areas
                        topics_for_ai = StudyPlanService.adjust_difficulty_for_weak_areas(topics_for_ai, weak_areas)
                    else:
                        # No topics available - AI service will auto-generate from subject name
                        topics_for_ai = []
                        weak_area_titles = None
                    
                    # Generate study plan using AI (with timeout)
                    try:
                        generated_plan = await asyncio.wait_for(
                            ai_service.generate_study_plan(
                                topics=topics_for_ai,
                                exam_date=end_date,
                                available_hours_per_day=available_hours_per_day,
                                user_weak_areas=weak_area_titles if weak_area_titles else None
                            ),
                            timeout=90.0
                        )
                        
                        # Insert revision days for weak areas if any
                        if topics and weak_areas:
                            generated_plan = StudyPlanService.insert_revision_days_for_weak_areas(generated_plan, weak_areas)
                        
                        # Deactivate existing active plans for this subject
                        supabase.table("study_plans").update({"is_active": False}).eq("subject_id", subject_id).eq("user_id", user_id).execute()
                        
                        # Store the plan
                        plan_record = {
                            "user_id": user_id,
                            "subject_id": subject_id,
                            "plan_type": generated_plan.get("plan_type", "daily"),
                            "start_date": generated_plan.get("start_date", start_date),
                            "end_date": generated_plan.get("end_date", end_date),
                            "plan_data": json.dumps(generated_plan),
                            "is_active": True
                        }
                        
                        plan_result = supabase.table("study_plans").insert(plan_record).execute()
                        if plan_result.data:
                            study_plan_id = plan_result.data[0]["id"]
                            study_plan_generated = True
                            print(f"[Auto Study Plan] Successfully generated study plan {study_plan_id} for subject {subject_id}")
                    except asyncio.TimeoutError:
                        study_plan_error = "Study plan generation timed out"
                        print(f"[Auto Study Plan] Timeout generating study plan: {study_plan_error}")
                    except Exception as e:
                        study_plan_error = str(e)
                        print(f"[Auto Study Plan] Error generating study plan: {study_plan_error}")
                        
            except Exception as e:
                study_plan_error = str(e)
                print(f"[Auto Study Plan] Unexpected error during study plan generation: {study_plan_error}")
                # Don't fail the upload if study plan generation fails
        
        response_data = {
            "id": file_id,
            "title": file.filename,
            "embeddings_stored": embeddings_stored,  # False initially, will be updated by background task
            "content_length": len(text_content),
            "message": "Note uploaded successfully. Embeddings are being processed in the background."
        }
        
        # Note: Study plan generation is now manual - users should use the generate endpoint
        # This makes uploads much faster (from 30-90 seconds to 2-5 seconds)
        
        return JSONResponse(response_data)
    
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

# Alias route for simpler API (as per requirements: POST /upload-notes)
@router.post("/upload-notes", include_in_schema=False)
async def upload_notes_alias(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    user_id: str = Depends(get_user_id)
):
    """Alias for /api/notes/upload - Upload notes endpoint"""
    # Reuse the main upload handler
    return await upload_note(background_tasks, file, subject_id, topic_id, user_id)

@router.get("/{note_id}")
async def get_note(note_id: str, user_id: str = Depends(get_user_id)):
    """Get a specific note by ID"""
    supabase = db.get_client()
    
    # First check if it's a note ID (UUID format)
    # Try to get as note
    note_result = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
    if note_result.data:
        return note_result.data[0]
    
    # If not found as note, check if it's a subject_id (for alias route)
    # This allows GET /api/notes/{subject_id} to work as alias for GET /api/notes/subject/{subject_id}
    subject_result = supabase.table("subjects").select("id").eq("id", note_id).eq("user_id", user_id).execute()
    if subject_result.data:
        # It's a subject_id, return notes for that subject
        return await get_notes_by_subject(note_id, user_id)
    
    # Neither note nor subject found
    raise HTTPException(status_code=404, detail="Note not found")

@router.get("/")
async def list_notes(
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    user_id: str = Depends(get_user_id)
):
    """List all notes for a user, optionally filtered by subject/topic"""
    supabase = db.get_client()
    query = supabase.table("notes").select("*").eq("user_id", user_id)
    
    if subject_id:
        query = query.eq("subject_id", subject_id)
    if topic_id:
        query = query.eq("topic_id", topic_id)
    
    result = query.execute()
    return result.data

@router.get("/subject/{subject_id}")
async def get_notes_by_subject(subject_id: str, user_id: str = Depends(get_user_id)):
    """Get all notes for a specific subject"""
    supabase = db.get_client()
    
    # Verify subject belongs to user
    subject_result = supabase.table("subjects").select("id").eq("id", subject_id).eq("user_id", user_id).execute()
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    result = supabase.table("notes").select("*").eq("user_id", user_id).eq("subject_id", subject_id).order("created_at", desc=True).execute()
    return result.data

@router.delete("/{note_id}")
async def delete_note(note_id: str, user_id: str = Depends(get_user_id)):
    """Delete a note"""
    supabase = db.get_client()
    
    # Verify note exists and belongs to user
    note_result = supabase.table("notes").select("id, title").eq("id", note_id).eq("user_id", user_id).execute()
    if not note_result.data:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note_title = note_result.data[0].get("title", "")
    
    # Delete from Pinecone
    try:
        # Log pending operation
        log_embedding_operation(
            supabase, note_id, user_id, "delete", "pending",
            metadata={"reason": "note_deletion", "note_title": note_title}
        )
        
        pinecone = PineconeService()
        pinecone.delete_note(note_id)
        
        # Log success
        log_embedding_operation(
            supabase, note_id, user_id, "delete", "success",
            metadata={"reason": "note_deletion", "note_title": note_title}
        )
    except Exception as e:
        error_msg = str(e)
        print(f"Error deleting from Pinecone: {error_msg}")
        
        # Log failure
        log_embedding_operation(
            supabase, note_id, user_id, "delete", "failed",
            error_message=error_msg,
            metadata={"reason": "note_deletion", "note_title": note_title}
        )
        # Continue with database deletion even if Pinecone deletion fails
    
    # Delete from database
    result = supabase.table("notes").delete().eq("id", note_id).eq("user_id", user_id).execute()
    
    return {"message": "Note deleted successfully"}

@router.post("/{note_id}/extract-topics")
async def extract_topics_from_note(
    note_id: str,
    subject_id: str = Query(..., description="Subject ID"),
    user_id: str = Depends(get_user_id)
):
    """
    Extract topics from a note using AI (Gemini/OpenAI) and return structured topics.
    
    This endpoint is isolated from Pinecone/embeddings:
    - Uses only AI service (Gemini or OpenAI) for topic extraction
    - Uses only database (Supabase) for note/subject retrieval
    - Does NOT interact with Pinecone or embeddings
    
    Returns extracted topics. Use /api/topics/batch-from-extraction to save them to database.
    
    Note: Embeddings are handled separately in upload/reindex endpoints.
    """
    supabase = db.get_client()
    
    # Get note from database (no Pinecone involved)
    note_result = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
    if not note_result.data:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = note_result.data[0]
    
    # Verify subject belongs to user (database only)
    subject_result = supabase.table("subjects").select("*").eq("id", subject_id).eq("user_id", user_id).execute()
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    subject = subject_result.data[0]
    
    # Extract topics using AI service (Gemini/OpenAI only - no Pinecone)
    try:
        ai_service = AIService()
        topics = await ai_service.extract_topics(note["content"], subject["name"])
        
        # Return topics (client will save them via batch endpoint)
        return {
            "note_id": note_id,
            "subject_id": subject_id,
            "topics": topics,
            "message": f"Extracted {len(topics)} topics from note"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting topics: {str(e)}")

@router.post("/{note_id}/reindex-embeddings")
async def reindex_embeddings(
    note_id: str,
    user_id: str = Depends(get_user_id)
):
    """
    Regenerate and reindex embeddings for a note
    
    Useful when:
    - Embeddings failed during initial upload
    - Note content was updated
    - Embedding provider was changed
    - Need to verify embeddings are stored correctly
    """
    supabase = db.get_client()
    
    # Get note and verify ownership
    note_result = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
    if not note_result.data:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = note_result.data[0]
    
    # Check if note has content
    if not note.get("content"):
        raise HTTPException(status_code=400, detail="Note has no content to index")
    
    text_content = note["content"]
    
    # Regenerate embeddings and store in Pinecone
    try:
        # Log pending operation
        log_embedding_operation(
            supabase, note_id, user_id, "reindex", "pending",
            metadata={
                "reason": "manual_reindex",
                "note_title": note.get("title", ""),
                "previous_status": note.get("embeddings_stored", False)
            }
        )
        
        pinecone = PineconeService()
        
        # Prepare metadata
        metadata = {
            "user_id": user_id,
            "subject_id": note.get("subject_id") or "",
            "topic_id": note.get("topic_id") or "",
            "title": note.get("title", ""),
            "file_type": note.get("file_type", "")
        }
        
        # Upsert embeddings (will overwrite existing if present)
        pinecone.upsert_note(note_id, text_content, metadata)
        
        # Update note to mark embeddings as stored
        supabase.table("notes").update({
            "embeddings_stored": True,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", note_id).execute()
        
        # Log success
        log_embedding_operation(
            supabase, note_id, user_id, "reindex", "success",
            metadata={
                "reason": "manual_reindex",
                "note_title": note.get("title", ""),
                "content_length": len(text_content)
            }
        )
        
        return {
            "note_id": note_id,
            "message": "Embeddings regenerated and stored successfully",
            "embeddings_stored": True,
            "content_length": len(text_content)
        }
        
    except Exception as e:
        error_msg = str(e)
        
        # Update note to mark embeddings as failed
        supabase.table("notes").update({
            "embeddings_stored": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", note_id).execute()
        
        # Log failure
        log_embedding_operation(
            supabase, note_id, user_id, "reindex", "failed",
            error_message=error_msg,
            metadata={
                "reason": "manual_reindex",
                "note_title": note.get("title", "")
            }
        )
        
        raise HTTPException(
            status_code=500,
            detail=f"Error regenerating embeddings: {error_msg}"
        )

@router.post("/reindex-all")
async def reindex_all_embeddings(
    user_id: str = Depends(get_user_id),
    subject_id: Optional[str] = Query(None, description="Optional: Only reindex notes for a specific subject")
):
    """
    Reindex all notes that don't have embeddings stored
    
    Useful for:
    - Bulk reindexing after initial setup
    - Recovering from embedding failures
    - Reindexing after changing embedding provider
    """
    supabase = db.get_client()
    
    # Build query to get notes without embeddings
    query = supabase.table("notes").select("*").eq("user_id", user_id).eq("embeddings_stored", False)
    
    if subject_id:
        query = query.eq("subject_id", subject_id)
    
    notes_result = query.execute()
    
    if not notes_result.data:
        return {
            "message": "No notes found that need reindexing",
            "reindexed_count": 0,
            "failed_count": 0
        }
    
    notes = notes_result.data
    reindexed_count = 0
    failed_count = 0
    failed_note_ids = []
    
    pinecone = PineconeService()
    
    for note in notes:
        note_id = note["id"]
        text_content = note.get("content")
        
        if not text_content:
            failed_count += 1
            failed_note_ids.append(note_id)
            continue
        
        try:
            # Log pending operation
            log_embedding_operation(
                supabase, note_id, user_id, "reindex", "pending",
                metadata={
                    "reason": "bulk_reindex",
                    "note_title": note.get("title", "")
                }
            )
            
            # Prepare metadata
            metadata = {
                "user_id": user_id,
                "subject_id": note.get("subject_id") or "",
                "topic_id": note.get("topic_id") or "",
                "title": note.get("title", ""),
                "file_type": note.get("file_type", "")
            }
            
            # Upsert embeddings
            pinecone.upsert_note(note_id, text_content, metadata)
            
            # Update note to mark embeddings as stored
            supabase.table("notes").update({
                "embeddings_stored": True,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", note_id).execute()
            
            # Log success
            log_embedding_operation(
                supabase, note_id, user_id, "reindex", "success",
                metadata={
                    "reason": "bulk_reindex",
                    "note_title": note.get("title", ""),
                    "content_length": len(text_content)
                }
            )
            
            reindexed_count += 1
        except Exception as e:
            error_msg = str(e)
            failed_count += 1
            failed_note_ids.append(note_id)
            
            # Update note to mark embeddings as failed
            supabase.table("notes").update({
                "embeddings_stored": False,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", note_id).execute()
            
            # Log failure
            log_embedding_operation(
                supabase, note_id, user_id, "reindex", "failed",
                error_message=error_msg,
                metadata={
                    "reason": "bulk_reindex",
                    "note_title": note.get("title", "")
                }
            )
    
    return {
        "message": f"Reindexing complete: {reindexed_count} succeeded, {failed_count} failed",
        "reindexed_count": reindexed_count,
        "failed_count": failed_count,
        "failed_note_ids": failed_note_ids,
        "total_notes": len(notes)
    }

