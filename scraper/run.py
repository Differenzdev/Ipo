"""Entry point: refreshes data for every IPO that has a source URL set via /admin.

Usage: python -m scraper.run   (must run from the repo root so relative imports
work, and with DATABASE_URL set in the environment)
"""

import sys
import time

from .db import (
    create_discovered_ipo,
    get_connection,
    get_ipo_ids_by_chittorgarh_url,
    get_tracked_chittorgarh_urls,
    get_tracked_ipos,
    insert_gmp_snapshot,
    insert_subscription_snapshot,
    update_ipo_details,
)
from .sources import chittorgarh, discovery, investorgain, subscription

REQUEST_DELAY_SECONDS = 3  # good-citizen pacing between requests, not just to dodge blocks


def run() -> int:
    conn = get_connection()

    failures = 0
    try:
        already_tracked = get_tracked_chittorgarh_urls(conn)
        found = discovery.discover()
        new_ipos = [ipo for ipo in found if ipo["chittorgarh_url"] not in already_tracked]
        for ipo in new_ipos:
            create_discovered_ipo(conn, ipo["name"], ipo["chittorgarh_url"], ipo["board"])
            print(f"[discovery] Added new IPO: {ipo['name']} ({ipo['board']})")
        print(f"[discovery] Found {len(found)} current/upcoming IPO(s) listed, {len(new_ipos)} new.")
    except Exception as exc:  # noqa: BLE001 -- discovery failing must not block refreshing existing IPOs
        failures += 1
        print(f"[discovery] FAILED ({exc})", file=sys.stderr)

    try:
        by_url = get_ipo_ids_by_chittorgarh_url(conn)
        subs = subscription.scrape_all()
        updated = 0
        for url, values in subs.items():
            ipo_id = by_url.get(url)
            if ipo_id is None:
                continue  # not one of ours (or its chittorgarh_url isn't set yet)
            for category, times in values.items():
                insert_subscription_snapshot(conn, ipo_id, category, times, "chittorgarh scraper")
            updated += 1
        print(f"[subscription] Updated {updated} tracked IPO(s) with fresh subscription figures.")
    except Exception as exc:  # noqa: BLE001 -- must not block refreshing existing IPOs
        failures += 1
        print(f"[subscription] FAILED ({exc})", file=sys.stderr)

    ipos = get_tracked_ipos(conn)
    print(f"Found {len(ipos)} tracked IPO(s).")
    for ipo in ipos:
        label = f"{ipo['company_name']} (ipo id {ipo['id']})"

        if ipo["chittorgarh_url"]:
            try:
                details = chittorgarh.scrape(ipo["chittorgarh_url"])
                update_ipo_details(conn, ipo["id"], details)
                print(f"[chittorgarh] {label}: updated {[k for k, v in details.items() if v is not None]}")
            except Exception as exc:  # noqa: BLE001 -- one IPO's failure must not stop the rest
                failures += 1
                print(f"[chittorgarh] {label}: FAILED ({exc})", file=sys.stderr)
            time.sleep(REQUEST_DELAY_SECONDS)

        if ipo["investorgain_url"]:
            try:
                gmp = investorgain.scrape(ipo["investorgain_url"])
                if gmp["gmp_value"] is not None:
                    price_band_high = float(ipo["price_band_high"]) if ipo["price_band_high"] else None
                    gmp_pct = (
                        round(gmp["gmp_value"] / price_band_high * 100, 2)
                        if price_band_high
                        else None
                    )
                    insert_gmp_snapshot(conn, ipo["id"], gmp["gmp_value"], gmp_pct, "investorgain scraper")
                    print(f"[investorgain] {label}: GMP {gmp['gmp_value']} ({gmp['gmp_date']})")
                else:
                    print(f"[investorgain] {label}: no GMP data found")
            except Exception as exc:  # noqa: BLE001
                failures += 1
                print(f"[investorgain] {label}: FAILED ({exc})", file=sys.stderr)
            time.sleep(REQUEST_DELAY_SECONDS)

    conn.close()
    print(f"Done. {failures} failure(s).")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run())
