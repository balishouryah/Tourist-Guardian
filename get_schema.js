import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const url = envFile.split('\n').find(line => line.startsWith('VITE_SUPABASE_URL')).split('=')[1].trim();
const key = envFile.split('\n').find(line => line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY')).split('=')[1].trim();

async function check() {
  try {
    const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
    const spec = await res.json();
    console.log(JSON.stringify(Object.keys(spec.definitions.tourists.properties), null, 2));
  } catch (err) {
    console.error(err);
  }
}
check();
