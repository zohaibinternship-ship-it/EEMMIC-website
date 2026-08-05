/* Turns the nav's "Log In" link into "My Dashboard" / "Admin Dashboard" (+ a
   Log Out button) when there's an active session — this is the only thing
   that makes the dashboard discoverable after the initial post-login
   redirect, since it's intentionally not in the main nav-links list.
   No-ops silently on pages without #navAuthLink (login.html/signup.html) or
   without a session. Requires js/db-client.js and js/auth.js first. */
(function () {
  document.addEventListener('DOMContentLoaded', async function () {
    const link = document.getElementById('navAuthLink');
    if (!link || !window.EemmicAuth) return;

    const session = await window.EemmicAuth.getSession();
    if (!session) return; // stays "Log In" -> login.html

    const profile = await window.EemmicAuth.getProfile(session.user.id);
    const isAdmin = profile && profile.role === 'admin';

    link.textContent = isAdmin ? 'Admin Dashboard' : 'My Dashboard';
    link.href = isAdmin ? 'dashboard.html' : 'my-dashboard.html';

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'nav-link';
    logoutBtn.style.cssText = 'background:none; border:none; cursor:pointer; font:inherit;';
    logoutBtn.textContent = 'Log Out';
    logoutBtn.addEventListener('click', function () { window.EemmicAuth.logout(); });
    link.insertAdjacentElement('afterend', logoutBtn);
  });
})();
