# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright>=1.48"]
# ///
"""Export the poster's upload PNG, print PDF, and paper thumbnail.

Usage: uv run scripts/export_poster.py

Writes into site/poster/:
  poster.png         5120 x 2880 px, the NeurIPS virtual poster upload
  poster-print.pdf   140 x 78.75 cm vector PDF for the printed poster
  thumbnail.png      320 x 256 px paper thumbnail, rendered from thumb.html

Drives the locally installed Google Chrome (no Playwright browser download) and
needs network access for Google Fonts.
"""

from pathlib import Path

from playwright.sync_api import Page, sync_playwright

POSTER = Path(__file__).resolve().parents[1] / "site" / "poster"
W, H = 5120, 2880
# NeurIPS 2026 main conference posters are at most 140 cm (W) x 90 cm (H). The poster is
# 16:9, so it fills the width and prints 78.75 cm tall.
PRINT_W_CM = 140.0
CSS_PX_PER_CM = 96 / 2.54
THUMB_W, THUMB_H = 320, 256


def load(page: Page, name: str, query: str = "") -> None:
    page.goto((POSTER / name).as_uri() + query, wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    # Google Fonts ships unused unicode-range subsets that never load, so check per family.
    missing = page.evaluate(
        "['Open Sans', 'Inconsolata'].filter(fam =>"
        " ![...document.fonts].some(f => f.family.replaceAll('\"', '') === fam && f.status === 'loaded'))"
    )
    if missing:
        raise SystemExit(f"{name}: fonts did not load: {missing}")


def check_fit(page: Page) -> None:
    """Fail if any column is taller than the stage, since export mode clips it."""
    heights = page.evaluate(
        "[document.getElementById('stage'), ...document.querySelectorAll('#stage > .col, #stage > .center')]"
        ".map(el => [el.className || el.id, el.scrollHeight])"
    )
    over = [(name, h) for name, h in heights if h > H]
    if over:
        raise SystemExit(
            f"poster content is taller than {H}px and will be clipped: {over}"
        )


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")

        page = browser.new_page(
            viewport={"width": W, "height": H}, device_scale_factor=1
        )
        load(page, "index.html", "?export")
        check_fit(page)
        page.screenshot(path=POSTER / "poster.png")
        page.emulate_media(media="screen")
        page.pdf(
            path=POSTER / "poster-print.pdf",
            width=f"{PRINT_W_CM}cm",
            height=f"{PRINT_W_CM * H / W}cm",
            scale=PRINT_W_CM * CSS_PX_PER_CM / W,
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            page_ranges="1",
        )

        page = browser.new_page(
            viewport={"width": THUMB_W, "height": THUMB_H}, device_scale_factor=1
        )
        load(page, "thumb.html")
        page.screenshot(path=POSTER / "thumbnail.png")

        browser.close()

    for name in ("poster.png", "poster-print.pdf", "thumbnail.png"):
        size = (POSTER / name).stat().st_size / 1e6
        print(f"site/poster/{name}: {size:.2f} MB")


if __name__ == "__main__":
    main()
