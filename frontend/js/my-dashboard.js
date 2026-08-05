/* my-dashboard.html: a logged-in buyer/supplier/investor's own submissions,
   plus a form to submit a new one. Reads go through window.EemmicDB
   (TODO: not connected to a database yet); writes go through the existing
   /api/submissions endpoint with the session's access token attached, so
   name/email/organisation come from the account instead of being retyped.
   Requires js/db-client.js and js/auth.js first. */
(function () {
  const SERVICE_LABELS = {
    evaluation: 'Evaluation',
    management: 'Management',
    marketplace: 'Marketplace',
    investment: 'Investment'
  };

  const STATUS_BADGE_CLASS = {
    new: 'status-operational',
    contacted: 'status-progress',
    qualified: 'status-progress',
    closed: 'status-closed'
  };

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const auth = await window.EemmicAuth.requireSession();
    if (!auth) return; // already redirected to login.html

    const session = auth.session;
    const profile = auth.profile;

    const roleLabel = profile ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Account';
    const eyebrow = document.getElementById('roleEyebrow');
    const heading = document.getElementById('welcomeHeading');
    const sub = document.getElementById('welcomeSub');
    if (eyebrow) eyebrow.textContent = roleLabel;
    if (heading) heading.textContent = 'Welcome' + (profile && profile.name ? ', ' + profile.name : '') + '.';
    if (sub) sub.textContent = 'Your submitted requirements and their status.';

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', function () { window.EemmicAuth.logout(); });

    const body = document.getElementById('submissionsBody');

    function updateStats(submissions) {
      const counts = { new: 0, progress: 0, closed: 0 };
      submissions.forEach(function (s) {
        if (s.status === 'new') counts.new++;
        else if (s.status === 'closed') counts.closed++;
        else counts.progress++;
      });
      const setText = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setText('statTotal', submissions.length);
      setText('statNew', counts.new);
      setText('statContacted', counts.progress);
      setText('statClosed', counts.closed);
    }

    function render(submissions) {
      if (!body) return;
      if (!submissions.length) {
        body.innerHTML = '<tr><td colspan="4" class="submissions-empty">Nothing submitted yet — use the form below.</td></tr>';
        return;
      }
      body.innerHTML = submissions.map(function (s) {
        const badgeClass = STATUS_BADGE_CLASS[s.status] || 'status-planned';
        return '<tr>' +
          '<td>' + escapeHtml(formatDate(s.created_at)) + '</td>' +
          '<td><span class="meta-pill">' + escapeHtml(SERVICE_LABELS[s.service] || s.service) + '</span></td>' +
          '<td class="message-cell">' + escapeHtml(s.message) + '</td>' +
          '<td><span class="status-badge ' + badgeClass + '" style="position:static;">' + escapeHtml(s.status) + '</span></td>' +
          '</tr>';
      }).join('');
    }

    async function loadSubmissions() {
      if (body) body.innerHTML = '<tr><td colspan="4" class="submissions-loading">Loading…</td></tr>';
      const { data, error } = await window.EemmicDB.fetchOwnSubmissions();

      if (error) {
        console.error('Failed to load submissions:', error);
        if (body) body.innerHTML = '<tr><td colspan="4" class="submissions-empty">Could not load your submissions.</td></tr>';
        return;
      }
      updateStats(data || []);
      render(data || []);
    }

    const form = document.getElementById('requirementForm');
    if (form) {
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
        submitBtn.innerHTML = 'Submitting…';

        const payload = {
          sector: 'EEMMIC',
          service: document.getElementById('service').value,
          name: (profile && profile.name) || session.user.email,
          email: session.user.email,
          organisation: (profile && profile.organisation) || '',
          message: document.getElementById('message').value.trim()
        };

        fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token
          },
          body: JSON.stringify(payload)
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (!result.ok) throw new Error(result.data.error || 'Submission failed.');
            const successBox = document.getElementById('formSuccess');
            if (successBox) successBox.classList.add('show');
            form.reset();
            loadSubmissions();
          })
          .catch(function (err) {
            errorBox.textContent = err.message || 'Something went wrong. Please try again.';
            errorBox.style.display = 'block';
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML = original;
          });
      });
    }

    loadSubmissions();
  });
})();
