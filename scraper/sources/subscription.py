"""Scrapes category-wise IPO subscription figures from chittorgarh.com's live
subscription-status report pages -- two aggregate tables (mainboard + SME)
covering every currently-open/recently-closed IPO, not a per-IPO page.

Verified live: a per-IPO "subscription status live" page exists too
(/ipo_subscription/<slug>/<id>/), but its category-wise breakdown (QIB/NII/
Retail split) is gated behind a "Preview Limited" premium upsell -- only the
combined Total is free there. These two report pages carry the full QIB/sNII/
bNII/NII/Retail/Employee/Total breakdown for every row with no such gate.

Client-rendered like the discovery list pages (same #report_table pattern),
so this needs Playwright too. Rows carry the same /ipo/<slug>-ipo/<id>/ link
already stored as ipos.chittorgarh_url, so matching to a tracked IPO is exact
-- no name matching needed (the discovery module's dedup-by-name problems
don't apply here).
"""

from playwright.sync_api import sync_playwright

from ..http import USER_AGENT

REPORT_URLS = [
    "https://www.chittorgarh.com/report/ipo-subscription-status-live-bidding-data-bse-nse/21/",
    "https://www.chittorgarh.com/report/sme-ipo-subscription-status-live-bidding-bse-nse/22/",
]

# Column index (of each row's <td> cells) -> subscriptions.category, per the
# schema's fixed set (retail/hni/qib/employee/overall). sNII/bNII are finer
# HNI sub-splits the schema has no category for, and are skipped.
_COLUMN_CATEGORY = {
    3: "qib",
    6: "hni",
    7: "retail",
    8: "employee",
    11: "overall",
}


def _parse_row(cells: list[str]) -> dict[str, float]:
    values: dict[str, float] = {}
    for idx, category in _COLUMN_CATEGORY.items():
        raw = cells[idx].strip() if idx < len(cells) else ""
        if raw:
            values[category] = float(raw)
    return values


def _scrape_report(page, url: str) -> dict[str, dict[str, float]]:
    page.goto(url, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    rows = page.eval_on_selector_all(
        "#report_table tbody tr",
        """trs => trs.map(tr => {
            const link = tr.querySelector("a[href*='/ipo/']");
            const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
            return { href: link ? link.getAttribute('href') : null, cells };
        })""",
    )
    results: dict[str, dict[str, float]] = {}
    for r in rows:
        if not r["href"]:
            continue
        values = _parse_row(r["cells"])
        if values:
            results[r["href"]] = values
    return results


def scrape_all() -> dict[str, dict[str, float]]:
    """Returns {chittorgarh_url: {category: times_subscribed}} across both reports."""
    combined: dict[str, dict[str, float]] = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        for url in REPORT_URLS:
            for href, values in _scrape_report(page, url).items():
                combined[href] = values
        browser.close()
    return combined
