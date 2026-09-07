"""Parses a chittorgarh.com IPO detail page (e.g. /ipo/<slug>-ipo/<id>/).

Verified against real pages (Kanohar Electricals, Qualiance International, Sep 2026):
the page is server-rendered HTML with consistent two-column <tr><td>label</td>
<td>value</td></tr> rows for IPO Date, Listing Date, Price Band, Lot Size, and
Total Issue Size. Subscription status is NOT reliably present here -- it's either
absent (upcoming IPOs) or only appears as blog-post titles, not structured data;
the actual live subscription widget loads via client-side JS. So this module does
not attempt to scrape subscription status.
"""

import re
from datetime import date

from bs4 import BeautifulSoup

from ..http import fetch


def _label_value_map(soup: BeautifulSoup) -> dict[str, str]:
    values: dict[str, str] = {}
    for tr in soup.find_all("tr"):
        tds = tr.find_all("td", recursive=False)
        if len(tds) == 2:
            label = tds[0].get_text(strip=True)
            value = tds[1].get_text(strip=True)
            if label and label not in values:
                values[label] = value
    return values


def _parse_price_band(text: str) -> tuple[float | None, float | None]:
    m = re.search(r"₹\s*([\d,]+(?:\.\d+)?)\s*to\s*₹\s*([\d,]+(?:\.\d+)?)", text)
    if not m:
        return None, None
    return float(m.group(1).replace(",", "")), float(m.group(2).replace(",", ""))


def _parse_lot_size(text: str) -> int | None:
    m = re.search(r"([\d,]+)\s*Shares?", text, re.IGNORECASE)
    if not m:
        return None
    return int(m.group(1).replace(",", ""))


def _parse_issue_size_crores(text: str) -> float | None:
    m = re.search(r"agg\.?\s*up to\s*₹\s*([\d,]+(?:\.\d+)?)\s*Cr", text, re.IGNORECASE)
    if not m:
        return None
    return float(m.group(1).replace(",", ""))


_MONTHS = (
    "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
)


def _parse_ipo_date_range(text: str) -> tuple[str | None, str | None]:
    """'8 to 10 Sep, 2026' -> (2026-09-08, 2026-09-10). Falls back to treating
    a single date as both open and close (for one-day bidding windows)."""
    m = re.search(rf"(\d{{1,2}})\s*to\s*(\d{{1,2}})\s+({_MONTHS})\.?,?\s*(\d{{4}})", text)
    if m:
        day1, day2, mon, year = m.groups()
        open_date = date.fromisoformat(_ddmmmyyyy_to_iso(day1, mon, year))
        close_date = date.fromisoformat(_ddmmmyyyy_to_iso(day2, mon, year))
        return open_date.isoformat(), close_date.isoformat()

    m = re.search(rf"(\d{{1,2}})\s+({_MONTHS})\.?,?\s*(\d{{4}})", text)
    if m:
        day, mon, year = m.groups()
        d = _ddmmmyyyy_to_iso(day, mon, year)
        return d, d

    return None, None


def _parse_single_date(text: str) -> str | None:
    """Finds a 'Mon D, YYYY' pattern anywhere in the string, ignoring any
    leading weekday name or trailing garbage (a stray 'T' has been observed)."""
    m = re.search(rf"({_MONTHS})\.?\s+(\d{{1,2}}),?\s*(\d{{4}})", text)
    if not m:
        return None
    mon, day, year = m.groups()
    return _ddmmmyyyy_to_iso(day, mon, year)


def _ddmmmyyyy_to_iso(day: str, mon: str, year: str) -> str:
    from datetime import datetime

    return datetime.strptime(f"{int(day):02d} {mon[:3]} {year}", "%d %b %Y").date().isoformat()


def scrape(url: str) -> dict:
    """Returns a dict of ipo fields (any of which may be None if not found)."""
    html = fetch(url)
    soup = BeautifulSoup(html, "html.parser")
    values = _label_value_map(soup)

    price_band_low, price_band_high = (None, None)
    if "Price Band" in values:
        price_band_low, price_band_high = _parse_price_band(values["Price Band"])

    lot_size = _parse_lot_size(values["Lot Size"]) if "Lot Size" in values else None
    issue_size_crores = (
        _parse_issue_size_crores(values["Total Issue Size"])
        if "Total Issue Size" in values
        else None
    )

    open_date, close_date = (None, None)
    if "IPO Date" in values:
        open_date, close_date = _parse_ipo_date_range(values["IPO Date"])

    listing_date = _parse_single_date(values["Listing Date"]) if "Listing Date" in values else None

    return {
        "price_band_low": price_band_low,
        "price_band_high": price_band_high,
        "lot_size": lot_size,
        "issue_size_crores": issue_size_crores,
        "open_date": open_date,
        "close_date": close_date,
        "listing_date": listing_date,
    }
