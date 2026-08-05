require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const submissionsRoute = require('./src/routes/submissions');
const newsletterRoute = require('./src/routes/newsletter');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/submissions', submissionsRoute);
app.use('/api/newsletter', newsletterRoute);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* Local dev: run a real server. On Vercel, api/index.js requires this file
   for its exported `app` and handles requests as a serverless function instead. */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`EEMMIC backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
