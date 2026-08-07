const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const { getUserFromRequest } = require('../auth');

const router = express.Router();
const VALID_PORTAL_TYPES = ['evaluation', 'management', 'marketplace', 'investment'];

/* Loads req.user + the caller's own dashboard for :portalType, 403ing if
   they have no eemmic_portal_services row for it. Used by every /me/* route
   below so a client can only ever touch their own portal data. */
async function requireOwnDashboard(req, res, next) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Log in required.' });

  const portalType = req.params.portalType;
  if (!VALID_PORTAL_TYPES.includes(portalType)) {
    return res.status(400).json({ error: 'Invalid portal type.' });
  }

  const { data: services, error: servicesError } = await db.listPortalServices({ userId: user.id });
  if (servicesError) {
    console.error('Failed to check portal access:', servicesError);
    return res.status(500).json({ error: 'Could not verify portal access.' });
  }
  if (!(services || []).some((s) => s.portal_type === portalType)) {
    return res.status(403).json({ error: 'No access to this portal.' });
  }

  const { data: dashboard, error } = await db.getPortalDashboard(user.id, portalType);
  if (error) {
    console.error('Failed to load dashboard:', error);
    return res.status(500).json({ error: 'Could not load dashboard.' });
  }

  req.user = user;
  req.dashboard = dashboard;
  next();
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

router.get('/', requireAdmin, async (req, res) => {
  const { data, error } = await db.listPortalDashboards();
  if (error) {
    console.error('Failed to list portal dashboards:', error);
    return res.status(500).json({ error: 'Could not load dashboards.' });
  }
  res.json({ dashboards: data });
});

router.get('/:userId/:portalType', requireAdmin, async (req, res) => {
  const { userId, portalType } = req.params;
  const { data: dashboard, error } = await db.getPortalDashboard(userId, portalType);
  if (error) {
    console.error('Failed to load dashboard:', error);
    return res.status(500).json({ error: 'Could not load dashboard.' });
  }
  if (!dashboard) return res.status(404).json({ error: 'No dashboard for this user/portal yet.' });

  const [alertsRes, actionsRes, messagesRes] = await Promise.all([
    db.listPortalAlerts(dashboard.id),
    db.listPortalActions(dashboard.id),
    db.listPortalMessages(dashboard.id)
  ]);

  res.json({
    dashboard,
    alerts: alertsRes.data || [],
    actions: actionsRes.data || [],
    messages: messagesRes.data || []
  });
});

/* Baseline (zeroed) dashboard row if one doesn't already exist. */
router.post('/:userId/:portalType/seed', requireAdmin, async (req, res) => {
  const { userId, portalType } = req.params;
  if (!VALID_PORTAL_TYPES.includes(portalType)) {
    return res.status(400).json({ error: 'Invalid portal type.' });
  }

  const { data: existing } = await db.getPortalDashboard(userId, portalType);
  if (existing) return res.json({ success: true, dashboard: existing });

  const { data, error } = await db.createPortalDashboard({ user_id: userId, portal_type: portalType });
  if (error) {
    console.error('Failed to seed dashboard:', error);
    return res.status(500).json({ error: 'Could not create dashboard.' });
  }
  res.status(201).json({ success: true, dashboard: data });
});

router.patch('/:userId/:portalType', requireAdmin, async (req, res) => {
  const { userId, portalType } = req.params;
  const { data: dashboard, error: loadError } = await db.getPortalDashboard(userId, portalType);
  if (loadError) return res.status(500).json({ error: 'Could not load dashboard.' });
  if (!dashboard) return res.status(404).json({ error: 'No dashboard for this user/portal yet.' });

  const body = req.body || {};
  const fields = {};
  if (Number.isFinite(Number(body.healthScore))) fields.health_score = Number(body.healthScore);
  if (body.healthComponents && typeof body.healthComponents === 'object') fields.health_components = body.healthComponents;
  if (Array.isArray(body.timeline)) fields.timeline = body.timeline;
  if (body.data && typeof body.data === 'object') fields.data = body.data;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  const { data, error } = await db.updatePortalDashboard(dashboard.id, fields);
  if (error) {
    console.error('Failed to update dashboard:', error);
    return res.status(500).json({ error: 'Could not update dashboard.' });
  }
  res.json({ success: true, dashboard: data });
});

router.post('/:userId/:portalType/alerts', requireAdmin, async (req, res) => {
  const { userId, portalType } = req.params;
  const { data: dashboard } = await db.getPortalDashboard(userId, portalType);
  if (!dashboard) return res.status(404).json({ error: 'No dashboard for this user/portal yet.' });

  const body = req.body || {};
  const severity = (body.severity || '').trim();
  const title = (body.title || '').trim();
  const message = (body.message || '').trim();
  if (!['critical', 'warning', 'info'].includes(severity)) {
    return res.status(400).json({ error: 'Invalid severity.' });
  }
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  const { data, error } = await db.createPortalAlert({ dashboard_id: dashboard.id, severity, title, message });
  if (error) {
    console.error('Failed to create alert:', error);
    return res.status(500).json({ error: 'Could not save alert.' });
  }
  res.status(201).json({ success: true, alert: data });
});

router.delete('/alerts/:alertId', requireAdmin, async (req, res) => {
  const { error } = await db.deletePortalAlert(req.params.alertId);
  if (error) return res.status(500).json({ error: 'Could not delete alert.' });
  res.json({ success: true });
});

router.post('/:userId/:portalType/actions', requireAdmin, async (req, res) => {
  const { userId, portalType } = req.params;
  const { data: dashboard } = await db.getPortalDashboard(userId, portalType);
  if (!dashboard) return res.status(404).json({ error: 'No dashboard for this user/portal yet.' });

  const body = req.body || {};
  const title = (body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const { data, error } = await db.createPortalAction({
    dashboard_id: dashboard.id,
    title,
    assignee: (body.assignee || '').trim() || null,
    status_column: ['todo', 'in_progress', 'review', 'done'].includes(body.statusColumn) ? body.statusColumn : 'todo',
    priority: ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium',
    due_date: body.dueDate || null
  });
  if (error) {
    console.error('Failed to create action:', error);
    return res.status(500).json({ error: 'Could not save action.' });
  }
  res.status(201).json({ success: true, action: data });
});

router.patch('/actions/:actionId', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const fields = {};
  if (['todo', 'in_progress', 'review', 'done'].includes(body.statusColumn)) fields.status_column = body.statusColumn;
  if (typeof body.title === 'string' && body.title.trim()) fields.title = body.title.trim();
  if (typeof body.assignee === 'string') fields.assignee = body.assignee.trim() || null;
  if (['low', 'medium', 'high'].includes(body.priority)) fields.priority = body.priority;
  if (typeof body.dueDate === 'string') fields.due_date = body.dueDate || null;

  if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update.' });

  const { data, error } = await db.updatePortalAction(req.params.actionId, fields);
  if (error) return res.status(500).json({ error: 'Could not update action.' });
  res.json({ success: true, action: data });
});

router.delete('/actions/:actionId', requireAdmin, async (req, res) => {
  const { error } = await db.deletePortalAction(req.params.actionId);
  if (error) return res.status(500).json({ error: 'Could not delete action.' });
  res.json({ success: true });
});

router.post('/:userId/:portalType/messages', requireAdmin, async (req, res) => {
  const { userId, portalType } = req.params;
  const { data: dashboard } = await db.getPortalDashboard(userId, portalType);
  if (!dashboard) return res.status(404).json({ error: 'No dashboard for this user/portal yet.' });

  const body = req.body || {};
  const messageBody = (body.body || '').trim();
  if (!messageBody) return res.status(400).json({ error: 'Message body is required.' });

  const { data, error } = await db.createPortalMessage({
    dashboard_id: dashboard.id,
    sender: 'firm',
    subject: (body.subject || '').trim() || null,
    body: messageBody
  });
  if (error) {
    console.error('Failed to send message:', error);
    return res.status(500).json({ error: 'Could not send message.' });
  }
  res.status(201).json({ success: true, message: data });
});

// ---------------------------------------------------------------------------
// Client (self-service, gated by requireOwnDashboard)
// ---------------------------------------------------------------------------

router.get('/me/:portalType', requireOwnDashboard, async (req, res) => {
  const dashboard = req.dashboard;
  if (!dashboard) return res.json({ dashboard: null, alerts: [], actions: [], messages: [] });

  const [alertsRes, actionsRes, messagesRes] = await Promise.all([
    db.listPortalAlerts(dashboard.id),
    db.listPortalActions(dashboard.id),
    db.listPortalMessages(dashboard.id)
  ]);

  res.json({
    dashboard,
    alerts: alertsRes.data || [],
    actions: actionsRes.data || [],
    messages: messagesRes.data || []
  });
});

router.patch('/me/:portalType/alerts/:id/read', requireOwnDashboard, async (req, res) => {
  const { error } = await db.updatePortalAlert(req.params.id, { is_read: true });
  if (error) return res.status(500).json({ error: 'Could not update alert.' });
  res.json({ success: true });
});

router.patch('/me/:portalType/actions/:id/move', requireOwnDashboard, async (req, res) => {
  const column = (req.body || {}).column;
  if (!['todo', 'in_progress', 'review', 'done'].includes(column)) {
    return res.status(400).json({ error: 'Invalid column.' });
  }
  const { data, error } = await db.updatePortalAction(req.params.id, { status_column: column });
  if (error) return res.status(500).json({ error: 'Could not move action.' });
  res.json({ success: true, action: data });
});

router.post('/me/:portalType/messages', requireOwnDashboard, async (req, res) => {
  if (!req.dashboard) return res.status(404).json({ error: 'No dashboard yet.' });
  const body = req.body || {};
  const messageBody = (body.body || '').trim();
  if (!messageBody) return res.status(400).json({ error: 'Message body is required.' });

  const { data, error } = await db.createPortalMessage({
    dashboard_id: req.dashboard.id,
    sender: 'client',
    subject: (body.subject || '').trim() || null,
    body: messageBody
  });
  if (error) {
    console.error('Failed to send message:', error);
    return res.status(500).json({ error: 'Could not send message.' });
  }
  res.status(201).json({ success: true, message: data });
});

module.exports = router;
