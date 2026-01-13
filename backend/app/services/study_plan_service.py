"""
Service for managing study plan updates based on weak areas
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

class StudyPlanService:
    @staticmethod
    def insert_revision_days_for_weak_areas(
        plan_data: Dict[str, Any],
        weak_areas: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Insert revision days for weak areas into existing study plan
        Returns updated plan_data with revision days added
        """
        if not weak_areas or not plan_data.get("days"):
            return plan_data
        
        days = plan_data["days"].copy()
        weak_topic_titles = [area.get("topic_title") for area in weak_areas if area.get("topic_title")]
        
        if not weak_topic_titles:
            return plan_data
        
        # Find the last day in the plan
        last_date = None
        if days:
            last_day = max(days, key=lambda d: d.get("date", ""))
            last_date = datetime.fromisoformat(last_day["date"].replace("Z", "+00:00"))
        
        # Insert revision days (one per weak area, or combine multiple)
        # Add revision days before the exam date
        revision_days = []
        current_date = last_date + timedelta(days=1) if last_date else datetime.now()
        
        # Group weak areas and create revision days
        # For simplicity, create one revision day for all weak areas
        revision_day = {
            "date": current_date.strftime("%Y-%m-%d"),
            "activities": [
                {
                    "topic": topic_title,
                    "activity": "revise",
                    "hours": 1.0  # 1 hour per weak topic
                }
                for topic_title in weak_topic_titles
            ],
            "total_hours": min(len(weak_topic_titles) * 1.0, 4.0)  # Cap at 4 hours
        }
        
        revision_days.append(revision_day)
        
        # Insert revision days before exam date
        days.extend(revision_days)
        
        # Update end_date if needed
        if revision_days:
            new_end_date = max(
                datetime.fromisoformat(d["date"].replace("Z", "+00:00")) for d in days
            )
            plan_data["end_date"] = new_end_date.strftime("%Y-%m-%d")
        
        plan_data["days"] = days
        return plan_data
    
    @staticmethod
    def adjust_difficulty_for_weak_areas(
        topics: List[Dict[str, Any]],
        weak_areas: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Adjust topic difficulty for weak areas (lower difficulty for easier questions)
        """
        weak_topic_titles = {area.get("topic_title") for area in weak_areas if area.get("topic_title")}
        
        adjusted_topics = []
        for topic in topics:
            topic_title = topic.get("title", "")
            if topic_title in weak_topic_titles:
                # Lower difficulty by 1 level (minimum 1)
                adjusted_topic = topic.copy()
                adjusted_topic["difficulty_level"] = max(1, topic.get("difficulty_level", 2) - 1)
                adjusted_topics.append(adjusted_topic)
            else:
                adjusted_topics.append(topic)
        
        return adjusted_topics

