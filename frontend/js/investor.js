/* Investor portal (investor.html + investor-portfolio/-investments/
   -analytics/-messages.html) — real data throughout, backed by the existing
   eemmic_investments/_entries tables (unlike FEMMIC's reference investor
   portal, which has nav entries but no actual pages behind them). Messages
   reuse eemmic_submissions (service='investment', detail='investor-note')
   as a lightweight real channel rather than adding a dedicated table for
   a role that isn't tied to any one eemmic_portal_dashboards row. */
(function () {
  const W = window.EemmicWidgets;

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;
    const session = e.detail.session;
    const profile = e.detail.profile;
    const view = document.body.getAttribute('data-page-view') || 'dashboard';
    const main = document.getElementById('mainContent');

    if (view === 'messages') return renderMessages();

    window.EemmicDB.fetchOwnInvestments().then(function (result) {
      const investments = result.data || [];
      if (view === 'dashboard') renderDashboard(investments);
      else if (view === 'portfolio') renderPortfolio(investments);
      else if (view === 'investments') renderInvestmentsTable(investments);
      else if (view === 'analytics') renderAnalytics(investments);
    });

    function plFor(inv) {
      return (inv.eemmic_investment_entries || []).reduce(function (s, en) { return s + Number(en.amount); }, 0);
    }

    function renderDashboard(investments) {
      const totalInvested = investments.reduce(function (s, i) { return s + Number(i.amount); }, 0);
      const totalPL = investments.reduce(function (s, i) { return s + plFor(i); }, 0);
      const currency = investments[0] ? investments[0].currency : 'PKR';
      main.innerHTML =
        '<div class="portal-grid portal-grid--4" style="margin-bottom:24px;">' +
        W.statCard({ label: 'Total Invested', value: W.formatMoney(totalInvested, currency) }) +
        W.statCard({ label: 'Total P&L', value: (totalPL >= 0 ? '+' : '') + W.formatMoney(totalPL, currency) }) +
        W.statCard({ label: 'Active', value: investments.filter(function (i) { return i.status === 'active'; }).length }) +
        W.statCard({ label: 'Exited', value: investments.filter(function (i) { return i.status === 'exited'; }).length }) +
        '</div><div id="investTable"></div>';
      renderTableInto('investTable', investments);
    }

    function renderPortfolio(investments) {
      const byCompany = {};
      investments.forEach(function (i) { byCompany[i.company] = (byCompany[i.company] || 0) + Number(i.amount); });
      const chartData = Object.keys(byCompany).map(function (k) { return { label: k, value: byCompany[k] }; });
      main.innerHTML = '<div class="portal-card" style="margin-bottom:24px;"><div class="portal-card__head"><h3>Allocation by company</h3></div>' +
        (chartData.length ? '<div style="display:flex; gap:24px; align-items:center; flex-wrap:wrap;">' + W.donutChart(chartData, { size: 160 }) +
          '<div style="font-size:0.85rem; color:var(--color-text-muted);">' + chartData.map(function (c) { return '<div>' + W.escapeHtml(c.label) + ': ' + W.escapeHtml(W.formatMoney(c.value, 'PKR')) + '</div>'; }).join('') + '</div></div>'
          : '<p class="portal-empty">No investments yet.</p>') + '</div><div id="investTable"></div>';
      renderTableInto('investTable', investments);
    }

    function renderInvestmentsTable(investments) {
      main.innerHTML = '<div id="investTable"></div>';
      renderTableInto('investTable', investments, true);
    }

    function renderAnalytics(investments) {
      const byMonth = {};
      investments.forEach(function (inv) {
        (inv.eemmic_investment_entries || []).forEach(function (en) {
          const month = (en.entry_date || '').slice(0, 7) || 'unknown';
          byMonth[month] = (byMonth[month] || 0) + Number(en.amount);
        });
      });
      const months = Object.keys(byMonth).sort();
      main.innerHTML = '<div class="portal-card"><div class="portal-card__head"><h3>P&amp;L by month</h3></div>' +
        (months.length ? W.barChart(months.map(function (m) { return { label: m, value: byMonth[m] }; })) : '<p class="portal-empty">No P&amp;L entries yet.</p>') +
        '</div>';
    }

    function renderTableInto(id, investments, showEntries) {
      const el = document.getElementById(id);
      if (!investments.length) { el.innerHTML = '<p class="portal-empty">No investments recorded yet.</p>'; return; }
      el.innerHTML = '<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Company</th><th>Amount</th><th>Date</th><th>Status</th><th>P&amp;L</th>' +
        (showEntries ? '<th>Entries</th>' : '') + '</tr></thead><tbody>' +
        investments.map(function (inv) {
          const pl = plFor(inv);
          const entries = inv.eemmic_investment_entries || [];
          return '<tr><td>' + W.escapeHtml(inv.company) + '</td><td>' + W.escapeHtml(W.formatMoney(inv.amount, inv.currency)) + '</td>' +
            '<td>' + W.escapeHtml(W.formatDate(inv.invested_at)) + '</td><td>' + W.badge(inv.status, inv.status === 'active' ? 'success' : 'default') + '</td>' +
            '<td>' + W.badge((pl >= 0 ? '+' : '') + W.formatMoney(pl, inv.currency), pl >= 0 ? 'success' : 'critical') + '</td>' +
            (showEntries ? '<td>' + (entries.length ? entries.map(function (en) { return W.escapeHtml(W.formatDate(en.entry_date)) + ': ' + (en.amount >= 0 ? '+' : '') + en.amount; }).join('<br>') : '—') + '</td>' : '') +
            '</tr>';
        }).join('') + '</tbody></table></div>';
    }

    function renderMessages() {
      window.EemmicDB.fetchOwnSubmissions().then(function (result) {
        const notes = (result.data || []).filter(function (s) { return s.detail === 'investor-note'; });
        main.innerHTML = '<div class="portal-card"><div class="portal-card__head"><h3>Messages</h3></div><div id="msgThread"></div></div>';
        const el = document.getElementById('msgThread');
        el.appendChild(W.messagesThread(notes.map(function (n) { return { sender: 'client', body: n.message, created_at: n.created_at }; }), function (payload, form) {
          W.apiFetch('/api/submissions', {
            method: 'POST', token: token,
            body: {
              sector: 'EEMMIC', service: 'investment', detail: 'investor-note',
              name: (profile && profile.name) || session.user.email, email: session.user.email,
              organisation: (profile && profile.organisation) || '', message: payload.body
            }
          }).then(function () { form.reset(); renderMessages(); }).catch(function (err) { alert(err.message); });
        }));
      });
    }
  });
})();
