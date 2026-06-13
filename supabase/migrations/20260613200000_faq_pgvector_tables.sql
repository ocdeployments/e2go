-- Session 11: Ask E2go FAQ — pgvector embeddings tables
-- Run: supabase db push or apply via SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Layer 1: Pre-answered Q&A corpus (355+ pairs from E2_Answers_Part1-6)
CREATE TABLE IF NOT EXISTS faq_qa_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  question_number INT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources TEXT,
  question_embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Layer 2: Broader knowledge base chunks
CREATE TABLE IF NOT EXISTS faq_kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Query log for cache-hit analysis and future seed expansion
CREATE TABLE IF NOT EXISTS faq_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  matched_layer TEXT,
  matched_question_id UUID REFERENCES faq_qa_corpus(id),
  similarity_score FLOAT,
  response_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW indexes for fast cosine similarity search
CREATE INDEX IF NOT EXISTS faq_qa_corpus_embedding_idx
  ON faq_qa_corpus USING hnsw (question_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS faq_kb_chunks_embedding_idx
  ON faq_kb_chunks USING hnsw (chunk_embedding vector_cosine_ops);

-- RLS: server-side service-role only — deny-all default is correct
ALTER TABLE faq_qa_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_query_log ENABLE ROW LEVEL SECURITY;
