const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — the backend cannot reach the ' +
    'database until both are configured (see backend/.env.example).'
  );
}

/* Server-side only. Uses the service_role key, which bypasses Row Level
   Security entirely — never send this key to the browser. */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = supabase;
