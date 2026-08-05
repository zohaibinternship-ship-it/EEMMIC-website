/* Placeholder for the new database (Supabase has been removed). Every route
   that used to call the Supabase client now calls notImplemented() instead,
   which resolves to the same { data, error } shape the old client returned —
   so wiring up the new DB later is just replacing this file's contents and
   the notImplemented() call sites with real queries. */
async function notImplemented() {
  return { data: null, error: new Error('Database not connected yet — see backend/src/db.js.') };
}

module.exports = { notImplemented };
