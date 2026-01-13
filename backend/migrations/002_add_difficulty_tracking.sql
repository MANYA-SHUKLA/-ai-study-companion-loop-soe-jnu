-- Migration: Add difficulty tracking to topic_progress
-- This allows storing the current adaptive difficulty level and last used difficulty for each user-topic pair

-- Add current_difficulty column to topic_progress (next quiz difficulty)
ALTER TABLE topic_progress 
ADD COLUMN IF NOT EXISTS current_difficulty INTEGER DEFAULT 2 
CHECK (current_difficulty BETWEEN 1 AND 5);

-- Add last_quiz_difficulty column (difficulty of the last quiz taken)
ALTER TABLE topic_progress 
ADD COLUMN IF NOT EXISTS last_quiz_difficulty INTEGER DEFAULT 2 
CHECK (last_quiz_difficulty BETWEEN 1 AND 5);

-- Add last_difficulty_update timestamp
ALTER TABLE topic_progress 
ADD COLUMN IF NOT EXISTS last_difficulty_update TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_topic_progress_difficulty 
ON topic_progress(user_id, topic_id, current_difficulty);

-- Add comments
COMMENT ON COLUMN topic_progress.current_difficulty IS 'Next adaptive difficulty level (1-5) for this user-topic pair';
COMMENT ON COLUMN topic_progress.last_quiz_difficulty IS 'Difficulty level (1-5) of the last quiz taken by the user';
COMMENT ON COLUMN topic_progress.last_difficulty_update IS 'Timestamp when difficulty was last updated';

