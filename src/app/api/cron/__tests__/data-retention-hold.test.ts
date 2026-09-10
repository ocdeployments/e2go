import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { purgeExpiredFiles } from '@/lib/retention-cron';

// Both application_documents rows below are well past FILE_MAX_AGE_DAYS (90),
// so age alone would make them eligible for purge — the only variable under
// test is whether the owning application carries a retention_hold_at.
const HARD_CAP_EXCEEDED_DATE = '2020-01-01T00:00:00Z';

/**
 * Minimal chainable Supabase stand-in covering only the calls
 * purgeExpiredFiles actually makes: reading held applications, reading
 * packaged applications, reading candidate documents, removing storage
 * objects, and stamping file_purged_at.
 */
function fakeSupabase(opts: {
  heldAppIds?: string[];
  appDocs?: Array<{ id: string; application_id: string; storage_path: string | null; created_at: string }>;
}) {
  const updatedAppDocIds = new Set<string>();
  const removedPaths: string[] = [];

  const client = {
    from(table: string) {
      if (table === 'applications') {
        return {
          select: () => ({
            not: async () => ({
              data: (opts.heldAppIds ?? []).map((id) => ({ id })),
              error: null,
            }),
          }),
        };
      }
      if (table === 'generated_documents') {
        return {
          select: () => ({
            lt: async () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === 'application_documents') {
        return {
          select: () => ({
            is: async () => ({ data: opts.appDocs ?? [], error: null }),
          }),
          update: (_fields: Record<string, unknown>) => ({
            eq: async (_col: string, id: string) => {
              updatedAppDocIds.add(id);
              return { error: null };
            },
          }),
        };
      }
      if (table === 'fdd_analyses') {
        return {
          select: () => ({
            is: async () => ({ data: [], error: null }),
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
      }),
    },
  };

  return { supabase: client as unknown as SupabaseClient, updatedAppDocIds, removedPaths };
}

describe('purgeExpiredFiles — retention hold exclusion (RS-10 / Gap G-19)', () => {
  it('excludes a document belonging to an application with an active hold', async () => {
    const { supabase, updatedAppDocIds, removedPaths } = fakeSupabase({
      heldAppIds: ['held-app'],
      appDocs: [
        {
          id: 'doc-held',
          application_id: 'held-app',
          storage_path: 'held-app/bank-statement.pdf',
          created_at: HARD_CAP_EXCEEDED_DATE,
        },
      ],
    });

    const result = await purgeExpiredFiles(supabase);

    expect(result.appDocs).toBe(0);
    expect(updatedAppDocIds.size).toBe(0);
    expect(removedPaths).toHaveLength(0);
    expect(result.purgedByApp.has('held-app')).toBe(false);
  });

  it('purges an equally old document whose application has no hold', async () => {
    const { supabase, updatedAppDocIds, removedPaths } = fakeSupabase({
      heldAppIds: [],
      appDocs: [
        {
          id: 'doc-free',
          application_id: 'free-app',
          storage_path: 'free-app/bank-statement.pdf',
          created_at: HARD_CAP_EXCEEDED_DATE,
        },
      ],
    });

    const result = await purgeExpiredFiles(supabase);

    expect(result.appDocs).toBe(1);
    expect(updatedAppDocIds.has('doc-free')).toBe(true);
    expect(removedPaths).toEqual(['free-app/bank-statement.pdf']);
    expect(result.purgedByApp.get('free-app')).toBe(1);
  });

  it('only excludes the held application, purging an unrelated old document in the same run', async () => {
    const { supabase, updatedAppDocIds } = fakeSupabase({
      heldAppIds: ['held-app'],
      appDocs: [
        {
          id: 'doc-held',
          application_id: 'held-app',
          storage_path: 'held-app/bank-statement.pdf',
          created_at: HARD_CAP_EXCEEDED_DATE,
        },
        {
          id: 'doc-free',
          application_id: 'free-app',
          storage_path: 'free-app/bank-statement.pdf',
          created_at: HARD_CAP_EXCEEDED_DATE,
        },
      ],
    });

    const result = await purgeExpiredFiles(supabase);

    expect(updatedAppDocIds.has('doc-held')).toBe(false);
    expect(updatedAppDocIds.has('doc-free')).toBe(true);
    expect(result.appDocs).toBe(1);
  });
});

describe('retention day-count consistency (RS-10 / Gap G-19)', () => {
  it('states the same 30/90-day schedule in Module 1 and the privacy policy', () => {
    const module1 = fs.readFileSync(
      path.join(process.cwd(), 'src/app/apply/module1/page.tsx'),
      'utf8',
    );
    const privacy = fs.readFileSync(
      path.join(process.cwd(), 'src/app/privacy/PrivacyClient.tsx'),
      'utf8',
    );

    const schedule =
      /30 days after your document package is generated, or 90 days after upload if no package (?:has been generated|exists)/;

    expect(module1).toMatch(schedule);
    expect(privacy).toMatch(schedule);
  });
});
