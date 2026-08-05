/* Vercel serverless entrypoint — wraps the Express app from backend/server.js.
   TODO: once the new database is chosen, set its required env vars as Vercel
   project environment variables (Project Settings -> Environment Variables);
   there is no .env file in the deployed bundle. */
module.exports = require('../backend/server.js');
