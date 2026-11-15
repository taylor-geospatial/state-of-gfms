# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely>=2.0"]
# ///
"""Build site/assets/globe.json, the data behind the hero's institution globe.

Usage: uv run scripts/build_globe_data.py [path/to/institutions.json]

Institutions come from the satml-leaderboard repo, which resolves each paper's
author affiliations through OpenAlex and geocodes them with ROR
(app/scripts/fetch-institutions.mjs there). Both repos cover the same 152
papers. The default path assumes the two repos are cloned side by side.

Land is a grid of dots sampled from Natural Earth's 1:110m land polygons, so
the page needs no map library.
"""

import json
import math
import sys
import urllib.request
from pathlib import Path

import shapely
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = (
    ROOT.parent / "satml-leaderboard" / "app" / "src" / "data" / "institutions.json"
)
OUT = ROOT / "site" / "assets" / "globe.json"
LAND_URL = "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_land.geojson"
SPACING = 2.4  # degrees between land dots


def land_dots() -> list[int]:
    with urllib.request.urlopen(LAND_URL, timeout=60) as resp:
        features = json.load(resp)["features"]
    land = shapely.union_all([shape(f["geometry"]) for f in features])
    shapely.prepare(land)
    lons: list[float] = []
    lats: list[float] = []
    lat = -80.0
    while lat <= 84:
        # Wider steps toward the poles keep the dots evenly spaced on the sphere.
        step = SPACING / max(math.cos(math.radians(lat)), 0.2)
        lon = -180.0
        while lon < 180:
            lons.append(lon)
            lats.append(lat)
            lon += step
        lat += SPACING
    inside = shapely.contains_xy(land, lons, lats)
    flat: list[int] = []
    for lon, lat, hit in zip(lons, lats, inside, strict=True):
        if hit:
            flat += [round(lon * 10), round(lat * 10)]
    return flat


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    inst = json.loads(src.read_text(encoding="utf-8"))
    models = {
        json.loads(line)["model_name"]
        for line in (ROOT / "data" / "extracted_info.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()
        if line.strip()
    }
    unknown = sorted({p[2] for p in inst["papers"]} - models)
    if unknown:
        raise SystemExit(f"papers not in data/extracted_info.jsonl: {unknown}")
    land = land_dots()
    out = {
        "generated": inst["generated"],
        "source": "OpenAlex affiliations, ROR coordinates, Natural Earth 1:110m land",
        "land": land,  # flat [lon*10, lat*10, ...]
        "institutions": inst["institutions"],  # [name, country, lat, lon, city]
        "papers": inst["papers"],  # [year, [institution index, ...], model]
        "unresolved": inst["unresolved"],
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(
        f"{OUT.relative_to(ROOT)}: {len(land) // 2} land dots, {len(inst['institutions'])} institutions, "
        f"{len(inst['papers'])} papers, {len(inst['unresolved'])} unresolved, {OUT.stat().st_size / 1e3:.0f} kB"
    )


if __name__ == "__main__":
    main()
