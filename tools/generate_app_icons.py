from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as exc:
    raise SystemExit(
        "Pillow が必要です。先に `pip install -r requirements-dev.txt` を実行してください。"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "assets" / "icons"
SVG_PATH = ICON_DIR / "icon.svg"
PNG_SIZES = (180, 192, 512)


def write_svg() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="ぽんぽん花火">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#273c75"/>
      <stop offset="0.58" stop-color="#4c74b8"/>
      <stop offset="1" stop-color="#f1b8bd"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="52%">
      <stop offset="0" stop-color="#fff7c8" stop-opacity="0.85"/>
      <stop offset="0.55" stop-color="#ffd1dc" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#sky)"/>
  <circle cx="256" cy="208" r="196" fill="url(#glow)"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="#fff2a8" stroke-width="18">
      <path d="M256 118v76"/>
      <path d="M256 322v72"/>
      <path d="M142 256h74"/>
      <path d="M296 256h74"/>
    </g>
    <g stroke="#ffd1dc" stroke-width="16">
      <path d="M176 176l54 54"/>
      <path d="M282 282l54 54"/>
      <path d="M336 176l-54 54"/>
      <path d="M230 282l-54 54"/>
    </g>
    <g stroke="#b9e8ff" stroke-width="14">
      <path d="M214 138l18 66"/>
      <path d="M298 138l-18 66"/>
      <path d="M214 374l18-66"/>
      <path d="M298 374l-18-66"/>
    </g>
  </g>
  <circle cx="256" cy="256" r="34" fill="#fff7dc"/>
  <circle cx="146" cy="132" r="18" fill="#b7f3ef"/>
  <circle cx="376" cy="128" r="14" fill="#f8f0ff"/>
  <circle cx="120" cy="358" r="16" fill="#c8f7d0"/>
  <circle cx="392" cy="354" r="20" fill="#ffc89f"/>
</svg>
"""
    SVG_PATH.write_text(svg, encoding="utf-8")


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def draw_gradient(draw: ImageDraw.ImageDraw, size: int) -> None:
    top = (39, 60, 117)
    mid = (76, 116, 184)
    bottom = (241, 184, 189)
    for y in range(size):
        t = y / max(1, size - 1)
        if t < 0.62:
            local = t / 0.62
            color = tuple(lerp(top[i], mid[i], local) for i in range(3))
        else:
            local = (t - 0.62) / 0.38
            color = tuple(lerp(mid[i], bottom[i], local) for i in range(3))
        draw.line([(0, y), (size, y)], fill=color)


def draw_firework(draw: ImageDraw.ImageDraw, scale: float) -> None:
    cx = cy = 256 * scale
    rays = [
        ((0, -126), "#fff2a8", 18),
        ((0, 126), "#fff2a8", 18),
        ((-126, 0), "#fff2a8", 18),
        ((126, 0), "#fff2a8", 18),
        ((-88, -88), "#ffd1dc", 16),
        ((88, 88), "#ffd1dc", 16),
        ((88, -88), "#ffd1dc", 16),
        ((-88, 88), "#ffd1dc", 16),
        ((-44, -118), "#b9e8ff", 14),
        ((44, -118), "#b9e8ff", 14),
        ((-44, 118), "#b9e8ff", 14),
        ((44, 118), "#b9e8ff", 14),
    ]
    for (dx, dy), color, width in rays:
        start_x = cx + dx * 0.36 * scale
        start_y = cy + dy * 0.36 * scale
        end_x = cx + dx * scale
        end_y = cy + dy * scale
        draw.line((start_x, start_y, end_x, end_y), fill=color, width=round(width * scale))

    center = 34 * scale
    draw.ellipse((cx - center, cy - center, cx + center, cy + center), fill="#fff7dc")


def render_png(size: int) -> None:
    scale_factor = 4
    work_size = size * scale_factor
    scale = work_size / 512
    radius = round(112 * scale)
    image = Image.new("RGBA", (work_size, work_size), (0, 0, 0, 0))
    gradient = Image.new("RGBA", (work_size, work_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(gradient)
    draw_gradient(draw, work_size)

    mask = Image.new("L", (work_size, work_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, work_size - 1, work_size - 1), radius=radius, fill=255)
    image.alpha_composite(Image.composite(gradient, image, mask))

    glow = Image.new("RGBA", (work_size, work_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for i in range(46, 0, -1):
        alpha = int(3.2 * i)
        r = i * 4.2 * scale
        glow_draw.ellipse(
            (work_size / 2 - r, work_size * 0.42 - r, work_size / 2 + r, work_size * 0.42 + r),
            fill=(255, 247, 200, min(alpha, 145)),
        )
    image.alpha_composite(glow)

    icon_draw = ImageDraw.Draw(image)
    draw_firework(icon_draw, scale)
    dots = [
        (146, 132, 18, "#b7f3ef"),
        (376, 128, 14, "#f8f0ff"),
        (120, 358, 16, "#c8f7d0"),
        (392, 354, 20, "#ffc89f"),
        (250, 408, 12, "#fff2a8"),
    ]
    for x, y, r, color in dots:
        icon_draw.ellipse(
            ((x - r) * scale, (y - r) * scale, (x + r) * scale, (y + r) * scale),
            fill=color,
        )

    image = image.resize((size, size), Image.Resampling.LANCZOS)
    image.save(ICON_DIR / f"icon-{size}.png")


def main() -> None:
    write_svg()
    for size in PNG_SIZES:
        render_png(size)
    print(f"generated: {SVG_PATH.relative_to(ROOT)}")
    for size in PNG_SIZES:
        print(f"generated: assets/icons/icon-{size}.png")


if __name__ == "__main__":
    main()
