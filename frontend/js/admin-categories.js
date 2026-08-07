/* Admin "Enquiry Categories" CRUD page. */
(function () {
  const W = window.EemmicWidgets;
  const FORM_TYPE_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;
    const body = document.getElementById('categoriesBody');
    const form = document.getElementById('categoryForm');
    const errorEl = document.getElementById('categoryError');

    let categories = [];

    function render() {
      if (!categories.length) {
        body.innerHTML = '<tr><td colspan="5" class="portal-empty">No categories yet — add one above.</td></tr>';
        return;
      }
      body.innerHTML = categories.map(function (c) {
        return '<tr data-id="' + c.id + '">' +
          '<td>' + W.escapeHtml(c.name) + (c.description ? '<br><span style="color:var(--color-text-faint); font-size:0.78rem;">' + W.escapeHtml(c.description) + '</span>' : '') + '</td>' +
          '<td>' + W.badge(FORM_TYPE_LABELS[c.form_type] || c.form_type, 'default') + '</td>' +
          '<td>' + W.badge(c.is_active ? 'Active' : 'Inactive', c.is_active ? 'success' : 'default') + '</td>' +
          '<td>' + W.escapeHtml(W.formatDate(c.created_at)) + '</td>' +
          '<td>' +
            '<button type="button" class="btn btn-outline btn-sm toggle-btn" data-id="' + c.id + '" data-active="' + c.is_active + '">' + (c.is_active ? 'Deactivate' : 'Activate') + '</button> ' +
            '<button type="button" class="btn btn-outline btn-sm delete-btn" data-id="' + c.id + '">Delete</button>' +
          '</td></tr>';
      }).join('');
    }

    function load() {
      body.innerHTML = '<tr><td colspan="5" class="portal-empty">Loading categories…</td></tr>';
      W.apiFetch('/api/enquiry-categories/all', { token: token }).then(function (data) {
        categories = data.categories || [];
        render();
      }).catch(function (err) {
        body.innerHTML = '<tr><td colspan="5" class="portal-empty">' + W.escapeHtml(err.message || 'Failed to load categories.') + '</td></tr>';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.style.display = 'none';
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      W.apiFetch('/api/enquiry-categories', {
        method: 'POST', token: token,
        body: {
          formType: document.getElementById('catFormType').value,
          name: document.getElementById('catName').value.trim(),
          description: document.getElementById('catDescription').value.trim()
        }
      }).then(function () {
        form.reset();
        load();
      }).catch(function (err) {
        errorEl.textContent = err.message || 'Failed to add category.';
        errorEl.style.display = 'block';
      }).finally(function () { submitBtn.disabled = false; });
    });

    body.addEventListener('click', function (e) {
      const toggleBtn = e.target.closest('.toggle-btn');
      if (toggleBtn) {
        const id = toggleBtn.getAttribute('data-id');
        const isActive = toggleBtn.getAttribute('data-active') === 'true';
        toggleBtn.disabled = true;
        W.apiFetch('/api/enquiry-categories/' + encodeURIComponent(id), { method: 'PATCH', token: token, body: { isActive: !isActive } })
          .then(load).catch(function (err) { alert(err.message || 'Failed to update category.'); toggleBtn.disabled = false; });
        return;
      }
      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) {
        if (!confirm('Delete this category?')) return;
        const id = deleteBtn.getAttribute('data-id');
        deleteBtn.disabled = true;
        W.apiFetch('/api/enquiry-categories/' + encodeURIComponent(id), { method: 'DELETE', token: token })
          .then(load).catch(function (err) { alert(err.message || 'Failed to delete category.'); deleteBtn.disabled = false; });
      }
    });

    load();
  });
})();
