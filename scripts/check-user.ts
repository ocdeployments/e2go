import { config } from 'dotenv';
config({ path: '.env.local' });
if (!(globalThis as any).WebSocket) (globalThis as any).WebSocket = require('ws');
import { createClient } from '@supabase/supabase-js';
async function main() {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await service.from('fdd_analyses').select('id,user_id,original_filename,created_at').eq('id','d23915dd-9036-4377-a97e-34242722e38a').single();
  console.log('row:', data);
  const { data: users } = await service.auth.admin.listUsers();
  console.log('all users:', users.users.map(u=>({id:u.id, email:u.email})));
}
main();
