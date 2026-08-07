const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const supabase = require('../supabaseClient');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['buyer', 'supplier', 'investor'];

/* Admin dashboard: list every account (dashboard.html "Clients" panel). */
router.get('/', requireAdmin, async (req, res) => {
  const { data, error } = await db.listProfiles();

  if (error) {
    console.error('Failed to fetch profiles:', error);
    return res.status(500).json({ error: 'Could not load accounts.' });
  }

  res.json({ users: data });
});

/* Admin-only: provision a client account. There is no public signup —
   this sends the invitee a Supabase Auth email with a link to
   accept-invite.html, where they set their own password. Name/organisation/
   role travel as signup metadata; eemmic_handle_new_user() (see
   supabase/schema.sql) reads that metadata to create the eemmic_profiles row. */
router.post('/', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const email = (body.email || '').trim();
  const name = (body.name || '').trim();
  const organisation = (body.organisation || '').trim();
  const role = (body.role || '').trim();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be buyer, supplier, or investor.' });
  }

  const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, organisation: organisation || null, role },
    redirectTo: `${siteUrl}/accept-invite.html`
  });

  if (error) {
    console.error('Failed to invite user:', error);
    const status = error.status === 422 ? 409 : 500;
    return res.status(status).json({ error: error.message || 'Could not send invite.' });
  }

  res.status(201).json({ success: true, id: data.user.id });
});

module.exports = router;
