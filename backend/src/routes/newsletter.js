const express = require('express');
const db = require('../db');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTGRES_UNIQUE_VIOLATION = '23505';

router.post('/', async (req, res) => {
  const email = ((req.body || {}).email || '').trim();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // TODO: insert { email } into the new DB's newsletter subscribers table.
  const { error } = await db.notImplemented();

  if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) {
    console.error('Failed to store newsletter subscriber:', error);
    return res.status(500).json({ error: 'Could not subscribe. Please try again later.' });
  }

  res.status(201).json({ success: true });
});

module.exports = router;
