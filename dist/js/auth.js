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

  /* Redirects to login.html (preserving the current page as ?next=) if
     there's no session. Returns { session, profile } otherwise. */
  async function requireSession() {
    const session = await getSession();
    if (!session) {
      const here = location.pathname.split('/').pop() || 'index.html';
      window.location.href = 'login.html?next=' + encodeURIComponent(here);
      return null;
    }
    const profile = await getProfile(session.user.id);
    return { session: session, profile: profile };
  }

  /* Like requireSession, but also redirects non-admins to my-dashboard.html. */
  async function requireAdmin() {
    const result = await requireSession();
    if (!result) return null;
    if (!result.profile || result.profile.role !== 'admin') {
      window.location.href = 'my-dashboard.html';
      return null;
    }
    return result;
  }

  async function logout() {
    await client().signOut();
    window.location.href = 'login.html';
  }

  return {
    getSession: getSession,
    getProfile: getProfile,
    requireSession: requireSession,
    requireAdmin: requireAdmin,
    logout: logout
  };
})();
