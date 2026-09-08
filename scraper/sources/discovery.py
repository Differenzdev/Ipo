"""Discovers new mainboard/SME IPOs from chittorgarh.com's list pages.

Verified live: these pages are client-rendered (no data in the initial HTML,
same as the subscription-status pages) -- a real browser is required, unlike
the per-IPO detail pages and investorgain GMP pages, which are plain HTTP.

The list table (#report_table) covers the whole year, listed and unlisted
together. An empty "Listing Date" cell is the reliable signal for "still
upcoming/current" -- verified directly against the live table, including that
every already-tracked IPO at the time of writing showed up with that column
blank.
"""

import re

from playwright.sync_api import sync_playwright

from ..http import USER_AGENT

LIST_URLS = [
    ("mainboard", "https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/mainboard/"),
    ("sme", "https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/sme/"),
]

# Company names in this table carry a badge remnant with no separating
# whitespace, e.g. "Pranav Constructions Ltd. O" or "Purple Style Labs Ltd. LT".
_NAME_JUNK = re.compile(r"\s+Ltd\.?(\s+[A-Z]{1,2})?\s*$")


def _clean_name(raw: str) -> str:
    return _NAME_JUNK.sub("", raw).strip()


def _discover_from_list(page, board: str, url: str) -> list[dict]:
    page.goto(url, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    rows = page.eval_on_selector_all(
        "#report_table tbody tr",
        """trs => trs.map(tr => {
            const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
            const link = tr.querySelector("a[href*='/ipo/']");
            return { name: cells[0], listingDate: cells[4], href: link ? link.getAttribute('href') : null };
        })""",
    )
    discovered = []
    for r in rows:
        if r["listingDate"] or not r["href"] or not r["name"]:
            continue
        discovered.append({"name": _clean_name(r["name"]), "chittorgarh_url": r["href"], "board": board})
    return discovered


def discover() -> list[dict]:
    """Returns a list of {"name", "chittorgarh_url", "board"} for currently
    upcoming/open IPOs found across the mainboard and SME list pages, deduped
    by URL (board comes from which of the two list pages a row was found on)."""
    results: dict[str, dict] = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        for board, url in LIST_URLS:
            for item in _discover_from_list(page, board, url):
                results[item["chittorgarh_url"]] = item
        browser.close()
    return list(results.values())
