const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SERVICES = ['evaluation', 'management', 'marketplace', 'investment'];
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'closed'];

/* Public: contact form (contact.html) and the "new requirement" form on a
   logged-in user's my-dashboard.html both submit here.
   TODO: Supabase has been removed. Once the new DB/auth exists, re-add
   linking the submission to an account via user_id when a bearer token is
   present (see BACKEND-STATUS.md for the old Supabase-based shape). */
router.post('/', async (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const organisation = (body.organisation || '').trim();
  const service = (body.service || '').trim();
  const detail = (body.detail || '').trim();
  const message = (body.message || '').trim();

  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!VALID_SERVICES.includes(service)) {
    return res.status(400).json({ error: "Please select what you're reaching out about." });
  }

  // TODO: insert { sector: 'EEMMIC', service, name, email, phone, organisation, detail, message } into the new DB.
  const { data, error } = await db.notImplemented();

  if (error) {
    console.error('Failed to store submission:', error);
    return res.status(500).json({ error: 'Could not save your message. Please try again later.' });
  }

  res.status(201).json({ success: true, id: data.id });
});

/* Admin dashboard: list all submissions (dashboard.html).
   requireAdmin currently fails closed (501) with no DB wired up, so this
   handler body is unreachable until both are reconnected. */
router.get('/', requireAdmin, async (req, res) => {
  // TODO: select all rows from the new DB, ordered by created_at desc.
  const { data, error } = await db.notImplemented();

  if (error) {
    console.error('Failed to fetch submissions:', error);
    return res.status(500).json({ error: 'Could not load submissions.' });
  }

  res.json({ submissions: data });
});

/* Admin dashboard: update a submission's follow-up status. */
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const status = ((req.body || {}).status || '').trim();
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  // TODO: update this submission's status by id in the new DB.
  const { error } = await db.notImplemented();

  if (error) {
    console.error('Failed to update submission status:', error);
    return res.status(500).json({ error: 'Could not update status.' });
  }

  res.json({ success: true });
});

module.exports = router;
