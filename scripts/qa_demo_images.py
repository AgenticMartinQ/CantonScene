#!/usr/bin/env python3
from __future__ import annotations

import math
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parents[1]
MOCK_DATA = ROOT / "web" / "src" / "mockData.js"
IMAGE_DIR = ROOT / "web" / "public" / "assets" / "demo-scenes" / "monthly"
MIN_WIDTH = 1080
MIN_HEIGHT = 1920
TARGET_ASPECT = 9 / 16
ASPECT_TOLERANCE = 0.012
MIN_BYTES = 150 * 1024
MIN_DETAIL_SCORE = 18
WARN_SIDE_PANEL_SCORE = 115
FAIL_SIDE_PANEL_SCORE = 165


def referenced_images() -> tuple[list[str], int]:
    text = MOCK_DATA.read_text(encoding="utf-8")
    names = re.findall(r'file:\s*"([^"]+)"', text)
    scene_count = len(re.findall(r'^\s+slug:\s*"[^"]+"', text, flags=re.MULTILINE))
    return names, scene_count


def detail_score(image: Image.Image) -> float:
    gray = ImageOps.grayscale(image)
    edges = gray.filter(ImageFilter.FIND_EDGES)
    return float(ImageStat.Stat(edges).var[0])


def rms_difference(a: Image.Image, b: Image.Image) -> float:
    diff = ImageChops.difference(a, b)
    mean = ImageStat.Stat(diff).mean
    return math.sqrt(sum(value * value for value in mean) / len(mean))


def side_panel_score(image: Image.Image) -> tuple[float, str]:
    width, height = image.size
    best_score = 0.0
    best_label = ""
    for side in ("left", "right"):
        for fraction in (0.06, 0.08, 0.10, 0.12, 0.15, 0.18, 0.22):
            strip_width = max(8, round(width * fraction))
            if side == "left":
                outer = image.crop((0, 0, strip_width, height))
                inner = image.crop((strip_width, 0, strip_width * 2, height))
            else:
                outer = image.crop((width - strip_width, 0, width, height))
                inner = image.crop((width - strip_width * 2, 0, width - strip_width, height))
            score = rms_difference(outer, inner)
            if score > best_score:
                best_score = score
                best_label = f"{side}:{fraction:.0%}"
    return best_score, best_label


def make_contact_sheet(rows: list[dict[str, object]]) -> Path:
    thumbs: list[Image.Image] = []
    for row in rows:
        image = Image.open(row["path"]).convert("RGB")
        thumb = ImageOps.contain(image, (210, 360))
        canvas = Image.new("RGB", (240, 420), "white")
        canvas.paste(thumb, ((240 - thumb.width) // 2, 0))
        draw = ImageDraw.Draw(canvas)
        label = (
            f"{str(row['name'])[:26]}\n"
            f"{row['width']}x{row['height']} {int(row['bytes']) // 1024}KB\n"
            f"detail {float(row['detail']):.0f} side {float(row['side_score']):.0f}"
        )
        draw.multiline_text((8, 366), label, fill=(0, 0, 0), spacing=2)
        thumbs.append(canvas)

    columns = 5
    sheet = Image.new("RGB", (columns * 240, math.ceil(len(thumbs) / columns) * 420), (235, 235, 235))
    for index, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((index % columns) * 240, (index // columns) * 420))

    out = Path(tempfile.gettempdir()) / "cantonscene-demo-image-qa.jpg"
    sheet.save(out, quality=92)
    return out


def main() -> int:
    failures: list[str] = []
    warnings: list[str] = []
    rows: list[dict[str, object]] = []

    names, scene_count = referenced_images()
    if not names:
        failures.append("mockData.js: no demo image references found")
    if scene_count and len(names) != scene_count:
        failures.append(f"mockData.js: found {len(names)} image references for {scene_count} scenes")
    duplicate_names = sorted({name for name in names if names.count(name) > 1})
    for name in duplicate_names:
        failures.append(f"{name}: referenced by more than one demo scene")

    for name in sorted(set(names)):
        path = IMAGE_DIR / name
        if not path.exists():
            failures.append(f"{name}: missing referenced demo image")
            continue

        image = Image.open(path).convert("RGB")
        width, height = image.size
        bytes_size = path.stat().st_size
        aspect = width / height
        detail = detail_score(image)
        side_score, side_label = side_panel_score(image)

        rows.append(
            {
                "name": name,
                "path": path,
                "width": width,
                "height": height,
                "bytes": bytes_size,
                "detail": detail,
                "side_score": side_score,
            }
        )

        if width < MIN_WIDTH or height < MIN_HEIGHT:
            failures.append(f"{name}: {width}x{height}, expected at least {MIN_WIDTH}x{MIN_HEIGHT}")
        if abs(aspect - TARGET_ASPECT) > ASPECT_TOLERANCE:
            failures.append(f"{name}: aspect {aspect:.3f}, expected near 9:16")
        if bytes_size < MIN_BYTES:
            failures.append(f"{name}: {bytes_size // 1024}KB, likely over-compressed")
        if detail < MIN_DETAIL_SCORE:
            failures.append(f"{name}: detail score {detail:.1f}, likely too blurry")
        if side_score >= FAIL_SIDE_PANEL_SCORE:
            failures.append(f"{name}: side-panel score {side_score:.1f} at {side_label}, likely contains an edge artifact")
        elif side_score >= WARN_SIDE_PANEL_SCORE:
            warnings.append(f"{name}: review side-panel score {side_score:.1f} at {side_label}")

    contact_sheet = make_contact_sheet(rows) if rows else None

    if warnings:
        print("Demo image QA warnings:")
        for warning in warnings:
            print(f"  - {warning}")
    if contact_sheet:
        print(f"Demo image QA contact sheet: {contact_sheet}")

    if failures:
        print("Demo image QA failed:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"Demo image QA passed for {len(rows)} referenced monthly images.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
