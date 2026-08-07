/* The nav's "Login" link is always visible and, instead of navigating to
   /login directly, opens a chooser modal (Client Portal / Admin Dashboard).
   Logged-out visitors see both options routed to /login; once there's a
   session, the modal shows that account's portal plus a Log Out action.
   No-ops silently on pages without #navAuthLink (login.html/my-dashboard.html/
   dashboard.html — those already have their own auth UI). Requires
   js/db-client.js and js/auth.js first. */
(function () {
  function optionRow(icon, title, desc, href, onClick) {
    var el = document.createElement(href ? 'a' : 'button');
    el.className = 'login-modal__option';
    if (href) {
      el.href = href;
    } else {
      el.type = 'button';
      el.addEventListener('click', onClick);
    }
    el.innerHTML =
      '<span class="login-modal__option-icon">' + icon + '</span>' +
      '<span class="login-modal__option-body">' +
        '<span class="login-modal__option-title">' + title + '</span>' +
        '<span class="login-modal__option-desc">' + desc + '</span>' +
      '</span>' +
      '<span class="login-modal__option-arrow">&#8594;</span>';
    return el;
  }

  function buildModal() {
    var overlay = document.createElement('div');
    overlay.className = 'login-modal-overlay';
    overlay.innerHTML =
      '<div class="login-modal" role="dialog" aria-modal="true" aria-labelledby="loginModalTitle">' +
        '<button type="button" class="login-modal__close" aria-label="Close">&times;</button>' +
        '<div class="login-modal__eyebrow">EEMMIC</div>' +
        '<h2 class="login-modal__title" id="loginModalTitle">Login to your account</h2>' +
        '<div class="login-modal__options"></div>' +
        '<p class="login-modal__footer">New clients &mdash; submit an enquiry through the <a href="/contact">contact page</a> to receive your portal credentials.</p>' +
      '</div>';
    document.body.appendChild(overlay);

    function close() { overlay.classList.remove('is-open'); }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('.login-modal__close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    return overlay;
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var link = document.getElementById('navAuthLink');
    if (!link || !window.EemmicAuth) return;

    link.textContent = 'Login';

    var session = await window.EemmicAuth.getSession();
    var profile = session ? await window.EemmicAuth.getProfile(session.user.id) : null;
    var role = profile && profile.role;

    var LOGGED_IN_OPTION = {
      admin: ['&#9670;', 'Admin Dashboard', 'Sector administrators — manage enquiries, users, and service records.', '/dashboard'],
      manager: ['&#9873;', 'Manager Dashboard', 'Operations — approvals, team tasks, and reports.', '/manager'],
      investor: ['&#9673;', 'Investor Portal', 'Your portfolio, investments, and analytics.', '/investor']
    };

    var overlay = buildModal();
    var optionsBox = overlay.querySelector('.login-modal__options');

    if (session) {
      var opt = LOGGED_IN_OPTION[role] || ['&#9678;', 'Client Portal', 'Check your service status, progress updates, and messages from the EEMMIC team.', '/my-dashboard'];
      optionsBox.appendChild(optionRow(opt[0], opt[1], opt[2], opt[3]));
      optionsBox.appendChild(optionRow('&#9211;', 'Log Out', 'Sign out of your EEMMIC account.', null, function () {
        window.EemmicAuth.logout();
      }));
    } else {
      optionsBox.appendChild(optionRow('&#9678;', 'Client Portal', 'Check your service status, progress updates, and messages from the EEMMIC team.', '/login?next=' + encodeURIComponent('/my-dashboard')));
      optionsBox.appendChild(optionRow('&#9670;', 'Admin Dashboard', 'Sector administrators — manage enquiries, users, and service records.', '/login?next=' + encodeURIComponent('/dashboard')));
    }

    link.addEventListener('click', function (e) {
      e.preventDefault();
      overlay.classList.add('is-open');
    });
  });
})();
