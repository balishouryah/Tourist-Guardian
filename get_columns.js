import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const url = envFile.split('\n').find(line => line.startsWith('VITE_SUPABASE_URL')).split('=')[1].trim();
const key = envFile.split('\n').find(line => line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY')).split('=')[1].trim();

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('tourists').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log("No rows, creating a dummy one to get schema");
    // just get columns via rpc or something, or we can just fetch the swagger json
    const res = await fetch(`${url}/rest/v1/tourists?limit=1`, {
        headers: { 'apikey': key }
    });
    console.log(await res.json());
  }
}
check();
