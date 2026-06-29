#!/usr/bin/env python3
"""將 現場印製 同步為英文路徑 onsite-print/（供 GitHub Pages 穩定連結）。"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "現場印製"
DST = ROOT / "onsite-print"

MEMBER_MAP = {
    "00-目錄與封面.html": "00-toc-cover.html",
    "01-閱讀須知.html": "01-reading-guide.html",
    "02-填答手冊-正文.html": "02-handbook-body.html",
    "03-填答手冊-附錄.html": "03-handbook-appendix.html",
}

GUEST_MAP = {
    "00-目錄與封面.html": "00-toc-cover.html",
    "01-會議參與手冊.html": "01-participant-guide.html",
    "02-現場簽到記錄.html": "02-signin-record.html",
}

LINK_REPLACE = {
    "./01-閱讀須知.html": "./01-reading-guide.html",
    "./02-填答手冊-正文.html": "./02-handbook-body.html",
    "./03-填答手冊-附錄.html": "./03-handbook-appendix.html",
    "./01-會議參與手冊.html": "./01-participant-guide.html",
    "./02-現場簽到記錄.html": "./02-signin-record.html",
}


def sync_folder(src_sub: str, dst_sub: str, name_map: dict) -> None:
    src_dir = SRC / src_sub
    dst_dir = DST / dst_sub
    if dst_dir.exists():
        shutil.rmtree(dst_dir)
    dst_dir.mkdir(parents=True, exist_ok=True)
    for src_name, dst_name in name_map.items():
        text = (src_dir / src_name).read_text(encoding="utf-8")
        for old, new in LINK_REPLACE.items():
            text = text.replace(old, new)
        (dst_dir / dst_name).write_text(text, encoding="utf-8")


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    assets_dst = DST / "assets"
    if assets_dst.exists():
        shutil.rmtree(assets_dst)
    shutil.copytree(SRC / "assets", assets_dst)
    sync_folder("委員", "members", MEMBER_MAP)
    sync_folder("列席", "guests", GUEST_MAP)
    print("Synced ->", DST)


if __name__ == "__main__":
    main()
