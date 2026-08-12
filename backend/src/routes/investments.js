const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

/* Admin dashboard: every investment across all accounts, with its P&L
   entries embedded, so the table and per-row totals can render in one call. */
router.get('/', requireAdmin, async (req, res) => {
  const { data, error } = await db.listInvestments();

  if (error) {
    console.error('Failed to fetch investments:', error);
    return res.status(500).json({ error: 'Could not load investments.' });
  }

  res.json({ investments: data });
});

/* Admin-only: record a new investment against an existing account. */
router.post('/', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const userId = (body.userId || '').trim();
  const company = (body.company || '').trim();
  const amount = Number(body.amount);
  const currency = (body.currency || 'PKR').trim();
  const investedAt = (body.investedAt || '').trim();

  if (!userId) {
    return res.status(400).json({ error: 'Select an account.' });
  }
  if (!company) {
    return res.status(400).json({ error: 'Company / project name is required.' });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid investment amount.' });
  }

  const fields = {
    user_id: userId,
    company,
    amount,
    currency: currency || 'PKR'
  };
  if (investedAt) fields.invested_at = investedAt;

  const { data, error } = await db.createInvestment(fields);

  if (error) {
    console.error('Failed to create investment:', error);
    return res.status(500).json({ error: 'Could not save investment.' });
  }

  res.status(201).json({ success: true, investment: data });
});

/* Admin-only: log a profit/loss entry against an existing investment.
   Positive amount = profit for that period, negative = loss. */
router.post('/:id/entries', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const amount = Number(body.amount);
  const note = (body.note || '').trim();
  const entryDate = (body.entryDate || '').trim();

  if (!Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({ error: 'Enter a non-zero amount (positive for profit, negative for loss).' });
  }

  const fields = {
    investment_id: req.params.id,
    amount,
    note: note || null
  };
  if (entryDate) fields.entry_date = entryDate;

  const { data, error } = await db.createInvestmentEntry(fields);

  if (error) {
    console.error('Failed to create investment entry:', error);
    return res.status(500).json({ error: 'Could not save entry.' });
  }

  res.status(201).json({ success: true, entry: data });
});

module.exports = router;
