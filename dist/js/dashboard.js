/* Submissions dashboard: fetches /api/submissions, renders the table, and
   lets an operator update each submission's follow-up status. */
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
    qualified: 'status-planned',
    closed: 'status-closed'
  };

  const STATUSES = ['new', 'contacted', 'qualified', 'closed'];

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const body = document.getElementById('submissionsBody');
    const refreshBtn = document.getElementById('refreshBtn');
    const filterBar = document.getElementById('statusFilters');
    if (!body) return;

    const auth = await window.EemmicAuth.requireAdmin();
    if (!auth) return; // already redirected (no session -> login.html, non-admin -> my-dashboard.html)
    let accessToken = auth.session.access_token;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', function () { window.EemmicAuth.logout(); });

    let submissions = [];
    let activeFilter = 'all';

    function updateStats() {
      const counts = { new: 0, contacted: 0, qualified: 0, closed: 0 };
      submissions.forEach(function (s) { if (counts[s.status] !== undefined) counts[s.status]++; });
      const setText = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setText('statTotal', submissions.length);
      setText('statNew', counts.new);
      setText('statContacted', counts.contacted);
      setText('statQualified', counts.qualified);
      setText('statClosed', counts.closed);
    }

    function statusOptionsHtml(current) {
      return STATUSES.map(function (s) {
        return '<option value="' + s + '"' + (s === current ? ' selected' : '') + '>' +
          s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
      }).join('');
    }

    function renderRow(s) {
      const badgeClass = STATUS_BADGE_CLASS[s.status] || 'status-planned';
      const tr = document.createElement('tr');
      tr.dataset.status = s.status;
      tr.innerHTML =
        '<td>' + escapeHtml(formatDate(s.created_at)) + '</td>' +
        '<td>' + escapeHtml(s.name) + '</td>' +
        '<td>' + escapeHtml(s.organisation || '—') + '</td>' +
        '<td><span class="meta-pill">' + escapeHtml(SERVICE_LABELS[s.service] || s.service) + '</span></td>' +
        '<td class="contact-cell">' +
          '<a href="mailto:' + escapeHtml(s.email) + '">' + escapeHtml(s.email) + '</a>' +
          (s.phone ? '<a href="tel:' + escapeHtml(s.phone) + '">' + escapeHtml(s.phone) + '</a>' : '') +
        '</td>' +
        '<td class="message-cell">' + escapeHtml(s.message) + '</td>' +
        '<td>' +
          '<span class="status-badge ' + badgeClass + '" style="position:static; margin-bottom:6px;">' + escapeHtml(s.status) + '</span>' +
          '<select class="status-select" data-id="' + escapeHtml(s.id) + '">' + statusOptionsHtml(s.status) + '</select>' +
        '</td>';
      return tr;
    }

    function render() {
      body.innerHTML = '';
      const visible = activeFilter === 'all' ? submissions : submissions.filter(function (s) { return s.status === activeFilter; });

      if (!visible.length) {
        body.innerHTML = '<tr><td colspan="7" class="submissions-empty">No submissions' +
          (activeFilter === 'all' ? '' : ' with status "' + escapeHtml(activeFilter) + '"') + ' yet.</td></tr>';
        return;
      }

      visible.forEach(function (s) { body.appendChild(renderRow(s)); });
    }

    function loadSubmissions() {
      body.innerHTML = '<tr><td colspan="7" class="submissions-loading">Loading submissions…</td></tr>';
      fetch('/api/submissions', { headers: { 'Authorization': 'Bearer ' + accessToken } })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) throw new Error(result.data.error || 'Failed to load submissions.');
          submissions = result.data.submissions || [];
          updateStats();
          render();
        })
        .catch(function (err) {
          body.innerHTML = '<tr><td colspan="7" class="submissions-empty">' + escapeHtml(err.message || 'Failed to load submissions.') + '</td></tr>';
          console.error('Failed to load submissions:', err);
        });
    }

    body.addEventListener('change', function (e) {
      const select = e.target.closest('.status-select');
      if (!select) return;
      const id = select.getAttribute('data-id');
      const newStatus = select.value;
      const previous = (submissions.find(function (s) { return s.id === id; }) || {}).status;

      select.disabled = true;
      fetch('/api/submissions/' + encodeURIComponent(id) + '/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify({ status: newStatus })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) throw new Error(result.data.error || 'Failed to update status.');
          const s = submissions.find(function (item) { return item.id === id; });
          if (s) s.status = newStatus;
          updateStats();
          render();
        })
        .catch(function (err) {
          select.value = previous;
          select.disabled = false;
          console.error('Failed to update submission status:', err);
          alert(err.message || 'Failed to update status.');
        });
    });

    if (filterBar) {
      filterBar.querySelectorAll('.filter-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          filterBar.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active'); });
          chip.classList.add('active');
          activeFilter = chip.getAttribute('data-filter');
          render();
        });
      });
    }

    if (refreshBtn) refreshBtn.addEventListener('click', loadSubmissions);

    loadSubmissions();
  });
})();
