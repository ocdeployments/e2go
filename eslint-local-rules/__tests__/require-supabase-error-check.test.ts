import path from 'path';
import { ESLint } from 'eslint';

// RS-5 (Gap G-16): confirms the project's real .eslintrc.json config — not
// just the bare rule in isolation — actually gates unbound Supabase error
// destructuring at build-failing severity in the strict zone
// (src/middleware.ts, src/app/api/**, src/lib/**) while only warning
// elsewhere. Uses ESLint's Node API with a virtual `filePath` so overrides
// resolve against real project paths without writing fixture files to disk.

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function makeESLint(): ESLint {
  return new ESLint({
    cwd: PROJECT_ROOT,
    useEslintrc: true,
    overrideConfigFile: path.join(PROJECT_ROOT, '.eslintrc.json'),
    ignore: false,
  });
}

async function lintAt(filePath: string, code: string) {
  const eslint = makeESLint();
  const results = await eslint.lintText(code, { filePath });
  return results[0].messages.filter(
    (m) => m.ruleId === 'local-rules/require-supabase-error-check'
  );
}

const UNBOUND_DESTRUCTURE = `
export async function GET() {
  const { data } = await supabase.from('applications').select('*');
  return Response.json({ data });
}
`;

const BOUND_DESTRUCTURE = `
export async function GET() {
  const { data, error } = await supabase.from('applications').select('*');
  if (error) throw error;
  return Response.json({ data });
}
`;

describe('local-rules/require-supabase-error-check (RS-5, Gap G-16)', () => {
  it('fails (error severity) on an unbound destructure in src/app/api/**', async () => {
    const messages = await lintAt(
      path.join(PROJECT_ROOT, 'src/app/api/__fixtures__/rs5/route.ts'),
      UNBOUND_DESTRUCTURE
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
  });

  it('fails (error severity) on an unbound destructure in src/lib/**', async () => {
    const messages = await lintAt(
      path.join(PROJECT_ROOT, 'src/lib/__fixtures__rs5.ts'),
      UNBOUND_DESTRUCTURE
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
  });

  it('warns (does not fail) on the same pattern in a plain page component', async () => {
    const messages = await lintAt(
      path.join(PROJECT_ROOT, 'src/app/some-page/page.tsx'),
      UNBOUND_DESTRUCTURE
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(1);
  });

  it('passes clean when both data and error are bound, anywhere', async () => {
    const apiMessages = await lintAt(
      path.join(PROJECT_ROOT, 'src/app/api/__fixtures__/rs5-clean/route.ts'),
      BOUND_DESTRUCTURE
    );
    expect(apiMessages).toHaveLength(0);

    const pageMessages = await lintAt(
      path.join(PROJECT_ROOT, 'src/app/some-page/page.tsx'),
      BOUND_DESTRUCTURE
    );
    expect(pageMessages).toHaveLength(0);
  });

  it('warns (grandfathered) on an already-listed strict-zone file with a bracketed dynamic-route path', async () => {
    // Regression test: minimatch treats [id]/[applicationId] as character
    // classes in overrides[].files, so unescaped bracket paths in the
    // grandfather list silently failed to match and fell through to the
    // strict-zone "error" override. This file is a real grandfathered entry.
    const messages = await lintAt(
      path.join(PROJECT_ROOT, 'src/app/api/admin/promo-codes/[id]/route.ts'),
      UNBOUND_DESTRUCTURE
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(1);
  });
});
