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
  '.xlsx': 'xlsx',
  '.csv': 'csv',
};

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
