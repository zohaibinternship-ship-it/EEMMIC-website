/* Protects every admin-only route: verifies the caller's Supabase session
   and that their eemmic_profiles row has role = 'admin'. Thin wrapper around
   the more general requireRole so existing imports of this file keep working
   unchanged. */
module.exports = require('./requireRole')('admin');
