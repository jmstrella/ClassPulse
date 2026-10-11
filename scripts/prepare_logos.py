from __future__ import annotations

import base64
import io
import re
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DASH = ROOT / "dashboard" / "public"
EXT = ROOT / "extension" / "icons"


def extract_pngs(svg_path: Path) -> list[Image.Image]:
    text = svg_path.read_text(encoding="utf-8")
    matches = re.findall(r"data:image/png;base64,([A-Za-z0-9+/=\s]+)", text)
    images: list[Image.Image] = []
    for match in matches:
        data = re.sub(r"\s+", "", match)
        images.append(Image.open(io.BytesIO(base64.b64decode(data))).convert("RGBA"))
    return images


def apply_mask(color: Image.Image, mask: Image.Image) -> Image.Image:
    lum = mask.convert("L")
    red, green, blue, _ = color.split()
    return Image.merge("RGBA", (red, green, blue, lum))


def png_to_svg(image: Image.Image, path: Path) -> None:
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    width, height = image.size
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet">\n'
        f'  <image width="{width}" height="{height}" href="data:image/png;base64,{b64}"/>\n'
        "</svg>\n"
    )
    path.write_text(svg, encoding="utf-8")


def fit_square(image: Image.Image, size: int, pad_ratio: float = 0.0) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = max(1, int(size * (1 - pad_ratio)))
    scaled = image.copy()
    scaled.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (size - scaled.width) // 2
    y = (size - scaled.height) // 2
    canvas.paste(scaled, (x, y), scaled)
    return canvas


def cropped_logo(svg_path: Path) -> Image.Image:
    mask, color = extract_pngs(svg_path)
    composited = apply_mask(color, mask)
    bbox = composited.split()[-1].getbbox()
    if bbox is None:
        raise RuntimeError(f"No visible content in {svg_path}")
    return composited.crop(bbox)


def main() -> None:
    mark = cropped_logo(DASH / "1.svg")
    lockup = cropped_logo(DASH / "2.svg")
    print(f"mark {mark.size} lockup {lockup.size}")

    png_to_svg(mark, DASH / "icon.svg")
    png_to_svg(mark, DASH / "favicon.svg")
    png_to_svg(lockup, DASH / "logo-lockup.svg")

    EXT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(DASH / "icon.svg", EXT / "icon.svg")

    fit_square(mark, 192).save(DASH / "icon-192.png", optimize=True)
    fit_square(mark, 512).save(DASH / "icon-512.png", optimize=True)

    for size, pad in ((16, 0.06), (32, 0.06), (48, 0.04), (128, 0.04)):
        fit_square(mark, size, pad).save(EXT / f"icon-{size}.png", optimize=True)

    for name in ("1_preview.png", "2_preview.png", "1_crop.png", "2_crop.png"):
        path = DASH / name
        if path.exists():
            path.unlink()
            print(f"removed {path}")

    print("dashboard:", sorted(p.name for p in DASH.iterdir() if p.suffix.lower() in {".svg", ".png"}))
    print("extension:", sorted(p.name for p in EXT.iterdir()))


if __name__ == "__main__":
    main()
