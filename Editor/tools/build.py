# -*- coding: utf-8 -*-
"""Build the self-contained anatomy editor HTML (all mod art inlined as data URIs)."""
import base64, json, os, re

WORK = r"C:\Misaki\Work\rimworld\NHT-Anatomy-Editor"
SRC = os.path.join(WORK, "src")
ASSETS = os.path.join(WORK, "assets")
MOD = r"C:\Program Files (x86)\Steam\steamapps\workshop\content\294100\3328729902"
OUT = os.path.join(WORK, "anatomy-editor.html")

payload = json.load(open(os.path.join(WORK, "tools", "embed.json"), encoding="utf-8"))

imgs = {}
total = 0
for dirpath, _, files in os.walk(ASSETS):
    for f in files:
        if not f.lower().endswith(".png"):
            continue
        full = os.path.join(dirpath, f)
        rel = os.path.relpath(full, ASSETS).replace("\\", "/")[:-4]
        # the editor's own art lives under HediffTab/; anything else in assets/ was written
        # by the "保存到 assets/" button at runtime and must stay a plain file
        if not rel.startswith("HediffTab/"):
            continue
        data = base64.b64encode(open(full, "rb").read()).decode("ascii")
        imgs[rel] = "data:image/png;base64," + data
        total += len(data)

icon = os.path.join(MOD, "About", "ModIcon.png")
imgs["About/ModIcon"] = "data:image/png;base64," + base64.b64encode(open(icon, "rb").read()).decode("ascii")

payload["imgs"] = imgs
data_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))

tpl = open(os.path.join(SRC, "editor.template.html"), encoding="utf-8").read()
app = open(os.path.join(SRC, "app.js"), encoding="utf-8").read()

if "</script>" in data_json or "</script>" in app:
    raise SystemExit("unsafe script terminator inside payload/app")

import time
html = tpl.replace("__NHT_DATA__", data_json).replace("__NHT_APP__", app).replace("__BUILD__", "build " + time.strftime("%m-%d %H:%M"))
open(OUT, "w", encoding="utf-8").write(html)

print("built", OUT)
print("html", round(len(html) / 1024), "KB · base64 imgs", round(total / 1024), "KB · parts",
      sum(len(b["parts"]) for b in payload["bodytypes"]), "· images", len(imgs))
