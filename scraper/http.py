import requests

# Identifies the scraper honestly. A real browser UA is required for these sites --
# their CDN (Cloudflare) 403s generic/library user agents outright, even though
# robots.txt itself permits crawling (verified: chittorgarh.com and investorgain.com
# both only block named AI/scraper bots, not a normally-identified one).
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 "
    "(ipo-dashboard personal-use scraper, low frequency)"
)


def fetch(url: str, timeout: int = 20) -> str:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
    response.raise_for_status()
    return response.text
