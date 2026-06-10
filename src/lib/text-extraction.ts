import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { type UploadFileType, MAX_TOKENS_PER_DOCUMENT } from '@/types/document-upload';
import { isScannedPdf } from './document-validation';

export interface ExtractionOutput {
  text: string;
  isScanned: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Extract text content from a file buffer based on its type.
 * Truncates to MAX_TOKENS_PER_DOCUMENT (~8000 tokens ≈ 32000 chars).
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: UploadFileType,
  filename: string
): Promise<ExtractionOutput> {
  switch (fileType) {
    case 'pdf':
      return extractFromPdf(buffer);
    case 'docx':
      return extractFromDocx(buffer);
    case 'xlsx':
      return extractFromXlsx(buffer);
    case 'csv':
      return extractFromCsv(buffer, filename);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractionOutput> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text || '';
  const isScanned = isScannedPdf(text);

  return {
    text: truncateText(text),
    isScanned,
    metadata: {
      pages: result.total,
    },
  };
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionOutput> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value || '';

  if (result.messages.length > 0) {
    console.warn('DOCX extraction warnings:', result.messages);
  }

  return {
    text: truncateText(text),
    isScanned: false,
  };
}

function extractFromXlsx(buffer: Buffer): ExtractionOutput {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allText: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Try CSV output first (most readable for AI extraction)
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      allText.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    }
  }

  const text = allText.join('\n\n');

  return {
    text: truncateText(text),
    isScanned: false,
    metadata: {
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
    },
  };
}

function extractFromCsv(buffer: Buffer, filename: string): ExtractionOutput {
  const text = buffer.toString('utf-8');
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });

  // Format as readable table for AI extraction
  const headers = result.meta.fields || [];
  const rows = result.data as Record<string, string>[];

  const formatted = [
    `File: ${filename}`,
    `Columns: ${headers.join(', ')}`,
    `Rows: ${rows.length}`,
    '',
    ...rows.slice(0, 100).map((row) =>
      headers.map(h => `${h}: ${row[h] || ''}`).join(' | ')
    ),
  ].join('\n');

  return {
    text: truncateText(formatted),
    isScanned: false,
    metadata: {
      columns: headers.length,
      rows: rows.length,
    },
  };
}

/**
 * Truncate text to approximately MAX_TOKENS_PER_DOCUMENT tokens.
 * Uses a rough 4 chars per token estimate.
 */
function truncateText(text: string): string {
  const maxChars = MAX_TOKENS_PER_DOCUMENT * 4;
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n\n[Document truncated — content beyond this point was not processed]';
}
