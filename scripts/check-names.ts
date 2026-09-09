import { config } from 'dotenv';
config({ path: '.env.local' });
if (!(globalThis as any).WebSocket) (globalThis as any).WebSocket = require('ws');
import { createClient } from '@supabase/supabase-js';
async function main() {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: users } = await service.auth.admin.listUsers();
  for (const u of users.users) {
    console.log(u.email, u.id, u.user_metadata);
  }
}
main();
