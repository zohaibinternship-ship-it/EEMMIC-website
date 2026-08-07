/* Shared controller for every client framework-portal page
   (portal-evaluation*.html, portal-management*.html, portal-marketplace*.html,
   portal-investment*.html). One file drives all ~19 pages via two body
   attributes:
     data-portal-type="evaluation|management|marketplace|investment"
     data-portal-view="dashboard|status|reports|operations|projects|
                        market|listings|documents|messages|settings"
   The "Command Center" (status timeline / health ring / alert ticker) is
   shared verbatim across every framework's dashboard view, matching the
   reference structure this was modelled on. Framework-specific widgets read
   from eemmic_portal_dashboards.data (a JSON blob edited by admins on
   admin-portal-detail.html) — except investment, which instead reads the
   real eemmic_investments/_entries tables, since EEMMIC already has proper
   relational data for that rather than a generic blob. */
(function () {
  const W = window.EemmicWidgets;
  const FRAMEWORK_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;
    const portalType = document.body.getAttribute('data-portal-type');
    const view = document.body.getAttribute('data-portal-view') || 'dashboard';
    const main = document.getElementById('mainContent');

    if (view === 'settings') return renderSettings();

    W.apiFetch('/api/portal-dashboards/me/' + portalType, { token: token })
      .then(function (result) { renderView(result); })
      .catch(function (err) {
        main.innerHTML = '<p class="portal-empty">' + W.escapeHtml(err.message || 'Failed to load your portal.') + '</p>';
      });

    function renderView(result) {
      const dashboard = result.dashboard;
      if (!dashboard) {
        main.innerHTML = '<p class="portal-empty">Your ' + FRAMEWORK_LABELS[portalType] + ' portal is being set up — check back shortly.</p>';
        return;
      }
      const data = dashboard.data || {};

      if (view === 'dashboard') renderCommandCenter(dashboard, result.alerts);
      if (view === 'messages') return renderMessages(result.messages);

      const widgetsEl = document.getElementById('frameworkWidgets');
      if (!widgetsEl) return;

      if (portalType === 'investment') {
        renderInvestmentWidgets(widgetsEl, view);
        return;
      }

      if (portalType === 'evaluation') renderEvaluation(widgetsEl, view, data, result.actions);
      else if (portalType === 'management') renderManagement(widgetsEl, view, data, result.actions);
      else if (portalType === 'marketplace') renderMarketplace(widgetsEl, view, data);
    }

    function renderCommandCenter(dashboard, alerts) {
      const timelineEl = document.getElementById('ccTimeline');
      const healthEl = document.getElementById('ccHealth');
      const alertsEl = document.getElementById('ccAlerts');
      if (timelineEl) timelineEl.innerHTML = W.statusTimeline(dashboard.timeline || []);
      if (healthEl) {
        healthEl.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:10px;';
        wrap.innerHTML = W.healthRing(dashboard.health_score, 110);
        const comps = dashboard.health_components || {};
        Object.keys(comps).forEach(function (k) {
          const row = document.createElement('div');
          row.style.cssText = 'font-size:0.78rem; color:var(--color-text-muted); display:flex; justify-content:space-between; width:100%;';
          row.innerHTML = '<span>' + W.escapeHtml(k) + '</span><span>' + W.escapeHtml(comps[k]) + '</span>';
          wrap.appendChild(row);
        });
        healthEl.appendChild(wrap);
      }
      if (alertsEl) {
        alertsEl.innerHTML = '';
        alertsEl.appendChild(W.alertTicker(alerts, function (id) {
          W.apiFetch('/api/portal-dashboards/me/' + portalType + '/alerts/' + encodeURIComponent(id) + '/read', { method: 'PATCH', token: token })
            .then(function () { W.apiFetch('/api/portal-dashboards/me/' + portalType, { token: token }).then(renderView); });
        }));
      }
    }

    function renderMessages(messages) {
      const el = document.getElementById('frameworkWidgets') || main;
      el.innerHTML = '';
      el.appendChild(W.messagesThread(messages, function (payload, form) {
        W.apiFetch('/api/portal-dashboards/me/' + portalType + '/messages', { method: 'POST', token: token, body: payload })
          .then(function () {
            form.reset();
            W.apiFetch('/api/portal-dashboards/me/' + portalType, { token: token }).then(function (r) { renderMessages(r.messages); });
          }).catch(function (err) { alert(err.message); });
      }));
    }

    function card(title, innerHtml) {
      return '<div class="portal-card"><div class="portal-card__head"><h3>' + title + '</h3></div>' + innerHtml + '</div>';
    }

    function riskMetricsHtml(metrics) {
      if (!metrics || !metrics.length) return '<p class="portal-empty">No risk metrics yet.</p>';
      return '<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Metric</th><th>Value</th><th>Target</th><th>Status</th></tr></thead><tbody>' +
        metrics.map(function (m) {
          return '<tr><td>' + W.escapeHtml(m.label) + '</td><td>' + W.escapeHtml(m.value) + (m.unit || '') + '</td><td>' + W.escapeHtml(m.target) + (m.unit || '') + '</td>' +
            '<td>' + W.badge(m.status || 'n/a', m.status === 'healthy' ? 'success' : m.status === 'high' ? 'critical' : 'warning') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    function dataRoomHtml(room) {
      if (!room) return '<p class="portal-empty">No documents yet.</p>';
      const docs = room.documents || [];
      return '<div class="portal-grid portal-grid--4" style="margin-bottom:14px;">' +
        W.statCard({ label: 'Total', value: room.total || docs.length }) +
        W.statCard({ label: 'Approved', value: room.approved || 0 }) +
        W.statCard({ label: 'Reviewed', value: room.reviewed || 0 }) +
        W.statCard({ label: 'Missing', value: room.missing || 0 }) +
        '</div>' +
        (docs.length ? '<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Document</th><th>Category</th><th>Status</th></tr></thead><tbody>' +
          docs.map(function (d) { return '<tr><td>' + W.escapeHtml(d.name) + '</td><td>' + W.escapeHtml(d.category || '—') + '</td><td>' + W.badge(d.status || 'pending', d.status === 'approved' ? 'success' : 'default') + '</td></tr>'; }).join('') +
          '</tbody></table></div>' : '<p class="portal-empty">No documents listed yet.</p>');
    }

    function renderEvaluation(el, view, data, actions) {
      const valuations = data.valuations || [];
      const valuationsHtml = card('Valuations', valuations.length
        ? W.barChart(valuations.map(function (v) { return { label: v.label || v.method, value: v.mid || v.high || 0 }; }))
        : '<p class="portal-empty">No valuation data yet.</p>');
      const riskHtml = card('Risk metrics', riskMetricsHtml(data.risk_metrics));
      const dataRoomHtmlBlock = card('Data room', dataRoomHtml(data.data_room));

      if (view === 'dashboard') el.innerHTML = '<div class="portal-grid portal-grid--2">' + valuationsHtml + riskHtml + '</div><div style="margin-top:20px;">' + dataRoomHtmlBlock + '</div>';
      else if (view === 'status') el.innerHTML = riskHtml + '<div style="margin-top:20px;">' + dataRoomHtmlBlock + '</div>';
      else if (view === 'reports') el.innerHTML = '<div class="portal-grid portal-grid--2">' + valuationsHtml + riskHtml + '</div>';
    }

    function renderManagement(el, view, data, actions) {
      const kpis = data.kpis || [];
      const kpisHtml = card('KPIs', kpis.length
        ? '<div class="portal-grid portal-grid--3">' + kpis.map(function (k) {
            return '<div class="portal-stat-card"><div class="portal-stat-card__label">' + W.escapeHtml(k.label) + '</div>' +
              '<div class="portal-stat-card__value">' + W.escapeHtml(k.current) + (k.unit || '') + '</div>' +
              '<div class="portal-stat-card__sub">Target: ' + W.escapeHtml(k.target) + (k.unit || '') + '</div></div>';
          }).join('') + '</div>'
        : '<p class="portal-empty">No KPIs yet.</p>');
      const notes = data.advisory_notes || [];
      const notesHtml = card('Advisory notes', notes.length
        ? notes.map(function (n) { return '<div style="padding:12px 0; border-bottom:1px solid var(--color-border);"><strong>' + W.escapeHtml(n.title) + '</strong>' +
            '<div style="color:var(--color-text-faint); font-size:0.78rem; margin:4px 0;">' + W.escapeHtml(n.author || '') + ' &middot; ' + W.escapeHtml(W.formatDate(n.created_at)) + '</div>' +
            '<p style="color:var(--color-text-muted); font-size:0.86rem;">' + W.escapeHtml(n.content) + '</p></div>'; }).join('')
        : '<p class="portal-empty">No advisory notes yet.</p>');
      const boardHtml = card('Action board', '<div id="mgmtBoard"></div>');

      if (view === 'dashboard') el.innerHTML = kpisHtml;
      else if (view === 'operations') el.innerHTML = kpisHtml;
      else if (view === 'projects') { el.innerHTML = notesHtml + '<div style="margin-top:20px;">' + boardHtml + '</div>'; mountBoard(actions); }

      function mountBoard(actionsList) {
        const boardEl = document.getElementById('mgmtBoard');
        if (!boardEl) return;
        boardEl.appendChild(W.kanbanBoard(actionsList, function (id, column) {
          W.apiFetch('/api/portal-dashboards/me/' + portalType + '/actions/' + encodeURIComponent(id) + '/move', { method: 'PATCH', token: token, body: { column: column } })
            .then(function () { W.apiFetch('/api/portal-dashboards/me/' + portalType, { token: token }).then(renderView); });
        }));
      }
    }

    function renderMarketplace(el, view, data) {
      const traffic = data.traffic || [];
      const trafficHtml = card('Buyer traffic', traffic.length
        ? W.barChart(traffic.map(function (t) { return { label: t.date, value: t.views || 0 }; }))
        : '<p class="portal-empty">No traffic data yet.</p>');
      const pipeline = data.pipeline || [];
      const pipelineHtml = card('Deal pipeline', pipeline.length
        ? pipeline.map(function (p) { return '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--color-border); font-size:0.86rem;">' +
            '<span>' + W.escapeHtml(p.stage) + '</span><span>' + W.escapeHtml(p.value || 0) + ' deals &middot; ' + W.escapeHtml(W.formatMoney(p.amount, 'PKR')) + '</span></div>'; }).join('')
        : '<p class="portal-empty">No pipeline data yet.</p>');
      const listings = data.listings || [];
      const listingsHtml = card('Listings', listings.length
        ? '<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Title</th><th>Category</th><th>Views</th><th>Enquiries</th><th>Status</th></tr></thead><tbody>' +
          listings.map(function (l) { return '<tr><td>' + W.escapeHtml(l.title) + '</td><td>' + W.escapeHtml(l.category || '—') + '</td><td>' + W.escapeHtml(l.views || 0) + '</td><td>' + W.escapeHtml(l.inquiries || 0) + '</td><td>' + W.badge(l.status || 'active', 'default') + '</td></tr>'; }).join('') +
          '</tbody></table></div>'
        : '<p class="portal-empty">No listings yet.</p>');

      if (view === 'dashboard') el.innerHTML = '<div class="portal-grid portal-grid--2">' + trafficHtml + pipelineHtml + '</div>';
      else if (view === 'market') el.innerHTML = '<div class="portal-grid portal-grid--2">' + trafficHtml + pipelineHtml + '</div>';
      else if (view === 'listings') el.innerHTML = listingsHtml;
    }

    function renderInvestmentWidgets(el, view) {
      window.EemmicDB.fetchOwnInvestments().then(function (result) {
        const investments = result.data || [];
        if (!investments.length) { el.innerHTML = '<p class="portal-empty">No investments recorded yet.</p>'; return; }

        el.innerHTML = '<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Company</th><th>Amount</th><th>Date</th><th>Status</th><th>P&amp;L</th>' +
          (view === 'documents' ? '<th>Entries</th>' : '') + '</tr></thead><tbody>' +
          investments.map(function (inv) {
            const entries = inv.eemmic_investment_entries || [];
            const pl = entries.reduce(function (s, en) { return s + Number(en.amount); }, 0);
            return '<tr><td>' + W.escapeHtml(inv.company) + '</td><td>' + W.escapeHtml(W.formatMoney(inv.amount, inv.currency)) + '</td>' +
              '<td>' + W.escapeHtml(W.formatDate(inv.invested_at)) + '</td><td>' + W.badge(inv.status, inv.status === 'active' ? 'success' : 'default') + '</td>' +
              '<td>' + W.badge((pl >= 0 ? '+' : '') + W.formatMoney(pl, inv.currency), pl >= 0 ? 'success' : 'critical') + '</td>' +
              (view === 'documents' ? '<td>' + entries.map(function (en) { return W.escapeHtml(W.formatDate(en.entry_date)) + ': ' + (en.amount >= 0 ? '+' : '') + en.amount + (en.note ? ' (' + W.escapeHtml(en.note) + ')' : ''); }).join('<br>') + '</td>' : '') +
              '</tr>';
          }).join('') + '</tbody></table></div>';
      });
    }

    function renderSettings() {
      window.EemmicAuth.requireSession().then(function (result) {
        if (!result) return;
        main.innerHTML =
          '<div class="portal-grid portal-grid--2">' +
          '<div class="portal-card"><div class="portal-card__head"><h3>Profile</h3></div>' +
            '<div class="field"><label>Full name</label><input type="text" id="settingsName" value="' + W.escapeHtml(result.profile.name || '') + '"></div>' +
            '<div class="field"><label>Email</label><input type="email" value="' + W.escapeHtml(result.session.user.email) + '" disabled></div>' +
            '<p class="form-error" id="profileError" style="display:none;"></p>' +
            '<button type="button" class="btn btn-primary btn-sm" id="saveProfileBtn">Save Profile</button>' +
          '</div>' +
          '<div class="portal-card"><div class="portal-card__head"><h3>Change password</h3></div>' +
            '<div class="field"><label>New password</label><input type="password" id="newPassword" minlength="6"></div>' +
            '<div class="field"><label>Confirm password</label><input type="password" id="confirmPassword" minlength="6"></div>' +
            '<p class="form-error" id="passwordError" style="display:none;"></p>' +
            '<button type="button" class="btn btn-primary btn-sm" id="savePasswordBtn">Update Password</button>' +
          '</div></div>';

        document.getElementById('saveProfileBtn').addEventListener('click', function (evt) {
          const errorEl = document.getElementById('profileError');
          errorEl.style.display = 'none';
          evt.target.disabled = true;
          window.EemmicDB.updateOwnProfile({ name: document.getElementById('settingsName').value.trim() })
            .then(function (r) {
              if (r.error) throw r.error;
            }).catch(function (err) { errorEl.textContent = err.message || 'Failed to save.'; errorEl.style.display = 'block'; })
            .finally(function () { evt.target.disabled = false; });
        });

        document.getElementById('savePasswordBtn').addEventListener('click', function (evt) {
          const errorEl = document.getElementById('passwordError');
          errorEl.style.display = 'none';
          const pw = document.getElementById('newPassword').value;
          const confirm = document.getElementById('confirmPassword').value;
          if (pw.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; errorEl.style.display = 'block'; return; }
          if (pw !== confirm) { errorEl.textContent = 'Passwords do not match.'; errorEl.style.display = 'block'; return; }
          evt.target.disabled = true;
          window.EemmicDB.setPassword(pw).then(function (r) {
            if (r.error) throw r.error;
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
          }).catch(function (err) { errorEl.textContent = err.message || 'Failed to update password.'; errorEl.style.display = 'block'; })
            .finally(function () { evt.target.disabled = false; });
        });
      });
    }
  });
})();
