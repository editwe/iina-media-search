#!/usr/bin/env python3
"""Render docs/images/panel-{en,zh}-{light,dark}.png from ui/sidebar.html.

The sidebar is a plain HTML page, so it can be rendered outside IINA by stubbing
window.iina and pushing a fake state. Layout is pinned to 320 CSS px (the width
of IINA's sidebar) and captured at 2x.

    python3 tools/render-screenshots.py
"""
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "ui/sidebar.html")
OUT = os.path.join(ROOT, "docs/images")
EDGE = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"

STATE = {
    "lang": "en",
    "hasMedia": True,
    "filename": "Arcane.S02E01.1080p.NF.WEB-DL.DDP5.1.Atmos.x264-CtrlHD.mkv",
    "query": "Arcane S02E01",
    "engines": [
        {"id": "douban", "name": "Douban", "key": "Alt+1",
         "tpl": "https://search.douban.com/movie/subject_search?search_text={q}"},
        {"id": "imdb", "name": "IMDb", "key": "Alt+2",
         "tpl": "https://www.imdb.com/find/?q={q}&s=tt"},
        {"id": "tmdb", "name": "TMDB", "key": "Alt+3",
         "tpl": "https://www.themoviedb.org/search?query={q}&language=zh-CN"},
        {"id": "google", "name": "Google", "key": "Alt+4",
         "tpl": "https://www.google.com/search?q={q}"},
        {"id": "bing", "name": "Bing", "key": "Alt+5",
         "tpl": "https://www.bing.com/search?q={q}"},
    ],
    "copyKey": "Alt+c",
    "copyTarget": "filename",
    "copyPreview": "Arcane.S02E01.1080p.NF.WEB-DL.DDP5.1.Atmos.x264-CtrlHD",
    "hotkeys": ["Alt+1", "Alt+2", "Alt+3", "Alt+4", "Alt+5", "Alt+c"],
    "warnings": [],
    "message": "",
    "messageKind": "",
}

ZH_NAMES = {"Douban": "豆瓣", "Bing": "必应"}


def build(lang, dark):
    html = io.open(SRC, encoding="utf-8").read()
    state = dict(STATE)
    state["lang"] = lang
    if lang == "zh":
        state["engines"] = [dict(e, name=ZH_NAMES.get(e["name"], e["name"])) for e in state["engines"]]

    mock = """  <script>
    var MOCK_STATE = %s;
    window.iina = {
      postMessage: function () {},
      onMessage: function (name, cb) { if (name === "state") window.__setState = cb; }
    };
  </script>

  <script>
    // MARK: - 语言 / Localisation""" % (
        subprocess.run([sys.executable, "-c", "import json,sys;print(json.dumps(json.loads(sys.argv[1]), ensure_ascii=False))",
                        __import__("json").dumps(state, ensure_ascii=False)], capture_output=True, text=True).stdout.strip(),
    )

    anchor = """  <script>
    // MARK: - 语言 / Localisation"""
    assert html.count(anchor) == 1, "i18n script anchor missing"
    html = html.replace(anchor, mock)

    boot = """  <script>
    setTimeout(function () {
      if (window.__setState) window.__setState(MOCK_STATE);
    }, 120);
  </script>
</body>"""
    html = html.replace("</body>", boot)

    if dark:
        html = html.replace("@media (prefers-color-scheme: dark)", "@media all")

    inject = "<style>html { background: %s; } body { width: 320px; }</style>\n</head>" % (
        "#1e1e1e" if dark else "#ffffff")
    html = html.replace("</head>", inject, 1)

    path = "/tmp/shot-%s-%s.html" % (lang, "dark" if dark else "light")
    io.open(path, "w", encoding="utf-8").write(html)
    return path


def shot(html_path, png_path, lang):
    if os.path.exists(png_path):
        os.remove(png_path)
    cmd = [
        EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--allow-file-access-from-files", "--virtual-time-budget=1500",
        "--window-size=320,1000", "--force-device-scale-factor=2",
        "--screenshot=%s" % png_path, "file://" + html_path + "?lang=" + lang,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    ok = os.path.exists(png_path)
    print("  ", os.path.basename(png_path), "ok" if ok else "FAILED", proc.stderr.strip()[:120])
    return ok


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    jobs = [("en", False, "panel-en-light.png"), ("en", True, "panel-en-dark.png"),
            ("zh", False, "panel-zh-light.png"), ("zh", True, "panel-zh-dark.png")]
    for lang, dark, name in jobs:
        html = build(lang, dark)
        shot(html, os.path.join(OUT, name), lang)
