# Scraper (Phase 2 + auto-discovery)

Discovers new IPOs and refreshes data for every IPO tracked via `/admin` (their
`chittorgarh_url`/`investorgain_url` fields), scheduled by `.github/workflows/scrape.yml` (every 3
hours + manual `workflow_dispatch`). Writes straight to Postgres via `DATABASE_URL` -- no separate
API layer.

## What it does and doesn't scrape

- **Auto-discovery** (`sources/discovery.py`, Playwright): loads chittorgarh's mainboard and SME IPO
  list pages -- these are client-rendered (no data in the initial HTML), so this is the one part of
  the scraper that needs a real headless browser, not just an HTTP request. Rows with an empty
  Listing Date are current/upcoming IPOs; new ones (deduped by `chittorgarh_url`, not by name --
  the list table spells company names slightly differently than their own detail pages) get a bare
  company+ipo row created, which the very next step (below) fills in.
- **chittorgarh.com** (`sources/chittorgarh.py`): price band, lot size, issue size, open/close/
  listing dates, and a computed `status` (upcoming/open/closed/listed, from today's date vs the
  scraped dates -- refreshed on every run, not just set once). Verified against real IPO pages as
  server-rendered HTML with consistent `<tr><td>label</td><td>value</td></tr>` rows.
- **investorgain.com** (`sources/investorgain.py`): GMP value, via a regex over an embedded
  (backslash-escaped) JSON blob in the page -- verified present without needing JS rendering.
  **Not auto-set for discovered IPOs** -- the list table has no InvestorGain link and there's no
  reliable way to derive one, so GMP tracking for a newly discovered IPO needs its InvestorGain URL
  added manually via `/admin/<slug>`, same as before.
- **Not scraped: subscription status.** Both sites' live subscription figures load via
  client-side JS after the page hydrates -- confirmed by fetching the pages and chittorgarh's
  dedicated subscription-status report page directly and finding no data in the initial HTML. Keep
  entering subscription status manually via `/admin`.

## Running it

```bash
python -m venv .venv
./.venv/Scripts/pip install -r scraper/requirements.txt   # ./.venv/bin/pip on macOS/Linux
./.venv/Scripts/python -m playwright install chromium     # one-time, ~190MB browser download
DATABASE_URL="postgres://..." ./.venv/Scripts/python -m scraper.run
```

Must run as `python -m scraper.run` from the repo root (not `python scraper/run.py`) -- the
`sources/` modules use relative imports.

## Good-citizen scraping

Both sites' `robots.txt` were checked before building this: neither disallows a normally-identified
crawler from the pages used here (they block specific named AI/scraper bots, not a generic one).
The scraper still identifies itself with a descriptive User-Agent (`scraper/http.py`) and waits a
few seconds between requests, and only ever fetches the small number of IPOs you're tracking -- not
a full-site crawl.
