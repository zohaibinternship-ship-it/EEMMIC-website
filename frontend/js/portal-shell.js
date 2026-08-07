/* Shared shell for every gated (non-marketing) page: sidebar + header,
   replacing the public top navbar entirely on these pages. Expected page
   skeleton:

     <body data-page-title="..." data-page-subtitle="..."
           data-require-role="admin"        (optional: admin|manager|investor)
           data-portal-type="evaluation">    (optional: client framework pages only)
       <div id="portalApp" style="display:none;">
         <aside id="portalSidebar"></aside>
         <div class="portal-content-col">
           <header id="portalHeader"></header>
           <main id="mainContent">...page content...</main>
         </div>
       </div>

   Requires js/db-client.js, js/auth.js, js/portal-nav-data.js,
   js/portal-widgets.js loaded first. Each page's own controller script
   should listen for the 'eemmic:portal-ready' event (detail: {session,
   profile, accessToken, role}) rather than re-deriving the session itself. */
(function () {
  const W = window.EemmicWidgets;
  const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', investor: 'Investor', buyer: 'Client', supplier: 'Client' };

  function renderSidebar(sections, roleLabel) {
    const el = document.getElementById('portalSidebar');
    if (!el) return;
    const path = window.location.pathname;
    el.innerHTML =
      '<a href="/" class="portal-sidebar__logo"><span class="logo-mark">E</span> EEMMIC</a>' +
      '<div class="portal-sidebar__role">' + W.escapeHtml(roleLabel) + '</div>' +
      sections.map(function (section) {
        return '<div class="portal-sidebar__section">' +
          '<div class="portal-sidebar__section-label">' + W.escapeHtml(section.label) + '</div>' +
          section.items.map(function (item) {
            const active = path === item.href;
            return '<a href="' + item.href + '" class="portal-sidebar__link' + (active ? ' active' : '') + '">' +
              W.icon(item.icon) + '<span>' + W.escapeHtml(item.title) + '</span></a>';
          }).join('') +
          '</div>';
      }).join('');
  }

  function renderHeader(profile, title, subtitle) {
    const el = document.getElementById('portalHeader');
    if (!el) return;
    el.innerHTML =
      '<button type="button" class="portal-header__menu-btn" id="portalMenuBtn" aria-label="Toggle menu">' + W.icon('grid', 20) + '</button>' +
      '<div class="portal-header__titles"><h1>' + W.escapeHtml(title || 'Dashboard') + '</h1>' +
      (subtitle ? '<p>' + W.escapeHtml(subtitle) + '</p>' : '') + '</div>' +
      '<div class="portal-header__user">' +
        '<span class="portal-header__name">' + W.escapeHtml(profile.name || profile.email) + '</span>' +
        '<button type="button" class="btn btn-outline btn-sm" id="portalLogoutBtn">Log Out</button>' +
      '</div>';
    document.getElementById('portalLogoutBtn').addEventListener('click', function () {
      window.EemmicAuth.logout();
    });
    document.getElementById('portalMenuBtn').addEventListener('click', function () {
      document.getElementById('portalApp').classList.toggle('sidebar-open');
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const app = document.getElementById('portalApp');
    if (!app || !window.EemmicAuth) return;

    const requiredRole = document.body.getAttribute('data-require-role');
    const portalType = document.body.getAttribute('data-portal-type');

    // Framework client-portal pages (data-portal-type set, no specific role
    // required) additionally check the caller has been granted that portal,
    // not just that they're logged in.
    const result = portalType && !requiredRole
      ? await window.EemmicAuth.requirePortalAccess(portalType)
      : await window.EemmicAuth.requireSession();
    if (!result) return; // already redirected

    const profile = result.profile;
    const role = profile ? profile.role : 'buyer';

    if (requiredRole && role !== requiredRole) {
      window.location.replace('/my-dashboard');
      return;
    }
    let sections;
    if (role === 'admin') sections = window.EemmicPortalNav.admin;
    else if (role === 'manager') sections = window.EemmicPortalNav.manager;
    else if (role === 'investor') sections = window.EemmicPortalNav.investor;
    else sections = window.EemmicPortalNav.client(portalType);

    renderSidebar(sections, ROLE_LABELS[role] || 'Client');
    renderHeader(profile, document.body.getAttribute('data-page-title'), document.body.getAttribute('data-page-subtitle'));

    app.style.display = '';

    document.dispatchEvent(new CustomEvent('eemmic:portal-ready', {
      detail: { session: result.session, profile: profile, accessToken: result.session.access_token, role: role }
    }));
  });
})();
