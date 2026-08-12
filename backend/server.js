require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const submissionsRoute = require('./src/routes/submissions');
const newsletterRoute = require('./src/routes/newsletter');
const usersRoute = require('./src/routes/users');
const investmentsRoute = require('./src/routes/investments');
const enquiryCategoriesRoute = require('./src/routes/enquiryCategories');
const clientsRoute = require('./src/routes/clients');
const portalDashboardsRoute = require('./src/routes/portalDashboards');
const managerTasksRoute = require('./src/routes/managerTasks');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/submissions', submissionsRoute);
app.use('/api/newsletter', newsletterRoute);
app.use('/api/users', usersRoute);
app.use('/api/investments', investmentsRoute);
app.use('/api/enquiry-categories', enquiryCategoriesRoute);
app.use('/api/clients', clientsRoute);
app.use('/api/portal-dashboards', portalDashboardsRoute);
app.use('/api/manager-tasks', managerTasksRoute);

const frontendDir = path.join(__dirname, '..', 'frontend');

/* Clean URLs: redirect any request that still spells out ".html" to the
   extensionless path (so /about.html canonicalizes to /about), and let
   express.static's `extensions` option resolve /about -> about.html. */
app.get(/\.html$/, (req, res) => {
  const clean = req.path.slice(0, -'.html'.length) || '/';
  res.redirect(301, clean + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
});

/* Not linked from the nav — reachable only by visiting /admin directly.
   Same login page as everyone else; it redirects by role after auth. */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendDir, 'login.html'));
});

app.use(express.static(frontendDir, { extensions: ['html'] }));

/* Local dev: run a real server. On Vercel, api/index.js requires this file
   for its exported `app` and handles requests as a serverless function instead. */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`EEMMIC backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
