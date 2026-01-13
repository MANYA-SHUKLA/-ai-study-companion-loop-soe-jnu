-- AI Study Companion Database Schema
-- Run this migration in your Supabase SQL editor

-- IMPORTANT: This app uses Supabase Auth's built-in auth.users table
-- ALL foreign keys reference auth.users.id directly (NOT a custom users table)
-- The custom users table below is OPTIONAL and only for profile data

-- Optional: Custom users table for additional profile data (if needed)
-- This table is NOT required - all foreign keys reference auth.users.id directly
-- This table can be synced with auth.users via triggers for convenience
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
-- References auth.users.id directly (not custom users table)
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
-- References auth.users.id directly (not custom users table)
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    file_type VARCHAR(50), -- 'pdf', 'txt', 'md', 'docx'
    file_url TEXT,
    embeddings_stored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study plans table
-- References auth.users.id directly (not custom users table)
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    plan_data JSONB NOT NULL, -- Stores the actual plan structure
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'mcq', 'short_answer', 'true_false'
    options JSONB, -- For MCQ: ["option1", "option2", ...]
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz results table
-- References auth.users.id directly (not custom users table)
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

-- Topic progress table (tracks user progress per topic)
-- References auth.users.id directly (not custom users table)
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

-- Indexes for performance
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

-- Enable Row Level Security (RLS) - Users can only access their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
-- Uses Supabase Auth's auth.uid() function to get current user ID

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Subjects table policies
CREATE POLICY "Users can view own subjects" ON subjects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON subjects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON subjects
    FOR DELETE USING (auth.uid() = user_id);

-- Notes table policies
CREATE POLICY "Users can view own notes" ON notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE USING (auth.uid() = user_id);

-- Study plans table policies
CREATE POLICY "Users can view own study plans" ON study_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans" ON study_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans" ON study_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans" ON study_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Quiz results table policies
CREATE POLICY "Users can view own quiz results" ON quiz_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results" ON quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz results" ON quiz_results
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz results" ON quiz_results
    FOR DELETE USING (auth.uid() = user_id);

-- Topic progress table policies
CREATE POLICY "Users can view own topic progress" ON topic_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic progress" ON topic_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic progress" ON topic_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic progress" ON topic_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Topics table policies (users can view topics for their subjects)
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

-- Quizzes table policies (users can view quizzes for their topics)
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

