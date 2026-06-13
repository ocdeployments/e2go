/**
 * Seed script for Ask E2go FAQ — Layer 2 KB Chunks
 *
 * Chunks broader knowledge base docs (E2_Engine_KB, E2Pathway, etc.),
 * embeds each chunk, and inserts into faq_kb_chunks (pgvector).
 *
 * Usage: npx tsx scripts/seed-faq-kb-chunks.ts
 *
 * Requires: OPENAI_API_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EMBEDDING_MODEL = "text-embedding-3-small";
const DOCS_DIR = join(process.cwd(), "docs");
const BATCH_SIZE = 20;

// Chunking config
const TARGET_CHUNK_TOKENS = 600; // ~800 chars per chunk
const CHUNK_OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 1.3; // rough estimate for English

const TARGET_CHARS = Math.round(TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN);
const OVERLAP_CHARS = Math.round(CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN);

// KB docs to chunk (broader knowledge base — NOT the E2_Answers Q&A files)
const KB_PATTERNS = [
  "E2_Engine_Knowledge_Base",
  "E2Pathway_",
  "E2_Global_Consulate_Intelligence",
  "E2_essential_questions",
  "E2_partnerships_non_typical",
  "E2_crypto_source_Toronto",
  "E2_Business_Eligibility",
  "E2_Franchise_Categories",
  "E2_Platform_Logic",
  "E2_Document_Builder",
  "E2_Attorney_Review",
];

// ---------------------------------------------------------------------------
// Chunker — split text into overlapping chunks by paragraph/heading
// ---------------------------------------------------------------------------
interface Chunk {
  source_file: string;
  chunk_text: string;
  chunk_index: number;
}

function chunkDocument(filePath: string, sourceFile: string): Chunk[] {
  const content = readFileSync(filePath, "utf-8");
  const chunks: Chunk[] = [];

  // Split by headings (## or ---) to get semantic sections
  const sections = content.split(/(?=^## )/m);

  let currentChunk = "";
  let chunkIndex = 0;

  for (const section of sections) {
    // If adding this section would exceed target, finalize current chunk
    if (
      currentChunk.length + section.length > TARGET_CHARS &&
      currentChunk.length > 0
    ) {
      chunks.push({
        source_file: sourceFile,
        chunk_text: currentChunk.trim(),
        chunk_index: chunkIndex++,
      });
      // Overlap: keep last portion of current chunk
      const overlapStart = Math.max(0, currentChunk.length - OVERLAP_CHARS);
      currentChunk = currentChunk.substring(overlapStart) + "\n\n" + section;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + section;
    }
  }

  // Final chunk
  if (currentChunk.trim().length > 100) {
    chunks.push({
      source_file: sourceFile,
      chunk_text: currentChunk.trim(),
      chunk_index: chunkIndex++,
    });
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Embedding — OpenAI text-embedding-3-small
// ---------------------------------------------------------------------------
async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embedding failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((item: { embedding: number[] }) => item.embedding);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!OPENAI_API_KEY) {
    console.error(
      "ERROR: OPENAI_API_KEY not set. Add it to .env.local:\n" +
        "  OPENAI_API_KEY=sk-..."
    );
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("ERROR: Supabase env vars not set.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // -----------------------------------------------------------------------
  // Step 1: Find and chunk KB docs
  // -----------------------------------------------------------------------
  console.log("📄 Chunking knowledge base documents...");

  const allFiles = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  const kbFiles = allFiles.filter((f) =>
    KB_PATTERNS.some((p) => f.startsWith(p))
  );

  if (kbFiles.length === 0) {
    console.error("ERROR: No KB docs found matching patterns");
    process.exit(1);
  }

  let allChunks: Chunk[] = [];
  for (const file of kbFiles) {
    const chunks = chunkDocument(join(DOCS_DIR, file), file);
    console.log(`  ${file}: ${chunks.length} chunks`);
    allChunks.push(...chunks);
  }

  console.log(`\n📊 Total chunks: ${allChunks.length}`);

  // -----------------------------------------------------------------------
  // Step 2: Embed chunks in batches
  // -----------------------------------------------------------------------
  console.log(`\n🧠 Embedding chunks (${EMBEDDING_MODEL})...`);

  const embeddings: number[][] = [];
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map((c) => c.chunk_text);
    const batchEmbeddings = await embedTexts(batchTexts);
    embeddings.push(...batchEmbeddings);

    const pct = Math.round(((i + batch.length) / allChunks.length) * 100);
    console.log(
      `  Embedded ${i + batch.length}/${allChunks.length} (${pct}%)`
    );

    if (i + BATCH_SIZE < allChunks.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`✅ Embedded ${embeddings.length} chunks`);

  // -----------------------------------------------------------------------
  // Step 3: Clear existing and insert
  // -----------------------------------------------------------------------
  console.log("\n💾 Inserting into faq_kb_chunks...");

  await supabase.from("faq_kb_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const INSERT_BATCH = 50;
  let insertedCount = 0;

  for (let i = 0; i < allChunks.length; i += INSERT_BATCH) {
    const batch = allChunks.slice(i, i + INSERT_BATCH);
    const batchEmbeddings = embeddings.slice(i, i + INSERT_BATCH);

    const rows = batch.map((chunk, idx) => ({
      source_file: chunk.source_file,
      chunk_text: chunk.chunk_text,
      chunk_embedding: JSON.stringify(batchEmbeddings[idx]),
    }));

    const { error } = await supabase.from("faq_kb_chunks").insert(rows);

    if (error) {
      console.error(`  ❌ Batch insert error at row ${i}:`, error.message);
    } else {
      insertedCount += rows.length;
    }
  }

  console.log(`✅ Inserted ${insertedCount} rows into faq_kb_chunks`);

  // -----------------------------------------------------------------------
  // Step 4: Verify
  // -----------------------------------------------------------------------
  const { count, error: countError } = await supabase
    .from("faq_kb_chunks")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("⚠️  Could not verify count:", countError.message);
  } else {
    console.log(`\n✅ Verified: ${count} rows in faq_kb_chunks`);
  }

  console.log("\n🎉 KB chunks seed complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
