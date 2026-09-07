# Scraper (Phase 2)

Refreshes data for IPOs tracked via `/admin` (their `chittorgarh_url`/`investorgain_url` fields),
scheduled by `.github/workflows/scrape.yml` (every 3 hours + manual `workflow_dispatch`). Writes
straight to Postgres via `DATABASE_URL` -- no separate API layer.

## What it does and doesn't scrape

- **chittorgarh.com** (`sources/chittorgarh.py`): price band, lot size, issue size, open/close/
  listing dates. Verified against real IPO pages as server-rendered HTML with consistent
  `<tr><td>label</td><td>value</td></tr>` rows.
- **investorgain.com** (`sources/investorgain.py`): GMP value, via a regex over an embedded
  (backslash-escaped) JSON blob in the page -- verified present without needing JS rendering.
- **Not scraped: subscription status.** Both sites' live subscription figures load via
  client-side JS after the page hydrates -- confirmed by fetching the pages and chittorgarh's
  dedicated subscription-status report page directly and finding no data in the initial HTML.
  Scraping this would need a headless browser (Playwright), which is a meaningfully heavier
  GitHub Actions job -- not built. Keep entering subscription status manually via `/admin`.
- **Not scraped: auto-discovery of new IPOs.** The IPO list/index pages on these sites are also
  client-rendered. Add new IPOs via `/admin` as you learn about them, same as today, then set their
  source URLs to bring them under auto-refresh.

## Running it

```bash
python -m venv .venv
./.venv/Scripts/pip install -r scraper/requirements.txt   # ./.venv/bin/pip on macOS/Linux
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
