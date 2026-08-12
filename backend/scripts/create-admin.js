/* One-shot CLI to provision an admin account directly (email + password set
   immediately, no invite email, no manual SQL promotion afterwards).
   Client accounts still go through the normal admin-invite flow
   (dashboard.html "Invite a client" -> POST /api/users) — this script is
   only for bootstrapping/adding admin panel accounts, which have no
   self-service or invite path by design (see supabase/schema.sql).

   Usage:
     node backend/scripts/create-admin.js <email> <password> [name]

   Requires backend/.env to have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set. */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const supabase = require('../src/supabaseClient');

async function main() {
  const [, , email, password, ...nameParts] = process.argv;
  const name = nameParts.join(' ').trim() || 'Admin';

  if (!email || !password) {
    console.error('Usage: node backend/scripts/create-admin.js <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'admin' }
  });

  if (error) {
    console.error('Failed to create user:', error.message);
    process.exit(1);
  }

  const userId = data.user.id;

  /* eemmic_handle_new_user() always forces new signups to a non-admin role
     (see supabase/schema.sql) even though we passed role: 'admin' above —
     that's intentional, it's what stops a crafted signUp() call from
     self-granting admin. So explicitly promote the row here, using the
     service_role client which bypasses RLS. */
  const { error: updateError } = await supabase
    .from('eemmic_profiles')
    .update({ role: 'admin', name })
    .eq('id', userId);

  if (updateError) {
    console.error('User was created but promoting to admin failed:', updateError.message);
    console.error(`Fix manually: update public.eemmic_profiles set role = 'admin' where id = '${userId}';`);
    process.exit(1);
  }

  console.log(`Admin account created: ${email} (id ${userId})`);
  console.log('They can log in immediately at /login.html with the password you gave.');
}

main();
