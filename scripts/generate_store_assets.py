from __future__ import annotations

from pathlib import Path
from typing import Iterable, Optional, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT_DIR = Path(__file__).resolve().parents[1]
STATIC_ICON_DIR = ROOT_DIR / "static" / "icons"
STORE_SCREENSHOT_DIR = ROOT_DIR / "store" / "screenshots"
STORE_ASSET_DIR = ROOT_DIR / "store" / "assets"
RESAMPLE_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

NAVY_TOP = (14, 28, 49)
NAVY_BOTTOM = (7, 15, 28)
PANEL_TOP = (19, 34, 57)
PANEL_BOTTOM = (11, 20, 35)
BLUE = (84, 156, 255)
BLUE_LIGHT = (145, 195, 255)
GREEN = (103, 239, 155)
RED = (255, 142, 142)
WHITE = (242, 248, 255)
TEXT_MUTED = (187, 206, 232)
BORDER = (124, 171, 244)


def ensure_dirs(paths: Iterable[Path]) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def load_font(size: int, *, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]

    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)

    return ImageFont.load_default()


def vertical_gradient(size: Tuple[int, int], top_color: Tuple[int, int, int], bottom_color: Tuple[int, int, int]) -> Image.Image:
    width, height = size
    gradient = Image.new("RGBA", size)
    draw = ImageDraw.Draw(gradient)

    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(int(top_color[index] * (1.0 - ratio) + bottom_color[index] * ratio) for index in range(3))
        draw.line((0, y, width, y), fill=color + (255,))

    return gradient


def radial_glow(size: Tuple[int, int], center: Tuple[int, int], radius: int, color: Tuple[int, int, int], alpha: int) -> Image.Image:
    width, height = size
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    left = center[0] - radius
    top = center[1] - radius
    right = center[0] + radius
    bottom = center[1] + radius
    draw.ellipse((left, top, right, bottom), fill=color + (alpha,))
    return glow.filter(ImageFilter.GaussianBlur(radius // 3))


def masked_round_rect(base: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", base.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, base.size[0], base.size[1]), radius=radius, fill=255)
    return Image.composite(base, Image.new("RGBA", base.size, (0, 0, 0, 0)), mask)


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> Tuple[int, int]:
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    return right - left, bottom - top


def wrapped_lines(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""

    for word in words:
        candidate = word if not current else f"{current} {word}"
        if text_size(draw, candidate, font)[0] <= max_width:
            current = candidate
            continue

        if current:
            lines.append(current)
        current = word

    if current:
        lines.append(current)

    return lines


def draw_shadowed_round_rect(
    image: Image.Image,
    box: Tuple[int, int, int, int],
    radius: int,
    *,
    fill: Tuple[int, int, int, int],
    outline: Optional[Tuple[int, int, int, int]] = None,
    shadow_alpha: int = 80,
) -> None:
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_box = (box[0], box[1] + 10, box[2], box[3] + 10)
    shadow_draw.rounded_rectangle(shadow_box, radius=radius, fill=(0, 0, 0, shadow_alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    image.alpha_composite(shadow)

    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2 if outline else 0)


def create_icon_master() -> Image.Image:
    size = 512
    background = vertical_gradient((size, size), NAVY_TOP, NAVY_BOTTOM)
    background.alpha_composite(radial_glow((size, size), (390, 116), 170, BLUE, 110))
    background.alpha_composite(radial_glow((size, size), (140, 440), 140, (38, 88, 180), 80))
    icon = masked_round_rect(background, 124)
    draw = ImageDraw.Draw(icon)

    panel_box = (92, 112, 420, 404)
    draw.rounded_rectangle(panel_box, radius=44, fill=(255, 255, 255, 18), outline=BORDER + (155,), width=3)

    bar_width = 34
    bar_bottom = 330
    bar_specs = [
        ((150, 246, 150 + bar_width, bar_bottom), BLUE_LIGHT + (210,)),
        ((200, 206, 200 + bar_width, bar_bottom), WHITE + (210,)),
        ((250, 170, 250 + bar_width, bar_bottom), GREEN + (220,)),
    ]
    for box, color in bar_specs:
        draw.rounded_rectangle(box, radius=14, fill=color)

    trend_points = [(164, 290), (236, 248), (290, 264), (360, 186)]
    draw.line(trend_points, fill=GREEN + (255,), width=18, joint="curve")
    arrow = [(360, 186), (345, 196), (354, 170), (384, 182)]
    draw.polygon(arrow, fill=GREEN + (255,))
    for point in trend_points:
        draw.ellipse((point[0] - 12, point[1] - 12, point[0] + 12, point[1] + 12), fill=WHITE + (255,))

    pill_box = (278, 136, 386, 176)
    draw.rounded_rectangle(pill_box, radius=20, fill=BLUE + (215,))
    font = load_font(22, bold=True)
    draw.text((299, 145), "PnL", fill=(8, 16, 30), font=font)

    return icon


def save_icons() -> None:
    ensure_dirs([STATIC_ICON_DIR, STORE_ASSET_DIR])
    master = create_icon_master()
    master.save(STORE_ASSET_DIR / "icon512.png")

    for size in (16, 32, 48, 128):
        resized = master.resize((size, size), RESAMPLE_LANCZOS)
        resized.save(STATIC_ICON_DIR / f"icon{size}.png")


def draw_label(draw: ImageDraw.ImageDraw, text: str, x: int, y: int) -> None:
    font = load_font(18, bold=True)
    width, height = text_size(draw, text, font)
    draw.rounded_rectangle((x, y, x + width + 28, y + height + 18), radius=18, fill=BLUE + (46,))
    draw.text((x + 14, y + 8), text, fill=BLUE_LIGHT, font=font)


def draw_heading(draw: ImageDraw.ImageDraw, title: str, subtitle: str) -> None:
    draw_label(draw, "Chrome Web Store screenshot", 76, 56)
    title_font = load_font(42, bold=True)
    subtitle_font = load_font(21)
    draw.text((76, 108), title, fill=WHITE, font=title_font)
    subtitle_lines = wrapped_lines(draw, subtitle, subtitle_font, 760)
    line_y = 166
    for line in subtitle_lines:
        draw.text((76, line_y), line, fill=TEXT_MUTED, font=subtitle_font)
        line_y += 30


def draw_browser_shell(image: Image.Image, title: str, url: str, box: Tuple[int, int, int, int]) -> Tuple[int, int, int, int]:
    draw_shadowed_round_rect(image, box, 26, fill=(248, 251, 255, 255), outline=(224, 232, 243, 255))
    draw = ImageDraw.Draw(image)
    x1, y1, x2, _ = box
    toolbar_bottom = y1 + 66
    draw.rounded_rectangle((x1, y1, x2, toolbar_bottom), radius=26, fill=(241, 246, 252, 255))
    for index, color in enumerate(((255, 99, 99), (255, 191, 96), (71, 214, 124))):
        draw.ellipse((x1 + 22 + index * 20, y1 + 22, x1 + 34 + index * 20, y1 + 34), fill=color)

    url_box = (x1 + 88, y1 + 16, x2 - 24, y1 + 50)
    draw.rounded_rectangle(url_box, radius=16, fill=(255, 255, 255, 255), outline=(221, 231, 243, 255))
    title_font = load_font(15, bold=True)
    url_font = load_font(14)
    draw.text((x1 + 104, y1 + 13), title, fill=(60, 78, 102), font=title_font)
    draw.text((x1 + 104, y1 + 30), url, fill=(98, 118, 144), font=url_font)
    return (x1 + 24, toolbar_bottom + 20, x2 - 24, box[3] - 24)


def draw_metric_block(draw: ImageDraw.ImageDraw, box: Tuple[int, int, int, int], label: str, value: str, accent: Tuple[int, int, int]) -> None:
    draw.rounded_rectangle(box, radius=16, fill=(22, 36, 58, 255), outline=(67, 96, 134, 255))
    label_font = load_font(14, bold=True)
    value_font = load_font(26, bold=True)
    draw.text((box[0] + 16, box[1] + 14), label.upper(), fill=(189, 205, 231), font=label_font)
    draw.text((box[0] + 16, box[1] + 36), value, fill=accent, font=value_font)


def draw_extension_panel(image: Image.Image, box: Tuple[int, int, int, int], *, sync_variant: bool = False) -> None:
    panel = vertical_gradient((box[2] - box[0], box[3] - box[1]), PANEL_TOP, PANEL_BOTTOM)
    panel.alpha_composite(radial_glow(panel.size, (panel.size[0] - 40, 0), 180, BLUE, 90))
    panel = masked_round_rect(panel, 22)

    base = Image.new("RGBA", image.size, (0, 0, 0, 0))
    base.alpha_composite(panel, (box[0], box[1]))
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((box[0], box[1] + 16, box[2], box[3] + 16), radius=24, fill=(0, 0, 0, 95))
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(24)))
    image.alpha_composite(base)

    draw = ImageDraw.Draw(image)
    header_font = load_font(15, bold=True)
    title_font = load_font(28, bold=True)
    body_font = load_font(16)
    draw.text((box[0] + 24, box[1] + 22), "Steam Inventory PnL", fill=BLUE_LIGHT, font=header_font)
    draw.text((box[0] + 24, box[1] + 46), "Profit Snapshot", fill=WHITE, font=title_font)
    draw.rounded_rectangle((box[2] - 96, box[1] + 24, box[2] - 24, box[1] + 54), radius=15, fill=BLUE + (40,))
    draw.text((box[2] - 72, box[1] + 31), "Tracked", fill=BLUE_LIGHT, font=load_font(14, bold=True))

    draw.text((box[0] + 24, box[1] + 90), "AK-47 | Slate (Field-Tested)", fill=WHITE, font=load_font(18, bold=True))
    draw.text((box[0] + 24, box[1] + 116), "Counter-Strike 2", fill=TEXT_MUTED, font=body_font)

    metrics = [
        ("Market price", "NT$ 126.00", WHITE),
        ("Estimated net", "NT$ 109.62", WHITE),
        ("PnL / unit", "NT$ 21.62", GREEN),
        ("Total PnL", "NT$ 64.86", GREEN),
    ]

    for index, (label, value, accent) in enumerate(metrics):
        row = index // 2
        column = index % 2
        left = box[0] + 24 + column * 146
        top = box[1] + 154 + row * 92
        draw_metric_block(draw, (left, top, left + 132, top + 78), label, value, accent)

    form_top = box[1] + 344
    label_font = load_font(13, bold=True)
    input_font = load_font(16)
    fields = [("Custom cost", "88.00"), ("Quantity", "3"), ("Fee %", "13.0")]
    for index, (label, value) in enumerate(fields):
        left = box[0] + 24 + index * 96
        draw.text((left, form_top), label, fill=TEXT_MUTED, font=label_font)
        draw.rounded_rectangle((left, form_top + 22, left + 84, form_top + 62), radius=12, fill=(8, 16, 27, 180), outline=(61, 85, 118, 255))
        draw.text((left + 14, form_top + 34), value, fill=WHITE, font=input_font)

    draw.text((box[0] + 24, form_top + 76), "Note", fill=TEXT_MUTED, font=label_font)
    draw.rounded_rectangle((box[0] + 24, form_top + 98, box[2] - 24, form_top + 138), radius=12, fill=(8, 16, 27, 180), outline=(61, 85, 118, 255))
    note_text = "Imported from market buy history" if sync_variant else "Field-tested example cost basis"
    draw.text((box[0] + 18, form_top + 110), note_text, fill=WHITE, font=load_font(14))

    button_top = form_top + 156
    draw.rounded_rectangle((box[0] + 24, button_top, box[0] + 122, button_top + 42), radius=14, fill=BLUE + (255,))
    draw.text((box[0] + 58, button_top + 12), "Save", fill=(7, 15, 28), font=load_font(16, bold=True))
    draw.rounded_rectangle((box[0] + 134, button_top, box[0] + 252, button_top + 42), radius=14, fill=(255, 255, 255, 18))
    draw.text((box[0] + 158, button_top + 12), "Sync history", fill=WHITE, font=load_font(16, bold=True))

    status_color = GREEN if sync_variant else TEXT_MUTED
    status = "Matched the current inventory item from Steam history." if sync_variant else "Saved locally in this browser profile."
    draw.text((box[0] + 24, button_top + 58), status, fill=status_color, font=load_font(14))


def draw_market_page(image: Image.Image, content_box: Tuple[int, int, int, int]) -> None:
    draw = ImageDraw.Draw(image)
    x1, y1, x2, y2 = content_box
    draw.rounded_rectangle((x1, y1, x2, y2), radius=22, fill=(22, 35, 55, 255))
    draw.rounded_rectangle((x1 + 24, y1 + 24, x2 - 24, y1 + 92), radius=18, fill=(31, 48, 74, 255))

    draw.text((x1 + 42, y1 + 42), "Community Market", fill=WHITE, font=load_font(28, bold=True))
    draw.text((x1 + 42, y1 + 78), "Track custom costs and compare them with live Steam prices.", fill=TEXT_MUTED, font=load_font(16))

    card_box = (x1 + 42, y1 + 132, x1 + 536, y2 - 42)
    draw.rounded_rectangle(card_box, radius=20, fill=(17, 28, 45, 255))
    draw.rounded_rectangle((card_box[0] + 24, card_box[1] + 24, card_box[0] + 152, card_box[1] + 152), radius=18, fill=(36, 61, 93, 255))
    draw.text((card_box[0] + 182, card_box[1] + 34), "AK-47 | Slate (Field-Tested)", fill=WHITE, font=load_font(24, bold=True))
    draw.text((card_box[0] + 182, card_box[1] + 70), "Counter-Strike 2", fill=TEXT_MUTED, font=load_font(17))
    draw.text((card_box[0] + 182, card_box[1] + 126), "Starting at NT$ 126.00", fill=BLUE_LIGHT, font=load_font(26, bold=True))
    draw.text((card_box[0] + 182, card_box[1] + 170), "Orders 287  |  Last sale 3 minutes ago", fill=TEXT_MUTED, font=load_font(16))

    info_top = card_box[1] + 242
    info_rows = [
        ("Volume", "1,842 sold this week"),
        ("Median", "NT$ 128.00"),
        ("Lowest listing", "NT$ 126.00"),
    ]
    for index, (label, value) in enumerate(info_rows):
        top = info_top + index * 72
        draw.rounded_rectangle((card_box[0] + 24, top, card_box[2] - 24, top + 56), radius=14, fill=(24, 39, 61, 255))
        draw.text((card_box[0] + 42, top + 12), label, fill=TEXT_MUTED, font=load_font(15, bold=True))
        draw.text((card_box[0] + 180, top + 12), value, fill=WHITE, font=load_font(18))


def draw_inventory_page(image: Image.Image, content_box: Tuple[int, int, int, int]) -> None:
    draw = ImageDraw.Draw(image)
    x1, y1, x2, y2 = content_box
    draw.rounded_rectangle((x1, y1, x2, y2), radius=22, fill=(22, 35, 55, 255))
    draw.text((x1 + 40, y1 + 34), "Steam Inventory", fill=WHITE, font=load_font(28, bold=True))
    draw.text((x1 + 40, y1 + 70), "Import market buy records and match them to the active item.", fill=TEXT_MUTED, font=load_font(16))

    grid_left = x1 + 40
    grid_top = y1 + 128
    cell_w = 108
    cell_h = 108
    for row in range(3):
        for column in range(4):
            left = grid_left + column * (cell_w + 14)
            top = grid_top + row * (cell_h + 14)
            fill = (41, 65, 98, 255) if row == 0 and column == 1 else (28, 47, 73, 255)
            outline = BLUE_LIGHT + (150,) if row == 0 and column == 1 else (0, 0, 0, 0)
            draw.rounded_rectangle((left, top, left + cell_w, top + cell_h), radius=16, fill=fill, outline=outline, width=3 if outline != (0, 0, 0, 0) else 0)

    detail_box = (x1 + 520, y1 + 128, x2 - 40, y2 - 40)
    draw.rounded_rectangle(detail_box, radius=20, fill=(17, 28, 45, 255))
    draw.text((detail_box[0] + 28, detail_box[1] + 24), "Selected item", fill=TEXT_MUTED, font=load_font(15, bold=True))
    draw.text((detail_box[0] + 28, detail_box[1] + 56), "Sticker Capsule 2", fill=WHITE, font=load_font(24, bold=True))
    draw.text((detail_box[0] + 28, detail_box[1] + 92), "Imported cost source: Steam Market buy history", fill=GREEN, font=load_font(16, bold=True))

    rows = [
        ("Matched cost", "NT$ 41.50"),
        ("Current price", "NT$ 57.00"),
        ("Estimated net", "NT$ 49.59"),
        ("PnL", "NT$ 8.09"),
    ]
    for index, (label, value) in enumerate(rows):
        top = detail_box[1] + 142 + index * 66
        draw.rounded_rectangle((detail_box[0] + 24, top, detail_box[2] - 24, top + 52), radius=14, fill=(24, 39, 61, 255))
        draw.text((detail_box[0] + 42, top + 13), label, fill=TEXT_MUTED, font=load_font(15, bold=True))
        draw.text((detail_box[0] + 210, top + 11), value, fill=WHITE if label != "PnL" else GREEN, font=load_font(22, bold=True))


def draw_popup_window(image: Image.Image, box: Tuple[int, int, int, int]) -> None:
    draw_shadowed_round_rect(image, box, 24, fill=(11, 20, 34, 255), outline=(67, 95, 136, 255), shadow_alpha=90)
    draw = ImageDraw.Draw(image)
    x1, y1, x2, _ = box
    draw.text((x1 + 26, y1 + 28), "Steam Inventory PnL", fill=BLUE_LIGHT, font=load_font(16, bold=True))
    draw.text((x1 + 26, y1 + 56), "Inventory PnL Tracker", fill=WHITE, font=load_font(28, bold=True))
    draw.rounded_rectangle((x2 - 156, y1 + 34, x2 - 26, y1 + 68), radius=17, fill=BLUE + (255,))
    draw.text((x2 - 138, y1 + 44), "3 tracked items", fill=(8, 16, 30), font=load_font(14, bold=True))

    intro_box = (x1 + 24, y1 + 110, x2 - 24, y1 + 168)
    draw.rounded_rectangle(intro_box, radius=18, fill=(21, 34, 54, 255), outline=(67, 95, 136, 255))
    intro_text = "Save a custom cost on any Steam listing or inventory item and track price, net proceeds, and profit directly on the page."
    intro_lines = wrapped_lines(draw, intro_text, load_font(16), intro_box[2] - intro_box[0] - 28)
    cursor_y = intro_box[1] + 12
    for line in intro_lines:
        draw.text((intro_box[0] + 16, cursor_y), line, fill=TEXT_MUTED, font=load_font(16))
        cursor_y += 22

    actions_top = y1 + 186
    for index, label in enumerate(("Refresh", "Clear All")):
        left = x1 + 24 + index * 156
        fill = (22, 36, 58, 255) if label == "Refresh" else (136, 50, 50, 255)
        draw.rounded_rectangle((left, actions_top, left + 140, actions_top + 44), radius=14, fill=fill)
        draw.text((left + 36, actions_top + 12), label, fill=WHITE, font=load_font(16, bold=True))

    card_specs = [
        ("AK-47 | Slate", "Counter-Strike 2", "3 tracked", "NT$ 88.00", "13%"),
        ("Sticker Capsule 2", "Steam item", "1 tracked", "NT$ 41.50", "13%"),
        ("Revolution Case", "Counter-Strike 2", "8 tracked", "NT$ 12.40", "13%"),
    ]
    for index, (name, app_name, pill, cost, fee) in enumerate(card_specs):
        top = y1 + 252 + index * 114
        draw.rounded_rectangle((x1 + 24, top, x2 - 24, top + 96), radius=18, fill=(21, 34, 54, 255), outline=(67, 95, 136, 255))
        draw.text((x1 + 40, top + 16), name, fill=WHITE, font=load_font(18, bold=True))
        draw.text((x1 + 40, top + 42), app_name, fill=TEXT_MUTED, font=load_font(14))
        draw.rounded_rectangle((x2 - 126, top + 16, x2 - 40, top + 44), radius=14, fill=BLUE + (255,))
        draw.text((x2 - 115, top + 23), pill, fill=(8, 16, 30), font=load_font(12, bold=True))
        draw.text((x1 + 40, top + 68), f"Cost: {cost}", fill=WHITE, font=load_font(14))
        draw.text((x1 + 208, top + 68), f"Fee: {fee}", fill=WHITE, font=load_font(14))


def create_base_canvas() -> Image.Image:
    canvas = vertical_gradient((1280, 800), NAVY_TOP, NAVY_BOTTOM)
    canvas.alpha_composite(radial_glow(canvas.size, (1120, 80), 280, BLUE, 96))
    canvas.alpha_composite(radial_glow(canvas.size, (220, 720), 220, (29, 85, 180), 72))
    return canvas


def create_overview_screenshot() -> Image.Image:
    image = create_base_canvas()
    draw = ImageDraw.Draw(image)
    draw_heading(
        draw,
        "Track profit directly on Steam item pages",
        "Save your own cost basis, estimate net proceeds after fees, and keep the numbers visible where you trade."
    )
    content_box = draw_browser_shell(image, "Steam Community Market", "https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Slate", (76, 236, 1204, 744))
    draw_market_page(image, content_box)
    draw_extension_panel(image, (844, 286, 1158, 704))
    return image


def create_history_sync_screenshot() -> Image.Image:
    image = create_base_canvas()
    draw = ImageDraw.Draw(image)
    draw_heading(
        draw,
        "Import costs from Steam market buy history",
        "Match inventory items against recent Steam purchases so you can start from a real cost basis instead of typing every number by hand."
    )
    content_box = draw_browser_shell(image, "Steam Inventory", "https://steamcommunity.com/id/example/inventory", (76, 236, 1204, 744))
    draw_inventory_page(image, content_box)
    draw_extension_panel(image, (874, 274, 1188, 692), sync_variant=True)
    return image


def create_popup_screenshot() -> Image.Image:
    image = create_base_canvas()
    draw = ImageDraw.Draw(image)
    draw_heading(
        draw,
        "Review tracked items from the popup",
        "Open the extension popup to see every saved item, refresh the list, or clear local tracking data when you are done."
    )
    content_box = draw_browser_shell(image, "Steam Community", "https://steamcommunity.com/market", (76, 246, 780, 714))
    draw_market_page(image, content_box)
    draw_popup_window(image, (818, 208, 1188, 708))
    return image


def save_screenshots() -> None:
    ensure_dirs([STORE_SCREENSHOT_DIR])
    screenshots = {
        "01-market-page-overview.png": create_overview_screenshot(),
        "02-market-history-sync.png": create_history_sync_screenshot(),
        "03-popup-tracker.png": create_popup_screenshot(),
    }

    for filename, image in screenshots.items():
        image.save(STORE_SCREENSHOT_DIR / filename, quality=95)


def main() -> None:
    ensure_dirs([STATIC_ICON_DIR, STORE_SCREENSHOT_DIR, STORE_ASSET_DIR])
    save_icons()
    save_screenshots()
    print(f"Generated Chrome Web Store assets in {STORE_ASSET_DIR} and {STORE_SCREENSHOT_DIR}")


if __name__ == "__main__":
    main()
