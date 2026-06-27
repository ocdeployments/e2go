import {
  type FileValidation,
  type UploadFileType,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_SESSION,
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
} from '@/types/document-upload';

const EXTENSION_MAP: Record<string, UploadFileType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.csv': 'csv',
};

// Known file signatures (magic bytes) for each accepted type
const MAGIC_BYTES: Record<string, number[]> = {
  pdf:  [0x25, 0x50, 0x44, 0x46], // %PDF
  docx: [0x50, 0x4B, 0x03, 0x04], // PK (ZIP — OOXML container)
};

// Verify actual file content matches the declared type.
// Client-supplied MIME type and extension can both be forged.
export function validateMagicBytes(buffer: Buffer, fileType: UploadFileType): boolean {
  if (buffer.length < 4) return false;

  switch (fileType) {
    case 'pdf': {
      return MAGIC_BYTES.pdf.every((byte, i) => buffer[i] === byte);
    }
    case 'docx': {
      return MAGIC_BYTES.docx.every((byte, i) => buffer[i] === byte);
    }
    case 'csv': {
      // No universal CSV magic bytes — check for absence of binary content.
      // Allow UTF-8 BOM (EF BB BF) at start.
      const offset = (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) ? 3 : 0;
      if (buffer[offset] === 0x00) return false; // null byte = binary
      const sample = buffer.slice(offset, Math.min(buffer.length, 512));
      for (let i = 0; i < sample.length; i++) {
        const b = sample[i];
        // Reject binary control chars except tab (0x09), LF (0x0A), CR (0x0D)
        if (b < 0x09 || (b > 0x0D && b < 0x20)) return false;
      }
      return true;
    }
    default:
      return false;
  }
}

// Strip path traversal characters and limit length before using filename
// in Supabase Storage paths or DB records.
export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9._\- ]/g, '_') // keep only safe chars
      .replace(/\.{2,}/g, '_')             // collapse .. sequences
      .replace(/^[./\\]+/, '')             // strip leading dots / slashes
      .substring(0, 100)
      .trim() || 'upload'
  );
}

export function validateFile(file: File): FileValidation {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();

  if (!ACCEPTED_EXTENSIONS.includes(ext as typeof ACCEPTED_EXTENSIONS[number])) {
    return {
      valid: false,
      error: `Unsupported file type "${ext}". Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`,
    };
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type as typeof ACCEPTED_MIME_TYPES[number])) {
    // Some browsers send empty MIME types — fall back to extension check
    if (file.type && !ACCEPTED_MIME_TYPES.includes(file.type as typeof ACCEPTED_MIME_TYPES[number])) {
      return {
        valid: false,
        error: `File type "${file.type}" is not accepted. Please use the correct file format.`,
      };
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is ${sizeMB}MB. Maximum size is 10MB.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    };
  }

  return {
    valid: true,
    fileType: EXTENSION_MAP[ext] || 'unknown',
  };
}

export function validateFileBatch(files: File[]): {
  valid: File[];
  errors: Array<{ filename: string; error: string }>;
} {
  const valid: File[] = [];
  const errors: Array<{ filename: string; error: string }> = [];

  if (files.length > MAX_FILES_PER_SESSION) {
    errors.push({
      filename: 'batch',
      error: `Too many files. Maximum is ${MAX_FILES_PER_SESSION} per session.`,
    });
    return { valid, errors };
  }

  for (const file of files) {
    const result = validateFile(file);
    if (result.valid) {
      valid.push(file);
    } else {
      errors.push({ filename: file.name, error: result.error! });
    }
  }

  return { valid, errors };
}

export function getFileTypeFromExtension(filename: string): UploadFileType | null {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return EXTENSION_MAP[ext] || null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a PDF is likely scanned (image-based) by looking for
 * extractable text content. Returns true if the PDF appears to be
 * a scanned document with no extractable text.
 */
export function isScannedPdf(text: string): boolean {
  const trimmed = text.trim();
  // If extracted text is very short relative to typical document length,
  // it's likely a scanned/image-based PDF
  if (trimmed.length < 50) return true;
  // If text is mostly whitespace or special characters with little
  // actual word content, it's likely scanned
  const wordCount = trimmed.split(/\s+/).filter(w => w.length > 2).length;
  return wordCount < 10;
}
