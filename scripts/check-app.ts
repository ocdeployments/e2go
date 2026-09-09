import { config } from 'dotenv';
config({ path: '.env.local' });
if (!(globalThis as any).WebSocket) (globalThis as any).WebSocket = require('ws');
import { createClient } from '@supabase/supabase-js';
async function main() {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await service.from('applications').select('id,user_id').eq('id','fb8869a6-32b9-4459-b177-cb029a7560a0').single();
  console.log(data, error);
}
main();
