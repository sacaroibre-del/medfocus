-- Supabase SQL Migration
-- Add study_purpose column to study_logs table

ALTER TABLE study_logs 
ADD COLUMN IF NOT EXISTS study_purpose TEXT DEFAULT 'other';

-- To allow comments:
COMMENT ON COLUMN study_logs.study_purpose IS 'Purpose of the study session: cbt, regular_exam, assignment, other';
