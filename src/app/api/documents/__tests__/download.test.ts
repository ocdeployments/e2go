/**
 * BC-14 (Gap G-11), September 12, 2026 (Session 152).
 *
 * document_access_log's 'download' action existed as a type but no route
 * ever wrote it — there was no download route for application_documents at
 * all (uploaded_documents deliberately never stores a raw file, per
 * CLAUDE.md's identity-document policy). This drives the new
 * GET /api/documents/[documentId]/download handler: it must log 'download'
 * on a successful fetch, and must refuse (410) once the retention cron has
 * purged the underlying file, without ever attempting a storage read for it.
 */
import type { NextRequest } from 'next/server';

interface Result { data: unknown; error: unknown }

const mockGetUser = jest.fn();
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => mockFrom(table),
    storage: { from: (bucket: string) => mockStorageFrom(bucket) },
  }),
}));

const mockLogDocumentAccess = jest.fn();
jest.mock('@/lib/document-access-log', () => ({
  logDocumentAccess: (...args: unknown[]) => mockLogDocumentAccess(...args),
}));

jest.mock('@/lib/capture-error', () => ({ captureApiError: jest.fn() }));

let documentRow: Result;
let downloadResult: { data: Blob | null; error: unknown };

function mockFrom(table: string) {
  expect(table).toBe('application_documents');
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({ single: async () => documentRow }),
      }),
    }),
  };
}

const mockDownload = jest.fn();
function mockStorageFrom(bucket: string) {
  expect(bucket).toBe('application-documents');
  return { download: mockDownload };
}

import { GET } from '../[documentId]/download/route';

function makeRequest(): NextRequest {
  return {} as NextRequest;
}

describe('GET /api/documents/[documentId]/download (BC-14)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    downloadResult = { data: new Blob(['file bytes'], { type: 'application/pdf' }), error: null };
    mockDownload.mockImplementation(async () => downloadResult);
  });

  it('logs a download action and streams the file on success', async () => {
    documentRow = {
      data: {
        id: 'doc-1',
        original_filename: 'bank-statement.pdf',
        file_type: 'pdf',
        storage_path: 'user-1/app-1/123_bank-statement.pdf',
        user_selected_document_type: 'bank_statement',
        detected_document_type: null,
        file_purged_at: null,
      },
      error: null,
    };

    const response = await GET(makeRequest(), { params: { documentId: 'doc-1' } });

    expect(response.status).toBe(200);
    expect(mockDownload).toHaveBeenCalledWith('user-1/app-1/123_bank-statement.pdf');
    expect(mockLogDocumentAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        documentId: 'doc-1',
        documentTable: 'application_documents',
        action: 'download',
      })
    );
    expect(response.headers.get('Content-Disposition')).toContain('bank-statement.pdf');
  });

  it('refuses with 410 and never touches storage once the file has been purged', async () => {
    documentRow = {
      data: {
        id: 'doc-2',
        original_filename: 'lease.pdf',
        file_type: 'pdf',
        storage_path: 'user-1/app-1/456_lease.pdf',
        user_selected_document_type: 'lease',
        detected_document_type: null,
        file_purged_at: '2026-09-01T00:00:00Z',
      },
      error: null,
    };

    const response = await GET(makeRequest(), { params: { documentId: 'doc-2' } });

    expect(response.status).toBe(410);
    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockLogDocumentAccess).not.toHaveBeenCalled();
  });

  it('returns 404 for a document owned by another user (or nonexistent)', async () => {
    documentRow = { data: null, error: null };

    const response = await GET(makeRequest(), { params: { documentId: 'doc-3' } });

    expect(response.status).toBe(404);
    expect(mockLogDocumentAccess).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') });

    const response = await GET(makeRequest(), { params: { documentId: 'doc-1' } });

    expect(response.status).toBe(401);
  });
});
