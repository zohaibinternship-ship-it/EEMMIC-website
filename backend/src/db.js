const supabase = require('./supabaseClient');

const SUBMISSIONS_TABLE = 'eemmic_submissions';
const NEWSLETTER_TABLE = 'eemmic_newsletter_subscribers';
const PROFILES_TABLE = 'eemmic_profiles';
const INVESTMENTS_TABLE = 'eemmic_investments';
const INVESTMENT_ENTRIES_TABLE = 'eemmic_investment_entries';
const ENQUIRY_CATEGORIES_TABLE = 'eemmic_enquiry_categories';
const PORTAL_SERVICES_TABLE = 'eemmic_portal_services';
const PORTAL_DASHBOARDS_TABLE = 'eemmic_portal_dashboards';
const PORTAL_ALERTS_TABLE = 'eemmic_portal_alerts';
const PORTAL_MESSAGES_TABLE = 'eemmic_portal_messages';
const PORTAL_ACTIONS_TABLE = 'eemmic_portal_actions';
const MANAGER_TASKS_TABLE = 'eemmic_manager_tasks';

async function createSubmission(fields) {
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .insert([fields])
    .select('id')
    .single();
  return { data, error };
}

async function listSubmissions() {
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

async function getSubmission(id) {
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return { data, error };
}

async function updateSubmissionStatus(id, status) {
  const { error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .update({ status })
    .eq('id', id);
  return { error };
}

async function updateSubmissionApproval(id, fields) {
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .update(fields)
    .eq('id', id)
    .select('*')
    .single();
  return { data, error };
}

async function createNewsletterSubscriber(email) {
  const { error } = await supabase
    .from(NEWSLETTER_TABLE)
    .insert([{ email }]);
  return { error };
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return { data, error };
}

async function getProfileByEmail(email) {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();
  return { data, error };
}

async function listProfiles() {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

async function updateProfileActive(id, isActive) {
  const { error } = await supabase
    .from(PROFILES_TABLE)
    .update({ is_active: isActive })
    .eq('id', id);
  return { error };
}

async function listInvestments() {
  const { data, error } = await supabase
    .from(INVESTMENTS_TABLE)
    .select('*, eemmic_investment_entries(*)')
    .order('created_at', { ascending: false });
  return { data, error };
}

async function createInvestment(fields) {
  const { data, error } = await supabase
    .from(INVESTMENTS_TABLE)
    .insert([fields])
    .select('*')
    .single();
  return { data, error };
}

async function createInvestmentEntry(fields) {
  const { data, error } = await supabase
    .from(INVESTMENT_ENTRIES_TABLE)
    .insert([fields])
    .select('*')
    .single();
  return { data, error };
}

async function listEnquiryCategories({ activeOnly = false, formType = null } = {}) {
  let query = supabase.from(ENQUIRY_CATEGORIES_TABLE).select('*').order('created_at', { ascending: false });
  if (activeOnly) query = query.eq('is_active', true);
  if (formType) query = query.eq('form_type', formType);
  const { data, error } = await query;
  return { data, error };
}

async function createEnquiryCategory(fields) {
  const { data, error } = await supabase.from(ENQUIRY_CATEGORIES_TABLE).insert([fields]).select('*').single();
  return { data, error };
}

async function updateEnquiryCategory(id, fields) {
  const { data, error } = await supabase.from(ENQUIRY_CATEGORIES_TABLE).update(fields).eq('id', id).select('*').single();
  return { data, error };
}

async function deleteEnquiryCategory(id) {
  const { error } = await supabase.from(ENQUIRY_CATEGORIES_TABLE).delete().eq('id', id);
  return { error };
}

async function listPortalServices({ userId = null } = {}) {
  let query = supabase.from(PORTAL_SERVICES_TABLE).select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  return { data, error };
}

async function createPortalService(fields) {
  const { data, error } = await supabase.from(PORTAL_SERVICES_TABLE).insert([fields]).select('*').single();
  return { data, error };
}

async function deletePortalService(id) {
  const { error } = await supabase.from(PORTAL_SERVICES_TABLE).delete().eq('id', id);
  return { error };
}

async function getPortalDashboard(userId, portalType) {
  const { data, error } = await supabase
    .from(PORTAL_DASHBOARDS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('portal_type', portalType)
    .maybeSingle();
  return { data, error };
}

async function listPortalDashboards() {
  const { data, error } = await supabase
    .from(PORTAL_DASHBOARDS_TABLE)
    .select('*')
    .order('updated_at', { ascending: false });
  return { data, error };
}

async function createPortalDashboard(fields) {
  const { data, error } = await supabase.from(PORTAL_DASHBOARDS_TABLE).insert([fields]).select('*').single();
  return { data, error };
}

async function updatePortalDashboard(id, fields) {
  const { data, error } = await supabase
    .from(PORTAL_DASHBOARDS_TABLE)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  return { data, error };
}

async function listPortalAlerts(dashboardId) {
  const { data, error } = await supabase
    .from(PORTAL_ALERTS_TABLE)
    .select('*')
    .eq('dashboard_id', dashboardId)
    .order('created_at', { ascending: false });
  return { data, error };
}

async function createPortalAlert(fields) {
  const { data, error } = await supabase.from(PORTAL_ALERTS_TABLE).insert([fields]).select('*').single();
  return { data, error };
}

async function updatePortalAlert(id, fields) {
  const { error } = await supabase.from(PORTAL_ALERTS_TABLE).update(fields).eq('id', id);
  return { error };
}

async function deletePortalAlert(id) {
  const { error } = await supabase.from(PORTAL_ALERTS_TABLE).delete().eq('id', id);
  return { error };
}

async function listPortalMessages(dashboardId) {
  const { data, error } = await supabase
    .from(PORTAL_MESSAGES_TABLE)
    .select('*')
    .eq('dashboard_id', dashboardId)
    .order('created_at', { ascending: true });
  return { data, error };
}

async function createPortalMessage(fields) {
  const { data, error } = await supabase.from(PORTAL_MESSAGES_TABLE).insert([fields]).select('*').single();
  return { data, error };
}

async function updatePortalMessage(id, fields) {
  const { error } = await supabase.from(PORTAL_MESSAGES_TABLE).update(fields).eq('id', id);
  return { error };
}

async function listPortalActions(dashboardId) {
  const { data, error } = await supabase
    .from(PORTAL_ACTIONS_TABLE)
    .select('*')
    .eq('dashboard_id', dashboardId)
    .order('sort_order', { ascending: true });
  return { data, error };
}

async function createPortalAction(fields) {
  const { data, error } = await supabase.from(PORTAL_ACTIONS_TABLE).insert([fields]).select('*').single();
  return { data, error };
}

async function updatePortalAction(id, fields) {
  const { data, error } = await supabase.from(PORTAL_ACTIONS_TABLE).update(fields).eq('id', id).select('*').single();
  return { data, error };
}

async function deletePortalAction(id) {
  const { error } = await supabase.from(PORTAL_ACTIONS_TABLE).delete().eq('id', id);
  return { error };
}

async function listManagerTasks() {
  const { data, error } = await supabase
    .from(MANAGER_TASKS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

async function createManagerTask(fields) {
  const { data, error } = await supabase.from(MANAGER_TASKS_TABLE).insert([fields]).select('*').single();
  return { data, error };
}

async function updateManagerTask(id, fields) {
  const { data, error } = await supabase.from(MANAGER_TASKS_TABLE).update(fields).eq('id', id).select('*').single();
  return { data, error };
}

async function deleteManagerTask(id) {
  const { error } = await supabase.from(MANAGER_TASKS_TABLE).delete().eq('id', id);
  return { error };
}

module.exports = {
  createSubmission,
  listSubmissions,
  getSubmission,
  updateSubmissionStatus,
  updateSubmissionApproval,
  createNewsletterSubscriber,
  getProfile,
  getProfileByEmail,
  listProfiles,
  updateProfileActive,
  listInvestments,
  createInvestment,
  createInvestmentEntry,
  listEnquiryCategories,
  createEnquiryCategory,
  updateEnquiryCategory,
  deleteEnquiryCategory,
  listPortalServices,
  createPortalService,
  deletePortalService,
  getPortalDashboard,
  listPortalDashboards,
  createPortalDashboard,
  updatePortalDashboard,
  listPortalAlerts,
  createPortalAlert,
  updatePortalAlert,
  deletePortalAlert,
  listPortalMessages,
  createPortalMessage,
  updatePortalMessage,
  listPortalActions,
  createPortalAction,
  updatePortalAction,
  deletePortalAction,
  listManagerTasks,
  createManagerTask,
  updateManagerTask,
  deleteManagerTask
};
