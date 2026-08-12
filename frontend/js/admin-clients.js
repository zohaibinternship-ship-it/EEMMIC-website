/* Admin "Client Portal Accounts" page: invite (POST /api/users, unchanged),
   then list/block/unblock/delete accounts and manage their linked portal
   services (GET/POST/DELETE /api/clients...). */
(function () {
  const W = window.EemmicWidgets;
  const ROLE_LABELS = { buyer: 'Buyer', supplier: 'Supplier', investor: 'Investor', manager: 'Manager' };
  const SERVICE_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;
    const body = document.getElementById('clientsBody');
    const statsEl = document.getElementById('clientStats');

    let clients = [];
    let servicesByUser = {};

    function groupServices(services) {
      servicesByUser = {};
      services.forEach(function (s) {
        (servicesByUser[s.user_id] = servicesByUser[s.user_id] || []).push(s);
      });
    }

    function updateStats() {
      const active = clients.filter(function (c) { return c.is_active !== false; }).length;
      statsEl.innerHTML =
        W.statCard({ label: 'Total Clients', value: clients.length }) +
        W.statCard({ label: 'Active', value: active }) +
        W.statCard({ label: 'Blocked', value: clients.length - active }) +
        W.statCard({ label: 'With Services', value: Object.keys(servicesByUser).length });
    }

    function servicesCell(c) {
      const services = servicesByUser[c.id] || [];
      const chips = services.map(function (s) {
        return '<span class="portal-badge portal-badge--default" style="margin:2px;">' + SERVICE_LABELS[s.portal_type] +
          ' <button type="button" class="remove-service-btn" data-user="' + c.id + '" data-service="' + s.id + '" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:4px;">&times;</button></span>';
      }).join('');
      return chips +
        '<div style="margin-top:6px; display:flex; gap:6px;">' +
        '<select class="add-service-type" data-user="' + c.id + '" style="font-size:0.78rem; padding:3px 6px;">' +
          Object.keys(SERVICE_LABELS).map(function (k) { return '<option value="' + k + '">' + SERVICE_LABELS[k] + '</option>'; }).join('') +
        '</select>' +
        '<button type="button" class="btn btn-outline btn-sm add-service-btn" data-user="' + c.id + '" style="padding:2px 10px; font-size:0.76rem;">+ Add</button>' +
        '</div>';
    }

    function render() {
      if (!clients.length) {
        body.innerHTML = '<tr><td colspan="7" class="portal-empty">No accounts yet — invite one above.</td></tr>';
        return;
      }
      body.innerHTML = clients.map(function (c) {
        const active = c.is_active !== false;
        return '<tr data-id="' + c.id + '">' +
          '<td>' + W.escapeHtml(c.name || '—') + (c.organisation ? '<br><span style="color:var(--color-text-faint); font-size:0.78rem;">' + W.escapeHtml(c.organisation) + '</span>' : '') + '</td>' +
          '<td><a href="mailto:' + W.escapeHtml(c.email) + '">' + W.escapeHtml(c.email) + '</a></td>' +
          '<td>' + W.badge(ROLE_LABELS[c.role] || c.role, 'default') + '</td>' +
          '<td>' + servicesCell(c) + '</td>' +
          '<td>' + W.badge(active ? 'Active' : 'Blocked', active ? 'success' : 'critical') + '</td>' +
          '<td>' + W.escapeHtml(W.formatDate(c.created_at)) + '</td>' +
          '<td>' +
            '<button type="button" class="btn btn-outline btn-sm block-btn" data-user="' + c.id + '" data-active="' + active + '">' + (active ? 'Block' : 'Unblock') + '</button> ' +
            '<button type="button" class="btn btn-outline btn-sm delete-btn" data-user="' + c.id + '">Delete</button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    function load() {
      body.innerHTML = '<tr><td colspan="7" class="portal-empty">Loading clients…</td></tr>';
      W.apiFetch('/api/clients', { token: token }).then(function (data) {
        clients = data.clients || [];
        groupServices(data.services || []);
        updateStats();
        render();
      }).catch(function (err) {
        body.innerHTML = '<tr><td colspan="7" class="portal-empty">' + W.escapeHtml(err.message || 'Failed to load clients.') + '</td></tr>';
      });
    }

    body.addEventListener('click', function (e) {
      const blockBtn = e.target.closest('.block-btn');
      if (blockBtn) {
        const userId = blockBtn.getAttribute('data-user');
        const isActive = blockBtn.getAttribute('data-active') === 'true';
        blockBtn.disabled = true;
        W.apiFetch('/api/clients/' + encodeURIComponent(userId) + '/' + (isActive ? 'block' : 'unblock'), { method: 'PATCH', token: token })
          .then(load).catch(function (err) { alert(err.message || 'Failed to update account.'); blockBtn.disabled = false; });
        return;
      }

      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) {
        const userId = deleteBtn.getAttribute('data-user');
        if (!confirm('Permanently delete this account? This cannot be undone.')) return;
        deleteBtn.disabled = true;
        W.apiFetch('/api/clients/' + encodeURIComponent(userId), { method: 'DELETE', token: token })
          .then(load).catch(function (err) { alert(err.message || 'Failed to delete account.'); deleteBtn.disabled = false; });
        return;
      }

      const addBtn = e.target.closest('.add-service-btn');
      if (addBtn) {
        const userId = addBtn.getAttribute('data-user');
        const select = body.querySelector('.add-service-type[data-user="' + userId + '"]');
        addBtn.disabled = true;
        W.apiFetch('/api/clients/' + encodeURIComponent(userId) + '/services', { method: 'POST', token: token, body: { portalType: select.value } })
          .then(load).catch(function (err) { alert(err.message || 'Failed to add service.'); addBtn.disabled = false; });
        return;
      }

      const removeBtn = e.target.closest('.remove-service-btn');
      if (removeBtn) {
        const userId = removeBtn.getAttribute('data-user');
        const serviceId = removeBtn.getAttribute('data-service');
        W.apiFetch('/api/clients/' + encodeURIComponent(userId) + '/services/' + encodeURIComponent(serviceId), { method: 'DELETE', token: token })
          .then(load).catch(function (err) { alert(err.message || 'Failed to remove service.'); });
      }
    });

    const inviteForm = document.getElementById('inviteForm');
    const inviteSuccess = document.getElementById('inviteSuccess');
    if (inviteForm) {
      let inviteError = inviteForm.querySelector('.form-error');
      if (!inviteError) {
        inviteError = document.createElement('p');
        inviteError.className = 'form-error';
        inviteError.style.display = 'none';
        inviteForm.querySelector('button[type="submit"]').insertAdjacentElement('beforebegin', inviteError);
      }

      inviteForm.addEventListener('submit', function (e) {
        e.preventDefault();
        inviteError.style.display = 'none';
        if (inviteSuccess) inviteSuccess.classList.remove('show');

        const submitBtn = inviteForm.querySelector('button[type="submit"]');
        const original = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending…';

        W.apiFetch('/api/users', {
          method: 'POST', token: token,
          body: {
            name: document.getElementById('inviteName').value.trim(),
            organisation: document.getElementById('inviteOrganisation').value.trim(),
            email: document.getElementById('inviteEmail').value.trim(),
            role: document.getElementById('inviteRole').value
          }
        }).then(function () {
          if (inviteSuccess) inviteSuccess.classList.add('show');
          inviteForm.reset();
          load();
        }).catch(function (err) {
          inviteError.textContent = err.message || 'Failed to send invite.';
          inviteError.style.display = 'block';
        }).finally(function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML = original;
        });
      });
    }

    load();
  });
})();
