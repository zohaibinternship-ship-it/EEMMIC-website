const { getUserFromRequest } = require('../auth');
const db = require('../db');

/* Generalized version of requireAdmin: verifies the caller's Supabase
   session and that their eemmic_profiles.role is one of the given roles.
   Sets req.user/req.profile on success, same as requireAdmin. */
module.exports = function requireRole(...roles) {
  return async function (req, res, next) {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Log in required.' });
    }

    const { data: profile, error } = await db.getProfile(user.id);
    if (error) {
      console.error('Failed to load profile for role check:', error);
      return res.status(500).json({ error: 'Could not verify permissions.' });
    }
    if (!profile || !roles.includes(profile.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}.` });
    }

    req.user = user;
    req.profile = profile;
    next();
  };
};
