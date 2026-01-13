-- Migration: Add baseline difficulty storage to topic_progress
-- This stores the base difficulty from the topic for reference

-- Add base_difficulty column to topic_progress (stores topic's base difficulty)
ALTER TABLE topic_progress 
ADD COLUMN IF NOT EXISTS base_difficulty INTEGER DEFAULT 2 
CHECK (base_difficulty BETWEEN 1 AND 5);

-- Add comment
COMMENT ON COLUMN topic_progress.base_difficulty IS 'Base difficulty (1-5) from the topic, stored for reference';

-- Update existing records to have base_difficulty from topics table
-- This is a one-time update for existing data
UPDATE topic_progress tp
SET base_difficulty = COALESCE(
    (SELECT difficulty_level FROM topics WHERE id = tp.topic_id),
    2
)
WHERE base_difficulty IS NULL OR base_difficulty = 2;

