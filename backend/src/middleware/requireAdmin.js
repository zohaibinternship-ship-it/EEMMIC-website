/* Protects GET/PATCH /api/submissions (the admin dashboard's data).
   TODO: Supabase has been removed. Once the new database/auth is wired up,
   restore token verification + an admin-role check here. Until then this
   fails closed (501) rather than silently granting access. */
module.exports = async function requireAdmin(req, res, next) {
  return res.status(501).json({ error: 'Admin authentication is not connected to a database yet.' });
};
