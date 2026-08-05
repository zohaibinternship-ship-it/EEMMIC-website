/* Placeholder browser client (Supabase has been removed). window.EemmicDB is
   what auth.js and the dashboard pages call into for session/profile/auth
   actions and for reading a logged-in user's own submissions. Every method
   below is a stub — TODO: replace these with real calls once the new
   database/auth is chosen, keeping the same method names/shapes so
   auth.js, login.js, signup.js and my-dashboard.js don't need to change. */
window.EemmicDB = {
  getSession: async function () {
    return null;
  },
  getProfile: async function (userId) {
    return null;
  },
  signInWithPassword: async function (email, password) {
    return { error: new Error('Sign-in is not connected to a database yet.') };
  },
  signUp: async function (email, password, metadata) {
    return { error: new Error('Sign-up is not connected to a database yet.') };
  },
  signOut: async function () {},
  fetchOwnSubmissions: async function () {
    return { data: null, error: new Error('Not connected to a database yet.') };
  }
};
