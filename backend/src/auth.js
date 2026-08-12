const supabase = require('./supabaseClient');

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

/* Verifies the request's bearer token against Supabase Auth. Returns the
   authenticated user, or null if there's no token or it's invalid/expired. */
async function getUserFromRequest(req) {
  const token = bearerToken(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

module.exports = { getUserFromRequest };
