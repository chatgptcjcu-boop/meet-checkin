#!/usr/bin/env python3
"""Generate ODT page thumbnail PNGs for report-format print handout."""

from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ODT_PATH = ROOT / "training/icap-planning-report-wizard/reference/icap-course-planning-report-template.odt"
OUT_DIR = ROOT / "training/icap-planning-report-wizard/reference/print-pages"
META_PATH = ROOT / "training/icap-planning-report-wizard/reference/source-metadata.json"

NS = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
}

W, H = 496, 702  # ~A4 ratio, compact for GitHub Pages
MARGIN = 28
FONT_PATH = "/System/Library/Fonts/PingFang.ttc"


def text_of(el: ET.Element) -> str:
    parts: list[str] = []
    if el.text:
        parts.append(el.text)
    for child in el:
        parts.append(text_of(child))
        if child.tail:
            parts.append(child.tail)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def table_matrix(table_el: ET.Element, max_rows: int = 8, max_cols: int = 8) -> list[list[str]]:
    rows: list[list[str]] = []
    for row in table_el.findall("table:table-row", NS)[:max_rows]:
        cells: list[str] = []
        for cell in row.findall("table:table-cell", NS):
            repeat = int(cell.get(f"{{{NS['table']}}}number-columns-repeated", "1"))
            value = text_of(cell)
            for _ in range(min(repeat, 3)):
                cells.append(value[:90] if value else " ")
            if len(cells) >= max_cols:
                break
        if cells:
            rows.append(cells[:max_cols])
    return rows


def parse_pages(odt_path: Path) -> list[dict]:
    with zipfile.ZipFile(odt_path) as zf:
        root = ET.fromstring(zf.read("content.xml"))
    body = root.find(".//office:body/office:text", NS)
    if body is None:
        raise RuntimeError("ODT content.xml missing office:text body")

    pages: list[dict] = []
    section = "封面"
    pending_title: str | None = None

    for el in body:
        tag = el.tag.split("}")[-1]
        if tag == "sequence-decls":
            continue
        if tag == "p":
            text = text_of(el)
            match = re.match(r"^表\s*(\d+)\s*(.*)$", text)
            if match:
                pending_title = f"表{match.group(1)} {match.group(2)}".strip()
            elif text in ("壹、課程資訊", "貳、課程規劃內容", "參、課程發展相關佐證資料"):
                section = text
                pending_title = text
        elif tag == "h":
            text = text_of(el)
            if text:
                section = text
                pending_title = text
        elif tag == "table":
            matrix = table_matrix(el)
            title = pending_title or section or "表格"
            if not pages and "申請" in str(matrix):
                pages.append(
                    {
                        "slug": "cover",
                        "title": "封面｜申請欄位",
                        "section": "封面",
                        "matrix": matrix,
                    }
                )
                pending_title = None
                continue
            if title.startswith("壹"):
                pages.append(
                    {
                        "slug": "section-1",
                        "title": "壹、課程資訊",
                        "section": title,
                        "matrix": matrix,
                    }
                )
            elif title.startswith("參"):
                pages.append(
                    {
                        "slug": "section-3",
                        "title": "參、課程發展相關佐證資料",
                        "section": title,
                        "matrix": matrix,
                    }
                )
            elif title.startswith("表"):
                num = re.search(r"表\s*(\d+)", title)
                pages.append(
                    {
                        "slug": f"table-{num.group(1) if num else 'x'}",
                        "title": title,
                        "section": section or "貳、課程規劃內容",
                        "matrix": matrix,
                    }
                )
            pending_title = None

    return pages


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(FONT_PATH, size, index=0)
    except OSError:
        return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    if not text or text.isspace():
        return [" "]
    lines: list[str] = []
    current = ""
    for ch in text:
        trial = current + ch
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = ch
    if current:
        lines.append(current)
    return lines[:4] or [" "]


def render_page(page: dict, index: int) -> Image.Image:
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)
    title_font = load_font(18)
    section_font = load_font(12)
    cell_font = load_font(10)
    micro_font = load_font(8)

    draw.rectangle((0, 0, W - 1, 54), fill="#f8fafc")
    draw.line((MARGIN, 54, W - MARGIN, 54), fill="#cbd5e1", width=1)
    draw.text((MARGIN, 10), "職能導向課程規劃與執行報告書", fill="#0f766e", font=section_font)
    draw.text((MARGIN, 30), page["title"], fill="#111827", font=title_font)

    badge = f"P{index:02d}"
    badge_w = draw.textlength(badge, font=micro_font) + 12
    draw.rounded_rectangle((W - MARGIN - badge_w, 12, W - MARGIN, 30), radius=4, fill="#ecfdf5", outline="#6ee7b7")
    draw.text((W - MARGIN - badge_w + 6, 15), badge, fill="#0f766e", font=micro_font)

    y = 68
    draw.text((MARGIN, y), page["section"], fill="#64748b", font=micro_font)
    y += 22

    matrix = page["matrix"]
    if not matrix:
        draw.text((MARGIN, y), "（本頁無表格預覽）", fill="#94a3b8", font=cell_font)
        return img

    cols = max(len(row) for row in matrix)
    table_w = W - MARGIN * 2
    col_w = max(36, table_w // cols)
    row_h = 54
    x0 = MARGIN

    for r, row in enumerate(matrix):
        for c in range(cols):
            x = x0 + c * col_w
            cell = row[c] if c < len(row) else " "
            draw.rectangle((x, y, x + col_w, y + row_h), outline="#d1d5db", fill="#ffffff" if r else "#f1f5f9")
            lines = wrap_text(draw, cell, cell_font if r else micro_font, col_w - 8)
            ty = y + 6
            for line in lines:
                draw.text((x + 4, ty), line, fill="#111827", font=cell_font if r else micro_font)
                ty += 12
        y += row_h
        if y > H - 36:
            draw.text((MARGIN, H - 28), "…（以下省略）", fill="#94a3b8", font=micro_font)
            break

    draw.text((MARGIN, H - 22), "勞動部公版 ODT 格式縮影｜請下載完整檔案填寫", fill="#94a3b8", font=micro_font)
    return img


def main() -> None:
    pages = parse_pages(ODT_PATH)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest = []
    for i, page in enumerate(pages, start=1):
        filename = f"page-{i:02d}.png"
        out_path = OUT_DIR / filename
        render_page(page, i).save(out_path, optimize=True)
        manifest.append(
            {
                "file": filename,
                "index": i,
                "title": page["title"],
                "section": page["section"],
                "slug": page["slug"],
            }
        )
        print(f"wrote {out_path.relative_to(ROOT)} ({out_path.stat().st_size} bytes)")

    meta: dict = {}
    if META_PATH.exists():
        meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    meta["printHandout"] = {
        "htmlPath": "reference/report-format-print-handout.html",
        "pagesDir": "reference/print-pages/",
        "pageCount": len(manifest),
        "layout": "4-up",
        "layoutNote": "2×2 縮圖／A4，約 4 張印完全部 15 頁",
        "generatedAt": "2026-07-06",
        "generator": "scripts/generate-report-print-pages.py",
        "pages": manifest,
    }
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"updated {META_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
