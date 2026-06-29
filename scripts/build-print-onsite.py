#!/usr/bin/env python3
"""從視訊委員 HTML 產生現場紙本列印版（委員全套）。"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "視訊委員"
OUT = ROOT / "現場印製" / "委員"

PRINT_HEAD = """<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <link rel="stylesheet" href="../assets/print.css">
</head>
<body>
<div class="print-bar no-print">
  {bar_label}
  <button type="button" onclick="window.print()">🖨 列印／另存 PDF</button>
</div>
<div class="doc print-sheet">
"""

PRINT_TAIL = """
</div>
</body>
</html>
"""


def strip_nav(html: str) -> str:
    html = re.sub(r'<nav class="nav">.*?</nav>\s*', '', html, flags=re.S)
    html = re.sub(r'<div class="online-banner">.*?</div>\s*', '', html, flags=re.S)
    html = re.sub(r'\s*data-form-type="[^"]*"', '', html)
    html = re.sub(r'<style[^>]*>.*?</style>\s*', '', html, flags=re.S)
    html = re.sub(
        r'<link[^>]*submit-form[^>]*>\s*|<script[^>]*submit-form[^>]*>.*?</script>\s*',
        '',
        html,
        flags=re.S,
    )
    html = re.sub(r'<script>.*?</script>\s*', '', html, flags=re.S)
    html = re.sub(r'<div class="submit-bar">.*?</div>\s*', '', html, flags=re.S)
    html = re.sub(r'<button[^>]*提交[^>]*>.*?</button>\s*', '', html, flags=re.S)
    return html


def choices_to_print(html: str) -> str:
    """表單選項改為紙本圈選符號。"""
    html = re.sub(
        r'<label>\s*<input[^>]*type="checkbox"[^>]*/>\s*([^<]+)</label>',
        r'<span class="print-opt">☐ \1</span>',
        html,
    )
    html = re.sub(
        r'<label>\s*<input[^>]*type="radio"[^>]*/>\s*([^<]+)</label>',
        r'<span class="print-opt">○ \1</span>',
        html,
    )
    html = re.sub(r'<div class="opts">', '<div class="opts print-opts">', html)
    return html


def inputs_to_print(html: str) -> str:
    html = re.sub(
        r'<input[^>]*class="[^"]*online-input[^"]*"[^>]*/?>',
        '<div class="write-line">&nbsp;</div>',
        html,
    )
    html = re.sub(
        r'<textarea[^>]*class="[^"]*online-textarea[^"]*"[^>]*>.*?</textarea>',
        '<div class="write-box"></div>',
        html,
        flags=re.S,
    )
    html = re.sub(
        r'<textarea[^>]*class="[^"]*write-box[^"]*online-textarea[^"]*"[^>]*>.*?</textarea>',
        '<div class="write-box tall"></div>',
        html,
        flags=re.S,
    )
    # 附錄備註欄
    html = re.sub(
        r'<input[^>]*class="[^"]*note-input[^"]*"[^>]*/?>',
        '<div class="note-line"></div>',
        html,
    )
    # 必要度改為紙本圈選
    html = re.sub(
        r'<td class="need">.*?</td>',
        '<td class="need-print">○高　○中　○低　○略</td>',
        html,
        flags=re.S,
    )
    return html


def adapt_reading(html: str) -> str:
    html = html.replace("視訊委員閱讀須知", "評核委員閱讀須知（現場版）")
    html = re.sub(
        r'<h2>三、視訊委員怎麼填寫《填答手冊》？</h2>.*?<h2>四、培訓課程架構概覽',
        """<h2 class="standalone">三、現場委員怎麼使用本套手冊？</h2>
    <ol>
      <li>進場請先至<strong>現場簽到區</strong>完成簽到（或掃描會場 QR 進入現場簽到頁）。</li>
      <li>本套資料含：<strong>閱讀須知、填答手冊（正文）、填答手冊（附錄）</strong>，請依目錄順序使用。</li>
      <li>會中請依主席引導，以<strong>原子筆</strong>依序填寫：壹→貳→叁→肆→伍→陸；附錄標註 86 單元必要度（高／中／低／略）。</li>
      <li>標示「案例／佐證」的欄位請務必填寫；若無直接經驗，可填「無直接經驗，但認同此為產業共通問題」。</li>
      <li>各章結束請於<strong>簽名欄親簽</strong>；會議結束前將正文、附錄交回工作人員。</li>
      <li>若有補充意見，可於空白處書寫或會後提供文字檔。</li>
    </ol>

    <h2 class="standalone">四、培訓課程架構概覽""",
        html,
        flags=re.S,
    )
    html = html.replace('class="page"', 'class="section"')
    html = html.replace("<table>", '<table class="data">')
    html = re.sub(r'<p class="footer">.*?</p>', '', html, flags=re.S)
    return html


def adapt_body_cover(html: str) -> str:
    html = html.replace("填答手冊（正文）｜視訊線上版", "填答手冊（正文）｜現場出席版")
    html = html.replace(
        "<li>請直接在欄位中輸入；案例欄位請務必填寫</li>",
        "<li>請以<strong>原子筆</strong>在橫線、方框內填寫；案例欄位請務必填寫</li>",
    )
    html = html.replace(
        "<li>填完請按頁底「提交填答紀錄」</li>",
        "<li>各章結束請<strong>簽名</strong>；會議結束前交回工作人員</li>",
    )
    html = re.sub(
        r'<div class="field"><label>委員姓名</label><input[^>]*></div>',
        '<div class="field"><label>委員姓名</label><div class="write-line">&nbsp;</div></div>',
        html,
    )
    html = re.sub(
        r'<div class="field"><label>服務單位</label><input[^>]*></div>',
        '<div class="field"><label>服務單位</label><div class="write-line">&nbsp;</div></div>',
        html,
    )
    html = re.sub(
        r'<div class="field"><label>出席方式</label><input[^>]*></div>',
        '<div class="field"><label>出席方式</label><div class="opts"><label>☑ 現場出席</label></div></div>',
        html,
    )
    return html


def adapt_appendix_cover(html: str) -> str:
    html = html.replace("視訊線上版", "現場出席版")
    html = re.sub(
        r'<div class="member-line[^"]*">.*?</div>',
        '<div class="field" style="margin-top:2rem"><label>委員姓名</label><div class="write-line">&nbsp;</div></div>',
        html,
        flags=re.S,
    )
    return html


def extract_body_content(html: str) -> str:
    m = re.search(r'<body[^>]*>(.*)</body>', html, flags=re.S)
    return m.group(1) if m else html


def wrap_doc(title: str, bar: str, inner: str) -> str:
    return PRINT_HEAD.format(title=title, bar_label=bar) + inner + PRINT_TAIL


def build_reading():
    raw = (SRC / "閱讀須知.html").read_text(encoding="utf-8")
    body = extract_body_content(raw)
    body = strip_nav(body)
    body = adapt_reading(body)
    body = inputs_to_print(body)
    body = body.replace('<div class="page">', '<div class="section" id="reading">')
    out = wrap_doc(
        "評核委員閱讀須知（現場版）",
        "評核委員｜閱讀須知（現場版）",
        body,
    )
    (OUT / "01-閱讀須知.html").write_text(out, encoding="utf-8")


def build_body():
    raw = (SRC / "填答手冊-正文.html").read_text(encoding="utf-8")
    body = extract_body_content(raw)
    body = strip_nav(body)
    body = adapt_body_cover(body)
    body = inputs_to_print(body)
    body = choices_to_print(body)
    body = body.replace('<div class="doc">', '<div class="body-inner">')
    out = wrap_doc(
        "填答手冊正文（現場版）",
        "評核委員｜填答手冊·正文（現場版）",
        body,
    )
    (OUT / "02-填答手冊-正文.html").write_text(out, encoding="utf-8")


def build_appendix():
    raw = (SRC / "填答手冊-附錄.html").read_text(encoding="utf-8")
    body = extract_body_content(raw)
    body = strip_nav(body)
    body = adapt_appendix_cover(body)
    body = inputs_to_print(body)
    body = body.replace('<div class="doc">', '<div class="body-inner">')
    out = wrap_doc(
        "填答手冊附錄（現場版）",
        "評核委員｜填答手冊·附錄（現場版）",
        body,
    )
    (OUT / "03-填答手冊-附錄.html").write_text(out, encoding="utf-8")


def build_toc():
    toc = """<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>目錄｜評核委員現場資料套組</title>
  <link rel="stylesheet" href="../assets/print.css">
</head>
<body>
<div class="print-bar no-print">
  評核委員｜現場印製套組目錄
  <button type="button" onclick="window.print()">🖨 列印／另存 PDF</button>
</div>
<div class="doc print-sheet">
  <div class="cover">
    <span class="badge">現場出席｜評核委員</span>
    <h1>宮廟管理師<br>第一次評核委員會</h1>
    <p class="date">115年6月30日</p>
    <p class="org">臺灣道法總會｜教育委員會<br>職能基準共構會議｜現場印製資料套組</p>
    <div class="hint">
      <strong>使用說明</strong>
      <ul style="margin:0.5rem 0 0;padding-left:1.2rem;text-align:left;line-height:1.7">
        <li>本套組供<strong>現場出席之評核委員</strong>使用，請依目錄順序裝訂或分冊列印。</li>
        <li>進場請先完成<strong>現場簽到</strong>，再依主席引導填寫手冊。</li>
        <li>請以<strong>原子筆</strong>填寫；各章結束請簽名，會後交回工作人員。</li>
        <li>每頁頁尾自動顯示<strong>頁碼</strong>，以利對照討論。</li>
      </ul>
    </div>
    <div class="sign-grid" style="margin-top:2.5rem;text-align:left">
      <div class="field"><label>委員姓名</label><div class="write-line">&nbsp;</div></div>
      <div class="field"><label>服務單位</label><div class="write-line">&nbsp;</div></div>
    </div>
  </div>

  <div class="toc-page">
    <h2>目　錄</h2>
    <ul class="toc-list">
      <li><span class="toc-num">00</span><span class="toc-title">封面與使用說明</span><span class="toc-dots"></span><span class="toc-page-num">1</span></li>
      <li><span class="toc-num">01</span><span class="toc-title"><a href="./01-閱讀須知.html" style="color:inherit;text-decoration:none">閱讀須知（現場版）</a></span><span class="toc-dots"></span><span class="toc-page-num">—</span></li>
      <li><span class="toc-num">02</span><span class="toc-title"><a href="./02-填答手冊-正文.html" style="color:inherit;text-decoration:none">填答手冊·正文（壹～陸）</a></span><span class="toc-dots"></span><span class="toc-page-num">—</span></li>
      <li><span class="toc-num">&nbsp;&nbsp;</span><span class="toc-title" style="padding-left:1.5rem;color:#555">　壹、簽到與基本資料</span><span class="toc-dots"></span><span class="toc-page-num"></span></li>
      <li><span class="toc-num">&nbsp;&nbsp;</span><span class="toc-title" style="padding-left:1.5rem;color:#555">　貳、宮廟管理現況與需求</span><span class="toc-dots"></span><span class="toc-page-num"></span></li>
      <li><span class="toc-num">&nbsp;&nbsp;</span><span class="toc-title" style="padding-left:1.5rem;color:#555">　叁、七大工作範疇確認</span><span class="toc-dots"></span><span class="toc-page-num"></span></li>
      <li><span class="toc-num">&nbsp;&nbsp;</span><span class="toc-title" style="padding-left:1.5rem;color:#555">　肆、工作任務確認</span><span class="toc-dots"></span><span class="toc-page-num"></span></li>
      <li><span class="toc-num">&nbsp;&nbsp;</span><span class="toc-title" style="padding-left:1.5rem;color:#555">　伍、課程單元確認</span><span class="toc-dots"></span><span class="toc-page-num"></span></li>
      <li><span class="toc-num">&nbsp;&nbsp;</span><span class="toc-title" style="padding-left:1.5rem;color:#555">　陸、會議決議</span><span class="toc-dots"></span><span class="toc-page-num"></span></li>
      <li><span class="toc-num">03</span><span class="toc-title"><a href="./03-填答手冊-附錄.html" style="color:inherit;text-decoration:none">填答手冊·附錄（86 單元必要度）</a></span><span class="toc-dots"></span><span class="toc-page-num">—</span></li>
    </ul>
    <p class="toc-note">※ 分冊列印時，各冊頁碼自該冊第 1 頁起算；頁尾均顯示「第 N 頁」。建議列印順序：00 目錄 → 01 → 02 → 03。</p>
    <div class="page-footer"><span>臺灣道法總會｜宮廟管理師職能基準發展計畫</span><span>第 <span class="pagenum"></span> 頁</span></div>
  </div>
</div>
</body>
</html>"""
    (OUT / "00-目錄與封面.html").write_text(toc, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    build_toc()
    build_reading()
    build_body()
    build_appendix()
    print("Built 委員 print package ->", OUT)


if __name__ == "__main__":
    main()
