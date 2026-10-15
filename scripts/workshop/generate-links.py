#!/usr/bin/env python3
"""Build attendee links from the PR body files."""
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
BODIES = ROOT / "scripts/workshop/pr-bodies"


def link(branch: str, title: str, body: str) -> str:
    url = (
        f"https://github.com/coderabbit-demo/Warren/compare/main...{branch}"
        f"?quick_pull=1&title={quote(title, safe='')}&body={quote(body, safe='')}"
    )
    if len(url) >= 8000:
        raise ValueError(f"Workshop link is too long: {branch}")
    return url


review_title = "Add partial refunds API"
explain_title = "Migrate payments to provider adapter with PayGrid V2 support"
review_body = (BODIES / "partial-refunds.md").read_text()
explain_body = (BODIES / "provider-v2.md").read_text()
lines = [
    "# Workshop links",
    "",
    "Open your pair's link, click **Create pull request**, then wait for CodeRabbit's comment before reading the diff.",
    "",
]
for pair in range(1, 5):
    lines.extend(
        [
            f"## Pair {pair}",
            "",
            f"- **Review:** [Open pull request]({link(f'pair-{pair}/partial-refunds', review_title, review_body)})",
            f"- **Explain:** [Open pull request]({link(f'pair-{pair}/migrate-payment-provider-v2', explain_title, explain_body)})",
            "",
        ]
    )
(ROOT / "WORKSHOP.md").write_text("\n".join(lines))
