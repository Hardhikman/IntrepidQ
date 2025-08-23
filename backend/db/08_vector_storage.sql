-- =========================================================
-- VECTOR STORAGE SCHEMA (SIMPLE VERSION)
-- Document embeddings and vector search - exact user specification
-- =========================================================

-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- (Optional but recommended) Enable the UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop the old table and function if they exist to start clean
DROP TABLE IF EXISTS public.documents;
DROP FUNCTION IF EXISTS match_documents;

-- Create the table with a UUID primary key
CREATE TABLE public.documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), -- Changed from bigserial to uuid
    content text,
    metadata jsonb,
    embedding vector(384) -- 384 is the dimension of the all-MiniLM-L6-v2 model
);

-- Create a function to search for documents
CREATE OR REPLACE FUNCTION match_documents (
    query_embedding vector(384),
    match_count int,
    filter jsonb DEFAULT '{}'
) 
RETURNS TABLE (
    id uuid, -- Changed from bigint to uuid
    content text,
    metadata jsonb,
    similarity float
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding <=> query_embedding) as similarity
    FROM documents
    WHERE metadata @> filter
    ORDER BY
        documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- UTILITY FUNCTIONS
-- ---------------------------------------------------------

-- Function to count documents
CREATE OR REPLACE FUNCTION public.count_documents()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT COUNT(*)::integer FROM public.documents);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION public.get_document_stats()
RETURNS TABLE (
    total_documents bigint,
    avg_content_length numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_documents,
        AVG(LENGTH(content)) as avg_content_length
    FROM public.documents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY (Service access only)
-- ---------------------------------------------------------

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Service-only policy (Vector storage managed by backend service)
DROP POLICY IF EXISTS "Service key can manage documents" ON public.documents;
CREATE POLICY "Service key can manage documents"
ON public.documents FOR ALL
TO service_role;