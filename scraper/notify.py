"""Sends a single digest email (via Resend, https://resend.com/docs/api-reference/emails/send-email)
when a scraper run found anything notable: a newly discovered IPO, an IPO
opening today, a GMP change, or heavy retail oversubscription -- one run,
one email, not one email per event.

Optional: if RESEND_API_KEY or ALERT_EMAIL_TO aren't set, this is a no-op
so the rest of the scraper keeps working for anyone who hasn't set it up.
Uses Resend's plain REST API (no SDK) since `requests` is already a
dependency here.
"""

import os

import requests

RESEND_API_URL = "https://api.resend.com/emails"


def send_digest(events: list[str]) -> None:
    if not events:
        return

    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    to_email = os.environ.get("ALERT_EMAIL_TO", "").strip()
    if not api_key or not to_email:
        print("[notify] Skipped (RESEND_API_KEY or ALERT_EMAIL_TO not set).")
        return

    html = "<ul>" + "".join(f"<li>{event}</li>" for event in events) + "</ul>"
    response = requests.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "from": os.environ.get("ALERT_EMAIL_FROM", "onboarding@resend.dev"),
            "to": [to_email],
            "subject": f"IPO Dashboard: {len(events)} update(s)",
            "html": html,
        },
        timeout=15,
    )
    response.raise_for_status()
    print(f"[notify] Sent digest email with {len(events)} event(s).")
