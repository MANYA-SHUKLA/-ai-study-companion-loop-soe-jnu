"""
Pydantic schemas for Study Plans
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
from datetime import date, datetime


class ActivitySchema(BaseModel):
    """Schema for a single activity in a study plan day"""
    topic: str = Field(..., min_length=1, max_length=255, description="Topic name")
    activity: Literal["learn", "revise", "quiz"] = Field(
        ..., 
        description="Activity type: learn (new content), revise (review), or quiz (practice)"
    )
    hours: float = Field(..., ge=0.1, le=12.0, description="Hours allocated for this activity")

    @validator('topic')
    def topic_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Topic name cannot be empty')
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "topic": "Linear Equations",
                "activity": "learn",
                "hours": 2.0
            }
        }


class PlanDaySchema(BaseModel):
    """Schema for a single day in a study plan"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    activities: List[ActivitySchema] = Field(..., min_items=1, description="List of activities for this day")
    total_hours: float = Field(..., ge=0.1, le=24.0, description="Total hours for this day")

    @validator('date')
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

    @validator('total_hours')
    def validate_total_hours(cls, v, values):
        if 'activities' in values:
            calculated_hours = sum(act.hours for act in values['activities'])
            # Allow small floating point differences (0.1 hour tolerance)
            if abs(v - calculated_hours) > 0.1:
                raise ValueError(f'Total hours ({v}) should match sum of activity hours ({calculated_hours})')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "date": "2024-01-01",
                "activities": [
                    {
                        "topic": "Linear Equations",
                        "activity": "learn",
                        "hours": 2.0
                    }
                ],
                "total_hours": 2.0
            }
        }


class StudyPlanCreate(BaseModel):
    """Schema for creating a new study plan"""
    subject_id: str = Field(..., description="Subject UUID")
    plan_type: Literal["daily", "weekly"] = Field(default="daily", description="Plan type")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: str = Field(..., description="End date (exam date) in YYYY-MM-DD format")
    available_hours_per_day: float = Field(
        default=3.0, 
        ge=0.5, 
        le=24.0, 
        description="Available study hours per day"
    )

    @validator('subject_id')
    def validate_uuid(cls, v):
        if not v or len(v) < 10:  # Basic UUID validation
            raise ValueError('Invalid subject ID format')
        return v

    @validator('start_date', 'end_date')
    def validate_date_format(cls, v):
        try:
            parsed_date = datetime.strptime(v, "%Y-%m-%d").date()
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

    @validator('end_date')
    def validate_end_after_start(cls, v, values):
        if 'start_date' in values:
            try:
                start = datetime.strptime(values['start_date'], "%Y-%m-%d").date()
                end = datetime.strptime(v, "%Y-%m-%d").date()
                if end <= start:
                    raise ValueError('End date must be after start date')
            except (ValueError, KeyError):
                pass  # Let other validators handle format errors
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "subject_id": "123e4567-e89b-12d3-a456-426614174000",
                "plan_type": "daily",
                "start_date": "2024-01-01",
                "end_date": "2024-01-30",
                "available_hours_per_day": 3.0
            }
        }


class StudyPlanUpdate(BaseModel):
    """Schema for updating a study plan"""
    plan_data: Optional[dict] = Field(None, description="Updated plan data (JSON)")
    is_active: Optional[bool] = Field(None, description="Whether the plan is active")

    @validator('plan_data')
    def validate_plan_data_structure(cls, v):
        if v is not None:
            if not isinstance(v, dict):
                raise ValueError('plan_data must be a dictionary')
            # Validate structure if provided
            if 'days' in v:
                if not isinstance(v['days'], list):
                    raise ValueError('plan_data.days must be a list')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "plan_data": {
                    "days": [
                        {
                            "date": "2024-01-01",
                            "activities": [
                                {
                                    "topic": "Linear Equations",
                                    "activity": "learn",
                                    "hours": 2.0
                                }
                            ],
                            "total_hours": 2.0
                        }
                    ]
                },
                "is_active": True
            }
        }


class StudyPlanResponse(BaseModel):
    """Schema for study plan response"""
    id: str
    user_id: str
    subject_id: str
    plan_type: str
    start_date: str
    end_date: str
    plan_data: dict
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "subject_id": "123e4567-e89b-12d3-a456-426614174002",
                "plan_type": "daily",
                "start_date": "2024-01-01",
                "end_date": "2024-01-30",
                "plan_data": {
                    "days": []
                },
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }

