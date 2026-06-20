import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of env.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) vars[match[1].trim()] = match[2].trim();
}
const res = await fetch(`${vars.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': vars.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${vars.SUPABASE_SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ query: "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'applications_payment_status_check'" })
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
