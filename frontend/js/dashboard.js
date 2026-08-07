/* Admin "Overview" page: aggregate stats, enquiries-by-status donut,
   services-per-framework bar, portal health snapshot, recent activity —
   all derived client-side from the existing list endpoints (no dedicated
   /overview endpoint; the same pattern dashboard.js always used). */
(function () {
  const W = window.EemmicWidgets;
  const SERVICE_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;

    // Each section only needs part of this data — fetch independently
    // (Promise.allSettled, not .all) so one failing endpoint (e.g. a table
    // that isn't migrated yet) doesn't blank out sections that don't need it.
    Promise.allSettled([
      W.apiFetch('/api/submissions', { token: token }),
      W.apiFetch('/api/clients', { token: token }),
      W.apiFetch('/api/portal-dashboards', { token: token })
    ]).then(function (results) {
      const submissionsResult = results[0];
      const clientsResult = results[1];
      const dashboardsResult = results[2];

      const submissions = submissionsResult.status === 'fulfilled' ? (submissionsResult.value.submissions || []) : null;
      const clients = clientsResult.status === 'fulfilled' ? (clientsResult.value.clients || []) : null;
      const services = clientsResult.status === 'fulfilled' ? (clientsResult.value.services || []) : null;
      const dashboards = dashboardsResult.status === 'fulfilled' ? (dashboardsResult.value.dashboards || []) : null;

      if (submissions === null && clients === null && dashboards === null) {
        document.getElementById('overviewStats').innerHTML = '<p class="portal-empty">Could not load the overview — check the backend/database connection.</p>';
        return;
      }

      renderStats(submissions, clients, services);
      submissions !== null ? renderDonut(submissions) : errorInto('enquiriesDonut', submissionsResult.reason);
      services !== null ? renderBar(services) : errorInto('servicesBar', clientsResult.reason);
      dashboards !== null ? renderHealth(dashboards, clients) : errorInto('healthSnapshot', dashboardsResult.reason);
      submissions !== null ? renderActivity(submissions, dashboards) : errorInto('recentActivity', submissionsResult.reason);
    });

    function errorInto(id, err) {
      document.getElementById(id).innerHTML = '<p class="portal-empty">' + W.escapeHtml((err && err.message) || 'Failed to load.') + '</p>';
    }

    function renderStats(submissions, clients, services) {
      const pending = submissions ? submissions.filter(function (s) { return s.portal_access === 'pending'; }).length : '—';
      const approved = submissions ? submissions.filter(function (s) { return s.portal_access === 'approved'; }).length : '—';
      document.getElementById('overviewStats').innerHTML =
        W.statCard({ label: 'Total Enquiries', value: submissions ? submissions.length : '—', sublabel: pending + ' pending review' }) +
        W.statCard({ label: 'Portal Accounts', value: clients ? clients.length : '—' }) +
        W.statCard({ label: 'Services Linked', value: services ? services.length : '—' }) +
        W.statCard({ label: 'Approved Enquiries', value: approved });
    }

    function renderDonut(submissions) {
      const counts = { none: 0, pending: 0, approved: 0, rejected: 0 };
      submissions.forEach(function (s) { if (counts[s.portal_access] !== undefined) counts[s.portal_access]++; });
      document.getElementById('enquiriesDonut').innerHTML =
        '<div style="display:flex; align-items:center; gap:24px; flex-wrap:wrap;">' +
        W.donutChart([
          { label: 'Pending', value: counts.pending },
          { label: 'Approved', value: counts.approved },
          { label: 'Rejected', value: counts.rejected },
          { label: 'Not reviewed', value: counts.none }
        ], { size: 140 }) +
        '<div style="font-size:0.85rem; color:var(--color-text-muted); display:flex; flex-direction:column; gap:6px;">' +
        '<span>' + W.badge('Pending', 'warning') + ' ' + counts.pending + '</span>' +
        '<span>' + W.badge('Approved', 'success') + ' ' + counts.approved + '</span>' +
        '<span>' + W.badge('Rejected', 'critical') + ' ' + counts.rejected + '</span>' +
        '<span>' + W.badge('Not reviewed', 'default') + ' ' + counts.none + '</span>' +
        '</div></div>';
    }

    function renderBar(services) {
      const counts = { evaluation: 0, management: 0, marketplace: 0, investment: 0 };
      services.forEach(function (s) { if (counts[s.portal_type] !== undefined) counts[s.portal_type]++; });
      document.getElementById('servicesBar').innerHTML = W.barChart(
        Object.keys(counts).map(function (k) { return { label: SERVICE_LABELS[k], value: counts[k] }; })
      );
    }

    function renderHealth(dashboards, clients) {
      const el = document.getElementById('healthSnapshot');
      if (!dashboards.length) {
        el.innerHTML = '<p class="portal-empty">No portal dashboards yet — approve an enquiry to create one.</p>';
        return;
      }
      const clientsById = {};
      clients.forEach(function (c) { clientsById[c.id] = c; });

      el.innerHTML = '<div class="portal-table-wrap"><table class="portal-table"><thead><tr>' +
        '<th>Client</th><th>Portal</th><th>Health</th></tr></thead><tbody>' +
        dashboards.map(function (d) {
          const c = clientsById[d.user_id];
          return '<tr><td>' + W.escapeHtml(c ? (c.name || c.email) : d.user_id) + '</td>' +
            '<td>' + W.badge(SERVICE_LABELS[d.portal_type] || d.portal_type, 'default') + '</td>' +
            '<td><div style="display:flex; align-items:center; gap:10px;">' +
              '<div style="flex:1; height:6px; background:var(--color-surface-2); border-radius:99px; overflow:hidden; max-width:160px;">' +
                '<div style="height:100%; width:' + d.health_score + '%; background:var(--color-secondary);"></div>' +
              '</div><span>' + d.health_score + '</span></div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    function renderActivity(submissions, dashboards) {
      const events = submissions.slice(0, 10).map(function (s) {
        return { title: s.name + ' — ' + (SERVICE_LABELS[s.service] || s.service), detail: s.message, time: s.created_at, type: 'Enquiry' };
      });
      events.sort(function (a, b) { return new Date(b.time) - new Date(a.time); });

      const el = document.getElementById('recentActivity');
      if (!events.length) {
        el.innerHTML = '<p class="portal-empty">No activity yet.</p>';
        return;
      }
      el.innerHTML = events.slice(0, 10).map(function (ev) {
        return '<div class="portal-alert"><span class="portal-alert__body"><strong>' + W.escapeHtml(ev.title) + '</strong><br>' +
          W.escapeHtml((ev.detail || '').slice(0, 120)) + '</span>' +
          '<span style="color:var(--color-text-faint); font-size:0.76rem; flex-shrink:0;">' + W.escapeHtml(W.formatDateTime(ev.time)) + '</span></div>';
      }).join('');
    }
  });
})();
