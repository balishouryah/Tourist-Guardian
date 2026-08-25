import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const authorityClient = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: authData } = await authorityClient.auth.signInWithPassword({
    email: 'admin@meghalaya.gov.in',
    password: 'securepassword123'
  });
  if (!authData?.user) {
    console.error('Auth failed. Maybe password is not securepassword123?');
    // Try another
    const { data: authData2 } = await authorityClient.auth.signInWithPassword({
      email: 'admin@meghalaya.gov.in',
      password: 'password123!'
    });
    if (!authData2?.user) {
        console.error('Still failed.');
        return;
    }
  }
  
  console.log('Logged in!');
  
  // Try selecting an incident
  const { data, error } = await authorityClient.from('incidents').select('*').limit(1);
  console.log('Incident select:', data, error);
}
test();
