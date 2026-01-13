-- ============================================================================
-- AI STUDY COMPANION - COMPLETE DATABASE SETUP
-- ============================================================================
-- Run this ENTIRE file in Supabase SQL Editor to set up all tables
-- This combines all migrations into one file for easy setup
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Initial Schema
-- ============================================================================

-- Optional: Custom users table for additional profile data (if needed)
-- This table is NOT required - all foreign keys reference auth.users.id directly
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    exam_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    parent_topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_hours DECIMAL(5,2),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    file_type VARCHAR(50),
    file_url TEXT,
    embeddings_stored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study plans table
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    plan_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz results table
CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topic progress table
CREATE TABLE IF NOT EXISTS topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    mastery_score DECIMAL(5,2) DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
    time_spent_minutes INTEGER DEFAULT 0,
    last_studied_at TIMESTAMP WITH TIME ZONE,
    is_weak_area BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Initial indexes
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_subject_id ON study_plans(subject_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic_id ON quizzes(topic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_topic_id ON quiz_results(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_user_id ON topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic_id ON topic_progress(topic_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own subjects" ON subjects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON subjects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON subjects
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notes" ON notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own study plans" ON study_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans" ON study_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans" ON study_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans" ON study_plans
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own quiz results" ON quiz_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results" ON quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz results" ON quiz_results
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz results" ON quiz_results
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own topic progress" ON topic_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic progress" ON topic_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic progress" ON topic_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic progress" ON topic_progress
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view topics for own subjects" ON topics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = topics.subject_id 
            AND subjects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert topics for own subjects" ON topics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = topics.subject_id 
            AND subjects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update topics for own subjects" ON topics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = topics.subject_id 
            AND subjects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete topics for own subjects" ON topics
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = topics.subject_id 
            AND subjects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view quizzes for own topics" ON quizzes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM topics
            JOIN subjects ON subjects.id = topics.subject_id
            WHERE topics.id = quizzes.topic_id 
            AND subjects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert quizzes for own topics" ON quizzes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM topics
            JOIN subjects ON subjects.id = topics.subject_id
            WHERE topics.id = quizzes.topic_id 
            AND subjects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update quizzes for own topics" ON quizzes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM topics
            JOIN subjects ON subjects.id = topics.subject_id
            WHERE topics.id = quizzes.topic_id 
            AND subjects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete quizzes for own topics" ON quizzes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM topics
            JOIN subjects ON subjects.id = topics.subject_id
            WHERE topics.id = quizzes.topic_id 
            AND subjects.user_id = auth.uid()
        )
    );

-- ============================================================================
-- MIGRATION 2: Add Difficulty Tracking
-- ============================================================================

ALTER TABLE topic_progress 
ADD COLUMN IF NOT EXISTS current_difficulty INTEGER DEFAULT 2 
CHECK (current_difficulty BETWEEN 1 AND 5);

ALTER TABLE topic_progress 
ADD COLUMN IF NOT EXISTS last_quiz_difficulty INTEGER DEFAULT 2 
CHECK (last_quiz_difficulty BETWEEN 1 AND 5);

ALTER TABLE topic_progress 
ADD COLUMN IF NOT EXISTS last_difficulty_update TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_topic_progress_difficulty 
ON topic_progress(user_id, topic_id, current_difficulty);

-- ============================================================================
-- MIGRATION 3: Fix User References
-- ============================================================================

ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_user_id_fkey;
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE study_plans DROP CONSTRAINT IF EXISTS study_plans_user_id_fkey;
ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_user_id_fkey;
ALTER TABLE topic_progress DROP CONSTRAINT IF EXISTS topic_progress_user_id_fkey;

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

-- ============================================================================
-- MIGRATION 4: Add Baseline Difficulty
-- ============================================================================

ALTER TABLE topic_progress 
ADD COLUMN IF NOT EXISTS base_difficulty INTEGER DEFAULT 2 
CHECK (base_difficulty BETWEEN 1 AND 5);

-- ============================================================================
-- MIGRATION 5: Add Difficulty Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topic_progress_last_quiz_difficulty 
ON topic_progress(last_quiz_difficulty);

CREATE INDEX IF NOT EXISTS idx_topic_progress_current_difficulty 
ON topic_progress(current_difficulty);

CREATE INDEX IF NOT EXISTS idx_topic_progress_updated_at 
ON topic_progress(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_topic_progress_user_topic_updated 
ON topic_progress(user_id, topic_id, updated_at DESC);

-- ============================================================================
-- MIGRATION 6: Add Embedding Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS note_embedding_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('upsert', 'delete', 'reindex')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embedding_logs_note_id ON note_embedding_logs(note_id);
CREATE INDEX IF NOT EXISTS idx_embedding_logs_user_id ON note_embedding_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_logs_action_type ON note_embedding_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_embedding_logs_status ON note_embedding_logs(status);
CREATE INDEX IF NOT EXISTS idx_embedding_logs_created_at ON note_embedding_logs(created_at DESC);

ALTER TABLE note_embedding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own embedding logs"
    ON note_embedding_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embedding logs"
    ON note_embedding_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- You should now see all tables in Supabase Table Editor:
-- - users, subjects, topics, notes, study_plans, quizzes, quiz_results,
--   topic_progress, note_embedding_logs
-- ============================================================================

