/* Manager portal (manager.html + manager-approvals/-tasks/-reports.html) —
   real minimal data: Approvals is a read view of pending eemmic_submissions
   (GET /api/submissions is admin+manager gated); Team Tasks is full CRUD on
   the new eemmic_manager_tasks table. manager-settings.html instead reuses
   js/portal-framework.js's generic settings panel (data-portal-view="settings"). */
(function () {
  const W = window.EemmicWidgets;
  const SERVICE_LABELS = { evaluation: 'Evaluation', management: 'Management', marketplace: 'Marketplace', investment: 'Investment' };
  const TASK_STATUSES = ['todo', 'in_progress', 'done'];

  document.addEventListener('eemmic:portal-ready', function (e) {
    const token = e.detail.accessToken;
    const view = document.body.getAttribute('data-page-view') || 'dashboard';
    const main = document.getElementById('mainContent');

    if (view === 'dashboard') renderDashboard();
    else if (view === 'approvals') renderApprovals();
    else if (view === 'tasks') renderTasks();
    else if (view === 'reports') renderReports();

    function renderDashboard() {
      Promise.all([
        W.apiFetch('/api/submissions', { token: token }),
        W.apiFetch('/api/manager-tasks', { token: token })
      ]).then(function (results) {
        const submissions = results[0].submissions || [];
        const tasks = results[1].tasks || [];
        const pending = submissions.filter(function (s) { return s.portal_access === 'pending' || s.portal_access === 'none'; }).length;
        const openTasks = tasks.filter(function (t) { return t.status !== 'done'; }).length;
        main.innerHTML = '<div class="portal-grid portal-grid--4">' +
          W.statCard({ label: 'Pending Approvals', value: pending }) +
          W.statCard({ label: 'Total Enquiries', value: submissions.length }) +
          W.statCard({ label: 'Open Tasks', value: openTasks }) +
          W.statCard({ label: 'Completed Tasks', value: tasks.length - openTasks }) +
          '</div>';
      });
    }

    function renderApprovals() {
      main.innerHTML = '<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Received</th><th>Name</th><th>Service</th><th>Message</th><th>Portal Access</th></tr></thead><tbody id="approvalsBody"><tr><td colspan="5" class="portal-empty">Loading…</td></tr></tbody></table></div>';
      W.apiFetch('/api/submissions', { token: token }).then(function (data) {
        const pending = (data.submissions || []).filter(function (s) { return s.portal_access === 'pending' || s.portal_access === 'none'; });
        const body = document.getElementById('approvalsBody');
        if (!pending.length) { body.innerHTML = '<tr><td colspan="5" class="portal-empty">Nothing awaiting review.</td></tr>'; return; }
        body.innerHTML = pending.map(function (s) {
          return '<tr><td>' + W.escapeHtml(W.formatDateTime(s.created_at)) + '</td><td>' + W.escapeHtml(s.name) + '</td>' +
            '<td>' + W.badge(SERVICE_LABELS[s.service] || s.service, 'default') + '</td><td>' + W.escapeHtml((s.message || '').slice(0, 140)) + '</td>' +
            '<td>' + W.badge(s.portal_access, 'warning') + '</td></tr>';
        }).join('');
      });
      main.insertAdjacentHTML('afterbegin', '<p class="portal-empty" style="margin-bottom:12px;">Read-only — approving or rejecting an enquiry is done by an admin on Client Enquiries.</p>');
    }

    function renderTasks() {
      main.innerHTML =
        '<div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; align-items:flex-end;">' +
        '<div class="field" style="margin:0; flex:1; min-width:160px;"><label>Title</label><input type="text" id="newTaskTitle"></div>' +
        '<div class="field" style="margin:0;"><label>Assignee</label><input type="text" id="newTaskAssignee" style="width:130px;"></div>' +
        '<div class="field" style="margin:0;"><label>Due</label><input type="date" id="newTaskDue"></div>' +
        '<button type="button" class="btn btn-primary btn-sm" id="addTaskBtn">Add Task</button></div>' +
        '<div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Title</th><th>Assignee</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody id="tasksBody"><tr><td colspan="5" class="portal-empty">Loading…</td></tr></tbody></table></div>';

      function load() {
        W.apiFetch('/api/manager-tasks', { token: token }).then(function (data) {
          const tasks = data.tasks || [];
          const body = document.getElementById('tasksBody');
          if (!tasks.length) { body.innerHTML = '<tr><td colspan="5" class="portal-empty">No tasks yet.</td></tr>'; return; }
          body.innerHTML = tasks.map(function (t) {
            return '<tr data-id="' + t.id + '"><td>' + W.escapeHtml(t.title) + '</td><td>' + W.escapeHtml(t.assignee || '—') + '</td>' +
              '<td>' + W.escapeHtml(W.formatDate(t.due_date)) + '</td>' +
              '<td><select class="task-status" data-id="' + t.id + '">' + TASK_STATUSES.map(function (s) { return '<option value="' + s + '"' + (s === t.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
              '<td><button type="button" class="btn btn-outline btn-sm task-delete" data-id="' + t.id + '">Delete</button></td></tr>';
          }).join('');
        });
      }

      document.getElementById('addTaskBtn').addEventListener('click', function (evt) {
        const title = document.getElementById('newTaskTitle').value.trim();
        if (!title) return;
        evt.target.disabled = true;
        W.apiFetch('/api/manager-tasks', {
          method: 'POST', token: token,
          body: { title: title, assignee: document.getElementById('newTaskAssignee').value.trim(), dueDate: document.getElementById('newTaskDue').value || undefined }
        }).then(function () { document.getElementById('newTaskTitle').value = ''; document.getElementById('newTaskAssignee').value = ''; load(); })
          .catch(function (err) { alert(err.message); }).finally(function () { evt.target.disabled = false; });
      });

      document.getElementById('tasksBody').addEventListener('change', function (e) {
        const select = e.target.closest('.task-status');
        if (!select) return;
        W.apiFetch('/api/manager-tasks/' + encodeURIComponent(select.getAttribute('data-id')), { method: 'PATCH', token: token, body: { status: select.value } })
          .catch(function (err) { alert(err.message); load(); });
      });

      document.getElementById('tasksBody').addEventListener('click', function (e) {
        const del = e.target.closest('.task-delete');
        if (!del) return;
        if (!confirm('Delete this task?')) return;
        W.apiFetch('/api/manager-tasks/' + encodeURIComponent(del.getAttribute('data-id')), { method: 'DELETE', token: token }).then(load).catch(function (err) { alert(err.message); });
      });

      load();
    }

    function renderReports() {
      Promise.all([
        W.apiFetch('/api/submissions', { token: token }),
        W.apiFetch('/api/manager-tasks', { token: token })
      ]).then(function (results) {
        const submissions = results[0].submissions || [];
        const tasks = results[1].tasks || [];
        const byService = { evaluation: 0, management: 0, marketplace: 0, investment: 0 };
        submissions.forEach(function (s) { if (byService[s.service] !== undefined) byService[s.service]++; });
        main.innerHTML = '<div class="portal-grid portal-grid--2">' +
          '<div class="portal-card"><div class="portal-card__head"><h3>Enquiries by framework</h3></div>' +
          W.barChart(Object.keys(byService).map(function (k) { return { label: SERVICE_LABELS[k], value: byService[k] }; })) + '</div>' +
          '<div class="portal-card"><div class="portal-card__head"><h3>Tasks by status</h3></div>' +
          W.donutChart(TASK_STATUSES.map(function (s) { return { label: s, value: tasks.filter(function (t) { return t.status === s; }).length }; }), { size: 150 }) +
          '</div></div>';
      });
    }
  });
})();
