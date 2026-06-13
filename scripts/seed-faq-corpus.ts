/**
 * Seed script for Ask E2go FAQ — Session 11
 *
 * Parses E2_Answers_Part1-6 files, embeds each question,
 * and inserts into faq_qa_corpus (pgvector).
 *
 * Usage: npx tsx scripts/seed-faq-corpus.ts
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
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions
const DOCS_DIR = join(process.cwd(), "docs");
const BATCH_SIZE = 20; // OpenAI allows up to 2048 per request

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface QAPair {
  source_file: string;
  question_number: number;
  question: string;
  answer: string;
  sources: string;
}

// ---------------------------------------------------------------------------
// Parser — extract Q&A pairs from E2_Answers markdown files
// ---------------------------------------------------------------------------
function parseQAPairs(filePath: string, sourceFile: string): QAPair[] {
  const content = readFileSync(filePath, "utf-8");
  const pairs: QAPair[] = [];

  // Split on **QN. pattern — each match starts a new Q&A block
  const blocks = content.split(/\n\*\*Q(\d+)\.\s/);

  // blocks[0] is the preamble (before first Q)
  for (let i = 1; i < blocks.length; i += 2) {
    const qNum = parseInt(blocks[i], 10);
    const rest = blocks[i + 1] || "";

    // Extract question text (everything before the first \n\n)
    const firstNewline = rest.indexOf("\n");
    const questionEnd = firstNewline > 0 ? firstNewline : rest.length;
    let question = rest.substring(0, questionEnd).trim();
    // Remove trailing ** if present
    question = question.replace(/\*\*$/, "").trim();

    // Extract answer text — from after question line to Sources block or ---
    let answerEnd = rest.indexOf("\n**Sources:**");
    if (answerEnd === -1) answerEnd = rest.indexOf("\n**Source:**");
    if (answerEnd === -1) answerEnd = rest.indexOf("\n---");
    if (answerEnd === -1) answerEnd = rest.length;

    const answerStart = firstNewline > 0 ? firstNewline + 1 : 0;
    let answer = rest.substring(answerStart, answerEnd).trim();

    // Clean answer: remove markdown bold markers that are just formatting
    answer = answer.replace(/\n>/g, "\n"); // Remove blockquote markers

    // Extract sources block
    let sources = "";
    const sourcesIdx = rest.indexOf("\n**Sources:**");
    const sourceIdx = rest.indexOf("\n**Source:**");
    const srcIdx = sourcesIdx !== -1 ? sourcesIdx : sourceIdx;
    if (srcIdx !== -1) {
      const srcEnd = rest.indexOf("\n---", srcIdx);
      sources = rest
        .substring(srcIdx, srcEnd !== -1 ? srcEnd : rest.length)
        .trim();
    }

    if (question && answer) {
      pairs.push({
        source_file: sourceFile,
        question_number: qNum,
        question,
        answer,
        sources,
      });
    }
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Embedding — OpenAI text-embedding-3-small
// ---------------------------------------------------------------------------
async function embedTexts(
  texts: string[]
): Promise<number[][]> {
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
  // Sort by index to ensure ordering matches input
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((item: { embedding: number[] }) => item.embedding);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Validate env
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
  // Step 1: Parse all E2_Answers files
  // -----------------------------------------------------------------------
  console.log("📄 Parsing E2_Answers files...");

  const answerFiles = readdirSync(DOCS_DIR)
    .filter((f) => f.startsWith("E2_Answers_Part") && f.endsWith(".md"))
    .sort();

  if (answerFiles.length === 0) {
    console.error("ERROR: No E2_Answers_Part*.md files found in docs/");
    process.exit(1);
  }

  let allPairs: QAPair[] = [];
  for (const file of answerFiles) {
    const pairs = parseQAPairs(join(DOCS_DIR, file), file);
    console.log(`  ${file}: ${pairs.length} Q&A pairs`);
    allPairs.push(...pairs);
  }

  console.log(`\n📊 Total Q&A pairs parsed: ${allPairs.length}`);

  // -----------------------------------------------------------------------
  // Step 2: Embed questions in batches
  // -----------------------------------------------------------------------
  console.log(`\n🧠 Embedding questions (${EMBEDDING_MODEL})...`);

  const embeddings: number[][] = [];
  for (let i = 0; i < allPairs.length; i += BATCH_SIZE) {
    const batch = allPairs.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map((p) => p.question);
    const batchEmbeddings = await embedTexts(batchTexts);
    embeddings.push(...batchEmbeddings);

    const pct = Math.round(((i + batch.length) / allPairs.length) * 100);
    console.log(
      `  Embedded ${i + batch.length}/${allPairs.length} (${pct}%)`
    );

    // Small delay to avoid rate limits
    if (i + BATCH_SIZE < allPairs.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`✅ Embedded ${embeddings.length} questions`);

  // -----------------------------------------------------------------------
  // Step 3: Clear existing data and insert
  // -----------------------------------------------------------------------
  console.log("\n💾 Inserting into faq_qa_corpus...");

  // Clear existing rows (idempotent re-run)
  await supabase.from("faq_qa_corpus").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Insert in batches of 50
  const INSERT_BATCH = 50;
  let insertedCount = 0;

  for (let i = 0; i < allPairs.length; i += INSERT_BATCH) {
    const batch = allPairs.slice(i, i + INSERT_BATCH);
    const batchEmbeddings = embeddings.slice(i, i + INSERT_BATCH);

    const rows = batch.map((pair, idx) => ({
      source_file: pair.source_file,
      question_number: pair.question_number,
      question: pair.question,
      answer: pair.answer,
      sources: pair.sources,
      question_embedding: JSON.stringify(batchEmbeddings[idx]),
    }));

    const { error } = await supabase.from("faq_qa_corpus").insert(rows);

    if (error) {
      console.error(`  ❌ Batch insert error at row ${i}:`, error.message);
    } else {
      insertedCount += rows.length;
    }
  }

  console.log(`✅ Inserted ${insertedCount} rows into faq_qa_corpus`);

  // -----------------------------------------------------------------------
  // Step 4: Verify count
  // -----------------------------------------------------------------------
  const { count, error: countError } = await supabase
    .from("faq_qa_corpus")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("⚠️  Could not verify count:", countError.message);
  } else {
    console.log(`\n✅ Verified: ${count} rows in faq_qa_corpus`);
  }

  console.log("\n🎉 Seed complete!");
  console.log("Next: Run 'npx tsx scripts/seed-faq-kb-chunks.ts' for Layer 2 KB chunks.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
