# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright>=1.48"]
# ///
"""Export the poster's upload PNG, print PDF, paper thumbnail, and link-preview card.

Usage: uv run scripts/export_poster.py

Writes into site/poster/:
  poster.png         5120 x 2880 px, the NeurIPS virtual poster upload
  poster-print.pdf   140 x 90 cm vector PDF for the printed poster (?print layout)
  thumbnail.png      320 x 256 px paper thumbnail, rendered from thumb.html

and site/assets/og.png, the 1200 x 630 px og:image card, rendered from og.html.

Drives the locally installed Google Chrome (no Playwright browser download) and
needs network access for Google Fonts.
"""

from pathlib import Path

from playwright.sync_api import Page, sync_playwright

SITE = Path(__file__).resolve().parents[1] / "site"
POSTER = SITE / "poster"
W, H = 5120, 2880
# NeurIPS 2026 main conference posters are 140 cm (W) x 90 cm (H), landscape. The upload PNG
# is 16:9, so the print PDF uses the taller ?print layout at the same width.
PRINT_W_CM, PRINT_H_CM = 140.0, 90.0
PRINT_H = round(W * PRINT_H_CM / PRINT_W_CM)
CSS_PX_PER_CM = 96 / 2.54
THUMB_W, THUMB_H = 320, 256
OG_W, OG_H = 1200, 630


def load(page: Page, name: str, query: str = "") -> None:
    page.goto((SITE / name).as_uri() + query, wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    # Google Fonts ships unused unicode-range subsets that never load, so check per family.
    missing = page.evaluate(
        "['Open Sans', 'Inconsolata'].filter(fam =>"
        " ![...document.fonts].some(f => f.family.replaceAll('\"', '') === fam && f.status === 'loaded'))"
    )
    if missing:
        raise SystemExit(f"{name}: fonts did not load: {missing}")


def check_fit(page: Page, h: int = H) -> None:
    """Fail if any column is taller than the stage, since export mode clips it."""
    heights = page.evaluate(
        "[document.getElementById('stage'), ...document.querySelectorAll('#stage > .col, #stage > .center')]"
        ".map(el => [el.className || el.id, el.scrollHeight])"
    )
    over = [(name, h_) for name, h_ in heights if h_ > h]
    if over:
        raise SystemExit(
            f"poster content is taller than {h}px and will be clipped: {over}"
        )


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")

        page = browser.new_page(
            viewport={"width": W, "height": H}, device_scale_factor=1
        )
        load(page, "poster/index.html", "?export")
        check_fit(page)
        page.screenshot(path=POSTER / "poster.png")

        page = browser.new_page(
            viewport={"width": W, "height": PRINT_H}, device_scale_factor=1
        )
        load(page, "poster/index.html", "?print")
        check_fit(page, PRINT_H)
        page.emulate_media(media="screen")
        page.pdf(
            path=POSTER / "poster-print.pdf",
            width=f"{PRINT_W_CM}cm",
            height=f"{PRINT_H_CM}cm",
            scale=PRINT_W_CM * CSS_PX_PER_CM / W,
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            page_ranges="1",
        )

        page = browser.new_page(
            viewport={"width": THUMB_W, "height": THUMB_H}, device_scale_factor=1
        )
        load(page, "poster/thumb.html")
        page.screenshot(path=POSTER / "thumbnail.png")

        page = browser.new_page(
            viewport={"width": OG_W, "height": OG_H}, device_scale_factor=1
        )
        load(page, "assets/og.html")
        page.screenshot(path=SITE / "assets" / "og.png")

        browser.close()

    for name in (
        "poster/poster.png",
        "poster/poster-print.pdf",
        "poster/thumbnail.png",
        "assets/og.png",
    ):
        size = (SITE / name).stat().st_size / 1e6
        print(f"site/{name}: {size:.2f} MB")


if __name__ == "__main__":
    main()
