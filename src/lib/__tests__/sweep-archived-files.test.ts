/**
 * BC-16 (Gap G-10), September 12, 2026 (Session 152 cont.).
 *
 * purgeExpiredFiles/purgeDeletedAccounts used to hard-delete Storage objects
 * outright — no soft-delete window, no recovery path for a purge-logic bug.
 * They now move objects into an _archive/ prefix instead; sweepArchivedFiles
 * is the second pass that actually removes bytes, and only once
 * ARCHIVE_WINDOW_DAYS has elapsed since the archive move. This drives that:
 * a too-young archived row must be left alone, and an eligible one must be
 * hard-deleted from Storage and stamped archive_hard_deleted_at exactly once.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { sweepArchivedFiles, ARCHIVE_WINDOW_DAYS } from '../retention-cron';

function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

interface Row {
  id: string;
  storage_archive_path: string | null;
  file_archived_at: string;
}

function fakeSupabase(opts: {
  appDocRows?: Row[];
  fddDocRows?: Row[];
  accountPurgeRows?: Array<{ id: string; storage_prefix: string }>;
}) {
  const removedPaths: string[] = [];
  const stampedAppDocIds = new Set<string>();
  const stampedFddDocIds = new Set<string>();
  const stampedAccountPurgeIds = new Set<string>();

  const client = {
    from(table: string) {
      if (table === 'application_documents') {
        return {
          select: () => ({
            not: () => ({
              is: () => ({
                lt: async () => ({ data: opts.appDocRows ?? [], error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: async (_col: string, id: string) => {
              stampedAppDocIds.add(id);
              return { error: null };
            },
          }),
        };
      }
      if (table === 'fdd_analyses') {
        return {
          select: () => ({
            not: () => ({
              is: () => ({
                lt: async () => ({ data: opts.fddDocRows ?? [], error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: async (_col: string, id: string) => {
              stampedFddDocIds.add(id);
              return { error: null };
            },
          }),
        };
      }
      if (table === 'archived_account_purges') {
        return {
          select: () => ({
            is: () => ({
              lt: async () => ({ data: opts.accountPurgeRows ?? [], error: null }),
            }),
          }),
          update: () => ({
            eq: async (_col: string, id: string) => {
              stampedAccountPurgeIds.add(id);
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
    storage: {
      from: (_bucket: string) => ({
        remove: async (paths: string[]) => {
          removedPaths.push(...paths);
          return { error: null };
        },
        list: async () => ({ data: [], error: null }),
      }),
    },
  };

  return {
    supabase: client as unknown as SupabaseClient,
    removedPaths,
    stampedAppDocIds,
    stampedFddDocIds,
    stampedAccountPurgeIds,
  };
}

describe('sweepArchivedFiles (BC-16 / Gap G-10)', () => {
  it('hard-deletes an application_documents archive past the recovery window', async () => {
    const { supabase, removedPaths, stampedAppDocIds } = fakeSupabase({
      appDocRows: [
        {
          id: 'doc-1',
          storage_archive_path: '_archive/user-1/bank-statement.pdf',
          file_archived_at: daysAgoIso(ARCHIVE_WINDOW_DAYS + 1),
        },
      ],
    });

    const result = await sweepArchivedFiles(supabase);

    expect(result.appDocs).toBe(1);
    expect(removedPaths).toEqual(['_archive/user-1/bank-statement.pdf']);
    expect(stampedAppDocIds.has('doc-1')).toBe(true);
  });

  it('hard-deletes an fdd_analyses archive and an archived account prefix', async () => {
    const { supabase, removedPaths, stampedFddDocIds, stampedAccountPurgeIds } = fakeSupabase({
      fddDocRows: [
        {
          id: 'fdd-1',
          storage_archive_path: '_archive/user-2/fdd.pdf',
          file_archived_at: daysAgoIso(ARCHIVE_WINDOW_DAYS + 3),
        },
      ],
      accountPurgeRows: [{ id: 'purge-1', storage_prefix: '_archive/user-3' }],
    });

    const result = await sweepArchivedFiles(supabase);

    expect(result.fddDocs).toBe(1);
    expect(result.accountPrefixes).toBe(1);
    expect(removedPaths).toContain('_archive/user-2/fdd.pdf');
    expect(stampedFddDocIds.has('fdd-1')).toBe(true);
    expect(stampedAccountPurgeIds.has('purge-1')).toBe(true);
  });

  it('leaves nothing to do when no rows are due', async () => {
    const { supabase, removedPaths } = fakeSupabase({});

    const result = await sweepArchivedFiles(supabase);

    expect(result.appDocs).toBe(0);
    expect(result.fddDocs).toBe(0);
    expect(result.accountPrefixes).toBe(0);
    expect(removedPaths).toHaveLength(0);
  });
});
