import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const touristClient = createClient(supabaseUrl, supabaseKey);
const authorityClient = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Authenticating authority...');
  const { data: authData, error: authError } = await authorityClient.auth.signInWithPassword({
    email: 'admin@meghalaya.gov.in',
    password: 'password123'
  });
  if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }
  console.log('Authority authenticated as', authData.user.id);

  console.log('Subscribing to incidents...');
  authorityClient.channel('test_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, payload => {
      console.log('RECEIVED EVENT:', payload.eventType, payload.new.id);
    })
    .subscribe(async (status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        // Authenticate a tourist
        console.log('Authenticating tourist...');
        const { data: tData, error: tError } = await touristClient.auth.signInWithPassword({
          email: 'nooman@example.com',
          password: 'password123'
        });
        if (tError) {
          console.error('Tourist auth error:', tError.message);
          return;
        }

        const { data: profile } = await touristClient.from('tourists').select('id').eq('auth_user_id', tData.user.id).single();

        console.log('Inserting incident for tourist...', profile.id);
        const { data: incData, error: incError } = await touristClient.from('incidents').insert({
          tourist_id: profile.id,
          incident_type: 'SOS',
          status: 'ACTIVE',
          severity: 'CRITICAL',
          latitude: 19.1,
          longitude: 72.1
        }).select().single();

        if (incError) console.error('Insert error:', incError);
        else console.log('Incident inserted successfully:', incData.id);

        setTimeout(() => process.exit(0), 3000);
      }
    });
}
test();
