"""
NewShare App Icon Generator using Pillow
Creates all required icon PNG files
"""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "../assets/images")

# Color palette
DARK_BG1 = (26, 26, 46)      # #1a1a2e
DARK_BG2 = (22, 33, 62)      # #16213e
ACCENT1  = (233, 69, 96)     # #e94560 (red-pink)
ACCENT2  = (245, 166, 35)    # #f5a623 (orange)
WHITE    = (255, 255, 255)
DEEP_BLUE = (15, 52, 96)     # #0f3460


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def make_gradient_bg(size, c1=DARK_BG1, c2=DARK_BG2):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        # diagonal gradient
        color = lerp_color(c1, c2, t)
        draw.line([(0, y), (size, y)], fill=color + (255,))
    return img


def rounded_rect_mask(size, radius_ratio=0.215):
    """Create a rounded rectangle mask."""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    r = int(size * radius_ratio)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask


def draw_N(draw, size, gradient=True):
    """Draw the N letterform with gradient fill."""
    s = size / 1024  # scale factor

    bar_w = int(110 * s)
    bar_h = int(444 * s)
    top_y = int(290 * s)
    left_x = int(248 * s)
    right_x = int(666 * s)

    # Draw gradient N by drawing horizontal scanlines
    # Left vertical bar
    for y in range(bar_h):
        t = y / bar_h
        color = lerp_color(ACCENT1, ACCENT2, t)
        draw.rectangle([left_x, top_y + y, left_x + bar_w, top_y + y], fill=color + (255,))

    # Right vertical bar
    for y in range(bar_h):
        t = y / bar_h
        color = lerp_color(ACCENT1, ACCENT2, t)
        draw.rectangle([right_x, top_y + y, right_x + bar_w, top_y + y], fill=color + (255,))

    # Diagonal stroke: polygon from (248,290) (358,290) (776,734) (666,734)
    pts = [
        (int(248 * s), int(290 * s)),
        (int(358 * s), int(290 * s)),
        (int(776 * s), int(734 * s)),
        (int(666 * s), int(734 * s)),
    ]
    # Draw diagonal with gradient scanlines (approximate)
    for y in range(bar_h):
        t = y / bar_h
        color = lerp_color(ACCENT1, ACCENT2, t)
        y_coord = top_y + y
        # Find x bounds of diagonal at this y
        # Left edge: line from (248,290) to (666,734) → slope (666-248)/(734-290) = 418/444
        # Right edge: line from (358,290) to (776,734)
        dy = y_coord - int(290 * s)
        total_dy = int(444 * s)
        left_edge = int(248 * s) + int(dy * 418 * s / (444 * s))
        right_edge = int(358 * s) + int(dy * 418 * s / (444 * s))
        if right_edge > left_edge:
            draw.rectangle([left_edge, y_coord, right_edge, y_coord], fill=color + (255,))


def draw_share_dots(draw, size):
    """Draw the share/broadcast dots in top-right area."""
    s = size / 1024

    cx = int(680 * s)
    cy = int(240 * s)

    r_main = int(28 * s)
    r_small = int(20 * s)
    offset_x = int(72 * s)
    offset_y = int(52 * s)

    line_w = max(1, int(6 * s))

    # Center dot (white)
    draw.ellipse([cx - r_main, cy - r_main, cx + r_main, cy + r_main],
                 fill=WHITE + (242,))

    # Top-left dot
    x1, y1 = cx - offset_x, cy - offset_y
    draw.ellipse([x1 - r_small, y1 - r_small, x1 + r_small, y1 + r_small],
                 fill=WHITE + (178,))

    # Bottom-left dot
    x2, y2 = cx - offset_x, cy + offset_y
    draw.ellipse([x2 - r_small, y2 - r_small, x2 + r_small, y2 + r_small],
                 fill=WHITE + (178,))

    # Connecting lines
    draw.line([x1, y1, cx, cy], fill=WHITE + (150,), width=line_w)
    draw.line([x2, y2, cx, cy], fill=WHITE + (150,), width=line_w)


def generate_main_icon(size=1024):
    img = make_gradient_bg(size)
    mask = rounded_rect_mask(size)

    # Accent circles
    draw = ImageDraw.Draw(img)
    s = size / 1024
    # Top-right circle
    cx, cy, r = int(820 * s), int(200 * s), int(180 * s)
    circle_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(circle_img)
    cdraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=DEEP_BLUE + (38,))
    img = Image.alpha_composite(img, circle_img)

    # Bottom-left circle
    circle_img2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cdraw2 = ImageDraw.Draw(circle_img2)
    cx2, cy2, r2 = int(200 * s), int(820 * s), int(140 * s)
    cdraw2.ellipse([cx2 - r2, cy2 - r2, cx2 + r2, cy2 + r2], fill=DEEP_BLUE + (25,))
    img = Image.alpha_composite(img, circle_img2)

    # Draw N and dots on a separate layer for glow effect
    n_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    n_draw = ImageDraw.Draw(n_layer)
    draw_N(n_draw, size)
    draw_share_dots(n_draw, size)

    # Apply subtle glow
    glow = n_layer.filter(ImageFilter.GaussianBlur(int(8 * s)))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, n_layer)

    # Apply rounded corners
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    return result


def generate_android_foreground(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s = size / 1024
    scale = 0.85

    # Draw scaled N
    n_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    n_draw = ImageDraw.Draw(n_layer)

    bar_w = int(110 * s * scale)
    bar_h = int(444 * s * scale)
    offset_x = int((1 - scale) * 512 * s)
    offset_y = int((1 - scale) * 512 * s)
    top_y = int(290 * s * scale) + offset_y
    left_x = int(248 * s * scale) + offset_x
    right_x = int(666 * s * scale) + offset_x

    for y in range(bar_h):
        t = y / bar_h
        color = lerp_color(ACCENT1, ACCENT2, t)
        n_draw.rectangle([left_x, top_y + y, left_x + bar_w, top_y + y], fill=color + (255,))
        n_draw.rectangle([right_x, top_y + y, right_x + bar_w, top_y + y], fill=color + (255,))
        dy = y
        left_edge = left_x + int(dy * 418 * s * scale / (444 * s * scale))
        right_edge = left_x + bar_w + int(dy * 418 * s * scale / (444 * s * scale))
        n_draw.rectangle([left_edge, top_y + y, right_edge, top_y + y], fill=color + (255,))

    # Share dots (adjusted position)
    cx = int(680 * s * scale) + offset_x
    cy = int(240 * s * scale) + offset_y
    r_main = int(28 * s)
    r_small = int(20 * s)
    ox = int(72 * s)
    oy = int(52 * s)
    lw = max(1, int(6 * s))
    n_draw.ellipse([cx - r_main, cy - r_main, cx + r_main, cy + r_main], fill=WHITE + (242,))
    n_draw.ellipse([cx - ox - r_small, cy - oy - r_small, cx - ox + r_small, cy - oy + r_small], fill=WHITE + (178,))
    n_draw.ellipse([cx - ox - r_small, cy + oy - r_small, cx - ox + r_small, cy + oy + r_small], fill=WHITE + (178,))
    n_draw.line([cx - ox, cy - oy, cx, cy], fill=WHITE + (150,), width=lw)
    n_draw.line([cx - ox, cy + oy, cx, cy], fill=WHITE + (150,), width=lw)

    glow = n_layer.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, n_layer)
    return img


def generate_android_background(size=1024):
    img = make_gradient_bg(size)
    draw = ImageDraw.Draw(img)
    s = size / 1024
    # Decorative circles
    circle_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(circle_img)
    cx, cy, r = int(820 * s), int(200 * s), int(180 * s)
    cdraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=DEEP_BLUE + (76,))
    cx2, cy2, r2 = int(200 * s), int(820 * s), int(140 * s)
    cdraw.ellipse([cx2 - r2, cy2 - r2, cx2 + r2, cy2 + r2], fill=DEEP_BLUE + (51,))
    img = Image.alpha_composite(img, circle_img)
    # Convert to RGB for Android background (no transparency)
    result = Image.new("RGB", (size, size))
    result.paste(img, mask=img.split()[3])
    return result.convert("RGBA")


def generate_android_monochrome(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size / 1024
    scale = 0.85
    offset = int((1 - scale) * 512 * s)

    bar_w = int(110 * s * scale)
    bar_h = int(444 * s * scale)
    top_y = int(290 * s * scale) + offset
    left_x = int(248 * s * scale) + offset
    right_x = int(666 * s * scale) + offset

    draw.rectangle([left_x, top_y, left_x + bar_w, top_y + bar_h], fill=WHITE + (255,))
    draw.rectangle([right_x, top_y, right_x + bar_w, top_y + bar_h], fill=WHITE + (255,))
    for y in range(bar_h):
        dy = y
        left_edge = left_x + int(dy * 418 * s * scale / (444 * s * scale))
        right_edge = left_x + bar_w + int(dy * 418 * s * scale / (444 * s * scale))
        draw.rectangle([left_edge, top_y + y, right_edge, top_y + y], fill=WHITE + (255,))

    cx = int(680 * s * scale) + offset
    cy = int(240 * s * scale) + offset
    r_main = int(28 * s)
    r_small = int(20 * s)
    ox, oy = int(72 * s), int(52 * s)
    lw = max(1, int(6 * s))
    draw.ellipse([cx - r_main, cy - r_main, cx + r_main, cy + r_main], fill=WHITE + (255,))
    draw.ellipse([cx - ox - r_small, cy - oy - r_small, cx - ox + r_small, cy - oy + r_small], fill=WHITE + (204,))
    draw.ellipse([cx - ox - r_small, cy + oy - r_small, cx - ox + r_small, cy + oy + r_small], fill=WHITE + (204,))
    draw.line([cx - ox, cy - oy, cx, cy], fill=WHITE + (200,), width=lw)
    draw.line([cx - ox, cy + oy, cx, cy], fill=WHITE + (200,), width=lw)
    return img


def generate_favicon(size=64):
    img = make_gradient_bg(size, DARK_BG1, DARK_BG2)
    mask = rounded_rect_mask(size, 0.22)
    draw = ImageDraw.Draw(img)
    s = size / 64

    bar_w = int(8 * s)
    bar_h = int(32 * s)
    top_y = int(16 * s)
    left_x = int(14 * s)
    right_x = int(42 * s)

    for y in range(bar_h):
        t = y / bar_h
        color = lerp_color(ACCENT1, ACCENT2, t)
        draw.rectangle([left_x, top_y + y, left_x + bar_w, top_y + y], fill=color + (255,))
        draw.rectangle([right_x, top_y + y, right_x + bar_w, top_y + y], fill=color + (255,))

    # Diagonal
    for y in range(bar_h):
        t = y / bar_h
        color = lerp_color(ACCENT1, ACCENT2, t)
        dy = y
        left_edge = left_x + int(dy * (right_x - left_x) / bar_h)
        right_edge = left_x + bar_w + int(dy * (right_x - left_x) / bar_h)
        draw.rectangle([left_edge, top_y + y, right_edge, top_y + y], fill=color + (255,))

    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    return result


def generate_splash_icon(size=512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s = size / 512
    n_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    n_draw = ImageDraw.Draw(n_layer)

    bar_w = int(56 * s)
    bar_h = int(272 * s)
    top_y = int(120 * s)
    left_x = int(100 * s)
    right_x = int(356 * s)

    for y in range(bar_h):
        t = y / bar_h
        color = lerp_color(ACCENT1, ACCENT2, t)
        n_draw.rectangle([left_x, top_y + y, left_x + bar_w, top_y + y], fill=color + (255,))
        n_draw.rectangle([right_x, top_y + y, right_x + bar_w, top_y + y], fill=color + (255,))
        dy = y
        left_edge = left_x + int(dy * (right_x - left_x) / bar_h)
        right_edge = left_x + bar_w + int(dy * (right_x - left_x) / bar_h)
        n_draw.rectangle([left_edge, top_y + y, right_edge, top_y + y], fill=color + (255,))

    # Share dots
    cx, cy = int(360 * s), int(100 * s)
    r_main = int(16 * s)
    r_small = int(12 * s)
    ox, oy = int(40 * s), int(30 * s)
    lw = max(1, int(4 * s))
    n_draw.ellipse([cx - r_main, cy - r_main, cx + r_main, cy + r_main], fill=WHITE + (242,))
    n_draw.ellipse([cx - ox - r_small, cy - oy - r_small, cx - ox + r_small, cy - oy + r_small], fill=WHITE + (178,))
    n_draw.ellipse([cx - ox - r_small, cy + oy - r_small, cx - ox + r_small, cy + oy + r_small], fill=WHITE + (178,))
    n_draw.line([cx - ox, cy - oy, cx, cy], fill=WHITE + (150,), width=lw)
    n_draw.line([cx - ox, cy + oy, cx, cy], fill=WHITE + (150,), width=lw)

    glow = n_layer.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, n_layer)
    return img


def save(img, filename):
    path = os.path.join(ASSETS_DIR, filename)
    img.save(path, "PNG")
    size = os.path.getsize(path)
    print(f"✓ {filename} ({size // 1024}KB)")


if __name__ == "__main__":
    print("Generating NewShare icons...\n")

    save(generate_main_icon(1024), "icon.png")
    save(generate_android_foreground(1024), "android-icon-foreground.png")
    save(generate_android_background(1024), "android-icon-background.png")
    save(generate_android_monochrome(1024), "android-icon-monochrome.png")
    save(generate_favicon(64), "favicon.png")
    save(generate_splash_icon(512), "splash-icon.png")

    print("\n✅ All icons generated!")
