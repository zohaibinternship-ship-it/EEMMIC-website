/* login.html: signs in, then routes to the right dashboard based on the
   account's role. Requires js/db-client.js and js/auth.js to have run first. */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');
    if (!form) return;

    let errorBox = form.querySelector('.form-error');
    if (!errorBox) {
      errorBox = document.createElement('p');
      errorBox.className = 'form-error';
      errorBox.style.display = 'none';
      form.querySelector('button[type="submit"]').insertAdjacentElement('beforebegin', errorBox);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorBox.style.display = 'none';

      const submitBtn = form.querySelector('button[type="submit"]');
      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Logging in…';

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      window.EemmicDB.signInWithPassword(email, password)
        .then(function (result) {
          if (result.error) throw result.error;
          return window.EemmicAuth.getProfile(result.data.user.id);
        })
        .then(function (profile) {
          const params = new URLSearchParams(location.search);
          const next = params.get('next');
          const isAdmin = profile && profile.role === 'admin';
          const fallback = isAdmin ? 'dashboard.html' : 'my-dashboard.html';
          window.location.href = (next && next !== 'login.html') ? next : fallback;
        })
        .catch(function (err) {
          errorBox.textContent = (err && err.message) || 'Login failed. Check your email and password.';
          errorBox.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = original;
        });
    });
  });
})();
