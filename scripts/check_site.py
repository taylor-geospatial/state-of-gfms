"""Sanity-check the assembled Pages site before it ships.

Usage: python3 scripts/check_site.py _site

Fails if a local link/asset in index.html is missing, the slides are missing,
the dataset no longer matches the headline numbers quoted on the page, or a
page's og:image (the link-preview card) is missing or points at no file.
"""

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

# Numbers quoted on the landing page; they come from the paper.
EXPECTED = {
    "papers": 152,
    "results": 11488,
    "released": 93,
    "explicit_no": 26,
    "not_found": 33,
}
SITE_URL = "https://research.taylorgeospatial.org/state-of-gfms/"
PAGES = (
    "index.html",
    "poster/index.html",
    "slides/index.html",
    "presentation/index.html",
)


class RefCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[str] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if value is None:
                continue
            if name in ("href", "src"):
                self.refs.append(value)
            elif name == "id":
                self.ids.add(value)


def check_links(site: Path, errors: list[str]) -> None:
    html = (site / "index.html").read_text(encoding="utf-8")
    parser = RefCollector()
    parser.feed(html)
    css = (site / "styles.css").read_text(encoding="utf-8")
    refs = parser.refs + re.findall(r'url\("?([^")]+)"?\)', css)
    for ref in refs:
        parts = urlsplit(ref)
        if parts.scheme or ref.startswith("//"):
            continue
        if not parts.path:
            if parts.fragment and parts.fragment not in parser.ids:
                errors.append(f"broken anchor: {ref}")
            continue
        target = site / parts.path
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            errors.append(f"missing local file: {ref}")


def check_social(site: Path, errors: list[str]) -> None:
    for page in PAGES:
        html = (site / page).read_text(encoding="utf-8")
        found = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        if not found:
            errors.append(f"{page}: no og:image")
        elif not found[1].startswith(SITE_URL):
            errors.append(f"{page}: og:image is not under {SITE_URL}: {found[1]}")
        elif not (site / found[1].removeprefix(SITE_URL)).is_file():
            errors.append(f"{page}: og:image file missing: {found[1]}")
        if 'name="twitter:card" content="summary_large_image"' not in html:
            errors.append(f"{page}: twitter:card is not summary_large_image")


def read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def check_dataset(site: Path, errors: list[str]) -> None:
    papers = read_jsonl(site / "data" / "extracted_info.jsonl")
    results = read_jsonl(site / "data" / "reported_numbers.jsonl")
    weights = [p["weights_available"] for p in papers]
    got = {
        "papers": len(papers),
        "results": len(results),
        "released": weights.count(True),
        "explicit_no": weights.count(False),
        "not_found": weights.count(None),
    }
    for key, want in EXPECTED.items():
        if got[key] != want:
            errors.append(f"dataset {key}: expected {want}, got {got[key]}")


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    site = Path(sys.argv[1])
    errors: list[str] = []
    check_links(site, errors)
    check_dataset(site, errors)
    check_social(site, errors)
    if not (site / "slides" / "index.html").is_file():
        errors.append("missing slides/index.html")
    for name in ("index.html", "no-one-knows-sota-gfm.webm", "poster.jpg"):
        if not (site / "presentation" / name).is_file():
            errors.append(f"missing presentation/{name}")
    for err in errors:
        print(f"error: {err}")
    if not errors:
        print(f"ok: {site} links, slides, and dataset numbers check out")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
