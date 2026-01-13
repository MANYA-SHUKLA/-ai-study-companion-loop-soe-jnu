"""
Pydantic schemas for request/response validation
"""

from .study_plans import (
    StudyPlanCreate,
    StudyPlanUpdate,
    StudyPlanResponse,
    ActivitySchema,
    PlanDaySchema,
)
# Quiz schemas removed
from .notes import (
    NoteUploadMetadata,
    NoteResponse,
    FileMetadata,
)

__all__ = [
    # Study Plans
    "StudyPlanCreate",
    "StudyPlanUpdate",
    "StudyPlanResponse",
    "ActivitySchema",
    "PlanDaySchema",
    # Notes
    "NoteUploadMetadata",
    "NoteResponse",
    "FileMetadata",
]

