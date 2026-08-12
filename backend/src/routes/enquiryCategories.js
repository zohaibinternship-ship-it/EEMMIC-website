const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const VALID_FORM_TYPES = ['evaluation', 'management', 'marketplace', 'investment'];

/* Public: the categories a client picks from when applying for a framework
   (portal-<framework>.html "apply for another service" form, and the public
   framework lead-capture forms). Active only. */
router.get('/', async (req, res) => {
  const formType = (req.query.formType || '').trim() || null;
  const { data, error } = await db.listEnquiryCategories({ activeOnly: true, formType });

  if (error) {
    console.error('Failed to fetch enquiry categories:', error);
    return res.status(500).json({ error: 'Could not load categories.' });
  }

  res.json({ categories: data });
});

/* Admin: every category, active or not (admin-categories.html). */
router.get('/all', requireAdmin, async (req, res) => {
  const { data, error } = await db.listEnquiryCategories();

  if (error) {
    console.error('Failed to fetch enquiry categories:', error);
    return res.status(500).json({ error: 'Could not load categories.' });
  }

  res.json({ categories: data });
});

router.post('/', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const formType = (body.formType || '').trim();
  const name = (body.name || '').trim();
  const description = (body.description || '').trim();
  const isActive = body.isActive !== false;

  if (!VALID_FORM_TYPES.includes(formType)) {
    return res.status(400).json({ error: 'Invalid form type.' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const { data, error } = await db.createEnquiryCategory({
    form_type: formType,
    name,
    description: description || null,
    is_active: isActive
  });

  if (error) {
    console.error('Failed to create enquiry category:', error);
    return res.status(500).json({ error: 'Could not save category.' });
  }

  res.status(201).json({ success: true, category: data });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const fields = {};
  if (typeof body.name === 'string') fields.name = body.name.trim();
  if (typeof body.description === 'string') fields.description = body.description.trim() || null;
  if (typeof body.isActive === 'boolean') fields.is_active = body.isActive;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  const { data, error } = await db.updateEnquiryCategory(req.params.id, fields);

  if (error) {
    console.error('Failed to update enquiry category:', error);
    return res.status(500).json({ error: 'Could not update category.' });
  }

  res.json({ success: true, category: data });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await db.deleteEnquiryCategory(req.params.id);

  if (error) {
    console.error('Failed to delete enquiry category:', error);
    return res.status(500).json({ error: 'Could not delete category.' });
  }

  res.json({ success: true });
});

module.exports = router;
