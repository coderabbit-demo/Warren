#!/usr/bin/env python3
"""Check workshop links against the current body files."""
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import re

root = Path(__file__).resolve().parents[2]
text = (root / "WORKSHOP.md").read_text()
urls = re.findall(r"\[Open pull request\]\((https://[^)]+)\)", text)
if len(urls) != 8:
    raise SystemExit(f"Expected eight links, found {len(urls)}")
for pair in range(1, 5):
    for label, title, body_file, branch in (
        ("Review", "Add partial refunds API", "partial-refunds.md", f"pair-{pair}/partial-refunds"),
        ("Explain", "Migrate payments to provider adapter with PayGrid V2 support", "provider-v2.md", f"pair-{pair}/migrate-payment-provider-v2"),
    ):
        url = urls[2 * (pair - 1) + (0 if label == "Review" else 1)]
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        expected_body = (root / "scripts/workshop/pr-bodies" / body_file).read_text()
        if (
            len(url) >= 8000
            or parsed.path != f"/coderabbit-demo/Warren/compare/main...{branch}"
            or query.get("quick_pull") != ["1"]
            or query.get("title") != [title]
            or query.get("body") != [expected_body]
        ):
            raise SystemExit(f"Link check failed for pair {pair} {label}")
print("Workshop links: eight titles and bodies verified")
