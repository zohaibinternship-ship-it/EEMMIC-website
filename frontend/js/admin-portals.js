/* Admin "Portal Dashboards" list — links out to admin-portal-detail.html
   for the full health/timeline/alerts/actions/messages editor. */
(function () {
  const W = window.EemmicWidgets;
  const SERVICE_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;
    const body = document.getElementById('portalsBody');

    Promise.all([
      W.apiFetch('/api/portal-dashboards', { token: token }),
      W.apiFetch('/api/clients', { token: token })
    ]).then(function (results) {
      const dashboards = results[0].dashboards || [];
      const clientsById = {};
      (results[1].clients || []).forEach(function (c) { clientsById[c.id] = c; });

      if (!dashboards.length) {
        body.innerHTML = '<tr><td colspan="5" class="portal-empty">No portal dashboards yet — approve an enquiry to create one.</td></tr>';
        return;
      }

      body.innerHTML = dashboards.map(function (d) {
        const c = clientsById[d.user_id];
        const detailUrl = '/admin-portal-detail?user=' + encodeURIComponent(d.user_id) + '&portal=' + encodeURIComponent(d.portal_type);
        return '<tr>' +
          '<td>' + W.escapeHtml(c ? (c.name || c.email) : d.user_id) + '</td>' +
          '<td>' + W.badge(SERVICE_LABELS[d.portal_type] || d.portal_type, 'default') + '</td>' +
          '<td>' + d.health_score + '</td>' +
          '<td>' + W.escapeHtml(W.formatDate(d.updated_at)) + '</td>' +
          '<td><a href="' + detailUrl + '" class="btn btn-outline btn-sm">Manage</a></td>' +
          '</tr>';
      }).join('');
    }).catch(function (err) {
      body.innerHTML = '<tr><td colspan="5" class="portal-empty">' + W.escapeHtml(err.message || 'Failed to load dashboards.') + '</td></tr>';
    });
  });
})();
