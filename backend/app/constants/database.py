"""
Database column name constants

This file provides constants for all database column names to prevent typos
and ensure consistency across the codebase.

All column names are in snake_case to match PostgreSQL conventions.
"""

# topic_progress table columns
TOPIC_PROGRESS_COLUMNS = {
    "ID": "id",
    "USER_ID": "user_id",
    "TOPIC_ID": "topic_id",
    "COMPLETION_PERCENTAGE": "completion_percentage",
    "MASTERY_SCORE": "mastery_score",
    "TIME_SPENT_MINUTES": "time_spent_minutes",
    "LAST_STUDIED_AT": "last_studied_at",
    "IS_WEAK_AREA": "is_weak_area",
    "BASE_DIFFICULTY": "base_difficulty",
    "LAST_QUIZ_DIFFICULTY": "last_quiz_difficulty",
    "CURRENT_DIFFICULTY": "current_difficulty",
    "LAST_DIFFICULTY_UPDATE": "last_difficulty_update",
    "CREATED_AT": "created_at",
    "UPDATED_AT": "updated_at",
}

# quizzes table columns
QUIZZES_COLUMNS = {
    "ID": "id",
    "TOPIC_ID": "topic_id",
    "QUESTION": "question",
    "QUESTION_TYPE": "question_type",
    "OPTIONS": "options",
    "CORRECT_ANSWER": "correct_answer",
    "EXPLANATION": "explanation",
    "DIFFICULTY_LEVEL": "difficulty_level",
    "CREATED_AT": "created_at",
}

# quiz_results table columns
QUIZ_RESULTS_COLUMNS = {
    "ID": "id",
    "USER_ID": "user_id",
    "QUIZ_ID": "quiz_id",
    "TOPIC_ID": "topic_id",
    "USER_ANSWER": "user_answer",
    "IS_CORRECT": "is_correct",
    "TIME_TAKEN_SECONDS": "time_taken_seconds",
    "ATTEMPTED_AT": "attempted_at",
}

# topics table columns
TOPICS_COLUMNS = {
    "ID": "id",
    "SUBJECT_ID": "subject_id",
    "TITLE": "title",
    "DESCRIPTION": "description",
    "PARENT_TOPIC_ID": "parent_topic_id",
    "DIFFICULTY_LEVEL": "difficulty_level",
    "ESTIMATED_HOURS": "estimated_hours",
    "ORDER_INDEX": "order_index",
    "CREATED_AT": "created_at",
    "UPDATED_AT": "updated_at",
}

# Difficulty-related columns (convenience grouping)
DIFFICULTY_COLUMNS = {
    "BASE": "base_difficulty",
    "LAST": "last_quiz_difficulty",
    "CURRENT": "current_difficulty",
}

# Table names
TABLES = {
    "TOPIC_PROGRESS": "topic_progress",
    "QUIZZES": "quizzes",
    "QUIZ_RESULTS": "quiz_results",
    "TOPICS": "topics",
    "SUBJECTS": "subjects",
    "NOTES": "notes",
    "STUDY_PLANS": "study_plans",
    "USERS": "users",
}

