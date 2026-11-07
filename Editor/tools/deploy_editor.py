# -*- coding: utf-8 -*-
"""把编辑器部署到模组目录：只更新页面与素材。
   *** 绝不覆盖运行时的 nht-project.js ***（那是用户保存的数据）"""
import os, shutil, time

SRC = r"C:\Misaki\Work\rimworld\NHT-Anatomy-Editor"
import os as _os
MOD = r"C:\Misaki\Game\RimCrow\mods\NHT_CustomDollTest"
if not _os.path.isdir(MOD):
    MOD = r"C:\Misaki\Game\RimCrow\mods\NHT_CustomDolls"
DST = os.path.join(MOD, "Editor")

os.makedirs(DST, exist_ok=True)

# 1) 页面（唯一需要更新的运行文件）
shutil.copy2(os.path.join(SRC, "anatomy-editor.html"), os.path.join(DST, "anatomy-editor.html"))
print("copied anatomy-editor.html")

# 1.5) 可自行编辑的文本：ui/ 里的通知 / 提示 / 指南
ui_src = os.path.join(SRC, "ui")
ui_dst = os.path.join(DST, "ui")
os.makedirs(ui_dst, exist_ok=True)
for extra in ("notice.html", "tips.html", "guides.js", "file-notes.html"):
    src2 = os.path.join(ui_src, extra)
    if os.path.exists(src2):
        shutil.copy2(src2, os.path.join(ui_dst, extra))
        print("copied ui/" + extra)

# 2) 项目数据：只有不存在时才放一份初始的进去，存在就原样保留
proj_dst = os.path.join(DST, "nht-project.js")
if not os.path.exists(proj_dst):
    shutil.copy2(os.path.join(SRC, "nht-project.js"), proj_dst)
    print("seeded nht-project.js (first time)")
else:
    print("kept existing nht-project.js (not overwritten)")

# 3) assets（贴图清单 + png）：不删除旧文件，只补齐/更新
src_assets = os.path.join(SRC, "assets")
dst_assets = os.path.join(DST, "assets")
os.makedirs(dst_assets, exist_ok=True)
copied = 0
for root, dirs, files in os.walk(src_assets):
    rel = os.path.relpath(root, src_assets)
    target = dst_assets if rel == "." else os.path.join(dst_assets, rel)
    os.makedirs(target, exist_ok=True)
    for f in files:
        if f.lower().endswith((".bak", ".tmp")):
            continue
        s = os.path.join(root, f)
        d = os.path.join(target, f)
        try:
            if (not os.path.exists(d)) or os.path.getmtime(s) > os.path.getmtime(d):
                shutil.copy2(s, d)
                copied += 1
        except OSError:
            pass
print("assets updated:", copied)

# 4) 编辑器源码：src 全量 + 只放构建/部署需要的 tools 文件，随后随 Git 同步进入仓库
src_dir = os.path.join(SRC, "src")
src_dst = os.path.join(DST, "src")
if os.path.isdir(src_dir):
    try:
        if os.path.isdir(src_dst):
            shutil.rmtree(src_dst)
        shutil.copytree(src_dir, src_dst)
        print("copied source src")
    except OSError as e:
        print("source copy failed src: " + str(e))

tools_dst = os.path.join(DST, "tools")
os.makedirs(tools_dst, exist_ok=True)
for f in ("build.py", "deploy_editor.py", "embed.json"):
    sf = os.path.join(SRC, "tools", f)
    if os.path.exists(sf):
        shutil.copy2(sf, os.path.join(tools_dst, f))
        print("copied source tools/" + f)

print("deployed to", DST)
