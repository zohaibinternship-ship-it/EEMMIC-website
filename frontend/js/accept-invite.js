/* accept-invite.html: lands here from the link in an admin-sent Supabase
   invite email. Supabase's JS client parses the invite token out of the URL
   into a live session automatically (detectSessionInUrl) — this page just
   has to set a password on that session. Requires js/db-client.js and
   js/auth.js to have run first. */
(function () {
  document.addEventListener('DOMContentLoaded', async function () {
    const form = document.getElementById('acceptInviteForm');
    const inviteError = document.getElementById('inviteError');
    if (!form) return;

    const session = await window.EemmicAuth.getSession();
    if (!session) {
      form.style.display = 'none';
      if (inviteError) inviteError.style.display = 'block';
      return;
    }

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

      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      if (password !== confirmPassword) {
        errorBox.textContent = 'Passwords do not match.';
        errorBox.style.display = 'block';
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Saving…';

      window.EemmicDB.setPassword(password)
        .then(function (result) {
          if (result.error) throw result.error;
          return window.EemmicAuth.getProfile(session.user.id);
        })
        .then(function (profile) {
          const isAdmin = profile && profile.role === 'admin';
          window.location.href = isAdmin ? '/dashboard' : '/my-dashboard';
        })
        .catch(function (err) {
          errorBox.textContent = (err && err.message) || 'Could not set password. Please try again.';
          errorBox.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = original;
        });
    });
  });
})();
