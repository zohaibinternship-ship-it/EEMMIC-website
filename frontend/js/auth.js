/* Shared auth helpers for EEMMIC's account pages (login, signup,
   my-dashboard, dashboard). Requires js/db-client.js to run first. */
window.EemmicAuth = (function () {
  function client() {
    return window.EemmicDB;
  }

  async function getSession() {
    return client().getSession();
  }

  async function getProfile(userId) {
    return client().getProfile(userId);
  }

  /* Redirects to /login (preserving the current page as ?next=) if there's
     no session. Returns { session, profile } otherwise. */
  async function requireSession() {
    const session = await getSession();
    if (!session) {
      window.location.replace('/login?next=' + encodeURIComponent(location.pathname));
      return null;
    }
    const profile = await getProfile(session.user.id);
    return { session: session, profile: profile };
  }

  /* Like requireSession, but also redirects non-admins to /my-dashboard. */
  async function requireAdmin() {
    const result = await requireSession();
    if (!result) return null;
    if (!result.profile || result.profile.role !== 'admin') {
      window.location.replace('/my-dashboard');
      return null;
    }
    return result;
  }

  /* Like requireSession, but also redirects anyone whose role isn't in the
     given list to /my-dashboard. Used by manager.html/investor.html. */
  async function requireRole() {
    const roles = Array.prototype.slice.call(arguments);
    const result = await requireSession();
    if (!result) return null;
    if (!result.profile || roles.indexOf(result.profile.role) === -1) {
      window.location.replace('/my-dashboard');
      return null;
    }
    return result;
  }

  /* Like requireSession, but also redirects anyone without an
     eemmic_portal_services row for portalType to /my-dashboard. Used by
     every portal-<framework>*.html page. */
  async function requirePortalAccess(portalType) {
    const result = await requireSession();
    if (!result) return null;
    const { data: services, error } = await client().fetchOwnPortalServices();
    if (error || !(services || []).some(function (s) { return s.portal_type === portalType; })) {
      window.location.replace('/my-dashboard');
      return null;
    }
    return result;
  }

  async function logout() {
    await client().signOut();
    window.location.href = '/login';
  }

  return {
    getSession: getSession,
    getProfile: getProfile,
    requireSession: requireSession,
    requireAdmin: requireAdmin,
    requireRole: requireRole,
    requirePortalAccess: requirePortalAccess,
    logout: logout
  };
})();
