-- Migration: Add indexes on difficulty-related columns for performance
-- Improves query performance for difficulty tracking and analytics

-- Index on last_quiz_difficulty for filtering/sorting by last quiz difficulty
CREATE INDEX IF NOT EXISTS idx_topic_progress_last_quiz_difficulty 
ON topic_progress(last_quiz_difficulty);

-- Index on current_difficulty for filtering/sorting by next difficulty
CREATE INDEX IF NOT EXISTS idx_topic_progress_current_difficulty 
ON topic_progress(current_difficulty);

-- Composite index on updated_at for difficulty history queries
-- Useful for sorting difficulty progression over time
CREATE INDEX IF NOT EXISTS idx_topic_progress_updated_at 
ON topic_progress(updated_at DESC);

-- Composite index for difficulty history queries (user + topic + updated_at)
-- Optimizes queries that fetch difficulty progression for a specific topic
CREATE INDEX IF NOT EXISTS idx_topic_progress_user_topic_updated 
ON topic_progress(user_id, topic_id, updated_at DESC);

-- Add comments
COMMENT ON INDEX idx_topic_progress_last_quiz_difficulty IS 'Index for filtering by last quiz difficulty level';
COMMENT ON INDEX idx_topic_progress_current_difficulty IS 'Index for filtering by current/next difficulty level';
COMMENT ON INDEX idx_topic_progress_updated_at IS 'Index for sorting difficulty history by update timestamp';
COMMENT ON INDEX idx_topic_progress_user_topic_updated IS 'Composite index for difficulty progression queries per user-topic';

