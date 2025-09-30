-- =========================================================
-- MIGRATION: Add feedback_type column to question_feedback table
-- Run this to fix the missing 'feedback_type' column error
-- =========================================================

-- Add the missing feedback_type column to question_feedback table
ALTER TABLE public.question_feedback 
ADD COLUMN IF NOT EXISTS feedback_type text;

-- Add a comment for documentation
COMMENT ON COLUMN public.question_feedback.feedback_type 
IS 'Type of feedback (bug, feature, general)';

-- Create index on the new column for better query performance
CREATE INDEX IF NOT EXISTS idx_question_feedback_type ON public.question_feedback (feedback_type);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'question_feedback' 
AND table_schema = 'public'
AND column_name = 'feedback_type'
ORDER BY ordinal_position;

-- Success message
SELECT 'Migration completed - feedback_type column added to question_feedback table' as status;