-- =========================================================
-- MIGRATION: Add model column to generated_questions table
-- Run this to fix the missing 'model' column error
-- =========================================================

-- Add the missing model column to generated_questions table
ALTER TABLE public.generated_questions 
ADD COLUMN IF NOT EXISTS model text;

-- Add a comment for documentation
COMMENT ON COLUMN public.generated_questions.model 
IS 'Model used for generation (e.g., llama3-70b, gemini-1.5-flash)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'generated_questions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
SELECT 'Migration completed - model column added to generated_questions table' as status;