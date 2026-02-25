#!/usr/bin/env python3
"""Generate creative DuoLink app icons.

Design: Two bold nodes with flowing curves that merge into a glowing
connection point, on a vibrant gradient. Represents two parties
(car owner + driver) converging through DuoLink.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')

WHITE = (255, 255, 255)


# ── Drawing helpers ──────────────────────────────────────────────

def bezier(t, p0, p1, p2, p3):
    u = 1 - t
    return (
        u**3*p0[0] + 3*u**2*t*p1[0] + 3*u*t**2*p2[0] + t**3*p3[0],
        u**3*p0[1] + 3*u**2*t*p1[1] + 3*u*t**2*p2[1] + t**3*p3[1],
    )


def bezier_pts(p0, p1, p2, p3, n=120):
    return [bezier(i / n, p0, p1, p2, p3) for i in range(n + 1)]


def create_gradient(size, c1, c2, angle_deg=135):
    """Linear gradient at an angle."""
    img = Image.new('RGBA', (size, size))
    px = img.load()
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    for y in range(size):
        for x in range(size):
            # project onto gradient direction
            nx, ny = x / size - 0.5, y / size - 0.5
            proj = nx * cos_a + ny * sin_a + 0.5
            t = max(0.0, min(1.0, proj))
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            px[x, y] = (r, g, b, 255)
    return img


def radial_glow(size, cx, cy, radius, color, peak_alpha=80):
    """Radial glow/highlight."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(max(0, int(cy - radius)), min(size, int(cy + radius) + 1)):
        for x in range(max(0, int(cx - radius)), min(size, int(cx + radius) + 1)):
            d = math.hypot(x - cx, y - cy)
            if d < radius:
                a = int(peak_alpha * (1 - (d / radius) ** 1.5))
                px[x, y] = (*color, a)
    return img


def draw_thick_curve(draw, points, width, color):
    """Draw a thick polyline with rounded joints and caps."""
    coords = [(int(p[0]), int(p[1])) for p in points]
    draw.line(coords, fill=color, width=width, joint='curve')
    # round caps
    r = width // 2
    for pt in [coords[0], coords[-1]]:
        draw.ellipse([pt[0]-r, pt[1]-r, pt[0]+r, pt[1]+r], fill=color)


def draw_ring(draw, cx, cy, outer_r, thickness, color):
    """Draw a ring (outlined circle) centered at cx,cy."""
    draw.ellipse(
        [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
        fill=None, outline=color, width=thickness
    )


# ── Symbol drawing ───────────────────────────────────────────────

def draw_symbol(size, scale=1.0):
    """Draw the DuoLink 'merge' symbol.

    Two nodes at top with flowing curves meeting at a bright connection
    point at center-bottom. Plus decorative rings for visual richness.
    """
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = scale
    cx, cy = size / 2, size / 2

    # ── Node positions ──
    # Two nodes upper area, spread apart
    n1 = (cx - size * 0.19 * s, cy - size * 0.18 * s)   # upper-left
    n2 = (cx + size * 0.19 * s, cy - size * 0.18 * s)   # upper-right
    meet = (cx, cy + size * 0.20 * s)                     # meeting point

    # ── Node sizes ──
    r_node = int(size * 0.075 * s)
    r_meet = int(size * 0.050 * s)
    curve_w = max(3, int(size * 0.030 * s))

    # ── Bezier curves from each node to meeting point ──
    # Left curve: gentle S from n1 down-right to meet
    pts_left = bezier_pts(
        n1,
        (n1[0] + size * 0.02 * s, n1[1] + size * 0.22 * s),
        (meet[0] - size * 0.15 * s, meet[1] - size * 0.12 * s),
        meet,
    )
    # Right curve: gentle S from n2 down-left to meet
    pts_right = bezier_pts(
        n2,
        (n2[0] - size * 0.02 * s, n2[1] + size * 0.22 * s),
        (meet[0] + size * 0.15 * s, meet[1] - size * 0.12 * s),
        meet,
    )

    # ── Draw curves ──
    c_white = WHITE + (255,)
    c_soft = WHITE + (140,)   # semi-transparent white

    draw_thick_curve(draw, pts_left, curve_w, c_white)
    draw_thick_curve(draw, pts_right, curve_w, c_white)

    # ── Decorative rings around nodes ──
    ring_r = int(r_node * 1.55)
    ring_w = max(2, int(size * 0.006 * s))
    draw_ring(draw, int(n1[0]), int(n1[1]), ring_r, ring_w, c_soft)
    draw_ring(draw, int(n2[0]), int(n2[1]), ring_r, ring_w, c_soft)

    # ── Tiny orbit dots on rings (visual flair) ──
    dot_r = max(2, int(size * 0.008 * s))
    # dot on left ring (top-right position)
    angle1 = math.radians(-30)
    dx1 = int(n1[0] + ring_r * math.cos(angle1))
    dy1 = int(n1[1] + ring_r * math.sin(angle1))
    draw.ellipse([dx1-dot_r, dy1-dot_r, dx1+dot_r, dy1+dot_r], fill=c_white)
    # dot on right ring (top-left position)
    angle2 = math.radians(210)
    dx2 = int(n2[0] + ring_r * math.cos(angle2))
    dy2 = int(n2[1] + ring_r * math.sin(angle2))
    draw.ellipse([dx2-dot_r, dy2-dot_r, dx2+dot_r, dy2+dot_r], fill=c_white)

    # ── Draw filled nodes (on top of everything) ──
    n1i, n2i, mi = (int(n1[0]), int(n1[1])), (int(n2[0]), int(n2[1])), (int(meet[0]), int(meet[1]))
    draw.ellipse([n1i[0]-r_node, n1i[1]-r_node, n1i[0]+r_node, n1i[1]+r_node], fill=c_white)
    draw.ellipse([n2i[0]-r_node, n2i[1]-r_node, n2i[0]+r_node, n2i[1]+r_node], fill=c_white)

    # ── Meeting point: filled circle + decorative ring ──
    draw.ellipse([mi[0]-r_meet, mi[1]-r_meet, mi[0]+r_meet, mi[1]+r_meet], fill=c_white)
    meet_ring_r = int(r_meet * 1.7)
    draw_ring(draw, mi[0], mi[1], meet_ring_r, ring_w, c_soft)

    return img


def apply_glow(symbol, radius_ratio=0.015, layers=3):
    """Multi-layer glow."""
    size = symbol.size[0]
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for i in range(layers, 0, -1):
        r = max(1, int(size * radius_ratio * i))
        g = symbol.filter(ImageFilter.GaussianBlur(radius=r))
        factor = 0.35 / i
        alpha = g.split()[3].point(lambda p: int(p * factor))
        g.putalpha(alpha)
        result = Image.alpha_composite(result, g)
    return Image.alpha_composite(result, symbol)


# ── Icon generators ──────────────────────────────────────────────

def create_main_icon(size=1024):
    """Main app icon."""
    # Vibrant gradient: deep indigo-blue → bright electric blue
    bg = create_gradient(size, (8, 15, 110), (40, 100, 245), angle_deg=140)

    # Rounded-square mask
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size-1, size-1], radius=int(size*0.22), fill=255)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    img.paste(bg, mask=mask)

    # Subtle radial glow highlights for depth
    glow1 = radial_glow(size, int(size*0.35), int(size*0.30),
                        int(size*0.35), (100, 160, 255), peak_alpha=25)
    glow2 = radial_glow(size, int(size*0.55), int(size*0.65),
                        int(size*0.25), (80, 140, 255), peak_alpha=18)
    img = Image.alpha_composite(img, glow1)
    img = Image.alpha_composite(img, glow2)

    # Symbol with glow
    symbol = draw_symbol(size, scale=1.0)
    symbol = apply_glow(symbol)
    img = Image.alpha_composite(img, symbol)

    return img


def create_adaptive_icon(size=1024):
    """Android adaptive foreground (bg color set in app.json)."""
    symbol = draw_symbol(size, scale=0.65)
    return apply_glow(symbol, radius_ratio=0.010, layers=2)


def create_splash_icon(size=512):
    """Splash screen icon (bg color set in app.json)."""
    symbol = draw_symbol(size, scale=0.80)
    return apply_glow(symbol, radius_ratio=0.012, layers=2)


# ── Main ─────────────────────────────────────────────────────────

def main():
    print('Generating DuoLink icons...\n')

    print('1. icon.png (1024x1024)...')
    create_main_icon(1024).save(os.path.join(ASSETS_DIR, 'icon.png'), 'PNG')
    print('   Done.')

    print('2. adaptive-icon.png (1024x1024)...')
    create_adaptive_icon(1024).save(
        os.path.join(ASSETS_DIR, 'adaptive-icon.png'), 'PNG')
    print('   Done.')

    print('3. splash-icon.png (512x512)...')
    create_splash_icon(512).save(
        os.path.join(ASSETS_DIR, 'splash-icon.png'), 'PNG')
    print('   Done.')

    print('4. favicon.png (48x48)...')
    icon = Image.open(os.path.join(ASSETS_DIR, 'icon.png'))
    icon.resize((48, 48), Image.LANCZOS).save(
        os.path.join(ASSETS_DIR, 'favicon.png'), 'PNG')
    print('   Done.')

    print('\nAll DuoLink icons generated!')


if __name__ == '__main__':
    main()
