const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const supabase = require('../supabaseClient');

const router = express.Router();
const VALID_PORTAL_TYPES = ['evaluation', 'management', 'marketplace', 'investment'];
const CLIENT_ROLES = ['buyer', 'supplier', 'investor', 'manager'];

/* Admin: "Client Portal Accounts" (admin-clients.html). Every non-admin
   profile, plus their linked portal services — resolved client-side by the
   caller (same join-in-JS pattern dashboard.js already uses for
   users/investments) rather than a Postgres relational embed, since
   eemmic_portal_services.user_id and eemmic_profiles.id both reference
   auth.users(id) but aren't FK'd to each other directly. */
router.get('/', requireAdmin, async (req, res) => {
  const [profilesRes, servicesRes] = await Promise.all([db.listProfiles(), db.listPortalServices()]);

  if (profilesRes.error) {
    console.error('Failed to fetch profiles:', profilesRes.error);
    return res.status(500).json({ error: 'Could not load clients.' });
  }
  if (servicesRes.error) {
    console.error('Failed to fetch portal services:', servicesRes.error);
    return res.status(500).json({ error: 'Could not load client services.' });
  }

  const clients = (profilesRes.data || []).filter((p) => CLIENT_ROLES.includes(p.role));
  res.json({ clients, services: servicesRes.data || [] });
});

router.get('/:id/services', requireAdmin, async (req, res) => {
  const { data, error } = await db.listPortalServices({ userId: req.params.id });

  if (error) {
    console.error('Failed to fetch client services:', error);
    return res.status(500).json({ error: 'Could not load services.' });
  }

  res.json({ services: data });
});

/* Manually link a portal to a client account (outside the enquiry-approval
   flow — e.g. an admin granting access directly). */
router.post('/:id/services', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const portalType = (body.portalType || '').trim();
  if (!VALID_PORTAL_TYPES.includes(portalType)) {
    return res.status(400).json({ error: 'Invalid portal type.' });
  }

  const { data: existing } = await db.listPortalServices({ userId: req.params.id });
  const isPrimary = !(existing || []).length;

  const { data, error } = await db.createPortalService({
    user_id: req.params.id,
    portal_type: portalType,
    is_primary: isPrimary
  });

  if (error) {
    console.error('Failed to link portal service:', error);
    return res.status(500).json({ error: 'Could not link portal.' });
  }

  // Best-effort baseline dashboard row; ignore a duplicate-key error if one
  // already exists for this user/portal from a prior link.
  await db.createPortalDashboard({
    user_id: req.params.id,
    portal_type: portalType
  });

  res.status(201).json({ success: true, service: data });
});

router.delete('/:id/services/:serviceId', requireAdmin, async (req, res) => {
  const { error } = await db.deletePortalService(req.params.serviceId);

  if (error) {
    console.error('Failed to remove portal service:', error);
    return res.status(500).json({ error: 'Could not remove service.' });
  }

  res.json({ success: true });
});

router.patch('/:id/block', requireAdmin, async (req, res) => {
  const { error } = await db.updateProfileActive(req.params.id, false);

  if (error) {
    console.error('Failed to block client:', error);
    return res.status(500).json({ error: 'Could not block account.' });
  }

  res.json({ success: true });
});

router.patch('/:id/unblock', requireAdmin, async (req, res) => {
  const { error } = await db.updateProfileActive(req.params.id, true);

  if (error) {
    console.error('Failed to unblock client:', error);
    return res.status(500).json({ error: 'Could not unblock account.' });
  }

  res.json({ success: true });
});

/* Deletes the underlying Supabase Auth user; eemmic_profiles cascades via
   its own FK (id references auth.users(id) on delete cascade). */
router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.auth.admin.deleteUser(req.params.id);

  if (error) {
    console.error('Failed to delete client:', error);
    return res.status(500).json({ error: 'Could not delete account.' });
  }

  res.json({ success: true });
});

module.exports = router;
