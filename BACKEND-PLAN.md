# EEMMIC Website — Backend Plan (Simple Explanation)

Right now this website has NO backend. It's just HTML, CSS, and JS files sitting
on disk — nothing saves data, nothing sends emails, nothing is "live." Everything
you see (stats, projects, dashboard numbers) is hardcoded text in the HTML files.
If we want any of it to actually work, we need to add a backend.

There are two very different levels of "backend" we could build. Pick one.


## LEVEL 1 — Just make the website work (small, cheap, fast)

What's broken right now:
- The Contact form (contact.html) doesn't go anywhere. Someone can fill it in
  and hit submit, but no email arrives, nothing is saved anywhere.
- The Newsletter signup box is the same — it doesn't do anything yet.

What Level 1 backend does:
- Adds two small pieces of server code that:
  1. Receive the contact form when someone submits it
  2. Check the info is valid (real email, message not empty, etc.)
  3. Send YOU an email/notification with what they wrote
  4. (Optional) Save the message somewhere so you have a record of every lead

How big is this: Small. A few hours of work. No ongoing product to maintain,
just a working contact form and newsletter box, like any normal business site.

What we'd need:
- A small server (a simple Node.js script is enough)
- An email-sending service (e.g. Resend, SendGrid, or similar) to actually
  deliver the email
- Somewhere cheap to host it (Railway, Render, Vercel, etc. — a few dollars a
  month or free tier)

This is the recommended starting point.


## LEVEL 2 — Build the real EEMMIC Marketplace (big, a real product)

Look at the homepage "dashboard" section — it shows things like:
- "12 Active Projects"
- "48 Verified Suppliers"
- "6 MW in the Marketplace"
- A list of real-looking projects ("400kW Rooftop — Textile Mill, Faisalabad")

None of this is real. It's just typed into the HTML by hand. If EEMMIC is
meant to actually become a working marketplace — where businesses post their
energy needs, solar suppliers get vetted and bid on projects, and someone
manages the process from evaluation to installation — then this isn't a
website anymore, it's a full software product. That needs:

1. **User accounts / logins** — for admins, for suppliers, maybe for the
   businesses posting projects (different people need different access)
2. **A database** — a real place to store projects, suppliers, bids, and their
   statuses (this replaces the hand-typed HTML numbers with real live data)
3. **An admin panel** — a private page where your team updates project status,
   approves suppliers, etc. — without touching code
4. **File storage** — for uploading documents (bid proposals, compliance
   paperwork, etc.)
5. **Email/notifications** — to alert suppliers when a new project is posted,
   alert admins when a bid comes in, etc.

How big is this: Large. This is months of work, like building a small app,
not a website feature. It should only be started once there's a real decision
to actually run EEMMIC as an operating business (per the governance notes,
EEMMIC is currently still "pipeline" / not yet a live entity).


## What language / tools would we use (either level)

- **Backend language:** Node.js (JavaScript) — recommended, because the
  website is already written in JavaScript, so it keeps everything in one
  language and is easier for one person/team to manage.
  (Python is a fine alternative if preferred — Django comes with a free
  built-in admin panel, which is handy for Level 2.)
- **Database (Level 2 only):** PostgreSQL — a solid, standard, free database.
- **Hosting:** cheap hosting services like Railway, Render, or Vercel — no
  need for expensive servers to start.


## Recommendation

Start with **Level 1** now — get the contact form and newsletter actually
working, so the site behaves like a normal, functioning business site.

Hold off on **Level 2** (the real marketplace product) until there's a
confirmed decision to build and fund EEMMIC as an actual running business,
since that's a much bigger commitment than a website fix.
