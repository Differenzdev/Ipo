import os

import psycopg
from psycopg.rows import dict_row


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
            select ipos.id, ipos.chittorgarh_url, ipos.investorgain_url,
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
