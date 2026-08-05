/* signup.html: creates an account with role/name/organisation as signup
   metadata. TODO: Supabase has been removed — supabase/schema.sql is kept
   only as a reference for the profile-creation-with-role-validation shape
   the new backend should replicate. Requires js/db-client.js to run first. */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('signupForm');
    if (!form) return;

    let errorBox = form.querySelector('.form-error');
    if (!errorBox) {
      errorBox = document.createElement('p');
      errorBox.className = 'form-error';
      errorBox.style.display = 'none';
      form.querySelector('button[type="submit"]').insertAdjacentElement('beforebegin', errorBox);
    }

    const successBox = document.getElementById('signupSuccess');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorBox.style.display = 'none';

      const submitBtn = form.querySelector('button[type="submit"]');
      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Creating account…';

      const name = document.getElementById('name').value.trim();
      const organisation = document.getElementById('organisation').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;

      window.EemmicDB.signUp(email, password, { name: name, organisation: organisation, role: role })
        .then(function (result) {
          if (result.error) throw result.error;

          if (result.data.session) {
            window.location.href = 'my-dashboard.html';
            return;
          }

          form.style.display = 'none';
          if (successBox) successBox.classList.add('show');
        })
        .catch(function (err) {
          errorBox.textContent = (err && err.message) || 'Sign up failed. Please try again.';
          errorBox.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = original;
        });
    });
  });
})();
