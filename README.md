# No One Knows the State of the Art in Geospatial Foundation Models

Project page, slides, and data for our NeurIPS 2026 position paper.

- Site: <https://research.taylorgeospatial.org/state-of-gfms/>
- Video: <https://research.taylorgeospatial.org/state-of-gfms/presentation/> (5 min talk; add `?embed` for an iframe-ready player)
- Slides: <https://research.taylorgeospatial.org/state-of-gfms/slides/>
- Poster: <https://research.taylorgeospatial.org/state-of-gfms/poster/> ([PNG](site/poster/poster.png), 5120×2880; [print PDF](site/poster/poster-print.pdf), 140×78.75 cm)
- Paper: [arXiv:2605.12678](https://arxiv.org/abs/2605.12678)

## Data

[`data/extracted_info.jsonl`](data/extracted_info.jsonl) has the 152 paper records and [`data/reported_numbers.jsonl`](data/reported_numbers.jsonl) has the 11,488 normalized benchmark scores behind the paper's numbers. The data dictionary is in [`data/README.md`](data/README.md).

## Layout

```
site/                  static landing page (no build step)
  index.html, styles.css, main.js
  assets/              TG logos + paper figures (SVG)
  slides/index.html    self-contained NeurIPS slide deck
  presentation/        5 min talk: player page, VP9 WebM (4K), poster frame
  poster/              interactive poster + poster.png for the NeurIPS upload
data/                  dataset + data dictionary
scripts/check_site.py  CI check: local links, slides, dataset counts
```

## Local preview

```bash
mkdir -p _site/data && cp -R site/. _site/ && cp data/*.jsonl _site/data/
python3 scripts/check_site.py _site
python3 -m http.server 8000 --directory _site
```

## Poster exports

The web poster is fluid. Opening `poster/?export` fixes it at 5120×2880 px, the NeurIPS limit. `uv run scripts/export_poster.py` renders that URL with the local Google Chrome and writes three files to `site/poster/`:

- `poster.png`: 5120×2880 virtual poster upload
- `poster-print.pdf`: 140×78.75 cm vector PDF for printing (NeurIPS 2026 max is 140×90 cm landscape; the 16:9 poster fills the width). Send this to the printer, not the PNG, which is only ~93 ppi at that size.
- `thumbnail.png`: 320×256 paper thumbnail, rendered from `poster/thumb.html`

The script fails if any column is taller than 2880 px, since export mode clips the overflow.

## Deploy

`.github/workflows/pages.yml` assembles `_site/` and runs the check on every push and PR; pushes to `main` deploy to GitHub Pages.

## Citation

```bibtex
@inproceedings{corley2026noone,
  title     = {No One Knows the State of the Art in Geospatial Foundation Models},
  author    = {Corley, Isaac and Lehmann, Nils and Robinson, Caleb and Tseng, Gabriel and Fuller, Anthony and Alemohammad, Hamed and Shelhamer, Evan and Marcus, Jennifer and Kerner, Hannah},
  booktitle = {Advances in Neural Information Processing Systems (NeurIPS), Position Paper Track},
  year      = {2026},
  eprint    = {2605.12678},
  archivePrefix = {arXiv}
}
```
