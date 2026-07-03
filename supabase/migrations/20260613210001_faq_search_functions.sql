-- Session 11: Ask E2go FAQ — pgvector search RPC functions
-- Run after 20260613200000_faq_pgvector_tables.sql

-- Layer 1: Match against pre-answered Q&A corpus
CREATE OR REPLACE FUNCTION match_faq_corpus(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.80,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  sources text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.id,
    fc.question,
    fc.answer,
    fc.sources,
    1 - (fc.question_embedding <=> query_embedding) AS similarity
  FROM faq_qa_corpus fc
  WHERE 1 - (fc.question_embedding <=> query_embedding) > match_threshold
  ORDER BY fc.question_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Layer 2: Match against broader knowledge base chunks
CREATE OR REPLACE FUNCTION match_faq_kb(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  source_file text,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fk.id,
    fk.source_file,
    fk.chunk_text,
    1 - (fk.chunk_embedding <=> query_embedding) AS similarity
  FROM faq_kb_chunks fk
  WHERE 1 - (fk.chunk_embedding <=> query_embedding) > match_threshold
  ORDER BY fk.chunk_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
