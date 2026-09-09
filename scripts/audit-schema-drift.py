#!/usr/bin/env python3
"""
Schema drift scanner — Sprint S.

Compares every supabase-js `.from('table')` chain in the codebase against the
LIVE database schema, and reports columns the code names that the live table
does not have.

This exists because supabase-js does not throw. A query naming a missing column
returns {data: null, error} — and if nothing reads the error, a failed query is
indistinguishable from one that legitimately found nothing. tsc, jest and
`npm run build` cannot catch that class of bug, because none of them talk to the
database. This can.

Usage, from the repo root:

    set -a && . ./.env.local; set +a
    python3 scripts/audit-schema-drift.py

The live schema is read from PostgREST's OpenAPI endpoint, whose `definitions`
block lists every table's columns and its `required` (NOT NULL, no default) set.
The response is cached to .schema-spec.json; pass --refresh to re-fetch, or
point SCHEMA_SPEC at a file to use a saved one.

Findings are candidates, not verdicts. The parser can misread an unusual chain,
so confirm anything it reports with a direct query against the live table before
changing code.
"""

import json, os, re, sys, urllib.request
from collections import defaultdict

CACHE = os.path.join(os.path.dirname(__file__), '..', '.schema-spec.json')

def load_spec():
    override = os.environ.get('SCHEMA_SPEC')
    if override:
        return json.load(open(override))
    if os.path.exists(CACHE) and '--refresh' not in sys.argv:
        return json.load(open(CACHE))

    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        sys.exit(
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n"
            "  set -a && . ./.env.local; set +a"
        )
    req = urllib.request.Request(
        url.rstrip('/') + '/rest/v1/',
        headers={'apikey': key, 'Authorization': 'Bearer ' + key},
    )
    spec = json.loads(urllib.request.urlopen(req, timeout=30).read())
    with open(CACHE, 'w') as fh:
        json.dump(spec, fh)
    return spec

SPEC = load_spec()
DEFS = SPEC.get('definitions', {})
LIVE = {t: set(v.get('properties', {}).keys()) for t, v in DEFS.items()}
REQUIRED = {t: set(v.get('required', [])) for t, v in DEFS.items()}

ROOTS = ['src', 'scripts', 'supabase/functions']
FILTERS = ('eq','neq','gt','gte','lt','lte','like','ilike','is','in','contains','containedBy','overlaps','order','textSearch','match','filter')

def chain_slice(text, start):
    """From the index just after .from('x'), return the rest of the chained expression."""
    i = start
    depth = 0
    n = len(text)
    while i < n:
        c = text[i]
        if c in '([{': depth += 1
        elif c in ')]}':
            if depth == 0: break
            depth -= 1
        elif c == ';' and depth == 0: break
        elif c == '\n' and depth == 0:
            # continue only if the next non-space char starts a chained call
            j = i+1
            while j < n and text[j] in ' \t': j += 1
            if not text.startswith('.', j): break
        i += 1
    return text[start:i]

def top_level_keys(obj_src):
    """Keys of an object literal, depth-1 only."""
    keys = []
    depth = 0
    i = 0
    n = len(obj_src)
    buf = ''
    while i < n:
        c = obj_src[i]
        if c in '([{':
            depth += 1; i += 1; continue
        if c in ')]}':
            depth -= 1; i += 1; continue
        if depth == 1:
            m = re.match(r"[\s,]*(?:'([A-Za-z_][\w]*)'|\"([A-Za-z_][\w]*)\"|([A-Za-z_][\w]*))\s*:", obj_src[i:])
            if m:
                keys.append(m.group(1) or m.group(2) or m.group(3))
                i += m.end(); continue
        i += 1
    return keys

def balanced(text, open_idx):
    depth = 0
    for i in range(open_idx, len(text)):
        if text[i] in '([{': depth += 1
        elif text[i] in ')]}':
            depth -= 1
            if depth == 0: return text[open_idx:i+1]
    return text[open_idx:]

def parse_select(arg):
    cols = []
    # strip embedded resource bodies: table(a,b) -> record table as a col-ish name
    depth = 0; cur = ''
    parts = []
    for ch in arg:
        if ch == '(': depth += 1; cur += ch
        elif ch == ')': depth -= 1; cur += ch
        elif ch == ',' and depth == 0:
            parts.append(cur); cur = ''
        else: cur += ch
    parts.append(cur)
    for p in parts:
        p = p.strip()
        if not p: continue
        if '(' in p:      # embedded resource — skip (different table)
            continue
        if ':' in p:      # alias:column
            p = p.split(':')[-1].strip()
        p = p.split('::')[0].strip()
        p = re.sub(r'\.[\w.]+$', '', p)   # json path
        if p in ('*','count') or not re.match(r'^[A-Za-z_]\w*$', p): continue
        cols.append(p)
    return cols

usage = defaultdict(lambda: defaultdict(set))   # table -> col -> {locations}
writes = defaultdict(list)                       # table -> [(file,line,set(keys))]

files = []
for root in ROOTS:
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in ('node_modules','.next','dist')]
        for f in fn:
            if f.endswith(('.ts','.tsx','.mjs','.js')) and not f.endswith('.d.ts'):
                files.append(os.path.join(dp, f))

for path in files:
    try: text = open(path, encoding='utf-8').read()
    except Exception: continue
    for m in re.finditer(r"\.from\(\s*['\"]([a-z_][a-z0-9_]*)['\"]\s*\)", text):
        table = m.group(1)
        if table not in LIVE: 
            usage[table]['__TABLE_MISSING__'].add(f"{path}:{text[:m.start()].count(chr(10))+1}")
            continue
        line = text[:m.start()].count('\n') + 1
        loc = f"{path}:{line}"
        chain = chain_slice(text, m.end())

        for sm in re.finditer(r"\.select\(\s*([`'\"])(.*?)\1", chain, re.S):
            for c in parse_select(sm.group(2)):
                usage[table][c].add(loc)

        for wm in re.finditer(r"\.(insert|update|upsert)\(", chain):
            body = balanced(chain, chain.index('(', wm.end()-1))
            keys = top_level_keys(body)
            for k in keys: usage[table][k].add(loc)
            if wm.group(1) in ('insert','upsert') and keys:
                writes[table].append((loc, wm.group(1), set(keys)))

        for fm in re.finditer(r"\.(" + "|".join(FILTERS) + r")\(\s*['\"]([A-Za-z_][\w]*)", chain):
            usage[table][fm.group(2)].add(loc)

        for om in re.finditer(r"\.(?:or|and)\(\s*['\"`](.*?)['\"`]", chain, re.S):
            for cm in re.finditer(r"([A-Za-z_]\w*)\.(?:eq|neq|gt|gte|lt|lte|is|in|like|ilike|not)\.", om.group(1)):
                usage[table][cm.group(1)].add(loc)

print("=" * 70)
print("MISSING COLUMNS — code references a column the live table does not have")
print("=" * 70)
bad = 0
for table in sorted(usage):
    if table not in LIVE:
        print(f"\n!! TABLE DOES NOT EXIST: {table}")
        for loc in sorted(usage[table]['__TABLE_MISSING__']): print(f"     {loc}")
        bad += 1
        continue
    missing = {c: locs for c, locs in usage[table].items() if c not in LIVE[table]}
    if missing:
        bad += 1
        print(f"\n{table}  (live cols: {len(LIVE[table])})")
        for c in sorted(missing):
            print(f"  - {c}")
            for loc in sorted(missing[c])[:6]: print(f"      {loc}")
if not bad: print("\n  none")

print()
print("=" * 70)
print("INSERTS MISSING REQUIRED (NOT NULL, no default) COLUMNS")
print("=" * 70)
any_r = False
for table in sorted(writes):
    req = REQUIRED.get(table, set())
    if not req: continue
    for loc, op, keys in writes[table]:
        gap = req - keys
        if gap:
            any_r = True
            print(f"{table}  {op} at {loc}")
            print(f"    missing: {sorted(gap)}")
if not any_r: print("\n  none")
