-- Migration: Fix user references to use auth.users directly
-- This ensures all tables reference auth.users.id instead of custom users table
-- The custom users table is kept only for optional profile data

-- Step 1: Drop existing foreign key constraints that reference users(id)
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_user_id_fkey;
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE study_plans DROP CONSTRAINT IF EXISTS study_plans_user_id_fkey;
ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_user_id_fkey;
ALTER TABLE topic_progress DROP CONSTRAINT IF EXISTS topic_progress_user_id_fkey;

-- Step 2: Add foreign key constraints that reference auth.users(id) directly
ALTER TABLE subjects 
ADD CONSTRAINT subjects_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE notes 
ADD CONSTRAINT notes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE study_plans 
ADD CONSTRAINT study_plans_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE quiz_results 
ADD CONSTRAINT quiz_results_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE topic_progress 
ADD CONSTRAINT topic_progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Verify no clerk_id column exists (remove if present)
-- Note: This is a safety check - if clerk_id doesn't exist, this will be a no-op
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'clerk_id'
    ) THEN
        ALTER TABLE users DROP COLUMN clerk_id;
    END IF;
END $$;

-- Step 4: Add comment explaining the schema
COMMENT ON TABLE users IS 'Optional profile table for additional user data. All foreign keys reference auth.users.id directly.';

