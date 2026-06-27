import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of env.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) vars[match[1].trim()] = match[2].trim();
}

const url = vars.NEXT_PUBLIC_SUPABASE_URL;
const key = vars.SUPABASE_SERVICE_ROLE_KEY;

// Use PostgREST to get a row — the response headers include column info
// Or better: use the Supabase SQL API
const res = await fetch(`${url}/rest/v1/applications?select=*&limit=1`, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'return=representation'
  }
});

const text = await res.text();
console.log('Status:', res.status);
try {
  const json = JSON.parse(text);
  if (Array.isArray(json) && json.length > 0) {
    console.log('\nAPPLICATIONS TABLE COLUMNS (from row data):');
    Object.keys(json[0]).forEach(k => console.log('  ' + k));
  } else if (Array.isArray(json) && json.length === 0) {
    console.log('Table exists but is empty. Checking headers for column info...');
  } else {
    console.log('Response:', text.substring(0, 500));
  }
} catch {
  console.log('Raw response:', text.substring(0, 500));
}
