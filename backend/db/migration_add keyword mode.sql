-- =========================================================
-- MIGRATION: Add support for keyword-based question generation
-- =========================================================

-- Update the mode field constraint to include 'keyword' as a valid value
ALTER TABLE public.generated_questions 
DROP CONSTRAINT IF EXISTS generated_questions_mode_check;

ALTER TABLE public.generated_questions 
ADD CONSTRAINT generated_questions_mode_check 
CHECK (mode IN ('topic', 'paper', 'keyword'));

-- Add a comment for documentation
COMMENT ON COLUMN public.generated_questions.mode 
IS 'Generation mode: topic, paper, or keyword';

-- Verify the constraint was updated
SELECT tc.constraint_name, tc.constraint_type, cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'generated_questions' 
AND tc.constraint_type = 'CHECK'
AND tc.table_schema = 'public';

-- Success message
SELECT 'Migration completed - keyword mode added to generated_questions table' as status;