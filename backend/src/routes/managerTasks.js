const express = require('express');
const db = require('../db');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const gate = requireRole('admin', 'manager');
const VALID_STATUSES = ['todo', 'in_progress', 'done'];

router.get('/', gate, async (req, res) => {
  const { data, error } = await db.listManagerTasks();
  if (error) {
    console.error('Failed to fetch manager tasks:', error);
    return res.status(500).json({ error: 'Could not load tasks.' });
  }
  res.json({ tasks: data });
});

router.post('/', gate, async (req, res) => {
  const body = req.body || {};
  const title = (body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const { data, error } = await db.createManagerTask({
    title,
    assignee: (body.assignee || '').trim() || null,
    status: VALID_STATUSES.includes(body.status) ? body.status : 'todo',
    due_date: body.dueDate || null
  });
  if (error) {
    console.error('Failed to create manager task:', error);
    return res.status(500).json({ error: 'Could not save task.' });
  }
  res.status(201).json({ success: true, task: data });
});

router.patch('/:id', gate, async (req, res) => {
  const body = req.body || {};
  const fields = {};
  if (typeof body.title === 'string' && body.title.trim()) fields.title = body.title.trim();
  if (typeof body.assignee === 'string') fields.assignee = body.assignee.trim() || null;
  if (VALID_STATUSES.includes(body.status)) fields.status = body.status;
  if (typeof body.dueDate === 'string') fields.due_date = body.dueDate || null;

  if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update.' });

  const { data, error } = await db.updateManagerTask(req.params.id, fields);
  if (error) return res.status(500).json({ error: 'Could not update task.' });
  res.json({ success: true, task: data });
});

router.delete('/:id', gate, async (req, res) => {
  const { error } = await db.deleteManagerTask(req.params.id);
  if (error) return res.status(500).json({ error: 'Could not delete task.' });
  res.json({ success: true });
});

module.exports = router;
