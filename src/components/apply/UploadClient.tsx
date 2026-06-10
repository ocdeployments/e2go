'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DOCUMENT_TYPE_OPTIONS,
  MAX_FILES_PER_SESSION,
  ACCEPTED_EXTENSIONS,
  type UploadFileType,
} from '@/types/document-upload';
import { formatFileSize, validateFile } from '@/lib/document-validation';

interface PendingFile {
  file: File;
  id: string;
  selectedType: string;
  error?: string;
  fileType?: UploadFileType;
}

export default function UploadClient({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileList = Array.from(newFiles);

    setFiles(prev => {
      const updated = [...prev];

      for (const file of fileList) {
        if (updated.length >= MAX_FILES_PER_SESSION) {
          setUploadError(`Maximum ${MAX_FILES_PER_SESSION} files per session.`);
          break;
        }

        // Check for duplicate filenames
        if (updated.some(f => f.file.name === file.name)) {
          continue;
        }

        const validation = validateFile(file);

        updated.push({
          file,
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          selectedType: 'unknown',
          error: validation.valid ? undefined : validation.error,
          fileType: validation.fileType,
        });
      }

      return updated;
    });

    setUploadError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, [addFiles]);

  const updateFileType = useCallback((id: string, type: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, selectedType: type } : f));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleUpload = async () => {
    const validFiles = files.filter(f => !f.error && f.fileType);
    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('applicationId', applicationId);

      validFiles.forEach((f, idx) => {
        formData.append(`file_${idx}`, f.file);
        formData.append(`type_${idx}`, f.selectedType);
      });

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Navigate to processing screen with document IDs
      const docIds = data.documents.map((d: { id: string }) => d.id).join(',');
      router.push(`/apply/upload/processing?docs=${docIds}&app=${applicationId}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  const validFileCount = files.filter(f => !f.error && f.fileType).length;
  const hasErrors = files.some(f => f.error);
  const canProcess = validFileCount > 0 && !uploading;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        {/* Back link */}
        <a
          href="/apply"
          className="mb-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] transition-colors hover:text-[#C9A84C]"
          style={{
            color: 'rgba(245,240,232,0.35)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          &larr; Back to case file
        </a>

        {/* Header */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <span style={{ color: '#C9A84C' }}>&#9670;</span>
            <h1
              className="text-xs uppercase tracking-[0.1em]"
              style={{
                color: '#C9A84C',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              Document intake
            </h1>
          </div>
          <h2
            className="mb-3 text-2xl font-light sm:text-3xl"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: '#f5f0e8',
              fontWeight: 300,
            }}
          >
            Upload your existing documents
          </h2>
          <p
            className="text-[11px] leading-relaxed"
            style={{
              color: 'rgba(245,240,232,0.4)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            We will read them carefully, fill in what we can, flag any
            conflicts, and show you exactly what is still missing.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowse}
          className="mb-6 flex cursor-pointer flex-col items-center justify-center border border-dashed p-10 transition-colors sm:p-14"
          style={{
            borderColor: isDragging
              ? 'rgba(201,168,76,0.4)'
              : 'rgba(201,168,76,0.12)',
            backgroundColor: isDragging
              ? 'rgba(201,168,76,0.03)'
              : 'transparent',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="mb-4"
            style={{ color: 'rgba(201,168,76,0.4)' }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p
            className="mb-1 text-[11px]"
            style={{
              color: 'rgba(245,240,232,0.5)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Drag and drop files here, or click to browse
          </p>
          <p
            className="text-[10px]"
            style={{
              color: 'rgba(245,240,232,0.25)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            .pdf, .docx, .xlsx, .csv &mdash; max 10MB each, up to {MAX_FILES_PER_SESSION} files
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Upload error */}
        {uploadError && (
          <div
            className="mb-6 border p-4 text-[11px]"
            style={{
              borderColor: 'rgba(200,80,80,0.3)',
              color: 'rgba(200,120,120,0.9)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {uploadError}
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <span
                className="text-[10px] uppercase tracking-[0.08em]"
                style={{
                  color: 'rgba(245,240,232,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
              {hasErrors && (
                <span
                  className="text-[10px]"
                  style={{
                    color: 'rgba(200,120,120,0.7)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Fix errors before processing
                </span>
              )}
            </div>

            <div className="space-y-3">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="border p-4"
                  style={{
                    borderColor: f.error
                      ? 'rgba(200,80,80,0.25)'
                      : 'rgba(201,168,76,0.08)',
                  }}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[11px]"
                        style={{
                          color: '#f5f0e8',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {f.file.name}
                      </p>
                      <p
                        className="mt-0.5 text-[10px]"
                        style={{
                          color: 'rgba(245,240,232,0.3)',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {formatFileSize(f.file.size)}
                        {f.fileType && (
                          <span className="ml-2 uppercase">
                            {f.fileType}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(f.id);
                      }}
                      className="flex-shrink-0 p-1 text-[10px] uppercase tracking-[0.05em] transition-colors hover:text-[rgba(200,120,120,0.9)]"
                      style={{
                        color: 'rgba(245,240,232,0.25)',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {f.error ? (
                    <p
                      className="text-[10px]"
                      style={{
                        color: 'rgba(200,120,120,0.8)',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {f.error}
                    </p>
                  ) : (
                    <div>
                      <label
                        className="mb-1 block text-[10px] uppercase tracking-[0.05em]"
                        style={{
                          color: 'rgba(245,240,232,0.3)',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Document type
                      </label>
                      <select
                        value={f.selectedType}
                        onChange={(e) => updateFileType(f.id, e.target.value)}
                        className="w-full border bg-transparent px-3 py-2 text-[11px]"
                        style={{
                          borderColor: 'rgba(201,168,76,0.12)',
                          color: '#f5f0e8',
                          fontFamily: "'DM Sans', sans-serif",
                          borderRadius: 0,
                        }}
                      >
                        {DOCUMENT_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process button */}
        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={!canProcess}
            className="w-full border py-3 text-[11px] uppercase tracking-[0.1em] transition-colors"
            style={{
              borderColor: canProcess ? '#C9A84C' : 'rgba(245,240,232,0.08)',
              color: canProcess ? '#C9A84C' : 'rgba(245,240,232,0.2)',
              backgroundColor: canProcess ? 'rgba(201,168,76,0.04)' : 'transparent',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              cursor: canProcess ? 'pointer' : 'not-allowed',
            }}
          >
            {uploading ? 'Uploading...' : 'Read my documents →'}
          </button>
        )}

        {/* File count info */}
        {files.length > 0 && (
          <p
            className="mt-3 text-center text-[10px]"
            style={{
              color: 'rgba(245,240,232,0.2)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {validFileCount} of {MAX_FILES_PER_SESSION} slots used
          </p>
        )}
      </div>
    </div>
  );
}
