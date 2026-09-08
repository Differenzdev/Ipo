import os
import re

import psycopg
from psycopg.rows import dict_row


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    return slug.strip("-")


def get_connection():
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set (or is empty). In GitHub Actions this means the "
            "'DATABASE_URL' repository secret doesn't exist yet -- check Settings > "
            "Secrets and variables > Actions > Repository secrets. Locally, set it in "
            "your shell before running `python -m scraper.run`."
        )
    return psycopg.connect(database_url, row_factory=dict_row)


def get_tracked_ipos(conn):
    """IPOs with at least one scraper source URL set."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select ipos.id, ipos.status, ipos.chittorgarh_url, ipos.investorgain_url,
                   ipos.price_band_high, companies.name as company_name
            from ipos
            join companies on companies.id = ipos.company_id
            where ipos.chittorgarh_url is not null or ipos.investorgain_url is not null
            """
        )
        return cur.fetchall()


_UPDATABLE_IPO_FIELDS = {
    "price_band_low",
    "price_band_high",
    "lot_size",
    "issue_size_crores",
    "open_date",
    "close_date",
    "listing_date",
    "status",
}


def update_ipo_details(conn, ipo_id, details):
    """details: dict with any of price_band_low, price_band_high, lot_size,
    issue_size_crores, open_date, close_date, listing_date. Only non-None
    fields are written."""
    fields = [k for k, v in details.items() if v is not None]
    unknown = set(fields) - _UPDATABLE_IPO_FIELDS
    if unknown:
        raise ValueError(f"Refusing to update unknown ipo field(s): {unknown}")
    if not fields:
        return
    set_clause = ", ".join(f"{f} = %s" for f in fields)
    values = [details[f] for f in fields]
    with conn.cursor() as cur:
        cur.execute(
            f"update ipos set {set_clause}, updated_at = now() where id = %s",
            [*values, ipo_id],
        )
    conn.commit()


def get_tracked_chittorgarh_urls(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("select chittorgarh_url from ipos where chittorgarh_url is not null")
        return {row["chittorgarh_url"] for row in cur.fetchall()}


def get_ipo_ids_by_chittorgarh_url(conn) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute("select id, chittorgarh_url from ipos where chittorgarh_url is not null")
        return {row["chittorgarh_url"]: row["id"] for row in cur.fetchall()}


def create_discovered_ipo(conn, name: str, chittorgarh_url: str, board: str) -> None:
    """Creates a bare, minimal ipo row for a newly discovered IPO. Deliberately
    leaves most fields null -- the chittorgarh refresh step that runs right
    after discovery (in the same scraper run) fills them in."""
    slug = slugify(name)
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into companies (slug, name) values (%s, %s)
            on conflict (slug) do update set name = excluded.name
            returning id
            """,
            [slug, name],
        )
        company_id = cur.fetchone()["id"]
        cur.execute(
            """
            insert into ipos (company_id, status, chittorgarh_url, board)
            values (%s, 'upcoming', %s, %s)
            """,
            [company_id, chittorgarh_url, board],
        )
    conn.commit()


def get_latest_gmp_pct(conn, ipo_id):
    """The most recent gmp_pct already in the DB, i.e. from *before* this
    run's scrape -- used to detect a change/threshold-crossing worth alerting on."""
    with conn.cursor() as cur:
        cur.execute(
            "select gmp_pct from gmp_snapshots where ipo_id = %s and gmp_pct is not null order by as_of desc limit 1",
            [ipo_id],
        )
        row = cur.fetchone()
        return float(row["gmp_pct"]) if row else None


def get_latest_subscription(conn, ipo_id, category):
    """The most recent times_subscribed for a category already in the DB,
    i.e. from *before* this run's scrape."""
    with conn.cursor() as cur:
        cur.execute(
            "select times_subscribed from subscriptions where ipo_id = %s and category = %s order by as_of desc limit 1",
            [ipo_id, category],
        )
        row = cur.fetchone()
        return float(row["times_subscribed"]) if row else None


def insert_subscription_snapshot(conn, ipo_id, category, times_subscribed, source):
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into subscriptions (ipo_id, category, times_subscribed, source)
            values (%s, %s, %s, %s)
            """,
            [ipo_id, category, times_subscribed, source],
        )
    conn.commit()


def insert_gmp_snapshot(conn, ipo_id, gmp_value, gmp_pct, source):
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into gmp_snapshots (ipo_id, gmp_value, gmp_pct, source)
            values (%s, %s, %s, %s)
            """,
            [ipo_id, gmp_value, gmp_pct, source],
        )
    conn.commit()
