/* Admin "Client Enquiries" page: the pipeline status (new/contacted/
   qualified/closed) from before, plus the new portal_access approval
   workflow (approve into a client portal account, or reject with a reason). */
(function () {
  const W = window.EemmicWidgets;
  const SERVICE_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };
  const PIPELINE_STATUSES = ['new', 'contacted', 'qualified', 'closed'];
  const PIPELINE_BADGE = { new: 'default', contacted: 'warning', qualified: 'info', closed: 'success' };
  const ACCESS_BADGE = { none: 'default', pending: 'warning', approved: 'success', rejected: 'critical' };

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;
    const body = document.getElementById('enquiriesBody');
    const statsEl = document.getElementById('enquiryStats');
    const filterBar = document.getElementById('accessFilters');
    const refreshBtn = document.getElementById('refreshBtn');

    let enquiries = [];
    let activeFilter = 'all';
    let openRowId = null;

    function updateStats() {
      const counts = { none: 0, pending: 0, approved: 0, rejected: 0 };
      enquiries.forEach(function (s) { if (counts[s.portal_access] !== undefined) counts[s.portal_access]++; });
      statsEl.innerHTML =
        W.statCard({ label: 'Total', value: enquiries.length }) +
        W.statCard({ label: 'Pending', value: counts.pending }) +
        W.statCard({ label: 'Approved', value: counts.approved }) +
        W.statCard({ label: 'Rejected', value: counts.rejected });
    }

    function pipelineSelect(s) {
      return '<select class="status-select" data-id="' + s.id + '">' +
        PIPELINE_STATUSES.map(function (st) {
          return '<option value="' + st + '"' + (st === s.status ? ' selected' : '') + '>' + st + '</option>';
        }).join('') + '</select>';
    }

    function actionsCell(s) {
      if (s.portal_access === 'approved') return '<span style="color:var(--color-text-faint); font-size:0.8rem;">Approved ' + W.escapeHtml(W.formatDate(s.approved_at)) + '</span>';
      if (s.portal_access === 'rejected') return '<span style="color:var(--color-text-faint); font-size:0.8rem;" title="' + W.escapeHtml(s.rejection_reason || '') + '">Rejected</span>';
      return '<button type="button" class="btn btn-outline btn-sm review-btn" data-id="' + s.id + '">Review</button>';
    }

    function reviewPanel(s) {
      return '<tr class="review-panel" data-panel-for="' + s.id + '"><td colspan="8">' +
        '<div class="portal-card" style="margin:6px 0;">' +
          '<div style="display:flex; gap:24px; flex-wrap:wrap; align-items:flex-end;">' +
            '<div class="field" style="margin:0;"><label>Grant portal</label>' +
              '<select class="approve-portal-type">' +
                Object.keys(SERVICE_LABELS).map(function (k) {
                  return '<option value="' + k + '"' + (k === s.service ? ' selected' : '') + '>' + SERVICE_LABELS[k] + '</option>';
                }).join('') +
              '</select></div>' +
            '<label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--color-text-muted);">' +
              '<input type="checkbox" class="approve-send-credentials" checked> Send credentials if no account exists</label>' +
            '<button type="button" class="btn btn-primary btn-sm approve-btn" data-id="' + s.id + '">Approve &amp; Grant Access</button>' +
          '</div>' +
          '<div style="display:flex; gap:12px; margin-top:16px; align-items:flex-end; flex-wrap:wrap;">' +
            '<div class="field" style="margin:0; flex:1; min-width:220px;"><label>Rejection reason</label>' +
              '<input type="text" class="reject-reason" placeholder="Why isn\'t this a fit?"></div>' +
            '<button type="button" class="btn btn-outline btn-sm reject-btn" data-id="' + s.id + '">Reject</button>' +
          '</div>' +
          '<p class="form-error reject-error" style="display:none; margin-top:10px;"></p>' +
        '</div></td></tr>';
    }

    function render() {
      const visible = activeFilter === 'all' ? enquiries : enquiries.filter(function (s) { return s.portal_access === activeFilter; });
      if (!visible.length) {
        body.innerHTML = '<tr><td colspan="8" class="portal-empty">No enquiries here.</td></tr>';
        return;
      }
      body.innerHTML = visible.map(function (s) {
        const row = '<tr data-id="' + s.id + '">' +
          '<td>' + W.escapeHtml(W.formatDateTime(s.created_at)) + '</td>' +
          '<td>' + W.escapeHtml(s.name) + (s.organisation ? '<br><span style="color:var(--color-text-faint); font-size:0.78rem;">' + W.escapeHtml(s.organisation) + '</span>' : '') + '</td>' +
          '<td>' + W.badge(SERVICE_LABELS[s.service] || s.service, 'default') + '</td>' +
          '<td><a href="mailto:' + W.escapeHtml(s.email) + '">' + W.escapeHtml(s.email) + '</a></td>' +
          '<td style="max-width:260px;">' + W.escapeHtml((s.message || '').slice(0, 140)) + '</td>' +
          '<td>' + pipelineSelect(s) + '</td>' +
          '<td>' + W.badge(s.portal_access, ACCESS_BADGE[s.portal_access] || 'default') + '</td>' +
          '<td>' + actionsCell(s) + '</td>' +
          '</tr>';
        return row + (openRowId === s.id ? reviewPanel(s) : '');
      }).join('');
    }

    function load() {
      body.innerHTML = '<tr><td colspan="8" class="portal-empty">Loading enquiries…</td></tr>';
      W.apiFetch('/api/submissions', { token: token }).then(function (data) {
        enquiries = data.submissions || [];
        updateStats();
        render();
      }).catch(function (err) {
        body.innerHTML = '<tr><td colspan="8" class="portal-empty">' + W.escapeHtml(err.message || 'Failed to load enquiries.') + '</td></tr>';
      });
    }

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
    if (refreshBtn) refreshBtn.addEventListener('click', load);

    body.addEventListener('change', function (e) {
      const select = e.target.closest('.status-select');
      if (!select) return;
      const id = select.getAttribute('data-id');
      W.apiFetch('/api/submissions/' + encodeURIComponent(id) + '/status', { method: 'PATCH', token: token, body: { status: select.value } })
        .then(function () {
          const s = enquiries.find(function (item) { return item.id === id; });
          if (s) s.status = select.value;
        })
        .catch(function (err) { alert(err.message || 'Failed to update status.'); load(); });
    });

    body.addEventListener('click', function (e) {
      const reviewBtn = e.target.closest('.review-btn');
      if (reviewBtn) {
        openRowId = openRowId === reviewBtn.getAttribute('data-id') ? null : reviewBtn.getAttribute('data-id');
        render();
        return;
      }

      const approveBtn = e.target.closest('.approve-btn');
      if (approveBtn) {
        const id = approveBtn.getAttribute('data-id');
        const panel = approveBtn.closest('.portal-card');
        const portalType = panel.querySelector('.approve-portal-type').value;
        const sendCredentials = panel.querySelector('.approve-send-credentials').checked;
        approveBtn.disabled = true;
        approveBtn.textContent = 'Approving…';
        W.apiFetch('/api/submissions/' + encodeURIComponent(id) + '/approve', {
          method: 'POST', token: token, body: { portalType: portalType, sendCredentials: sendCredentials }
        }).then(function () {
          openRowId = null;
          load();
        }).catch(function (err) {
          approveBtn.disabled = false;
          approveBtn.textContent = 'Approve & Grant Access';
          alert(err.message || 'Failed to approve enquiry.');
        });
        return;
      }

      const rejectBtn = e.target.closest('.reject-btn');
      if (rejectBtn) {
        const id = rejectBtn.getAttribute('data-id');
        const panel = rejectBtn.closest('.portal-card');
        const reason = panel.querySelector('.reject-reason').value.trim();
        const errorEl = panel.querySelector('.reject-error');
        if (reason.length < 5) {
          errorEl.textContent = 'Give a reason of at least 5 characters.';
          errorEl.style.display = 'block';
          return;
        }
        rejectBtn.disabled = true;
        W.apiFetch('/api/submissions/' + encodeURIComponent(id) + '/reject', { method: 'POST', token: token, body: { reason: reason } })
          .then(function () {
            openRowId = null;
            load();
          }).catch(function (err) {
            rejectBtn.disabled = false;
            errorEl.textContent = err.message || 'Failed to reject enquiry.';
            errorEl.style.display = 'block';
          });
      }
    });

    load();
  });
})();
