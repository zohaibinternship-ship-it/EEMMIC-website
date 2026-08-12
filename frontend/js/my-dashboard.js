/* "My Services" landing (my-dashboard.html) — every buyer/supplier/investor
   account lands here after login. Shows granted portal services (linking
   into portal-<framework>.html), pending/rejected application notices, an
   "apply for another service" form, plus the existing submissions/
   investments history. Requires js/db-client.js, js/auth.js,
   js/portal-shell.js (dispatches 'eemmic:portal-ready') first. */
(function () {
  const W = window.EemmicWidgets;
  const SERVICE_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };
  const STATUS_BADGE = { new: 'default', contacted: 'warning', qualified: 'info', closed: 'success' };

  document.addEventListener('eemmic:portal-ready', function (e) {
    const session = e.detail.session;
    const profile = e.detail.profile;
    const token = e.detail.accessToken;

    loadServices();
    loadSubmissions();
    loadInvestments();
    wireForm();

    function loadServices() {
      window.EemmicDB.fetchOwnPortalServices().then(function (result) {
        const services = result.data || [];
        renderNotices();
        renderServicesGrid(services);
      });
    }

    function renderNotices() {
      window.EemmicDB.fetchOwnSubmissions().then(function (result) {
        const submissions = result.data || [];
        const awaiting = submissions.filter(function (s) { return s.portal_access === 'pending' || s.portal_access === 'none'; });
        const rejected = submissions.filter(function (s) { return s.portal_access === 'rejected'; });
        const el = document.getElementById('serviceNotices');
        let html = '';
        awaiting.forEach(function (s) {
          html += '<div class="portal-alert portal-alert--warning" style="border:1px solid var(--color-border); border-radius:var(--radius-md); padding:12px 16px; margin-bottom:8px;">' +
            '<span class="portal-alert__body"><strong>' + W.escapeHtml(SERVICE_LABELS[s.service] || s.service) + ' application awaiting review</strong><br>Submitted ' + W.escapeHtml(W.formatDate(s.created_at)) + '</span></div>';
        });
        rejected.forEach(function (s) {
          html += '<div class="portal-alert portal-alert--critical" style="border:1px solid var(--color-border); border-radius:var(--radius-md); padding:12px 16px; margin-bottom:8px;">' +
            '<span class="portal-alert__body"><strong>' + W.escapeHtml(SERVICE_LABELS[s.service] || s.service) + ' application declined</strong><br>' + W.escapeHtml(s.rejection_reason || '') + '</span></div>';
        });
        el.innerHTML = html;
      });
    }

    function renderServicesGrid(services) {
      const grid = document.getElementById('servicesGrid');
      if (!services.length) {
        grid.innerHTML = '<p class="portal-empty">No portal services yet — apply below, an admin will review it.</p>';
        return;
      }
      grid.innerHTML = services.map(function (s) {
        return '<a href="/portal-' + s.portal_type + '" class="portal-card" style="display:block; text-decoration:none;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
            W.badge(SERVICE_LABELS[s.portal_type] || s.portal_type, 'default') +
            (s.is_primary ? W.badge('Primary', 'success') : '') +
          '</div>' +
          '<div style="font-weight:700; color:var(--color-text);">' + SERVICE_LABELS[s.portal_type] + ' Portal</div>' +
          '<div style="color:var(--color-secondary); font-size:0.86rem; margin-top:8px;">Open &rarr;</div>' +
          '</a>';
      }).join('');
    }

    function loadSubmissions() {
      const body = document.getElementById('submissionsBody');
      window.EemmicDB.fetchOwnSubmissions().then(function (result) {
        const submissions = result.data || [];
        if (!submissions.length) { body.innerHTML = '<tr><td colspan="4" class="portal-empty">Nothing submitted yet.</td></tr>'; return; }
        body.innerHTML = submissions.map(function (s) {
          return '<tr>' +
            '<td>' + W.escapeHtml(W.formatDate(s.created_at)) + '</td>' +
            '<td>' + W.badge(SERVICE_LABELS[s.service] || s.service, 'default') + '</td>' +
            '<td>' + W.escapeHtml(s.message) + '</td>' +
            '<td>' + W.badge(s.status, STATUS_BADGE[s.status] || 'default') + '</td>' +
            '</tr>';
        }).join('');
      });
    }

    function loadInvestments() {
      const body = document.getElementById('investmentsBody');
      const statsRow = document.getElementById('investStatsRow');
      window.EemmicDB.fetchOwnInvestments().then(function (result) {
        const investments = result.data || [];
        if (!investments.length) {
          body.innerHTML = '<tr><td colspan="5" class="portal-empty">No investments recorded yet.</td></tr>';
          statsRow.innerHTML = '';
          return;
        }
        let totalInvested = 0, totalPL = 0;
        body.innerHTML = investments.map(function (inv) {
          const entries = inv.eemmic_investment_entries || [];
          const pl = entries.reduce(function (s, en) { return s + Number(en.amount); }, 0);
          totalInvested += Number(inv.amount);
          totalPL += pl;
          return '<tr>' +
            '<td>' + W.escapeHtml(inv.company) + '</td>' +
            '<td>' + W.escapeHtml(W.formatMoney(inv.amount, inv.currency)) + '</td>' +
            '<td>' + W.escapeHtml(W.formatDate(inv.invested_at)) + '</td>' +
            '<td>' + W.badge(inv.status, inv.status === 'active' ? 'success' : 'default') + '</td>' +
            '<td>' + W.badge((pl >= 0 ? '+' : '') + W.formatMoney(pl, inv.currency), pl >= 0 ? 'success' : 'critical') + '</td>' +
            '</tr>';
        }).join('');
        statsRow.innerHTML =
          W.statCard({ label: 'Total Invested', value: W.formatMoney(totalInvested, investments[0].currency) }) +
          W.statCard({ label: 'Total P&L', value: (totalPL >= 0 ? '+' : '') + W.formatMoney(totalPL, investments[0].currency) });
      });
    }

    function wireForm() {
      const form = document.getElementById('requirementForm');
      if (!form) return;
      let errorBox = form.querySelector('.form-error');
      if (!errorBox) {
        errorBox = document.createElement('p');
        errorBox.className = 'form-error';
        errorBox.style.display = 'none';
        form.querySelector('button[type="submit"]').insertAdjacentElement('beforebegin', errorBox);
      }

      form.addEventListener('submit', function (evt) {
        evt.preventDefault();
        errorBox.style.display = 'none';
        const submitBtn = form.querySelector('button[type="submit"]');
        const original = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Submitting…';

        W.apiFetch('/api/submissions', {
          method: 'POST', token: token,
          body: {
            sector: 'EEMMIC',
            service: document.getElementById('service').value,
            name: (profile && profile.name) || session.user.email,
            email: session.user.email,
            organisation: (profile && profile.organisation) || '',
            message: document.getElementById('message').value.trim()
          }
        }).then(function () {
          document.getElementById('formSuccess').classList.add('show');
          form.reset();
          loadServices();
          loadSubmissions();
        }).catch(function (err) {
          errorBox.textContent = err.message || 'Something went wrong. Please try again.';
          errorBox.style.display = 'block';
        }).finally(function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML = original;
        });
      });
    }
  });
})();
