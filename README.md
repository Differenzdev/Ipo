# IPO Dashboard

Personal dashboard for tracking and analyzing Indian IPOs (NSE/BSE): fundamentals, subscription
status, grey market premium (GMP), a rule-based scorecard, an indicative listing-gain range, and a
retail allotment-odds estimate. Phase 1 (manual entry) and Phase 2 (automated price
band/lot-size/dates/GMP refresh) are both built; see `scraper/README.md` for how Phase 2 works and
its limits.

## Local setup

1. Install dependencies (already done if you're reading this right after scaffolding):
   ```bash
   npm install
   ```
2. Create a free Postgres database -- either [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) work fine on their free tier.
3. Copy `.env.local.example` to `.env.local` (or edit the `.env.local` already present) and fill in:
   - `DATABASE_URL` -- the connection string from your Postgres provider
   - `APP_PASSWORD` -- the password you'll use to log into the dashboard
   - `SESSION_SECRET` -- any long random string (a default is already generated for local dev)
4. Run the schema against your database:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```
   (Neon and Supabase both also let you paste this into their web SQL editor if you don't have
   `psql` installed.)
5. Start the dev server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000), log in with `APP_PASSWORD`, then go to
   **Admin** to add your first IPO.

## How data gets in (Phase 1)

Everything is entered manually through `/admin`:
- Add a company + IPO (price band, lot size, dates, status) on the main admin page.
- On the company's own admin page (`/admin/<slug>`), add fundamentals per fiscal year, subscription
  entries per category, and GMP snapshots. Add a new GMP/subscription entry whenever you check an
  update -- the dashboard always uses the latest one and keeps history for the chart.

The public dashboard lives at `/ipos`.

## How data gets refreshed automatically (Phase 2)

On an IPO's admin page (`/admin/<slug>`), set **Chittorgarh IPO page URL** and/or **InvestorGain IPO
page URL** in the "Auto-refresh source URLs" section, and a scheduled scraper
(`scraper/`, run via GitHub Actions every 3 hours, see `.github/workflows/scrape.yml`) will keep
price band, lot size, issue size, dates, and GMP history up to date for that IPO. Leave both blank
to exclude an IPO from auto-refresh. Subscription status and fundamentals stay manual -- see
`scraper/README.md` for why (both candidate sites load live subscription numbers via client-side JS,
not scrapeable without a headless browser).

To run the scraper yourself (e.g. to test after changing it):
```bash
python -m venv .venv
./.venv/Scripts/pip install -r scraper/requirements.txt   # ./.venv/bin/pip on macOS/Linux
DATABASE_URL="..." ./.venv/Scripts/python -m scraper.run   # must run from the repo root
```

## Deploying

Live at **https://ipo-dashboard-lac.vercel.app** (Vercel project `e-optic/ipo-dashboard`).

Deployed via the Vercel CLI directly from this directory -- no GitHub repo required for this path
(one becomes necessary later if/when Phase 2's scraping cron via GitHub Actions is built):

```bash
npx vercel login       # one-time, interactive -- opens a browser to authenticate
npx vercel link        # links this directory to a Vercel project
npx vercel env add DATABASE_URL production
npx vercel env add APP_PASSWORD production
npx vercel env add SESSION_SECRET production   # generate a fresh one, don't reuse the local value
npx vercel --prod       # deploy
```

The whole app is gated by the password login (`src/proxy.ts`), so it's safe to have a public URL.
To redeploy after changes, just run `npx vercel --prod` again.

Alternative path for later: push to GitHub and import the repo into Vercel's dashboard for
automatic deploy-on-push. Not set up yet.

## Notes on the two heuristic features

- **Listing-day gain estimate** is derived from GMP and subscription momentum. It is indicative
  only, not a prediction -- GMP is an unofficial, unregulated, and volatile signal.
- **Allotment odds** are a rough estimate from public category subscription multiples. Actual
  allotment is a SEBI-mandated lottery/pro-rata process run by registrars; no app can influence or
  exactly predict it. The IPO detail page also lists legitimate strategies for improving your odds.
