/* window.EemmicDB — what auth.js and the dashboard pages call into for
   session/profile/auth actions and for reading a logged-in user's own
   submissions. Backed by Supabase Auth + the eemmic_profiles /
   eemmic_submissions tables (see supabase/schema.sql), read directly from
   the browser under Row Level Security — the anon key alone grants nothing;
   RLS policies restrict each account to its own rows. Requires
   js/supabase-client.js to have run first. */
window.EemmicDB = {
  getSession: async function () {
    if (!window.eemmicSupabase) return null;
    const { data } = await window.eemmicSupabase.auth.getSession();
    return data.session;
  },

  getProfile: async function (userId) {
    if (!window.eemmicSupabase || !userId) return null;
    const { data, error } = await window.eemmicSupabase
      .from('eemmic_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Failed to load profile:', error);
      return null;
    }
    return data;
  },

  signInWithPassword: async function (email, password) {
    return window.eemmicSupabase.auth.signInWithPassword({ email: email, password: password });
  },

  /* Sets a new password for the currently active session — used by
     accept-invite.html once someone lands there via the admin's invite
     email (Supabase parses the invite link into a session automatically). */
  setPassword: async function (password) {
    return window.eemmicSupabase.auth.updateUser({ password: password });
  },

  signOut: async function () {
    await window.eemmicSupabase.auth.signOut();
  },

  fetchOwnSubmissions: async function () {
    const { data: sessionData } = await window.eemmicSupabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      return { data: null, error: new Error('Not logged in.') };
    }
    return window.eemmicSupabase
      .from('eemmic_submissions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
  },

  /* Own investments plus their P&L entries, embedded in one call. Recording
     investments/entries is admin-only (dashboard.html, via /api/investments)
     — this is read-only, straight from Supabase under RLS. */
  fetchOwnInvestments: async function () {
    const { data: sessionData } = await window.eemmicSupabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      return { data: null, error: new Error('Not logged in.') };
    }
    return window.eemmicSupabase
      .from('eemmic_investments')
      .select('*, eemmic_investment_entries(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
  },

  /* Self-service profile update (currently just `name`) — allowed by the
     "update own, non-admin role only" RLS policy on eemmic_profiles for
     buyer/supplier/investor/manager, but not admin. Used by every
     *-settings.html page. */
  updateOwnProfile: async function (fields) {
    const { data: sessionData } = await window.eemmicSupabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      return { data: null, error: new Error('Not logged in.') };
    }
    return window.eemmicSupabase
      .from('eemmic_profiles')
      .update(fields)
      .eq('id', session.user.id)
      .select('*')
      .single();
  },

  /* Which framework portals (evaluation/management/marketplace/investment)
     the logged-in account has been granted — read-only, straight from
     Supabase under RLS. Used to gate the portal-<framework>*.html pages
     and to drive the "My Services" landing (my-dashboard.html). */
  fetchOwnPortalServices: async function () {
    const { data: sessionData } = await window.eemmicSupabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      return { data: null, error: new Error('Not logged in.') };
    }
    return window.eemmicSupabase
      .from('eemmic_portal_services')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
  }
};
