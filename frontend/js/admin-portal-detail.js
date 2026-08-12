/* Admin "Manage Portal" (admin-portal-detail.html?user=&portal=) — the full
   editor for one client's one framework dashboard: health, timeline,
   alerts, kanban action board, messages. For portal=investment, this also
   surfaces the real eemmic_investments/_entries data (record investment +
   P&L entries) instead of the generic JSON `data` blob, since EEMMIC
   already has proper relational tables for that. */
(function () {
  const W = window.EemmicWidgets;
  const SERVICE_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };
  const STATUS_OPTIONS = ['pending', 'in_progress', 'done'];
  const SEVERITY_OPTIONS = ['info', 'warning', 'critical'];

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;
    const params = new URLSearchParams(location.search);
    const userId = params.get('user');
    const portalType = params.get('portal');
    const main = document.getElementById('mainContent');

    if (!userId || !portalType) {
      main.innerHTML = '<p class="portal-empty">Missing ?user= and ?portal= in the URL.</p>';
      return;
    }

    let state = { dashboard: null, alerts: [], actions: [], messages: [] };
    let client = null;

    function api(path, opts) {
      return W.apiFetch('/api/portal-dashboards' + path, Object.assign({ token: token }, opts));
    }

    function loadClient() {
      return W.apiFetch('/api/clients', { token: token }).then(function (data) {
        client = (data.clients || []).find(function (c) { return c.id === userId; }) || null;
      });
    }

    function loadDashboard() {
      return api('/' + encodeURIComponent(userId) + '/' + encodeURIComponent(portalType))
        .then(function (data) { state = data; })
        .catch(function (err) {
          state = { dashboard: null, alerts: [], actions: [], messages: [], notFound: true };
        });
    }

    function renderMeta() {
      const el = document.getElementById('clientMeta');
      el.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">' +
        '<div><div style="font-weight:700; font-size:1.1rem;">' + W.escapeHtml(client ? (client.name || client.email) : userId) + '</div>' +
        '<div style="color:var(--color-text-muted); font-size:0.86rem;">' + W.escapeHtml(client ? client.email : '') + '</div></div>' +
        W.badge(SERVICE_LABELS[portalType] || portalType, 'default') + '</div>';

      if (state.notFound) {
        el.innerHTML += '<div style="margin-top:16px;"><button type="button" class="btn btn-primary btn-sm" id="seedBtn">Create baseline dashboard</button></div>';
        document.getElementById('seedBtn').addEventListener('click', function () {
          api('/' + encodeURIComponent(userId) + '/' + encodeURIComponent(portalType) + '/seed', { method: 'POST' })
            .then(reloadAndRender).catch(function (err) { alert(err.message || 'Failed to create dashboard.'); });
        });
      }
    }

    function renderHealth() {
      const el = document.getElementById('healthEditor');
      if (!state.dashboard) { el.innerHTML = '<p class="portal-empty">No dashboard yet.</p>'; return; }
      const components = state.dashboard.health_components || {};
      const rows = Object.keys(components).map(function (k) {
        return '<div class="health-component-row" style="display:flex; gap:8px; margin-bottom:6px;">' +
          '<input type="text" class="hc-key" value="' + W.escapeHtml(k) + '" placeholder="Component" style="flex:1;">' +
          '<input type="number" class="hc-value" value="' + W.escapeHtml(components[k]) + '" style="width:80px;">' +
          '<button type="button" class="btn btn-outline btn-sm hc-remove">&times;</button></div>';
      }).join('');

      el.innerHTML =
        '<div class="field"><label>Overall score (0-100)</label><input type="number" id="healthScoreInput" min="0" max="100" value="' + state.dashboard.health_score + '"></div>' +
        '<div id="healthComponentsRows">' + rows + '</div>' +
        '<button type="button" class="btn btn-outline btn-sm" id="addComponentBtn" style="margin-bottom:12px;">+ Component</button>' +
        '<button type="button" class="btn btn-primary btn-sm" id="saveHealthBtn" style="width:100%;">Save Health</button>';

      document.getElementById('addComponentBtn').addEventListener('click', function () {
        document.getElementById('healthComponentsRows').insertAdjacentHTML('beforeend',
          '<div class="health-component-row" style="display:flex; gap:8px; margin-bottom:6px;">' +
          '<input type="text" class="hc-key" placeholder="Component" style="flex:1;">' +
          '<input type="number" class="hc-value" value="0" style="width:80px;">' +
          '<button type="button" class="btn btn-outline btn-sm hc-remove">&times;</button></div>');
      });
      el.addEventListener('click', function (e) {
        const rm = e.target.closest('.hc-remove');
        if (rm) rm.closest('.health-component-row').remove();
      });
      document.getElementById('saveHealthBtn').addEventListener('click', function (evt) {
        const btn = evt.target;
        const healthComponents = {};
        el.querySelectorAll('.health-component-row').forEach(function (row) {
          const key = row.querySelector('.hc-key').value.trim();
          if (key) healthComponents[key] = Number(row.querySelector('.hc-value').value) || 0;
        });
        btn.disabled = true;
        api('/' + encodeURIComponent(userId) + '/' + encodeURIComponent(portalType), {
          method: 'PATCH',
          body: { healthScore: Number(document.getElementById('healthScoreInput').value) || 0, healthComponents: healthComponents }
        }).then(reloadAndRender).catch(function (err) { alert(err.message || 'Failed to save.'); btn.disabled = false; });
      });
    }

    function renderTimeline() {
      const el = document.getElementById('timelineEditor');
      if (!state.dashboard) { el.innerHTML = '<p class="portal-empty">No dashboard yet.</p>'; return; }
      const stages = state.dashboard.timeline || [];
      const rows = stages.map(function (s, i) {
        return '<div class="timeline-row" data-index="' + i + '" style="display:flex; gap:8px; margin-bottom:6px; align-items:center;">' +
          '<input type="text" class="tl-label" value="' + W.escapeHtml(s.label || '') + '" placeholder="Stage label" style="flex:1;">' +
          '<select class="tl-status">' + STATUS_OPTIONS.map(function (st) { return '<option value="' + st + '"' + (st === s.status ? ' selected' : '') + '>' + st + '</option>'; }).join('') + '</select>' +
          '<input type="date" class="tl-date" value="' + W.escapeHtml(s.date || '') + '">' +
          '<button type="button" class="btn btn-outline btn-sm tl-remove">&times;</button></div>';
      }).join('');

      el.innerHTML = '<div id="timelineRows">' + rows + '</div>' +
        '<button type="button" class="btn btn-outline btn-sm" id="addStageBtn" style="margin-bottom:12px;">+ Stage</button>' +
        '<button type="button" class="btn btn-primary btn-sm" id="saveTimelineBtn" style="width:100%;">Save Timeline</button>';

      document.getElementById('addStageBtn').addEventListener('click', function () {
        document.getElementById('timelineRows').insertAdjacentHTML('beforeend',
          '<div class="timeline-row" style="display:flex; gap:8px; margin-bottom:6px; align-items:center;">' +
          '<input type="text" class="tl-label" placeholder="Stage label" style="flex:1;">' +
          '<select class="tl-status">' + STATUS_OPTIONS.map(function (st) { return '<option value="' + st + '">' + st + '</option>'; }).join('') + '</select>' +
          '<input type="date" class="tl-date">' +
          '<button type="button" class="btn btn-outline btn-sm tl-remove">&times;</button></div>');
      });
      el.addEventListener('click', function (e) {
        const rm = e.target.closest('.tl-remove');
        if (rm) rm.closest('.timeline-row').remove();
      });
      document.getElementById('saveTimelineBtn').addEventListener('click', function (evt) {
        const btn = evt.target;
        const timeline = [];
        el.querySelectorAll('.timeline-row').forEach(function (row) {
          const label = row.querySelector('.tl-label').value.trim();
          if (!label) return;
          timeline.push({ label: label, status: row.querySelector('.tl-status').value, date: row.querySelector('.tl-date').value || null });
        });
        btn.disabled = true;
        api('/' + encodeURIComponent(userId) + '/' + encodeURIComponent(portalType), { method: 'PATCH', body: { timeline: timeline } })
          .then(reloadAndRender).catch(function (err) { alert(err.message || 'Failed to save.'); btn.disabled = false; });
      });
    }

    function renderDataJson() {
      const panel = document.getElementById('dataJsonPanel');
      if (portalType === 'investment' || !state.dashboard) { panel.style.display = 'none'; return; }
      panel.style.display = '';
      document.getElementById('dataJsonInput').value = JSON.stringify(state.dashboard.data || {}, null, 2);
      document.getElementById('dataJsonError').style.display = 'none';

      document.getElementById('saveDataJsonBtn').onclick = function (evt) {
        const errorEl = document.getElementById('dataJsonError');
        errorEl.style.display = 'none';
        let parsed;
        try {
          parsed = JSON.parse(document.getElementById('dataJsonInput').value);
        } catch (err) {
          errorEl.textContent = 'Invalid JSON: ' + err.message;
          errorEl.style.display = 'block';
          return;
        }
        evt.target.disabled = true;
        api('/' + encodeURIComponent(userId) + '/' + encodeURIComponent(portalType), { method: 'PATCH', body: { data: parsed } })
          .then(reloadAndRender).catch(function (err) { errorEl.textContent = err.message; errorEl.style.display = 'block'; evt.target.disabled = false; });
      };
    }

    function renderAlerts() {
      const el = document.getElementById('alertsEditor');
      el.innerHTML = '';
      const ticker = W.alertTicker(state.alerts, null);
      el.appendChild(ticker);

      el.querySelectorAll('.portal-alert').forEach(function (row, i) {
        const a = state.alerts[i];
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-outline btn-sm';
        del.textContent = 'Delete';
        del.style.marginLeft = '8px';
        del.addEventListener('click', function () {
          api('/alerts/' + encodeURIComponent(a.id), { method: 'DELETE' }).then(reloadAndRender).catch(function (err) { alert(err.message); });
        });
        row.appendChild(del);
      });

      const form = document.createElement('div');
      form.style.cssText = 'display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; align-items:flex-end;';
      form.innerHTML =
        '<div class="field" style="margin:0;"><label>Severity</label><select id="newAlertSeverity">' +
          SEVERITY_OPTIONS.map(function (s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') + '</select></div>' +
        '<div class="field" style="margin:0; flex:1; min-width:140px;"><label>Title</label><input type="text" id="newAlertTitle"></div>' +
        '<div class="field" style="margin:0; flex:2; min-width:200px;"><label>Message</label><input type="text" id="newAlertMessage"></div>' +
        '<button type="button" class="btn btn-primary btn-sm" id="addAlertBtn">Add</button>';
      el.appendChild(form);

      document.getElementById('addAlertBtn').addEventListener('click', function (evt) {
        const title = document.getElementById('newAlertTitle').value.trim();
        const message = document.getElementById('newAlertMessage').value.trim();
        if (!title || !message) return alert('Title and message are required.');
        evt.target.disabled = true;
        api('/' + encodeURIComponent(userId) + '/' + encodeURIComponent(portalType) + '/alerts', {
          method: 'POST', body: { severity: document.getElementById('newAlertSeverity').value, title: title, message: message }
        }).then(reloadAndRender).catch(function (err) { alert(err.message); evt.target.disabled = false; });
      });
    }

    function renderActions() {
      const el = document.getElementById('actionsEditor');
      el.innerHTML = '';
      const board = W.kanbanBoard(state.actions, function (id, column) {
        api('/actions/' + encodeURIComponent(id), { method: 'PATCH', body: { statusColumn: column } })
          .then(reloadAndRender).catch(function (err) { alert(err.message); });
      });
      el.appendChild(board);

      const form = document.createElement('div');
      form.style.cssText = 'display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; align-items:flex-end;';
      form.innerHTML =
        '<div class="field" style="margin:0; flex:1; min-width:160px;"><label>Title</label><input type="text" id="newActionTitle"></div>' +
        '<div class="field" style="margin:0;"><label>Assignee</label><input type="text" id="newActionAssignee" style="width:120px;"></div>' +
        '<div class="field" style="margin:0;"><label>Priority</label><select id="newActionPriority"><option value="low">low</option><option value="medium" selected>medium</option><option value="high">high</option></select></div>' +
        '<button type="button" class="btn btn-primary btn-sm" id="addActionBtn">Add</button>';
      el.appendChild(form);

      document.getElementById('addActionBtn').addEventListener('click', function (evt) {
        const title = document.getElementById('newActionTitle').value.trim();
        if (!title) return;
        evt.target.disabled = true;
        api('/' + encodeURIComponent(userId) + '/' + encodeURIComponent(portalType) + '/actions', {
          method: 'POST', body: { title: title, assignee: document.getElementById('newActionAssignee').value.trim(), priority: document.getElementById('newActionPriority').value }
        }).then(reloadAndRender).catch(function (err) { alert(err.message); evt.target.disabled = false; });
      });
    }

    function renderMessages() {
      const el = document.getElementById('messagesEditor');
      el.innerHTML = '';
      el.appendChild(W.messagesThread(state.messages, function (payload, form) {
        api('/' + encodeURIComponent(userId) + '/' + encodeURIComponent(portalType) + '/messages', { method: 'POST', body: payload })
          .then(function () { form.reset(); reloadAndRender(); }).catch(function (err) { alert(err.message); });
      }));
    }

    function renderInvestmentPanel() {
      const wrap = document.getElementById('investmentPanel');
      wrap.style.display = '';
      wrap.innerHTML = '<div class="portal-card"><div class="portal-card__head"><h3>Investments (real data)</h3></div>' +
        '<div id="investRecordForm" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; margin-bottom:16px;">' +
          '<div class="field" style="margin:0;"><label>Company / Project</label><input type="text" id="investCompany"></div>' +
          '<div class="field" style="margin:0;"><label>Amount</label><input type="number" step="0.01" id="investAmount" style="width:120px;"></div>' +
          '<div class="field" style="margin:0;"><label>Currency</label><input type="text" id="investCurrency" value="PKR" style="width:70px;"></div>' +
          '<div class="field" style="margin:0;"><label>Date</label><input type="date" id="investDate"></div>' +
          '<button type="button" class="btn btn-primary btn-sm" id="saveInvestBtn">Record</button>' +
        '</div>' +
        '<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Company</th><th>Amount</th><th>Date</th><th>Status</th><th>P&amp;L</th><th>Add Entry</th></tr></thead><tbody id="investmentsBody"><tr><td colspan="6" class="portal-empty">Loading…</td></tr></tbody></table></div></div>';

      function loadInvestments() {
        W.apiFetch('/api/investments', { token: token }).then(function (data) {
          const mine = (data.investments || []).filter(function (inv) { return inv.user_id === userId; });
          const body = document.getElementById('investmentsBody');
          if (!mine.length) { body.innerHTML = '<tr><td colspan="6" class="portal-empty">No investments recorded yet.</td></tr>'; return; }
          body.innerHTML = mine.map(function (inv) {
            const entries = inv.eemmic_investment_entries || [];
            const pl = entries.reduce(function (s, en) { return s + Number(en.amount); }, 0);
            return '<tr>' +
              '<td>' + W.escapeHtml(inv.company) + '</td>' +
              '<td>' + W.escapeHtml(W.formatMoney(inv.amount, inv.currency)) + '</td>' +
              '<td>' + W.escapeHtml(W.formatDate(inv.invested_at)) + '</td>' +
              '<td>' + W.badge(inv.status, inv.status === 'active' ? 'success' : 'default') + '</td>' +
              '<td>' + W.badge((pl >= 0 ? '+' : '') + W.formatMoney(pl, inv.currency), pl >= 0 ? 'success' : 'critical') + '</td>' +
              '<td><form class="entry-form" data-id="' + inv.id + '" style="display:flex; gap:4px;">' +
                '<input type="number" step="0.01" class="entry-amount" placeholder="Amount" style="width:80px;" required>' +
                '<button type="submit" class="btn btn-outline btn-sm">Add</button></form></td>' +
              '</tr>';
          }).join('');
        }).catch(function (err) {
          document.getElementById('investmentsBody').innerHTML = '<tr><td colspan="6" class="portal-empty">' + W.escapeHtml(err.message) + '</td></tr>';
        });
      }

      document.getElementById('saveInvestBtn').addEventListener('click', function (evt) {
        const company = document.getElementById('investCompany').value.trim();
        const amount = document.getElementById('investAmount').value;
        if (!company || !amount) return alert('Company and amount are required.');
        evt.target.disabled = true;
        W.apiFetch('/api/investments', {
          method: 'POST', token: token,
          body: { userId: userId, company: company, amount: amount, currency: document.getElementById('investCurrency').value.trim() || 'PKR', investedAt: document.getElementById('investDate').value || undefined }
        }).then(function () { document.getElementById('investCompany').value = ''; document.getElementById('investAmount').value = ''; loadInvestments(); })
          .catch(function (err) { alert(err.message); }).finally(function () { evt.target.disabled = false; });
      });

      document.getElementById('investmentsBody').addEventListener('submit', function (e) {
        const form = e.target.closest('.entry-form');
        if (!form) return;
        e.preventDefault();
        const id = form.getAttribute('data-id');
        const amount = form.querySelector('.entry-amount').value;
        W.apiFetch('/api/investments/' + encodeURIComponent(id) + '/entries', { method: 'POST', token: token, body: { amount: amount } })
          .then(loadInvestments).catch(function (err) { alert(err.message); });
      });

      loadInvestments();
    }

    function renderAll() {
      renderMeta();
      renderHealth();
      renderTimeline();
      renderDataJson();
      renderAlerts();
      renderActions();
      renderMessages();
      document.getElementById('investmentPanel').style.display = portalType === 'investment' ? '' : 'none';
      if (portalType === 'investment') renderInvestmentPanel();
    }

    function reloadAndRender() {
      return loadDashboard().then(renderAll);
    }

    Promise.all([loadClient(), loadDashboard()]).then(renderAll);
  });
})();
