const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const requireRole = require('../middleware/requireRole');
const { getUserFromRequest } = require('../auth');
const supabase = require('../supabaseClient');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SERVICES = ['evaluation', 'management', 'marketplace', 'investment'];
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'closed'];

/* Public: contact form (contact.html) and the "new requirement" form on a
   logged-in user's my-dashboard.html both submit here. If the request
   carries a valid bearer token, the submission is linked to that account
   via user_id; otherwise it's stored anonymously (public contact form). */
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

  const user = await getUserFromRequest(req);

  const { data, error } = await db.createSubmission({
    sector: 'EEMMIC',
    service,
    name,
    email,
    phone: phone || null,
    organisation: organisation || null,
    detail: detail || null,
    message,
    user_id: user ? user.id : null
  });

  if (error) {
    console.error('Failed to store submission:', error);
    return res.status(500).json({ error: 'Could not save your message. Please try again later.' });
  }

  res.status(201).json({ success: true, id: data.id });
});

/* Admin dashboard + manager (read-only): list all submissions. */
router.get('/', requireRole('admin', 'manager'), async (req, res) => {
  const { data, error } = await db.listSubmissions();

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

  const { error } = await db.updateSubmissionStatus(req.params.id, status);

  if (error) {
    console.error('Failed to update submission status:', error);
    return res.status(500).json({ error: 'Could not update status.' });
  }

  res.json({ success: true });
});

/* Admin: turns an enquiry into (or links it to) a client portal account.
   If the email has no existing account, sendCredentials (default true)
   invites one via Supabase Auth — same inviteUserByEmail flow as
   POST /api/users — and links the new account; if false, this just fails
   with a clear error rather than silently doing nothing. If the email
   already has an account (existing eemmic_profiles row), the enquiry is
   linked to it directly. Either way this grants the requested portal and
   seeds a baseline (zeroed) dashboard for it. */
router.post('/:id/approve', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const portalType = (body.portalType || '').trim();
  const sendCredentials = body.sendCredentials !== false;

  if (!VALID_SERVICES.includes(portalType)) {
    return res.status(400).json({ error: 'Invalid portal type.' });
  }

  const { data: submission, error: loadError } = await db.getSubmission(req.params.id);
  if (loadError) {
    console.error('Failed to load submission:', loadError);
    return res.status(500).json({ error: 'Could not load enquiry.' });
  }
  if (!submission) return res.status(404).json({ error: 'Enquiry not found.' });

  let userId = submission.user_id;

  if (!userId) {
    const { data: existingProfile } = await db.getProfileByEmail(submission.email);
    if (existingProfile) {
      userId = existingProfile.id;
    } else if (sendCredentials) {
      const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
      const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(submission.email, {
        data: { name: submission.name, organisation: submission.organisation || null, role: 'buyer' },
        redirectTo: `${siteUrl}/accept-invite.html`
      });
      if (inviteError) {
        console.error('Failed to invite user during approval:', inviteError);
        const status = inviteError.status === 422 ? 409 : 500;
        return res.status(status).json({ error: inviteError.message || 'Could not send invite.' });
      }
      userId = invited.user.id;
    } else {
      return res.status(400).json({ error: 'No existing portal account for this email — enable "send credentials" to invite one.' });
    }
  }

  const { data: existingServices } = await db.listPortalServices({ userId });
  const alreadyHasPortal = (existingServices || []).some((s) => s.portal_type === portalType);
  if (!alreadyHasPortal) {
    const { error: serviceError } = await db.createPortalService({
      user_id: userId,
      submission_id: submission.id,
      portal_type: portalType,
      is_primary: !(existingServices || []).length
    });
    if (serviceError) {
      console.error('Failed to link portal service:', serviceError);
      return res.status(500).json({ error: 'Could not grant portal access.' });
    }
    await db.createPortalDashboard({ user_id: userId, portal_type: portalType });
  }

  const { data: updated, error: updateError } = await db.updateSubmissionApproval(req.params.id, {
    portal_access: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: req.user.id
  });
  if (updateError) {
    console.error('Failed to mark enquiry approved:', updateError);
    return res.status(500).json({ error: 'Could not update enquiry.' });
  }

  res.json({ success: true, submission: updated, userId, portalType });
});

router.post('/:id/reject', requireAdmin, async (req, res) => {
  const reason = ((req.body || {}).reason || '').trim();
  if (reason.length < 5) {
    return res.status(400).json({ error: 'Please give a reason (at least 5 characters).' });
  }

  const { data, error } = await db.updateSubmissionApproval(req.params.id, {
    portal_access: 'rejected',
    rejection_reason: reason
  });
  if (error) {
    console.error('Failed to reject enquiry:', error);
    return res.status(500).json({ error: 'Could not update enquiry.' });
  }

  res.json({ success: true, submission: data });
});

module.exports = router;
