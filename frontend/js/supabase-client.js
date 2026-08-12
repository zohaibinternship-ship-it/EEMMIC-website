/* Browser-side Supabase client (anon key — safe to publish; Row Level
   Security is what actually restricts access, see supabase/schema.sql).
   Fill these in from your Supabase project: Project Settings -> API ->
   Project URL / anon public key. Requires the Supabase JS CDN <script> tag
   (loaded before this file) to have set window.supabase. */
(function () {
  var SUPABASE_URL = 'https://msgfmbrljawmiyrqfgoe.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ2ZtYnJsamF3bWl5cnFmZ29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzMwNDUsImV4cCI6MjEwMTMwOTA0NX0.yhFYKCEq4WRPzkhk9Hd19Hy6wrQ8BgS9pTtEOXIhgpw';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase JS library failed to load — check the CDN <script> tag order.');
    return;
  }

  window.eemmicSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
