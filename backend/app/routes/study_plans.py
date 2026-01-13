"""
Study Plans API routes
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
import json
import asyncio

from app.models.database import db
from app.services.ai_service import AIService
from app.services.study_plan_service import StudyPlanService
from app.middleware.auth import get_user_id
from app.schemas.study_plans import StudyPlanCreate, StudyPlanUpdate

router = APIRouter(prefix="/api/study-plans", tags=["study-plans"])

@router.post("/generate")
async def generate_study_plan(plan_data: StudyPlanCreate, user_id: str = Depends(get_user_id)):
    """Generate a new AI-powered study plan"""
    import traceback
    
    # Log the incoming request data for debugging
    print(f"[Study Plan] Received request: subject_id={plan_data.subject_id}, start_date={plan_data.start_date}, end_date={plan_data.end_date}, available_hours={plan_data.available_hours_per_day}")
    
    supabase = db.get_client()
    
    # Verify subject belongs to user
    subject_result = supabase.table("subjects").select("*").eq("id", plan_data.subject_id).eq("user_id", user_id).execute()
    if not subject_result.data:
        print(f"[Study Plan] Subject not found: {plan_data.subject_id} for user {user_id}")
        raise HTTPException(status_code=404, detail="Subject not found")
    
    subject = subject_result.data[0]
    print(f"[Study Plan] Found subject: {subject.get('name')}")
    
    # Initialize AI service (will be used for topic generation and study plan generation)
    ai_service = AIService()
    
    # Get all topics for the subject
    topics_result = supabase.table("topics").select("*").eq("subject_id", plan_data.subject_id).order("order_index").execute()
    topics = topics_result.data
    
    # If no topics exist, auto-generate them from subject name
    if not topics:
        try:
            print(f"[Study Plan] No topics found for subject {subject.get('name')}, auto-generating topics...")
            generated_topics = await ai_service.generate_topics_from_subject(
                subject_name=subject.get("name", "Subject"),
                subject_description=subject.get("description")
            )
            
            # Save generated topics to database
            topics_data = []
            for idx, topic in enumerate(generated_topics):
                topics_data.append({
                    "subject_id": plan_data.subject_id,
                    "title": topic["title"],
                    "description": topic.get("description"),
                    "difficulty_level": topic.get("difficulty_level", 2),
                    "estimated_hours": topic.get("estimated_hours", 2.0),
                    "order_index": idx,
                    "parent_topic_id": None
                })
            
            if topics_data:
                insert_result = supabase.table("topics").insert(topics_data).execute()
                topics = insert_result.data
                print(f"[Study Plan] Auto-generated {len(topics)} topics for subject")
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="Failed to generate topics. Please upload notes or add topics manually."
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"[Study Plan] Error auto-generating topics: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"No topics found for this subject and failed to auto-generate. Please upload notes or add topics manually. Error: {str(e)}"
            )
    
    # Get user's weak areas with full topic info
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
    
    # Generate study plan using AI
    try:
        topics_for_ai = [
            {
                "title": t["title"],
                "estimated_hours": t.get("estimated_hours", 2.0),
                "difficulty_level": t.get("difficulty_level", 2)
            }
            for t in topics
        ]
        
        # Adjust topic difficulty for weak areas
        topics_for_ai = StudyPlanService.adjust_difficulty_for_weak_areas(topics_for_ai, weak_areas)
        
        # Add timeout to prevent hanging (120 seconds max - increased for complex plans)
        try:
            generated_plan = await asyncio.wait_for(
                ai_service.generate_study_plan(
                    topics=topics_for_ai,
                    exam_date=subject.get("exam_date") or plan_data.end_date,
                    available_hours_per_day=plan_data.available_hours_per_day,
                    user_weak_areas=weak_area_titles if weak_area_titles else None
                ),
                timeout=120.0  # Increased from 90 to 120 seconds
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail="Study plan generation timed out after 120 seconds. This usually happens with many topics or complex plans. Please try again with fewer topics or a shorter time period."
            )
    except ValueError as e:
        # Convert ValueError from AI service to HTTPException
        error_msg = str(e)
        print(f"[Study Plan] ValueError from AI service: {error_msg}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=error_msg)
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        # Log unexpected errors for debugging
        import traceback
        error_msg = str(e)
        print(f"[Study Plan] Unexpected error generating study plan: {error_msg}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate study plan. Please try again. Error: {error_msg}"
        )
    
    # Insert revision days for weak areas
    if weak_areas:
        generated_plan = StudyPlanService.insert_revision_days_for_weak_areas(generated_plan, weak_areas)
    
    # Deactivate existing active plans for this subject
    supabase.table("study_plans").update({"is_active": False}).eq("subject_id", plan_data.subject_id).eq("user_id", user_id).execute()
    
    # Store the plan
    plan_record = {
        "user_id": user_id,
        "subject_id": plan_data.subject_id,
        "plan_type": generated_plan.get("plan_type", plan_data.plan_type),
        "start_date": generated_plan.get("start_date", plan_data.start_date),
        "end_date": generated_plan.get("end_date", plan_data.end_date),
        "plan_data": json.dumps(generated_plan),
        "is_active": True
    }
    
    result = supabase.table("study_plans").insert(plan_record).execute()
    return result.data[0]

@router.get("/all")
async def get_all_study_plans(user_id: str = Depends(get_user_id)):
    """Get all study plans for the current user"""
    import traceback
    
    try:
        supabase = db.get_client()
        
        # Get all study plans for the user (ordered by created_at desc, active plans first)
        result = supabase.table("study_plans").select("*").eq("user_id", user_id).order("is_active", desc=True).order("created_at", desc=True).execute()
        
        if not result.data:
            return []
        
        # Get all unique subject IDs (filter out None values)
        subject_ids = list(set([plan.get("subject_id") for plan in result.data if plan.get("subject_id")]))
        
        # Fetch subject names
        subject_map = {}
        if subject_ids:
            subjects_result = supabase.table("subjects").select("id, name").in_("id", subject_ids).eq("user_id", user_id).execute()
            subject_map = {s["id"]: s["name"] for s in subjects_result.data}
        
        # Parse JSON plan_data for all plans and add subject name
        plans = []
        for plan in result.data:
            try:
                # Parse plan_data if it's a string
                if isinstance(plan.get("plan_data"), str):
                    try:
                        plan["plan_data"] = json.loads(plan["plan_data"])
                    except json.JSONDecodeError as e:
                        print(f"[Study Plan] Error parsing JSON for plan {plan.get('id')}: {str(e)}")
                        # Set to empty dict if JSON is invalid
                        plan["plan_data"] = {}
                
                # Add subject name to plan
                subject_id = plan.get("subject_id")
                plan["subjects"] = {
                    "id": subject_id,
                    "name": subject_map.get(subject_id, "Unknown Subject") if subject_id else "Unknown Subject"
                }
                plans.append(plan)
            except Exception as e:
                print(f"[Study Plan] Error processing plan {plan.get('id', 'unknown')}: {str(e)}")
                print(traceback.format_exc())
                # Skip this plan but continue processing others
                continue
        
        return plans
    except Exception as e:
        print(f"[Study Plan] Error in get_all_study_plans: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch study plans. Error: {str(e)}"
        )

@router.get("/subject/{subject_id}")
async def get_study_plan_by_subject(subject_id: str, user_id: str = Depends(get_user_id)):
    """Get all study plans for a subject (returns array, empty if none exist)"""
    supabase = db.get_client()
    
    # Verify subject belongs to user
    subject_result = supabase.table("subjects").select("id").eq("id", subject_id).eq("user_id", user_id).execute()
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get all study plans for the subject (ordered by created_at desc, active plans first)
    result = supabase.table("study_plans").select("*").eq("subject_id", subject_id).eq("user_id", user_id).order("is_active", desc=True).order("created_at", desc=True).execute()
    
    if not result.data:
        # Return empty array instead of 404 - allows frontend to handle gracefully
        return []
    
    # Parse JSON plan_data for all plans
    plans = []
    for plan in result.data:
        if isinstance(plan["plan_data"], str):
            plan["plan_data"] = json.loads(plan["plan_data"])
        plans.append(plan)
    
    # Always return an array for consistency
    return plans

@router.get("/{plan_id}")
async def get_study_plan(plan_id: str, user_id: str = Depends(get_user_id)):
    """Get a specific study plan"""
    supabase = db.get_client()
    result = supabase.table("study_plans").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    plan = result.data[0]
    # Parse JSON plan_data
    if isinstance(plan["plan_data"], str):
        plan["plan_data"] = json.loads(plan["plan_data"])
    
    return plan

@router.put("/{plan_id}")
async def update_study_plan(plan_id: str, plan_update: StudyPlanUpdate, user_id: str = Depends(get_user_id)):
    """Update a study plan"""
    supabase = db.get_client()
    
    update_data = {}
    if plan_update.plan_data is not None:
        update_data["plan_data"] = json.dumps(plan_update.plan_data)
    if plan_update.is_active is not None:
        update_data["is_active"] = plan_update.is_active
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = supabase.table("study_plans").update(update_data).eq("id", plan_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    plan = result.data[0]
    if isinstance(plan["plan_data"], str):
        plan["plan_data"] = json.loads(plan["plan_data"])
    
    return plan

@router.post("/{plan_id}/regenerate")
async def regenerate_study_plan(plan_id: str, user_id: str = Depends(get_user_id)):
    """Regenerate a study plan based on current progress"""
    supabase = db.get_client()
    
    # Get existing plan
    plan_result = supabase.table("study_plans").select("*, subjects!inner(*)").eq("id", plan_id).eq("user_id", user_id).execute()
    if not plan_result.data:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    existing_plan = plan_result.data[0]
    subject = existing_plan["subjects"]
    
    # Get topics and weak areas (same as generate)
    topics_result = supabase.table("topics").select("*").eq("subject_id", subject["id"]).execute()
    topics = topics_result.data
    
    # Get user's weak areas with full topic info
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
    
    # Generate new plan
    ai_service = AIService()
    topics_for_ai = [
        {
            "title": t["title"],
            "estimated_hours": t.get("estimated_hours", 2.0),
            "difficulty_level": t.get("difficulty_level", 2)
        }
        for t in topics
    ]
    
    # Adjust topic difficulty for weak areas
    topics_for_ai = StudyPlanService.adjust_difficulty_for_weak_areas(topics_for_ai, weak_areas)
    
    # Extract available hours from existing plan or use default
    plan_data = existing_plan["plan_data"]
    if isinstance(plan_data, str):
        plan_data = json.loads(plan_data)
    
    available_hours = 3.0  # default
    if plan_data and isinstance(plan_data, dict):
        days = plan_data.get("days", [])
        if days:
            available_hours = sum(day.get("total_hours", 0) for day in days) / len(days) if days else 3.0
    
    generated_plan = await ai_service.generate_study_plan(
        topics=topics_for_ai,
        exam_date=subject.get("exam_date") or existing_plan["end_date"],
        available_hours_per_day=available_hours,
        user_weak_areas=weak_area_titles if weak_area_titles else None
    )
    
    # Insert revision days for weak areas
    if weak_areas:
        generated_plan = StudyPlanService.insert_revision_days_for_weak_areas(generated_plan, weak_areas)
    
    # Update the plan
    update_data = {
        "plan_data": json.dumps(generated_plan),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("study_plans").update(update_data).eq("id", plan_id).execute()
    
    plan = result.data[0]
    if isinstance(plan["plan_data"], str):
        plan["plan_data"] = json.loads(plan["plan_data"])
    
    return plan

@router.get("/weak-areas/subject/{subject_id}")
async def get_weak_areas_for_subject(subject_id: str, user_id: str = Depends(get_user_id)):
    """Get all weak areas for a subject"""
    supabase = db.get_client()
    
    # Verify subject belongs to user
    subject_result = supabase.table("subjects").select("id").eq("id", subject_id).eq("user_id", user_id).execute()
    if not subject_result.data:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Get weak areas with topic information
    weak_areas_result = supabase.table("topic_progress").select(
        "*, topics!inner(id, title, description, subject_id)"
    ).eq("user_id", user_id).eq("is_weak_area", True).eq("topics.subject_id", subject_id).execute()
    
    weak_areas = []
    for area in weak_areas_result.data:
        if area.get("topics"):
            weak_areas.append({
                "topic_id": area["topics"]["id"],
                "topic_title": area["topics"]["title"],
                "topic_description": area["topics"].get("description"),
                "mastery_score": area.get("mastery_score", 0),
                "time_spent_minutes": area.get("time_spent_minutes", 0),
                "last_studied_at": area.get("last_studied_at"),
                "completion_percentage": area.get("completion_percentage", 0)
            })
    
    return {"weak_areas": weak_areas, "count": len(weak_areas)}

@router.post("/{plan_id}/toggle-day-completion")
async def toggle_day_completion(
    plan_id: str,
    day_index: int = Query(..., description="Index of the day in the plan (0-based)"),
    user_id: str = Depends(get_user_id)
):
    """Toggle completion status for a specific day in the study plan"""
    supabase = db.get_client()
    
    # Get the plan
    result = supabase.table("study_plans").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    plan = result.data[0]
    plan_data = plan["plan_data"]
    
    # Parse JSON if needed
    if isinstance(plan_data, str):
        plan_data = json.loads(plan_data)
    
    # Validate day index
    days = plan_data.get("days", [])
    if day_index < 0 or day_index >= len(days):
        raise HTTPException(status_code=400, detail=f"Invalid day index. Must be between 0 and {len(days) - 1}")
    
    # Toggle completion status
    day = days[day_index]
    current_status = day.get("completed", False)
    day["completed"] = not current_status
    
    # If marking as completed, also set completed_at timestamp
    if day["completed"]:
        day["completed_at"] = datetime.utcnow().isoformat()
    else:
        day.pop("completed_at", None)
    
    # Update plan in database
    update_data = {
        "plan_data": json.dumps(plan_data),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("study_plans").update(update_data).eq("id", plan_id).eq("user_id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    updated_plan = result.data[0]
    if isinstance(updated_plan["plan_data"], str):
        updated_plan["plan_data"] = json.loads(updated_plan["plan_data"])
    
    return {
        "plan": updated_plan,
        "day_index": day_index,
        "completed": day["completed"]
    }

@router.post("/{plan_id}/update-weak-areas")
async def update_study_plan_with_weak_areas(plan_id: str, user_id: str = Depends(get_user_id)):
    """Update study plan to include revision days for current weak areas"""
    supabase = db.get_client()
    
    # Get existing plan
    plan_result = supabase.table("study_plans").select("*, subjects!inner(*)").eq("id", plan_id).eq("user_id", user_id).execute()
    if not plan_result.data:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    existing_plan = plan_result.data[0]
    subject = existing_plan["subjects"]
    
    # Get current weak areas
    weak_areas_result = supabase.table("topic_progress").select("*, topics!inner(*)").eq("user_id", user_id).eq("is_weak_area", True).eq("topics.subject_id", subject["id"]).execute()
    weak_areas = [
        {
            "topic_title": area["topics"]["title"],
            "mastery_score": area.get("mastery_score", 0),
            "topic_id": area["topics"]["id"]
        }
        for area in weak_areas_result.data if area.get("topics")
    ]
    
    if not weak_areas:
        return {
            "message": "No weak areas found. Study plan unchanged.",
            "weak_areas_count": 0
        }
    
    # Get current plan data
    plan_data = existing_plan["plan_data"]
    if isinstance(plan_data, str):
        plan_data = json.loads(plan_data)
    
    # Insert revision days for weak areas
    updated_plan_data = StudyPlanService.insert_revision_days_for_weak_areas(plan_data, weak_areas)
    
    # Update the plan
    update_data = {
        "plan_data": json.dumps(updated_plan_data),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("study_plans").update(update_data).eq("id", plan_id).execute()
    
    return {
        "message": f"Study plan updated with {len(weak_areas)} weak area(s). Revision days added.",
        "weak_areas_count": len(weak_areas),
        "weak_areas": [area["topic_title"] for area in weak_areas]
    }

