-- Add embedding audit logs table for monitoring and troubleshooting
-- This tracks all embedding operations (upsert, delete, reindex)

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_embedding_logs_note_id ON note_embedding_logs(note_id);
CREATE INDEX IF NOT EXISTS idx_embedding_logs_user_id ON note_embedding_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_logs_action_type ON note_embedding_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_embedding_logs_status ON note_embedding_logs(status);
CREATE INDEX IF NOT EXISTS idx_embedding_logs_created_at ON note_embedding_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE note_embedding_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own embedding logs
CREATE POLICY "Users can view their own embedding logs"
    ON note_embedding_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: System can insert logs (via service role)
-- Note: In production, you may want to restrict this to service role only
CREATE POLICY "Users can insert their own embedding logs"
    ON note_embedding_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE note_embedding_logs IS 'Audit log for all embedding operations (upsert, delete, reindex)';
COMMENT ON COLUMN note_embedding_logs.action_type IS 'Type of operation: upsert, delete, or reindex';
COMMENT ON COLUMN note_embedding_logs.status IS 'Operation status: success, failed, or pending';
COMMENT ON COLUMN note_embedding_logs.error_message IS 'Error message if status is failed';
COMMENT ON COLUMN note_embedding_logs.metadata IS 'Additional metadata about the operation (JSON)';

