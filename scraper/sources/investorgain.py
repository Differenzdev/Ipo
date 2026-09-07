"""Parses a investorgain.com IPO GMP page (e.g. /ipo/<slug>-ipo/<id>/).

Verified against real pages (Kanohar Electricals, Qualiance International, Sep 2026):
the full GMP history is embedded as inline JSON in the server-rendered HTML --
repeated `"gmp_date":"DD-MM-YYYY","gmp":"<value>"` pairs, newest first. No JS
rendering needed.
"""

import re
from datetime import datetime

from ..http import fetch

# The site serializes this as a JSON string embedded in the page (Next.js RSC
# payload), so quotes may come through backslash-escaped (\"gmp_date\":\"...\")
# or plain ("gmp_date":"...") depending on where in the payload it appears --
# match either.
_GMP_PAIR = re.compile(
    r'\\?"gmp_date\\?":\\?"(\d{2})-(\d{2})-(\d{4})\\?",\\?"gmp\\?":\\?"([\d.]+)\\?"'
)


def scrape(url: str) -> dict:
    """Returns {"gmp_value": float, "gmp_date": iso date string} for the most
    recent entry found, or {"gmp_value": None, "gmp_date": None} if none found."""
    html = fetch(url)
    matches = _GMP_PAIR.findall(html)
    if not matches:
        return {"gmp_value": None, "gmp_date": None}

    day, month, year, gmp = matches[0]
    gmp_date = datetime.strptime(f"{day}-{month}-{year}", "%d-%m-%Y").date().isoformat()
    return {"gmp_value": float(gmp), "gmp_date": gmp_date}
