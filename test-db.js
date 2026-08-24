import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('tourists')
    .select('id, safety_id, kyc_status, kyc_document_path, kyc_submitted_at, kyc_reviewed_at, blockchain_reference')
    .eq('safety_id', 'TG-2026-IND-7329');
    
  console.log(data, error);
}

main();
