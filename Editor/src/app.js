
/* ==========================================================================
   NHT · Anatomy Editor
   All anatomy art comes from the Nice Health Tab workshop mod.
   ========================================================================== */
(() => {
'use strict';

/* ---------- data ---------- */
const D = JSON.parse(document.getElementById('nht-data').textContent);
const IMG = D.imgs || {};
const ASSETS = D.assets || [];
const NAMES = D.names || {};
const PROSTH = D.prosthesis || [];
const MOD = D.mod || {};
const RJW = D.rjw || null;
const RJW_PARTS = (RJW && RJW.parts) || [];
const RJW_MOD = (RJW && RJW.mod) || {};
const RJW_FORM_NAMES = (RJW && RJW.formNames) || {};
const RJW_BY_DOLL = new Map();
RJW_PARTS.forEach(p => {
  if (!RJW_BY_DOLL.has(p.doll)) RJW_BY_DOLL.set(p.doll, []);
  RJW_BY_DOLL.get(p.doll).push(p);
});
const RJW_DOLLS = new Set(RJW_PARTS.map(p => p.doll));
const RJW_BY_ID = new Map(RJW_PARTS.map(p => [p.id, p]));
const DETAILS = D.details || {};
const ASSETMAP = new Map(ASSETS.map(a => [a.p, a]));
const MISSING_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const EXT = new Map();          // runtime textures from imported race mods: path -> {url,w,h}
const CUSTOM = new Map();       // user-added materials: path -> {n,w,h,data}
const PENDING_CUSTOM = new Set();  // baked / uploaded textures waiting to be written into the project
const LS_KEY = 'nht.anatomy.editor.v3';

/* ---------- tiny helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v, n = 1) => { const k = Math.pow(10, n); return Math.round(v * k) / k; };
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const icon = (id, cls = '') => `<svg${cls ? ` class="${cls}"` : ''}><use href="#i-${id}"/></svg>`;
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const now = () => { const d = new Date(); return d.toLocaleTimeString('zh-CN', { hour12: false }); };

/* ==================== 界面语言（中文 / English） ==================== */
const I18N_EN = {
  "解剖编辑器": "Anatomy Editor",
  "全局": "Global",
  "部位": "Part",
  "发型": "Hair",
  "异种": "Xenotypes",
  "素材": "Assets",
  "项目": "Project",
  "体型画布": "Body canvases",
  "部位结构": "Part tree",
  "已就绪": "Ready",
  "参考发型": "Reference hair",
  "历史": "History",
  "从文件重载": "Reload from file",
  "本地保存（全部画布）": "Save all canvases",
  "帮助 · 快捷键": "Help & shortcuts",
  "设置": "Settings",
  "指南": "Guides",
  "收到": "Got it",
  "发型提示": "Hair tips",
  "撤销 Ctrl+Z": "Undo Ctrl+Z",
  "重做 Ctrl+Shift+Z": "Redo Ctrl+Shift+Z",
  "画布与项目（全局）属性": "Canvas & project properties",
  "当前选中部位的属性": "Selected part properties",
  "发型：重绘 / 导出发型坐标 / 预览": "Hair: redraw / export offsets / preview",
  "颜色异种：同一形态下按 Hediff 换不同贴图": "Xenotypes: swap textures by Hediff",
  "素材库": "Asset library",
  "项目 / 导出 / 注入 / Git 同步": "Project / Export / Inject / Git",
  "拖动部位移动 · 滚轮缩放 · 空格拖拽平移 · Delete 拆卸部位": "Drag to move · wheel to zoom · space to pan · Delete to detach",
  "折叠 / 展开这个面板": "Collapse / expand panel",
  "收起 / 展开": "Collapse / expand",
  "全部": "All",
  "全部展开": "Expand all",
  "全部折叠": "Collapse all",
  "全部显示": "Show all",
  "回到顶部": "Back to top",
  "缩小": "Zoom out",
  "放大": "Zoom in",
  "适配视图 F": "Fit view F",
  "新建画布": "New canvas",
  "从模组导入画布": "Import canvas from mod",
  "画布": "Canvas",
  "新建": "New",
  "导入": "Import",
  "导出": "Export",
  "注入": "Inject",
  "保存": "Save",
  "删除": "Delete",
  "取消": "Cancel",
  "确定": "OK",
  "关闭": "Close",
  "应用": "Apply",
  "重置": "Reset",
  "复制": "Copy",
  "粘贴": "Paste",
  "搜索": "Search",
  "名称": "Name",
  "作者": "Author",
  "包名": "Package ID",
  "备注": "Notes",
  "位置": "Position",
  "缩放": "Scale",
  "旋转": "Rotate",
  "图层": "Layer",
  "贴图": "Texture",
  "颜色": "Color",
  "发色": "Hair color",
  "灰度": "Grayscale",
  "基础": "Base",
  "其他": "Other",
  "基因": "Gene",
  "添加": "Add",
  "移除": "Remove",
  "预览": "Preview",
  "编辑": "Edit",
  "选择": "Select",
  "锁定": "Lock",
  "解锁": "Unlock",
  "显示": "Show",
  "隐藏": "Hide",
  "是": "Yes",
  "否": "No",
  "路径": "Path",
  "文件夹": "Folder",
  "文件": "File",
  "图片": "Image",
  "大小": "Size",
  "宽度": "Width",
  "高度": "Height",
  "水平翻转": "Flip horizontally",
  "重置旋转": "Reset rotation",
  "参考": "Reference",
  "参考图": "Reference image",
  "不透明度": "Opacity",
  "顺序": "Order",
  "置顶": "On top",
  "联动": "Link top",
  "色彩": "Color",
  "重画": "Redraw",
  "自定": "Custom",
  "装饰": "Decor",
  "部位颜色": "Part color",
  "跟随发色": "Follow hair color",
  "跟随发色部位": "Hair-colored parts",
  "外观": "Appearance",
  "外观状态 GENE LOOK": "Appearance GENE LOOK",
  "条件与名称": "Conditions & name",
  "导入异种": "Import xenotypes",
  "其他异种": "Other xenotypes",
  "删除这个异种": "Delete this xenotype",
  "当前": "Current",
  "覆盖": "Override",
  "基础贴图": "Base texture",
  "还没有异种": "No xenotypes yet",
  "导入异种（自动全部生成）": "Import xenotypes (auto)",
  "从模组导入异种": "Import xenotypes from mod",
  "选择要推送的文件": "Select files to push",
  "推送更改": "Push changes",
  "拉取远端": "Pull remote",
  "未推送": "Unpushed",
  "已同步": "Synced",
  "同步日志": "Sync log",
  "仓库同步 REPO": "Repo sync",
  "远程仓库": "Remote",
  "分支": "Branch",
  "目录": "Directory",
  "提交说明": "Commit message",
  "提交描述": "Commit description",
  "全选": "Select all",
  "全不选": "Select none",
  "推送": "Push",
  "读取中…": "Loading…",
  "正在读取本地更改…": "Reading local changes…",
  "正在读取本地更改…（最多 20 秒）": "Reading local changes… (max 20s)",
  "界面语言 / UI language": "UI language",
  "展开": "Expand",
  "折叠": "Collapse",
  "基础贴图（所有未覆盖部位使用基础）": "Base texture (uncovered parts use base)",
  "基因异种": "Gene xenotype",
  "Hediff 异种": "Hediff xenotype",
  "无": "None",
  "导入种族": "Import race",
  "未分类": "Uncategorized",
  "分组": "Groups",
  "种族": "Race",
  "默认体型": "Default body",
  "以 Nice Health Tab 模组 1.6 默认体型为基准制作的部位补丁。": "A part patch based on Nice Health Tab 1.6's default body.",
  "自建": "Custom",
  "新分组": "New group",
  "新分组名称：": "New group name:",
  "删除分组": "Delete group",
  "删除画布": "Delete canvas",
  "锁定画布": "Lock canvas",
  "解除锁定": "Unlock",
  "替换": "Replace",
  "点击只读预览；右键可还原": "Click for read-only preview; right-click to restore",
  "（无标题）": "(untitled)",
  "关联画布": "Linked canvas",
  "有需要检查的项目": "Needs attention",
  "外形": "Shape",
  "眼睛": "Eyes",
  "装饰": "Decor",
  "自定义部位": "Custom part",
  "未绑定": "Unbound",
  "器官层": "Organ layer",
  "割伤": "Cut",
  "撕裂": "Torn",
  "烧伤": "Burn",
  "疤痕": "Scar",
  "不包扎": "No bandage",
  "包扎·全": "Bandaged (full)",
  "包扎·半": "Bandaged (half)",
  "差包扎·全": "Poor bandage (full)",
  "差包扎·半": "Poor bandage (half)",
  "是否显示": "Visible",
  "已锁定": "Locked",
  "已固定": "Pinned",
  "左": "Left",
  "右": "Right",
  "上": "Up",
  "下": "Down",
  "暂无部位": "No parts",
  "在这一栏新建部位（再到素材里点贴图）": "Add a part here, then pick its texture in Assets",
  "显示 / 隐藏整组": "Show / hide group",
  "拖动可以排序 / 换栏": "Drag to reorder / move",
  "还原：即使种族没有这个部位，也强制使用": "Restore: force-use even if the race lacks this part",
  "搜索：耳朵 / ear / 翅膀 / wing / #18": "Search: ear / wing / #18",
  "形状": "Shape",
  "贴图 TEXTURE": "TEXTURE",
  "变换 TRANSFORM": "TRANSFORM",
  "位置 POSITION": "POSITION",
  "缩放 SCALE": "SCALE",
  "旋转 ROTATE": "ROTATE",
  "图层 LAYER": "LAYER",
  "命中框": "Hitbox",
  "护甲": "Armor",
  "可见框": "Visible box",
  "真实可见": "Really visible",
  "判定框": "Hitbox",
  "从模组素材替换": "Replace from mod assets",
  "裁剪": "Crop",
  "横向缩放": "Horizontal scale",
  "纵向缩放": "Vertical scale",
  "缩放恢复成 100%（判定框按同比例回退）": "Reset scale to 100% (hitbox scales back)",
  "命中框宽度": "Hitbox width",
  "命中框高度": "Hitbox height",
  "命中框复位（回到居中、按导出比例）": "Reset hitbox (center, export ratio)",
  "护甲 / 提示图标的 X 偏移": "Armor / icon X offset",
  "护甲 / 提示图标的 Y 偏移": "Armor / icon Y offset",
  "图标回到部位中心": "Center icon",
  "身高": "Height",
  "形态映射": "Body aliases",
  "图层顺序": "Layer order",
  "边界": "Bounds",
  "导出偏移": "Export offset",
  "显示框": "Display box",
  "轮廓": "Outline",
  "来源": "Source",
  "说明": "Notes",
  "全局属性": "Global",
  "参考线": "Guides",
  "备注贴纸": "Notes",
  "备注": "Note",
  "网格": "Grid",
  "器官": "Organs",
  "骨骼": "Bones",
  "手掌": "Hands",
  "脚掌": "Feet",
  "更多": "More",
  "固定": "Pin",
  "贴底居中": "Bottom center",
  "居中": "Center",
  "贴顶居中": "Top center",
  "自定义（画布拖动）": "Custom (drag on canvas)",
  "删除这张画布": "Delete this canvas",
  "我的素材": "My assets",
  "种族素材": "Race assets",
  "体型部件": "Body parts",
  "假体 / 附肢": "Prosthetics / appendages",
  "RJW 部位": "RJW parts",
  "贴花": "Decals",
  "图标": "Icons",
  "尾巴": "Tails",
  "触手": "Tentacles",
  "长触手": "Long tentacles",
  "肉鞭": "Flesh whip",
  "翼（模拟）": "Wings (simulated)",
  "钩手": "Hook hand",
  "木腿": "Peg leg",
  "猪鼻": "Pig nose",
  "素材分类": "Asset categories",
  "导入素材": "Import assets",
  "导入发型": "Import hair",
  "本地导入": "Local import",
  "重命名分类（会改文件夹名）": "Rename category (renames folder)",
  "删除分类（会删除文件夹）": "Delete category (deletes folder)",
  "搜索贴图：翅膀 / tail / organ …": "Search textures: wing / tail / organ …",
  "没有可用的图片": "No images available",
  "补丁信息 PATCH": "PATCH INFO",
  "仓库同步 REPO": "REPO SYNC",
  "补丁名称": "Patch name",
  "参考图": "Reference image",
  "选择预览头发": "Choose preview hair",
  "后背层": "Back layer",
  "呆毛层": "Ahoge layer",
  "重新贴合": "Refit",
  "回到自动贴合": "Back to auto fit",
  "临时隐藏 / 显示参考图，位置不会丢": "Temporarily hide / show reference; position is kept",
  "已隐藏": "Hidden",
  "未命名": "Untitled",
  "发型参考": "Hair reference",
  "正在同步 RJW 部位…": "Syncing RJW parts…",
  "RJW 开关已关闭 · 在画布工具栏或画布属性中打开": "RJW is off · enable it in the canvas toolbar or canvas properties",
  "当前画布没有 RJW 部位": "This canvas has no RJW parts"
};
const I18N_EN_MORE = {
  "身体部件": "Body parts",
  "器官 / 骨骼": "Organs / Bones",
  "其它素材": "Other assets",
  "分类": "Category",
  "完好": "Healthy",
  "受伤": "Injured",
  "缺失": "Missing",
  "假体": "Prosthetic",
  "开": "On",
  "关": "Off",
  "默认": "Default",
  "男": "Male",
  "女": "Female",
  "导出发型坐标": "Export hair offsets",
  "补丁写入 NHTCD_HairFit_*，游戏按这里的数值绘制": "Writes NHTCD_HairFit_*; the game draws with these values",
  "补丁不写参数，游戏用默认值 0.78 / -0.21": "No patch values; the game uses 0.78 / -0.21",
  "关闭后头发按原图显示（不上色）": "Hair is drawn untinted",
  "已隐藏发色": "Hair color hidden",
  "显示发色": "Show hair color",
  "仅编辑器预览：游戏里用的是小人自己的发色": "Editor preview only; in game the pawn's own hair color is used",
  "恢复默认发色": "Reset hair color",
  "显示预览": "Show preview",
  "隐藏预览": "Hide preview",
  "锁定头发": "Lock hair",
  "已隐藏边框": "Frame hidden",
  "隐藏预览边框": "Hide preview frame",
  "主层层级 0–29（编辑器显示 + 写入补丁）": "Main layer 0–29 (editor + patch)",
  "显示头发": "Show hair",
  "隐藏头发": "Hide hair",
  "骨骼 / 器官视图里是否显示头发（默认不显示）": "Show hair in skeleton / organ view (off by default)",
  "让发型跟着「导出偏移」一起移动：导出时自动从发型 Y 偏移里扣掉画布偏移": "Move hair with export offset: subtract canvas offset from hair Y on export",
  "未锁定": "Unlocked",
  "头发已锁定，点击解锁": "Hair locked; click to unlock",
  "锁定头发：对齐好后防止被拖动": "Lock hair after aligning to prevent dragging",
  "套用这个异种的基因状态": "Apply this xenotype's gene state",
  "基因 ·": "Gene ·",
  "异种 ·": "Xenotype ·",
  "手动": "Manual",
  "处覆盖": "overrides",
  "· 已调坐标": "· adjusted",
  "继承基础贴图": "Inherit base texture",
  "· 左右自动": "· auto L/R",
  "更换": "Change",
  "恢复基础贴图": "Restore base texture",
  "删除当前基因异种": "Delete current gene xenotype",
  "多条异种同时命中时，数字大的先生效": "When multiple xenotypes match, higher priority wins",
  "当前小人带有这个 Hediff 时，选中的部位改用覆盖贴图。": "When the pawn has this Hediff, the selected part uses the override texture.",
  "自动猜图": "Auto-guess texture",
  "异种异种：按异种区分同一体型的贴图。": "Xenotypes: different textures for the same body type.",
  "骨骼 / 器官视图会显示头发": "Hair will show in skeleton / organ view",
  "骨骼/器官视图隐藏头发": "Hair hidden in skeleton / organ view",
  "头发已锁定（拖动/滚轮不再移动它）": "Hair locked (drag/wheel no longer moves it)",
  "头发已解锁": "Hair unlocked",
  "已隐藏头发预览边框": "Hair preview frame hidden",
  "已显示头发预览边框": "Hair preview frame shown",
  "已隐藏后背层预览": "Back layer preview hidden",
  "已显示后背层预览": "Back layer preview shown",
  "头发预览已隐藏（仅这张画布）": "Hair preview hidden (this canvas only)",
  "头发预览已显示": "Hair preview shown",
  "没有后背层": "No back layer",
  "这发型没有单独的后背层": "This hair has no separate back layer",
  "选了预览头发后自动匹配": "Auto-matched after choosing preview hair",
  "素材载入中…": "Loading assets…",
  "本地素材": "Local assets",
  "项目贴图": "Project textures",
  "模组素材": "Mod assets",
  "本地还没有素材，先导入一次": "No local assets yet; import once first",
  "全选 / 全不选这一组": "Select / deselect this group",
  "操作": "Actions",
  "折叠": "Collapse",
  "展开": "Expand",
  "收起": "Collapse",
  "展开全部": "Expand all",
  "状态": "State",
  "外观状态": "Appearance state",
  "条件与名称": "Conditions & name",
  "其它": "Other",
  "其他": "Other",
  "删除": "Delete",
  "复制": "Copy",
  "镜像": "Mirror",
  "副本": "Copy",
  "只读预览": "Read-only preview",
  "应用": "Apply",
  "还原": "Restore",
  "导出": "Export",
  "导入": "Import",
  "保存": "Save",
  "取消": "Cancel",
  "确定": "OK",
  "重置": "Reset",
  "清除": "Clear",
  "新建": "New",
  "添加": "Add",
  "移除": "Remove",
  "选择": "Select",
  "搜索": "Search",
  "上一个": "Previous",
  "下一个": "Next",
  "关闭": "Close",
  "打开": "Open",
  "路径": "Path",
  "文件夹": "Folder",
  "素材分类": "Asset category",
  "从模组素材替换": "Replace from mod assets",
  "裁剪": "Crop",
  "重新贴合": "Refit",
  "回到自动贴合": "Back to auto fit",
  "参考图": "Reference image",
  "参考发型": "Reference hair",
  "选择预览头发": "Choose preview hair",
  "后背层": "Back layer",
  "呆毛层": "Ahoge layer",
  "头发": "Hair",
  "发型": "Hair",
  "胡须": "Beard",
  "颜色": "Color",
  "发色": "Hair color",
  "灰度": "Grayscale",
  "形状": "Shape",
  "大小": "Size",
  "宽度": "Width",
  "高度": "Height",
  "旋转": "Rotate",
  "位置": "Position",
  "缩放": "Scale",
  "图层": "Layer",
  "不透明度": "Opacity",
  "固定": "Pin",
  "居中": "Center",
  "贴底居中": "Bottom center",
  "贴顶居中": "Top center",
  "自定义（画布拖动）": "Custom (drag on canvas)",
  "删除这张画布": "Delete this canvas",
  "我的素材": "My assets",
  "种族素材": "Race assets",
  "体型部件": "Body parts",
  "假体 / 附肢": "Prosthetics / appendages",
  "RJW 部位": "RJW parts",
  "贴花": "Decals",
  "图标": "Icons",
  "尾巴": "Tails",
  "触手": "Tentacles",
  "长触手": "Long tentacles",
  "肉鞭": "Flesh whip",
  "翼（模拟）": "Wings (simulated)",
  "钩手": "Hook hand",
  "木腿": "Peg leg",
  "猪鼻": "Pig nose",
  "分组": "Groups",
  "游戏里按小人的基因自动匹配；这里只切换编辑器预览。": "Matched automatically by genes in game; this only changes the editor preview.",
  "开启后选中的贴图会先裁掉透明边，再保存到这个异种的文件夹": "Selected textures are cropped and saved into this xenotype's folder.",
  "素材库/发型里还没有贴图，先「导入发型」或「导入素材」": "No textures yet; import hair or assets first.",
  "导出纯模组文件：About + Patches（重新生成的补丁）+ Textures，不含编辑器页面": "Export mod files: About + Patches + Textures, without the editor page.",
  "只导出当前画布的补丁文本（.xml）": "Export current canvas patch (.xml).",
  "把当前画布渲染成 2 倍尺寸的 PNG": "Render current canvas as a 2× PNG.",
  "把本机仓库的改动提交并推送；第一次推送会自动在远端创建当前分支": "Commit and push local changes; the first push creates the branch on the remote.",
  "立即同步：重新读取仓库状态": "Sync now: reload repo status.",
  "Git 设置": "Git settings",
  "测试连接": "Test connection",
  "拉取远端": "Pull remote",
  "推送更改": "Push changes",
  "未推送": "Unpushed",
  "已同步": "Synced",
  "同步日志": "Sync log",
  "远程仓库": "Remote",
  "本机仓库": "Local repo",
  "分支": "Branch",
  "目录": "Directory",
  "提交说明": "Commit message",
  "提交描述": "Commit description",
  "全选": "Select all",
  "全不选": "Select none",
  "推送": "Push",
  "拉取": "Pull",
  "导出模组文件": "Export mod files",
  "导出当前画布补丁": "Export canvas patch",
  "导出画布 PNG": "Export canvas PNG",
  "保存项目": "Save project",
  "注入模组": "Inject mod",
  "立即注入": "Inject now",
  "导入项目": "Import project",
  "导入画布": "Import canvas",
  "注入 INJECT": "INJECT",
  "只保存": "Only saves",
  "当前画布": "current canvas",
  "其它画布不会写入": "other canvases are not written",
  "单独注入模组": "Inject into mod",
  "多选注入模组": "Multi-inject mods",
  "注入选中画布": "Inject selected canvases",
  "单独注入只写": "Single inject writes only",
  "（其它画布不动）；多选注入可以勾选多张画布一起写，": "(other canvases untouched); multi-inject can write several canvases together,",
  "改过的画布会自动预选。补丁写进模组的 ": "Modified canvases are preselected. Patches are written to the mod's ",
  "，本机导入的贴图写进 ": ", local imported textures are written to ",
  "。": ".",
  "导出 EXPORT": "EXPORT",
  "导出模组文件": "Export mod files",
  "导出补丁 XML": "Export patch XML",
  "导出项目 JSON": "Export project JSON",
  "导入项目 JSON": "Import project JSON",
  "导出画布 PNG": "Export canvas PNG",
  "纯模组": "Mod only",
  "导出范围 SCOPE": "EXPORT SCOPE",
  "补丁只导出": "The patch only exports",
  "已有的体型 / 部位用 ": "Existing bodies / parts are replaced with ",
  " 覆盖，新部位与拆卸用 Add / Remove。要导别的体型，先切到那张画布再导出。": "; new/detached parts use Add / Remove. To export another body, switch to its canvas first.",
  "校验 CHECK": "CHECK",
  "读取中…": "Loading…",
  "错误": "errors",
  "警告": "warnings",
  "正在读取模组 Textures 清单，读完后这里会显示完整检查结果。": "Reading the mod Textures index; the full check will appear when done.",
  "全部检查通过，可以导出。": "All checks passed; ready to export.",
  "补丁预览 PREVIEW": "PREVIEW",
  "复制": "Copy",
  "收起": "Collapse",
  "展开全部": "Expand all",
  "行": "lines",
  "个操作": "operations",
  "这里只预览": "This previews only",
  "的补丁；多个画布请用「多选注入模组」或「导出模组文件」。": "'s patch; use Multi-inject or Export mod files for multiple canvases.",
  "未连接": "Disconnected",
  "当前本地分支：": "Current local branch: ",
  "用当前分支": "Use current branch",
  "未拉取": "Unpulled",
  "（暂无记录）": "(no records)",
  "无前缀": "No prefix",
  "分支名，例如 feature-milira-hair": "Branch name, e.g. feature-milira-hair",
  "推送 / 拉取使用的分支（会自动在远端创建）": "Branch used for push / pull (created on the remote automatically)",
  "从远端拉取更新（fast-forward）；有未拉取的提交时按钮会发光并显示数量": "Pull updates (fast-forward); glows with a count when behind",
  "把「分支」改成当前本地分支": "Set Branch to the current local branch",
  "立即同步：重新读取仓库状态": "Sync now: reload repo status",
  "推送 / 拉取 / 测试连接的完整输出，失败原因都在这里": "Full push / pull / test output and errors",
  "未推送 = 还没推到 GitHub 任何分支的提交": "Unpushed = commits not pushed to any GitHub branch",
  "GitHub 上还没拉到本地的提交数（不是文件数）": "Commits on GitHub not pulled locally (not files)",
  "还有画布没注入": "Some canvases are not injected",
  "下面 ": "Below, ",
  " 个画布有改动，但还没注入模组：": " canvases have changes but are not injected yet:",
  "如果你只是想确认，可以继续。也可以先去「多选注入模组」把它们写进现有模组。": "You can continue to confirm, or use Multi-inject first to write them into the mod.",
  "未同步": "Not synced",
  "同步失败": "Sync failed",
  "正在连接远端检查…": "Checking remote…",
  "已同步仓库状态": "Repo status synced",
  "Git 连接正常": "Git connected",
  "Git 连接失败": "Git connection failed",
  "无法连接仓库": "Cannot connect to repo",
  "测试连接成功": "Connection OK",
  "测试连接失败": "Connection failed",
  "状态": "Status",
  "待推送": "To push",
  "待拉取": "To pull",
  "本地提交": "Local commits",
  "远端检测": "Remote check",
  "新功能": "Feature",
  "修复": "Fix",
  "文档": "Docs",
  "测试": "Test",
  "新增内容：画布、部位、发型等": "New content: canvases, parts, hair, etc.",
  "修 BUG / 数值错位": "Fix bugs / offsets",
  "只改说明、截图、README": "Docs, screenshots, README only",
  "试验性改动，随时可丢": "Experimental, can be dropped anytime",
  "自己写完整分支名（不能是 main）": "Write your own full branch name (not main)",
  "：补丁只导出": ": The patch only exports",
  "已有的体型 / 部位用": "Existing bodies / parts use",
  "覆盖，新部位与拆卸用 Add / Remove。要导别的体型，先切到那张画布再导出。": " to override; new/detached parts use Add / Remove. To export another body, switch to its canvas first.",
  "★ 我的素材": "★ My assets",
  "保存当前分类": "Save current category",
  "保存选择的素材": "Save selected assets",
  "保存到当前分类": "Save to current category",
  "保存到 assets/": "Save to assets/",
  "正在保存到 assets/": "Saving to assets/",
  "勾选这个栏，点上面的「保存选择的素材」落盘": "Check this column, then click Save selected assets above",
  "勾选这个子栏，点上面的「保存选择的素材」落盘": "Check this sub-column, then click Save selected assets above",
  "全选 / 全不选这一组": "Select / deselect this group",
  "当前分类里没有能写入磁盘的素材": "No assets in this category can be written to disk",
  "先在分组标题右侧勾选要保存的栏，或先选一个分类": "Check a column by the group title, or pick a category first"
};

const I18N_MODAL = {
  "选择卡片成组合": "Combine selected cards",
  "选择部位": "Select part",
  "移动哪一层头发": "Which hair layer to move",
  "添加形态映射": "Add body alias",
  "复制为另一形态": "Duplicate as another form",
  "指南": "Guides",
  "选择要推送的文件": "Select files to push",
  "导出模组文件": "Export mod files",
  "还有画布没注入": "Some canvases are not injected",
  "设置": "Settings",
  "多选注入模组": "Multi-inject mods",
  "导入异种": "Import xenotypes",
  "选择要生成基因外观的部位": "Select parts for gene looks",
  "新建颜色异种": "New xenotype",
  "选择异种贴图": "Select xenotype texture",
  "选择要导入的种族": "Select a race to import",
  "新建部位": "New part",
  "新建画布": "New canvas",
  "操作说明 · 快捷键": "Help · shortcuts",
  "再次确认": "Confirm again",
  "删除异种": "Delete xenotype",
  "保存到 assets/": "Save to assets/",
  "正在保存到 assets/": "Saving to assets/",
  "导入素材": "Import assets",
  "导入发型": "Import hair",
  "本地保存历史": "Local save history",
  "＋ 新建分组": "+ New group",
  "取消": "Cancel",
  "否，保留画布": "No, keep canvas",
  "是，一起删除": "Yes, delete all",
  "组合": "Combine",
  "装回": "Put back",
  "删除": "Delete",
  "移动 HAR 头发预览": "Move HAR hair preview",
  "移动 参考头发": "Move reference hair",
  "全局属性": "Global properties",
  "取消选择": "Deselect",
  "翻转": "Flip",
  "恢复默认": "Reset to default",
  "贴合可见像素": "Fit to visible pixels",
  "可见框→命中框": "Visible box → hitbox",
  "重置缩放": "Reset scale",
  "把旋转烘焙进贴图": "Bake rotation into texture",
  "复制": "Copy",
  "镜像成对": "Mirror pair",
  "拆卸": "Detach",
  "添加": "Add",
  "已自动": "Auto",
  "应用": "Apply",
  "＋ 复制为另一形态": "+ Duplicate as another form",
  "＋ 添加映射": "+ Add alias",
  "全部显示": "Show all",
  "全部隐藏": "Hide all",
  "重新同步": "Resync",
  "按官方 def 校正部位编号": "Fix IDs by official defs",
  "按部位适配边界": "Fit bounds to parts",
  "按对照表修正编号": "Fix IDs by table",
  "同步游戏部位表": "Sync game body parts",
  "删除画布": "Delete canvas",
  "重置为模组默认": "Reset to mod default",
  "裁剪": "Crop",
  "裁剪并保存": "Crop and save",
  "导出 PNG（选择保存位置）": "Export PNG (choose location)",
  "打开文件所在文件夹": "Open containing folder",
  "新建分类并保存…": "New category and save…",
  "复位": "Reset",
  "关掉": "Close",
  "下移": "Move down",
  "上移": "Move up",
  "未命名": "Untitled",
  "自动裁剪": "Auto crop",
  "点击套用": "Click to apply",
  "重建模组素材清单（assets/）": "Rebuild mod asset index (assets/)",
  "推送更改": "Push changes",
  "用当前分支": "Use current branch",
  "导出模组文件纯模组": "Export mod files (mod only)",
  "导出补丁 XML.xml": "Export patch XML (.xml)",
  "导出项目 JSON.json": "Export project JSON (.json)",
  "导入项目 JSON.json": "Import project JSON (.json)",
  "导出画布 PNG2×": "Export canvas PNG (2×)",
  "还原": "Restore",
  "全选": "Select all",
  "全不选": "Select none",
  "导出": "Export",
  "继续导出": "Continue export",
  "保存": "Save",
  "界面": "Interface",
  "上传 About.xml": "Upload About.xml",
  "读取模组目录现有": "Read existing mod folder",
  "用项目信息生成": "Generate from project info",
  "清空": "Clear",
  "测试连接": "Test connection",
  "刷新状态": "Refresh status",
  "清理无用贴图": "Clean unused textures",
  "还原清理备份": "Restore cleanup backup",
  "放弃": "Discard",
  "只选已修改": "Select modified only",
  "注入选中画布": "Inject selected canvases",
  "重置": "Reset",
  "选择预览头发": "Choose preview hair",
  "导入异种（自动全部生成）": "Import xenotypes (auto)",
  "清除": "Clear",
  "基础贴图所有未覆盖部位使用基础": "Base texture (uncovered parts use base)",
  "调整": "Adjust",
  "更换": "Change",
  "选择": "Select",
  "删除这个异种": "Delete this xenotype",
  "生成": "Generate",
  "创建": "Create",
  "旋转归零": "Reset rotation",
  "复位命中框": "Reset hitbox",
  "自动裁剪透明区域": "Auto-crop transparent area",
  "完成": "Done",
  "导入模组发型…": "Import mod hair…",
  "GIT 画布书签": "Git canvas bookmarks",
  "返回": "Back",
  "关闭": "Close",
  "撤销": "Undo",
  "应用这版画布": "Apply this canvas version",
  "选择 PNG 补齐…": "Choose PNG to fill…",
  "前往设置HAR发型": "Go to settings (HAR hair)",
  "去发型页": "Go to Hair tab",
  "生成并写入灰图": "Generate and write grayscale",
  "迁移并写入灰度": "Migrate and write grayscale",
  "同步素材": "Sync assets",
  "立即注入": "Inject now",
  "选择文件夹": "Choose folder",
  "创建画布": "Create canvas",
  "知道了": "Got it",
  "确认": "Confirm",
  "确认删除": "Confirm delete",
  "按勾选写入": "Write selected",
  "从模组文件夹导入": "Import from mod folder",
  "载入这份": "Load this one",
  "✂裁剪": "✂ Crop",
  "✂裁剪并保存": "✂ Crop and save",
  "⤓导出 PNG（选择保存位置）": "⤓ Export PNG (choose location)",
  "📂打开文件所在文件夹": "📂 Open containing folder",
  "＋新建分类并保存…": "+ New category and save…",
  "↩ 还原": "↩ Restore",
  "Git 画布书签": "Git canvas bookmarks",
  "最近改动": "Recent changes",
  "Git 版本": "Git version",
  "只读": "Read-only",
  "已替代": "Replaced",
  "正在读取仓库里的画布版本…": "Reading canvas versions from repo…",
  "读取失败：": "Read failed: ",
  "仓库里还没有画布的历史版本。": "No canvas versions in the repo yet.",
  "先在「仓库同步 REPO」推送一次画布，这里就会出现最近 3 个版本。": "Push a canvas from Repo Sync first; the last 3 versions will appear here.",
  "这个提交里没有画布文件": "No canvas files in this commit",
  "点击打开这版画布，像普通画布一样编辑部位": "Open this canvas version to edit parts",
  "撤销：恢复到应用之前的画布": "Undo: restore the canvas before applying",
  "应用：有同名画布就替换，没有就作为游离画布加入": "Apply: replace a same-name canvas or add as a loose canvas",
  "已被更新的版本替代": "Replaced by a newer version",
  "关闭预览": "Close preview",
  "退出临时查看，回到原来的画布": "Exit preview and return to the original canvas",
  "把这版画布写入项目（可编辑）": "Write this version into the project (editable)",
  "把这个画布放回项目": "Put this canvas back into the project",
  "Git 画布书签：看看最近推送过的画布版本，可一键应用或撤销": "Git canvas bookmarks: apply or undo recent pushed canvas versions",
  "Git 画布书签：读取仓库里 Editor/canvases 最近 3 个版本的画布，可预览 / 应用 / 撤销": "Git canvas bookmarks: preview / apply / undo the last 3 canvas versions in the repo",
  "部位属性": "Part properties",
  "画布属性": "Canvas properties",
  "显示设置": "Display settings",
  "导出设置": "Export settings",
  "实际显示框": "Display box",
  "解除固定": "Unpin",
  "固定显示框": "Pin display box",
  "解除固定显示框": "Unpin display box",
  "显示实际显示框": "Show display box",
  "隐藏实际显示框": "Hide display box",
  "清除显示框": "Clear display box",
  "按部位适配边界": "Fit bounds to parts",
  "按部位适配": "Fit to parts",
  "边界": "Bounds",
  "高度": "Height",
  "宽度": "Width",
  "偏移": "Offset",
  "身体部位": "Body part",
  "绑定": "Binding",
  "序号": "ID",
  "护甲图标": "Armor icon",
  "图标": "Icon",
  "部位颜色": "Part color",
  "跟随发色": "Follow hair color",
  "装饰": "Decor",
  "自定": "Custom",
  "种族无此部位": "Race has no such part",
  "外形部位": "Body part",
  "器官": "Organ",
  "骨骼": "Bone",
  "眼睛": "Eye",
  "自定义部位": "Custom part",
  "标识": "Identity",
  "变换": "Transform",
  "命中框": "Hitbox",
  "护甲": "Armor",
  "可见框": "Visible box",
  "固定居中 · 只能改大小": "Fixed center · size only",
  "护甲覆盖图标": "Armor overlay icon",
  "装饰部位：只画图、不参与受伤。NHT 的部位定义里 bodyPartId 是整数，导出时不写这一项，游戏会按 #0 躯干 处理（不会影响受伤数据）。": "Decor part: drawn only, no injuries. bodyPartId is an integer; omitted on export and treated as #0 Torso.",
  "当前头发层级 = ": "Current hair layer = ",
  "：头发会在第一个「图层 ≥ ": ": hair is drawn before the first part with layer ≥ ",
  "」的部位之前绘制，所以": "; parts with a higher layer will cover the hair, lower ones are covered by hair.",
  "导出为 ": "Exported as ",
  "：模组里那张 ": ": the mod's ",
  " 会被覆盖。": " will be overwritten.",
  "装饰部位": "Decor part",
  "没有绑定身体部位：只在这个小窗里显示。": "No body part bound: shown only in this window.",
  "窗口内的排版坐标（以窗口底图为参照），只影响这个小窗，不会移动人偶上的同名部位。拖动窗口本体可移动窗口，右下角可等比缩放，标题栏右上角可固定窗位。": "Window-local layout coordinates (relative to the window background). Only affects this window, not the doll part. Drag the window to move it, resize from the bottom-right, pin from the title bar.",
  "固定居中": "Fixed center",
  "发型显示设置": "Hair display settings",
  "模组自绘": "Mod-drawn",
  "发型重绘": "Hair redraw",
  "缩放 / 偏移X / 偏移Y": "Scale / Offset X / Offset Y",
  "只影响编辑器预览": "Editor preview only",
  "发色（预览）": "Hair color (preview)",
  "按正片叠底上色，接近游戏里的效果": "Multiply blend, close to the in-game look",
  "主层层级 · 越大越靠上（后背层固定画在所有部位之下）": "Main layer · higher is on top (back layer is always below all parts)",
  "这张画布是「原版 HairDef」头发：缩放/偏移的用法和 HAR 发型完全一样 —— 滚轮缩放、拖动移位，调完就是游戏里的效果。": "This canvas uses vanilla HairDef hair: scale/offset work the same as HAR — wheel to scale, drag to move; the result is what you see in game.",
  "显示 / 偏移联动": "Display / offset link",
  "骨骼 / 器官视图显示": "Show in skeleton / organ view",
  "发型跟随偏移": "Hair follows offset",
  "HAR 种族（如米莉拉）的头发是附加件，模组按这些参数自绘：缩放 1 = 铺满整身，偏移以身高为单位（负值向上）。": "HAR races (e.g. Milira) draw hair as an addon with these parameters: scale 1 = full body; offset is in body-height units (negative = up).",
  "无预览": "No preview",
  "无附加层": "No extra layers",
  "显示 / 隐藏后脑层": "Show / hide back layer",
  "显示 / 隐藏呆毛": "Show / hide ahoge",
  "当前发型：": "Current hair: ",
  "未选择": "Not selected",
  "无后背层": "No back layer",
  "仅参考-NHT模组自带发型配对": "Reference only — paired with NHT's built-in hair",
  "后层": "Back",
  "发型状态 HAIR STATUS": "HAIR STATUS",
  "HAR 附加件发型：": "HAR addon hair: ",
  " 共 ": " total ",
  " 张": " images",
  "（含 ": " (incl. ",
  " 张后层）": " back layers)",
  "，例如 ": ", e.g. ",
  "当前开启了「发型重绘」，会在 NHT 绘制后再补画一遍。": "Hair redraw is on; it draws once more after NHT.",
  "头发层级 = ": "Hair layer = ",
  "；图层更大的部位会盖在头发上。": "; parts with a higher layer cover the hair.",
  "还缺：": "Missing: ",
  "发型参数完整 ✓": "Hair parameters complete ✓",
  "（未命名）": "(untitled)",
  "点一个发型只是放在头上做视觉参考（用来对耳朵 / 角的位置），不会变成部位、也不会导出；拖动微调、滚轮缩放，拖动时按住 Shift 会自动对齐头部中心 / 边缘，对齐后点「锁定」就不会再被拖走。图层输入框和部位共用一套刻度（数值大＝盖在上面）。": "Picking a hair only places it as a visual reference (for ear/horn alignment); it does not become a part and is not exported. Drag to adjust, wheel to scale, hold Shift while dragging to snap to the head center/edge, then Lock. Layer uses the same scale as parts (higher = on top).",
  "RJW 器官 RJW": "RJW ORGANS",
  "RJW 器官": "RJW organs",
  "RJW 下体": "RJW lower body",
  "未完成": "WIP",
  "已启用": "Enabled",
  "未启用": "Disabled",
  "打开后按模组 Defs 自动补上 ": "When enabled, adds ",
  " 个 RJW 标记（借自 ": " RJW markers (borrowing coordinates from ",
  " 体型的坐标）。默认可见性遵循模组设置：男性不绘胸部、扶她不绘性腺、儿童人偶不绘标记。器官层的标记要另外点工具栏的「器官」才显示，和这个开关互不影响。": " body type). Visibility follows the mod settings: male chest, futa gonads, kid markers are skipped. Organ-layer markers need the toolbar's Organs chip; independent of this switch.",
  "未载入 RJW Genitalia 数据。": "RJW Genitalia data is not loaded.",
  "全部显示": "Show all",
  "全部隐藏": "Hide all",
  "重新同步": "Resync",
  "按当前 Doll 名与基础体型重新生成 RJW 部位": "Regenerate RJW parts from the current Doll and body type",
  "下体窗按": "The lower-body window follows ",
  "取舍：男 = 性腺 + 生殖器（缺一个会用模组默认补上，总是一起出现），女 = 子宫 + 阴道 + 卵巢，其他/无 = 只显示底图。这里填 ": "sex: male = gonads + genitals (missing one uses the mod default; they always appear together), female = uterus + vagina + ovaries, other/none = background only. Fill ",
  " 即可控制；填 ": " to control; with ",
  " 时跟随体型（Male/Fat/Hulk 算男、Female 算女、Kid 不显示）。": " it follows the body type (Male/Fat/Hulk = male, Female = female, Kid = hidden).",
  "上面的盖住下面的": "Upper layers cover lower ones",
  "这张画布还没有部位": "This canvas has no parts",
  "上统一加一个固定量（单位 = 游戏画布 512×1024 的像素）。它只改变部位在框里的位置，": "Adds a fixed amount to every part's export position (units = 512×1024 game canvas). It only changes part positions in the frame; ",
  "编辑器画面不变": "the editor view is unchanged",
  "怎么填：": "How to fill: ",
  "Y 填正数 → 游戏里整体向下移": "positive Y → everything moves down in game",
  "Y 填负数 → 整体向上移": "negative Y → moves up",
  "X 正数向右、负数向左": "positive X → right; negative → left",
  "数值单位是像素，": "Units are pixels; ",
  "37.5 ≈ 全身高度的 3.7%": "37.5 ≈ 3.7% of body height",
  "，一般微调在 ±5 ~ ±40 之间。": "; typical fine-tune is ±5 to ±40.",
  "自动居中": "Auto center",
  "当前：": "Current: ",
  "不居中": "not centered",
  "。导出位置 = 画布位置 + 上面的偏移，": ". Export position = canvas position + the offset above; ",
  "加/删部件都不会让整体位置变": "adding/removing parts does not shift the whole",
  "。导出前会把内容整体挪一下，让它的": ". Before export the content is shifted so its ",
  "上下中心对准原点": "vertical center aligns to the origin",
  "；挪多少由内容大小自动算，所以": "; the shift is computed from content size, so ",
  "加头饰、拉翅膀、隐藏部件都会让它变": "adding headwear, wings, or hiding parts will change it",
  "一句话记：": "Rule of thumb: ",
  "开启 = 自动对准内容中心（数值会自己变）": "on = auto-align to content center (values change)",
  "关闭 = 位置定死": "off = fixed position",
  "，只认上面填的偏移。想要稳定就关闭，再把想下移的量写进偏移。": "; only the offset above is used. For stability, turn it off and put the desired shift in the offset.",
  "它怎么算的": "How it is computed",
  "顺序：": "Order: ",
  "① 部件原坐标 → ② 减去内容中心（自动居中）→ ③ 乘缩放 k → ④ 加上这里的偏移 → 写入 <position>。": "1) part position → 2) subtract content center (auto center) → 3) multiply by scale k → 4) add this offset → write <position>.",
  "k = min(512 ÷ 内容宽, 1024 ÷ 内容高, 1)；内容中心 = 所有部位外接框的中心。": "k = min(512 ÷ content width, 1024 ÷ content height, 1); content center = center of all part bounds.",
  "不受它影响：": "Not affected: ",
  "BoundingBox（边界）": "BoundingBox (bounds)",
  "实际显示框": "display box",
  "头发的缩放/偏移": "hair scale/offset",
  "编辑器里的画面": "the editor view",
  "Y 偏移（换算）": "Y offset (converted)",
  "实际显示高度无效": "Display height is invalid",
  "已自动应用": "Auto-applied",
  "与当前偏移相同": "Same as current offset",
  "把换算值写入导出 Y 偏移": "Write converted value into export Y offset",
  "导出 Y 偏移无效": "Export Y offset is invalid",
  "高度已钳制到 1px": "Height clamped to 1px",
  "与当前高度相同": "Same as current height",
  "把换算值写入实际显示高度": "Write converted value into display height",
  "功能": "Actions",
  "写进补丁的": "Written into the patch's ",
  "：决定游戏里娃娃的大小（框越小娃娃越大）。": ": controls doll size in game (smaller box = bigger doll).",
  "在所有部位的导出坐标上统一加一个固定量（单位 = 游戏画布 512×1024 的像素）。它只改变部位在框里的位置，编辑器画面不变。": "Adds a fixed amount to every part's export position (units = 512×1024 game canvas). It only changes part positions in the frame; the editor view is unchanged.",
  "它是\"整体平移\"，不是缩放。": "It is a global translation, not a scale.",
  "NHT 面板显示区域": "NHT panel area",
  "实际显示高度": "Display height",
  "隐藏实际显示框": "Hide display box",
  "显示实际显示框": "Show display box",
  "画布上那个蓝色框：游戏里 NHT 面板真正显示的区域。部位超出它会被标红提示（提示只看部位锚点）。": "The blue box on the canvas is the area NHT actually shows in game. Parts outside it are marked red (anchor only).",
  "投影": "Outline",
  "宽 / 高": "Width / Height",
  "缩放到官方包围盒 320×890": "Scale to official bounds 320×890",
  "写进补丁的 <BoundingBox>：决定游戏里娃娃的大小（框越小娃娃越大）。": "The <BoundingBox> written to the patch controls doll size in game (smaller box = bigger doll).",
  "实际显示": "Display",
  "已固定": "Pinned",
  "不取消选中，直接查看/编辑画布与项目（全局）属性": "View/edit canvas and project properties without deselecting",
  "按贴图的不透明像素重新计算选框（透明边不算进去）": "Recalculate the visible box from opaque pixels (transparent edges excluded)",
  "把当前去透明后的可见框尺寸直接写成命中框（判定框）": "Write the current visible box into the hitbox",
  "自动生成：种族名 + 部位名（只读，改「名称」会跟着变）": "Auto-generated from race + part name (read-only; follows Name)",
  "装饰部位：只画图、不参与受伤。NHT 的部位定义里 bodyPartId 是整数，导出时不写这一项，游戏会按 ": "Decor part: drawn only, no injuries. bodyPartId is an integer; omitted on export, the game uses ",
  "#0 躯干": "#0 Torso",
  " 处理（不会影响受伤数据）。": " (injury data unaffected).",
  "」的部位之前绘制，所以": "」, so ",
  "图层大于 ": "Parts with layer > ",
  " 的部位会盖在头发之上": " cover the hair",
  "，小于它的会被头发盖住。": "; lower ones are covered by the hair.",
  "模组的 DollBodyPart 没有旋转字段，角度不会导出；游戏里会按未旋转显示。": "DollBodyPart has no rotation field; the angle is not exported and the part is drawn unrotated in game.",
  "把旋转烘焙进贴图": "Bake rotation into texture",
  "置顶重画不支持旋转": "On-top redraw does not support rotation",
  "置顶重画不支持水平翻转（补画会错位）": "On-top redraw does not support flipping",
  "从模组素材替换": "Replace from mod assets",
  "裁剪：去掉透明边缘，保存到「我的素材 - ": "Crop transparent edges and save into My assets - ",
  "」并换用裁剪后的贴图": " and use the cropped texture",
  "开启后 hitboxScale = 画布 hbox / 512，画布拖多大游戏里就多大": "When on, hitboxScale = canvas hbox / 512; the in-game hitbox matches the canvas",
  "是否在游戏里显示这个部位的护甲覆盖图标": "Show this part's armor overlay in game",
  "护甲 / 提示图标的 X 偏移": "Armor / icon X offset",
  "护甲 / 提示图标的 Y 偏移": "Armor / icon Y offset",
  "图标回到部位中心": "Center the icon",
  "可见框": "Visible box",
  "真实可见": "Really visible",
  "判定框": "Hitbox",
  "导出发型坐标：开": "Export hair offsets: on",
  "导出发型坐标：关": "Export hair offsets: off",
  "层级同时用于": "Layer is used for both ",
  "编辑器显示": "editor display",
  "和": " and ",
  "写入补丁": "patch export",
  "（主层 / 后背层各一个）。": " (one for main, one for back).",
  "打开工具栏的「命中框」后可拖角改大小；开启「画布像素直出」时游戏判定框 = 画布框 / 512，否则沿用旧的比例导出。游戏 Defs 只有 ": "Turn on the toolbar's Hitbox to drag corners; with Canvas-pixel hitbox, the in-game hitbox = canvas box / 512; otherwise the old ratio is used. Game Defs only have ",
  "，没有偏移字段，所以固定居中。": ", no offset field, so it is fixed centered.",
  "图标位置相对于部位中心，用于护甲 / 提示图标。": "Icon position is relative to the part center; used for armor / hint icons.",
  "护甲 / 提示图标": "Armor / hint icon",
  "受伤 / 缺失 / 假体": "Injured / Missing / Prosthetic",
  "还没有映射": "No aliases yet",
  "移除映射": "Remove alias",
  "映射": "Aliases",
  "复制为另一形态会以当前画布为模板新建同种族的另一个 BodyType；映射让附加形态（如 Slime_YR_Bote）复用本画布的 Doll，导出为 BodyAliasDef。": "Duplicate as another form creates a new body type for the same race from this canvas; aliases let add-on forms (e.g. Slime_YR_Bote) reuse this canvas's Doll and export as BodyAliasDef.",
  "性别": "Sex",
  "取舍：男 = 性腺 + 生殖器（缺一个会用模组默认补上，总是一起出现），女 = 子宫 + 阴道 + 卵巢，其他/无 = 只显示底图。这里填 ": " rules: male = gonads + genitals (missing one uses the mod default; they always appear together), female = uterus + vagina + ovaries, other/none = background only. Fill ",
  " 即可控制；填 ": " to control; with ",
  " 时跟随体型（Male/Fat/Hulk 算男、Female 算女、Kid 不显示）。": " it follows the body type (Male/Fat/Hulk = male, Female = female, Kid = hidden).",
  "。数值单位是像素，": ". Units are pixels; ",
  "镜像会生成左右对称的另一半，适合翅膀、尾巴、附肢成对使用。": "Mirror creates the opposite half; useful for paired wings, tails, and appendages.",
  "基因：": "Genes: ",
  "优先级": "Priority",
  "由「生成基因外观」生成；重新生成会替换。下面的部位覆盖可以单独调整。": "Generated by Gene looks; regenerating replaces it. Part overrides below can be adjusted separately.",
  "部位覆盖": "Part overrides",
  "当前异种还没有部位覆盖；点「全部」选择要覆盖的部位。": "This xenotype has no part overrides yet; click All to choose parts.",
  "全部提示": "All tips",
  "内容来自编辑器目录下的 ui/tips.html，可以自己往里加。": "Content comes from ui/tips.html in the editor folder; you can add your own.",
  "✂ 自动裁剪": "✂ Auto crop",
  "点发型贴图放到头上当参考；拖动移动、滚轮缩放。": "Click a hair texture to use it as a head reference; drag to move, wheel to scale.",
  "① 在左侧「部位结构」点每一栏的 ": "① In the left Part tree, click ",
  " 新建一个空部位；② 选中它；③ 点这里的贴图，或把贴图": " to create an empty part; ② select it; ③ click a texture here, or drag a texture",
  "直接拖到那一条部位上": "directly onto that part row",
  "，以及导入的种族模组素材（": ", plus imported race mod assets (",
  "）。种族素材和发型存在浏览器本地，刷新不丢；": "). Race assets and hair are stored locally in the browser and survive refresh; ",
  "选图片可以直接多选（存进「我的素材」）；从模组文件夹导入会自动按模组名 + 部位分子组。": "Pick multiple images (saved into My assets); importing a mod folder groups them by mod and part.",
  "选择图片（PNG / WebP，可多选）": "Choose images (PNG / WebP, multi-select)",
  "从模组文件夹导入": "Import from mod folder",
  "我的素材现有 ": "My assets currently has ",
  " 个子栏，选的文件会进「": " sub-folders; selected files go into ",
  "」；可以再拖到别的子栏。": "; you can drag them to another sub-folder.",
  "选图片可以直接多选；从模组文件夹导入会只挑 ": "Pick multiple images; importing a mod folder only picks ",
  " 目录下朝前的那些帧。": " front-facing frames under that folder.",
  "导入后会存在浏览器本地（约 3.6 MB 预算），刷新不丢；同一张图不会重复添加。": "Imports are stored locally in the browser (~3.6 MB budget), survive refresh, and duplicates are skipped.",
  "还有 ": "… ",
  " 张，用搜索框找": " more; use the search box",
  " 张，用上面的搜索框找": " more; use the search box above",
  "拖动分类可排序 · 点标签改名 / 删除会同步 Custom 文件夹": "Drag to reorder; click the tag to rename / delete (syncs the Custom folder).",
  "再点一次删除": "Click again to delete",
  "从素材库删除": "Remove from asset library",
  "本机素材": "Local asset",
  "模组": "Mod",
  "模组 · ": "Mod · "
,
  "新建画布": "New canvas",
  "空白画布": "Blank canvas",
  "复制当前": "Copy current",
  "从种族模组": "From race mod",
  "画布名称": "Canvas name",
  "几何底稿": "Geometry base",
  "选择文件夹": "Choose folder",
  "创建画布": "Create canvas",
  "从零开始，用素材库里的贴图一块块拼出体型。": "Start from scratch and build the body from textures in Assets.",
  "读取种族模组文件夹，用种族名称命名画布。": "Read a race mod folder and name the canvas after the race.",
  "读取种族模组后自动填入": "Auto-filled after reading the race mod",
  "例如：Kurin · 三尾狐": "e.g. Kurin · Three-tailed fox",
  "选择种族模组的根文件夹（含 About / Defs / Textures）": "Choose the race mod root (with About / Defs / Textures)",
  "正在读取 About.xml 与 Defs…": "Reading About.xml and Defs…",
  "未检测到种族定义": "No race definition detected",
  "种族": "Race",
  "包名": "Package ID",
  "贴图": "Texture",
  "头发": "Hair",
  "HAR 附加件": "HAR addon",
  "原版 HairDef": "Vanilla HairDef",
  "未检测到头发": "No hair detected",
  "▣ 选择卡片成组合…": "▣ Combine selected cards…",
  "移动到分组": "Move to group",
  "新建分组": "New group",
  "重命名": "Rename",
  "恢复 NHT 原始坐标": "Restore NHT original coordinates",
  "置顶重画：所有部位（以及头发）画完之后再补画一遍，永远在最上面，用「置顶层级」排序；会盖掉该部位的疤痕/伤口，建议只给装饰件用。联动置顶：只在模组设置打开「非 HAR 发型按发色重绘」时生效，在补画的发型之后重画，避免被头发盖住；与置顶重画互斥。": "On-top redraw: draws all parts (and hair) again after everything else, always on top, sorted by Top layer; it covers scars/wounds on that part, so use it for decorations. Linked top: only when \"Non-HAR hair tinted by hair color\" is on in mod settings; drawn after the redrawn hair so it isn't covered; mutually exclusive with On-top redraw.",
  "置顶重画：所有部位画完后再画一遍，永远在最上面（用「置顶层级」排序）。装饰物用；会盖掉该部位的疤痕/伤口": "On-top redraw: draws the part again after everything else, always on top (sorted by Top layer). For decorations; covers scars/wounds on that part.",
  "联动置顶：只在模组设置打开「非 HAR 发型按发色重绘」时生效；与置顶重画互斥": "Linked top: only when \"Non-HAR hair tinted by hair color\" is on in mod settings; mutually exclusive with On-top redraw.",
  "受「部位颜色」开关控制：模组设置里关掉总开关（或单独关掉这一格）后，这个部位会以黑白显示；开启时和现在完全一样。只对种族画布有效。": "Controlled by Part color: turning the master switch off in mod settings (or this cell off) draws this part in grayscale; when on it looks exactly as now. Race canvases only.",
  "勾上后，模组设置里关闭「部位颜色」时这个部位会变黑白": "When checked, turning off Part color in mod settings draws this part in grayscale.",
  "跟随小人当前发色（story.hairColor）给这个部位着色。适合 bodyAddon colorChannel=hair 的耳朵/尾巴；关色彩时自动不染色。": "Tints this part with the pawn's current hair color (story.hairColor). Useful for bodyAddon colorChannel=hair ears/tails; skipped when color is off.",
  "跟随小人当前发色：导出 HairTintDef，游戏里用 pawn.story.hairColor 给这个部位着色": "Follow hair color: exports HairTintDef; in game the part is tinted with pawn.story.hairColor.",
  "置顶系列专用层级（0–99，默认 1）：只有开启「置顶重画」或「联动置顶」时才生效，但数值一直保存。它独立于原版图层 0–29——哪怕填 0，也在所有原版图层之上。越大越靠上。": "Top-series layer (0–99, default 1): only active with On-top redraw or Linked top, but always saved. Separate from vanilla layers 0–29 — even 0 is above every vanilla layer. Higher is on top.",
  "导出模组文件时会忽略模组目录里的 About/About.xml，用这里的内容写进 zip。": "Export mod files ignores the mod folder's About/About.xml and uses this content in the zip.",
  "如果这里没配置，才回退到模组目录里的那份。": "If nothing is configured here, it falls back to the mod folder's copy.",
  "About.xml 正常": "About.xml OK",
  "能读，但有警告": "Readable, with warnings",
  "有问题，导出会被拦下": "Problems found; export will be blocked",
  "没有发现问题": "No problems detected",
  "版本": "Version",
  "依赖": "Dependencies",
  "说明": "Description",
  "读取模组目录现有": "Read existing mod folder",
  "用项目信息生成": "Generate from project info",
  "在这里粘贴 About.xml 内容，或点上面的「上传 About.xml」": "Paste About.xml here, or click Upload About.xml above",
  "修改后会随项目一起保存；导出模组文件时用这份。": "Changes are saved with the project and used when exporting mod files.",
  "鼠标悬停提示（气泡）。关掉之后左下两块面板里就不再弹气泡，界面更干净。": "Hover tooltips (bubbles). Turning these off stops bubbles in the two left panels for a cleaner UI.",
  "体型画布：显示悬浮提示": "Body canvases: tooltips on",
  "体型画布：已关闭悬浮提示": "Body canvases: tooltips off",
  "画布条目、分组、右键菜单的说明": "Hints for canvas rows, groups and the context menu",
  "部位结构：显示悬浮提示": "Part tree: tooltips on",
  "部位结构：已关闭悬浮提示": "Part tree: tooltips off",
  "部位行、分组行的说明": "Hints for part and group rows",
  "其余区域（标签、按钮、字段）的提示保持开启；这两项只影响左侧两块面板。": "Other tooltips (tabs, buttons, fields) stay on; these two only affect the left panels.",
  "当前不是本地服务模式：Git 功能不可用，请用「启动编辑器.bat」打开。": "Not in local-server mode: Git is unavailable; open with 启动编辑器.bat.",
  "正在检测本机 Git…": "Checking local Git…",
  "本机 Git：": "Local Git: ",
  "已安装": "installed",
  "没检测到本机 Git：请先安装 Git for Windows，否则推送/拉取不可用。": "Local Git not found: install Git for Windows, otherwise push/pull is unavailable.",
  "远程仓库：": "Remote: ",
  "（未读取）": "(not read)",
  "仓库改名 / 换地址后在这里改": "Change the remote here after a rename/move",
  "本机仓库：": "Local repo: ",
  "（未设置）": "(not set)",
  "选择本机文件夹": "Choose local folder",
  "提交者名": "Committer name",
  "会写进 git 提交记录，GitHub 上显示的就是这个名字": "Written into the git commit; this is the name shown on GitHub",
  "可空": "optional",
  "提交者邮箱": "Committer email",
  "会写进 git 提交记录；留空则用本机 git 全局配置": "Written into the git commit; empty uses the local git config",
  "推送前同步模组文件": "Sync mod files before pushing",
  "推送前不同步模组文件": "Do not sync mod files before pushing",
  "把模组目录（About / Defs / Patches / Textures …）复制到仓库目录再提交": "Copy the mod folder (About / Defs / Patches / Textures …) into the repo before committing",
  "状态：": "Status: ",
  "默认值仅作参考：仓库目录 ": "Defaults are for reference: repo folder ",
  "换成你自己的仓库时，路径要改；分支在「项目 → 仓库同步」里写。": "Change the path for your own repo; set the branch in Project → Repo sync.",
  "（测试连接 / 推送 / 拉取的结果与失败原因）": "(test / push / pull results and errors)",
  "保存前校验路径：开": "Validate path before saving: on",
  "保存前校验路径：关": "Validate path before saving: off",
  "关掉后保存不再检查目录，失败会直接报错": "When off, saves no longer check the folder and fail with an error",
  "下面是每个保存按钮对应的路径。用文件夹图标可以手动指定（本地服务模式下路径由服务固定，图标仅作记录）。": "Paths for each save button. Use the folder icon to pick one manually (in local-server mode paths are fixed; the icon is only a note).",
  "自动裁剪缓存数量": "Auto-crop cache count",
  "素材页「自动裁剪」最多同时缓存几张（1–12）": "How many auto-cropped textures to cache (1–12)",
  "同时缓存的自动裁剪素材数量": "Number of auto-cropped textures cached",
  "导出模组文件带日期后缀": "Export mod files with date suffix",
  "导出模组文件不带日期后缀": "Export mod files without date suffix",
  "命名示例：": "Example name: ",
  "本地保存（每个画布 → canvases/<种族>/）": "Local save (each canvas → canvases/<race>/)",
  "index.json + 每个画布一个 json，同时生成 nht-project.js": "index.json + one json per canvas, plus nht-project.js",
  "注入模组（单个/多选 → Patches/*.xml）": "Inject mod (single/multi → Patches/*.xml)",
  "补丁 XML 写到模组的 Patches/": "Patch XML written to the mod's Patches/",
  "贴图（Textures/）": "Textures (Textures/)",
  "部位/发型贴图写到模组 Textures/": "Part/hair textures written to the mod's Textures/",
  "素材目录（assets/）": "Asset folder (assets/)",
  "「按勾选写入」使用的目录": "Folder used by Write selected",
  "查看最近 5 份本地保存历史，可挑一份载入": "View the last 5 local save snapshots and load one",
  "丢弃浏览器 localStorage 缓存，重新读取 nht-project.js 和画布文件": "Discard the browser localStorage cache and reload nht-project.js and canvas files",
  "保存**全部画布**与素材清单到项目文件 nht-project.js（html 同目录），不是只存当前画布。Ctrl+S": "Save **all canvases** and the asset index into nht-project.js (next to the HTML), not just the current canvas. Ctrl+S",
  "有需要检查的项目": "Needs attention",
  "关联画布": "Linked canvas",
  "有形态映射": "Has body aliases",
  "收起 / 展开工具栏": "Collapse / expand toolbar",
  "锁定画布：锁定后不能删除画布，也不能删除部位": "Lock canvas: cannot delete the canvas or parts while locked",
  "当前画布的导出偏移（点击跳到全局属性的导出偏移）": "Current canvas export offset (click to jump to Export offset)",
  "更多工具与全局属性跳转": "More tools and global property jumps",
  "参考线": "Guides",
  "备注贴纸": "Note stickers",
  "在画布上添加备注贴纸": "Add a note sticker on the canvas",
  "显示 / 隐藏画布上的 RJW 部位": "Show / hide RJW parts on the canvas",
  "从这里向下拖出水平参考线": "Drag down to create a horizontal guide",
  "从这里向右拖出垂直参考线": "Drag right to create a vertical guide",
  "网格": "Grid",
  "命中框": "Hitbox",
  "护甲": "Armor",
  "器官": "Organs",
  "骨骼": "Bones",
  "手掌": "Palm",
  "脚掌": "Sole",
  "锁定": "Lock",
  "已锁定": "Locked",
  "更多": "More",
  "备注": "Note",
  "显示": "Display",
  "全局属性": "Global properties",
  "画布": "Canvas",
  "形态映射": "Body mapping",
  "图层顺序": "Stack",
  "边界": "Bounds",
  "实际显示框": "Display box",
  "轮廓": "Outline",
  "来源": "Source",
  "说明": "Notes",
  "自动变换": "Auto transform",
  "扫描现有画布": "Scan current canvas",
  "读取小人身上对应 HAR bodyAddon 的实际贴图 / 颜色 / 旋转，并替换这个部位的贴图；导出 AddonFollowDef。默认关闭。": "Read the actual HAR bodyAddon texture / color / rotation from the pawn and replace this part's texture; exports AddonFollowDef. Off by default.",
  "开启后按小人实际 bodyAddon 自动变换（级别 / 颜色）": "Follow the pawn's actual bodyAddon (level / color) when on.",
  "扫描当前画布：把有自定义 colorChannel 的 bodyAddon 部位标记出来；开关默认关闭，之后在部位属性里单独打开。": "Scan this canvas: mark parts backed by bodyAddons with a custom colorChannel. The switch stays off; enable it per part.",
  "可自动变换：读取小人实际 HAR bodyAddon 的贴图 / 颜色 / 旋转": "Auto transform available: reads the pawn's actual HAR bodyAddon texture / color / rotation",
  "已开启自动变换（导出 AddonFollowDef）": "Auto transform on (exports AddonFollowDef)",
  "已关闭自动变换": "Auto transform off",
  "这张画布不是从种族模组导入的，没有 bodyAddons 可扫描": "This canvas was not imported from a race mod; no bodyAddons to scan",
  "没有找到自定义 colorChannel 的 bodyAddon 部位": "No bodyAddon parts with a custom colorChannel found.",
  "自动": "Auto",
  "HAR bodyAddon：": "HAR bodyAddon: ",
  "自动旋转 ": "auto rotation ",
  "自动变换已开": "auto transform on",
  "默认关闭": "off by default"};

const I18N_KEYS = new Map();
[I18N_EN, I18N_EN_MORE, I18N_MODAL].forEach(obj => {
  Object.keys(obj || {}).forEach(k => {
    const kk = String(k).trim();
    if (kk && !I18N_KEYS.has(kk)) I18N_KEYS.set(kk, obj[k]);
  });
});

const I18N_PATTERNS = [
  [/^(\d+)\s*个部位$/, '$1 parts'],
  [/^(.+?)\s*·\s*(\d+)\s*部位(?:\s*· RJW)?$/, '$1 · $2 parts'],
  [/^偏移\s*(-?\d+)\s*\/\s*(-?\d+)$/, 'Offset $1 / $2'],
  [/^待推送：(\d+)（提交 (\d+) \+ 未提交文件 (\d+)）$/, 'Unpushed: $1 ($2 commits + $3 files)'],
  [/^(\d+) 个画布将写入$/, '$1 canvases will be written'],
  [/^(\d+) 个组员$/, '$1 members'],
  [/^(.+?) · 已固定$/, '$1 · pinned'],
  [/^(.+?) · 已锁定$/, '$1 · locked'],
  [/^(.+?) · 装饰（不参与受伤）$/, '$1 · Decor (no injuries)'],
  [/^([\u4e00-\u9fa5]+)\s+([A-Za-z].*)$/, '$2'],
  [/^已载入 (\d+) 个体型画布 · (\d+) 个部位$/, 'Loaded $1 canvases · $2 parts'],
  [/^已载入 (\d+) 个画布文件 · (.+)$/, 'Loaded $1 canvas files · $2'],
  [/^已自动保存 · (.+)$/, 'Autosaved · $1'],
  [/^已还原画布：(.+)$/, 'Canvas restored: $1'],
  [/^已组合：(.+)$/, 'Grouped: $1'],
  [/^已新建分组：(.+)$/, 'Group created: $1'],
  [/^已删除空分组：(.+)$/, 'Empty group deleted: $1'],
  [/^已移出分组$/, 'Removed from group'],
  [/^已锁定画布$/, 'Canvas locked'],
  [/^已解除锁定$/, 'Unlocked'],
  [/^已选 (.+)$/, 'Selected $1'],
  [/^已放 (.+)$/, 'Placed $1'],
  [/^(\d+) 个 · 新增$/, '$1 · new'],
  [/^(\d+) 个文件$/, '$1 files'],
  [/^(.+?) 个部位$/, '$1 parts'],
  [/^(.+?) 个画布$/, '$1 canvases'],
  [/^(.+?) 个组员$/, '$1 members'],
  [/^· 覆盖 (\d+) 处$/, '· $1 overrides'],
  [/^(\d+) 处覆盖$/, '$1 overrides'],
  [/^(.+?) · 覆盖 (\d+) 处$/, '$1 · $2 overrides'],
  [/^(.+?) · 已调坐标$/, '$1 · adjusted'],
  [/^已自动导入：(.+)$/, 'Auto-imported: $1'],
  [/^已写入 (\d+) 张导入素材到磁盘$/, 'Wrote $1 imported assets to disk'],
  [/^已放入分类：(.+)$/, 'Moved to category: $1'],
  [/^已改名：(.+)$/, 'Renamed: $1'],
  [/^已删除分类：(.+)$/, 'Category deleted: $1'],
  [/^(\d+) 个素材路径到磁盘分类$/, '$1 asset paths to disk categories'],
  [/^同步日志（(\d+)）$/, 'Sync log ($1)'],
  [/^当前本地分支：(.+)$/, 'Current local branch: $1'],
  [/^(\d+) 错误 · (\d+) 警告$/, '$1 errors · $2 warnings'],
  [/^(\d+) 行 · (\d+) KB · (\d+) 个操作$/, '$1 lines · $2 KB · $3 operations'],
  [/^·? ?还有 (\d+) 行，点「展开全部」查看$/, '… $1 more lines; click Expand all'],
  [/^·? ?还有 (\d+) 行$/, '… $1 more lines'],
  [/^下面 (\d+) 个画布有改动，但还没注入模组：$/, 'Below, $1 canvases have changes but are not injected yet:'],
  [/^(.+) · 有 (\d+) 项待拉取$/, '$1 · $2 to pull'],
  [/^(\d+) 项待拉取$/, '$1 to pull'],
  [/^(\d+) 项待推送$/, '$1 to push'],
  [/^(.*?)：还没有任何部位。$/, '$1: has no parts.'],
  [/^(.*?) · (.*?)：还没有选贴图（不会导出）。$/, '$1 · $2: no texture selected (not exported).'],
  [/^(.*?) · (.*?)：使用本机素材（还没在模组 Textures 里），注入时会自动推送；手动导出时需要把 PNG 放到 Textures\/(.*?)\.png$/, '$1 · $2: local texture (not in mod Textures); auto-pushed on inject. For manual export put the PNG at Textures/$3.png'],
  [/^(.*?) · (.*?)：贴图缺失（(.*?)）。$/, '$1 · $2: missing texture ($3).'],
  [/^(.*?) · (.*?)：缩放不能为 0。$/, '$1 · $2: scale cannot be 0.'],
  [/^(.*?) · (.*?)：中心点 \((.*?), (.*?)\) 在画布边界之外。$/, '$1 · $2: center ($3, $4) is outside canvas bounds.'],
  [/^(.*?) · (.*?)：自定义部位未绑定部位序号，需在 BodyDef 中新增对应部位。$/, '$1 · $2: custom part has no bodyPartId; add it to BodyDef.'],
  [/^(.*?) · (.*?)：旋转 (.*?)° 不会写进 Defs（模组没有旋转字段），游戏里会按未旋转显示 —— 用属性面板的「把旋转烘焙进贴图」。$/, '$1 · $2: rotation $3° is not written to Defs; bake it into the texture.'],
  [/^(.*?)：部位序号 #(.*?) 被 (.*?) 个部位共用（(.*?)）——除尾巴等“盖在躯干槽位”的刻意做法外，应该改回各自槽位。$/, '$1: bodyPartId #$2 is shared by $3 parts ($4); use separate slots unless intentional.'],
  [/^(.*?)：边界与部位外接框不一致（外接框 (.*?)），可在画布属性中一键适配。$/, '$1: bounds differ from the part bounds ($2); use Fit in canvas properties.'],
  [/^(.*?)：种族画布还没有填写种族 defName。$/, '$1: race canvas has no race defName.'],
  [/^(.*?)：RJW 开关是打开的，但画布上没有 RJW 部位。$/, '$1: RJW is on but the canvas has no RJW parts.'],
  [/^(.*?)：有部位开了「置顶重画」，但「导出发型坐标」是关的 → 补丁里不会有 aboveParts，游戏里置顶重画不生效。$/, '$1: a part uses On-top redraw but Export hair offsets is off; aboveParts will be missing.'],
  [/^(.*?)：开了「导出发型坐标」但还没填缩放 \/ 偏移，会按 0.78 \/ -0.21 的默认值导出（头发会偏大偏下）。$/, '$1: Export hair offsets is on but scale/offset are empty; defaults 0.78 / -0.21 will be used.'],
  [/^(.*?)：头发层级 (.*?) 超出 0–29，导出时会按 29 处理。$/, '$1: hair layer $2 is outside 0–29; clamped to 29.'],
  [/^(.*?)：头发预览贴图缺失（(.*?)）。$/, '$1: hair preview texture is missing ($2).'],
  [/^(.*?)：发色预览已隐藏（只影响编辑器，不影响导出）。$/, '$1: hair color preview hidden (editor only).'],
  [/^(.*?) · (.*?)：图层 (.*?) 超出 0–29，会被夹到边界值。$/, '$1 · $2: layer $3 is outside 0–29; clamped.'],
  [/^(.*?) · (.*?)：判定框太小（(.*?)×(.*?)），游戏里几乎点不到。$/, '$1 · $2: hitbox too small ($3×$4); hard to click in game.'],
  [/^(.*?) · (.*?)：开了置顶重画但没有贴图。$/, '$1 · $2: On-top redraw is on but there is no texture.'],
  [/^(.*?)：部位编号还没按 NHT 槽位对齐过，建议点「全局 → 按对照表修正编号」再导出。$/, '$1: bodyPartIds are not aligned to NHT slots; use Global → Fix IDs before export.'],
  [/^有画布还没填名字。$/, 'Some canvases have no name.'],
  [/^画布「(.*?)」没有 Doll defName，导出会失败。$/, 'Canvas "$1" has no Doll defName; export will fail.'],
  [/^(.*?)：(.*?) 个部位超出实际显示框 (.*?)×(.*?)（(.*?)边缘），NHT 面板里可能显示不全：(.*?)( 等)?。$/, '$1: $2 parts exceed the display box $3×$4 ($5 edge); may be clipped in NHT: $6$7.'],
  [/^Doll defName「(.*?)」被 (.*?) 个画布共用，导出补丁时会互相覆盖。$/, 'Doll defName "$1" is shared by $2 canvases; patches will overwrite each other.'],
  [/^画布名字「(.*?)」用了 (.*?) 次，导出文件名可能重复。$/, 'Canvas name "$1" is used $2 times; export filenames may collide.'],
  [/^：补丁只导出$/, ': The patch only exports'],
  [/^（(.+?)）。已有的体型 \/ 部位用$/, '($1). Existing bodies / parts use'],
  [/^覆盖，新部位与拆卸用 Add \/ Remove。要导别的体型，先切到那张画布再导出。$/, ' to override; new/detached parts use Add / Remove. To export another body, switch to its canvas first.'],
  [/^保存选择的素材（(\d+) 栏）$/, 'Save selected assets ($1)'],
  [/^未勾选分组，保存当前分类：(\d+) 张…$/, 'No group selected; saving current category: $1 images…'],
  [/^删除分组「(.+)」$/, 'Delete group "$1"'],
  [/^提示（共 (\d+) 条）$/, 'Tips ($1)'],
  [/^缺少 (\d+) 张贴图$/, '$1 textures missing'],
  [/^只看覆盖 (\d+)$/, 'Overrides only ($1)'],
  [/^全部 (\d+)$/, 'All ($1)'],
  [/^(.+) 点击套用$/, '$1 — click to apply'],
  [/^最近 (\d+) 个版本$/, 'Latest $1 versions'],
  [/^(\d+) 个版本$/, '$1 versions'],
  [/^(\d+) 张$/, '$1 files'],
  [/^预览（最近改动）：(.+) · (\d+) 部位$/, 'Preview (recent changes): $1 · $2 parts'],
  [/^预览（Git 版本）：(.+) · (\d+) 部位$/, 'Preview (Git version): $1 · $2 parts'],
  [/^(\d+) 个标记 · (\d+) 可见 · (\d+) 个器官层$/, '$1 markers · $2 visible · $3 organ layers'],
  [/^只列出最上面 (\d+) 个（共 (\d+)）$/, 'Only the top $1 of $2 are listed'],
  [/^· 优先级 (\d+)$/, '· Priority $1'],
  [/^全部 \((\d+)\)$/, 'All ($1)'],
  [/^共 (\d+) 张贴图：Nice Health Tab 的 $/, '$1 textures total: Nice Health Tab\'s '],
  [/^提示（共 (\d+) 条）$/, 'Tips ($1)'],
  [/^添加顺序 HOW TO ADD$/, 'HOW TO ADD'],
  [/^我的素材 \((\d+)\)$/, 'My assets ($1)'],
  [/^种族素材 \((\d+)\)$/, 'Race assets ($1)'],
  [/^体型部件 \((\d+)\)$/, 'Body parts ($1)'],
  [/^假体 \/ 附肢 \((\d+)\)$/, 'Prosthetics / appendages ($1)'],
  [/^器官 \((\d+)\)$/, 'Organs ($1)'],
  [/^骨骼 \((\d+)\)$/, 'Bones ($1)'],
  [/^异种 \((\d+)\)$/, 'Xenotypes ($1)'],
  [/^RJW 部位 \((\d+)\)$/, 'RJW parts ($1)'],
  [/^贴花 \((\d+)\)$/, 'Decals ($1)'],
  [/^图标 \((\d+)\)$/, 'Icons ($1)'],
  [/^护甲 \((\d+)\)$/, 'Armor ($1)'],
  [/^还有 (\d+) 张，用(上面的)?搜索框找$/, '… $1 more; use the search box'],
  [/^这个模组里有 (\d+) 个种族，选一个来建画布（默认高亮的是自动判断的那个）。$/, 'This mod contains $1 races; pick one to create a canvas (the highlighted one is auto-detected).'],
  [/^身体 (.*?) · (\d+) 个部位 · 贴图命中 (\d+)$/, 'Body $1 · $2 parts · $3 texture matches'],
  [/^以「(.*?)」为底稿新建一个异种。$/, 'Create a xenotype from "$1".'],
  [/^(\d+) 个文件$/, '$1 files'],
  [/^(\d+) \/ (\d+) 已匹配$/, '$1 / $2 matched'],
  [/^ · 共 (\d+) 张$/, ' · $1 total'],
  [/^（后层 (\d+)）$/, ' ($1 back layers)'],
  [/^ · (\d+) 个样式$/, ' · $1 styles'],
  [/^(\d+) 条警告$/, '$1 warnings'],
  [/^(\d+) 处错误$/, '$1 errors'],
  [/^(\d+) 字$/, '$1 chars'],
  [/^本机 Git：(.+)$/, 'Local Git: $1'],
  [/^已连接 · 分支 (.+?) · 待推送 (\d+) \/ 待拉取 (\d+)$/, 'Connected · branch $1 · to push $2 / to pull $3'],
  [/^(.+)（右键更多操作）$/, '$1 (right-click for more)'],
  [/^展开 (\d+) 个关联形态$/, 'Expand $1 linked forms'],
  [/^收起 (\d+) 个关联形态$/, 'Collapse $1 linked forms'],
  [/^偏移 (-?\d+(?:\.\d+)?) \/ (-?\d+(?:\.\d+)?)$/, 'Offset $1 / $2'],
  [/^已标记 (\d+) 个可自动变换部位（开关默认关闭）$/, 'Marked $1 auto-transform parts (switches off by default)']
];

function i18nText(v) {
  const key = String(v == null ? '' : v).trim();
  if (!key) return '';
  const exact = I18N_KEYS.get(key);
  if (exact != null) return exact;
  for (let i = 0; i < I18N_PATTERNS.length; i++) {
    const re = I18N_PATTERNS[i][0];
    if (re.test(key)) return key.replace(re, I18N_PATTERNS[i][1]);
  }
  return '';
}

const I18N_ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'data-lb', 'data-tip'];

/* 部位名：优先用 nameEn；没有英文时用常用部位词典；再退回原名 */
const PART_I18N = {
  '躯干': 'Torso', '胸腔': 'Ribcage', '胸骨': 'Sternum', '骨盆': 'Pelvis', '脊柱': 'Spine',
  '胃': 'Stomach', '心脏': 'Heart', '右肺': 'Right lung', '左肺': 'Left lung', '右肾': 'Right kidney',
  '左肾': 'Left kidney', '肝': 'Liver', '颈部': 'Neck', '头部': 'Head', '颅骨': 'Skull', '脑': 'Brain',
  '左眼': 'Left eye', '右眼': 'Right eye', '左耳': 'Left ear', '右耳': 'Right ear', '鼻': 'Nose',
  '鼻子': 'Nose', '下颌': 'Jaw', '舌': 'Tongue', '右肩': 'Right shoulder', '左肩': 'Left shoulder',
  '右锁骨': 'Right clavicle', '左锁骨': 'Left clavicle', '右臂': 'Right arm', '左臂': 'Left arm',
  '右手': 'Right hand', '左手': 'Left hand', '左腿': 'Left leg', '右腿': 'Right leg', '左脚': 'Left foot',
  '右脚': 'Right foot', '尾巴': 'Tail', '触手': 'Tentacle', '长触手': 'Long tentacle', '肉鞭': 'Flesh whip',
  '翅膀': 'Wing', '角': 'Horn', '光环': 'Halo', '耳朵': 'Ear', '触角': 'Antenna', '触须': 'Tentacle',
  '呆毛': 'Ahoge', '刘海': 'Bangs', '头发': 'Hair', '眼睛': 'Eye', '嘴': 'Mouth', '身体': 'Body',
  '胸部': 'Chest', '腰部': 'Waist', '大腿': 'Thigh', '小腿': 'Calf', '上臂': 'Upper arm',
  '前臂': 'Forearm', '手指': 'Finger', '脚趾': 'Toe', '机械臂': 'Mechanical arm', '机械腿': 'Mechanical leg'
};

function partDisplayName(p) {
  if (!p) return '';
  if (LANG !== 'en') return p.name || '';
  const en = (p.nameEn && p.nameEn !== p.name) ? p.nameEn : '';
  return en || PART_I18N[p.name] || p.name || '';
}

function partSubName(p) {
  if (!p) return '';
  const dn = partDisplayName(p);
  if (LANG === 'en') return (p.name && p.name !== dn) ? p.name : '';
  return (p.nameEn && p.nameEn !== p.name) ? p.nameEn : '';
}
const I18N_ATTR_ORIG = new WeakMap();
let LANG = 'zh';
let I18N_APPLYING = false;
let I18N_OBSERVER = null;

function i18nSkip(el) {
  try { return !!(el && el.closest && el.closest('[data-i18n-skip]')); } catch (e) { return false; }
}

function translateDom(root) {
  if (LANG !== 'en' || !root) return;
  I18N_APPLYING = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || i18nSkip(p)) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      const raw = String(node.nodeValue == null ? '' : node.nodeValue);
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
      const core = m ? m[2] : raw;
      const en = i18nText(core);
      if (!en) return;
      if (node.__i18nZh == null) node.__i18nZh = raw;
      node.nodeValue = (m ? m[1] : '') + en + (m ? m[3] : '');
    });
    root.querySelectorAll('*').forEach(el => {
      if (i18nSkip(el)) return;
      I18N_ATTRS.forEach(a => {
        const v = el.getAttribute(a);
        if (!v) return;
        const en = i18nText(v);
        if (!en) return;
        let orig = I18N_ATTR_ORIG.get(el);
        if (!orig) { orig = {}; I18N_ATTR_ORIG.set(el, orig); }
        if (orig[a] == null) orig[a] = v;
        el.setAttribute(a, en);
      });
    });
  } catch (e) { }
  finally { I18N_APPLYING = false; }
}

function restoreDom(root) {
  if (!root) return;
  I18N_APPLYING = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      if (node.__i18nZh != null) { node.nodeValue = node.__i18nZh; delete node.__i18nZh; }
    });
    root.querySelectorAll('*').forEach(el => {
      const orig = I18N_ATTR_ORIG.get(el);
      if (!orig) return;
      Object.keys(orig).forEach(a => el.setAttribute(a, orig[a]));
      I18N_ATTR_ORIG.delete(el);
    });
  } catch (e) { }
  finally { I18N_APPLYING = false; }
}

function applyLang(lang) {
  LANG = (lang === 'en') ? 'en' : 'zh';
  try { if (!S.settings) S.settings = {}; S.settings.lang = LANG; } catch (e) { }
  try {
    document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN';
    if (document.body) document.body.dataset.lang = LANG;
  } catch (e) { }
  const box = document.getElementById('langBox');
  if (box) box.dataset.lang = LANG;
  const label = document.getElementById('langLabel');
  if (label) label.textContent = LANG === 'en' ? 'English' : '中文';
  const menu = document.getElementById('langMenu');
  if (menu) menu.querySelectorAll('.langopt').forEach(b => b.classList.toggle('is-on', b.dataset.lang === LANG));
  try { if (LANG === 'en') translateDom(document.body); else restoreDom(document.body); } catch (e) { }
  try { if (typeof renderTree === 'function') renderTree(); } catch (e) { }
  try { if (typeof renderInspector === 'function') renderInspector(); } catch (e) { }
  try { if (typeof renderVariantPane === 'function') renderVariantPane(); } catch (e) { }
  try { if (typeof renderStage === 'function') renderStage(); } catch (e) { }
  try { if (typeof renderHairPane === 'function') renderHairPane(); } catch (e) { }
  try { if (typeof loadTips === 'function') loadTips(); } catch (e) { }
  // 默认项目备注里的“默认体型”也随语言切换；用户改过的备注不动
  try {
    const ZH_NOTE = '以 Nice Health Tab 模组 1.6 默认体型为基准制作的部位补丁。';
    const EN_NOTE = "A part patch based on Nice Health Tab 1.6's default body.";
    if (!S.project) S.project = {};
    if (!S.project.note || S.project.note === ZH_NOTE || S.project.note === EN_NOTE) {
      S.project.note = LANG === 'en' ? EN_NOTE : ZH_NOTE;
    }
  } catch (e) { }
  try { if (typeof renderPatch === 'function') renderPatch(); } catch (e) { }
  try { persist(); } catch (e) { }
  try { startI18nObserver(); } catch (e) { }
}

function startI18nObserver() {
  if (typeof MutationObserver === 'undefined' || I18N_OBSERVER) return;
  I18N_OBSERVER = new MutationObserver(() => {
    if (LANG !== 'en' || I18N_APPLYING) return;
    clearTimeout(window.__i18nT);
    window.__i18nT = setTimeout(() => { if (LANG === 'en') translateDom(document.body); }, 30);
  });
  I18N_OBSERVER.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
}

document.addEventListener('click', e => {
  const m = document.getElementById('langMenu');
  if (m && !(e.target && e.target.closest && e.target.closest('.langbox'))) m.hidden = true;
});

function imgURL(path) {
  if (!path) return MISSING_IMG;
  const e = EXT.get(path);
  if (e && e.url) return e.url;
  const c = CUSTOM.get(path);
  if (c && c.data) return c.data;
  if (IMG[path]) return IMG[path];
  // 程序模式：WebView2 虚拟主机直接读 Textures/ 下的文件
  if (/^Custom\//.test(String(path))) {
    if (HOST) return 'https://mod.local/Textures/' + encodeURI(path + '.png');
    return '/__tex?key=' + encodeURIComponent(path);
  }
  return MISSING_IMG;
}
function imgDim(path) {
  const c = CUSTOM.get(path);
  if (c) return [c.w, c.h];
  // t61：从磁盘扫出来的发型/素材只有 256×256 的占位尺寸（见 scanSavedHairAssets），
  // 真实尺寸以 alpha 测量结果为准 —— 否则 512×512 的头发会被当成 256 裁剪，预览只剩右下角一块。
  const ab = ALPHA_BOX.get(path);
  if (ab && ab.ok && ab.iw > 1 && ab.ih > 1) return [ab.iw, ab.ih];
  const a = ASSETMAP.get(path);
  if (a) return [a.w, a.h];
  const e = EXT.get(path);
  if (e) return [e.w, e.h];
  const n = NAT_DIM.get(path);
  if (n) return n;
  return [64, 64];
}
/* 真实图片尺寸缓存：异种贴图往往不在 CUSTOM/EXT 里，
   之前会掉到 64x64，导致异种页预览的缩放和游戏里不一致。 */
const NAT_DIM = new Map();
/* visible pixel box of a texture, so hair / props can be fitted by their art, not their canvas */
const ALPHA_BOX = new Map();

function loadTextureEl(path) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      try {
        const had = NAT_DIM.get(path);
        NAT_DIM.set(path, [im.naturalWidth || 64, im.naturalHeight || 64]);
        if (!had || had[0] !== im.naturalWidth || had[1] !== im.naturalHeight) {
          try { renderStage(); } catch (e) { }
          try { if (S && S.tab === 'variant') renderVariantPane(); } catch (e) { }
        }
      } catch (e) { }
      res(im);
    };
    im.onerror = () => res(null);
    im.src = imgURL(path);
  });
}

async function alphaBoxAsync(path) {
  if (ALPHA_BOX.has(path)) {
    const c0 = ALPHA_BOX.get(path);
    if (!c0 || c0.ok !== false) return c0;      // 只有成功的结果才复用
  }
  const [iw, ih] = imgDim(path);
  const fallback = { x0: 0, y0: 0, x1: iw, y1: ih, w: iw, h: ih, ok: false, iw, ih };
  const im = await loadTextureEl(path);
  if (!im || !im.naturalWidth) { return fallback; }   // 不缓存失败：贴图可能还没加载完，下次再算
  let box = fallback;
  try {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) {
      const row = y * c.width;
      for (let x = 0; x < c.width; x++) {
        if (d[(row + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= x0 && y1 >= y0) box = { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, ok: true, iw: c.width, ih: c.height };
  } catch (e) { /* tainted canvas */ }
  ALPHA_BOX.set(path, box);
  return box;
}

function prettyAsset(path) {  const a = ASSETMAP.get(path);
  if (a && a.n) return a.n;
  const base = String(path).split('/').pop() || '贴图';
  return base.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/* ---------- state ---------- */
let uidSeq = 0;
const uid = () => 'p' + (++uidSeq).toString(36) + Math.random().toString(36).slice(2, 5);

const S = {
  project: { name: 'Nice Health Tab · 体型补丁', author: '', packageId: 'Andromeda.NHT.AnatomyPatch', note: '' },
  canvases: [],
  active: null,
  sel: null,
  tab: 'global',
  view: { z: 1, px: 0, py: 0 },
  flags: { grid: true, hitbox: false, icons: false },
  kinds: { organ: false, bone: false },
  ui: { q: '', cat: 'all', scope: 'all', pick: null, closed: {}, allClosed: false },
  wins: {},
  winSel: null,
  customAssets: [],
  history: [], hi: -1,
  dirty: false,
  lastBoard: null
};

/* ---------- model ---------- */
function makePart(raw) {
  const nm = NAMES[String(raw.bid)];
  return {
    uid: uid(),
    id: raw.id,
    name: raw.name || (nm ? nm.zh : raw.id),
    nameEn: raw.nameEn || (nm ? nm.en : raw.id),
    kind: raw.k,
    bid: raw.bid,
    img: raw.img,
    x: raw.x, y: raw.y,
    sx: raw.sx == null ? 1 : raw.sx,
    sy: raw.sy == null ? 1 : raw.sy,
    flip: !!raw.flip,
    rot: 0,
    layer: raw.l || 0,
    extra: raw.extra || 0,
    hb: raw.hb ? [raw.hb[0], raw.hb[1]] : [1, 1],
    hbPx: !!raw.hbPx,
    armor: !!raw.armor,
    vis: raw.vis !== false,
    locked: false,
    state: 'ok', sev: 0, wound: 'cut', prosth: null, overHair: false,
    atlas: raw.atlas || null,
    uv: raw.uv || null,
    custom: raw.k === 'custom' || !!raw.custom,
    source: raw.source || 'mod'
  };
}

function canvasFromBodytype(bt) {
  const c = {
    id: bt.id, title: bt.title, sub: bt.en, kind: 'default',
    doll: bt.doll, bodytype: bt.bodytype, gender: bt.gender, xenotype: bt.xenotype,
    bounds: { x: bt.bounds[0], y: bt.bounds[1], w: bt.bounds[2], h: bt.bounds[3] },
    outline: bt.outline, desc: bt.desc, base: bt.id,
    parts: bt.parts.map(makePart), detached: [],
    race: null, notes: '',
    // the mod keeps the child doll's markers off by default, so the Kid canvas starts clean
    rjw: RJW_PARTS.length > 0 && bt.doll !== 'Kid'
  };
  if (c.rjw) ensureRJW(c);
  return c;
}

/* ---------- RJW genitalia layer ---------- */
function rjwSourceDoll(c) {
  if (!c) return 'Male';
  if (RJW_BY_DOLL.has(c.doll)) return c.doll;
  const bt = D.bodytypes.find(b => b.id === c.base);
  const d = bt ? bt.doll : 'Male';
  return RJW_BY_DOLL.has(d) ? d : 'Male';
}

function rjwPartId(def, c) {
  if (c.doll === def.doll) return def.id;
  return def.id.replace(new RegExp('_' + def.doll + '$'), '_' + c.doll);
}

function rjwImgFor(def, formName, size) {
  const form = def.forms.find(f => f.f === formName) || def.forms[0];
  if (!form) return def.img;
  const idx = clamp(Math.round(size), 0, Math.max(0, form.n - 1));
  return `${form.p}_${idx}`;
}

function makeRJWPart(def, c) {
  const form = def.forms.find(f => f.f === def.form) || def.forms[0] || { f: '', n: 1, p: def.defImg };
  const size = clamp(def.size || 0, 0, Math.max(0, form.n - 1));
  return {
    uid: uid(),
    id: rjwPartId(def, c),
    name: def.zh,
    nameEn: def.en,
    kind: def.k,
    bid: def.bid,
    img: rjwImgFor(def, form.f, size),
    x: def.x, y: def.y, sx: def.sx, sy: def.sy,
    flip: !!def.flip, rot: 0,
    layer: def.l, extra: def.extra || 0,
    hb: [def.hb[0], def.hb[1]],
    armor: !!def.armor,
    vis: def.vis !== false,
    locked: false,
    state: 'ok', sev: 0, wound: 'cut', prosth: null,
    atlas: null, uv: null,
    custom: false, source: 'rjw',
    rjw: { base: def.base, defId: def.id, form: form.f, size }
  };
}

function ensureRJW(c) {
  if (!RJW_PARTS.length || !c || c.rjw !== true) return 0;
  const defs = RJW_BY_DOLL.get(rjwSourceDoll(c)) || [];
  const have = new Set(c.parts.filter(p => p.source === 'rjw' && p.rjw).map(p => p.rjw.base));
  let n = 0;
  defs.forEach(def => {
    if (have.has(def.base)) return;
    c.parts.push(makeRJWPart(def, c));
    n++;
  });
  return n;
}

function removeRJW(c) {
  if (!c) return 0;
  const before = c.parts.length + c.detached.length;
  c.parts = c.parts.filter(p => p.source !== 'rjw');
  c.detached = c.detached.filter(p => p.source !== 'rjw');
  return before - (c.parts.length + c.detached.length);
}

function rjwDefOfPart(p) {
  if (!p || !p.rjw) return null;
  return RJW_BY_ID.get(p.rjw.defId) || RJW_PARTS.find(d => d.base === p.rjw.base) || null;
}

function setCanvasRJW(c, on) {
  if (!c || !RJW_PARTS.length) return;
  c.rjw = !!on;
  let n = 0;
  if (on) {
    n = ensureRJW(c);            // 打开：补齐缺少的 RJW 部位（位置保留的沿用原数据）
  } else {
    // 第一次关闭：先按默认生成一份数据保存下来，再隐藏（以后随时打开都能恢复）
    if (!c.parts.some(p => p.source === 'rjw')) {
      const was = c.rjw;
      c.rjw = true;
      ensureRJW(c);
      c.rjw = was;
    }
    S.sel = null;
  }
  // RJW layer and the organ (x-ray) layer are independent: switching RJW must not
  // change what the 器官 button shows.
  renderAll();
  fitView();
  pushHistory();
  if (on) toast(n ? `已显示 / 补齐 ${n} 个 RJW 部位` : 'RJW 部位已全部在画布上');
  else toast('已隐藏 RJW 部位（数据保留，随时可再打开）');
}

function normalizeCanvas(c) {
  if (c.locked == null) c.locked = true;      // 默认锁定，防止误删
  c.bounds = c.bounds || { x: -180, y: -465, w: 360, h: 910 };
  ['x', 'y', 'w', 'h'].forEach(k => { if (!Number.isFinite(c.bounds[k])) c.bounds[k] = { x: -180, y: -465, w: 360, h: 910 }[k]; });
  // hairFit 只接受"身高"单位（±1 以内）；历史数据里可能混进像素值，这里换算回来
  if (c.hairFit && typeof c.hairFit === 'object') {
    const fix = v => (Math.abs(v) > 5 ? v / 1024 : v);
    c.hairFit.offsetX = fix(Number(c.hairFit.offsetX) || 0);
    c.hairFit.offsetY = fix(Number(c.hairFit.offsetY) || 0);
    const sc = Number(c.hairFit.scale);
    c.hairFit.scale = Number.isFinite(sc) && sc > 0 ? Math.min(3, Math.max(0.1, sc)) : 0.78;
  }
  if (c.noExportCenter == null) c.noExportCenter = true;   // 自动居中默认关闭
  if (c.rjw == null) c.rjw = false;                        // RJW 默认不启用
  c.parts = Array.isArray(c.parts) ? c.parts : [];
  // 兼容旧数据：曾经把贴纸存进 c.notes（那本来是画布描述文本）
  if (Array.isArray(c.notes)) { c.stickers = c.notes; c.notes = ''; }
  c.stickers = Array.isArray(c.stickers) ? c.stickers.filter(n => n && typeof n === 'object') : [];
  c.guides = Array.isArray(c.guides) ? c.guides.filter(g => g && (g.o === 'h' || g.o === 'v')) : [];
  c.stickers.forEach(n => { n.x = Number.isFinite(n.x) ? n.x : 0; n.y = Number.isFinite(n.y) ? n.y : 0; n.text = String(n.text || ''); });
  c.guides.forEach(g => { g.p = Number.isFinite(g.p) ? g.p : 0; });
  c.detached = Array.isArray(c.detached) ? c.detached : [];
  [...c.parts, ...c.detached].forEach(p => {
    p.uid = p.uid || uid();
    p.img = p.img || 'HediffTab/Prosthesis/Placeholder';
    p.x = Number.isFinite(p.x) ? p.x : 0;
    p.y = Number.isFinite(p.y) ? p.y : 0;
    p.sx = Number.isFinite(p.sx) && p.sx > 0 ? p.sx : 1;
    p.sy = Number.isFinite(p.sy) && p.sy > 0 ? p.sy : 1;
    p.rot = Number.isFinite(p.rot) ? p.rot : 0;
    p.layer = Number.isFinite(p.layer) ? p.layer : 0;
    p.extra = Number.isFinite(p.extra) ? p.extra : 0;
    p.hb = Array.isArray(p.hb) ? p.hb : [1, 1];
    p.bid = Number.isFinite(p.bid) ? p.bid : -1;
    p.kind = p.kind || 'custom';
    p.state = p.state || 'ok';
    p.sev = Number.isFinite(p.sev) ? p.sev : 0;
    p.wound = p.wound || 'cut';
    p.vis = p.vis !== false;
    p.custom = !!p.custom || p.kind === 'custom';
    p.name = p.name || p.id || '部位';
    p.nameEn = p.nameEn || p.name;
    p.id = p.id || ('Part_' + p.uid);
    if (p.source === 'rjw' && !p.rjw) p.rjw = { base: p.nameEn || p.name, defId: p.id, form: '', size: 0 };
  });
  if (c.rjw === undefined) c.rjw = c.kind === 'default' && RJW_PARTS.length > 0;
  return c;
}


/* 模组文件夹改过名时：把保存路径里的旧前缀换成实际文件夹名（/__self 读到的） */
function migrateModPaths() {
  try {
    const paths = (S.settings && S.settings.paths) || {};
    let touched = false;
    Object.keys(paths).forEach(k => {
      const v = String(paths[k] || '');
      if (/^NHT_CustomDolls\//.test(v) && SELF.name && SELF.name !== 'NHT_CustomDolls') {
        paths[k] = SELF.name + v.slice('NHT_CustomDolls'.length);
        touched = true;
      }
    });
    return touched;
  } catch (e) { return false; }
}

function pruneGlowLayers(c) {
  if (!c || !Array.isArray(c.parts)) return 0;
  const by = new Map(c.parts.map(p => [p && p.uid, p]));
  const before = c.parts.length;
  c.parts = c.parts.filter(p => {
    if (!p || !p.glowLayer) return true;
    const base = by.get(p.glowFor);
    return !!(base && !base.glowLayer);
  });
  return before - c.parts.length;
}

/* t16：旧项目的「非 HAR 微调」存在 vanillaFit 里，而游戏默认不读这组（ApplyVanillaRect 被
   vanillaHairUseEditor 门控，默认关）。这里做一次性停用：hairFit 现值原样保留（= 游戏当前值），
   vanillaFit 置 identity，并提示要保留放大效果的人手动改 scale —— 绝不把旧倍数偷偷折进 hairFit。 */
function migrateVanillaFitStop(c) {
  if (!c || c.vanillaFitStoppedV1) return null;
  const vf = c.vanillaFit;
  c.vanillaFit = { scale: 1, offsetX: 0, offsetY: 0 };
  c.vanillaFitStoppedV1 = true;
  if (!vf || typeof vf !== 'object') return null;
  const s = Number(vf.scale) || 1, ox = Number(vf.offsetX) || 0, oy = Number(vf.offsetY) || 0;
  const identity = Math.abs(s - 1) < 1e-6 && Math.abs(ox) < 1e-6 && Math.abs(oy) < 1e-6;
  if (identity) return null;
  const hf = c.hairFit || { scale: 0.78, offsetX: 0, offsetY: -0.21 };
  const sug = ((Number(hf.scale) || 0.78) * s).toFixed(3);
  return { title: c.title || c.doll || c.id || '?', old: s, sug: sug };
}

function applyProject(st) {
  S.trash = Array.isArray(st.trash) ? st.trash : (S.trash || []);
  S.project = Object.assign(S.project, st.project || {});
  S.canvases = (st.canvases || []).map(normalizeCanvas);
  S.canvases.forEach(c => {
    try { pruneGlowLayers(c); } catch (e) { }
    try { migrateGlowVariantPathsSync(c); } catch (e) { }
    // migrate old saves / restored layouts: the switch on but the RJW markers missing
    if (c.rjw && RJW_PARTS.length && !c.parts.some(p => p.source === 'rjw')) ensureRJW(c);
    // canvases made from the mod's body types follow the newest defs the page ships with,
    // so a canvas saved against an old version picks up the new BoundingBox
    if (c.kind !== 'race' && c.kind !== 'custom') {
      const bt = D.bodytypes.find(b => b.doll === c.doll) || D.bodytypes.find(b => b.id === c.base);
      if (bt && bt.bounds && bt.bounds.length === 4) {
        const nb = { x: bt.bounds[0], y: bt.bounds[1], w: bt.bounds[2], h: bt.bounds[3] };
        if (!c.bounds || c.bounds.w !== nb.w || c.bounds.h !== nb.h || c.bounds.x !== nb.x || c.bounds.y !== nb.y) {
          c.bounds = nb;
        }
      }
    }
  });
  try { normalizeCanvasNames(); } catch (e) { }
  // t16：一次性停用旧的 vanillaFit 微调（详见 migrateVanillaFitStop 注释）；提示/落盘放到函数末尾
  var vfitNotes = [];
  var vfitMarked = false;   // t18：identity 项目也要落盘标记，否则每次打开都重跑迁移判断
  try {
    S.canvases.forEach(c => {
      const had = !!(c && c.vanillaFitStoppedV1);
      const n = migrateVanillaFitStop(c);
      if (n) vfitNotes.push(n);
      if (!had && c && c.vanillaFitStoppedV1) vfitMarked = true;
    });
  } catch (e) { }
  // t30：一次性修复历史坏命中框（旧版乘法没有上限，手工输入也没有上限，框能被炸到几万甚至 1e26 px）。
  // 先记一份历史快照再改，保证用户能撤销；只改内存，随下一次 persist() 落盘。修过的不再命中（幂等）。
  try {
    // t32-D1：先探测「是否存在坏框」，再把 pushHistory() 压在修复之前调用。
    // t30 是在修复之后才 pushHistory，快照里已经是修好的数据，撤销等于没撤销。
    const canvases = S.canvases || [];
    let needFix = false;
    canvases.forEach(c => {
      if (needFix || !c) return;
      const list = [].concat(c.parts || [], c.detached || []);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (p && p.hbox && !p.hbBig && hitboxBadReason(p)) { needFix = true; break; }
      }
    });
    if (needFix) {
      pushHistory();
      const hbFixes = [];
      canvases.forEach(c => {
        try { repairBadHitboxes(c).forEach(x => hbFixes.push(x)); } catch (e) { }
      });
      if (hbFixes.length) {
        // t33-B1：修复前已 push 一次（pre），这里再 push 一次（post），history=[pre,post]、hi=1，
        // 这样启动期加载后的第一次 undo 才能真正回到「修复前」；否则 hi=0 会让撤销按钮恒灰。
        try { pushHistory(); } catch (e) { }
        const s0 = hbFixes[0];
        console.warn('[NHT 编辑器] 已修复 ' + hbFixes.length + ' 个异常命中框（如 ' + s0.name + ' ' + s0.before + ' → ' + s0.after + '）');
        try {
          toast('已修复 ' + hbFixes.length + ' 个异常命中框（如 ' + s0.name + ' ' + s0.before + ' → ' + s0.after + '）；可用撤销回退');
        } catch (e) { }
      }
    }
  } catch (e) { }
  // 记录每张画布的“干净基线”：只有之后改动过才会被判定为「已修改」
  try {
  S.canvases.forEach(c => {
    if (!c) return;
    if (c.sigVer !== CANVAS_SIG_VER) { c.savedSig = canvasSig(c); c.sigVer = CANVAS_SIG_VER; c.sigVer = CANVAS_SIG_VER; }
    else if (!c.savedSig) c.savedSig = canvasSig(c);
  });
} catch (e) { }
  S.wins = (st.wins && typeof st.wins === 'object') ? st.wins : {};
  try { migrateWinSizes(); renderWins(activeCanvas()); } catch (e) { }
  if (st.flags && typeof st.flags === 'object') {
    const f = Object.assign({}, st.flags);
    Object.assign(S.flags, f);
  }
  if (st.kinds && typeof st.kinds === 'object') {
    Object.keys(S.kinds).forEach(k => { if (k in st.kinds) S.kinds[k] = !!st.kinds[k]; });
  }
  if (st.ui && st.ui.open && typeof st.ui.open === 'object') S.ui.open = st.ui.open;
  if (st.ui && typeof st.ui === 'object') {
    if (Array.isArray(st.ui.cvGroups) && st.ui.cvGroups.length) S.ui.cvGroups = st.ui.cvGroups;
    if (st.ui.cvCollapsed && typeof st.ui.cvCollapsed === 'object') S.ui.cvCollapsed = st.ui.cvCollapsed;
    if (st.ui.linkOpen && typeof st.ui.linkOpen === 'object') S.ui.linkOpen = st.ui.linkOpen;
    if (st.ui.panels && typeof st.ui.panels === 'object') S.ui.panels = st.ui.panels;
    if (st.ui.cvBaseSeeded) S.ui.cvBaseSeeded = true;
    if (st.ui.cat) S.ui.cat = st.ui.cat;
    if (typeof st.ui.q === 'string') S.ui.q = st.ui.q;
  }
  if (st.settings && typeof st.settings === 'object') {
    S.settings = Object.assign(saveSettings(), st.settings);
    S.settings.paths = Object.assign({}, saveSettings().paths, st.settings.paths || {});
    if (migrateModPaths()) { try { persist(); } catch (e) { } }
  }
  if (st.view && typeof st.view === 'object') {
    if (Number.isFinite(st.view.z)) S.view.z = st.view.z;
    if (Number.isFinite(st.view.px)) S.view.px = st.view.px;
    if (Number.isFinite(st.view.py)) S.view.py = st.view.py;
  }
  if (typeof st.tab === 'string') S.tab = st.tab;
  S.customAssets = Array.isArray(st.customAssets) ? st.customAssets : [];
  S.hairRef = (st.hairRef && st.hairRef.img) ? { img: st.hairRef.img } : null;
  if (st.hairFits && typeof st.hairFits === 'object') {
    // saved alignments of the hairstyle references (position, scale, lock, layer, visibility)
    const all = hairFits();
    Object.keys(st.hairFits).forEach(k => { if (!all[k]) all[k] = st.hairFits[k]; });
    try { localStorage.setItem(HAIR_FIT_KEY, JSON.stringify(all)); } catch (e) { }
  }
  S.mine = (st.mine && Array.isArray(st.mine.folders)) ? st.mine : { folders: [{ id: 'f1', name: '未分类', paths: [] }], seq: 2 };
  restoreCustomAssets();
  S.winSel = null;
  S.active = st.active && S.canvases.some(c => c.id === st.active) ? st.active : (S.canvases[0] || {}).id;
  S.sel = null;
  try { migrateWinSizes(); } catch (e) { }
  // t16：状态全部载入后再提示并落盘标记（避免把半载入的工程整体回写）
  // t18：即便全部是 identity（无提示），只要本次新置了标记就落盘一次。
  if (vfitNotes.length || vfitMarked) {
    if (vfitNotes.length) {
      vfitNotes.forEach(n => console.warn('[NHT 编辑器] ' + n.title + ' 旧的非 HAR 微调 scale=' + n.old
        + ' 已停用（游戏不读它）；要保留该放大效果请把缩放改为 ' + n.sug));
      try {
        toast(vfitNotes.map(n => n.title + ' 旧微调 ' + n.old + ' 已停用；要保留请把缩放调到 ' + n.sug).join('；'));
      } catch (e) { }
    }
    try { persist(); } catch (e) { }
  }
}

function seedProject() {
  return {
    project: { name: 'Nice Health Tab · 体型补丁', author: '', packageId: 'Andromeda.NHT.AnatomyPatch', note: '以 Nice Health Tab 模组 1.6 默认体型为基准制作的部位补丁。' },
    canvases: D.bodytypes.map(canvasFromBodytype),
    active: D.bodytypes[0].id
  };
}

const activeCanvas = () => (S.preview && S.preview.canvas) ? S.preview.canvas : (S.canvases.find(c => c.id === (S.viewOnly || S.active)) || S.canvases.find(c => c.id === S.active) || S.canvases[0] || null);
const byUid = u => {
  const c = activeCanvas(); if (!c) return null;
  const hit = c.parts.find(p => p.uid === u) || c.detached.find(p => p.uid === u) || null;
  if (hit) return hit;
  // t58：异种专属部位 —— 仅当当前选中的异种就是它所属的异种时才解析，
  // 否则切到别的异种/基础态后 S.sel 会指向一个不属于当前上下文的记录。
  try {
    const v = c && variantState(c);
    if (v && v.extraParts && v.extraParts[u]) return variantExtraPart(v, u);
  } catch (e) { }
  return null;
};
const selPart = () => (S.sel ? byUid(S.sel) : null);
const isDetached = p => { const c = activeCanvas(); return !!c && c.detached.includes(p); };

/* ---------- history / persist ---------- */
function snapshot() {
  return JSON.stringify({ project: S.project, canvases: S.canvases, active: S.active });
}
function pushHistory() {
  const snap = snapshot();
  if (S.history[S.hi] === snap) return;
  S.history = S.history.slice(0, S.hi + 1);
  S.history.push(snap);
  if (S.history.length > 80) S.history.shift();
  S.hi = S.history.length - 1;
  persist();
  renderHistoryButtons();
}
function restoreHistory(i) {
  if (i < 0 || i >= S.history.length) return;
  const st = JSON.parse(S.history[i]);
  S.project = st.project; S.canvases = st.canvases; S.active = st.active; S.hi = i; S.sel = null;
  renderAll();
  fitView();
  persist();
}
function undo() {
  if (S.preview) { S.preview = null; document.body.classList.remove('is-preview'); } if (S.hi > 0) { restoreHistory(S.hi - 1); toast('已撤销'); } }
function redo() {
  if (S.preview) { S.preview = null; document.body.classList.remove('is-preview'); } if (S.hi < S.history.length - 1) { restoreHistory(S.hi + 1); toast('已重做'); } }
function renderHistoryButtons() {
  const u = $('#btnUndo'), r = $('#btnRedo');
  if (u) u.disabled = S.hi <= 0;
  if (r) r.disabled = S.hi >= S.history.length - 1;
}

let persistTimer = 0;
let delArmTimer = 0;
let UI_DIRTY = true;
function markDirty() { UI_DIRTY = true; scheduleHarBadgeRefresh(); }
function scheduleHarBadgeRefresh() {
  clearTimeout(window.__harBadgeT);
  window.__harBadgeT = setTimeout(() => {
    const c = activeCanvas();
    if (c) { try { updateHarBadge(c); } catch (e) { } }
  }, 80);
}
function persist() {
  markDirty();
  clearTimeout(persistTimer);
  persistTimer = setTimeout(doPersist, 350);
}
function doPersist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(projectPayload()));
    setSaveStatus('已自动保存 · ' + now());
    try { scheduleCanvasSave(); } catch (e) { }
  } catch (e) {
    setSaveStatus('本地存储不可用（仅本次会话）');
  }
}
function setSaveStatus(txt, busy) {
  const el = $('#statusLeft');
  if (!el) return;
  el.textContent = txt;
  el.classList.toggle('is-busy', !!busy);
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const st = JSON.parse(raw);
    if (!st || !Array.isArray(st.canvases) || !st.canvases.length) return null;
    return st;
  } catch (e) { return null; }
}

/* ---------- geometry ---------- */
function quadOf(p, withHb) {
  const [w0, h0] = imgDim(p.img);
  const fx = withHb ? p.hb[0] : 1, fy = withHb ? p.hb[1] : 1;
  const w = w0 * p.sx * fx, h = h0 * p.sy * fy;
  const r = (p.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  return pts.map(([x, y]) => [p.x + x * c - y * s, p.y + x * s + y * c]);
}

/* ---- 命中框：hb 是导出用的比例，hbox 是可以自由拖的框（画布单位） ---- */
function hitBox(p) {
  if (!p) return { dx: 0, dy: 0, w: 10, h: 10 };
  if (p.hbox && p.hbox.w > 0 && p.hbox.h > 0) {
    // 编辑器按可见框的真实中心显示；游戏 Defs 只能写居中的 hitboxScale
  return { dx: Number(p.hbox.dx) || 0, dy: Number(p.hbox.dy) || 0, w: p.hbox.w, h: p.hbox.h };
  }
  const [w0, h0] = imgDim(p.img);
  return {
    dx: 0, dy: 0,
    w: Math.max(1, w0 * p.sx * (p.hb ? p.hb[0] : 1)),
    h: Math.max(1, h0 * p.sy * (p.hb ? p.hb[1] : 1)),
  };
}
function hitQuad(p) {
  const b = hitBox(p);
  const r = (p.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const x0 = b.dx - b.w / 2, x1 = b.dx + b.w / 2, y0 = b.dy - b.h / 2, y1 = b.dy + b.h / 2;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [p.x + x * c - y * s, p.y + x * s + y * c]);
}
/* 只看「肉眼看得到的像素」的框：画选框/手柄用它，导出的判定框不受影响 */

/* ---------------- 可见像素框（裁剪透明边）---------------- */
const VISBOX_PENDING = new Set();
const VISBOX_TRIES = new Map();

function scheduleAlphaBox(path, force) {
  if (!path) return Promise.resolve(null);
  if (VISBOX_PENDING.has(path)) return Promise.resolve(ALPHA_BOX.get(path) || null);
  const tries = VISBOX_TRIES.get(path) || 0;
  if (!force && tries >= 6) return;
  VISBOX_PENDING.add(path);
  const prevBox = ALPHA_BOX.get(path);
  if (force) ALPHA_BOX.delete(path);
  return Promise.resolve(alphaBoxAsync(path)).then(b => {
    VISBOX_PENDING.delete(path);
    if (!(b && b.ok && b.w > 1 && b.h > 1)) {
      // 这次没算出来（图还没准备好）：保留原来那份，别把好数据覆盖成整图
      if (prevBox && prevBox.ok) ALPHA_BOX.set(path, prevBox);
    }
    if (b && b.ok && b.w > 1 && b.h > 1) {
      VISBOX_TRIES.delete(path);
      try { renderStage(); renderOverlay(); } catch (e) { }
    } else if (tries + 1 < 6) {
      VISBOX_TRIES.set(path, tries + 1);
      setTimeout(() => { try { renderStage(); renderOverlay(); } catch (e) { } }, 700);
    }
    return b || null;
  }).catch(() => { VISBOX_PENDING.delete(path); VISBOX_TRIES.set(path, tries + 1); return null; });
}

/* 手动重算：部位属性里的按钮 */
async function recalcVisBox(p) {
  if (!p || !p.img) { toast('这个部位没有贴图', true); return; }
  const path = p.img;
  const [iw, ih] = imgDim(path);
  let box = null;
  for (let i = 0; i < 4; i++) {
    box = await scheduleAlphaBox(path, i === 0);
    if (box && box.ok && box.w > 1 && box.h > 1) break;
    await new Promise(r => setTimeout(r, 350));   // 贴图可能还没解码完
  }
  if (box && box.ok && box.w > 1 && box.h > 1) {
    const tiny = box.w >= iw - 1 && box.h >= ih - 1;
    renderStage(); renderOverlay();
    toast(tiny
      ? `这张贴图几乎没有透明边（${iw}×${ih}）`
      : `可见区 ${Math.round(box.w)}×${Math.round(box.h)} / ${iw}×${ih}，选框已贴合`);
  } else {
    toast(`读不到透明信息（${imgDim(path).join('×')}）：浏览器在 file:// 下禁止读取图片像素。 办法：跑一次 tools/precompute_ab.py（把可见区写进素材清单），或用本地 http 打开页面`, true);
  }
}

function visBox(p) {
  if (!p) return { dx: 0, dy: 0, w: 10, h: 10 };
  const [iw, ih] = imgDim(p.img);
  const e = EXT.get(p.img);
  const ab = e && e.ab;
  let box = null;
  if (ab && ab[2] > 1 && ab[3] > 1) box = { x0: ab[0], y0: ab[1], w: ab[2], h: ab[3] };
  else {
    const c = ALPHA_BOX.get(p.img);
    if (c && c.ok && c.w > 1 && c.h > 1) box = { x0: c.x0, y0: c.y0, w: c.w, h: c.h };
  }
  if (!box) {
    scheduleAlphaBox(p.img);            // 后台算，算完自动重画一次
    // 没有 alpha 数据时用图像框（会随 sx/sy 缩放），不能拿固定的 hbox 当视觉框
    return { dx: 0, dy: 0, w: Math.max(1, iw * p.sx), h: Math.max(1, ih * p.sy) };
  }
  const sx = p.sx, sy = p.sy;
  // 可见区域中心相对图片中心的偏移（图片是围绕 p.x/p.y 居中的）
  let cxo = (box.x0 + box.w / 2 - iw / 2) * sx;
  const cyo = (box.y0 + box.h / 2 - ih / 2) * sy;
  if (p.flip) cxo = -cxo;          // 图片被 scaleX(-1) 镜像，可见区也跟着翻
  return { dx: cxo, dy: cyo, w: Math.max(1, box.w * sx), h: Math.max(1, box.h * sy) };
}
function visQuad(p) {
  const b = visBox(p);
  const r = (p.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const x0 = b.dx - b.w / 2, x1 = b.dx + b.w / 2, y0 = b.dy - b.h / 2, y1 = b.dy + b.h / 2;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [p.x + x * c - y * s, p.y + x * s + y * c]);
}
/* pointer (canvas coords) -> the part's local, unrotated frame */
function toPartLocal(p, x, y) {
  const r = -(p.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const dx = x - p.x, dy = y - p.y;
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}
/* ---------------- t119：眼睛的命中框 ----------------
   左眼/右眼的贴图是「整只眼睛」的图，但游戏里眼睛很小；用「可见框」当点击区会顺手把
   眼周一大片也变成判定区（点脸就会弹部位设置）。这里按固定像素给眼睛一个标准框，
   世界坐标同 p.x/p.y（dx=dy=0），尺寸 = 22px × |sx| / |sy|。 */
const EYE_HB_PX = 22;
// t121：用户 2026-11-12 决定「不需要改眼睛点击区」，这里留开关但默认关闭。
// 想启用时把这里改成 true，重新构建部署即可恢复整套逻辑（导入/导出/首次渲染都会收窄）。
const EYE_HB_ENABLED = false;
function isEyePart(p) {
  if (!p) return false;
  return /眼|eye/i.test(String(p.name || '') + ' ' + String(p.id || ''));
}
function eyeHboxOf(p) {
  const [w0, h0] = imgDim(p && p.img);
  const aw = Math.max(1, Number(w0) * Math.abs(Number(p.sx) || 1));
  const ah = Math.max(1, Number(h0) * Math.abs(Number(p.sy) || 1));
  return {
    dx: 0, dy: 0,
    w: round(Math.min(EYE_HB_PX, aw), 1),
    h: round(Math.min(EYE_HB_PX, ah), 1),
  };
}
function applyEyeHitbox(p, force) {
  if (!EYE_HB_ENABLED) return false;
  if (!isEyePart(p) || !p.img || p.hbBig) return false;
  const [dw, dh] = imgDim(p.img);
  // t119：贴图还没解码/尺寸未知时不要拿 1px 去覆盖（否则眼睛框会被写成 1×1）
  if (!(Number(dw) > 2) || !(Number(dh) > 2)) return false;
  const want = eyeHboxOf(p);
  const cur = p.hbox;
  const same = cur && !force
    && Math.abs(Number(cur.w) - want.w) < 0.05 && Math.abs(Number(cur.h) - want.h) < 0.05
    && Math.abs(Number(cur.dx) || 0) < 0.05 && Math.abs(Number(cur.dy) || 0) < 0.05;
  if (same) return false;
  p.hbox = want;
  delete p.hbBad;
  syncHbFromBox(p);
  return true;
}

/* keep the exported hitboxScale in sync with the free rect */
function syncHbFromBox(p) {
  if (!p || !p.hbox) return;
  const [w0, h0] = imgDim(p.img);
  // t30：空贴图（w0/h0≤0）不能再用 0.01 兜底——那会让 hb 每重算一次就 ×100（Empty_4 被炸到 4.65e26）。
  const aw = Number(w0) * Number(p.sx || 0), ah = Number(h0) * Number(p.sy || 0);
  if (!(aw > 0) || !(ah > 0)) return;
  const bw = Number(p.hbox.w), bh = Number(p.hbox.h);
  // t30：上限与导出守卫同口径（1.5；显式 hbBig 的部位放宽到 6）。超限只打 hbBad 标记，
  // 不在这里静默改历史值——批量修复在 repairBadHitboxes，单个修复用「可见框→命中框」。
  const cap = p.hbBig ? 6 : 1.5;
  p.hb = [
    clamp(round((Number.isFinite(bw) ? bw : aw) / aw, 3), 0.02, cap),
    clamp(round((Number.isFinite(bh) ? bh : ah) / ah, 3), 0.02, cap),
  ];
  if (!p.hbBig && (bw > aw * 1.5 + 2 || bh > ah * 1.5 + 2)) p.hbBad = 'oversize';
}

/* 命中框兜底：太小的自动放大到“最小可用尺寸”，并保证不跑到贴图外面 */
const HB_MIN_PX = 28;
function ensureHitbox(p) {
  if (!p || !p.img) return false;
  const [w0, h0] = imgDim(p.img);
  const artW = Math.max(1, w0 * Math.abs(p.sx || 1));
  const artH = Math.max(1, h0 * Math.abs(p.sy || 1));
  let changed = false;
  // t119：眼睛不参与「最小 28px / 可见框」那套兜底，统一按 EYE_HB_PX 的标准框
  if (EYE_HB_ENABLED && isEyePart(p)) {
    const eyeChanged = applyEyeHitbox(p);
    if (!eyeChanged && p.hbox && !p.hbBig) {
      // 历史数据里过大的眼睛框（例如整张脸的可见框）也一并收紧
      const want = eyeHboxOf(p);
      if (Number(p.hbox.w) > want.w + 1 || Number(p.hbox.h) > want.h + 1) {
        if (applyEyeHitbox(p, true)) changed = true;
      }
    } else if (eyeChanged) changed = true;
    return changed;
  }
  if (p.hbox) {
    const minW = Math.min(HB_MIN_PX, artW), minH = Math.min(HB_MIN_PX, artH);
    if (p.hbox.w < minW || p.hbox.h < minH) {
      p.hbox.w = Math.max(p.hbox.w, minW);
      p.hbox.h = Math.max(p.hbox.h, minH);
      changed = true;
    }
    // 中心别偏出贴图范围（允许少量溢出）
    const limX = artW / 2, limY = artH / 2;
    const nx = clamp(p.hbox.dx, -limX, limX), ny = clamp(p.hbox.dy, -limY, limY);
    if (nx !== p.hbox.dx || ny !== p.hbox.dy) { p.hbox.dx = nx; p.hbox.dy = ny; changed = true; }
  } else {
    // 没有自定义框：hb 归一化后太小也放大
    const hbW = (p.hb && p.hb[0]) || 1, hbH = (p.hb && p.hb[1]) || 1;
    const minW = Math.min(1, HB_MIN_PX / artW), minH = Math.min(1, HB_MIN_PX / artH);
    if (hbW < minW || hbH < minH) {
      p.hb = [Math.max(hbW, minW), Math.max(hbH, minH)];
      changed = true;
    }
  }
  if (changed) syncHbFromBox(p);
  // t30：补上限校验（原来只有下限）。这里只打标记、不改值，交给加载时的修复或「设为可见框」处理。
  if (p.hbox) {
    const why = p.hbBad ? null : hitboxBadReason(p);
    if (why) p.hbBad = why;
  }
  return changed;
}
/* ---------------- t30：命中框上下限守卫 ---------------- */
// 画布是 512×1024，正常部位框最多比可见区大一点；4096（8 倍画布宽）一定是坏值。
const HB_MAX_ABS = 4096;
/* 这个框为什么算坏（null = 正常）。只判定，不改值。 */
function hitboxBadReason(p) {
  if (!p || !p.hbox) return null;
  const w = Number(p.hbox.w), h = Number(p.hbox.h);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return '非有限值';
  if (w <= 0 || h <= 0) return '尺寸≤0';
  if (w > HB_MAX_ABS || h > HB_MAX_ABS) return '超过 ' + HB_MAX_ABS;
  if (!(Number(p.sx) > 0) || !(Number(p.sy) > 0)) return '缩放≤0';
  const vb = visBox(p);
  if (!vb || !(vb.w > 0) || !(vb.h > 0)) return null;
  if (w > vb.w * 1.5 + 2 || h > vb.h * 1.5 + 2) return '比可见区大';
  return null;
}
/* 乘法路径用：把框夹回「可见区 ×1.5 + 2」以内；夹过就打 hbBad，别让它再次滚雪球。 */
function clampHitboxToVis(p) {
  // t32-D2：hbPx 是「按像素导出」的部位，它的 hbox 单位不是画布比例，不能按可见区夹。
  if (!p || !p.hbox || p.hbBig || p.hbPx) return false;
  const vb = visBox(p);
  const maxW = Math.max(4, Math.min(HB_MAX_ABS, vb.w * 1.5 + 2));
  const maxH = Math.max(4, Math.min(HB_MAX_ABS, vb.h * 1.5 + 2));
  const w = Number(p.hbox.w), h = Number(p.hbox.h), dx = Number(p.hbox.dx) || 0, dy = Number(p.hbox.dy) || 0;
  let changed = false;
  if (!Number.isFinite(w) || w > maxW) { p.hbox.w = round(Number.isFinite(w) ? Math.min(w, maxW) : maxW, 1); changed = true; }
  if (!Number.isFinite(h) || h > maxH) { p.hbox.h = round(Number.isFinite(h) ? Math.min(h, maxH) : maxH, 1); changed = true; }
  if (Math.abs(dx) > maxW) { p.hbox.dx = round(clamp(dx, -maxW, maxW), 1); changed = true; }
  if (Math.abs(dy) > maxH) { p.hbox.dy = round(clamp(dy, -maxH, maxH), 1); changed = true; }
  if (changed) { p.hbBad = 'clamped'; syncHbFromBox(p); }
  return changed;
}
/* t32-B2：拖动缩放时以「起点框快照 × 一次比例」算新框（纯函数，便于自检）。
   旧实现用当前框反复乘增量比例，一次拖动会几何累乘。 */
function scaleHboxFromBase(hb0, f) {
  if (!hb0 || !(Number(hb0.w) > 0)) return null;
  const k = Number(f);
  if (!Number.isFinite(k)) return null;
  return {
    dx: round((Number(hb0.dx) || 0) * k, 1), dy: round((Number(hb0.dy) || 0) * k, 1),
    w: Math.max(4, round(Number(hb0.w) * k, 1)), h: Math.max(4, round(Number(hb0.h) * k, 1)),
  };
}
/* t30：一次性修复历史坏数据（返回修好的清单，供 toast/日志用）。p.hbBig 是用户显式声明的大点击区，不动。 */
function repairBadHitboxes(c) {
  const fixed = [];
  if (!c) return fixed;
  // t32-B1：已拆卸部位（c.detached）与 c.parts 结构相同、也同样会进导出与渲染，
  // 但 t30 只扫了 c.parts，Mincho「Head1_south」/ Ratkin「left ear」的 1e26 级坏框因此漏修。
  [].concat(c.parts || [], c.detached || []).forEach(p => {
    if (!p || !p.hbox || p.hbBig) return;
    if (!hitboxBadReason(p)) return;
    const vb = visBox(p);
    if (!(vb && vb.w > 0 && vb.h > 0)) return;
    const before = Math.round(Number(p.hbox.w) || 0) + '×' + Math.round(Number(p.hbox.h) || 0);
    if (isEyePart(p)) {   // t119：眼睛一律收回到标准框，不跟随可见区
      applyEyeHitbox(p, true);
      fixed.push({ name: partDisplayName(p), before: before, after: Math.round(p.hbox.w) + '×' + Math.round(p.hbox.h) });
      return;
    }
    // t32-B3：修复不再把中心写死成 (0,0)——沿用可见区中心，偏心部位修完不会错位
    //（与「设为可见框」按钮 visbox-to-hit 同口径）。
    p.hbox = {
      dx: round(Number(vb.dx) || 0, 1), dy: round(Number(vb.dy) || 0, 1),
      w: Math.max(1, round(vb.w, 1)), h: Math.max(1, round(vb.h, 1)),
    };
    delete p.hbBad;
    syncHbFromBox(p);
    fixed.push({ name: partDisplayName(p), before: before, after: Math.round(p.hbox.w) + '×' + Math.round(p.hbox.h) });
  });
  return fixed;
}
/* the anus is not drawn on the doll: the patch keeps it in a fixed little window */
function isWindowOnly(p) {
  return !!p && p.source === 'rjw' && p.rjw && (p.rjw.base === 'Anus' || p.rjw.base === 'OuterAnus');
}

/* outer skin layer (silhouette in x-ray view) vs. internal parts that stay lit */
function isOuterPart(p) {
  return p && p.kind !== 'organ' && p.kind !== 'bone';
}

function partsExtent(c) {
  if (!c) return null;
  // 大件装饰（长尾巴/翅膀那种 sx 很大的贴图）会把包围盒撑爆，导出时整只娃娃被缩小，
  // 所以先按画布参考框剔掉离群的超大件，只用主体算包围盒。
  const ref = c.bounds && c.bounds.w > 1 ? c.bounds : null;
  const quads = [];
  (c.parts || []).forEach(p => {
    if (p.raceOff || p.vis === false) return;
    if (isWindowOnly(p)) return;          // lives in the fixed window, not on the doll
    const q = quadOf(p);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    q.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    quads.push({ x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 });
  });
  if (!quads.length) return null;
  let use = quads;
  if (ref) {
    const big = quads.filter(q => q.w > ref.w * 1.35 || q.h > ref.h * 1.35);
    const rest = quads.filter(q => !big.includes(q));
    if (rest.length) use = rest;          // 只剩大件时才退而求其次
  }
  let ax0 = Infinity, ay0 = Infinity, ax1 = -Infinity, ay1 = -Infinity;
  use.forEach(q => { ax0 = Math.min(ax0, q.x0); ay0 = Math.min(ay0, q.y0); ax1 = Math.max(ax1, q.x1); ay1 = Math.max(ay1, q.y1); });
  return { x: ax0, y: ay0, w: Math.max(1, ax1 - ax0), h: Math.max(1, ay1 - ay0) };
}
function canvasBounds(c) {
  if (!c) return { x: -200, y: -500, w: 400, h: 1000 };
  const e = partsExtent(c);
  if (!e) return { x: c.bounds.x, y: c.bounds.y, w: c.bounds.w, h: c.bounds.h };
  const x0 = Math.min(c.bounds.x, e.x), y0 = Math.min(c.bounds.y, e.y);
  const x1 = Math.max(c.bounds.x + c.bounds.w, e.x + e.w), y1 = Math.max(c.bounds.y + c.bounds.h, e.y + e.h);
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}
function sortParts(list) {
  return list.slice().sort((a, b) => (a.extra || 0) - (b.extra || 0) ||
    (a.overHair || b.overHair
      ? ((a.overHair ? overLevelOf(a) : 9999) - (b.overHair ? overLevelOf(b) : 9999))
      : 0) ||
    (a.layer || 0) - (b.layer || 0));
}

/* 置顶重画的部位：按 overRank 排好，缺的补上序号（0,1,2…） */

/* 置顶重画里这是第几个（1 开始），以及总数 */

/* 置顶重画的“等级”：越大越靠上（老的 overRank 顺序值也兼容） */


function overLevelOf(p) {
  if (!p) return 1;
  if (Number.isFinite(p.overLevel)) return p.overLevel;
  if (Number.isFinite(p.overRank)) return p.overRank;
  return 1;
}

function overRankLabel(c, p) {
  if (!c || !p || !p.overHair) return '';
  return `等级 ${overLevelOf(p)} · 越大越靠上`;
}

function normalizeOverRanks(c) {
  if (!c) return;
  (c.parts || []).forEach(p => {
    if (!p.overHair) return;
    if (!Number.isFinite(p.overLevel)) {
      p.overLevel = Number.isFinite(p.overRank) ? p.overRank : 1;
    }
    delete p.overRank;
  });
}

/* 置顶等级 ±1：dir = -1 降级, +1 升级 */
function moveOverRank(c, p, dir) {
  if (!c || !p || !p.overHair) return false;
  const v = overLevelOf(p);
  const next = clamp(Math.round(v + dir), 0, 99);
  if (next === v) return false;
  p.overLevel = next;
  return true;
}

/* ==========================================================================
   RENDER: canvas list
   ========================================================================== */
function ensureCanvasGroups() {
  if (!Array.isArray(S.ui.cvGroups) || !S.ui.cvGroups.length) {
    S.ui.cvGroups = [{ id: 'default', name: 'Default' }, { id: 'alien', name: 'Alien race' }];
  }
  const ids = new Set(S.ui.cvGroups.map(g => g.id));
  // undefined = 还没归类过 → 默认体型进 Default，其余进 Alien race
  // null / '' = 用户主动设为“游离”，保留在未分组里
  S.canvases.forEach(c => {
    if (c.group === undefined) c.group = c.kind === 'default' ? 'default' : 'alien';
    if (c.group && !ids.has(c.group)) c.group = null;
  });
}

function canvasWarnLevel(c) {
  let lv = '';
  const bump = (sev) => {
    if (sev === 'red') lv = 'red';
    else if (sev === 'yellow' && lv !== 'red') lv = 'yellow';
    else if (sev === 'info' && !lv) lv = 'info';
  };
  try {
    baselineDiffs(c).forEach(d => bump(d.sev));
    canvasHealth(c).forEach(it => {
      if (it.ok) return;
      if (it.key === 'tex') bump('red');
      else if (it.key !== 'baseline') bump('yellow');
    });
  } catch (e) { }
  return lv;
}

function upperFirst(s) {
  s = String(s == null ? '' : s).trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formKeyword(c) {
  const raw = String((c && (c.form || c.bodytype)) || '').trim();
  if (!raw || raw === '*') return 'Form';
  const raceWords = (((c && c.race && (c.race.label || c.race.defName)) || '') + ' ' + ((c && c.race && c.race.defName) || ''))
    .toLowerCase().replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean);
  const drop = new Set(['body', 'small', 'medium', 'large', 'huge', 'mintchoco', 'race', 'form', 'naked']);
  const toks = raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
    .split(/\s+/).filter(Boolean)
    .filter(t => {
      const l = t.toLowerCase();
      if (drop.has(l)) return false;
      if (raceWords.includes(l)) return false;
      return true;
    });
  let out = toks.slice(-2).join(' ');
  if (!out) out = raw.split(/[_-\s]+/).filter(Boolean).slice(-1)[0] || 'Form';
  out = upperFirst(out);
  return out.length > 28 ? out.slice(0, 28).trim() : out;
}

function baseTitleOf(c) {
  const raw = String((c && (c.race && (c.race.label || c.race.defName))) || (c && c.title) || 'Canvas');
  return upperFirst(raw.split('·')[0].trim());
}

function normalizeCanvasNames() {
  let changed = 0;
  const byId = new Map((S.canvases || []).map(x => [x.id, x]));
  (S.canvases || []).forEach(c => {
    if (!c) return;
    const up = upperFirst(c.title || c.doll || 'Canvas');
    let title = up;
    // 老数据：标题里带「·」的形态画布，自动挂到同种族的原始画布下
    if (!c.parentId && String(c.title || '').indexOf('·') >= 0) {
      const raceKey = (c.race && (c.race.defName || c.race.label)) || '';
      const root = (S.canvases || []).find(x => x !== c && x.kind === 'race' && !x.parentId && !String(x.title || '').includes('·') && ((x.race && (x.race.defName || x.race.label)) || '') === raceKey);
      if (root) c.parentId = root.id;
    }
    // 已经改过名的老形态：用「原始画布名 + 空格」前缀再认一次
    if (!c.parentId) {
      const raceKey = (c.race && (c.race.defName || c.race.label)) || '';
      const root = (S.canvases || []).find(x => x !== c && x.kind === 'race' && !x.parentId && ((x.race && (x.race.defName || x.race.label)) || '') === raceKey && String(c.title || '').toLowerCase().startsWith(String(upperFirst(x.title)).toLowerCase() + ' '));
      if (root) c.parentId = root.id;
    }
    if (c.parentId || String(c.title || '').indexOf('·') >= 0) {
      let base = 'Canvas';
      if (c.parentId && byId.get(c.parentId)) base = baseTitleOf(byId.get(c.parentId));
      else base = baseTitleOf(c);
      title = upperFirst(base + ' ' + formKeyword(c));
    }
    if (title !== c.title) { c.title = title; changed++; }
  });
  return changed;
}

function cvItemHTML(c, childOf) {
  const on = c.id === S.active;
  const kind = c.kind === 'race' ? 'RACE' : c.kind === 'custom' ? 'NEW' : 'MOD';
  const wl = canvasWarnLevel(c);
  const kids = (S.canvases || []).filter(x => x.parentId === c.id);
  const open = !S.ui.linkOpen || S.ui.linkOpen[c.id] !== false;
  const linkRoot = c.parentId || c.id;
  const linkPalette = ['#49dfbc', '#5cc8ff', '#8f9cff', '#c98bff', '#6fe08a', '#ff7ab8', '#63d6d0', '#9be36f'];
  const linkColor = linkPalette[Math.abs(linkRoot.split('').reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)) % linkPalette.length];
  const linked = !!(c.parentId || kids.length);
  const hasMap = !!(Array.isArray(c.bodyAliases) && c.bodyAliases.length);
  return `<div class="cv-wrap${childOf ? ' cv-wrap--child' : ''}">
    <div class="cv${on ? ' is-on' : ''}${c.locked ? ' is-locked' : ''}${kids.length ? ' cv--parent' : ''}" data-act="canvas" data-id="${esc(c.id)}" draggable="true" title="${esc(c.title)}（右键更多操作）">
      ${kids.length ? `<button class="cv__fold${open ? ' is-open' : ''}" style="--lk:${linkColor}" data-act="cv-link-toggle" data-id="${esc(c.id)}" aria-expanded="${open ? 'true' : 'false'}" title="${open ? '收起' : '展开'} ${kids.length} 个关联形态">${icon('chev')}<b>${kids.length}</b></button>` : ''}
      ${wl ? `<span class="cv__warn cv__warn--${wl}" title="有需要检查的项目"></span>` : ''}
      <div class="cv__fig" data-mini="${esc(c.id)}"></div>
      <div class="cv__txt"><b>${c.locked ? '<span class="cv__lock">🔒</span>' : ''}${esc(c.title)}</b><i>${esc(c.doll)} · ${c.parts.length} 部位${c.rjw ? ' · RJW' : ''}</i></div>
      <div class="cv__tags${(linked || hasMap) ? ' has-marks' : ''}">
        <span class="cv__tag">${kind}</span>
        ${harHairOf(c) ? '<span class="cv__tag cv__tag--har" title="这个种族用 HAR 附加件头发（bodyAddon）">HAR</span>' : ''}
        ${(!harHairOf(c) && c.race) ? '<span class="cv__tag cv__tag--hairdef" title="这个种族用原版 HairDef 头发">HAIR</span>' : ''}
        ${(linked || hasMap) ? `<div class="cv__marks">${linked ? `<span class="cv__mark cv__mark--link" style="--lk:${linkColor}" title="关联画布">C</span>` : ''}${hasMap ? `<span class="cv__mark cv__mark--map" style="--lk:${linkColor}" title="有形态映射">M</span>` : ''}</div>` : ''}
      </div>
    </div>
    ${kids.length && open ? `<div class="cv-kids">${kids.map(k => cvItemHTML(k, true)).join('')}</div>` : ''}
  </div>`;
}

const TRASH_MAX = 20;

function trashInit() {
  if (!Array.isArray(S.trash)) S.trash = [];
  if (typeof S.ui.trashOpen !== 'boolean') S.ui.trashOpen = true;
}

function pushTrash(canvas, kind) {
  if (!canvas) return;
  trashInit();
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, '0'), mm = String(t.getMinutes()).padStart(2, '0');
  S.trash.unshift({
    id: 'tr' + Date.now().toString(36),
    kind: kind || '删除',
    time: hh + ':' + mm,
    ts: t.getTime(),
    canvas: JSON.parse(JSON.stringify(canvas)),
  });
  if (S.trash.length > TRASH_MAX) S.trash.length = TRASH_MAX;
}

function trashRestore(id) {
  if (S.preview) { S.preview = null; document.body.classList.remove('is-preview'); }
  trashInit();
  const idx = S.trash.findIndex(x => x.id === id);
  if (idx < 0) return;
  const item = S.trash[idx];
  const cv = item.canvas;
  const sameId = S.canvases.findIndex(x => x.id === cv.id);
  if (sameId >= 0) {
    // 原位还在（替换）→ 用旧版盖回去
    S.canvases[sameId] = JSON.parse(JSON.stringify(cv));
    S.active = cv.id;
  } else {
    S.canvases.push(JSON.parse(JSON.stringify(cv)));
    S.active = cv.id;
  }
  S.trash.splice(idx, 1);
  S.viewOnly = null;
  renderAll(); persist(); pushHistory();
  toast('已还原画布：' + (cv.title || '') + '（' + item.kind + '）');
}

function trashRow(item) {
  const cv = item.canvas || {};
  const tagCls = item.kind === '替换' ? 'is-replace' : 'is-delete';
  return `<div class="ctr" data-trid="${esc(item.id)}" data-act="trash-preview" title="点击只读预览；右键可还原">
      <div class="cv__fig ctr__fig" data-trm="${esc(item.id)}"></div>
      <div class="ctr__txt"><b>${esc(cv.title || '（无标题）')}</b>
        <i>${esc(cv.doll || '')} · ${(cv.parts || []).length} 部位 · ${esc(item.time)}</i></div>
      <span class="ctr__tag ${tagCls}">${esc(item.kind || '删除')}</span>
      <button class="cvg__x" data-act="trash-del" data-trid="${esc(item.id)}" title="从最近改动中移除">✕</button>
    </div>`;
}

function renderTrash() {
  const panel = document.querySelector('.panel--cvs');
  if (!panel) return;
  let box = document.getElementById('cvTrash');
  if (!box) {
    box = document.createElement('div');
    box.id = 'cvTrash';
    panel.appendChild(box);
  }
  box.innerHTML = '';
  trashInit();
  const wrap = document.createElement('div');
  wrap.className = 'ctrash' + (S.ui.trashOpen ? '' : ' is-shut');
  const rows = S.trash.length ? S.trash.map(trashRow).join('') : '<div class="ctrash__empty">还没有被替换或删除的画布</div>';
  wrap.innerHTML = `<div class="ctrash__h" data-act="trash-toggle">
      <span class="ctrash__chev">${S.ui.trashOpen ? '▾' : '▸'}</span><b>最近改动</b>
      <span class="ctrash__n">${S.trash.length}/${TRASH_MAX}</span>
    </div>
    <div class="ctrash__items">${rows}</div>`;
  box.appendChild(wrap);
  if (!S.ui.trashOpen) return;
  S.trash.forEach(item => {
    const fig = wrap.querySelector(`[data-trm="${CSS.escape(item.id)}"]`);
    if (fig) { try { paintMini(fig, item.canvas); } catch (e) { } }
  });
}

function renderCanvasList() {
  const box = $('#canvasList');
  ensureCanvasGroups();
  const coll = S.ui.cvCollapsed || (S.ui.cvCollapsed = {});
  const ids = new Set(S.ui.cvGroups.map(g => g.id));
  let html = '';
  S.ui.cvGroups.forEach(g => {
    const items = S.canvases.filter(c => (c.group || '') === g.id && !c.parentId);
    const shut = !!coll[g.id];
    html += `<div class="cvg">
      <div class="cvg__h" data-act="cv-group-toggle" data-gid="${esc(g.id)}">
        <span class="cvg__chev">${shut ? '▸' : '▾'}</span><b>${esc(g.name)}</b>
        <span class="cvg__n">${items.length}</span>
        <button class="cvg__x" data-act="cv-group-del" data-gid="${esc(g.id)}" title="删除分组">✕</button>
      </div>
      <div class="cvg__items${shut ? ' is-shut' : ''}" data-drop-group="${esc(g.id)}">${items.map(cvItemHTML).join('')}</div>
    </div>`;
  });
  const loose = S.canvases.filter(c => !c.group && !c.parentId);
  if (loose.length) {
    html += `<div class="cvg cvg--loose">
      <div class="cvg__h"><span class="cvg__chev">·</span><b>未分组</b><span class="cvg__n">${loose.length}</span>
        <span class="cvg__tip">拖到分组标题可归类</span></div>
      <div class="cvg__items" data-drop-group="">${loose.map(cvItemHTML).join('')}</div>
    </div>`;
  }
  html += `<button class="cvgadd" data-act="cv-group-add">＋ 新建分组</button>`;
  box.innerHTML = html;
  try { renderTrash(); } catch (e) { }

  $('#cvsCount').textContent = S.canvases.length;
  S.canvases.forEach(c => {
    const fig = box.querySelector(`[data-mini="${CSS.escape(c.id)}"]`);
    if (fig) paintMini(fig, c);
  });
  // 右键菜单（锁定 / 移动分组 / 删除）
  box.querySelectorAll('.cv').forEach(el => {
    el.addEventListener('contextmenu', ev => { ev.preventDefault(); openCvMenu(ev, el.dataset.id); });
  });
  try { bindCanvasDrag(); } catch (e) { }
  try { applyPanelCollapse(); } catch (e) { }
}

/* ---------- 画布分组：新建 / 删除 ---------- */
let cvGroupPending = null;
function cvGroupAdd() {
  const name = (window.prompt('新分组名称：', '新分组') || '').trim();
  if (!name) return;
  const id = 'g' + Date.now().toString(36);
  S.ui.cvGroups.push({ id, name });
  renderCanvasList(); persist(); pushHistory();
  toast('已新建分组：' + name);
}
function cvGroupDel(gid) {
  const g = (S.ui.cvGroups || []).find(x => x.id === gid);
  if (!g) return;
  const items = S.canvases.filter(c => c.group === gid);
  if (!items.length) {
    S.ui.cvGroups = S.ui.cvGroups.filter(x => x.id !== gid);
    renderCanvasList(); persist(); pushHistory();
    toast('已删除空分组：' + g.name);
    return;
  }
  cvGroupPending = gid;
  openModal(`<div style="width:min(430px,86vw)">
    <div class="modal__head"><span class="idx">GROUP</span><h3>删除分组「${esc(g.name)}」</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0">这个分组里还有 <b>${items.length}</b> 个画布。<br>
      • 选择「是」→ 连同这些画布一起删除（还会再确认一次）<br>
      • 选择「否」→ 只删分组，画布变成「未分组」保留下来</p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn" data-act="cv-group-del-no">否，保留画布</button>
      <button class="btn btn--danger" data-act="cv-group-del-yes">是，一起删除</button>
    </div></div>`);
}

/* ---------- 画布右键菜单 ---------- */
let cvMenuEl = null;
function closeCvMenu() { if (cvMenuEl) { cvMenuEl.remove(); cvMenuEl = null; } }

/* 默认体型画布恢复成 NHT 自带坐标：用最新的 bodytype 定义重建，保留 id / 标题 / 分组 */
function resetCanvasToBase(id) {
  const cv = S.canvases.find(x => x.id === id);
  if (!cv || cv.kind !== 'default') return;
  const fresh = baseCanvasFor(cv);
  if (!fresh) { toast('找不到这个体型的原始定义', true); return; }
  fresh.id = cv.id;
  fresh.title = cv.title;
  fresh.group = cv.group;
  fresh.locked = cv.locked;
  fresh.savedSig = canvasSig(fresh);
  const idx = S.canvases.indexOf(cv);
  S.canvases[idx] = fresh;
  if (S.active === cv.id) S.sel = null;
  renderAll(); persist(); pushHistory();
  toast('已恢复「' + (cv.title || '') + '」为 NHT 原始坐标（这张画布不会再导出补丁）');
}

let cvComboLeader = null;

function cvComboModal(leader) {
  if (!leader) return;
  cvComboLeader = leader.id;
  const candidates = (S.canvases || []).filter(x => x !== leader);
  const isAncestor = (maybeAncestor, node) => {
    let p = node && node.parentId;
    while (p) {
      if (p === maybeAncestor.id) return true;
      const n = (S.canvases || []).find(y => y.id === p);
      p = n && n.parentId;
    }
    return false;
  };
  openModal(`<div style="width:min(560px,94vw)">
    <div class="modal__head"><span class="idx">GROUP</span><h3>选择卡片成组合</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 8px">组长：<b>${esc(leader.title)}</b>（组长始终显示，不会被折叠）</p>
      <div class="cvcombo">
        ${candidates.map(x => {
          const blocked = isAncestor(x, leader);
          return `<label class="cvcombo__row${blocked ? ' is-off' : ''}"><input type="checkbox" data-combo="${esc(x.id)}" ${x.parentId === leader.id ? 'checked' : ''} ${blocked ? 'disabled' : ''}><b>${esc(x.title)}</b><span>${esc(x.doll)}</span>${blocked ? '<em>不能选为组员</em>' : ''}</label>`;
        }).join('') || '<p class="mini-note">没有其它画布</p>'}
      </div>
      <p class="mini-note" style="margin:8px 0 0">选中的卡片会成为组长的组员，默认折叠在组长下面。</p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--primary" data-act="cv-combo-do">组合</button>
    </div></div>`);
}

function cvComboDo() {
  const leader = (S.canvases || []).find(x => x.id === cvComboLeader);
  if (!leader) return;
  const ids = [...document.querySelectorAll('input[data-combo]:checked')].map(x => x.dataset.combo);
  leader.parentId = null;
  // 取消勾选的原组员：从组长下移出
  (S.canvases || []).forEach(c => {
    if (c && c.parentId === leader.id && !ids.includes(c.id)) c.parentId = null;
  });
  let n = 0;
  ids.forEach(id => {
    if (id === leader.id) return;
    const c = (S.canvases || []).find(x => x.id === id);
    if (!c) return;
    c.parentId = leader.id;
    n++;
  });
  if (!S.ui.linkOpen) S.ui.linkOpen = {};
  S.ui.linkOpen[leader.id] = false;   // 组员默认折叠
  try { closeModal(); } catch (e) { }
  renderAll();
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
  toast('已组合：' + leader.title + ' + ' + n + ' 个组员');
}

function openCvMenu(ev, id) {
  const c = S.canvases.find(x => x.id === id);
  if (!c) return;
  closeCvMenu();
  const groups = S.ui.cvGroups || [];
  const menu = document.createElement('div');
  menu.className = 'cvmenu';
  menu.innerHTML = `
    <button class="cvmenu__i${c.locked ? ' is-on' : ''}" data-cvm="lock"><span class="cvmenu__ico">${c.locked ? '🔒' : '🔓'}</span>${c.locked ? '解除锁定' : '锁定画布'}</button>
    <button class="cvmenu__i" data-cvm="combo">▣ 选择卡片成组合…</button>
    <div class="cvmenu__sep"></div>
    <div class="cvmenu__lbl">移动到分组</div>
    ${groups.map(g => `<button class="cvmenu__i${c.group === g.id ? ' is-on' : ''}" data-cvm="move" data-gid="${esc(g.id)}">${c.group === g.id ? '✓ ' : ''}${esc(g.name)}</button>`).join('')}
    ${c.group ? '<button class="cvmenu__i" data-cvm="move" data-gid="">移出分组（游离）</button>' : ''}
    <div class="cvmenu__sep"></div>
    ${c.kind === 'default' ? `<button class="cvmenu__i" data-cvm="reset-base" data-id="${esc(c.id)}" title="把这张画布恢复成 Nice Health Tab 自带的坐标（恢复后不会导出补丁）">↺ 恢复 NHT 原始坐标</button>` : `<button class="cvmenu__i cvmenu__i--danger" data-cvm="del">删除画布</button>`}
  `;
  document.body.appendChild(menu);
  const w = menu.offsetWidth, h = menu.offsetHeight;
  let x = ev.clientX, y = ev.clientY;
  if (x + w > innerWidth - 8) x = innerWidth - w - 8;
  if (y + h > innerHeight - 8) y = innerHeight - h - 8;
  menu.style.left = Math.max(8, x) + 'px';
  menu.style.top = Math.max(8, y) + 'px';
  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-cvm]');
    if (!b) return;
    e.stopPropagation();
    const act = b.dataset.cvm;
    if (act === 'reset-base') {
      const id = b.dataset.id || c.id;
      resetCanvasToBase(id);
      closeCvMenu();
      return;
    }
    if (act === 'lock') {
      if (c.locked) { c.locked = false; toast('已解除锁定'); }
      else { c.locked = true; toast('已锁定画布'); }
      closeCvMenu(); renderAll(); persist(); pushHistory();
    } else if (act === 'combo') {
      closeCvMenu();
      cvComboModal(c);
    } else if (act === 'move') {
      const gid = b.dataset.gid || '';
      if (gid) c.group = gid; else c.group = null;
      closeCvMenu(); renderCanvasList(); persist(); pushHistory();
      const g = (S.ui.cvGroups || []).find(x => x.id === gid);
      toast(g ? `已移动到「${g.name}」` : '已移出分组');
    } else if (act === 'del') {
      closeCvMenu();
      if (c.locked) { toast('画布已锁定，先解锁再删除', true); return; }
      modalConfirm('删除画布', `确认删除「${c.title}」？该画布上的 ${c.parts.length} 个部位会一起移除（可撤销）。`, 'del-canvas-ok', c.id);
    }
  });
  cvMenuEl = menu;
}
document.addEventListener('click', () => closeCvMenu());
document.addEventListener('contextmenu', e => { if (!e.target.closest('.cv')) closeCvMenu(); });

/* 画布列表拖动排序 */
let cvDragId = null;
function bindCanvasDrag() {
  const box = document.getElementById('canvasList');
  if (!box) return;
  box.querySelectorAll('img').forEach(i => { i.draggable = false; });
  box.querySelectorAll('[data-drop-group]').forEach(zone => {
    zone.addEventListener('dragover', ev => {
      if (!cvDragId) return;
      ev.preventDefault(); zone.classList.add('is-drop');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-drop'));
    zone.addEventListener('drop', ev => {
      ev.preventDefault(); zone.classList.remove('is-drop');
      const from = cvDragId; if (!from) return;
      const moved = S.canvases.find(c => c.id === from); if (!moved) return;
      const gid = zone.dataset.dropGroup || '';
      if (gid) moved.group = gid; else moved.group = null;
      renderCanvasList(); persist(); pushHistory();
      const g = (S.ui.cvGroups || []).find(x => x.id === gid);
      toast(g ? `已移动到「${g.name}」` : '已移出分组');
    });
  });
  box.querySelectorAll('.cv').forEach(el => {
    el.draggable = true;
    el.addEventListener('dragstart', ev => {
      cvDragId = el.dataset.id;
      try { window.getSelection().removeAllRanges(); } catch (e) { }
      el.classList.add('is-dragging');
      try { ev.dataTransfer.setData('text/plain', cvDragId); ev.dataTransfer.effectAllowed = 'move'; } catch (e) { }
    });
    el.addEventListener('dragend', () => {
      cvDragId = null;
      box.querySelectorAll('.cv').forEach(x => x.classList.remove('is-dragging', 'is-over'));
    });
    el.addEventListener('dragover', ev => {
      if (!cvDragId || el.dataset.id === cvDragId) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      el.classList.add('is-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('is-over'));
    el.addEventListener('drop', ev => {
      ev.preventDefault();
      el.classList.remove('is-over');
      const from = cvDragId, to = el.dataset.id;
      if (!from || !to || from === to) return;
      const i = S.canvases.findIndex(c => c.id === from);
      const j = S.canvases.findIndex(c => c.id === to);
      if (i < 0 || j < 0) return;
      const [moved] = S.canvases.splice(i, 1);
      const tgt = S.canvases[Math.min(j, S.canvases.length - 1)];
      const wantGroup = tgt ? tgt.group : undefined;
      moved.group = wantGroup || null;   // 跨分组拖动（拖到未分组则游离）
      S.canvases.splice(j, 0, moved);      // 放到目标位置
      renderCanvasList();
      persist(); pushHistory();
      toast(`已调整画布顺序：${moved.title}`);
    });
  });
}

function paintMini(box, c) {
  const W = box.clientWidth || 40, H = box.clientHeight || 52;
  const mini = document.createElement('div');
  mini.className = 'mini';
  if (!c.parts.length) {
    const d = document.createElement('div');
    d.style.cssText = 'transform:translate(-50%,-50%);width:14px;height:14px;color:#39423f';
    d.innerHTML = icon('plus');
    mini.appendChild(d);
    box.appendChild(mini);
    return;
  }
  const b = canvasBounds(c);
  const k = Math.min((W - 8) / b.w, (H - 8) / b.h);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  sortParts(c.parts.filter(p => p.vis !== false && p.img)).forEach(p => {
    const [w, h] = imgDim(p.img);
    const d = document.createElement('div');
    d.style.width = Math.max(0.5, w * p.sx * k) + 'px';
    d.style.height = Math.max(0.5, h * p.sy * k) + 'px';
    d.style.transform = `translate(-50%,-50%) translate(${(p.x - cx) * k}px,${(p.y - cy) * k}px) rotate(${p.rot || 0}deg)`;
    const im = document.createElement('img');
    im.src = imgURL(p.img);
    im.style.transform = stagePartFlip(p) ? 'scaleX(-1)' : '';
    d.appendChild(im);
    if (p.state === 'missing') d.style.opacity = '.35';
    mini.appendChild(d);
  });
  box.appendChild(mini);
}

/* ==========================================================================
   RENDER: part tree
   ========================================================================== */
const KGROUPS = [
  { k: 'body', label: '外形', icon: 'body' },
  { k: 'deco', label: '装饰', icon: 'dna' },
  { k: 'bone', label: '骨骼', mask: 'HediffTab/Common/BoneIcon' },
  { k: 'organ', label: '器官', mask: 'HediffTab/Common/OrganIcon' },
  { k: 'eye', label: '眼睛', mask: 'HediffTab/Common/EyeIcon' },
  { k: 'rjw', label: 'RJW', tag: 'RJW' }
];
/* NHT doll parts address the pawn's body by index: 0..63 is the vanilla human body
   (same order NHT bakes into its own dolls). Races with their own BodyDef inject their
   own list; anything without a body part is decoration (-1). */
const HUMAN_PARTS = [
  [0, '躯干 Torso'], [1, '胸腔 Ribcage'], [2, '胸骨 Sternum'], [3, '骨盆 Pelvis'], [4, '脊柱 Spine'],
  [5, '胃 Stomach'], [6, '心脏 Heart'],
  // paired organs: NHT's own dolls use right-then-left here (FemaleLungRight = 7 …)
  [7, '右肺 Right lung'], [8, '左肺 Left lung'],
  [9, '右肾 Right kidney'], [10, '左肾 Left kidney'], [11, '肝 Liver'],
  [12, '颈部 Neck'], [13, '头部 Head'], [14, '颅骨 Skull'], [15, '脑 Brain'],
  [16, '左眼 Left eye'], [17, '右眼 Right eye'], [18, '左耳 Left ear'], [19, '右耳 Right ear'],
  [20, '鼻 Nose'], [21, '下颌 Jaw'], [22, '舌 Tongue'],
  // limbs: NHT puts the RIGHT side first (FemaleShoulderLeft = 34, FemaleLegLeft = 55 …)
  [23, '右肩 Right shoulder'], [24, '右锁骨 Right clavicle'], [25, '右臂 Right arm'],
  [26, '右肱骨 Right humerus'], [27, '右桡骨 Right radius'], [28, '右手 Right hand'],
  [29, '右小指 Right pinky'], [30, '右无名指 Right ring finger'], [31, '右中指 Right middle finger'],
  [32, '右食指 Right index finger'], [33, '右拇指 Right thumb'],
  [34, '左肩 Left shoulder'], [35, '左锁骨 Left clavicle'], [36, '左臂 Left arm'],
  [37, '左肱骨 Left humerus'], [38, '左桡骨 Left radius'], [39, '左手 Left hand'],
  [40, '左小指 Left pinky'], [41, '左无名指 Left ring finger'], [42, '左中指 Left middle finger'],
  [43, '左食指 Left index finger'], [44, '左拇指 Left thumb'],
  [45, '装备槽 Utility slot'], [46, '右腿 Right leg'], [47, '右股骨 Right femur'], [48, '右胫骨 Right tibia'],
  [49, '右脚 Right foot'], [50, '右小趾 Right little toe'], [51, '右第四趾 Right fourth toe'],
  [52, '右中趾 Right middle toe'], [53, '右第二趾 Right second toe'], [54, '右大趾 Right big toe'],
  [55, '左腿 Left leg'], [56, '左股骨 Left femur'], [57, '左胫骨 Left tibia'],
  [58, '左脚 Left foot'], [59, '左小趾 Left little toe'], [60, '左第四趾 Left fourth toe'],
  [61, '左中趾 Left middle toe'], [62, '左第二趾 Left second toe'], [63, '左大趾 Left big toe'],
];

const HUMAN_SLOTS = [
  ["Torso",""], ["Ribcage",""], ["Sternum",""], ["Pelvis",""], ["Spine",""], ["Stomach",""], ["Heart",""], ["Lung","left lung"], ["Lung","right lung"], ["Kidney","left kidney"], ["Kidney","right kidney"], ["Liver",""], ["Neck",""], ["Head",""], ["Skull",""], ["Brain",""], ["Eye","left eye"], ["Eye","right eye"], ["Ear","left ear"], ["Ear","right ear"], ["Nose",""], ["Jaw",""], ["Tongue",""], ["Shoulder","left shoulder"], ["Clavicle","left clavicle"], ["Arm","left arm"], ["Humerus","left humerus"], ["Radius","left radius"], ["Hand","left hand"], ["Finger","left pinky"], ["Finger","left ring finger"], ["Finger","left middle finger"], ["Finger","left index finger"], ["Finger","left thumb"], ["Shoulder","right shoulder"], ["Clavicle","right clavicle"], ["Arm","right arm"], ["Humerus","right humerus"], ["Radius","right radius"], ["Hand","right hand"], ["Finger","right pinky"], ["Finger","right ring finger"], ["Finger","right middle finger"], ["Finger","right index finger"], ["Finger","right thumb"], ["Waist",""], ["Leg","left leg"], ["Femur","left femur"], ["Tibia","left tibia"], ["Foot","left foot"], ["Toe","left little toe"], ["Toe","left fourth toe"], ["Toe","left middle toe"], ["Toe","left second toe"], ["Toe","left big toe"], ["Leg","right leg"], ["Femur","right femur"], ["Tibia","right tibia"], ["Foot","right foot"], ["Toe","right little toe"], ["Toe","right fourth toe"], ["Toe","right middle toe"], ["Toe","right second toe"], ["Toe","right big toe"]
];

/* a race body has parts the human body lacks (wings, halo, tail). Those get spare slots
   starting at 64; the injector mod maps 64+ back onto the race's own BodyPartRecord. */
function humanSlotIndex(def, label) {
  const d = String(def || ''), l = String(label || '');
  for (let i = 0; i < HUMAN_SLOTS.length; i++) {
    if (HUMAN_SLOTS[i][0] === d && HUMAN_SLOTS[i][1].toLowerCase() === l.toLowerCase()) return i;
  }
  return -1;
}


/* 种族身体下标 → NHT 槽位下标：人类布局里的部位按顺序对齐，剩余的自定义部位从 64 起 */
function nhtSlotMap(c) {
  const race = (c && c.race) || {};
  const parts = Array.isArray(race.bodyParts) ? race.bodyParts : null;
  if (!parts || !parts.length) return null;
  const used = new Set();
  const map = new Map();
  // HUMAN_SLOTS 是 [def, label]（下标就是 NHT 槽位）
  const slots = HUMAN_SLOTS.map(([def, label], idx) => ({ i: idx, def: String(def).toLowerCase(), label: String(label || '').toLowerCase() }));
  let extra = 64;
  parts.slice().sort((a, b) => Number(a.i) - Number(b.i)).forEach(pt => {
    const def = String(pt.def || '').toLowerCase();
    const lab = String(pt.label || '').toLowerCase();
    const hit = slots.find(sl => !used.has(sl.i) && sl.def === def && (!sl.label || sl.label === lab))
             || slots.find(sl => !used.has(sl.i) && sl.def === def);
    if (hit) { used.add(hit.i); map.set(Number(pt.i), hit.i); }
    else map.set(Number(pt.i), extra++);
  });
  return map;
}

/* 一次性把画布迁到 NHT 槽位（幂等：迁过就不再动） */
function migrateRaceBids(c) {
  const race = (c && c.race) || {};
  if (race.nhtIndexed) return 0;
  const map = nhtSlotMap(c);
  if (!map) return 0;
  let n = 0;
  (c.parts || []).forEach(p => {
    const bid = Number(p.bid);
    if (!Number.isFinite(bid) || bid < 0) return;
    if (map.has(bid)) { if (map.get(bid) !== bid) { p.bid = map.get(bid); n++; } }
  });
  // 部位表也换成槽位下标
  if (Array.isArray(race.bodyParts)) {
    race.bodyParts = race.bodyParts.map(x => ({ ...x, i: map.has(Number(x.i)) ? map.get(Number(x.i)) : x.i }))
      .sort((a, b) => Number(a.i) - Number(b.i));
  }
  race.nhtIndexed = true;
  return n;
}


/* ---- 真实部位对照表（模组写出的 body-map.json） ---- */
let BODY_MAP = null;
async function loadBodyMap(force, bodyDef) {
  if (BODY_MAP && !force) return BODY_MAP;
  const c = activeCanvas();
  const want = bodyDef || (c && c.race && c.race.bodyDef) || '';
  const tries = [];
  if (want) tries.push('body-map-' + want + '.json');
  tries.push('body-map.json');
  BODY_MAP = null;
  for (const url of tries) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      if (!j || !Array.isArray(j.pairs)) continue;
      if (want && j.body && j.body !== want) continue;   // 不是这个身体的表
      BODY_MAP = j; break;
    } catch (e) { }
  }
  return BODY_MAP;
}

/* 中文标签里取英文部位名：'左耳 Left ear' -> 'ear' */
function defFromLabel(label) {
  const m = String(label || '').match(/[A-Za-z][A-Za-z _]*$/);
  if (!m) return '';
  return m[0].trim().toLowerCase().replace(/^(left|right)\s+/, '').replace(/\s+/g, '_');
}

/* 按对照表把“身体下标”改成“NHT 槽位”，已经是槽位的保持不动 */
function fixBidsWithMap(c, map) {
  if (!c || !map || !Array.isArray(map.pairs)) return { changed: 0, fixed: [] };
  const pairs = map.pairs;
  const bodyToNht = new Map(pairs.map(p => [Number(p.body), p]));
  const nhtSet = new Set(pairs.map(p => Number(p.nht)));
  const defAtBody = b => String((bodyToNht.get(b) || {}).def || '').toLowerCase();
  let changed = 0; const fixed = [];
  (c.parts || []).forEach(p => {
    const bid = Number(p.bid);
    if (!Number.isFinite(bid) || bid < 0) return;
    if (nhtSet.has(bid)) return;                        // 已经是 NHT 槽位 → 不再二次映射
    const pair = bodyToNht.get(bid);
    if (!pair) return;                                  // 不是身体下标 → 当作已是槽位
    const want = defFromLabel(p.name) || String(p.id || '').toLowerCase();
    const hit = String(pair.def || '').toLowerCase();
    if (!want || !hit) return;                                          // 名字里没有英文部位名 → 不敢改
    if (want !== hit && !hit.startsWith(want) && !want.startsWith(hit)) return;   // 名字对不上 → 别动
    if (Number(pair.nht) === bid) return;
    p.bid = Number(pair.nht);
    changed++; fixed.push(`${p.name}→${pair.nht}`);
  });
  return { changed, fixed };
}


/* 自动修正：body-map 一旦加载成功，就把所有同 BodyDef 的种族画布按它校正一次 */
function autoFixBodyMap() {
  if (!BODY_MAP || !Array.isArray(BODY_MAP.pairs) || !BODY_MAP.pairs.length) return;
  let total = 0;
  try {
    (S.canvases || []).forEach(c => {
      if (!c || c.kind !== 'race' || !c.race) return;
      const bd = String(c.race.bodyDef || '');
      if (BODY_MAP.body && bd && BODY_MAP.body !== bd) return;
      const r = fixBidsWithMap(c, BODY_MAP);
      if (r && r.changed) total += r.changed;
    });
  } catch (e) { }
  if (total > 0) {
    try { renderAll(); } catch (e) { }
    try { persist(); } catch (e) { }
    toast(`已按 body-map 自动修正 ${total} 个部位编号`);
  }
}

/* 手动选择 body-map.json（file:// 打开时的兜底） */
function pickBodyMapFile() {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (!f) { resolve(null); return; }
      const fr = new FileReader();
      fr.onload = () => {
        try { const j = JSON.parse(String(fr.result)); resolve(j && Array.isArray(j.pairs) ? j : null); }
        catch (e) { resolve(null); }
      };
      fr.onerror = () => resolve(null);
      fr.readAsText(f);
    });
    inp.click();
  });
}


/* 把游戏写出的对照表同步成画布的部位表（新增的 64+ 部位也能选到） */
/* 重新选择种族模组文件夹，重新解析并保存部位表 */
function pickRaceModFolder() {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.webkitdirectory = true;
    inp.multiple = true;
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', () => {
      const files = inp.files;
      inp.remove();
      resolve(files && files.length ? files : null);
    });
    inp.click();
  });
}

async function reimportRaceBodyParts(c) {
  if (!c || !c.race) return;
  const files = await pickRaceModFolder();
  if (!files) return;
  let res = null;
  try { res = await parseRaceMod(files); } catch (e) { toast('解析种族模组失败：' + e.message, true); return; }
  if (!res || !res.race) { toast('没有解析到种族定义', true); return; }
  const race = c.race;
  const old = (race.bodyParts || []).length;
  const src = res.race;
  if (Array.isArray(src.bodyDefs) && src.bodyDefs.length) race.bodyDefs = src.bodyDefs;
  if (Array.isArray(src.bodyTypes) && src.bodyTypes.length) race.bodyTypes = src.bodyTypes;
  if (src.bodyDef) race.bodyDef = src.bodyDef;
  race.bodyParts = [];
  race.remap = null;
  race.remapSrc = '';
  const defs = Array.isArray(race.bodyDefs) ? race.bodyDefs : [];
  const bd = String(race.bodyDef || '');
  const cur = defs.find(d => d && d.defName === bd) || defs[0];
  if (cur && Array.isArray(cur.parts) && cur.parts.length) {
    race.bodyParts = cur.parts.map(p => ({
      i: Number(p.i),
      def: String(p.def || ''),
      label: String(p.label || p.def || ''),
      src: 'race-mod'
    })).sort((a, b) => a.i - b.i);
  }
  try { persist(); } catch (e) { }
  try { renderAll(); } catch (e) { }
  toast(race.bodyParts.length
    ? `已从模组文件夹重新导入部位表 ${race.bodyParts.length} 项（旧表 ${old} 项）`
    : '模组里没有找到当前 BodyDef 的部位', !race.bodyParts.length);
}

/* 清空旧表，从种族 BodyDef 的 parts 重新生成（最初有效的版本） */
async function rebuildBodyParts(c) {
  if (!c || !c.race) return;
  const race = c.race;
  const old = (race.bodyParts || []).length;
  race.bodyParts = [];
  race.remap = null;
  race.remapSrc = '';
  const defs = Array.isArray(race.bodyDefs) ? race.bodyDefs : [];
  const bd = String(race.bodyDef || '');
  const cur = defs.find(d => d && d.defName === bd) || defs[0];
  if (cur && Array.isArray(cur.parts) && cur.parts.length) {
    race.bodyParts = cur.parts.map(p => ({
      i: Number(p.i),
      def: String(p.def || ''),
      label: String(p.label || p.def || ''),
      src: 'race-def'
    })).sort((a, b) => a.i - b.i);
  }
  try { persist(); } catch (e) { }
  try { renderAll(); } catch (e) { }
  toast(race.bodyParts.length
    ? `已按种族 BodyDef 重建部位表 ${race.bodyParts.length} 项（旧表 ${old} 项）`
    : '当前画布没有可用的种族 BodyDef 部位', !race.bodyParts.length);
}

async function syncBodyPartsFromGame() {
  const c = activeCanvas();
  if (!c || !c.race) { toast('先切到种族画布', true); return; }
  let map = await loadBodyMap(true, c.race.bodyDef);
  if (!map && !LOCAL_HTTP) map = await pickBodyMapFile();
  if (!map || !Array.isArray(map.pairs) || !map.pairs.length) {
    toast('没找到对照表：先在游戏里打开一次这个种族的小人（会生成 body-map 文件）', true);
    return;
  }
  if (map.body && c.race.bodyDef && map.body !== c.race.bodyDef) {
    toast('对照表是 ' + map.body + ' 的，当前画布是 ' + c.race.bodyDef, true);
    return;
  }
  const src = map.pairs
    .map(pr => ({ i: Number(pr.body), nht: Number(pr.nht), def: String(pr.def || '?'), label: String(pr.def || '?') }))
    .filter(x => Number.isFinite(x.i))
    .sort((a, b) => a.i - b.i);
  if (!src.length) { toast('对照表是空的', true); return; }
  const oldByIndex = new Map((c.race.bodyParts || []).map(x => [Number(x.i), x]));
  const added = src.filter(x => !oldByIndex.has(x.i)).map(x => '#' + x.i + ' ' + x.def);
  c.race.bodyParts = src.map(x => ({ ...x, src: c.race.modName || '模组' }));
  c.race.nhtIndexed = true;
  renderInspector(); renderStage();
  toast(added.length
    ? `已同步 ${src.length} 个部位，新增：${added.slice(0, 5).join('、')}${added.length > 5 ? ' …' : ''}`
    : `已同步 ${src.length} 个部位（没有新增）`);
}

async function applyBodyMapFix() {
  const c = activeCanvas();
  if (!c) return;
  let map = await loadBodyMap(true);
  if (!map && !LOCAL_HTTP) {
    // 直接双击 html 打开时 fetch 读不到同目录文件 → 让用户选一次
    map = await pickBodyMapFile();
  }
  if (!map) {
    // 没有游戏写出的精确对照表时，退回“人类布局对齐”规则尝试修正
    const n0 = autoAlignRaceBids(c);
    renderStage(); renderInspector(); renderTree(); pushHistory();
    toast(n0 ? ('没有对照表，已按布局规则修正 ' + n0 + ' 个部位')
             : '没有对照表，布局规则也没发现需要修正的部位', !n0);
    return;
  }
  if (map.body && c.race && c.race.bodyDef && map.body !== c.race.bodyDef) {
    toast(`对照表是 ${map.body} 的，当前画布是 ${c.race.bodyDef}，先打开对应种族`, true);
    return;
  }
  const r = fixBidsWithMap(c, map);
  renderStage(); renderInspector(); renderTree(); pushHistory();
  toast(r.changed ? `已按对照表修正 ${r.changed} 个部位：${r.fixed.slice(0, 4).join('、')}`
                  : '对照表检查完毕，没有需要修正的部位');
}

function exportBid(c, p) {
  if (c && c.race && c.race.nhtIndexed) return p.bid;   // 已迁到 NHT 槽位，直接用
  const off = officialBidFor(p.id);
  if (off != null) return off;
  const slot = raceSlotFor(c, p.bid);
  if (slot != null) return slot;
  return p.bid;
}

function bodyPartList(c) {
  const race = (c && c.race) || {};
  const tag = race.modName || '模组';
  const rp = Array.isArray(race.bodyParts) ? race.bodyParts : null;
  if (rp && rp.length) {
    // bodyParts 的 i 是种族 BodyDef 下标；下拉框/部位标签要的是 NHT 槽位。
    // 有 nht 就直接用，没有就按 raceBodyRemap 反查（NHT 槽位 ← 种族下标）。
    const inv = new Map();
    try {
      (raceBodyRemap(c) || []).forEach(([nht, body]) => {
        const b = Number(body), n = Number(nht);
        if (!inv.has(b)) inv.set(b, n);
      });
    } catch (e) { }
    return rp.map(x => {
      const body = Number(x.i);
      const nht = (x.nht != null) ? Number(x.nht) : (inv.has(body) ? inv.get(body) : body);
      return [nht, `${x.label || x.def} ${x.def}`, x.src || tag];
    }).sort((a, b) => a[0] - b[0]);
  }
  // 没有存过部位表：用导入时记下的 BodyDef（优先当前身体）
  const defs = Array.isArray(race.bodyDefs) ? race.bodyDefs : null;
  const bdName = String(race.bodyDef || '');
  // 只有“本画布真的用自己的 BodyDef”时才列它的部位：
  // 否则（body=Human / 空）会错误地列出模组里机械体那套 17 个部位
  if (defs && defs.length && bdName && !/^human$/i.test(bdName)) {
    const cur = defs.find(d => d.defName === bdName);
    if (cur && cur.parts && cur.parts.length) {
      return cur.parts.map(x => [x.i, `${x.label || x.def} ${x.def}`, tag]);
    }
  }
  return HUMAN_PARTS.map(([i, t]) => [i, t, '默认']);
}

/* what the 部位 button shows for a given id */
function bidLabel(c, bid) {
  if (bid == null || bid < 0) return '— 装饰（不参与受伤）';
  const hit = bodyPartList(c).find(([i]) => i === bid);
  if (hit) return `#${bid} ${hit[1]}`;
  // 画布上有些部位存的是种族 BodyDef 下标而不是 NHT 槽位（Moyo 的尾巴 id=63）
  const bp = (c && c.race && Array.isArray(c.race.bodyParts)) ? c.race.bodyParts : [];
  const bodyHit = bp.find(x => Number(x.i) === Number(bid));
  if (bodyHit) return `#${bid} ${bodyHit.label || bodyHit.def} ${bodyHit.def || ''}`.trim();
  return `#${bid}（无此部位）`;
}

/* bodyPartId -> the defName this doll already ships for that part (export becomes Replace) */
function origDefsByBid(c) {
  const m = new Map();
  if (!c || !c.doll) return m;
  D.bodytypes.filter(b => b.doll === c.doll).forEach(b => (b.parts || []).forEach(p => {
    if (p.bid != null && p.bid >= 0 && !m.has(p.bid)) m.set(p.bid, p.id);
  }));
  return m;
}

/* ASCII part name out of a label like "左耳 Left ear" -> "LeftEar" */
function asciiWords(label) {
  const ascii = String(label || '').replace(/[^\x20-\x7E]+/g, ' ').trim();
  return ascii.split(/\s+/).filter(Boolean)
    .map(w => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/* a valid, unique defName for this part: the mod's own name when it has one, else Doll+Part */

/* RimWorld 要求 defName 只能是字母/数字/下划线/短横线：统一净化 */
function safeDefName(str, fallback) {
  let out = String(str == null ? '' : str).trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!out) out = String(fallback || 'Part');
  if (!/^[A-Za-z_]/.test(out)) out = 'P_' + out;
  return out;
}


/* 名字转 ASCII：拉丁字母/数字保留，中文等转成 uXXXX，保证稳定且唯一 */
function defNameSlug(name) {
  return String(name == null ? '' : name).replace(/[^\x00-\x7F]/g, ch => {
    const cp = ch.codePointAt(0);
    return 'u' + cp.toString(16);
  });
}

/* 部位 defName：官方部位沿用模组的名字，其余自动=种族名+部位名（只读展示） */
function partDefName(c, p) {
  if (!c || !p) return '';
  try {
    const orig = origDefsByBid(c).get(p.bid);
    if (orig) return orig;
    if (p.id && originalDefs(c.doll).has(p.id)) return p.id;
  } catch (e) { }
  const head = String(c.doll || c.title || 'Doll');
  const body = defNameSlug(p.name || 'Part');
  let base = safeDefName(head + '_' + body, 'Part');
  // 同一张画布里重名 → 加序号（按部件顺序稳定）
  try {
    const taken = new Set(
      (c.parts || []).filter(x => x !== p).map(x => safeDefName(head + '_' + defNameSlug(x.name || 'Part'), 'Part'))
    );
    try { (c.detached || []).forEach(x => taken.add(safeDefName(head + '_' + defNameSlug(x.name || x.id || 'Part'), 'Part'))); } catch (e) { }
    if (taken.has(base)) {
      let n = 2;
      while (taken.has(base + '_' + n)) n++;
      base = base + '_' + n;
    }
  } catch (e) { }
  return base;
}
function applyAutoPartId(c, p) {
  if (!c || !p) return;
  try {
    if (origDefsByBid(c).get(p.bid)) return;                 // 官方部位保留
    if (p.id && originalDefs(c.doll).has(p.id)) return;      // 模组已有的 defName 保留
  } catch (e) { }
  p.id = partDefName(c, p);
}

function defNameFor(c, bid, self) {
  const orig = origDefsByBid(c).get(bid);
  if (orig) return orig;
  if (bid == null || bid < 0) return null;
  const hit = bodyPartList(c).find(([i]) => i === bid);
  const head = String(c.doll || 'Doll').replace(/[^A-Za-z0-9]/g, '') || 'Doll';
  const tail = (hit && asciiWords(hit[1])) || 'Part';
  const base = safeDefName(head + tail, 'Part');
  let name = base, n = 2;
  while (c.parts.some(x => x !== self && x.id === name)) name = base + '_' + (n++);
  return name;
}

/* searchable body-part picker (forWindow = the hand / foot window part instead of a doll part) */
let bidPickFor = 'part';
function openBidPicker(forWindow) {
  const c = activeCanvas();
  const p = selPart();
  const wp = forWindow && S.winSel ? winParts(S.winSel.win, c).find(x => x.key === S.winSel.key) : null;
  if (!c || !(p || wp)) return;
  bidPickFor = forWindow ? 'window' : 'part';
  const list = bodyPartList(c);
  const orig = origDefsByBid(c);
  const cur = forWindow ? wp.bid : p.bid;
  openModal(`
    <div class="bidpick">
      <div class="modal__head"><span class="idx">PART</span><h3>选择部位</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
      <div class="bidpick__search">${icon('search')}<input class="inp inp--txt" id="bidSearch" placeholder="搜索：耳朵 / ear / 翅膀 / wing / #18" spellcheck="false" autocomplete="off"></div>
      <div class="bidpick__list" id="bidList">${bidRows(list, cur, '', orig, c)}</div>
      <div class="modal__foot"><span class="mini-note" style="margin:0">共 ${list.length} 个部位${orig.size ? ` · 带 defName 的选择会替换模组原部位` : ''} · 标签=部位来源（默认 / 模组名）· 装饰不需要绑定，导出后游戏按 #0 躯干绘制</span><button class="btn" data-act="close-modal">取消</button></div>
    </div>`);
  setTimeout(() => { const i = $('#bidSearch'); if (i) i.focus(); }, 30);
}


/* 当前画布/种族真正拥有的 bodyPartId 集合；null = 无法判断 */
function canvasBodyIdx(c) {
  const race = (c && c.race) || {};
  const rp = Array.isArray(race.bodyParts) ? race.bodyParts : null;
  if (rp && rp.length) return new Set(rp.map(x => Number(x.i)));
  const defs = Array.isArray(race.bodyDefs) ? race.bodyDefs : null;
  const bdName0 = String(race.bodyDef || '');
  if (defs && defs.length && bdName0 && !/^human$/i.test(bdName0)) {
    const cur = defs.find(d => d.defName === bdName0);
    if (cur && cur.parts && cur.parts.length) return new Set(cur.parts.map(x => Number(x.i)));
  }
  const bd = String(race.bodyDef || '');
  if (bd && !/^human$/i.test(bd)) return null;      // 有自定义身体但没记录部位 → 未知
  return null;
}

/* 这个部位在当前身体里存在吗（false = 慎用） */
function bidRisky(c, bid) {
  if (bid == null || bid < 0) return false;
  const set = canvasBodyIdx(c);
  if (set) return !set.has(Number(bid));
  const bd = String((c && c.race && c.race.bodyDef) || '');
  // 身体不是原版 Human、又没有部位表：只把“头面部细节”标成慎用（耳朵/眼睛/鼻/下颌/舌），
  // 躯干四肢这类基本部位不动，免得整页都是慎用
  if (bd && !/^human$/i.test(bd)) return bid === 18 || bid === 19;   // 只点出“耳朵”这类最容易踩坑的
  return false;
}


/* 「慎用」的原因说明（悬停提示用） */
function bidRiskyWhy(c, bid) {
  if (bid == null || bid < 0) return '';
  const race = (c && c.race) || {};
  const mod = race.modName || '这个模组';
  const body = race.bodyDef || '未知身体';
  const set = canvasBodyIdx(c);
  const name = (() => {
    const hit = bodyPartList(c).find(([i]) => Number(i) === Number(bid));
    return hit ? hit[1] : `#${bid}`;
  })();

  if (set && !set.has(Number(bid))) {
    return `「${mod}」的身体定义（${body}）里没有 ${name} 这一项。`
      + `选了它：不参与受伤、游戏里也可能不显示（编辑器能画出来，但 NHT 找不到挂载点）。`
      + `建议改选列表里存在的部位。`;
  }
  if (bid === 18 || bid === 19) {
    return `这就是之前卡住的耳朵问题：Miho 用的是 ${body} 身体，原版 #18/#19「耳朵」在这套身体里没有对应记录 → `
      + `选中后耳朵既画不出来、悬停也没有名称/受伤信息。`
      + `可用做法：改成 #13 头部，再打开「置顶重画」调等级（Miho 耳朵现在就是这么做的）。`;
  }
  return '';
}

function bidRows(list, cur, q, origMap, cv) {
  const raw = String(q || '').trim().toLowerCase();
  const k = norm(raw);
  const orig = origMap || new Map();
  const c0 = cv || activeCanvas();
  const rows = [];
  rows.push({ v: -1, t: '— 装饰（不参与受伤；导出不写 bodyPartId，游戏按 #0 躯干处理）', n: '装饰 decoration' });
  list.forEach(([i, label, src]) => rows.push({
    v: i, t: `#${i} ${label}`, n: `${label} ${i} ${src || ''}`, d: orig.get(i), src: src || '默认',
    risky: bidRisky(c0, i), why: bidRisky(c0, i) ? bidRiskyWhy(c0, i) : '',
  }));
  const hits = !raw ? rows : rows.filter(r => {
    const hay = (r.t + ' ' + r.n + ' ' + (r.d || '')).toLowerCase();
    if (String(r.v) === raw) return true;                    // plain index
    if (hay.includes(raw)) return true;                      // literal text (works for 中文)
    return !!k && norm(hay).includes(k);                     // and the loose form
  });
  if (!hits.length) return `<p class="mini-note" style="padding:12px">没有匹配的部位。</p>`;
  // exact index / word-start matches float to the top, then the rest
  const score = r => {
    const t = r.t.toLowerCase();
    if (String(r.v) === raw) return 0;
    if (new RegExp('(^|[\\s#])' + raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(t)) return 1;
    if (t.includes(raw)) return 2;
    return 3;
  };
  hits.sort((a, b) => (a.v === -1 ? -1 : b.v === -1 ? 1 : score(a) - score(b)) || a.v - b.v);
  return hits.map(r => `<button class="bidrow${r.v === cur ? ' is-on' : ''}${r.risky ? ' is-risky' : ''}" data-act="set-bid" data-bid="${r.v}"
      ${r.risky ? `title="${esc(r.why)}"` : ''}>
      ${r.src ? `<em class="bidrow__src">${esc(r.src)}</em>` : ''}
      ${r.risky ? `<em class="bidrow__bad" title="${esc(r.why || '这个种族的身体里没有该部位：不参与受伤，游戏里可能不显示')}">慎用</em>` : ''}
      <b>${esc(r.t)}</b>
      ${r.d ? `<em class="bidrow__def">${esc(r.d)} · 替换</em>` : ''}
      ${r.v === cur ? '<i>当前</i>' : ''}
    </button>`).join('');
}

function filterBidList(q) {
  const box = $('#bidList');
  const c = activeCanvas();
  if (!box || !c) return;
  const cur = bidPickFor === 'window'
    ? (winParts(S.winSel.win, c).find(x => x.key === S.winSel.key) || {}).bid
    : (selPart() ? selPart().bid : -2);
  box.innerHTML = bidRows(bodyPartList(c), cur, q, origDefsByBid(c), c);
}

const KGROUP_KEYS = new Set(KGROUPS.map(g => g.k));
const KGROUP_LABEL = Object.fromEntries(KGROUPS.map(g => [g.k, g.label]));

function groupOf(p) {
  if (p.source === 'rjw') return 'rjw';
  if (p.group && KGROUP_KEYS.has(p.group)) return p.group;
  if (p.custom) return 'deco';           // race extras / user-added decorations
  return KGROUP_KEYS.has(p.kind) ? p.kind : 'body';
}

/* move a part into another group (its exported tag follows the group) */
function setPartGroup(p, g) {
  if (!p || p.source === 'rjw' || !KGROUP_KEYS.has(g) || g === 'rjw') return;
  p.group = g;
  if (g === 'body' || g === 'bone' || g === 'organ' || g === 'eye') p.kind = g;
  p.custom = true;
}

function sortTree(list) {
  const key = p => (p.bid >= 0 ? p.bid : 900);
  return list.slice().sort((a, b) => {
    const oa = typeof a.order === 'number' ? a.order : null;
    const ob = typeof b.order === 'number' ? b.order : null;
    if (oa != null && ob != null && oa !== ob) return oa - ob;
    if (oa != null && ob == null) return -1;
    if (oa == null && ob != null) return 1;
    return key(a) - key(b) || (a.layer || 0) - (b.layer || 0) || String(a.name).localeCompare(String(b.name), 'zh');
  });
}

/* drag a row onto another row: reorder, and move it between groups */
function movePartTo(dragUid, targetUid, before) {
  const c = activeCanvas(); if (!c) return false;
  const drag = byUid(dragUid), target = byUid(targetUid);
  if (!drag || !target || drag === target) return false;
  const g = groupOf(target);
  if (drag.source === 'rjw' && g !== 'rjw') return false;
  setPartGroup(drag, g);
  const list = sortTree(c.parts.filter(p => groupOf(p) === g && p !== drag));
  let idx = list.indexOf(target);
  if (idx < 0) idx = list.length;
  if (!before) idx++;
  list.splice(idx, 0, drag);
  list.forEach((p, i) => { p.order = (i + 1) * 10; });
  // keep the old order values out of the way for parts that never got one
  c.parts.forEach(p => { if (typeof p.order !== 'number' && p !== drag) p.order = undefined; });
  renderAll();
  pushHistory();
  return true;
}

function raceBodyPartSet(c) {
  const list = c && c.race && Array.isArray(c.race.bodyParts) ? c.race.bodyParts : null;
  if (!list || !list.length) return null;
  const set = new Set();
  list.forEach(x => { const i = Number(x && x.i); if (Number.isFinite(i)) set.add(i); });
  const hasTorso = list.some(x => /torso/i.test(String((x && x.def) || '')));
  return { set, hasTorso };
}

function applyRaceBodyPartValidity(c) {
  if (!c) return;
  const info = raceBodyPartSet(c);
  if (!info) return;
  (c.parts || []).forEach(p => {
    if (!p || p.bid == null || p.bid < 0) return;
    if (p.source === 'rjw') return;
    if (p.raceForced) return;
    let ok = info.set.has(Number(p.bid));
    if (!ok && /Torso$/i.test(String(p.id || '')) && info.hasTorso) ok = true;
    p.raceMissing = !ok;
    if (!ok) {
      p.raceOff = true;
      p.raceOffAuto = true;
    } else if (p.raceOffAuto) {
      p.raceOff = false;
      p.raceOffAuto = false;
    }
  });
}

function renderTree() {
  const c = activeCanvas();
  const box = $('#tree');
  if (!c) { box.innerHTML = ''; return; }
  applyRaceBodyPartValidity(c);
  const groups = KGROUPS.map(g => {
    const list = sortTree(c.parts.filter(p => groupOf(p) === g.k && !(c.rjw === false && p.source === 'rjw')));
    const closed = S.ui.allClosed ? !S.ui.closed[g.k] : !!S.ui.closed[g.k];
    const ico = g.tag
      ? `<span class="grp__tag">${g.tag}</span>`
      : g.mask
        ? `<span class="ico" style="-webkit-mask-image:url('${imgURL(g.mask)}');mask-image:url('${imgURL(g.mask)}')"></span>`
        : `<span class="ico ico--svg">${icon(g.icon)}</span>`;
    const hideEmpty = g.k === 'rjw' && !c.rjw && !list.length;
    const emptyHint = g.k === 'rjw'
      ? (RJW_PARTS.length
        ? (c.rjw ? '正在同步 RJW 部位…' : 'RJW 开关已关闭 · 在画布工具栏或画布属性中打开')
        : '未载入 RJW Genitalia 数据')
      : '暂无部位';
    return `<div class="grp${closed ? ' is-closed' : ''}" data-grp="${g.k}">
      <div class="grp__head" data-act="group" data-k="${g.k}">
        <span class="grp__chev">${icon('chev')}</span>
        ${ico}
        <b>${g.label}</b><span class="n">${list.length}</span>
        <button class="row__act grp__add" data-act="group-add" data-k="${g.k}" title="在这一栏新建部位（再到素材里点贴图）">${icon('plus')}</button>
        <button class="row__act${list.length && list.every(p => p.locked) ? ' is-active' : ''}" data-act="group-lock" data-k="${g.k}" title="锁定 / 解锁这一栏的全部部位（只影响本栏）">${icon(list.length && list.every(p => p.locked) ? 'lock' : 'unlock')}</button>
        <button class="row__act" data-act="group-vis" data-k="${g.k}" title="显示 / 隐藏整组">${icon(list.some(p => p.vis) ? 'eye' : 'eyeoff')}</button>
      </div>
      <div class="grp__body">${list.map(rowHTML).join('') || `<div style="padding:4px 0 6px 18px;font-size:10px;color:#4d555a">${emptyHint}</div>`}</div>
    </div>`;
  }).join('');

  box.innerHTML = groups;
  renderTrayBar(c);
  $('#partCount').textContent = c.parts.length;
}

function renderTrayBar(c) {
  const bar = $('#trayBar');
  if (!bar) return;
  if (!c || !c.detached.length) { bar.hidden = true; bar.innerHTML = ''; return; }
  bar.hidden = false;
  bar.innerHTML = `<div class="traybar__head">${icon('scissors')}已拆卸部位<span class="n">${c.detached.length}</span></div>
    ${c.detached.map(p => `<div class="tray__row" data-act="select-detached" data-uid="${p.uid}">
      <span>${esc(p.name)} <em style="font:9px/1 var(--font-mono);font-style:normal;color:#4d555a">#${p.bid >= 0 ? p.bid : '—'}</em></span>
      <button data-act="reattach" data-uid="${p.uid}">装回</button>
      <button data-act="delete-part" data-uid="${p.uid}" style="color:#e2564a;border-color:rgba(226,86,74,.35)">删除</button>
    </div>`).join('')}`;
}

function rowHTML(p) {
  const sel = p.uid === S.sel;
  const cls = ['row'];
  if (sel) cls.push('is-on');
  if (p.state === 'missing') cls.push('is-missing');
  if (!p.vis) cls.push('is-hidden');
  if (p.raceOff) cls.push('is-raceoff', 'has-restore');
  return `<div class="${cls.join(' ')}" data-act="select" data-uid="${p.uid}" draggable="true" title="拖动可以排序 / 换栏">
    <span class="row__dot s-${p.state}" title="${stateLabel(p.state)}"></span>
    <span class="row__name">${esc(partDisplayName(p))}${p.followDetected ? ' <span class="pill pill--a" style="height:14px;padding:0 4px" title="可自动变换：读取小人实际 HAR bodyAddon 的贴图 / 颜色 / 旋转">自动</span>' : ''}${p.bid < 0 && p.source !== 'rjw' ? ' <span class="pill" style="height:14px;padding:0 4px" title="没有身体部位：只绘制，不参与受伤">装饰</span>' : ''}${p.custom ? ' <span class="pill pill--a" style="height:14px;padding:0 4px">自定</span>' : ''}${p.raceOff ? ' <span class="pill race-off-pill" title="这个种族 BodyDef 里没有这个部位，已关闭">种族无此部位</span>' : ''}${p.hbBad ? ` <span class="pill" style="height:14px;padding:0 4px;color:#e2564a;border-color:rgba(226,86,74,.45)" title="命中框异常（${esc(String(p.hbBad))}）：打开检查器点「设为可见框」即可修好">框异常</span>` : ''}<em>${esc(partSubName(p))}</em></span>
    <span class="row__id">#${p.bid >= 0 ? p.bid : '—'}</span>
    ${p.raceOff ? `<button class="row__act race-restore" data-act="part-race-restore" data-uid="${p.uid}" title="还原：即使种族没有这个部位，也强制使用">${icon('rot')}</button>` : ''}
    <button class="row__act${p.vis ? '' : ' is-active'}" data-act="toggle-vis" data-uid="${p.uid}" title="显示 / 隐藏">${icon(p.vis ? 'eye' : 'eyeoff')}</button>
    <button class="row__act${p.locked ? ' is-active' : ''}" data-act="toggle-lock" data-uid="${p.uid}" title="锁定位置">${icon(p.locked ? 'lock' : 'unlock')}</button>
  </div>`;
}

/* ==========================================================================
   RENDER: stage
   ========================================================================== */
const WOUNDS = {
  cut:  { label: '割伤', icon: 'HediffTab/Common/BloodWound1', tint: 'rgba(197,56,44,.55)' },
  tear: { label: '撕裂', icon: 'HediffTab/Common/BloodWound2', tint: 'rgba(184,48,42,.60)' },
  burn: { label: '烧伤', icon: 'HediffTab/Common/HeatDamage',  tint: 'rgba(201,106,45,.55)' },
  scar: { label: '疤痕', icon: 'HediffTab/Common/Scars',       tint: 'rgba(141,131,120,.45)' }
};

/* NHT 的包扎纹理共 4 张：好/差 × 全包/半包 */
const BANDAGES = {
  full:    'HediffTab/Common/Bandages',
  half:    'HediffTab/Common/BandagesHalf',
  badFull: 'HediffTab/Common/BandagesBad',
  badHalf: 'HediffTab/Common/BandagesBadHalf'
};
const BANDAGE_LABELS = [
  ['', '不包扎'], ['full', '包扎·全'], ['half', '包扎·半'],
  ['badFull', '差包扎·全'], ['badHalf', '差包扎·半']
];

/* NHT 用三档血色（轻 / 重 / 深）叠加受伤部位，这里按严重度取档 */
function woundTier(sev) {
  const v = Math.max(0, Math.min(100, Number(sev) || 0));
  if (v < 34) return { i: 1, color: 'rgba(232,206,74,.78)', k: 0.35 };   // 轻：黄
  if (v < 67) return { i: 2, color: 'rgba(228,150,52,.80)', k: 0.45 };   // 中：橙
  return { i: 3, color: 'rgba(198,54,44,.82)', k: 0.55 };                // 深：红
}

/* NHT: 伤口贴图按严重度换 1/2/3 号 */
function woundIcon(kind, sev) {
  const t = woundTier(sev);
  if (kind === 'cut') return `HediffTab/Common/BloodWound${t.i}`;
  return (WOUNDS[kind] || WOUNDS.cut).icon;
}


/* 标尺跟着工具栏高度下移，避免遮住按钮 */
function layoutRulers() {
  const bar = document.querySelector('.stage__bar');
  const h = bar ? Math.ceil(bar.getBoundingClientRect().height) : 36;
  const rx = document.getElementById('rulerX'), ry = document.getElementById('rulerY');
  const corner = document.querySelector('.ruler__corner');
  if (rx) rx.style.top = h + 'px';
  if (ry) ry.style.top = h + 'px';
  if (corner) corner.style.top = h + 'px';
}


/* 锁定按钮的状态显示 */

/* 横栏 RJW 开关：只表示"是否显示"，已启用但没有部位时给灰态 */
function syncRjwChip() {
  const chip = document.getElementById('rjwChip');
  if (!chip) return;
  const c = activeCanvas();
  // 全局属性里的 RJW 开关没开：横栏按钮直接不显示
  if (!c || !c.rjw) { chip.style.display = 'none'; return; }
  chip.style.display = '';
  const list = c.parts.filter(p => p.source === 'rjw');
  const shown = list.some(p => p.vis !== false);
  chip.classList.toggle('is-on', shown);
  const txt = document.getElementById('rjwChipTxt');
  if (txt) txt.textContent = 'RJW';      // 只显示 RJW，状态交给开关
  chip.title = list.length
    ? (shown ? '当前：显示 RJW 部位（点击隐藏）' : '当前：隐藏 RJW 部位（点击显示）')
    : '这张画布还没有 RJW 部位：在「全局属性 → RJW 器官」里启用';
}


/* 工具栏的导出偏移胶囊：显示当前画布的偏移，点击跳到全局属性 */
function syncOffChip() {
  const chip = document.getElementById('offChip');
  if (!chip) return;
  const c = activeCanvas();
  const x = c ? ((c.exportOffset && c.exportOffset.x) || 0) : 0;
  const y = c ? ((c.exportOffset && c.exportOffset.y) || 0) : 0;
  const txt = document.getElementById('offChipTxt');
  if (txt) txt.textContent = `偏移 ${round(x, 1)} / ${round(y, 1)}`;
  chip.classList.toggle('is-on', x !== 0 || y !== 0);
  chip.dataset.id = c ? c.id : '';
}


/* 横栏的两个显示开关（模板是静态 HTML，状态由这里同步） */



/* ---------------- 画布底部轮播提示（内容来自 tips.html） ---------------- */
const TIPS_BUILTIN = [
  '如果你移动不了头发或某个部位，不妨试试先隐藏掉覆盖在其上面的部位。',
];
let TIPS = TIPS_BUILTIN.slice();
let TIP_IDX = 0;
let TIP_TIMER = 0;

async function loadTips() {
  try {
    const tipsFile = LANG === 'en' ? 'ui/tips-en.html' : 'ui/tips.html';
    const r = await fetch(tipsFile, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    const doc = new DOMParser().parseFromString(txt, 'text/html');
    const items = [...doc.body.querySelectorAll('[data-tip]')]
      .map(el => el.innerHTML.trim())
      .filter(Boolean);
    if (items.length) TIPS = items;
  } catch (e) { /* file:// 下用内置那条 */ }
  TIP_IDX = 0;
  renderTipBar();
  startTipRotation();
}

function renderTipBar() {
  const bar = document.getElementById('tipBar');
  const txt = document.getElementById('tipText');
  if (!bar || !txt) return;
  if (!TIPS.length) { bar.classList.add('is-empty'); return; }
  bar.classList.remove('is-empty');
  txt.innerHTML = TIPS[TIP_IDX % TIPS.length];
}

function startTipRotation() {
  clearInterval(TIP_TIMER);
  if (TIPS.length < 2) return;
  TIP_TIMER = setInterval(() => {
    TIP_IDX = (TIP_IDX + 1) % TIPS.length;
    renderTipBar();
  }, 6000);
}

function openTipList() {
  const body = TIPS.map((x, i) => `<div class="tiplist__it"><span class="tiplist__n">${i + 1}</span><div>${x}</div></div>`).join('');
  openModal(`
    <div class="modal__head"><span class="idx">TIPS</span><h3>提示（共 ${TIPS.length} 条）</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note">内容来自编辑器目录下的 <code>ui/tips.html</code>，可以自己往里加。</p>
      <div class="tiplist">${body}</div>
    </div>`);
}

/* ---------------- 通知内容：读取 notice.html（可自行排版） ---------------- */
let NOTICE_HTML = '';
let NOTICE_SECTIONS = [];
let NOTICE_HASH = '';

/* 简单字符串哈希，用来判断内容有没有变 */
function hashStr(str) {
  let h = 2166136261;
  const t = String(str || '');
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
function seenGet(kind) { try { return localStorage.getItem('nht.seen.' + kind) || ''; } catch (e) { return ''; } }
function seenSet(kind, v) { try { localStorage.setItem('nht.seen.' + kind, v || ''); } catch (e) { } }

/* 把 notice.html 拆成「标题 + 内容」的若干段（标题用 h2/h3/h4 或 .nt-h） */
function splitNotice(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const root = doc.querySelector('.nt') || doc.body;
  const styles = Array.prototype.map.call(doc.querySelectorAll('style'), x => x.outerHTML).join('');
  const sections = [];
  let cur = null;
  const flush = () => {
    if (cur && (cur.title || cur.parts.length)) sections.push({ title: cur.title, html: cur.parts.join('') });
    cur = null;
  };
  Array.prototype.forEach.call(root.childNodes, node => {
    if (node.nodeType === 1 && node.matches('h1,h2,h3,h4,.nt-h')) {
      flush();
      cur = { title: (node.textContent || '').trim(), parts: [] };
      return;
    }
    if (!cur) cur = { title: '', parts: [] };
    if (node.nodeType === 1) cur.parts.push(node.outerHTML);
    else if ((node.textContent || '').trim()) cur.parts.push('<p>' + esc(node.textContent.trim()) + '</p>');
  });
  flush();
  return { sections, styles };
}

async function loadNotice() {
  try {
    const r = await fetch('ui/notice.html', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    NOTICE_HTML = txt;
    const parsed = splitNotice(txt);
    NOTICE_SECTIONS = parsed.sections;
    NOTICE_HASH = hashStr(txt);
    const box = document.getElementById('notifBody');
    if (!box) return;
    if (!NOTICE_SECTIONS.length) {
      box.innerHTML = parsed.styles;
    } else if (NOTICE_SECTIONS.length === 1 && !NOTICE_SECTIONS[0].title) {
      box.innerHTML = parsed.styles + NOTICE_SECTIONS[0].html;     // 单段没有标题 → 直接展示
    } else {
      box.innerHTML = parsed.styles + NOTICE_SECTIONS.map((sec, i) => sec.title
        ? `<details class="ntsec"><summary>${esc(sec.title)}</summary><div class="ntsec__b">${sec.html}</div></details>`
        : `<div class="ntsec ntsec--plain">${sec.html}</div>`).join('');
    }
    // 内容变了 → 重新当作“未读”
    if (NOTICE_HASH && seenGet('notice') !== NOTICE_HASH) {
      S.flags.notifAck = false;   // 只亮小红点，不自动展开
    }
    refreshAttention();
  } catch (e) { /* file:// 下读不到就用内置文本 */ }
}


/* ---------- 顶栏三个图标：未读时黄色闪烁 + 抖动 ---------- */
function helpVersion() { return 'help-v1'; }

function attentionState() {
  // 闪烁只看内容是否更新过；「收到」只影响铃铛上的圆点
  const noticeUnread = !!(NOTICE_HASH && seenGet('notice') !== NOTICE_HASH);
  const guidesHash = hashStr(JSON.stringify(window.NHT_GUIDES || []));
  const guidesUnread = seenGet('guides') !== guidesHash;
  const helpUnread = seenGet('help') !== hashStr(helpVersion());
  return { notice: !!noticeUnread, guides: guidesUnread, help: helpUnread };
}

function refreshAttention() {
  const st = attentionState();
  const map = { notice: '#notifBtn', guides: '[data-act="guides"]', help: '[data-act="help"]' };
  Object.keys(map).forEach(k => {
    const el = document.querySelector(map[k]);
    if (el) el.classList.toggle('attn', !!st[k]);
  });
  const dot = document.getElementById('notifDot');
  const unread = !S.flags.notifAck || !!st.notice;
  if (dot) dot.classList.toggle('is-on', unread);
  const nb = document.getElementById('notifBtn');
  if (nb) nb.classList.toggle('is-unread', unread);
  const ack = document.getElementById('notifAck');
  if (ack) ack.classList.toggle('attn', !!st.notice);
}


/* ---------------- 通知内容 = Git 提交记录 ---------------- */

function gitLogsText() {
  return gitState.logs.map(x => '[' + x.time + '] ' + x.kind + '\n' + x.text).join('\n\n');
}

function renderGitNotif() {
  const box = document.getElementById('notifBody');
  if (!box) return;
  const st = gitState.status;
  if (!st || !st.commits || !st.commits.length) {
    box.innerHTML = '<p class="mini-note" style="margin:0">还没有 Git 记录。到「设置 → Git」填好仓库目录，然后在「项目 → Git 同步」里 Push 或拉取一次。</p>';
    return;
  }
  box.innerHTML = st.commits.map(c => `
    <div class="gcard">
      <div class="gcard__d">${esc(c.date || '')} · ${esc(c.author || '')}</div>
      <div class="gcard__s">${esc(c.subject || '')}</div>
      <div class="gcard__h">${esc(c.hash || '')}</div>
    </div>`).join('');
}

function gitNotifyNewCommits(st) {
  renderGitNotif();
  const top = (st && st.commits && st.commits[0]) ? st.commits[0].hash : '';
  const h = hashStr(top + '|' + ((st && st.commits) ? st.commits.length : 0));
  if (h && h !== NOTICE_HASH) {
    NOTICE_HASH = h;
    if (seenGet('notice') !== h) { S.flags.notifAck = false; }
  }
  try { refreshAttention(); } catch (e) { }
}

/* ---------- 顶栏通知：只有点「收到」才会真正关掉 ---------- */
function notifPopup() { return document.getElementById('notifPop'); }
function notifBell() { return document.getElementById('notifBtn'); }

function pulseBell(on) {
  const b = notifBell();
  if (b) b.classList.toggle('is-alert', !!on);
}

/* 把气泡挂到 body 上并用 fixed 定位：脱离 topbar 的 stacking context，才能真正压在所有东西之上 */
function placeNotifPop() {
  const pop = notifPopup();
  const btn = notifBell();
  if (!pop || !btn) return;
  const r = btn.getBoundingClientRect();
  pop.style.position = 'fixed';
  pop.style.top = Math.round(r.bottom + 8) + 'px';
  pop.style.right = Math.round(Math.max(8, innerWidth - r.right - 6)) + 'px';
  pop.style.left = 'auto';
}

function showNotif() {
  const pop = notifPopup();
  if (!pop) return;
  renderGitNotif();
  if (pop.parentElement !== document.body) document.body.appendChild(pop);
  placeNotifPop();
  pop.hidden = false;
  pulseBell(false);
  // 打开气泡不算“看过”：要收起或点「收到」才停止闪烁
  try { refreshAttention(); } catch (e) { }
  const dot = document.getElementById('notifDot');
  if (dot) dot.classList.toggle('is-on', !S.flags.notifAck);
}

/* 只是收起气泡：未点「收到」时让铃铛一直高亮提醒 */
function collapseNotif() {
  const pop = notifPopup();
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  if (NOTICE_HASH) seenSet('notice', NOTICE_HASH);   // 收起 = 看过了，停止闪烁（没点收到仍留圆点）
  if (!S.flags.notifAck) pulseBell(true);
  try { refreshAttention(); } catch (e) { }
}

function ackNotif() {
  S.flags.notifAck = true;
  seenSet('notice', NOTICE_HASH);
  const pop = notifPopup();
  if (pop) pop.hidden = true;
  pulseBell(false);
  const dot = document.getElementById('notifDot');
  if (dot) dot.classList.remove('is-on');
  try { refreshAttention(); } catch (e) { }
  persist();
}

/* 进入页面：只在还没点过「收到」时弹一次；收起后不再打扰 */
function notifHint() {
  if (S.flags.notifAck) return;
  try { pulseBell(true); } catch (e) { }   // 打开页面不再自动展开通知
}



function syncViewSwitches() {
  const set = (id, on) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('is-on', on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  };
  set('guidesSwitch', S.flags.guides !== false);
  set('notesSwitch', S.flags.notes !== false);
}

function syncLockChip() {
  const c = activeCanvas();
  const chip = document.getElementById('lockChip');
  const txt = document.getElementById('lockChipTxt');
  if (!chip) return;
  const on = !!(c && c.locked);
  chip.classList.toggle('is-on', on);
  if (txt) txt.textContent = on ? '已锁定' : '锁定';
}

/* 头发预览：把选框裁到贴图的可见像素（透明边不算），位置/缩放仍按模组的 1024×scale 规则 */
const HAIR_BOX_PENDING = new Set();
const HAIR_BOX_TRIES = new Map();

/* 参考发型：按可见像素裁剪，同时保持 transform 定位（元素中心 = 图片中心 + 可见区偏移） */
const REF_BOX_CACHE = new Map();
function refBoxOf(path, k) {
  const key = String(path) + '|' + String(k);
  if (REF_BOX_CACHE.has(key)) return REF_BOX_CACHE.get(key);
  const [iw, ih] = imgDim(path);
  const e = EXT.get(path);
  const abArr = e && e.ab;
  const cached = ALPHA_BOX.get(path);
  let box = null;
  if (abArr && abArr[2] > 1 && abArr[3] > 1) box = { x0: abArr[0], y0: abArr[1], w: abArr[2], h: abArr[3] };
  else if (cached && cached.ok && cached.w > 1 && cached.h > 1) box = { x0: cached.x0, y0: cached.y0, w: cached.w, h: cached.h };
  if (!box) {
    box = { x0: 0, y0: 0, w: iw, h: ih };
    scheduleAlphaBox(path);
  } else {
    REF_BOX_CACHE.set(key, { iw, ih, box });
  }
  const dx = ((box.x0 + box.w / 2) - iw / 2) * k;
  const dy = ((box.y0 + box.h / 2) - ih / 2) * k;
  return { iw, ih, box, dx, dy };
}

function applyRefHairBox(el, imEl, path, k, cx, cy, moveOnly) {
  if (moveOnly && el._refDx != null && el._refDy != null && el._refK === k) {
    el.style.transform = `translate(-50%,-50%) translate(${cx + el._refDx}px,${cy + el._refDy}px)`;
    return;
  }
  const g = refBoxOf(path, k);
  el._refDx = g.dx; el._refDy = g.dy; el._refK = k;
  if (!moveOnly) {
    el.style.width = (g.box.w * k) + 'px';
    el.style.height = (g.box.h * k) + 'px';
    el.style.overflow = 'hidden';
    if (imEl) {
      imEl.style.position = 'absolute';
      imEl.style.maxWidth = 'none';
      imEl.style.width = (g.iw * k) + 'px';
      imEl.style.height = (g.ih * k) + 'px';
      imEl.style.left = (-g.box.x0 * k) + 'px';
      imEl.style.top = (-g.box.y0 * k) + 'px';
    }
  }
  el.style.transform = `translate(-50%,-50%) translate(${cx + g.dx}px,${cy + g.dy}px)`;
}


/* 发色遮罩：只有「发型贴图自己的 alpha」与「遮罩允许染色的区域（红通道）」同时成立才会染色。
   注意：HAR 的 _m 遮罩多是不透明的红/黑整图（红＝可染色、黑＝保留原色，例如发饰），
   只取红通道会把整张透明画布也当成可染色区域 —— 发色就会把透明背景一起涂满。
   所以先用发型贴图的 alpha 打底，再乘遮罩红通道；尺寸不一致时按发型尺寸铺开。 */
const MASK_ALPHA = new Map();
function maskLoadImage(p) {
  return new Promise(resolve => {
    if (!p) { resolve(null); return; }
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = imgURL(p);
  });
}
function maskAlphaURL(hairPath, maskPath) {
  const key = (hairPath || '') + '|' + (maskPath || '');
  if (MASK_ALPHA.has(key)) return Promise.resolve(MASK_ALPHA.get(key));
  if (!hairPath) return Promise.resolve('');
  return new Promise(resolve => {
    Promise.all([maskLoadImage(hairPath), maskLoadImage(maskPath)]).then(([hair, mask]) => {
      if (!hair) { resolve(''); return; }
      try {
        const w = hair.naturalWidth || 1, h = hair.naturalHeight || 1;
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        g.drawImage(hair, 0, 0);
        const d = g.getImageData(0, 0, w, h).data;
        let md = null;
        if (mask) {
          const mc = document.createElement('canvas');
          mc.width = w; mc.height = h;
          const mg = mc.getContext('2d');
          mg.drawImage(mask, 0, 0, w, h);
          md = mg.getImageData(0, 0, w, h).data;
        }
        // 少数种族把遮罩反过来画（黑＝头发）：可染色比例过低时忽略遮罩，只按发型 alpha
        let hairN = 0, keep = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 8) { hairN++; if (!md || md[i] > 16) keep++; }
        }
        const useMask = !!md && hairN > 0 && (keep / hairN) >= 0.02;
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3];
          d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
          d[i + 3] = (a <= 0) ? 0 : (useMask ? Math.round(a * md[i] / 255) : a);
        }
        g.putImageData(new ImageData(d, w, h), 0, 0);
        const url = cv.toDataURL('image/png');
        MASK_ALPHA.set(key, url);
        resolve(url);
      } catch (e) { resolve(''); }
    });
  });
}
function syncHairTintMask(el, tint, show, hairPath, maskPath) {
  if (!el) return;
  if (show === false) { el.style.setProperty('--tint', 'transparent'); return; }
  el.style.setProperty('--tint', tint || '#c8b48a');
  el.style.setProperty('--maskSize', el.style.backgroundSize || '100% 100%');
  el.style.setProperty('--maskPos', el.style.backgroundPosition || '0 0');
  // 先退回「发型图自己的 alpha」（浏览器遮罩默认取 alpha），合成遮罩就绪后再换上去
  el.style.setProperty('--hairimg', el.style.backgroundImage || 'none');
  if (!hairPath) return;
  el.dataset.hairPath = hairPath;
  const cached = MASK_ALPHA.get(hairPath + '|' + (maskPath || ''));
  if (cached) { el.style.setProperty('--hairimg', `url("${cached}")`); return; }
  maskAlphaURL(hairPath, maskPath).then(url => {
    if (!url || !el.isConnected) return;
    if (el.dataset.hairPath !== hairPath) return;   // 已经换成别的发型，丢掉这次结果
    el.style.setProperty('--hairimg', `url("${url}")`);
  });
}

function applyHairBox(el, path, size, cx, cy) {
  const [iw, ih] = imgDim(path);
  const sx = size / (iw || 1), sy = size / (ih || 1);
  const e = EXT.get(path);
  const abArr = e && e.ab;
  const cached = ALPHA_BOX.get(path);
  let box = null;
  if (abArr && abArr[2] > 1 && abArr[3] > 1) {
    box = { x0: abArr[0], y0: abArr[1], w: abArr[2], h: abArr[3], ok: true };
  } else if (cached && cached.ok && cached.w > 1 && cached.h > 1) {
    box = cached;
  }
  if (!box) {
    el.style.left = (cx - size / 2) + 'px';
    el.style.top = (cy - size / 2) + 'px';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.backgroundSize = '100% 100%';
    el.style.backgroundPosition = '0 0';
    const tries = HAIR_BOX_TRIES.get(path) || 0;
    if (!HAIR_BOX_PENDING.has(path) && tries < 20) {
      HAIR_BOX_PENDING.add(path);
      alphaBoxAsync(path).then(box2 => {
        HAIR_BOX_PENDING.delete(path);
        HAIR_BOX_TRIES.set(path, tries + 1);
        if (box2 && box2.ok) { try { renderStage(); } catch (err) { } }
      }).catch(() => { HAIR_BOX_PENDING.delete(path); HAIR_BOX_TRIES.set(path, tries + 1); });
    }
    return;
  }
  el.style.left = (cx - size / 2 + box.x0 * sx) + 'px';
  el.style.top = (cy - size / 2 + box.y0 * sy) + 'px';
  el.style.width = (box.w * sx) + 'px';
  el.style.height = (box.h * sy) + 'px';
  el.style.backgroundSize = `${size}px ${size}px`;
  el.style.backgroundPosition = `${-box.x0 * sx}px ${-box.y0 * sy}px`;
}

function renderStage() {
  // t119：每张画布第一次渲染时把眼睛的命中框收成标准 22px 框（历史数据里是整张脸的可见框，
  // 点脸就会弹部位设置）。只做一次，之后的编辑不受影响；hbBig 部位自己声明过要大的，跳过。
  try {
    if (EYE_HB_ENABLED) (S.canvases || []).forEach(c => {
      if (c.__eyeHbPass) return;
      const ps = [].concat(c.parts || [], c.detached || []);
      if (!ps.some(isEyePart)) { c.__eyeHbPass = true; return; }
      let ok = true, ch = false;
      ps.forEach(p => {
        if (!isEyePart(p)) return;
        const [dw, dh] = imgDim(p.img);
        if (!(Number(dw) > 2) || !(Number(dh) > 2)) { ok = false; return; }   // 贴图还没就绪，下次再试
        if (applyEyeHitbox(p, true)) ch = true;
      });
      if (ok) c.__eyeHbPass = true;
      if (ch) { try { persist(); } catch (e) { } }
    });
  } catch (e) { }
  const c = activeCanvas();
  const pl = $('#partsLayer');
  pl.innerHTML = '';
  if (!c) { updateVariantDock(null); return; }

  const dr = $('#dispRect');
  if (dr) {
    const d = c.displayBox;
    if (d && d.w > 1 && d.h > 1 && d.show !== false) {
      dr.hidden = false;
      dr.style.left = d.x + 'px'; dr.style.top = d.y + 'px';
      dr.style.width = d.w + 'px'; dr.style.height = d.h + 'px';
      dr.classList.toggle('is-locked', !!d.locked);
      const ovD = overflowParts(c, 'display');
      const outD = ovD.list.length;
      dr.classList.toggle('is-bad', outD > 0);  // 有部位超出就持续标红
      const sidesD = new Set();
      ovD.list.forEach(o => Object.keys(o.over).forEach(k => o.over[k] && sidesD.add(k)));
      const dirL = (LANG === 'en')
        ? { left: 'left', right: 'right', top: 'top', bottom: 'bottom' }
        : { left: '左', right: '右', top: '上', bottom: '下' };
      const sidesTxt = [...sidesD].map(x => dirL[x]).join('/');
      dr.querySelector('.dbounds__lab').textContent = (LANG === 'en')
        ? `Display ${round(d.w, 0)} × ${round(d.h, 0)}` + (d.locked ? ' · Pinned' : '') +
          (outD ? ` · ⚠ ${outD} parts outside ${sidesTxt} edge` : '')
        : `实际显示 ${round(d.w, 0)} × ${round(d.h, 0)}` + (d.locked ? ' · 已固定' : '') +
          (outD ? `  ·  ⚠ ${outD} 个部位超出${sidesTxt}边` : '');
    } else {
      dr.hidden = true;
    }
  }

  updateHarBadge(c);
  updateVariantDock(c);

  renderGuides(c);
  syncRefForCanvas(c);

  // hair preview: same maths the mod uses (size = 1024 * scale, centre shifted by the offsets)
  let hp = $('#hairPreview');
  if (!hp) {
    hp = document.createElement('div'); hp.id = 'hairPreview'; hp.className = 'hairprev' + (c.hairFrameHide ? ' no-frame' : '');
    const g = document.createElement('span'); g.className = 'hairprev__grip'; g.dataset.hpgrip = '1';
    hp.appendChild(g); pl.appendChild(hp);
  }
  const hImg = c.hairPreviewImg || null;      // 只要有预览图就显示（不再依赖 hairFitEnabled）
  // t16：预览只用 hairFit（游戏唯一生效的那组）；不再乘 vanillaFit，否则非 HAR 会变成 0.332²
  const hf = c.hairFit || { scale: 0.78, offsetX: 0, offsetY: -0.21 };
  if (hImg && c.hairPreviewShow !== false) {
    hp.onwheel = e => {
      if (c.hairLocked) return;
      e.preventDefault(); e.stopPropagation();
      const hf2 = c.hairFit || (c.hairFit = { scale: 0.78, offsetX: 0, offsetY: -0.21 });
      hf2.scale = clamp(round((hf2.scale || 0.78) + (e.deltaY > 0 ? 0.02 : -0.02), 3), 0.1, 3);
      renderStage(); syncHairNums(c); persist();
    };
    const size = 1024 * (hf.scale || 0.78);
    const cx = (hf.offsetX || 0) * 1024;
    const cy = (hf.offsetY || 0) * 1024;
    hp.style.display = 'block';
    hp.style.backgroundImage = `url("${imgURL(hImg)}")`;
    applyHairBox(hp, hImg, size, cx, cy, 0);
    syncHairTintMask(hp, c.hairTint, c.hairTintShow !== false, hImg, hairMaskOf(hImg));
    const hlNow = Number.isFinite(c.hairPreviewLayer) ? c.hairPreviewLayer
      : (Number.isFinite(c.hairLayer) ? c.hairLayer
        : (c.hairFit && Number.isFinite(c.hairFit.layer) ? c.hairFit.layer : 29));
    // 和部位同一套换算：头发层级*10 + 5 —— 层级比头发高的部位（腮、角、耳机）才会画在头发上面
    hp.style.zIndex = String(hlNow * 10 + 5);
  } else {
    hp.style.display = 'none';
  }

  // 后背层（只用于编辑器预览）：HAR 多层发型里那层画在脑袋后面的贴图
  let hb2 = $('#hairBackPreview');
  if (!hb2) {
    hb2 = document.createElement('div');
    hb2.id = 'hairBackPreview';
    hb2.className = 'hairprev hairprev--back' + (c.hairFrameHide ? ' no-frame' : '');
    pl.appendChild(hb2);
  }
  const bImg = hImg ? backHairOf(c) : null;
  if (hImg && bImg && c.hairPreviewShow !== false && c.hairBackShow !== false) {
    const size = 1024 * (hf.scale || 0.78);
    const cx = (hf.offsetX || 0) * 1024;
    const cy = (hf.offsetY || 0) * 1024;
    hb2.style.display = 'block';
    hb2.style.backgroundImage = `url("${imgURL(bImg)}")`;
    applyHairBox(hb2, bImg, size, cx, cy, 0);
    syncHairTintMask(hb2, c.hairTint, c.hairTintShow !== false, bImg, hairMaskOf(bImg));
    const mainLay = Number.isFinite(c.hairPreviewLayer) ? c.hairPreviewLayer : (Number.isFinite(c.hairLayer) ? c.hairLayer : 29);
    const backLay = Number.isFinite(c.hairBackLayer) ? c.hairBackLayer : 0;
    // 后背层必须在所有部位和底图之下：没设层级时用 -1（原来算出来是 10，会盖住底图）
    hb2.style.zIndex = String(backLay > 0 ? (backLay + 1) * 10 - 5 : -1);
    hb2.title = '后背层预览：' + bImg.split('/').pop();
  } else {
    hb2.style.display = 'none';
  }

  // 侧层（Yuran SideHair / hairB）：叠在后脑层之上、主发之下（与模组绘制顺序一致）
  let hs2 = $('#hairSidePreview');
  if (!hs2) {
    hs2 = document.createElement('div');
    hs2.id = 'hairSidePreview';
    hs2.className = 'hairprev hairprev--side' + (c.hairFrameHide ? ' no-frame' : '');
    pl.appendChild(hs2);
  }
  const sImg = hImg ? sideHairOf(c) : null;
  if (hImg && sImg && sImg !== bImg && c.hairPreviewShow !== false && c.hairSideShow !== false) {
    const size = 1024 * (hf.scale || 0.78);
    const cx = (hf.offsetX || 0) * 1024;
    const cy = (hf.offsetY || 0) * 1024;
    hs2.style.display = 'block';
    hs2.style.backgroundImage = `url("${imgURL(sImg)}")`;
    applyHairBox(hs2, sImg, size, cx, cy, 0);
    syncHairTintMask(hs2, c.hairTint, c.hairTintShow !== false, sImg, hairMaskOf(sImg));
    const backLay1 = Number.isFinite(c.hairBackLayer) ? c.hairBackLayer : 0;
    hs2.style.zIndex = String(backLay1 > 0 ? (backLay1 + 1) * 10 - 5 : -1);
    hs2.title = '侧层预览：' + sImg.split('/').pop();
  } else {
    hs2.style.display = 'none';
  }

  // 呆毛层（画在头发之上）
  let ha = $('#hairAhogePreview');
  if (!ha) {
    ha = document.createElement('div');
    ha.id = 'hairAhogePreview';
    ha.className = 'hairprev hairprev--ahoge' + (c.hairFrameHide ? ' no-frame' : '');
    pl.appendChild(ha);
  }
  const aImg = hImg ? ahogeKeyOf(hImg) : null;
  if (hImg && aImg && c.hairPreviewShow !== false && c.hairAhogeShow !== false) {
    const size2 = 1024 * (hf.scale || 0.78);
    const cx2 = (hf.offsetX || 0) * 1024;
    const cy2 = (hf.offsetY || 0) * 1024;
    ha.style.display = 'block';
    ha.style.backgroundImage = `url("${imgURL(aImg)}")`;
    applyHairBox(ha, aImg, size2, cx2, cy2, 0);
    syncHairTintMask(ha, c.hairTint, c.hairTintShow !== false, aImg, hairMaskOf(aImg));
    ha.style.zIndex = String(((Number.isFinite(c.hairPreviewLayer) ? c.hairPreviewLayer : (Number.isFinite(c.hairLayer) ? c.hairLayer : 29)) + 1) * 10 + 5);
    ha.title = '呆毛层：' + aImg.split('/').pop();
  } else {
    ha.style.display = 'none';
  }

  const b = c.bounds;
  const br = $('#boundsRect');
  br.style.left = b.x + 'px'; br.style.top = b.y + 'px';
  br.style.width = b.w + 'px'; br.style.height = b.h + 'px';
  br.style.display = 'block';
  br.querySelector('.bounds__lab').textContent = `${round(b.w, 0)} × ${round(b.h, 0)}  ·  边界`;

  // the size the game actually renders for this doll: it is the outline art's own size
  // (512 × 1024 for every doll), the <BoundingBox> is only the art bounds
  const gb = $('#gameBounds');
  if (gb) {
    const ov = overflowParts(c);
    const box = ov.box;
    if (box) {
      gb.hidden = false;
      gb.style.left = box.x + 'px'; gb.style.top = box.y + 'px';
      gb.style.width = box.w + 'px'; gb.style.height = box.h + 'px';
      gb.classList.remove('is-bad');
      // the game draws the doll into the outline texture's own area, so a box that matches the
      // outline width is 1:1; a smaller box is magnified
      const outlineW = (D.bodytypes.find(b3 => (b3.outlineW || 0) > 1) || {}).outlineW || 512;
      const zoom = outlineW / Math.max(1, (c.bounds ? c.bounds.w : outlineW));
      const en = LANG === 'en';
      const zoomTxt = en
        ? (zoom > 1.02 ? ` · In-game zoom ×${zoom.toFixed(2)}`
          : (zoom < 0.98 ? ` · In-game shrink ×${(1 / zoom).toFixed(2)}` : ' · 1:1 with game canvas'))
        : (zoom > 1.02 ? `  ·  游戏内放大 ×${zoom.toFixed(2)}`
          : (zoom < 0.98 ? `  ·  游戏内缩小 ×${(1 / zoom).toFixed(2)}` : '  ·  与游戏画布 1:1'));
      gb.querySelector('.gbounds__lab').textContent = en
        ? `Common display range = Bounds ${round(box.w, 0)} × ${round(box.h, 0)}` + zoomTxt
        : `通用显示范围 = 边界 ${round(box.w, 0)} × ${round(box.h, 0)}` + zoomTxt;
    } else {
      gb.hidden = true;
    }
  }


  const rjwOff = c.rjw === false;
  const list = sortParts(c.parts.filter(p => !p.raceOff && p.vis !== false && !isWindowOnly(p)
    && !(rjwOff && p.source === 'rjw')
    && (p.kind === 'body' || p.kind === 'eye' || p.kind === 'custom' || S.kinds[p.kind] !== false)));
  list.forEach((p, i) => pl.appendChild(partEl(p, i)));

  // t52：异种专属部位（只存在于当前异种）也要画在预览里；它们不在 c.parts，单独追加
  try {
    if (S.tab === 'variant') {
      const vv = variantState(c);
      if (vv) variantExtraParts(vv).forEach((p, i) => pl.appendChild(partEl(p, list.length + i)));
    }
  } catch (e) { }
  // 预热 alpha（命中测试/红框要用）；限制总量，避免一次吃太多内存
  try {
    if (ALPHA_DATA.size < 160) {
      list.forEach(p => {
        if (p.img && !ALPHA_DATA.has(p.img) && ALPHA_DATA.size < 160) alphaDataFor(p.img);
      });
    }
  } catch (e) { }
  // mark the parts that would be clipped by the in-game canvas
  try {
    /* 超出边界不再提示（已按通用显示范围处理） */
  } catch (err) { /* imgDim may not know a brand new texture yet */ }
  if (HAIR_REF && HAIR_REF.img && HAIR_REF.vis !== false) {
    const [w, h] = imgDim(HAIR_REF.img);
    const el = document.createElement('div');
    el.className = 'part hair-ref';

    el.style.width = (w * HAIR_REF.sx) + 'px';
    el.style.height = (h * HAIR_REF.sy) + 'px';
    // same stacking rule as the parts: order by layer (and extra), so "layer 20" sits
    // under "layer 44" exactly like a normal part would. Parts use (index+1)*10 so the
    // reference takes a slot in between — never tied with a part.
    const refLayer = HAIR_REF.layer != null ? HAIR_REF.layer : 20;
    const before = list.filter(p => (p.extra || 0) < 0 || ((p.extra || 0) === 0 && (p.layer || 0) <= refLayer)).length;
    el.style.zIndex = String(Math.min(before, list.length) * 10 + 5);
    el.style.transform = `translate(-50%,-50%) translate(${HAIR_REF.x}px,${HAIR_REF.y}px)`;
    const im = document.createElement('img');
    im.src = imgURL(HAIR_REF.img);
    im.draggable = false;
    el.appendChild(im);
    applyRefHairBox(el, im, HAIR_REF.img, HAIR_REF.sx, HAIR_REF.x, HAIR_REF.y);
    el.title = HAIR_REF.locked ? '发型参考（已锁定，点「解锁」可调整）' : '发型参考：拖动微调位置，滚轮缩放（不会导出）';
    if (HAIR_REF.locked) {
      el.classList.add('is-locked');
      el.style.pointerEvents = 'none';
    }
    // drag to nudge / wheel to scale; the fit is remembered per hairstyle
    el.addEventListener('pointerdown', e => {
      if (HAIR_REF.locked) return;
      e.stopPropagation(); e.preventDefault();
      const c0 = activeCanvas();
      const ft0 = hairFitTarget(c0);
      hairDrag = { sx: e.clientX, sy: e.clientY, x0: HAIR_REF.x, y0: HAIR_REF.y,
        rect: document.getElementById('stage').getBoundingClientRect(),
        backImg: HAIR_REF.backImg || findBackHair(HAIR_REF.img),
        fitTarget: ft0.obj, fitVanilla: false,   // t16：始终是画布单位（HF）
        fit0: { scale: Number(ft0.obj.scale) || 0.78, offsetX: Number(ft0.obj.offsetX) || 0, offsetY: Number(ft0.obj.offsetY) || 0 } };
      try { el.setPointerCapture(e.pointerId); } catch (err) { }
    });
    el.addEventListener('pointermove', e => {
      if (!hairDrag || HAIR_REF.locked) return;
      e.stopPropagation();
      hairDrag.pending = { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey };
      if (hairDrag.raf) return;
      hairDrag.raf = requestAnimationFrame(() => {
        if (!hairDrag) return;
        hairDrag.raf = 0;
        const ev = hairDrag.pending;
        if (!ev) return;
        const rct = hairDrag.rect || document.getElementById('stage').getBoundingClientRect();
        const a = { x: (ev.clientX - rct.left - rct.width / 2 - S.view.px) / S.view.z, y: (ev.clientY - rct.top - rct.height / 2 - S.view.py) / S.view.z };
        const b = { x: (hairDrag.sx - rct.left - rct.width / 2 - S.view.px) / S.view.z, y: (hairDrag.sy - rct.top - rct.height / 2 - S.view.py) / S.view.z };
        let nx = hairDrag.x0 + (a.x - b.x);
        let ny = hairDrag.y0 + (a.y - b.y);
        if (ev.shiftKey) {
          // hold shift: magnetically align to the head centre / edges
          const r = HAIR_REF;
          const tol = Math.max(4, (r.headW || 60) * 0.12);
          const xs = [r.headCX, r.headCX - (r.headW || 0) / 2, r.headCX + (r.headW || 0) / 2];
          const ys = [r.headCY, r.headCY - (r.headH || 0) / 2, r.headCY + (r.headH || 0) / 2, r.headCY - (r.headH || 0) * 0.66];
          let bestX = nx, bx = tol;
          xs.forEach(t => { const d = Math.abs(nx - t); if (d < bx) { bx = d; bestX = t; } });
          let bestY = ny, by = tol;
          ys.forEach(t => { const d = Math.abs(ny - t); if (d < by) { by = d; bestY = t; } });
          nx = bestX; ny = bestY;
          el.classList.add('is-snap');
        } else {
          el.classList.remove('is-snap');
        }
        HAIR_REF.x = nx;
        HAIR_REF.y = ny;
        if (hairDrag.fitTarget) {
          const dx = nx - hairDrag.x0, dy = ny - hairDrag.y0;
          const fx = hairDrag.fitTarget;
          // t16：HF 是画布单位（1024 画布），拖动像素要除以 1024
          // t18：clamp 到 HairTuning.ValidHarValues 的 ±2，避免拖出游戏会丢弃的非法值
          fx.offsetX = clamp(hairDrag.fit0.offsetX + dx / 1024, -2, 2);
          fx.offsetY = clamp(hairDrag.fit0.offsetY + dy / 1024, -2, 2);
          syncHairFitLive(activeCanvas());
        }
        applyRefHairBox(el, im, HAIR_REF.img, HAIR_REF.sx, HAIR_REF.x, HAIR_REF.y, true);
        // 后背层是同一次渲染里另建的元素，拖动时要跟着一起动
        const backEl = pl.querySelector('.hair-ref--back');
        if (backEl) {
          const bImg = hairDrag.backImg;
          if (bImg) applyRefHairBox(backEl, backEl.querySelector('img'), bImg, HAIR_REF.sx, HAIR_REF.x, HAIR_REF.y, true);
        }
      });
    });
    const endDrag = () => {
      if (!hairDrag) return;
      if (hairDrag.raf) { try { cancelAnimationFrame(hairDrag.raf); } catch (e) { } }
      hairDrag = null;
      saveRefForCanvas();          // 位置只写进当前画布
      syncHairFitLive(activeCanvas());
      renderLibrary();             // 素材面板的偏移/缩放数值立刻更新
      renderStage();
      persist();               // 主层 + 后背层一起重画，省得手动隐藏再显示
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('wheel', e => {
      e.preventDefault(); e.stopPropagation();
      nudgeHair(0, 0, e.deltaY < 0 ? 0.05 : -0.05);
    }, { passive: false });
    pl.appendChild(el);
    // 素材参考发型也有后背层：同位置、同缩放，层级低一档（仅参考，不导出）
    {
      const backImg2 = c.hairBackShow === false ? null : findBackHair(HAIR_REF.img);
      if (backImg2) {
        const el2 = document.createElement('div');
        el2.className = 'part hair-ref hair-ref--back';
        el2.style.width = el.style.width;
        el2.style.height = el.style.height;
        // 参考发型的后背层永远压在最底下（原来用 backLayer 计算，设成 2 就会跑到身体前面）
        el2.style.zIndex = '-1';
        el2.style.transform = el.style.transform;
        el2.style.pointerEvents = 'none';
        const im2 = document.createElement('img');
        im2.src = imgURL(backImg2);
        im2.draggable = false;
        el2.appendChild(im2);
        applyRefHairBox(el2, im2, backImg2, HAIR_REF.sx, HAIR_REF.x, HAIR_REF.y);
        el2.title = '发型参考的后背层：' + backImg2.split('/').pop();
        pl.appendChild(el2);
      }
      const aImg2 = c.hairAhogeShow === false ? null : ahogeKeyOf(HAIR_REF.img);
      if (aImg2) {
        const el3 = document.createElement('div');
        el3.className = 'part hair-ref hair-ref--ahoge';
        el3.style.width = el.style.width;
        el3.style.height = el.style.height;
        el3.style.zIndex = String((Number(el.style.zIndex) || 100) + 5);
        el3.style.transform = el.style.transform;
        el3.style.pointerEvents = 'none';
        const im3 = document.createElement('img');
        im3.src = imgURL(aImg2);
        im3.draggable = false;
        el3.appendChild(im3);
        applyRefHairBox(el3, im3, aImg2, HAIR_REF.sx, HAIR_REF.x, HAIR_REF.y);
        el3.title = '发型参考的呆毛层：' + aImg2.split('/').pop();
        pl.appendChild(el3);
      }
    }
  }
  const empty = $('#stageEmpty');
  if (empty) empty.hidden = c.parts.length > 0;
  $('#gridLayer').classList.toggle('is-off', !S.flags.grid);
  // x-ray: skin becomes a dark silhouette so the white organs / bones read clearly
  $('#board').classList.toggle('is-icons', !!S.flags.icons);
  // 护甲视图复用 X 光：身体变黑+半透明，图标直接画在上面
  $('#board').classList.toggle('is-xray', S.kinds.organ === true || S.kinds.bone === true || !!S.flags.icons);
  applyView();
  syncLockChip();
  syncViewSwitches();
  syncRjwChip();
  syncOffChip();
  renderOverlay();
  renderSelInfo();
  renderKindChips();
  renderWins(c);
  try { renderNotes(c); } catch (e) { /* 备注异常不拖累部位绘制 */ }
}

/* ==========================================================================
   detail windows: movable / resizable panels with their own draggable parts
   ========================================================================== */
const WIN_IDS = ['anus', 'crotch', 'hand', 'feet'];
const WIN_BAR = 22;

/* ---- the RJW panel, copied from the mod (PanelRenderer.cs) ----------------
   PanelBox   (-160,-190,320,380)  the panel's own coordinate system
   ReproBox   (-152,-183,304,278)  the genitals box: background + clipped parts
   AnusBox    (  96, 111, 56, 71)  the anus window inside the panel
   A part's place in the panel is its form's panelPosition + (glyph - position)
   times panelScale / scale, so the editor shows exactly the in-game layout.  */
const PANEL = {
  repro: { x: -152, y: -183, w: 304, h: 278 },
  anus: { x: 96, y: 111, w: 56, h: 71 },
  slots: ['Belly', 'Ovaries', 'Gonads', 'Genitals', 'OuterGenitals', 'Womb', 'WombFluid', 'Anus', 'OuterAnus'],
};

const WIN_DEF = {
  anus: { title: '肛门', base: { x: -28, y: -35.5, w: 56, h: 71 }, w: 112 },
  crotch: { title: 'RJW 下体', base: { x: -152, y: -139, w: 304, h: 278 }, w: 232 },
  hand: { title: '手掌 · 手指', base: { x: -180, y: -100, w: 360, h: 200 }, w: 84 },
  feet: { title: '脚掌 · 脚趾', base: { x: -150, y: -100, w: 300, h: 200 }, w: 80 },
};

/* the hand / foot window keeps both sides together: the mod draws them as one doll */
function limbParts(id) {
  const d = id === 'hand' ? DETAILS.hand : DETAILS.feet;
  return d ? d.parts : [];
}

const winEl = id => $('.dollwin[data-win="' + id + '"]');

function migrateWinSizes() {
  try {
    if (!S.wins) return;
    if (S.wins.__half2) return;
    ['hand', 'feet'].forEach(id => {
      const st = S.wins[id];
      if (st && st.w > 0) st.w = Math.max(40, Math.round(st.w / 2));
    });
    S.wins.__half2 = true;
  } catch (e) { }
}

function winState(id) {
  if (!S.wins) S.wins = {};
  if (!S.wins[id]) S.wins[id] = { x: null, y: null, w: WIN_DEF[id].w, pin: true, hidden: false, parts: {} };
  const st = S.wins[id];
  if (!st.parts) st.parts = {};
  if (!(st.w > 0)) st.w = WIN_DEF[id].w;
  // t127：手/脚窗口的**部位布局按种族画布分开存**（窗口几何仍是全局一份）。
  // 种族画布上做的手/脚调整只落在该画布（c.winOv[id].parts），不会污染别的种族。
  let c = null;
  try { c = activeCanvas(); } catch (e) { c = null; }
  if (c && c.kind === 'race') {
    if (!c.winOv) c.winOv = {};
    if (!c.winOv[id]) c.winOv[id] = {};
    const bucket = c.winOv[id];
    if (!bucket.parts) bucket.parts = {};
    return new Proxy(st, {
      get(t, k) { return k === 'parts' ? bucket.parts : t[k]; },
      set(t, k, v) { if (k === 'parts') bucket.parts = v; else t[k] = v; return true; },
      has(t, k) { return k === 'parts' || (k in t); },
    });
  }
  return st;
}

/* the actual painted rectangle of a part image, in that image's own coordinate space */
function partGlyphRect(p) {
  const a = ASSETMAP.get(p.img);
  if (!a) return null;
  const ab = a.ab || [0, 0, a.w, a.h];
  const sx = p.sx || 1, sy = p.sy || 1;
  let x0 = (ab[0] - a.w / 2) * sx, x1 = (ab[2] - a.w / 2) * sx;
  if (p.flip) { const t = -x0; x0 = -x1; x1 = t; }
  const y0 = (ab[1] - a.h / 2) * sy, y1 = (ab[3] - a.h / 2) * sy;
  return { x: p.x + Math.min(x0, x1), y: p.y + y0, w: Math.max(1, Math.abs(x1 - x0)), h: Math.max(1, y1 - y0) };
}

function unionRect(rects) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  rects.forEach(r => {
    x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
  });
  if (!Number.isFinite(x0)) return null;
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

/* full texture width that makes its opaque glyph `glyphW` wide */
function widthForGlyph(img, glyphW) {
  const a = ASSETMAP.get(img);
  if (!a) return glyphW;
  const ab = a.ab || [0, 0, a.w, a.h];
  const gw = Math.max(1, ab[2] - ab[0]);
  return glyphW * a.w / gw;
}

/* the window's coordinate box: the hand / foot window hugs both hands / both feet */
function winBase(id) {
  if (id === 'hand' || id === 'feet') {
    const rects = limbParts(id)
      .map(p => partGlyphRect({ img: p.img, x: p.x, y: p.y, sx: p.sx, sy: p.sy, flip: p.flip }))
      .filter(Boolean);
    const u = unionRect(rects);
    if (!u) return WIN_DEF[id].base;
    const pad = Math.max(3, Math.max(u.w, u.h) * 0.06);
    return { x: u.x - pad, y: u.y - pad, w: u.w + pad * 2, h: u.h + pad * 2 };
  }
  return WIN_DEF[id].base;
}

function pickRjw(c, bases) {
  if (!c) return null;
  const list = c.parts.filter(p => p.source === 'rjw' && p.rjw && bases.includes(p.rjw.base));
  return list.find(p => p.vis !== false) || list[0] || null;
}

/* the patch's own panel artwork used as the window backdrop (not a draggable part) */
function winBg(id, c) {
  if (id === 'anus') return 'HediffTab/RJW_Panel/Anus/Anus_BG';
  if (id === 'crotch') return 'HediffTab/RJW_Panel/Background/' + rjwSourceDoll(c);
  return null;
}

/* the form a canvas part currently uses (its panel placement lives there) */
function partForm(p) {
  const def = (p.rjw && p.rjw.defId) ? RJW_BY_ID.get(p.rjw.defId) : null;
  const forms = (def && def.forms) || (p.rjw && p.rjw.forms) || [];
  if (!forms.length) return null;
  const form = (p.rjw && p.rjw.form) || p.form;
  return forms.find(f => f.f === form)
    || forms.find(f => p.img && f.p && p.img.indexOf(f.p + '_') === 0)
    || forms[0];
}

/* where a part sits inside a panel box, in panel pixels.
   NHT draws a doll part with its texture centred on the part position, scaled by the
   def's width/height; the panel does the same with panelPosition / panelScale, so the
   painted pixels land at panelPosition + (alpha bbox centre - texture centre) * scale. */
function panelRect(p, box) {
  const f = partForm(p);
  if (!f || !(f.ps > 0) || !f.pp) return null;
  const a = ASSETMAP.get(p.img);
  const texW = a ? a.w : 256, texH = a ? a.h : 256;
  const ab = a && a.ab ? a.ab : [0, 0, texW, texH];
  const gcx = (ab[0] + ab[2]) / 2, gcy = (ab[1] + ab[3]) / 2;
  const x = f.pp[0] + (gcx - texW / 2) * f.ps - (box.x + box.w / 2);
  const y = f.pp[1] + (gcy - texH / 2) * f.ps - (box.y + box.h / 2);
  const w = Math.max(1, (ab[2] - ab[0]) * f.ps);
  return { x: x, y: y, w: w };
}

/* surface copies (OuterAnus / OuterGonads) are drawn in their organ's slot, so they
   borrow that part's panel placement (they carry panelScale = 0 themselves) */
const PANEL_ORGAN_OF = { OuterAnus: 'Anus', OuterGonads: 'Gonads' };

function panelRectOf(p, box, c) {
  const own = panelRect(p, box);
  if (own) return own;
  const alt = PANEL_ORGAN_OF[p.rjw && p.rjw.base];
  if (!alt || !c) return null;
  const q = c.parts.find(x => x.source === 'rjw' && x.rjw && x.rjw.base === alt);
  return q ? panelRect(q, box) : null;
}

/* ---- which sex the crotch panel shows ------------------------------------
   male: gonads + genitals (they always come together - a missing part is drawn
   from the patch's default), female: womb + vagina + ovaries, anything else:
   background only. The canvas' 性别 field wins; '*' follows the doll's anatomy. */
const DOLL_SEX = { Male: 'male', Fat: 'male', Hulk: 'male', Female: 'female', Kid: 'none' };
const SEX_SLOTS = {
  male: ['Belly', 'Gonads', 'OuterGenitals'],
  female: ['Belly', 'Ovaries', 'Genitals', 'OuterGenitals', 'Womb'],
  none: [],
};

function panelSex(c) {
  const g = String((c && c.gender) || '').trim().toLowerCase();
  if (g === 'male' || g === 'm' || g === '男') return 'male';
  if (g === 'female' || g === 'f' || g === '女') return 'female';
  if (g === 'none' || g === '无' || g === '-' || g === '0') return 'none';
  return DOLL_SEX[c && c.doll] || 'none';
}

/* a stand-in part built from the patch's own def, for "always together" */
function panelGhost(c, slot) {
  const def = (RJW_BY_DOLL.get(rjwSourceDoll(c)) || []).find(d => d.base === slot);
  if (!def) return null;
  return {
    source: 'rjw', state: 'ok', vis: true, img: def.img,
    rjw: { base: def.base, defId: def.id, form: def.form, size: def.size, has: def.has },
  };
}

/* the parts that belong in a panel box, in the patch's own draw order */
function panelParts(c, box, slots, allowGhost) {
  if (!c) return [];
  const out = [];
  slots.forEach(slot => {
    let p = c.parts.find(x => x.source === 'rjw' && x.rjw && x.rjw.base === slot
      && x.state !== 'missing' && x.rjw.has !== false);
    if (!p && allowGhost) p = panelGhost(c, slot);
    if (!p) return;
    // belly and womb fluid only exist when RJW reports some (size 0 = empty)
    if ((slot === 'Belly' || slot === 'WombFluid') && !(p.rjw.size > 0)) return;
    const r = panelRectOf(p, box, c);
    if (!r) return;
    out.push({
      key: 'rjw:' + slot,
      label: p.rjw.zh || slot,
      img: p.img,
      x: r.x, y: r.y,
      w: widthForGlyph(p.img, r.w),
    });
  });
  return out;
}

/* the default composition of a window, in its own base coordinate space */
function winBaseParts(id, c) {
  if (id === 'anus') {
    // the panel has a single anus slot: the organ draws it, the surface copy is the fallback
    const parts = panelParts(c, PANEL.anus, ['Anus']);
    return parts.length ? parts : panelParts(c, PANEL.anus, ['OuterAnus']);
  }
  if (id === 'crotch') {
    return panelParts(c, PANEL.repro, SEX_SLOTS[panelSex(c)] || [], true);
  }
  const d = limbParts(id);
  if (!d.length) return [];
  return d.map(p => {
    const [w] = imgDim(p.img);
    return {
      key: p.id, label: p.name, img: p.img,
      x: p.x, y: p.y, w: Math.max(2, w * (p.sx || 1)),
      flip: !!p.flip, detail: true,
      bid: p.bid,                       // the real body part this limb piece sits on
      def: p.id,
    };
  });
}

function winParts(id, c) {
  const st = winState(id);
  return winBaseParts(id, c).map(p => {
    const o = st.parts[p.key] || {};
    return Object.assign({}, p, {
      x: o.x != null ? o.x : p.x,
      y: o.y != null ? o.y : p.y,
      w: o.w != null ? o.w : p.w,
      rot: o.rot || 0,
      flip: o.flip != null ? o.flip : p.flip,
      bid: o.bid != null ? o.bid : p.bid,
      name: o.name != null ? o.name : (p.name || p.label || p.key),
    });
  });
}

function applyWinPartStyle(d, p, base) {
  // centre the painted pixels of the texture on (p.x, p.y), not its transparent box
  const a = ASSETMAP.get(p.img);
  let dxPct = 0, dyPct = 0;
  if (a && a.ab) {
    const gcx = (a.ab[0] + a.ab[2]) / 2, gcy = (a.ab[1] + a.ab[3]) / 2;
    dxPct = (gcx - a.w / 2) * p.w / a.w / base.w * 100;
    dyPct = (gcy - a.h / 2) * p.w / a.w / base.h * 100;
    if (p.flip) dxPct = -dxPct;      // the image is mirrored around the element centre
  }
  d.style.left = (((p.x - base.x) / base.w * 100) - dxPct) + '%';
  d.style.top = (((p.y - base.y) / base.h * 100) - dyPct) + '%';
  d.style.width = (p.w / base.w * 100) + '%';
  d.style.transform = `translate(-50%,-50%) rotate(${p.rot || 0}deg)`;
}

function renderWin(id, c) {
  const el = winEl(id), st = winState(id);
  if (!el) return;
  const base = winBase(id);
  const w = Math.round(st.w);
  const h = Math.round(w * base.h / base.w);
  el.style.width = w + 'px';
  el.style.height = (h + WIN_BAR) + 'px';
  const body = el.querySelector('.dollwin__body');
  body.innerHTML = '';
  if (!c) return;
  const bg = winBg(id, c);
  body.style.backgroundImage = bg ? `url("${imgURL(bg)}")` : 'none';
  winParts(id, c).forEach(p => {
    if (!p.img) return;
    const d = document.createElement('div');
    d.className = 'wpart';
    d.dataset.win = id;
    d.dataset.key = p.key;
    if (S.winSel && S.winSel.win === id && S.winSel.key === p.key) d.classList.add('is-sel');
    applyWinPartStyle(d, p, base);
    const im = document.createElement('img');
    im.src = imgURL(p.img);
    im.style.transform = stagePartFlip(p) ? 'scaleX(-1)' : '';
    im.draggable = false;
    im.alt = p.label || p.key;
    d.appendChild(im);
    // hit box over the painted pixels (textures carry a lot of transparent padding)
    const a = ASSETMAP.get(p.img);
    const hit = document.createElement('span');
    hit.className = 'wpart__hit';
    if (a && a.ab) {
      const gw = Math.max(0.04, (a.ab[2] - a.ab[0]) / a.w);
      const gh = Math.max(0.04, (a.ab[3] - a.ab[1]) / a.h);
      const hx = ((a.ab[0] + a.ab[2]) / 2) / a.w * 100;
      hit.style.left = (p.flip ? 100 - hx : hx) + '%';
      hit.style.top = (((a.ab[1] + a.ab[3]) / 2) / a.h * 100) + '%';
      hit.style.width = (gw * 100) + '%';
      hit.style.height = (gh * 100) + '%';
    } else {
      hit.style.left = '50%'; hit.style.top = '50%';
      hit.style.width = '100%'; hit.style.height = '100%';
    }
    d.appendChild(hit);
    body.appendChild(d);
  });
}

function applyWinPins() {
  WIN_IDS.forEach(id => {
    const el = winEl(id); if (!el) return;
    const st = winState(id);
    el.classList.toggle('is-pinned', !!st.pin);
    const use = el.querySelector('.dollwin__pin use');
    if (use) use.setAttribute('href', st.pin ? '#i-lock' : '#i-unlock');
  });
}

function layoutWins() {
  const stageEl = $('#stage');
  const W = stageEl.clientWidth, H = stageEl.clientHeight;
  const pad = 24, gap = 10, top0 = 20;
  const defaults = {};
  // one column on the right: anus -> crotch -> hands -> feet
  let y = top0;
  WIN_IDS.forEach(id => {
    const el = winEl(id);
    if (!el || el.hidden) return;
    defaults[id] = { x: W - pad - el.offsetWidth, y };
    y += el.offsetHeight + gap;
  });
  WIN_IDS.forEach(id => {
    const el = winEl(id); if (!el) return;
    const st = winState(id);
    let p = null;
    if (st.nx != null && st.ny != null) {
      // 用户拖动过：位置按舞台尺寸的比例跟随窗口缩放
      p = { x: st.nx * W, y: st.ny * H };
    } else if (st.x != null && st.y != null) {
      p = { x: st.x, y: st.y };
    } else {
      p = defaults[id];
    }
    if (!p) return;
    const x = clamp(p.x, 0, Math.max(0, W - el.offsetWidth));
    const y2 = clamp(p.y, 0, Math.max(0, H - el.offsetHeight));
    el.style.left = x + 'px';
    el.style.top = y2 + 'px';
  });
}

function syncWinChips() {
  WIN_IDS.forEach(id => {
    const chip = document.querySelector('.winchip[data-win="' + id + '"]');
    if (!chip) return;
    const has = (id === 'hand') ? !!DETAILS.hand : !!DETAILS.feet;
    chip.classList.toggle('is-on', has && !winState(id).hidden);
    chip.disabled = !has;
  });
}

function renderWins(c) {
  if (!c) return;
  // 关闭 RJW 时数据仍保留（只是隐藏），所以这里必须同时看 c.rjw
  const hasRjw = c.rjw !== false && c.parts.some(p => p.source === 'rjw');
  const anusEl = winEl('anus'), crotchEl = winEl('crotch');
  if (anusEl) anusEl.hidden = !hasRjw;
  if (crotchEl) crotchEl.hidden = !hasRjw;
  ['hand'].forEach(id => { const el = winEl(id); if (el) el.hidden = !DETAILS.hand || !!winState(id).hidden; });
  ['feet'].forEach(id => { const el = winEl(id); if (el) el.hidden = !DETAILS.feet || !!winState(id).hidden; });
  WIN_IDS.forEach(id => renderWin(id, c));
  layoutWins();
  applyWinPins();
  syncWinChips();
}

/* ---- window interactions: move, resize (aspect locked), drag inner parts ---- */
let winDrag = null;

function onWinPointerDown(e) {
  const el = e.target.closest('.dollwin');
  if (!el) return;
  const id = el.dataset.win;
  const st = winState(id);
  if (e.target.closest('.dollwin__pin')) return;
  e.preventDefault();
  e.stopPropagation();                 // 别让外框/舞台把这次点击当成"点空白"而取消选择
  const sx = e.clientX, sy = e.clientY;
  const grip = e.target.closest('.dollwin__grip');
  const partEl = e.target.closest('.wpart');
  if (grip) {
    if (st.pin) return;
    winDrag = { mode: 'resize', id, el, sx, sy, w0: st.w };
  } else if (partEl && !partEl.classList.contains('is-bg') && !st.pin) {
    const key = partEl.dataset.key;
    select(null);
    S.winSel = { win: id, key };
    S.tab = 'inspect';
    renderTabs();
    renderInspector();
    renderWins(activeCanvas());
    const base = winBase(id);
    const scale = st.w / base.w;
    const part = winParts(id, activeCanvas()).find(p => p.key === key) || { x: 0, y: 0 };
    winDrag = { mode: 'part', id, el, key, sx, sy, x0: part.x, y0: part.y, scale, partW: part.w, partImg: part.img, partRot: part.rot };
  } else {
    if (st.pin) return;
    winDrag = { mode: 'move', id, el, sx, sy, x0: el.offsetLeft, y0: el.offsetTop };
  }
  el.classList.add('is-dragging');
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
}

function onWinPointerMove(e) {
  if (!winDrag) return;
  const d = winDrag;
  const st = winState(d.id);
  const stageEl = $('#stage');
  if (d.mode === 'move') {
    const x = clamp(d.x0 + (e.clientX - d.sx), 0, Math.max(0, stageEl.clientWidth - d.el.offsetWidth));
    const y = clamp(d.y0 + (e.clientY - d.sy), 0, Math.max(0, stageEl.clientHeight - d.el.offsetHeight));
    d.el.style.left = x + 'px';
    d.el.style.top = y + 'px';
    st.x = Math.round(x); st.y = Math.round(y);
  } else if (d.mode === 'resize') {
    st.w = Math.round(clamp(d.w0 + (e.clientX - d.sx), 72, 520));
    renderWin(d.id, activeCanvas());
    layoutWins();
  } else if (d.mode === 'part') {
    const p = st.parts[d.key] || (st.parts[d.key] = {});
    p.x = Math.round((d.x0 + (e.clientX - d.sx) / d.scale) * 10) / 10;
    p.y = Math.round((d.y0 + (e.clientY - d.sy) / d.scale) * 10) / 10;
    const pel = d.el.querySelector(`.wpart[data-key="${CSS.escape(d.key)}"]`);
    if (pel) applyWinPartStyle(pel, { x: p.x, y: p.y, w: d.partW, img: d.partImg, rot: d.partRot }, winBase(d.id));
    syncWinInputs(p);
  }
}

function onWinPointerUp() {
  if (!winDrag) return;
  const drag = winDrag;
  drag.el.classList.remove('is-dragging');
  if (drag.mode === 'move') {
    const stageEl = $('#stage');
    const W = Math.max(1, stageEl.clientWidth), H = Math.max(1, stageEl.clientHeight);
    const st = winState(drag.id);
    st.nx = drag.el.offsetLeft / W;
    st.ny = drag.el.offsetTop / H;
  }
  winDrag = null;
  persist();
  pushHistory();
}

function syncWinInputs(p) {
  if (!S.winSel || !p) return;
  [['x', p.x], ['y', p.y]].forEach(([k, v]) => {
    const inp = document.querySelector(`[data-f="wp.${k}"]`);
    if (inp && document.activeElement !== inp) inp.value = round(v, 1);
  });
}


/* ---------------- 按 alpha 做命中测试（透明处不抓取）---------------- */
const ALPHA_DATA = new Map();
function alphaDataFor(path) {
  if (!path) return null;
  if (ALPHA_DATA.has(path)) return ALPHA_DATA.get(path);
  ALPHA_DATA.set(path, null);          // 占位，防止并发重复计算
  Promise.resolve().then(async () => {
    let out = null;
    try {
      const im = await loadTextureEl(path);
      // 贴图还没载入时 imgURL 会给出 1×1 占位图：不要缓存这种结果，等下次重新算
      if (im && im.naturalWidth > 1 && im.naturalHeight > 1) {
        const cv = document.createElement('canvas');
        cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        const g = cv.getContext('2d');
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        const a = new Uint8Array(cv.width * cv.height);
        for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
        out = { w: cv.width, h: cv.height, a };
      }
    } catch (e) { out = null; }
    if (out) ALPHA_DATA.set(path, out);
    else ALPHA_DATA.delete(path);          // 没读到就删掉占位，下次再试
  });
  return null;
}

/* 指针是否落在该部位"画得出来的像素"上；没有 alpha 数据时返回 true（退回旧行为） */
function partPixelSolid(p, clientX, clientY) {
  if (!p || !p.img) return true;
  // 以"判定框"为准：
  //   有自定义判定框 → 用它；没有 → 用贴合后的可见框(visBox)（贴图透明边不算）
  let box = (p.hbox && p.hbox.w > 4 && p.hbox.h > 4) ? p.hbox : null;
  if (!box) {
    try {
      const vb = visBox(p);
      if (vb && vb.w > 2 && vb.h > 2) box = { dx: vb.dx, dy: vb.dy, w: vb.w, h: vb.h };
    } catch (e) { }
  }
  const bp = boardPoint(clientX, clientY);
  const lp = toPartLocal(p, bp.x, bp.y);
  if (box) {
    return Math.abs(lp.x - (box.dx || 0)) <= box.w / 2
        && Math.abs(lp.y - (box.dy || 0)) <= box.h / 2;
  }
  // 兜底：连可见框都还没有（贴图没加载完）→ 先当实体，避免点不到
  return true;
}


/* 指针落在某个部位上：如果那一点是透明的，就继续往下一层找（不会卡住"只能点最上面那个"） */
function partAtPoint(clientX, clientY) {
  let el = document.elementFromPoint(clientX, clientY);
  for (let guard = 0; guard < 8 && el; guard++) {
    const pn = el.closest ? el.closest('#partsLayer .part') : null;
    if (!pn) return null;
    const p = byUid(pn.dataset.uid);
    if (!p) return null;
    if (partPixelSolid(p, clientX, clientY)) return p;
    const prev = pn.style.pointerEvents;
    pn.style.pointerEvents = 'none';
    const next = document.elementFromPoint(clientX, clientY);
    pn.style.pointerEvents = prev;
    el = next;
  }
  return null;
}


/* 头发（主层 / 后层）元素在该点是否不透明（和部位一样按 alpha 判断，避免挡住下面的东西） */
function hairSolidAt(hp, clientX, clientY) {
  const c = activeCanvas();
  if (!c || !hp || hp.style.display === 'none') return false;
  const path = hp.id === 'hairBackPreview' ? backHairOf(c) : c.hairPreviewImg;
  if (!path) return false;
  const r = hp.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return false;

  const ad = ALPHA_DATA.get(path) || alphaDataFor(path);
  if (!ad || ad.w <= 1 || ad.h <= 1) return true;         // 还没读到 alpha 就先当实体

  const [iw, ih] = imgDim(path);
  if (!(iw > 0) || !(ih > 0)) return true;

  // 头发元素被裁到"可见像素框"：背景按 size 放大，再按框左上角偏移
  const bgRaw = String(hp.style.backgroundSize || '');
  let sx, sy, boxX0, boxY0;
  if (bgRaw.includes('%') || !parseFloat(bgRaw)) {
    // 没裁过（整张图铺满元素）
    sx = r.width / iw; sy = r.height / ih;
    boxX0 = 0; boxY0 = 0;
  } else {
    const bgSize = parseFloat(bgRaw);
    sx = bgSize / iw; sy = bgSize / ih;
    const bp = String(hp.style.backgroundPosition || '0px 0px').split(/\s+/);
    const posX = parseFloat(bp[0]) || 0;
    const posY = parseFloat(bp[1]) || 0;
    boxX0 = -posX / sx; boxY0 = -posY / sy;
  }

  const imgX = boxX0 + (clientX - r.left) / sx;
  const imgY = boxY0 + (clientY - r.top) / sy;
  const ax = Math.round(imgX * ad.w / iw);
  const ay = Math.round(imgY * ad.h / ih);
  if (ax < 0 || ay < 0 || ax >= ad.w || ay >= ad.h) return false;
  return ad.a[ay * ad.w + ax] > 8;
}

/* 指针下最上层"真正可见"的东西：部位 或 头发预览；都没有就返回 null */

/* ---------------- 头发拖动模式：画面上任意处拖动都移动头发 ---------------- */
let HAIR_MODE = false;
let HAIR_MODE_TARGET = 'preview';       // 'preview' = HAR 头发预览, 'ref' = 素材参考头发
function hairModeChip() { return document.querySelector('[data-act="hair-mode"]'); }
function hairModeAvailable(target, c) {
  c = c || activeCanvas();
  if (!c) return false;
  if (target === 'ref') return !!(HAIR_REF && HAIR_REF.img && HAIR_REF.vis !== false);
  return !!c.hairPreviewImg;
}
function setHairMode(on, target) {
  const c = activeCanvas();
  if (target) HAIR_MODE_TARGET = target;
  if (on && !hairModeAvailable(HAIR_MODE_TARGET, c)) {
    toast(HAIR_MODE_TARGET === 'ref' ? '这张画布没有参考头发（先在素材里点一个发型）' : '这张画布还没有选预览头发', true);
    return;
  }
  HAIR_MODE = !!on;
  const chip = hairModeChip();
  if (chip) chip.classList.toggle('is-on', HAIR_MODE);
  document.body.classList.toggle('is-hairmode', HAIR_MODE);
  if (HAIR_MODE) {
    if (HAIR_MODE_TARGET === 'preview' && c) { c.hairPreviewShow = true; c.hairFitEnabled = true; }
    renderStage();
  }
  toast(HAIR_MODE
    ? (HAIR_MODE_TARGET === 'ref'
      ? '参考头发拖动模式：画面上任意位置拖动都移动参考头发（再点一次「头发」关闭）'
      : 'HAR 头发拖动模式：画面上任意位置拖动都移动预览头发（再点一次「头发」关闭）')
    : '已退出头发拖动模式');
}

function openHairModeMenu() {
  const c = activeCanvas();
  if (HAIR_MODE) { setHairMode(false); return; }
  const okRef = hairModeAvailable('ref', c);
  const okPrev = hairModeAvailable('preview', c);
  openModal(`
    <div class="modal__head"><span class="idx">HAIR</span><h3>移动哪一层头发</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note">开启后在画面上任意位置拖动即可，不受其他部位遮挡影响；再点一次「头发」关闭。</p>
      <div class="rowline" style="margin:6px 0 10px">
        <button class="btn btn--sm${okPrev ? '' : ' is-disabled'}" data-act="hair-mode-preview" ${okPrev ? '' : 'disabled'}>
          ${icon('eye')}移动 HAR 头发预览</button>
        <button class="btn btn--sm${okRef ? '' : ' is-disabled'}" data-act="hair-mode-ref" ${okRef ? '' : 'disabled'}>
          ${icon('layers')}移动 参考头发</button>
      </div>
      <p class="mini-note">发型预览：${okPrev ? '已选 ' + esc(c.hairPreviewImg) : '这张画布还没选（点「选择预览头发」）'}</p>
      <p class="mini-note">参考头发：${okRef ? '已放 ' + esc(HAIR_REF.img) : '这张画布没有（在素材里点一个发型）'}</p>
    </div>`);
}

function pickAt(clientX, clientY) {
  const zOf = el => {
    if (!el) return 0;
    const z = parseInt(getComputedStyle(el).zIndex, 10);
    return Number.isFinite(z) ? z : 0;
  };
  const hp = document.getElementById('hairPreview');
  const hairZ = zOf(hp);
  const hairHere = hairSolidAt(hp, clientX, clientY);

  let el = document.elementFromPoint(clientX, clientY);
  for (let guard = 0; guard < 10 && el; guard++) {
    const hairEl = el.closest ? el.closest('#hairPreview, #hairBackPreview, .hairprev') : null;
    if (hairEl) {
      if (hairSolidAt(hairEl, clientX, clientY)) return { type: 'hair' };
      const prev = hairEl.style.pointerEvents;
      hairEl.style.pointerEvents = 'none';
      const next = document.elementFromPoint(clientX, clientY);
      hairEl.style.pointerEvents = prev;
      el = next;
      continue;
    }
    const pn = el.closest ? el.closest('#partsLayer .part') : null;
    if (!pn) return null;                                  // 到空白了
    const p = byUid(pn.dataset.uid);
    if (!p) return null;
    const solid = partPixelSolid(p, clientX, clientY);
    if (solid) return { type: 'part', p };
    const prev = pn.style.pointerEvents;
    pn.style.pointerEvents = 'none';
    const next = document.elementFromPoint(clientX, clientY);
    pn.style.pointerEvents = prev;
    el = next;
  }
  if (hairHere) return { type: 'hair' };
  return null;
}

function variantPartRec(v, uid) {
  if (!v || !v.parts) return null;
  const r = v.parts[uid];
  if (!r) return null;
  return (typeof r === 'string') ? { img: r } : r;
}

/* ---- t52：异种专属部位 ----
   只属于某一个异种、不覆盖基础画布的部位。数据存 v.extraParts[uid]，与
   v.parts[uid]（覆盖基础部位）语义分开：老工程没有 extraParts 字段 = 空，零迁移。
   uid 一定不是 c.parts / c.detached 里的 uid，所以两边不会互相覆盖。 */
function variantExtraMap(v) {
  if (!v) return {};
  if (!v.extraParts || typeof v.extraParts !== 'object' || Array.isArray(v.extraParts)) v.extraParts = {};
  return v.extraParts;
}

function variantExtraRec(v, uid) {
  const m = v && v.extraParts;
  return (m && typeof m === 'object' && m[uid]) ? m[uid] : null;
}

/* 统一取记录：先看覆盖基础部位的 parts，再看异种专属的 extraParts */
function variantRecAny(v, uid) {
  return variantPartRec(v, uid) || variantExtraRec(v, uid);
}

function variantIsExtraUid(v, uid) {
  if (!variantExtraRec(v, uid)) return false;
  const c = activeCanvas();
  return !((c && c.parts) || []).some(p => p && p.uid === uid);
}

/* t58：异种专属部位改成「完整部位形状」的记录（与 c.parts 的元素同构）。
   这里把旧记录就地升级成完整形状并返回**存储对象本身** —— 检查器的 data-f 直接写它，
   就等于写工程数据，不需要再回写一层包装。 */
function variantExtraPart(v, uid) {
  const m = v && v.extraParts;
  const r = (m && typeof m === 'object') ? m[uid] : null;
  if (!r) return null;
  if (r.uid == null) r.uid = uid;
  // t55 及更早：选中的游戏部位 defName 存在 name 里；升级时拆成 defName + 显示名
  if (r.defName == null) r.defName = String(r.name || '').trim();
  if (r.name == null || r.name === '') r.name = '';
  if (r.id == null) r.id = '';
  if (!Number.isFinite(r.layer)) r.layer = 15;
  if (!Number.isFinite(r.x)) r.x = 0;
  if (!Number.isFinite(r.y)) r.y = 0;
  if (!Number.isFinite(r.sx)) r.sx = 1;
  if (!Number.isFinite(r.sy)) r.sy = 1;
  if (!Number.isFinite(r.rot)) r.rot = 0;
  if (r.flip == null) r.flip = false;
  if (!Array.isArray(r.hb)) r.hb = Array.isArray(r.hbScale) ? r.hbScale : [0.9, 0.9];
  if (r.vis == null) r.vis = true;
  r.source = 'variant-extra';
  r.kind = r.kind || 'custom';
  return r;
}

/* 把异种专属记录包装成「部位」对象，供 partEl / 调整面板 / 列表复用 */
function variantExtraAsPart(v, uid) {
  const live = variantExtraPart(v, uid);
  if (live) return live;   // t58：完整形状的记录就是部位对象，编辑直接落到工程数据
  const r = variantExtraRec(v, uid) || {};
  const hb = Array.isArray(r.hb) ? r.hb : null;
  return {
    uid,
    img: r.img || '',
    grayImg: r.gray || '',
    name: r.name || r.label || uid,
    nameEn: r.nameEn || r.name || '',
    id: r.name || uid,
    kind: 'custom',
    source: 'variant-extra',
    layer: Number.isFinite(r.layer) ? r.layer : 20,
    x: Number.isFinite(r.x) ? r.x : 0,
    y: Number.isFinite(r.y) ? r.y : 0,
    sx: Number.isFinite(r.sx) ? r.sx : 1,
    sy: Number.isFinite(r.sy) ? r.sy : 1,
    rot: Number.isFinite(r.rot) ? r.rot : 0,
    flip: !!r.flip,
    hb: hb || (Array.isArray(r.hbScale) ? r.hbScale : null),
    hbox: r.hbox || null,
    vis: r.vis !== false,
  };
}

function variantExtraParts(v) {
  if (!v) return [];
  return Object.keys(variantExtraMap(v)).map(uid => variantExtraAsPart(v, uid)).filter(p => p.img);
}

/* 覆盖计数：基础部位覆盖 + 异种专属部位（后者也属于「覆盖」，只是没有基础部位） */
function variantOverCount(v) {
  return Object.keys((v && v.parts) || {}).length + Object.keys((v && v.extraParts) || {}).length;
}

/* 从「异种」页的调整点进「部位」页时：把当前异种的 rec 当成可编辑几何 */
function variantPreviewImage(p) {
  try {
    if (!p || S.tab !== 'variant') return '';
    const c = activeCanvas();
    if (!c) return '';
    const r = variantPartRec(variantState(c), p.uid);
    return (r && r.img) ? r.img : '';
  } catch (e) { return ''; }
}

function stagePartGeom(p) {
  const base = { x: p.x, y: p.y, sx: p.sx, sy: p.sy };
  try {
    if (S.tab !== 'variant') return base;
    const c = activeCanvas();
    if (!c) return base;
    const r = variantRecAny(variantState(c), p.uid);
    if (!r) return base;
    return {
      x: Number.isFinite(r.x) ? r.x : p.x,
      y: Number.isFinite(r.y) ? r.y : p.y,
      sx: Number.isFinite(r.sx) ? r.sx : p.sx,
      sy: Number.isFinite(r.sy) ? r.sy : p.sy,
    };
  } catch (e) { return base; }
}

function stagePartImage(p) {
  const over = variantPreviewImage(p);
  if (over) return over;
  if (p.state === 'prosthetic' && p.prosth) return p.prosth.img;
  return p.img;
}

function stagePartRec(p) {
  try {
    if (S.tab !== 'variant') return null;
    const c = activeCanvas();
    return c ? variantRecAny(variantState(c), p.uid) : null;
  } catch (e) { return null; }
}
function stagePartRot(p) {
  const r = stagePartRec(p);
  return (r && Number.isFinite(r.rot)) ? r.rot : (p.rot || 0);
}
function stagePartFlip(p) {
  const r = stagePartRec(p);
  return !!(r && r.flip != null ? r.flip : p.flip);
}

function partEl(p, z) {
  const empty = !p.img;
  const pimg = stagePartImage(p);
  const g = stagePartGeom(p);
  const [w, h] = empty ? [46, 46] : imgDim(pimg || p.img);
  // 异种贴图不在 CUSTOM/EXT 里时先量真实尺寸，量完 loadTextureEl 会重绘
  if (!empty && pimg && !CUSTOM.has(pimg) && !ASSETMAP.has(pimg) && !EXT.has(pimg) && !NAT_DIM.has(pimg)) {
    try { loadTextureEl(pimg); } catch (e) { }
  }
  const el = document.createElement('div');
  el.className = 'part' + (p.uid === S.sel ? ' is-selected' : '') + (p.locked ? ' is-locked' : '');
  el.classList.add(isOuterPart(p) ? 'is-outer' : 'is-inner');
  if (empty) el.classList.add('part--empty');
  el.dataset.uid = p.uid;
  el.dataset.kind = p.kind;
  el.style.width = (w * (empty ? 1 : g.sx)) + 'px';
  el.style.height = (h * (empty ? 1 : g.sy)) + 'px';
  const cv0 = activeCanvas();
  // 层级用 layer 换算（和头发预览同一套坐标），同一层里再按排序序号微调，保证前后顺序稳定
  const layerZ = (Number(p.layer) || 0) * 10 + ((z || 0) % 10);
  el.style.zIndex = String((p.overHair && cv0) ? (10000 + (z || 0)) : layerZ);
  el.style.transform = `translate(-50%,-50%) translate(${g.x}px,${g.y}px) rotate(${stagePartRot(p)}deg)`;
  if (p.state === 'missing') el.classList.add('is-missing');
  if (p.state === 'hurt') el.classList.add('part--hurt');

  if (empty) {
    el.innerHTML = `<span class="part__ph">${icon('plus')}<i>${esc(p.name || '新部位')}</i></span>`;
  } else {
    const im = document.createElement('img');
    im.src = imgURL(pimg || p.img);
    im.alt = p.name;
    im.draggable = false;
    im.style.transform = stagePartFlip(p) ? 'scaleX(-1)' : '';
    el.appendChild(im);
  }

  if (p.hairTint && cv0 && cv0.hairTintPartsSync !== false && cv0.hairTintShow !== false) {
    const ht = document.createElement('div');
    ht.className = 'tint';
    ht.style.background = cv0.hairTint || '#c8b48a';
    ht.style.mixBlendMode = 'multiply';
    const murl = `url("${imgURL(pimg || p.img)}")`;
    ht.style.webkitMaskImage = murl;
    ht.style.maskImage = murl;
    if (p.mask) {
      const mk = p.mask, srcPath = (pimg || p.img);
      ht.dataset.maskKey = mk;
      el.dataset.maskKey = mk;
      maskAlphaURL(srcPath, mk).then(u => {
        if (!u || !ht.isConnected || el.dataset.maskKey !== mk) return;
        ht.style.webkitMaskImage = `url("${u}")`;
        ht.style.maskImage = `url("${u}")`;
      });
    }
    el.appendChild(ht);
  }

  if (p.state === 'hurt') {
    const tier = woundTier(p.sev);
    const wow = WOUNDS[p.wound] || WOUNDS.cut;
    // 整块部位染色（按严重度加深），NHT 就是这样做受伤部位的血色
    const tint = document.createElement('div');
    tint.className = 'tint';
    tint.style.background = tier.color;
    const maskURL = `url("${imgURL(p.img)}")`;
    tint.style.webkitMaskImage = maskURL;
    tint.style.maskImage = maskURL;
    el.appendChild(tint);

    // 伤口贴图：以部位的较小边为基准铺开（原来的 34% 固定值会显得没显示全）
    const wd = document.createElement('div');
    wd.className = 'wound';
    const [pw, ph] = imgDim(p.img);
    const base = Math.min(pw * p.sx, ph * p.sy);
    const size = Math.max(12, base * (0.55 + tier.k));   // 55%~110% 的较小边
    const i = document.createElement('i');
    i.style.width = size + 'px';
    i.style.height = size + 'px';
    i.style.left = '50%';
    i.style.top = '50%';
    i.style.transform = 'translate(-50%,-50%)';
    i.style.color = p.wound === 'scar' ? 'rgba(150,146,140,.95)' : tier.color;
    i.style.opacity = p.wound === 'scar' ? '0.95' : String(0.45 + 0.5 * (p.sev / 100));
    i.style.webkitMaskImage = `url("${imgURL(woundIcon(p.wound, p.sev))}")`;
    i.style.maskImage = `url("${imgURL(woundIcon(p.wound, p.sev))}")`;
    wd.appendChild(i);
    el.appendChild(wd);
  }
  if (p.bandage && BANDAGES[p.bandage]) {
    const bd = document.createElement('div');
    bd.className = 'band';
    const src = `url("${imgURL(BANDAGES[p.bandage])}")`;
    bd.style.background = 'currentColor';
    bd.style.color = 'rgba(246,226,150,.95)';
    bd.style.webkitMaskImage = src; bd.style.maskImage = src;
    bd.style.opacity = p.bandage.indexOf('bad') === 0 ? '.82' : '.95';
    el.appendChild(bd);
  }
  if (p.state === 'missing') {
    const cr = document.createElement('div');
    cr.className = 'cross';
    cr.style.setProperty('--mask', `url("${imgURL('HediffTab/Common/MissingCross')}")`);
    el.appendChild(cr);
  }
  return el;
}



/* 拖动/改数值时也让"超出"提醒立刻更新（不用切画布） */
let ovTimer = 0;
function refreshOverflowBadges() {
  const c = activeCanvas();
  if (!c) return;
  const dr = $('#dispRect');
  if (dr && !dr.hidden) {
    const d = c.displayBox;
    const ovD = overflowParts(c, 'display');
    const outD = ovD.list.length;
    dr.classList.toggle('is-bad', outD > 0);
    const sides = new Set();
    ovD.list.forEach(o => Object.keys(o.over).forEach(k => o.over[k] && sides.add(k)));
    const dirL = { left: '左', right: '右', top: '上', bottom: '下' };
    const lab = dr.querySelector('.dbounds__lab');
    if (lab) lab.textContent = `实际显示 ${round(d.w, 0)} × ${round(d.h, 0)}` + (d.locked ? ' · 已固定' : '') +
      (outD ? `  ·  ⚠ ${outD} 个部位超出${[...sides].map(x => dirL[x]).join('/')}边` : '');
  }
}
function scheduleOverflowRefresh() {
  if (ovTimer) return;
  ovTimer = requestAnimationFrame(() => { ovTimer = 0; try { refreshOverflowBadges(); } catch (e) { } });
}

/* t114：部位蒙版（遮罩）—— 导入后存成「<贴图key>_m」，游戏端 AddonMaskOf 按同名查找 */
function partMaskKey(p) {
  if (!p) return '';
  if (p.mask) return p.mask;
  return p.img ? (String(p.img) + '_m') : ('Custom/NHTCD_Mask/' + (p.uid || 'part'));
}
function pickMaskForPart(p) {
  if (!p) return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/png,image/*';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const url = await new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => res('');
      fr.readAsDataURL(f);
    });
    if (!url) { toast('读取图片失败'); return; }
    const im = await new Promise(res => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = url;
    });
    if (!im) { toast('图片格式不支持，请用 PNG'); return; }
    const cv = document.createElement('canvas');
    cv.width = im.naturalWidth || im.width;
    cv.height = im.naturalHeight || im.height;
    cv.getContext('2d').drawImage(im, 0, 0);
    const data = cv.toDataURL('image/png');
    const key = partMaskKey({ img: p.img, uid: p.uid });
    let ok = false;
    try { ok = await apiSave('to=texture&key=' + encodeURIComponent(key), data); } catch (e) { ok = false; }
    if (!ok) { toast('保存失败：需要本地服务器（exe）在运行'); return; }
    p.mask = key;
    try { if (DISK_TEX_KEYS) DISK_TEX_KEYS.add(key); } catch (e) { }
    try { loadTextureEl(key); } catch (e) { }
    renderInspector(); renderStage(); pushHistory(); persist();
    toast('蒙版已导入：' + key.split('/').pop());
  };
  inp.click();
}
function paintPart(p) {
  scheduleOverflowRefresh();
  const el = document.querySelector(`.part[data-uid="${CSS.escape(p.uid)}"]`);
  if (!el) return;
  if (!p.img) {
    el.style.transform = `translate(-50%,-50%) translate(${p.x}px,${p.y}px) rotate(${p.rot || 0}deg)`;
    return;
  }
  const pimg = stagePartImage(p);
  const g = stagePartGeom(p);
  const [w, h] = imgDim(pimg || p.img);
  el.style.width = (w * g.sx) + 'px';
  el.style.height = (h * g.sy) + 'px';
  el.style.transform = `translate(-50%,-50%) translate(${g.x}px,${g.y}px) rotate(${stagePartRot(p)}deg)`;
  const im = el.querySelector('img');
  if (im) {
    im.src = imgURL(pimg || p.img);
    im.style.transform = stagePartFlip(p) ? 'scaleX(-1)' : '';
  }
}
function partZ(p) {
  const c = activeCanvas(); if (!c) return 0;
  const list = sortParts(c.parts.filter(x => x.vis !== false));
  return list.indexOf(p);
}
function reorderStage() {
  const c = activeCanvas(); if (!c) return;
  const list = sortParts(c.parts.filter(p => p.vis !== false));
  list.forEach(p => {
    const el = document.querySelector(`.part[data-uid="${CSS.escape(p.uid)}"]`);
    if (el) el.style.zIndex = String((i + 1) * 10);
  });
}

/* ---------- view ---------- */
function applyView() {
  const b = $('#board');
  b.style.transform = `translate(${S.view.px}px,${S.view.py}px) scale(${S.view.z})`;
  const zl = $('#zoomLabel');
  if (zl) zl.textContent = Math.round(S.view.z * 100) + '%';
  renderOverlay();
}
function fitView() {
  S.view.userZoom = false;
  const c = activeCanvas(); if (!c) return;
  const stage = $('#stage');
  const W = stage.clientWidth, H = stage.clientHeight;
  const b = canvasBounds(c);
  const pad = 76;
  const z = clamp(Math.min((W - pad * 2) / b.w, (H - pad * 2) / b.h), 0.08, 2.4);
  S.view.z = z;
  S.view.px = -(b.x + b.w / 2) * z;
  S.view.py = -(b.y + b.h / 2) * z;
  applyView();
}
function zoomAt(nz, clientX, clientY) {
  S.view.userZoom = true;
  const stage = $('#stage');
  const r = stage.getBoundingClientRect();
  nz = clamp(nz, 0.06, 4);
  S.userZoomed = true;
  const bx = (clientX - r.left - r.width / 2 - S.view.px) / S.view.z;
  const by = (clientY - r.top - r.height / 2 - S.view.py) / S.view.z;
  S.view.z = nz;
  S.view.px = clientX - r.left - r.width / 2 - bx * nz;
  S.view.py = clientY - r.top - r.height / 2 - by * nz;
  applyView();
}
function boardPoint(clientX, clientY) {
  const r = $('#stage').getBoundingClientRect();
  return {
    x: (clientX - r.left - r.width / 2 - S.view.px) / S.view.z,
    y: (clientY - r.top - r.height / 2 - S.view.py) / S.view.z
  };
}

/* ---------- selection overlay ---------- */
function renderOverlay() {
  scheduleHarBadgeRefresh();
  const ov = $('#overlay');
  const z = S.view.z;
  let out = '';

  if (S.flags.hitbox) {
    const c = activeCanvas();
    if (c) c.parts.forEach(p => {
      if (!p.vis || p.raceOff) return;
      if (p.uid === S.sel) return;              // the selected one gets handles below
      // 器官 / 骨骼：只有点开对应图层（器官 / 骨骼按钮）时才画命中框
      if ((p.kind === 'organ' || p.kind === 'bone') && S.kinds[p.kind] === false) return;
      // RJW 关闭时这些部位并没有画出来，不能只留一个空命中框
      if (c.rjw === false && p.source === 'rjw') return;
      if (isWindowOnly(p)) return;
      const q = hitQuad(p);          // 命中框模式：画真正的判定框（自定义值），不是可见框
      out += `<polygon class="hit" data-uid="${esc(p.uid)}" data-name="${esc(p.name)}" points="${q.map(pt => pt.map(v => round(v, 1)).join(',')).join(' ')}"/>`;
    });
  }

  // armor / notify icons live where the def's <notifyPosition> says: draw them so they can
  // be placed per part (a new wing or ear needs its own badge spot)
  if (S.flags.icons) {
    const c = activeCanvas();
    const organOn = S.kinds.organ === true, boneOn = S.kinds.bone === true;
    if (c) c.parts.forEach(p => {
      if (!p.vis || p.raceOff || isWindowOnly(p)) return;
      // RJW 关闭时这些部位并没有画出来，图标也不能留
      if (c.rjw === false && p.source === 'rjw') return;
      // 护甲图标联动器官/骨骼：打开哪个就只显示哪个；都没开只显示外形
      if (organOn || boneOn) {
        if (!((p.kind === 'organ' && organOn) || (p.kind === 'bone' && boneOn))) return;
      } else if (p.kind === 'organ' || p.kind === 'bone') return;
      const armorOn = !(p.armor === false || (p.armor == null && !defaultArmorFor(p)));
      const ix = p.x + (p.nx || 0), iy = p.y + (p.ny || 0);
      const s = 6 / z;
      out += `<g class="ico${p.uid === S.sel ? ' is-on' : ''}${armorOn ? '' : ' is-off'}" data-ico="${p.uid}">`
        + `<line class="ico__l" x1="${round(p.x, 1)}" y1="${round(p.y, 1)}" x2="${round(ix, 1)}" y2="${round(iy, 1)}"/>`
        + `<image href="${imgURL('HediffTab/Common/ArmorIcon')}" x="${round(ix - s, 2)}" y="${round(iy - s, 2)}" width="${round(s * 2, 2)}" height="${round(s * 2, 2)}"/>`
        + `<title>${esc(p.name)} · 图层 ${p.layer} · 护甲图标：${armorOn ? "开" : "关"}（右键切换）</title>`
        + `<circle class="ico__hit" cx="${round(ix, 1)}" cy="${round(iy, 1)}" r="${round(s * 2.6, 2)}"/>`
        + `<circle class="ico__h" cx="${round(ix, 1)}" cy="${round(iy, 1)}" r="${round(s * 1.5, 2)}"/></g>`;
    });
  }

  const p = selPart();
  const selHiddenKind = p && (p.kind === 'organ' || p.kind === 'bone') && S.kinds[p.kind] === false;
  if (p && !p.raceOff && !isDetached(p) && S.flags.hitbox && !selHiddenKind) {
    const q = hitQuad(p);
    out += `<polygon class="hit is-on" points="${q.map(pt => pt.map(v => round(v, 1)).join(',')).join(' ')}"/>`;
    const s = 4.5 / z;
    q.forEach(([x, y], i) => {
      out += `<rect class="hit-h" data-hh="${i}" x="${round(x - s, 2)}" y="${round(y - s, 2)}" width="${round(s * 2, 2)}" height="${round(s * 2, 2)}" rx="${round(1 / z, 2)}"/>`;
    });
    // 判定框固定居中：不再提供“整块拖动”的圆点（游戏里没有偏移字段）
  }

  // a locked part never shows a frame (and icon mode is about the badges, not the outline)
  if (p && !isDetached(p) && !p.locked && !S.flags.icons && !S.flags.hitbox) {
    const q = visQuad(p);           // 选框贴住可见像素，透明边不算
    const pts = q.map(pt => round(pt[0], 1) + ',' + round(pt[1], 1)).join(' ');
    out += `<polygon class="sel-box" points="${pts}"/>`;
    if (!S.flags.hitbox) {
      const s = 4 / z;
      q.forEach(([x, y], i) => {
        out += `<rect class="sel-h" data-handle="${i}" x="${round(x - s, 2)}" y="${round(y - s, 2)}" width="${round(s * 2, 2)}" height="${round(s * 2, 2)}" rx="${round(1.2 / z, 2)}"/>`;
      });
      const topX = (q[0][0] + q[1][0]) / 2, topY = (q[0][1] + q[1][1]) / 2;
      const dy = 26 / z;
      out += `<line class="sel-line" x1="${topX}" y1="${topY}" x2="${topX}" y2="${topY - dy}"/>`;
      out += `<circle class="rot" data-rot="1" cx="${topX}" cy="${topY - dy}" r="${round(4.5 / z, 2)}"/>`;
    }
  }
  if (S.guides) {
    S.guides.forEach(g => {
      out += g === 'x'
        ? `<line class="guide" x1="0" y1="-2000" x2="0" y2="2000"/>`
        : `<line class="guide" x1="-2000" y1="0" x2="2000" y2="0"/>`;
    });
  }
  ov.innerHTML = out;
}

function renderSelInfo() {
  const el = $('#selInfo');
  const p = selPart();
  if (!p) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  const [w, h] = imgDim(p.img);
  el.innerHTML = `<b>${esc(partDisplayName(p))}</b>
    <span>#${p.bid >= 0 ? p.bid : '—'}</span>
    <span>L${p.layer}</span>
    <span>${round(p.x, 1)}, ${round(p.y, 1)}</span>
    <span>${round(p.sx * 100, 0)}%</span>
    <span style="color:#5d6569">${w}×${h}</span>`;
}

function renderKindChips() {
  $$('.stage__bar .chip').forEach(ch => {
    const f = ch.dataset.flag, k = ch.dataset.kind;
    if (f) ch.classList.toggle('is-on', !!S.flags[f]);
    if (k) ch.classList.toggle('is-on', S.kinds[k] !== false);
  });
  const sw = $('#rjwChip');
  if (sw) {
    const c = activeCanvas();
    sw.classList.toggle('is-on', !!(c && c.rjw));
    sw.disabled = !RJW_PARTS.length;
    sw.style.opacity = RJW_PARTS.length ? '' : '.45';
  }
}

/* ==========================================================================
   RENDER: inspector
   ========================================================================== */

/* 记住哪些折叠是展开的：面板重绘（自动同步）后恢复，否则一展开就又被收回 */
const OPEN_FOLDS = new Set();
function foldKey(d) {
  const sm = d.querySelector('summary');
  return sm ? ('f:' + sm.textContent.trim()) : '';
}
function snapshotFolds(pane) {
  if (!pane) return;
  pane.querySelectorAll('details').forEach(d => {
    const k = foldKey(d);
    if (!k) return;
    if (d.open) OPEN_FOLDS.add(k); else OPEN_FOLDS.delete(k);
  });
}
function restoreFolds(pane) {
  if (!pane) return;
  pane.querySelectorAll('details').forEach(d => {
    const k = foldKey(d);
    if (!k) return;
    if (OPEN_FOLDS.has(k)) d.open = true;
    if (!d.dataset.foldBound) {
      d.dataset.foldBound = '1';
      d.addEventListener('toggle', () => {
        const key = foldKey(d);
        if (!key) return;
        if (d.open) OPEN_FOLDS.add(key); else OPEN_FOLDS.delete(key);
      });
    }
  });
}

function renderInspector() {
  const pane = $('#paneInspect');
  snapshotFolds(pane);                    // 记住当前展开的折叠
  if (S.winSel) {
    pane.innerHTML = winPartInspector();
    restoreFolds(pane);
    renderKindChips();
    return;
  }
  const p = S.tab === 'global' ? null : selPart();
  pane.innerHTML = p ? partInspector(p) : canvasInspector(activeCanvas());
  pane.classList.toggle('is-part', !!p);
  restoreFolds(pane);
  scheduleHarBadgeRefresh();
  if (!p) enhanceGlobalFolds(pane);
  renderKindChips();
}

function enhanceGlobalFolds(pane) {
  if (!pane) return;
  if (!S.ui.globalOpen) S.ui.globalOpen = {};
  const saved = S.ui.globalOpen;
  const secs = [...pane.querySelectorAll(':scope > .sec')];
  secs.forEach(sec => {
    const head = sec.querySelector('.sec__h');
    if (!head) return;
    const title = String((head.querySelector('b') || {}).textContent || '').trim();
    if (!title) return;
    const isCore = /画布/.test(title);
    const open = Object.prototype.hasOwnProperty.call(saved, title) ? !!saved[title] : isCore;
    const det = document.createElement('details');
    det.className = 'gfold' + (isCore ? ' gfold--core' : '');
    det.open = open;
    const sum = document.createElement('summary');
    sum.appendChild(head);
    const body = document.createElement('div');
    body.className = 'gfold__body';
    while (sec.firstChild) body.appendChild(sec.firstChild);
    det.appendChild(sum);
    det.appendChild(body);
    sec.replaceWith(det);
    det.addEventListener('toggle', () => { saved[title] = det.open; });
  });
}

function winPartInspector() {
  const { win, key } = S.winSel;
  const def = WIN_DEF[win];
  const p = winParts(win, activeCanvas()).find(x => x.key === key);
  if (!def || !p) return `<div class="empty"><b>窗口部位已不存在</b><p>它可能随画布切换被移除了。</p></div>`;
  const c = activeCanvas();
  const orig = origDefsByBid(c).get(p.bid);
  return `
  <div class="selhead">
    <div class="selhead__badge">${esc(String(p.bid >= 0 ? p.bid : '＋'))}</div>
    <div class="selhead__t"><b>${esc(p.name || p.label || key)}</b><span>${esc(def.title)} · ${esc(key)}</span></div>
    <span class="pill pill--a">窗内部件</span>
  </div>

  <div class="rowline" style="margin:0 0 6px">
    <button class="btn btn--xs" data-act="global-props">${icon('layers')}全局属性</button>
    <button class="btn btn--xs" data-act="win-sel-clear">${icon('x')}取消选择</button>
  </div>

  <div class="sec">
    <div class="sec__h"><b>标识 IDENTITY</b></div>
    <div class="field"><label>名称</label><div class="ctl">
      <input class="inp inp--txt" data-f="wp.name" value="${esc(p.name || p.label || key)}" spellcheck="false">
    </div></div>
    <div class="field"><label>defName</label><div class="ctl">
      <div class="inp" style="opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.def || key)}</div>
    </div></div>
    <div class="field"><label>部位</label><div class="ctl">
      <button class="inp inp--pick" data-act="pick-win-bid" title="这个部件所属的真实身体部位（来自模组的 HandDoll / FeetDoll）">
        <span>${p.bid == null || p.bid < 0 ? '— 未绑定' : bidLabel(c, p.bid)}</span>${icon('search')}
      </button>
    </div></div>
    <p class="mini-note" style="margin:2px 0 0">${orig ? `导出会覆盖模组里的 <code>${esc(orig)}</code>。` : '没有绑定身体部位：只在这个小窗里显示。'}</p>
  </div>

  <div class="sec">
    <div class="sec__h"><b>变换 TRANSFORM</b></div>
    <div class="field"><label>位置</label><div class="ctl num2">
      <input class="inp" type="number" data-f="wp.x" value="${round(p.x, 1)}" step="1">
      <input class="inp" type="number" data-f="wp.y" value="${round(p.y, 1)}" step="1">
    </div></div>
    <div class="field"><label>宽度</label><div class="ctl">
      <input class="inp" type="number" data-f="wp.w" value="${round(p.w, 1)}" step="1" style="flex:1"><span class="unit">窗单位</span>
    </div></div>
    <div class="field"><label>旋转</label><div class="ctl">
      <input class="inp" type="number" data-f="wp.rot" value="${round(p.rot || 0, 1)}" step="1" style="flex:1"><span class="unit">°</span>
    </div></div>
    <div class="rowline" style="margin-top:6px">
      <button class="btn btn--sm" data-act="win-part-flip">${icon('flip')}翻转</button>
      <button class="btn btn--sm" data-act="win-part-reset">${icon('rot')}恢复默认</button>
    </div>
    <p class="mini-note">窗口内的排版坐标（以窗口底图为参照），只影响这个小窗，不会移动人偶上的同名部位。拖动窗口本体可移动窗口，右下角可等比缩放，标题栏右上角可固定窗位。</p>
  </div>`;
}

function prosthOptions() {
  const pref = ['PegLeg', 'SimpleProstheticArm', 'WoodenHand', 'WoodenFoot', 'BionicArm', 'BionicLeg', 'ArchotechArm', 'ArchotechLeg'];
  const uniq = [...new Map(PROSTH.map(x => [x.img, x])).values()];
  return uniq.sort((a, b) => prosthRank(a) - prosthRank(b));
}
function prosthRank(x) {
  const pref = ['PegLeg', 'SimpleProstheticArm', 'WoodenHand', 'WoodenFoot', 'BionicArm', 'BionicLeg', 'ArchotechArm', 'ArchotechLeg'];
  const i = pref.findIndex(p => String(x.def || '').toLowerCase().includes(p.toLowerCase()));
  return i < 0 ? 99 : i;
}
function defaultProsth(p) {
  const hits = PROSTH.filter(x => x.target === p.id);
  if (hits.length) return hits.sort((a, b) => prosthRank(a) - prosthRank(b))[0];
  return prosthOptions()[0] || { img: 'HediffTab/Prosthesis/WoodenPart', id: 'fallback' };
}

function rjwPartSection(p) {
  const def = rjwDefOfPart(p);
  if (!def) return '';
  const st = p.rjw || { form: def.form, size: def.size };
  const form = def.forms.find(f => f.f === st.form) || def.forms[0] || { f: '', n: 1, p: def.defImg };
  const maxN = Math.max(1, form.n);
  const size = clamp(st.size || 0, 0, maxN - 1);
  const formLabel = f => {
    const zh = RJW_FORM_NAMES[f.f] || f.f;
    return `${zh}${f.f && f.f !== zh ? ' · ' + f.f : ''}`;
  };
  return `<div class="sec">
    <div class="sec__h"><b>RJW 形态 FORM</b><span class="tagx">${esc(def.base)}${def.k === 'organ' ? ' · 器官层' : ''}</span></div>
    <div class="field"><label>形态</label><div class="ctl">
      ${def.forms.length > 1
        ? `<select class="inp" data-f="rjwform">${def.forms.map(f => `<option value="${esc(f.f)}"${f.f === form.f ? ' selected' : ''}>${esc(formLabel(f))}</option>`).join('')}</select>`
        : `<div class="inp" style="display:flex;align-items:center;color:#8d9499">${esc(formLabel(form))}</div>`}
    </div></div>
    <div class="field"><label>尺寸</label><div class="ctl">
      <input class="inp" type="range" data-f="rjwsize" min="0" max="${maxN - 1}" step="1" value="${size}" style="height:20px;padding:0;border:0;background:none">
      <span class="unit" style="min-width:34px;text-align:right">${size + 1} / ${maxN}</span>
    </div></div>
    <p class="mini-note">这是模组按部位尺寸切换的贴图档位（${esc(form.p)}_0…${maxN - 1}）。游戏内实际档位由 RJW 的尺寸 Hediff 决定，导出时写入当前档位的 imagePath，供外来种族人偶借用。${def.base === 'Anus' ? ' 肛门由模组画在固定的小窗里：网页上它固定显示在画面右上角的「肛门」窗中，不随画布缩放；坐标仍按模组原值导出。' : ''}</p>
  </div>`;
}

function partInspector(p) {
  const c = activeCanvas();
  const hb = hitBox(p);
  const hbVis = visBox(p);   // t30：命中框异常提示要显示「可见区多大」
  const kindName = { body: '外形部位', organ: '器官', bone: '骨骼', eye: '眼睛', custom: '自定义部位' }[p.kind] || p.kind;
  const prosthOpts = prosthOptions();
  return `
  <div class="selhead">
    <div class="selhead__badge">${esc(String(p.bid >= 0 ? p.bid : '＋'))}</div>
    <div class="selhead__t"><b>${esc(partDisplayName(p))}</b><span>${esc(p.id)}</span></div>
    <span class="pill ${p.custom ? 'pill--a' : ''}">${kindName}</span>
  </div>

  <div class="part-actions">
    <button class="btn btn--sm" data-act="global-props" title="不取消选中，直接查看/编辑画布与项目（全局）属性">${icon('layers')}全局属性</button>
    <button class="btn btn--sm" data-act="visbox-recalc" title="按贴图的不透明像素重新计算选框（透明边不算进去）">${icon('scissors')}贴合可见像素</button>
    <button class="btn btn--sm" data-act="visbox-to-hit" title="把当前去透明后的可见框尺寸直接写成命中框（判定框）">${icon('target')}可见框→命中框</button>
  </div>

  <div class="sec">
    <div class="sec__h"><b>标识 IDENTITY</b></div>
    <div class="field"><label>名称 NAME</label><div class="ctl"><input class="inp inp--txt" data-f="name" value="${esc(p.name)}" spellcheck="false"></div></div>
    <div class="field"><label>defName ID</label><div class="ctl"><div class="inp inp--ro" id="partDefName" title="自动生成：种族名 + 部位名（只读，改「名称」会跟着变）">${esc(partDefName(c, p))}</div></div></div>
    ${(() => {
      if (p.bid == null || p.bid < 0) return `<p class="mini-note" style="margin:2px 0 0">装饰部位：只画图、不参与受伤。NHT 的部位定义里 bodyPartId 是整数，导出时不写这一项，游戏会按 <b>#0 躯干</b> 处理（不会影响受伤数据）。</p>`;
      const orig = origDefsByBid(c).get(p.bid);
      if (orig) return `<p class="mini-note" style="margin:2px 0 0">导出为 <b style="color:#ff9541">替换</b>：模组里那张 <code>${esc(orig)}</code> 会被覆盖。</p>`;
      return '';
    })()}
    <div class="field"><label>部位 PART</label><div class="ctl">
      <button class="inp inp--pick" data-act="pick-bid" title="对应 BodyDef 里的部位序号；点开可以搜索">
        <span>${bidLabel(c, p.bid)}</span>${icon('search')}
      </button>
    </div></div>
    <div class="field"><label>图层 LAYER</label><div class="ctl">
      <input class="inp" type="number" data-f="layer" value="${p.layer}" step="1" min="0" max="29" title="原版图层 0–29">
      <button class="iconbtn iconbtn--xs" data-act="layer-down" title="下移一层">${icon('arrdn')}</button>
      <button class="iconbtn iconbtn--xs" data-act="layer-up" title="上移一层">${icon('arrup')}</button>
    </div></div>
    <div class="field"><label>置顶层级 TOP LAYER
<span class="qmark" title="置顶系列专用层级（0–99，默认 1）：只有开启「置顶重画」或「联动置顶」时才生效，但数值一直保存。它独立于原版图层 0–29——哪怕填 0，也在所有原版图层之上。越大越靠上。">?</span>
    </label><div class="ctl num2">
      <input class="inp" type="number" data-f="overlevel" value="${overLevelOf(p)}" step="1" min="0" max="99">
      <button class="iconbtn iconbtn--xs" data-act="over-level-down" title="置顶层级 -1">${icon('arrdn')}</button>
      <button class="iconbtn iconbtn--xs" data-act="over-level-up" title="置顶层级 +1">${icon('arrup')}</button>
    </div></div>
    ${(() => {
      if (!c) return '';
      const har = !!harHairOf(c);
      if (!har && !c.hairFitEnabled) return '';
      const hl = Number.isFinite(c.hairPreviewLayer) ? c.hairPreviewLayer
        : (Number.isFinite(c.hairLayer) ? c.hairLayer : 15);
      return `<p class="mini-note" style="color:#e3b558;margin:2px 0 0">${LANG === 'en'
        ? `Current hair layer = <b>${hl}</b>: hair is drawn before the first part with layer ≥ ${hl}, so <b>parts with layer > ${hl} cover the hair</b>; lower ones are covered by the hair.`
        : `当前头发层级 = <b>${hl}</b>：头发会在第一个「图层 ≥ ${hl}」的部位之前绘制，所以<b>图层大于 ${hl} 的部位会盖在头发之上</b>，小于它的会被头发盖住。`}</p>`;
    })()}
    <div class="field"><label>贴图 TEXTURE</label><div class="ctl">
      <div class="inp" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;color:#8d9499">${esc(p.img.split('/').pop())}</div>
      <button class="iconbtn iconbtn--xs" data-act="pick-img" title="从模组素材替换">${icon('img')}</button>
      <button class="iconbtn iconbtn--xs" data-act="part-crop" title="裁剪：去掉透明边缘，保存到「我的素材 - ${esc(customCat())}」并换用裁剪后的贴图">✂</button>
    </div></div>
    <div class="part-flags">
      <span class="pf">
        <b>置顶</b><span class="qmark" title="置顶重画：所有部位（以及头发）画完之后再补画一遍，永远在最上面，用「置顶层级」排序；会盖掉该部位的疤痕/伤口，建议只给装饰件用。联动置顶：只在模组设置打开「非 HAR 发型按发色重绘」时生效，在补画的发型之后重画，避免被头发盖住；与置顶重画互斥。">?</span>
        <button class="switch${p.overHair ? ' is-on' : ''}" data-act="over-hair" role="switch"
          aria-checked="${p.overHair ? 'true' : 'false'}"
          title="置顶重画：所有部位画完后再画一遍，永远在最上面（用「置顶层级」排序）。装饰物用；会盖掉该部位的疤痕/伤口"><i></i></button><span class="pf-lb">重画</span>
        <button class="switch${p.linkTop ? ' is-on' : ''}" data-act="part-linktop" role="switch"
          aria-checked="${p.linkTop ? 'true' : 'false'}"
          title="联动置顶：只在模组设置打开「非 HAR 发型按发色重绘」时生效；与置顶重画互斥"><i></i></button><span class="pf-lb">联动</span>
      </span>
    </div>
    <div class="part-flags part-flags--sub">
      ${(() => {
        const cc = activeCanvas();
        const raceOk = !!(cc && cc.race && cc.race.defName);
        return raceOk ? `<span class="pf"><b>色彩</b><span class="qmark" title="受「部位颜色」开关控制：模组设置里关掉总开关（或单独关掉这一格）后，这个部位会以黑白显示；开启时和现在完全一样。只对种族画布有效。">?</span><button class="switch${p.desat ? ' is-on' : ''}" data-act="part-desat" role="switch" aria-checked="${p.desat ? 'true' : 'false'}" title="勾上后，模组设置里关闭「部位颜色」时这个部位会变黑白"><i></i></button></span>` : '';
      })()}
      <span class="pf"><b>发色</b><span class="qmark" title="跟随小人当前发色（story.hairColor）给这个部位着色。适合 bodyAddon colorChannel=hair 的耳朵/尾巴；关色彩时自动不染色。">?</span>
        <button class="switch${p.hairTint ? ' is-on' : ''}" data-act="part-hair-tint" role="switch"
          aria-checked="${p.hairTint ? 'true' : 'false'}"
          title="跟随小人当前发色：导出 HairTintDef，游戏里用 pawn.story.hairColor 给这个部位着色"><i></i></button></span>
      <span class="pf"><b>蒙版</b><span class="qmark" title="遮罩贴图：黑色区域不染发色、其余区域染色（与游戏同一套红通道权重）。导入后自动保存为「贴图名_m.png」。画布上需打开「显示发色」才能看到效果。">?</span>
        <button class="btn" style="padding:2px 8px;font-size:11px" data-act="part-mask-import" title="导入蒙版 PNG">导入</button>
        <button class="btn" style="padding:2px 8px;font-size:11px" data-act="part-mask-clear"${p.mask ? '' : ' disabled'} title="清除蒙版">清除</button>
        <span class="pf-lb" style="opacity:.75;max-width:120px;overflow:hidden;text-overflow:ellipsis">${p.mask ? esc(String(p.mask).split('/').pop()) : '无'}</span></span>
      ${p.followDetected ? `<span class="pf"><b>自动变换</b><span class="qmark" title="读取小人身上对应 HAR bodyAddon 的实际贴图 / 颜色 / 旋转，并替换这个部位的贴图；导出 AddonFollowDef。默认关闭。">?</span><button class="switch${p.autoFollow ? ' is-on' : ''}" data-act="part-auto-follow" role="switch" aria-checked="${p.autoFollow ? 'true' : 'false'}" title="开启后按小人实际 bodyAddon 自动变换（级别 / 颜色）"><i></i></button></span>` : ''}
    </div>
    ${p.followDetected ? `<p class="mini-note" style="margin:-2px 0 6px">HAR bodyAddon：<b>${esc(p.followAddon || p.followPath || '—')}</b> · 自动旋转 ${round(Number(p.followRot) || 0, 1)}°${p.autoFollow ? ' · <b style="color:#86c98a">自动变换已开</b>' : ' · 默认关闭'}</p>` : ''}
  </div>

  <div class="sec">
    <div class="sec__h"><b>变换 TRANSFORM</b></div>
    <div class="field"><label>位置 POSITION</label><div class="ctl num2">
      <input class="inp" type="number" data-f="x" value="${round(p.x, 1)}" step="1" title="X">
      <input class="inp" type="number" data-f="y" value="${round(p.y, 1)}" step="1" title="Y">
    </div></div>
    <div class="field"><label>缩放 SCALE</label><div class="ctl num2">
      <input class="inp" type="number" data-f="sx" value="${round(p.sx, 2)}" step="0.05" title="横向缩放">
      <input class="inp" type="number" data-f="sy" value="${round(p.sy, 2)}" step="0.05" title="纵向缩放">
    </div></div>
    <div class="field"><label>旋转 ROTATE</label><div class="ctl">
      <input class="inp" type="number" data-f="rot" value="${round(p.rot || 0, 1)}" step="1" style="flex:1"${p.overHair ? ' disabled title="置顶重画不支持旋转"' : ''}>
      <span class="unit">°</span>
      <button class="iconbtn iconbtn--xs" data-act="flip" title="${p.overHair ? '置顶重画不支持水平翻转（补画会错位）' : '水平翻转'}"${p.overHair ? ' disabled style="opacity:.4"' : ''}>${icon('flip')}</button>
      <button class="iconbtn iconbtn--xs" data-act="rot-reset" title="重置旋转">${icon('rot')}</button>
    </div></div>
    <div class="rowline" style="margin-top:6px">
      <button class="btn btn--sm" data-act="reset-scale" title="缩放恢复成 100%（判定框按同比例回退）">${icon('rot')}重置缩放</button>
    </div>
    ${Math.abs(p.rot || 0) > 0.01 ? `<p class="mini-note" style="margin:-2px 0 6px;color:var(--warn)">模组的 DollBodyPart 没有旋转字段，角度不会导出；游戏里会按未旋转显示。<button class="linkbtn" data-act="bake-rot">把旋转烘焙进贴图</button></p>` : ''}
  </div>

  <div class="sec">
      <div class="sec__h"><b>命中框 HITBOX</b><span class="tagx">可偏移 · 测试模组</span></div>
      <div class="field"><label>判定框大小 HITBOX SIZE</label><div class="ctl num2">
        <input class="inp" type="number" data-f="hw" value="${round(hb.w, 1)}" step="1" title="命中框宽度（上限：可见区 ×1.5）">
        <input class="inp" type="number" data-f="hh" value="${round(hb.h, 1)}" step="1" title="命中框高度（上限：可见区 ×1.5）">
        <button class="iconbtn iconbtn--xs" data-act="hit-reset" title="命中框复位（回到居中、按导出比例）">${icon('rot')}</button>
      </div></div>
      ${p.hbBad ? `<p class="mini-note" style="margin:0 0 6px;color:var(--warn)">命中框异常：${esc(String(p.hbBad))}（现在 ${round(hb.w, 1)}×${round(hb.h, 1)}，可见区 ${Math.round(hbVis.w)}×${Math.round(hbVis.h)}）。
        <button class="linkbtn" data-act="visbox-to-hit">设为可见框</button></p>` : ''}
      <div class="field"><label>允许判定框大于贴图</label><div class="ctl">
        <button class="switch${p.hbBig ? ' is-on' : ''}" data-act="part-hbbig" role="switch"
          aria-checked="${p.hbBig ? 'true' : 'false'}" title="勾上后不夹紧、不告警，用于故意做大的点击区"><i></i></button>
      </div></div>
      <div class="field"><label>判定框偏移 HITBOX OFFSET</label><div class="ctl num2">
        <input class="inp" type="number" data-f="hx" value="${round(hb.dx, 1)}" step="1" title="判定框 X 偏移（画布单位）">
        <input class="inp" type="number" data-f="hy" value="${round(hb.dy, 1)}" step="1" title="判定框 Y 偏移（画布单位）">
      </div></div>
      <div class="field"><label>画布像素直出 HITBOX PIXEL</label><div class="ctl">
        <button class="switch${p.hbPx ? ' is-on' : ''}" data-act="part-hbpx" role="switch"
          aria-checked="${p.hbPx ? 'true' : 'false'}" title="开启后 hitboxScale = 画布 hbox / 512，画布拖多大游戏里就多大"><i></i></button>
      </div></div>
      <p class="mini-note" style="margin:2px 0 0">打开工具栏的「命中框」后可拖角改大小、拖中间圆点改偏移；偏移会按可见宽高比例导出成 <code>HitboxOffsetExtension</code>，由测试模组的 Harmony 补丁生效。</p>
    </div>
    <div class="sec">
      <div class="sec__h"><b>护甲图标 ARMOR ICON</b><span class="tagx">护甲 / 提示图标</span></div>
      <div class="field"><label>护甲图标</label><div class="ctl">
        <button class="switch${p.armor !== false ? ' is-on' : ''}" data-act="part-armor" role="switch"
          aria-checked="${p.armor !== false ? 'true' : 'false'}" title="是否在游戏里显示这个部位的护甲覆盖图标"><i></i></button>
      </div></div>
      <div class="field"><label>图标位置 ICON OFFSET</label><div class="ctl num2">
        <input class="inp" type="number" data-f="nx" value="${round(p.nx || 0, 1)}" step="1" title="护甲 / 提示图标的 X 偏移">
        <input class="inp" type="number" data-f="ny" value="${round(p.ny || 0, 1)}" step="1" title="护甲 / 提示图标的 Y 偏移">
        <button class="iconbtn iconbtn--xs" data-act="icon-reset" title="图标回到部位中心">${icon('rot')}</button>
      </div></div>
      <p class="mini-note" style="margin:2px 0 0">图标位置相对于部位中心，用于护甲 / 提示图标。</p>
  </div>

  ${p.source === 'rjw' ? rjwPartSection(p) : ''}

  <div class="sec">
    <div class="sec__h"><b>状态 CONDITION</b><span class="tagx">受伤 / 缺失 / 假体</span></div>
    <div class="seg" data-act="state">
      <button data-v="ok" class="${p.state === 'ok' ? 'on' : ''}">完好</button>
      <button data-v="hurt" class="${p.state === 'hurt' ? 'on' : ''}">受伤</button>
      <button data-v="missing" class="${p.state === 'missing' ? 'on' : ''}">缺失</button>
      <button data-v="prosthetic" class="${p.state === 'prosthetic' ? 'on' : ''}">假体</button>
    </div>
    ${p.state === 'hurt' ? `
      <div class="field" style="margin-top:8px"><label>伤情 INJURY</label><div class="ctl">
        <input class="inp" type="range" min="1" max="100" data-f="sev" value="${p.sev}" style="height:20px;padding:0;border:0;background:none">
        <span class="unit" style="min-width:26px;text-align:right">${p.sev}%</span>
      </div></div>
      <div class="chips" style="padding:4px 0 0;border:0">
        ${Object.entries(WOUNDS).map(([k, w]) => `<button data-act="wound" data-w="${k}" class="${p.wound === k ? 'on' : ''}">${w.label}</button>`).join('')}
      </div>
      <div class="chips" style="padding:4px 0 0;border:0">
        ${BANDAGE_LABELS.map(([v, n]) => `<button data-act="bandage" data-b="${v}" class="${(p.bandage || '') === v ? 'on' : ''}">${n}</button>`).join('')}
      </div>` : ''}
    ${p.state === 'prosthetic' ? `
      <div class="field" style="margin-top:8px"><label>假体 PROSTHETIC</label><div class="ctl">
        <select class="inp" data-f="prosth">
          <option value="">— 选择假体贴图 —</option>
          ${prosthOpts.map(x => `<option value="${esc(x.img)}"${p.prosth && p.prosth.img === x.img ? ' selected' : ''}>${x.def ? esc(x.def) + ' · ' : ''}${esc(prettyAsset(x.img))}</option>`).join('')}
        </select>
      </div></div>
      <p class="mini-note">缺失状态保留原件轮廓；假体状态用模组 Prosthesis 贴图替换本体。</p>` : ''}
  </div>

  <div class="sec">
    <div class="sec__h"><b>操作 ACTIONS</b></div>
    <div class="rowline" style="margin-bottom:5px">
      <button class="btn btn--sm" data-act="dup">${icon('copy')}复制</button>
      <button class="btn btn--sm" data-act="mirror">${icon('flip')}镜像成对</button>
    </div>
    <div class="rowline">
      <button class="btn btn--sm" data-act="detach">${icon('scissors')}拆卸</button>
      <button class="btn btn--sm btn--danger" data-act="delete-part" data-uid="${p.uid}">${icon('trash')}删除</button>
    </div>
    <p class="mini-note">镜像会生成左右对称的另一半，适合翅膀、尾巴、附肢成对使用。</p>
  </div>`;
}

function rjwCounts(c) {
  const list = c.parts.filter(p => p.source === 'rjw');
  if (!list.length) return '当前画布没有 RJW 部位';
  const shown = list.filter(p => p.vis).length;
  const organs = list.filter(p => p.kind === 'organ').length;
  return `${list.length} 个标记 · ${shown} 可见 · ${organs} 个器官层`;
}

function applyCanvasBodyDef(c, defName) {
  if (!c || !c.race) return;
  const defs = Array.isArray(c.race.bodyDefs) ? c.race.bodyDefs : [];
  const bd = defs.find(d => d && d.defName === defName);
  if (!bd) { toast('没有这张部位表：' + defName, true); return; }
  const oldByIndex = new Map((c.race.bodyParts || []).map(p => [Number(p.i), String(p.def || '')]));
  c.race.bodyDef = defName;
  c.race.bodyParts = (bd.parts || []).map(p => ({ i: Number(p.i), def: String(p.def || ''), label: String(p.label || p.def || ''), src: c.race.modName || '模组' })).sort((a, b) => a.i - b.i);
  const newIndex = new Map();
  c.race.bodyParts.forEach(p => { const k = String(p.def || '').toLowerCase(); if (!newIndex.has(k)) newIndex.set(k, Number(p.i)); });
  let moved = 0, lost = 0;
  (c.parts || []).forEach(p => {
    const od = oldByIndex.get(Number(p.bid));
    if (od === undefined) return;
    const ni = newIndex.get(String(od).toLowerCase());
    if (ni === undefined) { lost++; return; }
    if (ni !== Number(p.bid)) { p.bid = ni; moved++; }
  });
  try { persist(); } catch (e) { }
  try { renderAll(); } catch (e) { }
  toast('部位表已切到 ' + defName + '（' + c.race.bodyParts.length + ' 项）' + (moved ? '，按名称同步 ' + moved + ' 个部位编号' : '') + (lost ? '，' + lost + ' 个部位在新表里找不到' : ''));
}

document.addEventListener('change', e => {
  const t = e.target;
  if (!t || !t.dataset || t.dataset.act !== 'canvas-bodydef-pick') return;
  const c = activeCanvas();
  if (c) applyCanvasBodyDef(c, t.value || '');
});

const VANILLA_BODY_TYPES = ['Male', 'Female', 'Thin', 'Fat', 'Hulk', 'Child', 'Baby'];

function canvasAliasModal() {
  const c = activeCanvas();
  if (!c) return;
  // t69: Epona 这类种族的 ThingDef 不带 <bodyTypeDefs>，race.bodyTypes 为空 => 下拉无候选。
  // 回退顺序：种族形态表 -> 同种族其它画布已用形态 -> 原版 BodyTypeDef。
  let forms = Array.isArray(c.race && c.race.bodyTypes) ? c.race.bodyTypes.slice() : [];
  if (!forms.length) {
    const base = String((c.race && (c.race.defName || c.race.name)) || '');
    forms = (S.canvases || [])
      .filter(x => x !== c && x.kind === 'race' && x.bodytype && x.bodytype !== '*'
        && String((x.race && (x.race.defName || x.race.name)) || '') === base)
      .map(x => ({ defName: x.bodytype, label: x.bodytype, referenced: true }));
  }
  // t71：只允许模组自带的形态（不再回退原版 7 种体型）
  const used = new Set([c.bodytype, ...(c.bodyAliases || [])].filter(Boolean));
  const avail = forms.filter(f => f.defName && !used.has(f.defName));
  openModal(`<div style="width:min(520px,94vw)">
    <div class="modal__head"><span class="idx">MAP</span><h3>添加形态映射</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 6px">选择要复用「${esc(c.form || c.bodytype || c.title)}」画布的附加形态。</p>
      ${(!c.bodytype || c.bodytype === '*') ? '<p class="mini-note" style="color:#e2a13c;margin:0 0 6px">当前画布的「形态 BodyType」是通配 *，导出时不会写 BodyAliasDef；先把画布绑定到具体形态（如 Thin），映射才会生效。</p>' : ''}
      <div class="field"><label>检测到的形态</label><div class="ctl"><select class="inp" id="aliasPick">
        ${avail.map(f => `<option value="${esc(f.defName)}">${esc(f.label || f.defName)}${f.referenced ? '（引用，未找到定义）' : ''}</option>`).join('') || '<option value="">没有可选项</option>'}
      </select></div></div>
      <div class="field"><label>或手动输入</label><div class="ctl"><input class="inp" id="aliasManual" placeholder="BodyTypeDef defName"></div></div>
      <p class="mini-note" id="aliasErr" style="color:#e2483c;margin:4px 0 0"></p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--primary" data-act="canvas-alias-do">添加</button>
    </div></div>`);
}

function canvasAliasDo() {
  const c = activeCanvas();
  if (!c) return;
  const sel = document.getElementById('aliasPick');
  const man = document.getElementById('aliasManual');
  const body = (man && man.value.trim()) || (sel && sel.value) || '';
  const err = document.getElementById('aliasErr');
  if (!body) { if (err) err.textContent = '没有可添加的形态'; return; }
  if (body === c.bodytype) { if (err) err.textContent = '不能映射到当前形态本身'; return; }
  if (!Array.isArray(c.bodyAliases)) c.bodyAliases = [];
  if (c.bodyAliases.includes(body)) { if (err) err.textContent = '已经添加过'; return; }
  c.bodyAliases.push(body);
  try { closeModal(); } catch (e) { }
  renderAll();
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
  toast('已添加映射：' + body + ' → ' + (c.bodytype || '*'));
}

function samePkgRaceCandidates(c) {
  const ownRace = String((c.race && (c.race.defName || c.race.name)) || '');
  const pkg = String((c.race && c.race.packageId) || '');
  const list = [];
  const seen = new Set([ownRace]);
  const recorded = (pkg && S.project.modRaces && S.project.modRaces[pkg]) || [];
  recorded.forEach(r => {
    if (r && r.defName && !seen.has(r.defName)) { seen.add(r.defName); list.push({ race: r.defName, label: r.label || r.defName }); }
  });
  (S.canvases || []).forEach(x => {
    if (x === c || x.kind !== 'race') return;
    if (String((x.race && x.race.packageId) || '') !== pkg) return;
    const rn = String((x.race && (x.race.defName || x.race.name)) || '');
    if (rn && !seen.has(rn)) { seen.add(rn); list.push({ race: rn, label: rn }); }
  });
  return { pkg: pkg, list: list };
}

function canvasRaceAliasModal() {
  const c = activeCanvas();
  if (!c) return;
  const cand = samePkgRaceCandidates(c);
  const mapped = Array.isArray(c.raceAliases) ? c.raceAliases : [];
  openModal(`<div style="width:min(520px,94vw)">
    <div class="modal__head"><span class="idx">RACE</span><h3>种族映射 · 复用本画布</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 6px">把本画布的娃娃与贴图共享给同一模组里的其它种族（ThingDef），导出为 <b>RaceAliasDef</b>。</p>
      ${mapped.length ? `<div class="field"><label>已映射的种族</label><div class="ctl" style="display:flex;gap:6px;flex-wrap:wrap">${mapped.map(r => `<span class="pill" style="display:inline-flex;align-items:center;gap:4px;background:#3a2a10;border:1px solid #e2a13c;color:#e2a13c">${esc(r)}<button class="iconbtn" data-act="canvas-racealias-del" data-race="${esc(r)}" style="width:16px;height:16px">×</button></span>`).join('')}</div></div>` : ''}
      <div class="field"><label>映射到本模组的其他种族（ThingDef，可加多个）</label><div class="ctl"><select class="inp" id="aliasRacePick">
        ${cand.list.map(x => `<option value="${esc(x.race)}">${esc(x.race)} · ${esc(x.label || '')}</option>`).join('') || '<option value="">没有可选的同模组种族</option>'}
      </select></div></div>
      <div class="ctl" style="margin-top:6px"><button class="btn" data-act="canvas-racealias-import">从模组文件夹导入种族…</button></div>
      <p class="mini-note" style="margin:4px 0 0">${cand.pkg ? `仅限同模组（${esc(cand.pkg)}）的种族；` : ''}若下拉为空，点上面按钮导入该种族模组的文件夹。</p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--primary" data-act="canvas-racealias-do">添加种族映射</button>
    </div></div>`);
}

function canvasRaceAliasDo() {
  const c = activeCanvas();
  if (!c) return;
  const sel = document.getElementById('aliasRacePick');
  const from = sel && sel.value ? String(sel.value).trim() : '';
  if (!from) { toast('没有可选的同模组种族'); return; }
  if (!Array.isArray(c.raceAliases)) c.raceAliases = [];
  if (c.raceAliases.includes(from)) { toast('已经添加过'); return; }
  c.raceAliases.push(from);
  renderAll();
  try { canvasRaceAliasModal(); } catch (e) { }
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
  toast('已添加种族映射：' + from + ' → ' + (c.doll || ''));
}


function canvasFormDupModal() {
  const c = activeCanvas();
  if (!c) return;
  const race = c.race || {};
  const base = race.defName || race.name || c.doll || '';
  const sibs = (S.canvases || []).filter(x => x !== c && x.kind === 'race' && x.race && (x.race.defName || x.race.name) === base);
  const used = new Set([c.bodytype, ...sibs.map(x => x.bodytype)].filter(x => x && x !== '*'));
  const cached = Array.isArray(race.bodyTypes) ? race.bodyTypes : [];
  const avail = cached.filter(bt => !used.has(bt.defName));
  const extra = [...new Set(sibs.map(x => x.bodytype).filter(x => x && x !== '*'))].filter(x => !cached.some(bt => bt.defName === x));

  const picker = avail.length
    ? `<div class="field"><label>检测到的形态</label><div class="ctl"><select class="inp" id="formPick">${avail.map((bt, i) => `<option value="${i}">${esc(bt.label || bt.defName)}（${esc(bt.defName)}）</option>`).join('')}<option value="manual">手动输入…</option></select></div></div>`
    : '';

  openModal(`<div style="width:min(540px,94vw)">
    <div class="modal__head"><span class="idx">FORM</span><h3>复制为另一形态</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      ${picker}
      <div class="field"><label>形态名</label><div class="ctl"><input class="inp" id="formName" placeholder="如 Slime / Humanlike"></div></div>
      <div class="field"><label>形态 BodyType</label><div class="ctl"><input class="inp" id="formBody" list="formBodyList" placeholder="BodyTypeDef defName"><datalist id="formBodyList">${[...cached.map(x => x.defName), ...extra].map(x => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
      <div class="field"><label>新 Doll 名</label><div class="ctl"><input class="inp" id="formDoll"></div></div>
      <p class="mini-note" style="margin:6px 0 0">${cached.length ? `已从种族数据读取 <b>${cached.length}</b> 个形态。` : '没有检测到形态列表，可手动输入，或参考同种族已用 BodyType。'} NHT 会按小人的 <code>bodyType</code> 自动选择对应 Doll。</p>
      <p class="mini-note" id="formErr" style="color:#e2483c;margin:4px 0 0"></p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--primary" data-act="canvas-form-do">复制</button>
    </div></div>`);

  const autoDoll = (formName, body) => {
    const stem = String(c.doll || race.defName || 'doll');
    const tag = String(formName || body || 'form').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'form';
    let id = stem + '_' + tag;
    let n = 2;
    while ((S.canvases || []).some(x => x !== c && x.doll === id)) id = stem + '_' + tag + '_' + (n++);
    return id;
  };
  const fill = (bt) => {
    if (!bt) return;
    const nm = bt.label || bt.defName;
    const nameEl = document.getElementById('formName');
    const bodyEl = document.getElementById('formBody');
    const dollEl = document.getElementById('formDoll');
    if (nameEl) nameEl.value = nm;
    if (bodyEl) bodyEl.value = bt.defName;
    if (dollEl) dollEl.value = autoDoll(nm, bt.defName);
  };
  const sel = document.getElementById('formPick');
  if (sel) {
    sel.onchange = () => {
      if (sel.value === 'manual') return;
      fill(avail[Number(sel.value)]);
    };
    if (avail.length) fill(avail[0]);
  } else {
    const dollEl = document.getElementById('formDoll');
    if (dollEl) dollEl.value = autoDoll('form', '');
  }
}

function canvasFormDupDo() {
  const c = activeCanvas();
  if (!c) return;
  const name = ($('#formName') || {}).value ? $('#formName').value.trim() : '';
  const body = ($('#formBody') || {}).value ? $('#formBody').value.trim() : '';
  const doll = ($('#formDoll') || {}).value ? $('#formDoll').value.trim() : '';
  const err = $('#formErr');
  if (!name) { if (err) err.textContent = '形态名不能为空'; return; }
  if (!body) { if (err) err.textContent = 'BodyType 不能为空'; return; }
  if (!doll) { if (err) err.textContent = 'Doll 名不能为空'; return; }
  if ((S.canvases || []).some(x => x !== c && x.doll === doll)) { if (err) err.textContent = 'Doll 名已存在：' + doll; return; }
  const nc = JSON.parse(JSON.stringify(c));
  nc.id = 'c' + Date.now().toString(36);
  const rootId = c.parentId || c.id;
  nc.parentId = rootId;
  const rootC = c.parentId ? ((S.canvases || []).find(x => x.id === c.parentId) || c) : c;
  nc.title = upperFirst(baseTitleOf(rootC) + ' ' + formKeyword({ form: name, bodytype: body, race: c.race }));
  nc.doll = doll;
  nc.form = name;
  nc.bodytype = body;
  nc.bodyAliases = [];   // 映射属于原形态，不复制给新形态
  nc.locked = false;
  nc.harBubbleOpen = false;
  nc._patchOn = undefined;
  nc.savedSig = undefined;
  nc.sigVer = undefined;
  S.canvases.push(nc);
  if (!S.ui.linkOpen) S.ui.linkOpen = {};
  S.ui.linkOpen[rootId] = true;
  S.active = nc.id;
  try { closeModal(); } catch (e) { }
  renderAll();
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
  pushHistory();
  toast('已创建形态：' + name + '（' + doll + '）');
}

/* 实际显示高度 <-> 导出 Y 偏移：唯一换算口径 */
const DISPLAY_BASE_H = 890;
const DISPLAY_EXPORT_SCALE = 1.259;
let DISPLAY_LINK = (() => {
  try {
    const v = JSON.parse(localStorage.getItem('nht.displayLink') || 'null');
    if (v && typeof v === 'object') return { toHeight: v.toHeight !== false, toOffset: v.toOffset !== false };
  } catch (e) { }
  return { toHeight: true, toOffset: true };
})();
function saveDisplayLink() {
  try { localStorage.setItem('nht.displayLink', JSON.stringify(DISPLAY_LINK)); } catch (e) { }
}
function displayHeightFromOffset(y) { return DISPLAY_BASE_H + Number(y) * DISPLAY_EXPORT_SCALE; }
function displayOffsetFromHeight(h) { return (Number(h) - DISPLAY_BASE_H) / DISPLAY_EXPORT_SCALE; }

function displayInputBad(sel) {
  const inp = document.querySelector('#paneInspect ' + sel);
  if (!inp) return false;
  const raw = String(inp.value == null ? '' : inp.value).trim();
  return raw === '' || !Number.isFinite(Number(raw));
}
function displayHeightConv(c, bad) {
  const y = c && c.exportOffset ? Number(c.exportOffset.y) : 0;
  const valid = !bad && Number.isFinite(y);
  const raw = valid ? displayHeightFromOffset(y) : NaN;
  const val = valid ? Math.max(1, raw) : NaN;
  const cur = c && c.displayBox ? Number(c.displayBox.h) : NaN;
  const diff = valid && Number.isFinite(cur) ? Math.abs(val - cur) : Infinity;
  return { valid, raw, val, cur, diff, clamped: valid && raw < 1 };
}
function displayOffsetConv(c, bad) {
  const h = c && c.displayBox ? Number(c.displayBox.h) : NaN;
  const valid = !bad && Number.isFinite(h);
  const raw = valid ? displayOffsetFromHeight(h) : NaN;
  const cur = c && c.exportOffset ? Number(c.exportOffset.y) : 0;
  const diff = valid && Number.isFinite(cur) ? Math.abs(raw - cur) : Infinity;
  return { valid, raw, cur, diff };
}
function displayApplyHeight(c) {
  if (!c) return;
  if (displayInputBad('[data-f="c.offy"]')) return false;
  const info = displayHeightConv(c);
  if (!info.valid) return false;
  if (!c.displayBox) c.displayBox = { x: 0, y: 0, w: 512, h: DISPLAY_BASE_H, show: true, pos: 'bottom', locked: true };
  c.displayBox.h = Math.max(1, info.raw);       // 内部保存未舍入值
  syncDisplayBox(c);
  return true;
}
function displayApplyOffset(c) {
  if (!c) return;
  if (displayInputBad('[data-f="c.dh"]')) return false;
  const info = displayOffsetConv(c);
  if (!info.valid) return false;
  if (!c.exportOffset) c.exportOffset = { x: 0, y: 0 };
  c.exportOffset.y = info.raw;                  // 内部保存未舍入值
  return true;
}
function displayLinkBar() {
  const on = (v) => v ? ' is-on' : '';
  return `<div class="displaylink" role="group" aria-label="高度与偏移自动换算">
    <span class="displaylink__t">自动换算</span>
    <div class="dlsw"><button type="button" class="switch${on(DISPLAY_LINK.toHeight)}" data-act="disp-auto-height"
      role="switch" aria-checked="${DISPLAY_LINK.toHeight ? 'true' : 'false'}" title="导出 Y 偏移变化时，自动写入实际显示高度"><i></i></button><b>偏移 → 高度</b></div>
    <div class="dlsw"><button type="button" class="switch${on(DISPLAY_LINK.toOffset)}" data-act="disp-auto-offset"
      role="switch" aria-checked="${DISPLAY_LINK.toOffset ? 'true' : 'false'}" title="实际显示高度变化时，自动写入导出 Y 偏移"><i></i></button><b>高度 → 偏移</b></div>
  </div>`;
}
function displayHeightRow(c) {
  const info = displayHeightConv(c);
  const auto = DISPLAY_LINK.toHeight;
  const shown = info.valid ? String(Math.round(info.val)) : '—';
  const disabled = auto || !info.valid || info.diff < 0.01;
  const title = !info.valid ? '导出 Y 偏移无效' : (info.clamped ? '高度已钳制到 1px' : (auto ? '已自动应用' : (info.diff < 0.01 ? '与当前高度相同' : '把换算值写入实际显示高度')));
  return `<div class="field displayconv"><label>实际显示高度</label><div class="ctl">
    <input class="inp conv-val${auto && info.valid ? ' is-auto' : ''}" id="dispConvHeight" type="text" readonly value="${shown}" title="${title}">
    <button type="button" class="btn btn--sm conv-apply${auto ? ' is-auto' : ''}" id="dispApplyHeight" data-act="disp-apply-height" ${disabled ? 'disabled' : ''} title="${title}">${auto ? '已自动' : '应用'}</button>
  </div></div>`;
}
function exportYConvRow(c) {
  const info = displayOffsetConv(c);
  const auto = DISPLAY_LINK.toOffset;
  const shown = info.valid ? String(Math.round(info.raw)) : '—';
  const disabled = auto || !info.valid || info.diff < 0.01;
  const title = !info.valid ? '实际显示高度无效' : (auto ? '已自动应用' : (info.diff < 0.01 ? '与当前偏移相同' : '把换算值写入导出 Y 偏移'));
  return `<div class="field displayconv"><label>Y 偏移（换算）</label><div class="ctl">
    <input class="inp conv-val${auto && info.valid ? ' is-auto' : ''}" id="dispConvOffset" type="text" readonly value="${shown}" title="${title}">
    <button type="button" class="btn btn--sm conv-apply${auto ? ' is-auto' : ''}" id="dispApplyOffset" data-act="disp-apply-offset" ${disabled ? 'disabled' : ''} title="${title}">${auto ? '已自动' : '应用'}</button>
  </div></div>`;
}
function syncDisplayConversionRows(c) {
  const pane = document.getElementById('paneInspect');
  if (!pane || !c) return;
  const hv = displayHeightConv(c, displayInputBad('[data-f="c.offy"]'));
  const ov = displayOffsetConv(c, displayInputBad('[data-f="c.dh"]'));
  const set = (sel, val, auto, title, dis) => {
    const inp = pane.querySelector(sel);
    if (inp) { if (document.activeElement !== inp) inp.value = val; inp.title = title; inp.classList.toggle('is-auto', !!auto); }
    const btn = pane.querySelector(sel === '#dispConvHeight' ? '#dispApplyHeight' : '#dispApplyOffset');
    if (btn) {
      btn.disabled = !!dis;
      btn.textContent = auto ? '已自动' : '应用';
      btn.title = title;
      btn.classList.toggle('is-auto', !!auto);
    }
  };
  set('#dispConvHeight', hv.valid ? String(Math.round(hv.val)) : '—', DISPLAY_LINK.toHeight && hv.valid,
    !hv.valid ? '导出 Y 偏移无效' : (hv.clamped ? '高度已钳制到 1px' : (DISPLAY_LINK.toHeight ? '已自动应用' : (hv.diff < 0.01 ? '与当前高度相同' : '把换算值写入实际显示高度'))),
    DISPLAY_LINK.toHeight || !hv.valid || hv.diff < 0.01);
  set('#dispConvOffset', ov.valid ? String(Math.round(ov.raw)) : '—', DISPLAY_LINK.toOffset && ov.valid,
    !ov.valid ? '实际显示高度无效' : (DISPLAY_LINK.toOffset ? '已自动应用' : (ov.diff < 0.01 ? '与当前偏移相同' : '把换算值写入导出 Y 偏移')),
    DISPLAY_LINK.toOffset || !ov.valid || ov.diff < 0.01);
  // 同步原始输入框（不抢焦点）
  const dh = pane.querySelector('[data-f="c.dh"]');
  if (dh && document.activeElement !== dh && c.displayBox) dh.value = round(c.displayBox.h, 0);
  const oy = pane.querySelector('[data-f="c.offy"]');
  if (oy && document.activeElement !== oy && c.exportOffset) oy.value = round(c.exportOffset.y, 1);
}

function canvasInspector(c) {
  if (!c) return `<div class="empty">没有画布</div>`;
  const race = c.race;
  const stack = sortParts(c.parts.filter(p => p.vis !== false && !(c.rjw === false && p.source === 'rjw'))).reverse();
  const stackRows = stack.slice(0, 80).map(p => `<button class="stack__row${p.uid === S.sel ? ' is-on' : ''}" data-act="pick-part" data-uid="${p.uid}" title="选中这个部位">
      <span class="stack__n">${esc(partDisplayName(p))}</span>
      <b>${p.layer}${p.extra ? ` <em>+${p.extra}</em>` : ''}</b>
    </button>`).join('');
  return `
  <div class="selhead">
    <div class="selhead__badge">${icon('body')}</div>
    <div class="selhead__t"><b>${esc(c.title)}</b><span>${esc(c.doll)} · ${c.parts.length} 部位 / ${c.detached.length} 已拆卸</span></div>
    <span class="pill ${c.kind === 'race' ? 'pill--c' : c.kind === 'default' ? '' : 'pill--a'}">${c.kind === 'race' ? '种族' : c.kind === 'default' ? '默认体型' : '自建'}</span>
  </div>
  ${displayLinkBar()}

  <div class="sec">
    <div class="sec__h"><b>画布 CANVAS</b></div>
    <div class="field"><label>名称</label><div class="ctl"><input class="inp inp--txt" data-f="c.title" value="${esc(c.title)}" spellcheck="false"></div></div>
    <div class="field"><label>形态</label><div class="ctl"><input class="inp inp--txt" data-f="c.form" value="${esc(c.form || '')}" placeholder="如 Slime / Humanlike" spellcheck="false"></div></div>
    <div class="field"><label>形态 BodyType</label><div class="ctl"><input class="inp inp--txt" data-f="c.bodytype" value="${esc(c.bodytype)}" placeholder="Mincho_Body_..." spellcheck="false"></div></div>
    <div class="field"><label>Doll</label><div class="ctl"><input class="inp" data-f="c.doll" value="${esc(c.doll)}" spellcheck="false"></div></div>
    ${c.kind !== 'race' ? `<div class="rowline" style="margin:2px 0 0"><button class="btn btn--sm" data-act="canvas-form-dup">＋ 复制为另一形态</button></div>` : ''}
    <div class="field"><label>性别</label><div class="ctl"><input class="inp" data-f="c.gender" value="${esc(c.gender)}" spellcheck="false"></div></div>
    <div class="field"><label>异种</label><div class="ctl"><input class="inp" data-f="c.xenotype" value="${esc(c.xenotype)}" spellcheck="false"></div></div>
    ${race ? `<div class="field"><label>种族</label><div class="ctl"><input class="inp" data-f="c.raceDef" value="${esc(race.defName || '')}" spellcheck="false"></div></div>` : ''}
  </div>

  ${c.kind === 'race' ? `<div class="sec">
    <div class="sec__h"><b>形态映射 BODY MAPPING</b></div>
    <div class="rowline" style="flex-wrap:wrap;gap:4px">${(c.bodyAliases || []).map(n => `<span class="pill pill--c" style="display:inline-flex;align-items:center;gap:4px">${esc(n)}<button class="iconbtn" data-act="canvas-alias-del" data-name="${esc(n)}" title="移除映射" style="width:16px;height:16px">${icon('x')}</button></span>`).join('') || '<span class="mini-note">还没有映射</span>'}</div>
    <div class="rowline" style="margin-top:4px;gap:5px">
      <button class="btn btn--sm" data-act="canvas-form-dup">＋ 复制为另一形态</button>
      <button class="btn btn--sm" data-act="canvas-alias-add">＋ 添加映射</button>
    </div>
    <p class="mini-note" style="margin:4px 0 0">复制为另一形态会以当前画布为模板新建同种族的另一个 BodyType；映射让附加形态（如 Slime_YR_Bote）复用本画布的 Doll，导出为 BodyAliasDef。</p>
    <div class="rowline" style="flex-wrap:wrap;gap:4px;margin-top:8px">${(c.raceAliases || []).map(n => `<span class="pill" style="display:inline-flex;align-items:center;gap:4px;background:#3a2a10;border:1px solid #e2a13c;color:#e2a13c">${esc(n)}<button class="iconbtn" data-act="canvas-racealias-del" data-race="${esc(n)}" title="移除种族映射" style="width:16px;height:16px">${icon('x')}</button></span>`).join('') || '<span class="mini-note">暂无种族映射</span>'}</div>
    <div class="rowline" style="margin-top:4px;gap:5px">
      <button class="btn btn--sm" data-act="canvas-racealias-open">＋ 种族映射</button>
    </div>
  </div>` : ''}

  <div class="sec">
    <div class="sec__h"><b>图层顺序 STACK</b><span class="mini-note" style="margin:0">上面的盖住下面的</span></div>
    <div class="stack">${stackRows || '<p class="mini-note">这张画布还没有部位</p>'}</div>
    ${stack.length > 80 ? `<p class="mini-note">只列出最上面 80 个（共 ${stack.length}）</p>` : ''}
  </div>

  <div class="sec">
    <div class="sec__h"><b>RJW 器官 RJW</b><span class="tagx">RimJobWorld</span><span class="wip">未完成</span></div>
    <div class="swrow">
      <button class="switch${c.rjw ? ' is-on' : ''}" data-act="rjw" role="switch" aria-checked="${c.rjw ? 'true' : 'false'}" ${RJW_PARTS.length ? '' : 'disabled'}><i></i></button>
      <div style="min-width:0">
        <b>${c.rjw ? '已启用' : '未启用'}</b>
        <span>${rjwCounts(c)}</span>
      </div>
    </div>
    <p class="mini-note">${RJW_PARTS.length
      ? `打开后按模组 Defs 自动补上 <b>${(RJW_BY_DOLL.get(rjwSourceDoll(c)) || []).length}</b> 个 RJW 标记（借自 <b>${esc(rjwSourceDoll(c))}</b> 体型的坐标）。默认可见性遵循模组设置：男性不绘胸部、扶她不绘性腺、儿童人偶不绘标记。器官层的标记要另外点工具栏的「器官」才显示，和这个开关互不影响。`
      : '未载入 RJW Genitalia 数据。'}</p>
    <div class="rowline" style="margin-top:6px">
      <button class="btn btn--sm" data-act="rjw-show-all" ${c.rjw ? '' : 'disabled style="opacity:.4"'}>${icon('eye')}全部显示</button>
      <button class="btn btn--sm" data-act="rjw-hide-all" ${c.rjw ? '' : 'disabled style="opacity:.4"'}>${icon('eyeoff')}全部隐藏</button>
      <button class="btn btn--sm" data-act="rjw-resync" title="按当前 Doll 名与基础体型重新生成 RJW 部位" ${c.rjw ? '' : 'disabled style="opacity:.4"'}>${icon('rot')}重新同步</button>
    </div>
    <p class="mini-note">下体窗按<b>性别</b>取舍：男 = 性腺 + 生殖器（缺一个会用模组默认补上，总是一起出现），女 = 子宫 + 阴道 + 卵巢，其他/无 = 只显示底图。这里填 <b>Male</b> / <b>Female</b> / <b>none</b> 即可控制；填 <b>*</b> 时跟随体型（Male/Fat/Hulk 算男、Female 算女、Kid 不显示）。</p>
  </div>

    <div class="sec">
    <div class="sec__h"><b>边界 BOUNDS</b><span class="tagx">BoundingBox</span></div>
    <div class="field"><label>X / Y</label><div class="ctl num2">
      <input class="inp" type="number" data-f="c.bx" value="${round(c.bounds.x, 1)}" step="0.1">
      <input class="inp" type="number" data-f="c.by" value="${round(c.bounds.y, 1)}" step="0.1">
    </div></div>
    <div class="field"><label>宽 / 高</label><div class="ctl num2">
      <input class="inp" type="number" data-f="c.bw" value="${round(c.bounds.w, 1)}" step="0.1">
      <input class="inp" type="number" data-f="c.bh" value="${round(c.bounds.h, 1)}" step="0.1">
    </div></div>
    <p class="mini-note">写进补丁的 &lt;BoundingBox&gt;：决定游戏里娃娃的大小（框越小娃娃越大）。</p>
    <details class="fold">
      <summary>功能</summary>
      <div class="fold__body">
        <div class="rowline" style="flex-direction:column;align-items:stretch;gap:6px">
        <button class="btn btn--sm" data-act="fix-bids">${icon('body')}按官方 def 校正部位编号</button>
        <button class="btn btn--sm" data-act="norm-box">${icon('target')}缩放到官方包围盒 320×890</button>
        <button class="btn btn--sm" data-act="fit-bounds">${icon('target')}按部位适配边界</button>
        </div>
      </div>
    </details>
  </div>

  <div class="sec">
    <div class="sec__h"><b>导出偏移 EXPORT OFFSET</b><span class="tagx">offsetX / offsetY</span></div>
    <div class="field"><label>X / Y</label><div class="ctl num2">
      <input class="inp" type="number" data-f="c.offx" value="${round((c.exportOffset && c.exportOffset.x) || 0, 1)}" step="0.1">
      <input class="inp" type="number" data-f="c.offy" value="${round((c.exportOffset && c.exportOffset.y) || 0, 1)}" step="0.1">
    </div></div>
    ${exportYConvRow(c)}
    <p class="mini-note">在所有部位的导出坐标上统一加一个固定量（单位 = 游戏画布 512×1024 的像素）。它只改变部位在框里的位置，编辑器画面不变。</p>
    <p class="mini-note offnote">怎么填：<b class="hl">Y 填正数 → 游戏里整体向下移</b>；<b class="hl">Y 填负数 → 整体向上移</b>。<b class="hl">X 正数向右、负数向左</b>。数值单位是像素，<b class="hl">37.5 ≈ 全身高度的 3.7%</b>，一般微调在 ±5 ~ ±40 之间。</p>
    <div class="swrow" style="margin-top:8px">
      <button class="switch${c.noExportCenter ? '' : ' is-on'}" data-act="auto-center" role="switch"
        aria-checked="${c.noExportCenter ? 'false' : 'true'}"
        title="开启：导出时先减内容中心，加/删部件会让整体位置漂移；关闭：导出坐标 = 画布坐标 × k + 偏移（固定）"><i></i></button>
      <div style="min-width:0">
        <b>自动居中</b>
        <span class="offnote">${c.noExportCenter
          ? '当前：<b class="hl">不居中</b>。导出位置 = 画布位置 + 上面的偏移，<b class="hl">加/删部件都不会让整体位置变</b>。'
          : '当前：<b class="hl">自动居中</b>。导出前会把内容整体挪一下，让它的<b class="hl">上下中心对准原点</b>；挪多少由内容大小自动算，所以<b class="hl">加头饰、拉翅膀、隐藏部件都会让它变</b>。'}</span>
      </div>
    </div>
    <p class="mini-note offnote" style="margin-top:6px">一句话记：<b class="hl">开启 = 自动对准内容中心（数值会自己变）</b>；<b class="hl">关闭 = 位置定死</b>，只认上面填的偏移。想要稳定就关闭，再把想下移的量写进偏移。</p>
    <details class="fold">
      <summary>它怎么算的</summary>
      <div class="fold__body">
        <p class="mini-note">顺序：① 部件原坐标 → ② 减去内容中心（自动居中）→ ③ 乘缩放 k → ④ 加上这里的偏移 → 写入 &lt;position&gt;。</p>
        <p class="mini-note">k = min(512 ÷ 内容宽, 1024 ÷ 内容高, 1)；内容中心 = 所有部位外接框的中心。</p>
        <p class="mini-note">公式：<code>导出X = (x − cx) · k + offsetX</code>，<code>导出Y = (y − cy) · k + offsetY</code>。</p>
        <p class="mini-note">不受它影响：<b>BoundingBox</b>（边界）、<b>实际显示框</b>、头发的缩放/偏移、编辑器里的画面。它是"整体平移"，不是缩放。</p>
      </div>
    </details>
  </div>

  <div class="sec">
    <div class="sec__h"><b>实际显示框 DISPLAY</b><span class="tagx">NHT 面板显示区域</span></div>
    <div class="field"><label>宽 / 高</label><div class="ctl num2">
      <input class="inp" type="number" data-f="c.dw" value="${c.displayBox ? round(c.displayBox.w, 0) : 512}" step="1" min="16">
      <input class="inp" type="number" data-f="c.dh" value="${c.displayBox ? round(c.displayBox.h, 0) : 896}" step="1" min="16">
    </div></div>
    ${displayHeightRow(c)}
    <div class="rowline" style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <button class="btn btn--sm" data-act="disp-toggle">${icon(c.displayBox && c.displayBox.show !== false ? 'eyeoff' : 'eye')}${c.displayBox && c.displayBox.show !== false ? '隐藏' : '显示'}实际显示框</button>

      <button class="btn btn--sm" data-act="disp-lock">${icon('lock')}${c.displayBox && c.displayBox.locked ? '解除固定' : '固定'}显示框</button>
    </div>
    <div class="field" style="margin-top:6px"><label>位置</label><div class="ctl">
      <select class="inp" data-f="c.dpos">
        ${[['bottom', '贴底居中'], ['middle', '居中'], ['top', '贴顶居中'], ['free', '自定义（画布拖动）']].map(([v, n]) =>
          `<option value="${v}"${(c.displayBox && (c.displayBox.pos || 'bottom')) === v ? ' selected' : ''}>${n}</option>`).join('')}
      </select>
    </div></div>
    <p class="mini-note">画布上那个蓝色框：游戏里 NHT 面板真正显示的区域。部位超出它会被标红提示（提示只看部位锚点）。</p>
  </div>

    <div class="sec">
    <div class="sec__h"><b>部位映射 BODY MAPPING</b><span class="tagx">补丁 / 游戏对照</span></div>
    ${(Array.isArray(c.race && c.race.bodyDefs) && c.race.bodyDefs.length >= 1) ? `<div class="field"><label>部位表 BodyDef</label><div class="ctl"><select class="inp" data-act="canvas-bodydef-pick">${c.race.bodyDefs.map(d => `<option value="${esc(d.defName)}"${d.defName === c.race.bodyDef ? ' selected' : ''}>${esc(d.defName)}（${(d.parts || []).length} 项）</option>`).join('')}</select></div></div>` : ''}
    <div class="rowline" style="margin-top:4px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <button class="btn btn--sm" data-act="fix-body-map" title="读取模组写出的 body-map，把部位编号修正成游戏使用的 NHT 槽位">${icon('dna')}按对照表修正编号</button>
      <button class="btn btn--sm" data-act="sync-body-parts" title="把游戏里自动注册的部位（含 64+ 的尾巴等）同步进「部位」下拉">${icon('refresh')}同步游戏部位表</button>
      <button class="btn btn--sm" data-act="rebuild-body-parts" title="清空当前画布的种族部位表，再从种族 BodyDef 的 parts 重新生成">${icon('dna')}重新获取种族部位表</button>
      <button class="btn btn--sm" data-act="reimport-body-parts" title="清空当前画布的种族部位表，再从种族 BodyDef 的 parts 重新导入">${icon('dl')}重新导入种族部位表</button>
    </div>
    <p class="mini-note" style="margin:4px 0 0">编辑器会优先读 <code>Patches/nht-&lt;种族&gt;.xml</code> 的 <code>DollBodyPart</code> 编号；没有补丁时才回退到 body-map / 猜测。</p>
  </div>
<div class="sec">
    <div class="sec__h"><b>自动变换 AUTO FOLLOW</b><span class="tagx">HAR bodyAddon</span></div>
    <p class="mini-note" style="margin:2px 0 6px">扫描当前画布：把有自定义 colorChannel 的 bodyAddon 部位标记出来；开关默认关闭，之后在部位属性里单独打开。</p>
    <button class="btn btn--sm" data-act="scan-follow">${icon('dna')}扫描现有画布</button>
  </div>


    </div>
  </div>

  <div class="sec">
    <div class="sec__h"><b>轮廓贴图 OUTLINE</b></div>
    <div class="field"><label>投影</label><div class="ctl">
      <input class="inp inp--txt" data-f="c.outline" value="${esc(c.outline || '')}" spellcheck="false" placeholder="HediffTab/.../Outline">
    </div></div>

  </div>

  ${race ? `<div class="sec">
    <div class="sec__h"><b>种族来源 SOURCE</b></div>
    <div class="kv">
      <b>模组</b><span>${esc(race.modName || '—')}</span>
      <b>包名</b><span>${esc(race.packageId || '—')}</span>
      <b>BodyDef</b><span>${esc(race.bodyDef || '—')}</span>
      <b>部位</b><span>${esc((race.partCount || 0) + ' 个 · 新增 ' + (race.added || 0))}</span>
    </div>
  </div>` : ''}

  <div class="sec">
    <div class="sec__h"><b>说明 NOTES</b></div>
    <textarea class="inp inp--txt" data-f="c.notes" rows="3" style="height:auto;padding:6px 7px;line-height:1.6;resize:vertical" placeholder="这个画布的用途…">${esc(c.notes || '')}</textarea>
    <p class="mini-note">提示：切换画布 = 切换一套独立的部位布局。默认 5 个体型画布来自模组 1.6 Defs。</p>
  </div>

  ${c.kind !== 'default' ? `<div class="sec sec--tight">
    <div class="sec__actions">
      <button class="btn btn--xs btn--danger" data-act="del-canvas" data-id="${esc(c.id)}" title="删除这张画布">${icon('trash')}删除画布</button>
    </div>
  </div>` : `<div class="sec">
    <div class="sec__actions">
      <button class="btn btn--xs" data-act="reset-canvas">${icon('rot')}重置为模组默认</button>
    </div>
    <p class="mini-note">恢复模组 1.6 Defs 里这个体型的原始坐标与部位，当前修改会被丢弃（可撤销）。</p>
  </div>`}`;
}

/* ==========================================================================
   RENDER: asset library
   ========================================================================== */
const CATS = [
  ['all', '全部'], ['mine', '我的素材'], ['race', '种族素材'], ['baseliner', '体型部件'], ['prosthesis', '假体 / 附肢'], ['organs', '器官'],
  ['bones', '骨骼'], ['xeno', '异种'], ['rjw', 'RJW 部位'], ['common', '贴花'], ['icons', '图标'], ['armor', '护甲']
];
/* hairstyles pulled out of the last imported race mod: click one and it snaps to the head */
let HAIRS = [];
/* hairstyle shown only as a visual reference; never part of the canvas */
let HAIR_REF = null;
let hairDrag = null;
const PRESETS = [
  { label: '尾巴', img: 'HediffTab/Yttakin/FurryTail', x: 0, y: 150, sx: 0.85, sy: 0.85, layer: 6 },
  { label: '触手', img: 'HediffTab/Prosthesis/Tentacle', x: 90, y: 220, sx: 0.9, sy: 0.9, layer: 7 },
  { label: '长触手', img: 'HediffTab/Prosthesis/TentacleLong', x: 110, y: 240, sx: 0.8, sy: 0.8, layer: 7 },
  { label: '肉鞭', img: 'HediffTab/Prosthesis/FleshWhipLong', x: 120, y: 120, sx: 0.7, sy: 0.7, layer: 7 },
  { label: '翼（模拟）', img: 'HediffTab/Prosthesis/TentacleLong', x: 150, y: -150, sx: 1.1, sy: 1.1, layer: 40, pair: true },
  { label: '钩手', img: 'HediffTab/Prosthesis/Hook', x: 150, y: 20, sx: 1, sy: 1, layer: 8 },
  { label: '木腿', img: 'HediffTab/Prosthesis/WoodenLeg', x: 60, y: 300, sx: 1, sy: 1, layer: 8 },
  { label: '猪鼻', img: 'HediffTab/Pigskin/PigNose', x: 0, y: -354, sx: 1.2, sy: 1.2, layer: 16 }
];

/* --- 我的素材: user made sub folders ------------------------------------- */
function mineState() {
  if (!S.mine || !Array.isArray(S.mine.folders) || !S.mine.folders.length) {
    S.mine = { folders: [{ id: 'f1', name: '未分类', paths: [] }], seq: 2 };
  }
  if (!(S.mine.seq > 0)) S.mine.seq = S.mine.folders.length + 1;
  return S.mine;
}

function mineFolderOf(path) {
  const m = mineState();
  return m.folders.find(f => f.paths && f.paths.includes(path)) || null;
}

function mineAssign(path, folderId, beforePath) {
  const m = mineState();
  m.folders.forEach(f => { f.paths = (f.paths || []).filter(p => p !== path); });
  const f = m.folders.find(x => x.id === folderId) || m.folders[0];
  if (!f.paths) f.paths = [];
  const at = beforePath ? f.paths.indexOf(beforePath) : -1;
  if (at >= 0) f.paths.splice(at, 0, path); else f.paths.push(path);
  persist();
  renderLibrary();
}

function mineNewFolder(name) {
  const m = mineState();
  const id = 'f' + (m.seq++);
  m.folders.push({ id, name: name || ('分组 ' + m.folders.length), paths: [] });
  persist();
  renderLibrary();
  return id;
}

function mineRenameFolder(id, name) {
  const m = mineState();
  const f = m.folders.find(x => x.id === id);
  if (!f) return;
  f.name = String(name || '').trim() || f.name;
  persist();
  renderLibrary();
}

/* right-click menu for any asset tile */
function assetMenu(path, x, y) {
  closeAssetMenu();
  const cropOn = !!(S.settings && S.settings.autoCrop);
  const cats = (MINE_DIRS && MINE_DIRS.length ? MINE_DIRS.slice() : mineCats(ASSETS || []).map(c => c.name));
  const curCat = (String(path).split('/').length > 2) ? String(path).split('/')[1] : '未分类';
  const catItems = cats.filter(c => c !== curCat).map(c =>
    `<button class="ctx__i" data-act="mine-move-asset" data-p="${esc(path)}" data-cat="${esc(c)}"><span>→</span>${esc(c)}</button>`).join('');
  const el = document.createElement('div');
  el.className = 'ctx';
  el.id = 'assetMenu';
  el.style.left = Math.min(x, window.innerWidth - 230) + 'px';
  el.style.top = Math.min(y, window.innerHeight - 300) + 'px';
  el.innerHTML = `
    <div class="ctx__h">素材</div>
    <div class="ctx__t">${esc(path.split('/').pop())}</div>
    ${(String(path).indexOf('Custom/') === 0)
      ? (!isCroppedAsset(path) ? `<button class="ctx__i" data-act="crop-inplace" data-key="${esc(path)}" title="裁掉透明边缘并覆盖保存当前素材"><span>✂</span>裁剪</button>` : '')
      : `<button class="ctx__i" data-act="crop-save-mod" data-key="${esc(path)}" title="裁掉透明边缘并保存到对应种族的分类"><span>✂</span>裁剪并保存</button>`}
    <button class="ctx__i" data-act="asset-export" data-p="${esc(path)}"><span>⤓</span>导出 PNG（选择保存位置）</button>
    ${assetDiskPath(path) ? `<button class="ctx__i" data-act="asset-reveal" data-p="${esc(path)}"><span>📂</span>打开文件所在文件夹</button>` : ''}
    ${(String(path).indexOf('Custom/') === 0) ? `
      <div class="ctx__h">移动到分类</div>
      <div class="ctx__list">${catItems || '<span class="ctx__empty">没有其它分类</span>'}</div>
      <button class="ctx__i" data-act="mine-new-cat-asset" data-p="${esc(path)}"><span>＋</span>新建分类并保存…</button>` : ''}`;
  document.body.appendChild(el);
}
function closeAssetMenu() {
  const el = $('#assetMenu');
  if (el) el.remove();
}

/* the png on disk (only for art that lives in the html folder, not memory blobs) */
function assetDiskPath(key) {
  const rec = EXT.get(key) || {};
  const url = String(rec.url || '');
  if (!/^(assets|Custom)\//i.test(url)) return null;
  const base = location.href.replace(/[?#].*$/, '').replace(/\/[^/]*$/, '');
  let abs = base + '/' + url;
  try { abs = decodeURI(abs); } catch (e) { }
  return abs.replace(/^file:\/\/\//i, '').replace(/\//g, '\\');
}

async function revealAsset(path) {
  const abs = assetDiskPath(path);
  if (!abs) {
    toast('这张图在浏览器内存里，没有磁盘路径；先用「保存到 assets/」或「导出 PNG」落盘', true);
    return;
  }
  await copyText(abs);
  toast('路径已复制：' + abs + '（粘贴到资源管理器地址栏）');
}

async function exportAsset(path) {
  const e = EXT.get(path);
  const url = e && e.url;
  if (!url) { toast('导不出来：这张图不在本地缓存里', true); return; }
  const name = String(path).split('/').pop() + '.png';
  // prefer a real "save as" dialog so the user picks the folder
  if (typeof window.showSaveFilePicker === 'function') {
    let handle = null;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'PNG 图片', accept: { 'image/png': ['.png'] } }]
      });
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // cancelled
    }
    if (handle) {
      try {
        let blob = null;
        try { blob = await (await fetch(url)).blob(); } catch (err) { blob = null; }
        if (!blob) { toast('导不出来：这张图不在本地缓存里', true); return; }
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        toast('已保存到 ' + (handle.name || name));
      } catch (err) {
        toast('保存失败：' + err.message, true);
      }
      return;
    }
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('已导出 ' + name);
}


/* 当前画布的 HAR 头发参数（显示在素材-发型栏里） */

/* 画布里最高的部位层级：头发的层级高于它 = 画在最上面 */
function maxPartLayer(c) {
  let m = 0;
  (c && c.parts || []).forEach(p => { if (Number.isFinite(p.layer) && p.layer > m) m = p.layer; });
  return m;
}




/* ---------------- 参考发型：按画布分别记住 ---------------- */
let REF_OWNER_ID = null;

function refSnap() {
  if (!HAIR_REF) return null;
  return {
    img: HAIR_REF.img,
    vis: HAIR_REF.vis !== false,
    locked: !!HAIR_REF.locked,
    layer: HAIR_REF.layer,
    backLayer: HAIR_REF.backLayer != null ? HAIR_REF.backLayer : 0,
    x: HAIR_REF.x, y: HAIR_REF.y, sx: HAIR_REF.sx, sy: HAIR_REF.sy,
  };
}

function saveRefForCanvas() {
  // 必须写回当前参考所属的那张画布，不能用 activeCanvas（切画布时它已经是新画布了）
  const c = S.canvases.find(x => x.id === REF_OWNER_ID) || activeCanvas();
  if (!c || !HAIR_REF) return;
  const snap = refSnap();
  c.hairRef = snap;
  // 同一张画布里，每个发型各记一份：换回来不丢参数
  if (!c.hairRefs || typeof c.hairRefs !== 'object') c.hairRefs = {};
  c.hairRefs[HAIR_REF.img] = snap;
}

function applyRefForCanvas(c) {
  // 切换画布时把这张画布记住的参考发型状态套回去
  if (!c || !HAIR_REF) return;
  const st = (c.hairRefs && HAIR_REF && c.hairRefs[HAIR_REF.img]) || c.hairRef;
  if (!st || st.img !== HAIR_REF.img) return;
  HAIR_REF.vis = st.vis === true;
  HAIR_REF.locked = !!st.locked;
  if (Number.isFinite(st.layer)) HAIR_REF.layer = st.layer;
  HAIR_REF.backLayer = Number.isFinite(st.backLayer) ? st.backLayer : 0;
  if (Number.isFinite(st.x)) HAIR_REF.x = st.x;
  if (Number.isFinite(st.y)) HAIR_REF.y = st.y;
  if (Number.isFinite(st.sx)) { HAIR_REF.sx = st.sx; HAIR_REF.sy = Number.isFinite(st.sy) ? st.sy : st.sx; }
}

function applyRefState(st) {
  if (!HAIR_REF || !st) return;
  HAIR_REF.vis = st.vis === true;
  HAIR_REF.locked = !!st.locked;
  if (Number.isFinite(st.layer)) HAIR_REF.layer = st.layer;
  HAIR_REF.backLayer = Number.isFinite(st.backLayer) ? st.backLayer : 0;
  if (Number.isFinite(st.x)) HAIR_REF.x = st.x;
  if (Number.isFinite(st.y)) HAIR_REF.y = st.y;
  if (Number.isFinite(st.sx)) { HAIR_REF.sx = st.sx; HAIR_REF.sy = Number.isFinite(st.sy) ? st.sy : st.sx; }
}

function syncRefForCanvas(c) {
  if (!c || REF_OWNER_ID === c.id) return;
  saveRefForCanvas();                 // 先把上一张画布的状态存好
  REF_OWNER_ID = c.id;
  const st = c.hairRef;
  if (!st || !st.img) {
    HAIR_REF = null;                  // 这张画布没有参考发型 → 什么都不显示
    return;
  }
  if (!HAIR_REF || HAIR_REF.img !== st.img) {
    // 这张画布用的是另一个发型：载入它自己的
    Promise.resolve(applyHair(st.img, true)).then(() => {
      applyRefState(st);
      try { renderStage(); } catch (e) { }
    }).catch(() => { });
    return;
  }
  applyRefState(st);
}

function hairFitLine(c) {
  const ref = (typeof HAIR_REF !== 'undefined') ? HAIR_REF : null;
  if (!ref || !ref.img) return '<div class="hairfitline">当前发型：<b>未选择</b>（点上面的发型作为参考）</div>';
  const base = ref.baseSX || ref.sx || 1;
  const scale = base ? (ref.sx || base) / base : 1;
  const dx = Math.round((ref.x || 0) - (ref.autoX != null ? ref.autoX : 0));
  const dy = Math.round((ref.y || 0) - (ref.autoY != null ? ref.autoY : 0));
  const layerN = ref.layer != null ? ref.layer : 20;
  const top = maxPartLayer(c);
  return `<div class="hairfitline">当前发型：偏移 <b>${dx}</b> / <b>${dy}</b> px`
    + ` · 缩放 <b>×${scale.toFixed(3)}</b> · 层级 <b>${layerN}</b>/${top}`
    + ` · <span style="opacity:.7">${esc(String(ref.img).split('/').pop())}</span>`
    + (() => {
      const b = findBackHair(ref.img);
      return b ? ` · <span style="opacity:.85">后背层 ${esc(b.split('/').pop())}</span>` : ' · <span style="opacity:.55">无后背层</span>';
    })()
    + ` · <b style="color:#e3b558">仅参考-NHT模组自带发型配对</b></div>`;
}

let SEARCH_FOCUS = null;   // 正在搜索时记住光标位置，重建面板后要还原

function hairRefBarHTML() {
  return `${hairFitLine(activeCanvas())}
      <div class="hair-refbar">
        <button class="btn btn--xs" data-act="hair-reset" title="回到自动贴合">${icon('rot')}复位</button>
        <button class="btn btn--xs${HAIR_REF && HAIR_REF.locked ? ' btn--on' : ''}" data-act="hair-lock" title="对齐好后锁定，防止被拖走">${icon(HAIR_REF && HAIR_REF.locked ? 'lock' : 'unlock')}${HAIR_REF && HAIR_REF.locked ? '已锁定' : '锁定'}</button>
        <button class="btn btn--xs" data-act="hair-vis" title="临时隐藏 / 显示参考图，位置不会丢">${icon(HAIR_REF && HAIR_REF.vis === false ? 'eyeoff' : 'eye')}${HAIR_REF && HAIR_REF.vis === false ? '已隐藏' : '显示'}</button>
        <button class="btn btn--xs" data-act="hair-clear">${icon('x')}关掉</button>
      </div>
      <div class="hair-refbar">
        <span class="mini-note" style="margin:0;flex:0 0 auto">图层</span>
        <input class="inp hair-z" id="hairZInput" type="number" step="1" min="0" max="150" value="${HAIR_REF && HAIR_REF.layer != null ? HAIR_REF.layer : 20}" title="发型参考的临时图层（只影响预览，不会导出）">
        <span class="mini-note" style="margin:0 0 0 6px;flex:0 0 auto">后层</span>
        <input class="inp hair-z" id="hairBackZInput" type="number" step="1" min="0" max="150" value="${HAIR_REF && HAIR_REF.backLayer != null ? HAIR_REF.backLayer : 0}" title="后背层的临时图层（默认 0，只影响预览，不会导出）">
        <button class="btn btn--xs" data-act="hair-down" title="往下压一层">${icon('arrdn')}下移</button>
        <button class="btn btn--xs" data-act="hair-up" title="往上提一层">${icon('arrup')}上移</button>
      </div>
      <p class="mini-note" style="margin:2px 0 8px">点一个发型只是<b>放在头上做视觉参考</b>（用来对耳朵 / 角的位置），不会变成部位、也不会导出；<b>拖动微调、滚轮缩放</b>，<b>拖动时按住 Shift 会自动对齐头部中心 / 边缘</b>，对齐后点「锁定」就不会再被拖走。图层输入框和部位共用一套刻度（数值大＝盖在上面）。</p>`;
}


/* ---------- 右下角悬浮：参考发型配置 ---------- */

/* ---------------- 指南（内容来自 ui/guides.js，可自行编辑） ---------------- */
function modalGuides() {
  const en = LANG === 'en';
  const src = (en && Array.isArray(window.NHT_GUIDES_EN)) ? window.NHT_GUIDES_EN : window.NHT_GUIDES;
  const list = Array.isArray(src) ? src : [];
  const body = list.length
    ? list.map((g, i) => `<div class="gdi">
        <button class="gdi__h" data-act="guide-toggle" data-gi="${i}">
          <span class="gdi__chev">▸</span><b>${esc(g.title || (en ? '(untitled)' : '未命名'))}</b></button>
        <div class="gdi__b" data-gb="${i}" hidden>${g.body || ''}</div>
      </div>`).join('')
    : `<p class="mini-note">${en ? 'No guide content found.' : '没有找到指南内容。'}</p>`;
  openModal(`<div style="width:min(700px,94vw)">
    <div class="modal__head"><span class="idx">GUIDE</span><h3>${en ? 'Guides' : '指南'}</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <div class="gdlist">${body}</div>
      <p class="mini-note" style="margin-top:8px">${en ? 'Content comes from <code>ui/guides.js</code> in the editor folder; edit that file directly.' : '内容来自编辑器目录下的 <code>ui/guides.js</code>，可以直接编辑这个文件。'}</p>
    </div></div>`);
}

function renderRefDock() {
  const box = document.getElementById('refDockBody');
  const dock = document.getElementById('refDock');
  const dot = document.getElementById('refDot');
  if (!box || !dock) return;
  // 只在「素材」分栏出现
  if (S.tab !== 'assets') { dock.hidden = true; if (dot) dot.hidden = true; return; }
  const shut = S.ui.refDockShut !== false;   // 默认收起
  dock.hidden = shut;                        // 收起 → 整个面板隐藏
  if (dot) dot.hidden = !shut;               // 只剩一个圆形悬浮按钮
  if (shut) return;
  if (box.contains(document.activeElement)) return;   // 正在输入就别重建
  box.innerHTML = hairRefBarHTML();
}

function scrollPaneTop() {
  const panes = document.querySelectorAll('.pane');
  panes.forEach(p => { p.scrollTop = 0; });
  const body = document.querySelector('.panel__body');
  if (body) body.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderLibrary() {
  try { scanSavedHairAssets(); } catch (e) { }
  const pane = $('#paneAssets');
  // 记住搜索框的焦点/光标/滚动位置：重建面板后要还原，否则输入一个字就失焦
  const act = document.activeElement;
  const wasTyping = !!(act && act.dataset && act.dataset.f === 'lib.q' && pane.contains(act));
  const caret = wasTyping ? act.selectionStart : null;
  const keepScroll = pane ? pane.scrollTop : 0;
  const q = norm(S.ui.q);
  const cat = S.ui.cat;
  const rank = a => (a.cat === 'race' ? 0 : (a.cat === 'mine' ? 1 : 2));
  // group first, then cap per group: a single global cap used to swallow every group
  // that came after the (large) race-mod assets
  const matches = ASSETS.filter(a => (cat === 'all' || a.cat === cat) && (!q || norm(a.p).includes(q) || norm(a.n).includes(q)))
    .sort((a, b) => rank(a) - rank(b));
  const groups = [];
  if (cat === 'all') {
    const byG = new Map();
    matches.forEach(a => {
      let g = a.cat === 'rjw' ? '模组 · RJW 器官'
        : (a.cat === 'race' && a.g && !/^模组/.test(a.g) ? ('模组 · ' + a.g) : a.g);
      if (!g) g = '未分类';
      g = displayGroupName(g);
      if (!byG.has(g)) byG.set(g, []);
      byG.get(g).push(a);
    });
    // RJW art gets its own top-level group, the same way race mods do
    byG.forEach((items, g) => groups.push({ g, items, total: items.length }));
  } else if (cat === 'rjw') {
    const byG = new Map();
    matches.forEach(a => {
      const g = a.g || '其它';
      if (!byG.has(g)) byG.set(g, []);
      byG.get(g).push(a);
    });
    byG.forEach((items, g) => groups.push({ g, items, total: items.length }));
  } else if (cat === 'race') {
    const byG = new Map();
    matches.forEach(a => {
      const raw = a.g || a.modKey || '种族素材';
      const g = displayGroupName(/^模组/.test(raw) ? raw : ('模组 · ' + raw));
      if (!byG.has(g)) byG.set(g, []);
      byG.get(g).push(a);
    });
    byG.forEach((items, g) => groups.push({ g, items, total: items.length }));
  } else {
    groups.push({ g: '', items: matches, total: matches.length });
  }
  groups.sort((a, b) => {
    const rank = g => (g === '我的素材' ? 0 : (/^模组/.test(g) ? 1 : 2));
    const d = rank(a.g) - rank(b.g);
    return d || String(a.g).localeCompare(String(b.g));
  });
  if (!S.ui.open) S.ui.open = {};      // group -> expanded; everything starts collapsed
  const tile = a => `<button class="tile" draggable="true" data-act="add-asset" data-p="${esc(a.p)}" title="${esc(a.p)}${a.custom ? ' · 本机素材' : ''}">
      <span class="tile__img"><i style="background-image:url('${imgURL(a.p)}')"></i></span>
      <b>${esc(a.n)}</b><i class="d">${a.w}×${a.h}</i>
      ${a.custom ? `<span class="tile__del${S.ui.delArm === a.p ? ' is-arm' : ''}" data-act="asset-del" data-p="${esc(a.p)}" title="${S.ui.delArm === a.p ? '再点一次删除' : '从素材库删除'}">${S.ui.delArm === a.p ? '删除?' : '×'}</span>` : ''}
    </button>`;
  normalizeHairFlags();
  const hairHits = HAIRS.filter(h => !q || norm(h.n).includes(q));
  const hairOpen = !!S.ui.open['__hair'];
  const hairMods = [];
  {
    const byMod = new Map();
    hairHits.forEach(h => {
      const k = displayGroupName(h.g || h.modKey || '本地导入');
      if (!byMod.has(k)) byMod.set(k, []);
      byMod.get(k).push(h);
    });
    [...byMod.entries()].sort((a, b) => b[1].length - a[1].length).forEach(e => hairMods.push(e));
  }
  const grp = (g, items, total) => {
    if (!g) return `<div class="grid">${items.map(tile).join('')}</div>`;
    const open = !!S.ui.open[g];
    // 我的素材 has its own layout: user made sub folders, drag to sort, rename
    if (g === '我的素材') {
      const cats = mineCats(items);
      const open = !!S.ui.open['我的素材'];
      const mineHead = `<div class="libgrp libgrp--mine${open ? ' is-open' : ''}" data-act="lib-grp" data-g="我的素材"><span>${open ? '▾' : '▸'}</span><b>★ 我的素材</b><i>${items.length}</i></div>`;
      if (!open) return mineHead;
      const body = cats.map(cat => {
        const key = 'mine:' + cat.name;
        const so = !!S.ui.open[key];
        const list = cat.list;
        const head = `<div class="libgrp sub mine__f libgrp--cat${so ? ' is-open' : ''}" data-act="lib-grp" data-g="${esc(key)}"
            draggable="true" data-minecat="${esc(cat.name)}">
            <span>${so ? '▾' : '▸'}</span><b>${esc(upperFirst(cat.name))}</b><i>${list.length}</i>
            <button class="row__act" data-act="mine-rename-cat" data-cat="${esc(cat.name)}" title="重命名分类（会改文件夹名）">${icon('tag')}</button>
            <button class="row__act" data-act="mine-del-cat" data-cat="${esc(cat.name)}" title="删除分类（会删除文件夹）">${icon('trash')}</button>
          </div>`;
        const grid = so ? `<div class="grid">${list.map(a => `<span class="tile__wrap" draggable="true" data-p="${esc(a.p)}">${tile(a)}</span>`).join('')}</div>` : '';
        return head + grid;
      }).join('');
      return mineHead + `<p class="mini-note" style="padding:2px 4px 6px">拖动分类可排序 · 点标签改名 / 删除会同步 Custom 文件夹</p>` + body;
    }

    // mod groups get one more level: sub-folders (the body part the art belongs to)
    if (/^模组/.test(g)) {
      let inner = '';
      if (open) {
        const bySub = new Map();
        items.forEach(a => {
          const parts = String(a.p).split('/');
          const sub = a.cat === 'rjw' ? (a.g || '其它') : (parts.length > 1 ? parts[parts.length - 2] : '其它');
          if (!bySub.has(sub)) bySub.set(sub, []);
          bySub.get(sub).push(a);
        });
        inner = [...bySub.entries()].sort((a, b) => b[1].length - a[1].length).map(([sub, list]) => {
          const key = g + '|' + sub;
          const so = !!S.ui.open[key];
          // t105：不再截断到 90 张（那是"素材好像少了"的主要来源），全部渲染；
          // 分组默认折叠，只有展开的组才会建 DOM，几千张也不会卡。
          const shown = list;
          const more = '';
          return `<div class="libgrp sub${so ? ' is-open' : ''}" data-act="lib-grp" data-g="${esc(key)}">
              <span>${so ? '▾' : '▸'}</span><b>${esc(upperFirst(sub))}</b><i>${list.length}</i></div>
            ${so ? `<div class="grid">${shown.map(tile).join('')}</div>${more}` : ''}`;
        }).join('');
      }
      return `<div class="libgrp${open ? ' is-open' : ''}" data-act="lib-grp" data-g="${esc(g)}"><span>${open ? '▾' : '▸'}</span><b>${esc(g)}</b><i>${total || items.length}</i></div>${inner}`;
    }
    const shown = items;
    const more = '';
    return `<div class="libgrp${open ? ' is-open' : ''}" data-act="lib-grp" data-g="${esc(g)}"><span>${open ? '▾' : '▸'}</span><b>${esc(g)}</b><i>${total || items.length}</i></div>
      ${open ? `<div class="grid">${shown.map(tile).join('')}</div>${more}` : ''}`;
  };
  pane.innerHTML = `
    <div class="libtop">
      <div class="libsearch">${icon('search')}<input class="inp inp--txt" data-f="lib.q" value="${esc(S.ui.q)}" placeholder="搜索贴图：翅膀 / tail / organ …" spellcheck="false"></div>
      <select class="inp libcat" id="libCat" title="素材分类">${CATS.map(([k, l]) => {
        const n = k === 'all' ? ASSETS.length : ASSETS.filter(a => a.cat === k).length;
        return `<option value="${k}"${S.ui.cat === k ? ' selected' : ''}>${l} (${n})</option>`;
      }).join('')}</select>
    </div>
    <div class="libact">
      <button class="btn btn--sm${S.settings && S.settings.autoCrop ? ' btn--on' : ' btn--off'}" data-act="crop-toggle"
        title="自动裁剪：点击素材时把透明边缘裁掉并缓存（最多 ${S.settings && S.settings.cropMax ? S.settings.cropMax : 4} 个）。只有真正用到画布上的素材会在本地保存时写进 Custom。">✂ 自动裁剪</button>
      <button class="btn btn--sm" data-act="import-assets" title="从图片文件或整个模组文件夹把素材收进素材库">${icon('folder')}导入素材</button>
      <button class="btn btn--sm" data-act="import-hair" title="从图片文件或模组文件夹导入发型">${icon('folder')}导入发型</button>
    </div>
    ${hairHits.length ? `<p class="mini-note hairhint">点发型贴图放到头上当参考；拖动移动、滚轮缩放。</p>
      <div class="libgrp hair${hairOpen ? ' is-open' : ''}" data-act="lib-grp" data-g="__hair">
        <span>${hairOpen ? '▾' : '▸'}</span><b>发型 HAIR</b><i>${hairHits.length}</i></div>
      ${hairOpen ? hairMods.map(([mod, items]) => {
        const key = '__hair:' + mod;
        const open = !!S.ui.open[key];
        return `<div class="libgrp hair sub${open ? ' is-open' : ''}" data-act="lib-grp" data-g="${esc(key)}">
            <span>${open ? '▾' : '▸'}</span><b>${esc(mod)}</b><i>${items.length}</i></div>
          ${open ? `<div class="grid">${items.map(h => `<button class="tile tile--hair" data-act="use-hair" data-p="${esc(h.p)}" title="${esc(h.p)}">
              <span class="tile__img"><i style="background-image:url('${imgURL(h.p)}')"></i></span>
              <b>${esc(upperFirst(h.n))}</b><i class="d">点击套用</i>
            </button>`).join('')}</div>` : ''}`;
      }).join('') : ''}
    ` : ''}

    <div class="presets">
      <div class="sec__h" style="margin:0"><b>添加顺序 HOW TO ADD</b></div>
      <p class="mini-note" style="margin:2px 0 0">① 在左侧「部位结构」点每一栏的 <b>＋</b> 新建一个空部位；② 选中它；③ 点这里的贴图，或把贴图<b>直接拖到那一条部位上</b>。</p>
    </div>
    ${groups.map(g => grp(g.g, g.items, g.total)).join('') || `<p class="mini-note" style="padding:14px 12px">没有匹配的贴图。</p>`}
    <p class="libnote">共 ${ASSETS.length} 张贴图：Nice Health Tab 的 <code>Textures/HediffTab</code>${ASSETS.some(a => a.cat === 'race') ? '，以及导入的种族模组素材（<code>种族素材</code>）' : ''}。种族素材和发型存在浏览器本地，刷新不丢；<button class="linkbtn" data-act="art-rebuild" title="扫描 Editor/assets/，把已存在但没写进清单的模组素材重新收录">重建模组素材清单（assets/）</button> · <span style="opacity:.75">诊断：清单 ${ART_DIAG.manifest} · 磁盘 ${ART_DIAG.index} · 已补 ${ART_DIAG.added} · 素材 ${ASSETS.length} · 发型 ${HAIRS.length} · 坏行 ${ART_DIAG.bad}${ART_DIAG.err ? ' · ⚠ ' + esc(ART_DIAG.err) : ''}</span>${S.ui.pick ? '<br><b style="color:#ff9541">当前处于「替换贴图」模式 —— 点选一张即可替换所选部位。</b>' : ''}${cat === 'rjw' && activeCanvas() && !activeCanvas().rjw ? '<br><b style="color:#e3b558">当前画布的 RJW 开关是关闭的，这里仍可手动取用 RJW 贴图。</b>' : ''}</p>`;

  // 还原搜索框焦点 / 光标 / 滚动位置（否则输入一个字就失焦）
  if (wasTyping || SEARCH_FOCUS) {
    const box2 = pane.querySelector('input[data-f="lib.q"]');
    if (box2) {
      box2.focus();
      try {
        const c0 = SEARCH_FOCUS ? SEARCH_FOCUS.caret : caret;
        const pos = c0 == null ? box2.value.length : Math.min(c0, box2.value.length);
        box2.setSelectionRange(pos, pos);
      } catch (e) { }
    }
  }
  if (pane) pane.scrollTop = keepScroll;
  try { renderRefDock(); } catch (e) { }
}

/* every image the imported race mod ships, one collapsible group per race */
function modShortName(raw) {
  let s = String(raw == null ? '' : raw).trim();
  s = s.replace(/^模组\s*·\s*/, '');
  s = s.split(/\s*[~,，|]\s*/)[0];                 // "Mincho, The Mint..." → Mincho
  s = s.replace(/\s*[-–—]\s*(HAR|ver\.?|version).*$/i, '');
  s = s.replace(/\s*\(.*?\)\s*$/i, '').trim();
  s = s.replace(/\s+HAR\s*ver\.?$/i, '').replace(/\s+Race$/i, '').trim();
  return upperFirst(s || '模组');
}

function displayGroupName(g) {
  if (!g) return g;
  const raw = String(g);
  const prefixed = raw.indexOf('模组') === 0;
  const short = modShortName(raw);
  return prefixed ? ('模组 · ' + short) : short;
}

function addRaceAssets(res, label) {
  const modKey = res.modName || label || '模组';
  const g = '模组 · ' + modShortName(label || res.modName);
  const known = new Set(ASSETS.map(a => a.p));
  let n = 0;
  (res.assets || []).forEach(a => {
    if (!a.key || known.has(a.key)) return;
    const dim = EXT.get(a.key);
    if (!dim) return;
    const rec = {
      p: a.key, n: a.key.split('/').pop(), g, cat: 'race',
      w: dim.w | 0, h: dim.h | 0, ext: true, modKey
    };
    ASSETS.push(rec);
    known.add(a.key);
    n++;
    if (a.file) artPut({ key: a.key, blob: a.file, w: rec.w, h: rec.h, name: rec.n, group: g, cat: 'asset', modKey });
  });
  return n;
}

/* hairstyles from a mod folder, merged into the HAIR shelf */
function setHairs(res, label) {
  const raceName = (res && res.race && (res.race.label || res.race.defName)) || '';
  const modKey = upperFirst(cleanTitle(raceName || label || (res && res.modName) || '模组'));
  // 北向图只作为后备层素材写入，不加入发型列表
  const add = (res.hairs || []).filter(h => EXT.has(h.key));
  if (!add.length) return 0;
  const have = new Set(HAIRS.map(h => h.p));
  let n = 0;
  add.forEach(h => {
    if (have.has(h.key)) return;
    const name = upperFirst(h.key.split('/').pop().replace(/^Hair_?/i, '').replace(/_(north|south|east|west)$/i, ''));
    if (h.back) HAIR_BACK_KEYS.add(h.key);
    const group = displayGroupName(modKey);
    if (h.mask && !EXT.has(h.mask)) {
      try {
        if (h.maskFile) EXT.set(h.mask, { url: URL.createObjectURL(h.maskFile), w: 0, h: 0 });
      } catch (e) { }
    }
    HAIRS.push({ p: h.key, n: name, modKey, g: group, a: !!h.ahoge, b: !!h.back, m: h.mask || '' });
    have.add(h.key);
    n++;
    const dim = EXT.get(h.key) || {};
    if (h.file) artPut({ key: h.key, blob: h.file, w: dim.w | 0, h: dim.h | 0, name, cat: 'hair', modKey, group, mask: h.mask || '', ab: (EXT.get(h.key) || {}).ab || null });
    if (h.mask && h.maskFile && !EXT.has(h.mask)) { try { EXT.set(h.mask, { url: URL.createObjectURL(h.maskFile), w: 0, h: 0 }); } catch (e) { } }
    if (h.mask && h.maskFile) artPut({ key: h.mask, blob: h.maskFile, w: 256, h: 256, name: name + '_mask', cat: 'mask', modKey, group });
  });
  return n;
}

/* hairstyles picked straight from this computer */
async function addHairFiles(files) {
  let n = 0;
  const list = (files || []).filter(f => /^image\//.test(f.type || ''));
  const isMask = f => /_(north|south|east|west)m\.[^.]+$/i.test(f.name || '');
  const masks = list.filter(isMask);
  const catName = customCat();
  // 和模组导入保持一致：只保留朝前帧，避免一次导入 north/east/west 四份
  const south = list.filter(f => !isMask(f) && (/_south\.[^.]+$/i.test(f.name || '') || !/_(north|east|west)\.[^.]+$/i.test(f.name || '')));
  for (const f of south) {
    const baseName = f.name.replace(/\.[^.]+$/, '').replace(/_(north|south|east|west)$/i, '');
    const name = baseName.replace(/^.*?Hair[_-]?/i, '').replace(/^Hair_?/i, '') || 'hair';
    const key = 'Custom/' + catName + '/Hair_' + name + '_' + Date.now().toString(36) + n;
    const url = URL.createObjectURL(f);
    const dim = await new Promise(r => {
      const im = new Image();
      im.onload = () => r([im.naturalWidth, im.naturalHeight]);
      im.onerror = () => r([64, 64]);
      im.src = url;
    });
    EXT.set(key, { url, w: dim[0], h: dim[1] });
    let maskKey = '';
    const maskFile = masks.find(mf => mf.name.replace(/\.[^.]+$/, '').replace(/_(north|south|east|west)m$/i, '') === baseName);
    if (maskFile) {
      maskKey = key + '_mask';
      const murl = URL.createObjectURL(maskFile);
      EXT.set(maskKey, { url: murl, w: dim[0], h: dim[1] });
      artPut({ key: maskKey, blob: maskFile, w: dim[0], h: dim[1], name: name + '_mask', cat: 'mask', modKey: catName });
    }
    HAIRS.push({ p: key, n: name, modKey: catName, m: maskKey });
    artPut({ key, blob: f, w: dim[0], h: dim[1], name, cat: 'hair', modKey: catName, mask: maskKey });
    n++;
  }
  if (n) { renderLibrary(); toast(`已加入 ${n} 个发型`); }
  else toast('没有可用的图片', true);
  return n;
}

/* one hair at a time, snapped to the head, not draggable */
/* a hairstyle is only a visual reference (to place ears / horns): it never becomes a part.
   Fitting uses the hair's visible pixel box, so transparent padding in the png doesn't
   push the art off the head (that is what NHT works around with its hair clip rect). */
async function applyHair(path, silent) {
  const c = activeCanvas();
  if (!c) return;
  if (!silent && HAIR_REF && HAIR_REF.img === path) {
    HAIR_REF = null;
    S.hairRef = null;
    persist();
    renderStage(); renderLibrary(); toast('已关掉发型参考'); return;
  }
  // older builds pushed a real part for hair — drop those so they never get exported
  const stale = c.parts.filter(p => p.hair);
  if (stale.length) {
    c.parts = c.parts.filter(p => !p.hair);
    renderTree();
    pushHistory();
  }
  const head = c.parts.find(p => p.bid === 13) || c.parts.find(p => /head/i.test(p.id || '')) || null;
  const hb = head && head.img ? await alphaBoxAsync(head.img) : null;
  const [hdW, hdH] = head ? imgDim(head.img) : [120, 120];
  const headSX = head ? head.sx : 1, headSY = head ? head.sy : 1;
  const headW = (hb && hb.ok ? hb.w : hdW) * headSX;
  const headH = (hb && hb.ok ? hb.h : hdH) * headSY;
  const headCX = head ? head.x + ((hb && hb.ok ? (hb.x0 + hb.w / 2) : hdW / 2) - hdW / 2) * headSX : 0;
  const headCY = head ? head.y + ((hb && hb.ok ? (hb.y0 + hb.h / 2) : hdH / 2) - hdH / 2) * headSY : -300;

  // 之前在「素材-发型」里调过的位置/缩放：只在画布还没有参数时套用（否则会覆盖补丁读回来的值）
  const savedFit = (hairFits() || {})[path];
  const hasFit = c.hairFit && (c.hairFit.scale || c.hairFit.offsetX || c.hairFit.offsetY);
  if (savedFit && !hasFit && (savedFit.s != null || savedFit.dx != null || savedFit.dy != null)) {
    c.hairFit = c.hairFit || { scale: 0.78, offsetX: 0, offsetY: -0.21 };
    if (savedFit.s != null && Math.abs(savedFit.s) < 10) c.hairFit.scale = savedFit.s;
    if (savedFit.dx != null) c.hairFit.offsetX += (Number(savedFit.dx) || 0) / 1024;
    if (savedFit.dy != null) c.hairFit.offsetY += (Number(savedFit.dy) || 0) / 1024;
    c.hairFitEnabled = true;
  }

  const bxRaw = EXT.get(path) || {};
  const bx = bxRaw.ab
    ? { x0: bxRaw.ab[0], y0: bxRaw.ab[1], w: bxRaw.ab[2], h: bxRaw.ab[3], iw: bxRaw.w, ih: bxRaw.h, ok: true }
    : await alphaBoxAsync(path);
  const [iw, ih] = [bx.iw || imgDim(path)[0], bx.ih || imgDim(path)[1]];
  // scale by the visible width only
  const baseSX = Math.max(0.02, (headW * 1.16) / (bx.w || iw));
  const visCX = bx.x0 + bx.w / 2, visCY = bx.y0 + bx.h / 2;
  // manual nudges the author made for this hair are remembered and re-applied
  const fit = hairFit(path);
  const sx = baseSX * fit.s;
  const keepRefVis = !!(HAIR_REF && HAIR_REF.vis !== false);   // 换发型时保持显示状态
  HAIR_REF = {
    img: path,
    baseSX,
    fitKey: path,
    autoX: headCX - (visCX - iw / 2) * sx,
    autoY: (headCY - headH * 0.16) - (visCY - ih / 2) * sx,
    x: headCX - (visCX - iw / 2) * sx + fit.dx,
    y: (headCY - headH * 0.16) - (visCY - ih / 2) * sx + fit.dy,
    z: fit.z || ((c.parts || []).length + 4),
    vis: silent ? keepRefVis : true,   // 手动选发型：直接显示；静默恢复：沿用原状态
    needsFit: false,
    sx, sy: sx,
    locked: !!fit.lock,
    headCX, headCY, headW, headH,
    // layer uses the same scale as the parts (head + 3); fit.layer can override it
    layer: fit.layer != null ? fit.layer : ((head ? head.layer : 20) + 3),
    // 后背层层级：默认 0
    backLayer: fit.backLayer != null ? fit.backLayer : 0
  };
  // 同一张画布上换回这个发型：恢复它上次的参数
  try {
    const cA = activeCanvas();
    const memo = cA && cA.hairRefs && cA.hairRefs[path];
    if (memo && memo.img === path) {
      applyRefState(memo);
      HAIR_REF.needsFit = false;
      if (!silent) HAIR_REF.vis = true;     // 手动点选：一定要看得见
    }
  } catch (e) { }
  // remember it in the project so a refresh brings the reference back
  S.hairRef = { img: path };
  persist();
  renderStage(); renderLibrary(); refreshHairPaneIfActive();
  if (silent) return;
  const precise = !!(bxRaw.ab || (bx && bx.ok));
  toast('发型参考：' + path.split('/').pop() + (precise ? '（可拖动微调，滚轮缩放）' : '（可拖动微调，滚轮缩放；重导一次会更准）'));
}

/* show / hide the reference without losing the alignment */
function toggleHairVis() {
  if (!HAIR_REF) return;
  const show = !(HAIR_REF.vis !== false);
  if (!show) {
    HAIR_REF.vis = false;
    saveRefForCanvas();
    renderStage(); renderLibrary();
    toast('发型参考已隐藏（仅这张画布）');
    return;
  }
  if (HAIR_REF.needsFit) {
    const key = HAIR_REF.img;
    Promise.resolve(applyHair(key, true)).then(() => {
      if (!HAIR_REF) return;
      HAIR_REF.vis = true;
      HAIR_REF.needsFit = false;
      saveRefForCanvas();
      renderStage(); renderLibrary();
    }).catch(() => { });
    return;
  }
  HAIR_REF.vis = true;
  saveRefForCanvas();
  renderStage(); renderLibrary();
  toast('发型参考已显示（仅这张画布）');
}

/* layer of the reference: same scale as the parts (head + 3 by default) */
function setHairZ(delta) {
  if (!HAIR_REF) return;
  applyHairZ((HAIR_REF.layer != null ? HAIR_REF.layer : 20) + delta);
}

function applyHairZ(layer) {
  if (!HAIR_REF) return null;
  const z = Math.max(0, Math.min(150, Math.round(Number(layer)) || 0));
  HAIR_REF.layer = z;
  const fit = hairFit(HAIR_REF.fitKey);
  fit.layer = z;
  saveHairFit(HAIR_REF.fitKey, fit);
  const inp = $('#hairZInput');
  if (inp) inp.value = z;
  renderStage();
  saveRefForCanvas();
  return z;
}

function applyHairBackZ(layer) {
  if (!HAIR_REF) return null;
  const z = Math.max(0, Math.min(150, Math.round(Number(layer)) || 0));
  HAIR_REF.backLayer = z;
  const fit = hairFit(HAIR_REF.fitKey);
  fit.backLayer = z;
  saveHairFit(HAIR_REF.fitKey, fit);
  const inp = $('#hairBackZInput');
  if (inp) inp.value = z;
  renderStage();
  saveRefForCanvas();
  return z;
}
function setHairBackZFromInput(v) {
  if (!HAIR_REF) return;
  const z = applyHairBackZ(v);
  if (z != null) toast('后背层图层：' + z + '（只影响预览）');
}

/* typed layer number */
function setHairZFromInput(v) {
  if (!HAIR_REF) return;
  const z = applyHairZ(v);
  if (z != null) toast('发型参考图层：' + z + '（部位同刻度：数值越大越靠上）');
}

function clearHairRef() {
  HAIR_REF = null;
  S.hairRef = null;
  persist();
  renderStage(); renderLibrary();
}

/* per-hair manual fit (dx / dy / scale), kept in localStorage */
const HAIR_FIT_KEY = 'nht.hairfit.v1';
let HAIR_FITS = null;

function hairFits() {
  if (HAIR_FITS) return HAIR_FITS;
  try { HAIR_FITS = JSON.parse(localStorage.getItem(HAIR_FIT_KEY) || '{}') || {}; } catch (e) { HAIR_FITS = {}; }
  return HAIR_FITS;
}

function hairFit(path) {
  const f = hairFits()[path];
  return {
    s: f && f.s ? f.s : 1, dx: f && f.dx ? f.dx : 0, dy: f && f.dy ? f.dy : 0,
    lock: !!(f && f.lock), z: f && f.z ? f.z : 0, layer: f && f.layer != null ? f.layer : null,
    vis: !(f && f.vis === false)
  };
}

function saveHairFit(path, fit) {
  const all = hairFits();
  all[path] = fit;
  HAIR_FITS = all;
  try { localStorage.setItem(HAIR_FIT_KEY, JSON.stringify(all)); } catch (e) { }
}

function hairLocked() {
  return !!(HAIR_REF && HAIR_REF.locked);
}

/* align once, then lock it so nothing moves it by accident */
function toggleHairLock() {
  if (!HAIR_REF) return;
  const fit = hairFit(HAIR_REF.fitKey);
  fit.lock = !fit.lock;
  saveHairFit(HAIR_REF.fitKey, fit);
  HAIR_REF.locked = fit.lock;
  renderStage(); renderLibrary();
  toast(fit.lock ? '发型参考已锁定，拖不动了' : '发型参考已解锁，可以继续调整');
  saveRefForCanvas();
}

/* nudge the reference: drag to move, wheel to scale (remembered per hairstyle) */
function hairFitTarget(c) {
  // t16：拖动/滚轮一律改「游戏实际生效」的 hairFit（HF 三元组，画布单位）。
  // 非 HAR 种族不再写 vanillaFit：游戏只在 vanillaHairUseEditor 打开时才读它，默认是死路。
  if (!c.hairFit || typeof c.hairFit !== 'object') c.hairFit = { scale: 0.78, offsetX: 0, offsetY: -0.21 };
  return { obj: c.hairFit };
}

function syncHairFitLive(c) {
  if (!c) return;
  const t = hairFitTarget(c);
  const pane = document.getElementById('paneHair');
  if (!pane) return;
  // t16：HF 输入框在非 HAR 面板里也会出现（同一 data-f），所以按集合更新，别只改第一个
  const set = (sel, v) => {
    pane.querySelectorAll(sel).forEach(inp => {
      if (inp && document.activeElement !== inp) inp.value = v;
    });
  };
  set('[data-f="c.hfs"]', (Number(t.obj.scale) || 0.78).toFixed(3));
  set('[data-f="c.hfx"]', (Number(t.obj.offsetX) || 0).toFixed(3));
  set('[data-f="c.hfy"]', (Number(t.obj.offsetY) || -0.21).toFixed(3));
  try { syncHairNums(c); } catch (e) { }
}

function hairMaskOf(path) {
  if (!path) return '';
  const h = (HAIRS || []).find(x => x.p === path);
  return (h && h.m) ? h.m : '';
}

function nudgeHair(dx, dy, ds) {
  if (!HAIR_REF) return;
  if (hairLocked()) { toast('参考图已锁定，先点「解锁」再调'); return; }
  const base = HAIR_REF.baseSX || HAIR_REF.sx;
  const oldSX = HAIR_REF.sx || base;
  if (ds) HAIR_REF.sx = Math.max(0.2, Math.min(4, oldSX * (1 + ds)));
  HAIR_REF.sy = HAIR_REF.sx;
  if (ds && oldSX > 0) {
    const c = activeCanvas();
    const t = hairFitTarget(c);
    t.obj.scale = clamp((Number(t.obj.scale) || 0.78) * (HAIR_REF.sx / oldSX), 0.05, 3);   // t18：与 ValidHarValues 同口径
    syncHairFitLive(c);
  }
  HAIR_REF.x += dx || 0;
  HAIR_REF.y += dy || 0;
  saveRefForCanvas();
  renderStage();
  renderLibrary();
}

function resetHairFit() {
  if (!HAIR_REF) return;
  const c = activeCanvas();
  if (c) delete c.hairRef;             // 只重置这张画布的参考位置
  applyHair(HAIR_REF.img, true);
  if (c) c.hairRef = null;
  renderStage(); renderLibrary(); saveRefForCanvas();
  toast('已复位（仅这张画布）');
}

/* ==========================================================================
   RENDER: patch pane
   ========================================================================== */
function renderPatch() {
  { const old0 = document.getElementById('gitPrefixMenu'); if (old0 && old0.parentElement === document.body) old0.remove(); }
  const pane = $('#panePatch');
  const issues = validateAll();
  const errs = issues.filter(i => i.lv === 'error').length;
  const warns = issues.filter(i => i.lv === 'warn').length;
  $('#vdot').parentElement.classList.toggle('has-issue', errs + warns > 0);
  const checking = LOCAL_HTTP && !TEX_INDEX_LOADED;
  const xml = buildPatchXML('one');
  const xmlLines = xml.split('\n').length;
  const opCount = t => (t.match(/<Operation /g) || []).length;
  pane.innerHTML = `
  <div class="sec">
    <div class="sec__h"><b>补丁信息 PATCH</b></div>
    <div class="field"><label>名称</label><div class="ctl"><input class="inp inp--txt" data-f="p.name" value="${esc(S.project.name)}" spellcheck="false"></div></div>
    <div class="field"><label>作者</label><div class="ctl"><input class="inp inp--txt" data-f="p.author" value="${esc(S.project.author)}" placeholder="你的名字"></div></div>
    <div class="field"><label>包名</label><div class="ctl"><input class="inp" data-f="p.packageId" value="${esc(S.project.packageId)}" spellcheck="false"></div></div>
    <div class="field field--wide"><label>备注</label><div class="ctl"><textarea class="inp inp--txt" data-f="p.note" rows="2" style="height:auto;padding:6px 7px;resize:vertical">${esc(S.project.note || '')}</textarea></div></div>
  </div>

  <div class="sec">
    <div class="sec__h"><b>仓库同步 REPO</b><span class="tagx" id="gitBranchTag">${esc((gitState.status && gitState.status.branch) || '未连接')}</span></div>
    <div class="gitbox">
      <div class="gitrow">
        <button class="gitbtn gitbtn--push" data-act="git-push" id="gitPushBtn" title="把本机仓库的改动提交并推送；第一次推送会自动在远端创建当前分支">${icon('up')}推送更改</button>
        <button class="gitbtn gitbtn--pull${gitState.status && gitState.status.behind ? ' has-new' : ''}" data-act="git-pull" id="gitPullBtn" title="从远端拉取更新（fast-forward）；有未拉取的提交时按钮会发光并显示数量">${icon('dl')}拉取远端<span class="gitbadge" id="gitPullBadge" style="${gitState.status && gitState.status.behind ? '' : 'display:none'}">${(gitState.status && gitState.status.behind) || 0}</span></button>
      </div>
      <div class="gitbranchrow">
        <div class="gitsel" id="gitPrefixSel">
          <button class="gitsel__btn" data-act="git-prefix-menu" title="分支命名开头：${esc((GIT_PREFIXES.find(x => x.p === (ensureGitSettings().prefix || '')) || GIT_PREFIXES[4]).desc)}">
            <span>${esc(ensureGitSettings().prefix || '无前缀')}</span><i>▾</i>
          </button>
          <div class="gitsel__menu" id="gitPrefixMenu" hidden>
            ${GIT_PREFIXES.map(x => `<button class="gitsel__item${(ensureGitSettings().prefix || '') === x.p ? ' is-on' : ''}"
              data-act="git-prefix-set" data-prefix="${x.p}"
              data-tip="${esc(x.label)}：${esc(x.desc)}　例：${esc(x.eg)}">
              ${esc(x.p || '无前缀')}<span>${esc(x.label)}</span></button>`).join('')}
          </div>
        </div>
        <input class="inp${gitBranchBad(ensureGitSettings().branch) ? ' is-bad' : ''}" id="gitBranchInput" data-f="g.branch"
          value="${esc(ensureGitSettings().branch || '')}" spellcheck="false" placeholder="分支名，例如 feature-milira-hair"
          title="${gitBranchBad(ensureGitSettings().branch) ? '分支不能为空' : '推送 / 拉取使用的分支（会自动在远端创建）'}">
      </div>
      <div class="gitcurrow">
        <span>当前本地分支：<b>${esc((gitState.status && gitState.status.branch) || '—')}</b></span>
        <button class="btn btn--xs" data-act="git-use-current" title="把「分支」改成当前本地分支">用当前分支</button>
      </div>
      <div class="gitstat gitstat--three">
        <span class="st-left" data-tip="未推送 = 还没推到 GitHub 任何分支的提交 ${gitPendingCount().commits} 个 + 未提交的可推送文件 ${gitPendingCount().files} 个（默认锁定的文件不计入）">未推送 <b id="gitAhead">${gitPendingCount().total}</b></span>
        <span class="st-mid" data-tip="GitHub 上还没拉到本地的提交数（不是文件数）">未拉取 <b id="gitBehind">${(gitState.status && gitState.status.behind) || 0}</b></span>
        <span class="st-right gitstate is-${gitState.stateOk === true ? 'ok' : (gitState.stateOk === false ? 'fail' : 'idle')}" id="gitLastFetch" data-tip="${esc(gitStateTip())}">${esc(gitState.stateText || '未同步')}</span>
      </div>
      <details class="gitlog" id="gitLogBox"${gitState.logs.length ? ' open' : ''}>
        <summary title="推送 / 拉取 / 测试连接的完整输出，失败原因都在这里"><span>同步日志（${gitState.logs.length}）</span>
          <span class="gitlog__t">
            <button class="gitico" data-act="git-sync-now" title="立即同步：重新读取仓库状态">${icon('rot')}</button>
            <button class="gitico" id="gitGear" data-act="git-gear" title="Git 设置">${icon('gear')}</button>
          </span></summary>
        <div class="gitlog__b" id="gitLogBody">${gitState.logs.length ? esc(gitState.logs.map(x => `[${x.time}] ${x.kind} ${x.text}`).join(' · ')) : '（暂无记录）'}</div>
      </details>
    </div>
  </div>

  <div class="sec">
    <div class="sec__h"><b>注入 INJECT</b></div>
    <div class="scopewarn">⚠ 只保存<b>当前画布</b>：<b>${esc((activeCanvas() || {}).title || '—')}</b> · 其它画布不会写入</div>
    <div class="actions">
      <button class="btn btn--sm btn--primary" data-act="patch-to-mod">${icon('folder')}单独注入模组${injectDir ? `<span class="sub">${esc(injectDir.name)}</span>` : '<span class="sub">NHT_CustomDolls</span>'}</button>
      <button class="btn btn--sm btn--multi" data-act="multi-export">${icon('dl')}多选注入模组</button>
    </div>
    <p class="mini-note" style="margin:6px 0 0">单独注入只写<b>当前画布</b>（其它画布不动）；多选注入可以勾选多张画布一起写，
      改过的画布会自动预选。补丁写进模组的 <code>Patches/</code>，本机导入的贴图写进 <code>Textures/</code>。</p>
  </div>

  <div class="sec">
    <div class="sec__h"><b>导出 EXPORT</b><span class="tagx">PROJECT</span></div>
    <div class="actions">
      <button class="btn btn--sm btn--modx" data-act="mod-export" title="导出纯模组文件：按磁盘现状打包整份模组（含 1.6/1.7、Patches、Textures、LoadFolders），保持原目录结构，不含编辑器/源码等开发内容">${icon('tag')}导出模组文件<span class="sub">纯模组</span></button>
      <button class="btn btn--sm" data-act="export-patch" title="只导出当前画布的补丁文本（.xml）">${icon('dl')}导出补丁 XML<span class="sub">.xml</span></button>
      <button class="btn btn--sm" data-act="export-json">${icon('save')}导出项目 JSON<span class="sub">.json</span></button>
      <button class="btn btn--sm" data-act="import-json">${icon('up')}导入项目 JSON<span class="sub">.json</span></button>
      <button class="btn btn--sm" data-act="export-png" title="把当前画布渲染成 2 倍尺寸的 PNG">${icon('img')}导出画布 PNG<span class="sub">2×</span></button>
    </div>
    <p class="mini-note" style="margin:8px 0 0;border-top:1px dashed rgba(255,255,255,.12);padding-top:7px">
      <b>导出范围 SCOPE</b>：补丁只导出<b>当前画布</b>（${esc((activeCanvas() || {}).title || '—')}）。已有的体型 / 部位用 <code>PatchOperationReplace</code> 覆盖，新部位与拆卸用 Add / Remove。要导别的体型，先切到那张画布再导出。</p>
  </div>

  <div class="sec">
    <div class="sec__h"><b>校验 CHECK</b><span class="tagx">${checking ? '读取中…' : `${errs} 错误 · ${warns} 警告`}</span></div>
    <div class="issues">
      ${checking
        ? '<div class="issue"><b>…</b><span>正在读取模组 Textures 清单，读完后这里会显示完整检查结果。</span></div>'
        : (issues.length ? issues.map(i => `<div class="issue issue--${i.lv}"><b>${i.lv}</b><span>${esc(i.msg)}</span></div>`).join('') : `<div class="issue issue--ok"><b>ok</b><span>全部检查通过，可以导出。</span></div>`)}
    </div>
  </div>

  <div class="sec">
    <div class="sec__h"><b>补丁预览 PREVIEW</b><span class="tagx">${esc((activeCanvas() || {}).title || '—')}</span></div>
    <div class="codetools">
      <button class="btn btn--sm" data-act="copy-xml">${icon('copy')}复制</button>
      <button class="btn btn--sm" data-act="preview-toggle">${icon(S.ui.previewFull ? 'arrup' : 'arrdn')}${S.ui.previewFull ? '收起' : '展开全部'}</button>
      <span class="n">${xmlLines} 行 · ${Math.round(xml.length / 1024)} KB · ${opCount(xml)} 个操作</span>
    </div>
    <pre class="code">${(() => {
      const all = xml.split('\n');
      const shown = S.ui.previewFull ? all : all.slice(0, 90);
      const body = highlightXML(shown.join('\n'));
      return S.ui.previewFull ? body : (body + (all.length > 90 ? '\n<span class="c">… 还有 ' + (all.length - 90) + ' 行，点「展开全部」查看</span>' : ''));
    })()}</pre>
    <p class="mini-note" style="margin:6px 0 0">这里只预览<b>当前画布</b>的补丁；多个画布请用「多选注入模组」或「导出模组文件」。</p>
  </div>`;
  try { renderGitUI(); renderRepoGear(); } catch (e) { }
}

function highlightXML(s) {
  return esc(s)
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="c">$1</span>')
    .replace(/(&lt;\/?)([A-Za-z_][\w.:]*)/g, '$1<span class="t">$2</span>')
    .replace(/([\w.:]+)=&quot;([^&]*)&quot;/g, '<span class="a">$1</span>=&quot;$2&quot;');
}

/* ==========================================================================
   RENDER: root
   ========================================================================== */
function renderAll() {
  renderCanvasList();
  renderTree();
  renderInspector();
  // 素材页/补丁页只在当前显示时重建；否则切画布会白白重建几千个素材 DOM
  if (S.tab === 'assets') renderLibrary();
  if (S.tab === 'patch') renderPatch();
  renderStage();
  renderTabs();
  renderHistoryButtons();
  renderStatus();
  // t122：只读预览浮条必须随每次整体重绘同步，否则切画布后它会残留
  try { syncGmkViewBar(); } catch (e) { }
}
function renderStatus() {
  const c = activeCanvas();
  $('#statusRight').textContent = c ? `${c.parts.length} 部位 · ${c.detached.length} 已拆卸 · ${Math.round(S.view.z * 100)}%` : '';
}


/* 问号提示改成气泡：读 title 显示在浮动框里，避免原生 tooltip 又长又窄 */
let QPOP = null;
function ensureQpop() {
  if (QPOP && document.body.contains(QPOP)) return QPOP;
  QPOP = document.createElement('div');
  QPOP.id = 'qpop';
  QPOP.className = 'qpop';
  QPOP.hidden = true;
  document.body.appendChild(QPOP);
  return QPOP;
}
function showQpop(el) {
  const txt = el.getAttribute('data-tip') || el.getAttribute('title') || '';
  if (!txt) return;
  if (!el.getAttribute('data-tip')) { el.setAttribute('data-tip', txt); el.removeAttribute('title'); }
  const pop = ensureQpop();
  pop.textContent = txt;
  pop.hidden = false;
  const r = el.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let x = r.left - w + r.width + 8;
  let y = r.bottom + 8;
  if (x < 8) x = 8;
  if (x + w > innerWidth - 8) x = innerWidth - w - 8;
  if (y + h > innerHeight - 8) y = r.top - h - 8;
  if (y < 8) y = 8;
  pop.style.left = Math.round(x) + 'px';
  pop.style.top = Math.round(y) + 'px';
}
function hideQpop() { if (QPOP) QPOP.hidden = true; }
document.addEventListener('mouseover', e => {
  const q = e.target.closest && e.target.closest('.qmark');
  if (q) showQpop(q);
});
document.addEventListener('mouseout', e => {
  const q = e.target.closest && e.target.closest('.qmark');
  if (q) hideQpop();
});
document.addEventListener('click', e => {
  const q = e.target.closest && e.target.closest('.qmark');
  if (q) { showQpop(q); e.preventDefault(); }
  else hideQpop();
});
window.addEventListener('scroll', hideQpop, true);





/* 分支前缀下拉：切换时改写分支名并刷新状态 */
document.addEventListener('change', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act="git-prefix"]');
  if (!el) return;
  try {
    gitApplyPrefix(el.value || '');
    renderGitUI();
    gitRefresh();
  } catch (err) { }
});


/* 分支前缀菜单：点其它地方收起 */
document.addEventListener('pointerdown', e => {
  const menu = document.getElementById('gitPrefixMenu');
  if (!menu || menu.hidden) return;
  if (e.target.closest && (e.target.closest('#gitPrefixSel') || e.target.closest('#gitPrefixMenu'))) return;
  menu.hidden = true;
});


/* 回收站行：右键只有「还原」 */
document.addEventListener('contextmenu', e => {
  const row = e.target.closest && e.target.closest('.ctr');
  if (!row) return;
  e.preventDefault();
  document.querySelectorAll('.ctrmenu').forEach(m => m.remove());
  const m = document.createElement('div');
  m.className = 'ctrmenu';
  m.innerHTML = `<button class="cvmenu__i" data-act="trash-restore" data-trid="${esc(row.dataset.trid)}">↩ 还原</button>`;
  document.body.appendChild(m);
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.min(e.clientX, innerWidth - w - 8) + 'px';
  m.style.top = Math.min(e.clientY, innerHeight - h - 8) + 'px';
});
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('.ctrmenu')) return;
  document.querySelectorAll('.ctrmenu').forEach(m => m.remove());
});

/* 全站悬浮提示：任何带 title / data-tip 的元素都用同一套气泡 */
document.addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('[title], [data-tip]');
  if (!el) return;
  if (el.classList && el.classList.contains('qmark')) return;   // 问号单独处理
  saveSettings();
  if (S.settings.tipCanvas === false && el.closest('#canvasList')) return;
  if (S.settings.tipTree === false && el.closest('#tree')) return;
  showQpop(el);
});
document.addEventListener('mouseout', e => {
  const el = e.target.closest && e.target.closest('[title], [data-tip]');
  if (el) hideQpop();
});

window.addEventListener('resize', () => {
  const pop = notifPopup();
  if (pop && !pop.hidden) placeNotifPop();
});





/* ---------------- Git 同步（本地服务提供 /__git* 接口） ---------------- */
let gitState = { status: null, logs: [], note: '', stateText: '未同步', stateOk: null, info: null, remote: null, busy: false };
let GIT_PUSH_AUTORETRY = false;
let MOD_EXPORT_VERSION = '';
const GIT_LOG_MAX = 20;

function gitDefaults() {
  return { dir: 'C:\\Misaki\\Work\\github\\NHT_CustomDolls', branch: 'main', name: '', email: '', prefix: 'feature-', syncMod: true };
}
function ensureGitSettings() {
  saveSettings();
  if (!S.settings.git || typeof S.settings.git !== 'object') S.settings.git = gitDefaults();
  const d = gitDefaults();
  Object.keys(d).forEach(k => { if (S.settings.git[k] === undefined || S.settings.git[k] === null) S.settings.git[k] = d[k]; });
  return S.settings.git;
}

function cleanGitText(t) {
  return String(t || '')
    .split(/\r?\n/)
    .filter(l => !/^(git\.exe|git) : /.test(l))
    .filter(l => !/^\s*At .*:\d+ char:\d+/.test(l))
    .filter(l => !/(CategoryInfo|FullyQualifiedErrorId|所在位置|^\s*\+ |^\s*\+ CategoryInfo|RemoteException)/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function gitLog(kind, text) {
  const d = new Date();
  const time = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  gitState.logs.unshift({ time, kind, text: cleanGitText(text).slice(0, 4000) });
  if (gitState.logs.length > GIT_LOG_MAX) gitState.logs.length = GIT_LOG_MAX;
}

function gitValid() {
  const g = ensureGitSettings();
  if (!g.dir || !String(g.dir).trim()) {
    toast('还没设置 Git 仓库目录，去「设置 → Git」填一下', true);
    setSettingsTab('git'); modalSettings();
    return false;
  }
  return true;
}


/* 分支命名约定：开头 + 用途说明 */
const GIT_PREFIXES = [
  { p: 'feature-', label: '新功能', eg: 'feature-milira-hair', desc: '新增内容：画布、部位、发型等' },
  { p: 'fix-', label: '修复', eg: 'fix-ear-slot', desc: '修 BUG / 数值错位' },
  { p: 'docs-', label: '文档', eg: 'docs-readme', desc: '只改说明、截图、README' },
  { p: 'test-', label: '测试', eg: 'test-git-flow', desc: '试验性改动，随时可丢' },
  { p: '', label: '自定义', eg: 'my-branch', desc: '自己写完整分支名（不能是 main）' }
];

function gitApplyPrefix(prefix) {
  const g = ensureGitSettings();
  const old = g.prefix || '';
  const cur = String(g.branch || '');
  const suffix = (old && cur.indexOf(old) === 0) ? cur.slice(old.length) : (cur === 'main' ? '' : cur.replace(/^[a-z]+-/, ''));
  g.prefix = prefix;
  g.branch = prefix ? (prefix + (suffix || '')) : (suffix || '');
  persist();
}

function gitBranchBad(branch) {
  return !String(branch || '').trim();
}

/* 仓库是否“看起来配置正确”：目录存在、不是默认值、分支不是 main、能连上 */
function gitConfigState() {
  const g = ensureGitSettings();
  const d = gitDefaults();
  const isDefaultDir = String(g.dir || '').trim() === d.dir;
  const badBranch = gitBranchBad(g.branch);
  const okStatus = !!gitState.status;
  const ok = !badBranch && okStatus;
  return { ok, isDefaultDir, badBranch, okStatus };
}

function renderRepoGear() {
  const btn = document.getElementById('gitGear');
  if (!btn) return;
  const st = gitConfigState();
  btn.classList.toggle('is-bad', !st.ok);
  btn.classList.toggle('is-ok', st.ok);
  btn.title = st.ok
    ? 'Git 设置已就绪（分支 ' + (ensureGitSettings().branch || '') + '）'
    : 'Git 设置有问题：' + (st.badBranch ? '分支不能为空；' : '') + (!st.okStatus ? '无法连接仓库。' : '');
}

async function gitRefresh(fetchRemote) {
  const g = ensureGitSettings();
  if (!LOCAL_HTTP) { gitState.note = '需要本地服务'; return; }
  if (!gitState.remote) { try { await gitLoadRemote(); } catch (e) { } }
  try {
    const extra = fetchRemote ? '&fetch=1' : '';
    const r = await fetch('/__git?dir=' + encodeURIComponent(g.dir) + '&branch=' + encodeURIComponent(g.branch || 'main') + extra, { cache: 'no-store' });
    const j = await r.json();
    if (j && j.ok) {
      if (gitState.pushGuardUntil && Date.now() < gitState.pushGuardUntil && Number(j.behind) > 0) {
        j.behind = 0;                     // 保护期内：这个“落后”基本都是刚 push 上去的提交
        j.ahead = Math.max(0, Number(j.ahead) || 0);
      }
      gitState.status = j;
      const t = new Date();
      const hh = String(t.getHours()).padStart(2, '0'), mm = String(t.getMinutes()).padStart(2, '0'), ss = String(t.getSeconds()).padStart(2, '0');
      gitState.stateText = (j.fetched ? `已同步 ${hh}:${mm}` : `已读取本地 ${hh}:${mm}`);
      gitState.stateDetail = '';
      gitState.stateOk = true;
      if (j.fetchNote) gitState.note = j.fetchNote;
      if (j.fetching) {
        // 后台 fetch：几秒后再读一次本地引用，页面本身完全不被阻塞
        clearTimeout(window.__gitFetchPoll);
        window.__gitFetchPoll = setTimeout(() => { try { gitRefresh(false); } catch (e) { } }, 7000);
      }
      gitNotifyNewCommits(j);
    } else {
      gitState.status = null;
      const tb = new Date();
      const hh2 = String(tb.getHours()).padStart(2, '0'), mm2 = String(tb.getMinutes()).padStart(2, '0'), ss2 = String(tb.getSeconds()).padStart(2, '0');
      gitState.stateText = `同步失败 ${hh2}:${mm2}:${ss2}`;
      gitState.stateDetail = (j && j.error) ? String(j.error) : '读取不到仓库';
      gitState.stateOk = false;
      if (j && j.error) gitLog('状态', j.error);
    }
  } catch (e) {
    const tc = new Date();
    const hh3 = String(tc.getHours()).padStart(2, '0'), mm3 = String(tc.getMinutes()).padStart(2, '0'), ss3 = String(tc.getSeconds()).padStart(2, '0');
    gitState.stateText = `同步失败 ${hh3}:${mm3}:${ss3}`;
    gitState.stateDetail = e && e.message;
    gitState.stateOk = false;
    gitLog('状态', e && e.message);
  }
  renderGitUI();
}


/* 未推送计数：提交数 + 未提交且未被默认锁定的文件数 */
function gitPendingCount() {
  const st = gitState.status || {};
  const commits = st.ahead || 0;
  const unlocked = (st.dirty || []).filter(p => !pushIsDefaultLocked(String(p).replace(/\\/g, '/')));
  return { commits: commits, files: unlocked.length, total: commits + unlocked.length };
}


/* 状态气泡：当前仓库的完整参数（多行显示） */
function gitStateTip() {
  const st = gitState.status || null;
  const g = ensureGitSettings();
  const remote = (gitState.remote && gitState.remote.url) || '（未读取）';
  const pend = gitPendingCount();
  const L = [];
  L.push('状态：' + (gitState.stateText || '未同步'));
  if (st) {
    L.push('分支：' + (st.branch || g.branch || '-'));
    L.push('待推送：' + pend.total + '（提交 ' + pend.commits + ' + 未提交文件 ' + pend.files + '）');
    L.push('待拉取：' + (st.behind || 0) + ' 个提交');
    L.push('本地提交：' + ((st.commits || []).length) + ' 条记录');
    if (st.fetched) L.push('远端检测：刚刚成功联网');
    else if (st.fetching) L.push('远端检测：后台进行中…');
    else if (st.fetchNote) L.push('远端检测：' + st.fetchNote);
    else L.push('远端检测：未联网（只读本地）');
  } else {
    L.push('仓库：读不到（' + (gitState.stateDetail || '可能未设置目录') + '）');
  }
  L.push('远程仓库：' + remote);
  L.push('本机仓库：' + (g.dir || '（未设置）'));
  return L.join('\n');
}

function renderGitUI() {
  const st = gitState.status;
  const brInp = document.getElementById('gitBranchInput');
  if (brInp) {
    const want = ensureGitSettings().branch || '';
    if (document.activeElement !== brInp && brInp.value !== want) brInp.value = want;
    brInp.classList.toggle('is-bad', gitBranchBad(want));
  }
  const tag = document.getElementById('gitBranchTag');
  if (tag) {
    tag.textContent = (st && st.behind)
      ? `${st.branch || 'main'} · 有 ${st.behind} 项待拉取`
      : ((st && st.branch) || '未连接');
    tag.style.color = (st && st.behind) ? '#7ef0d4' : '';
  }
  const ahead = document.getElementById('gitAhead');
  if (ahead) {
    const pend = gitPendingCount();
    ahead.textContent = pend.total;
    const wrap = ahead.parentElement;
    if (wrap) wrap.setAttribute('data-tip',
      '未推送 = 还没推到 GitHub 任何分支的提交 ' + pend.commits + ' 个 + 未提交的可推送文件 ' + pend.files + ' 个（默认锁定的文件不计入）');
  }
  const behind = document.getElementById('gitBehind');
  if (behind) behind.textContent = (st && st.behind) || 0;
  const note = document.getElementById('gitLastFetch');
  if (note) {
    note.textContent = gitState.stateText || '未同步';
    note.className = 'gitstate st-right ' + (gitState.stateOk === true ? 'is-ok' : (gitState.stateOk === false ? 'is-fail' : 'is-idle'));
    note.setAttribute('data-tip', gitStateTip());
  }
  const pull = document.getElementById('gitPullBtn');
  if (pull) {
    const has = !!(st && st.behind);
    pull.classList.toggle('has-new', has);
    const badge = document.getElementById('gitPullBadge');
    if (badge) {
      badge.textContent = has ? st.behind : 0;
      badge.style.display = has ? '' : 'none';
    }
  }
  const body = document.getElementById('gitLogBody');
  if (body) {
    body.innerHTML = gitState.logs.length
      ? esc(gitState.logs.map(x => `[${x.time}] ${x.kind}\n${x.text}`).join('\n\n'))
      : '（暂无记录）';
  }
  const box = document.getElementById('gitLogBox');
  if (box) box.open = gitState.logs.length > 0;
  try { renderRepoGear(); } catch (e) { }
}

function gitFlash(ok, which) {
  // which: 'push' | 'pull'；不传则只清掉两颗按钮的旧特效
  const ids = which === 'push' ? ['gitPushBtn'] : (which === 'pull' ? ['gitPullBtn'] : ['gitPushBtn', 'gitPullBtn']);
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('is-ok', 'is-fail');
    if (!which) return;
    void el.offsetWidth;
    el.classList.add(ok ? 'is-ok' : 'is-fail');
  });
}

const PUSH_STATE = { files: [], tree: null, msg: 'Update from NHT editor', body: '', busy: false, locked: {} };

/* 默认锁住（不推送）的个人数据：别人的仓库里也有这些文件，推上去会覆盖他们的 */
const PUSH_DEFAULT_LOCK = [
  'Editor/history',            // 本地保存快照（个人数据，会覆盖别人）
  'Editor/canvases/.backup',   // 画布备份
  'Editor/body-map',           // 部位序号调试产物（含 body-map-*.json）
  'Editor/hair-map.js',        // 旧版 HAR 判定缓存（新版写到 Editor/history/）
  'Editor/nht-project.js',     // 项目聚合文件（每个人自己的画布）
  'Editor/assets',             // 本机素材库（导入的图、参考图）
  'Editor/ui/notice1.html',    // 早期重复的通知文件
  'Editor/ui/notice.html.bak', // 通知备份
  'Source/bin',                // 编译中间产物
  'Source/obj',                // 编译中间产物
  'Source/build',              // 编译输出目录（真正要用的是 Assemblies/）
  'Textures/Custom/.cache',    // 贴图缓存
  'Editor/NHT-Anatomy-Editor.exe.WebView2', // 编辑器 WebView2 缓存（每次运行都会变）
];

/* 这些后缀/名字一律视为「没用」，默认锁住 */
const PUSH_LOCK_RE = [
  /\.bak[^/]*$/i,             // *.bak / *.bak-slots-*
  /\.orig$/i,                 // 合并残留
  /\.rej$/i,                  // 补丁失败残留
  /\.tmp$/i,                  // 临时文件
  /\.log$/i,                  // 日志
  /(^|\/)Thumbs\.db$/i,      // Windows 缩略图缓存
  /(^|\/)\.DS_Store$/i,      // macOS 缓存
  /(^|\/)_[a-z0-9_-]*\.html$/i, // 编辑器调试用的临时页面 _xxx.html
];

/* ---------------- 推送弹窗用的文件说明目录（ui/file-notes.html） ---------------- */
let FILE_NOTES = null;
async function loadFileNotes() {
  if (FILE_NOTES) return FILE_NOTES;
  FILE_NOTES = [];
  try {
    const r = await fetch('ui/file-notes.html?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return FILE_NOTES;
    const html = await r.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('[data-path]').forEach(el => {
      const path = (el.dataset.path || '').replace(/\\/g, '/').replace(/\/+$/, '');
      const note = (el.dataset.note || '').trim();
      if (path && note) FILE_NOTES.push({ path, note });
    });
    FILE_NOTES.sort((a, b) => b.path.length - a.path.length);
  } catch (e) { }
  return FILE_NOTES;
}

const NOTE_BY_EXT = [
  [/\.json$/i, '数据文件（JSON）'],
  [/\.(png|jpe?g|webp|gif)$/i, '图片 / 贴图'],
  [/\.xml$/i, 'XML：Def 或补丁'],
  [/\.cs$/i, 'C# 源码'],
  [/\.(js|mjs)$/i, '脚本（JS）'],
  [/\.(css)$/i, '样式表'],
  [/\.(txt|md)$/i, '文本说明'],
  [/\.(bat|ps1)$/i, '脚本（批处理 / PowerShell）'],
  [/\.dll$/i, '编译产物（DLL）'],
  [/\.(zip|7z)$/i, '压缩包'],
];

function fileNoteFor(path, isDir) {
  const p = String(path || '').replace(/\\/g, '/');
  const list = FILE_NOTES || [];
  for (const it of list) {
    if (p === it.path || p.indexOf(it.path + '/') === 0) return { note: it.note, owner: it.path };
  }
  // 文件夹没有专门说明就不显示（避免每个目录都挂一句“其它文件”）
  if (isDir) return null;
  // 文件按扩展名给一句通用说明，保证每个文件都有解释
  for (const [re, note] of NOTE_BY_EXT) {
    if (re.test(p)) return { note, owner: p };
  }
  return { note: '其它文件', owner: p };
}

function pushIsDefaultLocked(path) {
  const p = String(path || '').replace(/\\/g, '/');
  if (PUSH_LOCK_RE.some(re => re.test(p))) return true;
  return PUSH_DEFAULT_LOCK.some(x => p === x || p.indexOf(x + '/') === 0);
}

function pushNodeFiles(node, out) {
  if (!node) return out;
  if (node.type === 'file') { out.push(node); return out; }
  (node.children || []).forEach(c => pushNodeFiles(c, out));
  return out;
}

function pushCollect(node, out) {
  if (!node || node.locked) return out;
  if (node.type === 'file') { if (node.checked) out.push(node.path); return out; }
  (node.children || []).forEach(c => pushCollect(c, out));
  return out;
}

function pushRecompute(node) {
  if (!node || node.type === 'file') return !!node && !!node.checked;
  let any = 0, all = 0, on = 0;
  node.children.forEach(c => {
    const r = pushRecompute(c);
    if (c.type === 'file') { any++; if (r) on++; }
    if (r) all++;
  });
  node.checked = on === any && any > 0;
  node.partial = on > 0 && on < any;
  return node.checked;
}

function pushSetAll(node, val) {
  if (!node || node.locked) return;
  if (node.type === 'file') { node.checked = val; return; }
  node.children.forEach(c => pushSetAll(c, val));
  node.checked = val; node.partial = false;
}

function buildPushTree(files) {
  const root = { type: 'dir', name: '', path: '', children: [], open: true, locked: false, checked: true };
  const dirs = new Map();
  const dirNode = (parts) => {
    let cur = root;
    let acc = '';
    parts.forEach(seg => {
      acc = acc ? acc + '/' + seg : seg;
      let n = dirs.get(acc);
      if (!n) {
        n = { type: 'dir', name: seg, path: acc, children: [], open: true, locked: false, checked: true };
        dirs.set(acc, n);
        cur.children.push(n);
      }
      cur = n;
    });
    return cur;
  };
  files.forEach(f => {
    const parts = String(f.path).split('/');
    const name = parts.pop();
    const parent = parts.length ? dirNode(parts) : root;
    parent.children.push({ type: 'file', name, path: f.path, status: f.status, checked: true, locked: false });
  });
  // 上次锁定的文件夹：这次打开保持锁定并默认折叠
  const applyLocked = (node) => {
    if (node.path && (PUSH_STATE.locked[node.path] || pushIsDefaultLocked(node.path))) {
      node.locked = true;
      if (node.type === 'dir') node.open = false;
    }
    (node.children || []).forEach(applyLocked);
  };
  applyLocked(root);
  pushRecompute(root);
  return root;
}

function pushSelectedCount() {
  return pushCollect(PUSH_STATE.tree, []).length;
}

function pushRow(node, depth, parentLocked, coveredBy) {
  const locked = parentLocked || node.locked;
  const cls = ['prow'];
  if (node.type === 'dir') cls.push('is-dir');
  if (locked) cls.push('is-locked');
  const pad = depth * 12;
  const chev = node.type === 'dir'
    ? `<span class="prow__chev" data-act="push-fold" data-path="${esc(node.path)}">${node.open ? '▾' : '▸'}</span>`
    : '<span class="prow__chev"></span>';
  const boxCls = (node.locked || parentLocked) ? 'hidden' : (node.checked ? 'on' : (node.partial ? 'part' : ''));
  const box = `<span class="prow__box ${boxCls}" data-act="push-check" data-path="${esc(node.path)}">${node.checked && !node.partial ? '✓' : ''}</span>`;
  const st = node.type === 'file' && node.status ? `<span class="prow__st st-${esc(node.status[0])}">${esc(node.status)}</span>` : '';
  const lockIcon = node.locked
    ? '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M8 1a3 3 0 0 0-3 3v2H4v8h8V6h-1V4a3 3 0 0 0-3-3zm0 1.5A1.5 1.5 0 0 1 9.5 4v2h-3V4A1.5 1.5 0 0 1 8 2.5z"/></svg>'
    : '<svg viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M5 7V4.5a3 3 0 0 1 6 0V7M3.5 7h9v7h-9z"/></svg>';
  const hit = fileNoteFor(node.path, node.type === 'dir');
  // 父级已经解释过这块（hit.owner === 父级说明 owner）就不再重复
  const showNote = !!hit && hit.owner !== coveredBy;
  const noteHtml = showNote ? `<span class="prow__note" title="${esc(hit.note)}">${esc(hit.note)}</span>` : '';
  const row = `<div class="${cls.join(' ')}" style="padding-left:${6 + pad}px">
      ${chev}${box}<span class="prow__name" title="${esc(node.path || node.name)}">${esc(node.name || '/')}</span>${st}${noteHtml}
      <span class="prow__lock ${node.locked ? 'on' : ''}" data-act="push-lock" data-path="${esc(node.path)}" title="${node.locked ? '已锁定：这部分不会推送' : '锁定：这部分不推送'}">${lockIcon}</span>
    </div>`;
  if (node.type === 'dir' && node.open) {
    const cover = hit ? hit.owner : coveredBy;
    return row + node.children.map(c => pushRow(c, depth + 1, locked, cover)).join('');
  }
  return row;
}

function pushFindNode(node, path) {
  if (!node) return null;
  if (node.path === path) return node;
  for (const c of node.children || []) {
    const r = pushFindNode(c, path);
    if (r) return r;
  }
  return null;
}

function pushDialogHTML() {
  const en = LANG === 'en';
  const loading = !!PUSH_STATE.loading;
  const total = loading ? 0 : pushNodeFiles(PUSH_STATE.tree, []).length;
  const sel = loading ? 0 : pushSelectedCount();
  return `<div class="modal__head"><span class="idx">PUSH</span><h3>${en ? 'Select files to push' : '选择要推送的文件'}</h3>
      <button class="iconbtn x" data-act="push-cancel">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 8px">
        ${(() => {
          const g0 = ensureGitSettings();
          const cur = (gitState.status && gitState.status.branch) || '';
          const target = g0.branch || cur || 'main';
          const warn = cur && target !== cur;
          return `${en ? 'Target branch: ' : '目标分支：'}<b>${esc(target)}</b>${warn
            ? (en ? ` <b style="color:#ffb066">⚠ Local branch is ${esc(cur)}; pushing HEAD:${esc(target)}</b> (rejected if the remote branch has its own commits)` : `　<b style="color:#ffb066">⚠ 当前本地分支是 ${esc(cur)}，会以 HEAD:${esc(target)} 推送</b>（如果远端该分支有自己的提交会被拒绝）`)
            : ''}`;
        })()}<br>
        ${en ? `<b>How to use:</b> everything is checked by default → uncheck files you don't want, or click the lock icon to lock a block (red, checkbox hidden, not pushed).
        Checking/unchecking a folder includes its children; click <b>▾ / ▸</b> to fold/expand.<br>
        <b>Why some files are locked by default:</b> <code>Editor/history</code> (local snapshots), <code>Editor/nht-project.js</code> (your canvas data),
        <code>*.bak</code> backups and <code>Editor/body-map.json</code> are personal data — pushing them would overwrite other people's data, so they are locked.
        You can unlock them manually if needed.` : `<b>怎么用：</b>默认全部勾选 → 不想传的取消勾选，或点右侧锁图标把整块锁住（红色、勾选框消失、不参与本次推送）。
        勾/取消父文件夹会连带子项；点 <b>▾ / ▸</b> 折叠或展开。<br>
        <b>为什么有些文件默认锁住：</b><code>Editor/history</code>（本地保存快照）、<code>Editor/nht-project.js</code>（你自己的画布数据）、
        <code>*.bak</code> 备份、<code>Editor/body-map.json</code> 都是「个人本地数据」—— 传到仓库会把别人拉下来的数据覆盖掉，所以默认锁住，
        需要时你可以手动解锁。`}
      </p>
      ${PUSH_STATE.aheadOnly ? `<p class="mini-note" style="margin:0 0 8px;color:#ffd08a">${en ? `No new file changes; pushing only <b>${PUSH_STATE.aheadCount || 0}</b> local unpushed commits.` : `本次没有新的文件改动，只推送本地已有的 <b>${PUSH_STATE.aheadCount || 0}</b> 个未推送提交。`}</p>` : ''}
      ${(!PUSH_STATE.aheadOnly && PUSH_STATE.ahead) ? `<p class="mini-note" style="margin:0 0 8px">
        ${en ? `There are <b>${PUSH_STATE.ahead}</b> local unpushed commits (not in the list; pushing uploads them too):` : `本地已有 <b>${PUSH_STATE.ahead}</b> 个未推送提交（不在下面的文件列表里，点推送会一起上传）：`}
        <br><code style="opacity:.8">${(PUSH_STATE.aheadCommits || []).slice(0, 5).map(esc).join('<br>')}</code>
        ${PUSH_STATE.ahead > 5 ? '<br><span style="opacity:.6">…</span>' : ''}
      </p>` : ''}
      <div class="pushtree" id="pushTree">${loading ? `<p class="mini-note" style="padding:10px 4px">${en ? 'Reading local changes… (max 20s)' : '正在读取本地更改…（最多 20 秒）'}</p>` : PUSH_STATE.tree.children.map(c => pushRow(c, 0, false)).join('')}</div>
      <div class="pushtools">
        <button class="btn btn--sm" data-act="push-all"${loading ? ' disabled' : ''}>${en ? 'Select all' : '全选'}</button>
        <button class="btn btn--sm" data-act="push-none"${loading ? ' disabled' : ''}>${en ? 'Select none' : '全不选'}</button>
        <span class="n" id="pushCount">${loading ? (en ? 'Reading local changes…' : '正在读取本地更改…') : (en ? `${sel} / ${total} files to push${PUSH_STATE.lockedCount ? ` · ${PUSH_STATE.lockedCount} locked (${(PUSH_STATE.lockedNames || []).join(', ')}${PUSH_STATE.lockedCount > (PUSH_STATE.lockedNames || []).length ? ' …' : ''})` : ''}` : `本次推送 ${sel} / ${total} 个文件${PUSH_STATE.lockedCount ? `　·　已锁定 ${PUSH_STATE.lockedCount} 项不推送（${(PUSH_STATE.lockedNames || []).join('、')}${PUSH_STATE.lockedCount > (PUSH_STATE.lockedNames || []).length ? ' …' : ''}）` : ''}`)}</span>
      </div>
      <div class="field"><label>${en ? 'Commit message' : '提交说明'}</label><div class="ctl">
        <input class="inp" id="pushMsg" value="${esc(PUSH_STATE.msg)}" spellcheck="false">
      </div></div>
      <div class="field"><label>${en ? 'Commit description' : '提交描述'}</label><div class="ctl">
        <textarea class="inp pushbody" id="pushBody" rows="3" spellcheck="false"
          placeholder="${en ? 'Optional: what changed (written into the git commit description)' : '可选：这次改了什么（会写进 git 提交描述）'}">${esc(PUSH_STATE.body || '')}</textarea>
      </div></div>
    </div>
    <div class="modal__foot">
      <button class="btn btn--danger" data-act="push-cancel">${en ? 'Cancel' : '取消'}</button>
      <button class="btn btn--multi" data-act="push-go" id="pushGoBtn" ${(loading || !(sel || PUSH_STATE.aheadOnly)) ? 'disabled' : ''}>${loading ? (en ? 'Loading…' : '读取中…') : (PUSH_STATE.aheadOnly ? (en ? 'Push local commits' : '推送本地提交') : (en ? ('Push ' + sel + ' files') : ('推送 ' + sel + ' 个文件')))}</button>
    </div>`;
}

function refreshPushDialog() {
  const tree = document.getElementById('pushTree');
  if (!tree) { renderPushDialog(); return; }
  tree.innerHTML = PUSH_STATE.tree.children.map(c => pushRow(c, 0, false)).join('');
  const total = pushNodeFiles(PUSH_STATE.tree, []).length;
  const sel = pushSelectedCount();
  const count = document.getElementById('pushCount');
  if (count) count.textContent = LANG === 'en' ? `Selected ${sel} / ${total} files` : `已选 ${sel} / ${total} 个文件`;
  const go = document.getElementById('pushGoBtn');
  if (go) { go.textContent = LANG === 'en' ? `Push ${sel} files` : `推送 ${sel} 个文件`; go.disabled = !sel; }
}

function renderPushDialog() {
  const tree = document.getElementById('pushTree');
  if (tree) { refreshPushDialog(); return; }
  openModal(`<div class="modalfix modalfix--push">${pushDialogHTML()}</div>`);
  const inp = document.getElementById('pushMsg');
  if (inp) inp.addEventListener('input', () => { PUSH_STATE.msg = inp.value; });
  const bodyInp = document.getElementById('pushBody');
  if (bodyInp) bodyInp.addEventListener('input', () => { PUSH_STATE.body = bodyInp.value; });
}

async function gitOpenPushDialog() {
  if (!gitValid()) return;
  if (gitBranchBad(ensureGitSettings().branch)) { toast('分支不能为空：请到「设置 → Git」填一个分支名', true); setSettingsTab('git'); modalSettings(); return; }
  if (PUSH_STATE.busy) { toast('正在读取本地更改，请稍候…', true); return; }
  PUSH_STATE.busy = true;
  // 先弹窗，再读取；否则 __gitchanges 里的 robocopy / git status 慢时看起来像按钮失效
  PUSH_STATE.loading = true;
  PUSH_STATE.files = [];
  PUSH_STATE.tree = { path: '', name: '', kind: 'dir', children: [] };
  PUSH_STATE.aheadOnly = false;
  PUSH_STATE.lockedCount = 0;
  PUSH_STATE.lockedNames = [];
  renderPushDialog();
  try {
    await loadFileNotes();
    const g = ensureGitSettings();
    const syncQ = (g.syncMod === false) ? '0' : '1';
    const ctrl = new AbortController();
    const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) { } }, 90000);
    let r;
    try {
      r = await fetch('/__gitchanges?dir=' + encodeURIComponent(g.dir) + '&sync=' + syncQ, { cache: 'no-store', signal: ctrl.signal });
    } finally { clearTimeout(timer); }
    const j = await r.json();
    if (!j || !j.ok) {
      PUSH_STATE.loading = false;
      closeModal();
      toast('读取本地更改失败：' + ((j && j.error) || '未知错误'), true);
      return;
    }
    PUSH_STATE.ahead = Number(j.ahead) || 0;
    PUSH_STATE.aheadCommits = Array.isArray(j.aheadCommits) ? j.aheadCommits : [];
    if (!j.files || !j.files.length) {
      // 没有新改动：如果本地还有没推的提交（比如上次推送失败），仍然允许推送
      let ahead = 0;
      try {
        const st = await (await fetch('/__git?dir=' + encodeURIComponent(ensureGitSettings().dir) +
          '&branch=' + encodeURIComponent(ensureGitSettings().branch || 'main'), { cache: 'no-store' })).json();
        if (st && st.ok) { gitState.status = st; ahead = Number(st.ahead) || 0; }
      } catch (e) { }
      if (!ahead) { PUSH_STATE.loading = false; closeModal(); toast('没有需要推送的更改'); return; }
      PUSH_STATE.aheadOnly = true;
      PUSH_STATE.aheadCount = ahead;
      PUSH_STATE.lockedCount = 0;
      PUSH_STATE.lockedNames = [];
      PUSH_STATE.files = [];
      PUSH_STATE.tree = buildPushTree([]);
      PUSH_STATE.loading = false;
      renderPushDialog();
      return;
    }
    PUSH_STATE.aheadOnly = false;
    const allFiles = j.files || [];
    const shown = allFiles.filter(f => !pushIsDefaultLocked(f.path));
    PUSH_STATE.lockedCount = allFiles.length - shown.length;
    PUSH_STATE.lockedNames = Array.from(new Set(allFiles
      .filter(f => pushIsDefaultLocked(f.path))
      .map(f => { const p = String(f.path).split('/'); return p.length > 1 ? p.slice(0, 2).join('/') : p[0]; }))).slice(0, 6);
    if (!shown.length) {
      PUSH_STATE.loading = false;
      closeModal();
      toast('改动都在默认锁定范围内（个人数据 / 临时文件），不需要推送', true);
      return;
    }
    PUSH_STATE.files = shown;
    PUSH_STATE.tree = buildPushTree(shown);
    PUSH_STATE.loading = false;
    renderPushDialog();
  } catch (e) {
    PUSH_STATE.loading = false;
    closeModal();
    const msg = (e && e.name === 'AbortError') ? '读取本地更改超时（20 秒），可能是同步模组文件太慢' : (e && e.message);
    toast('读取本地更改失败：' + msg, true);
  } finally {
    PUSH_STATE.busy = false;
  }
}

async function gitPushNow() {
  if (!gitValid()) return;
  const g = ensureGitSettings();
  const files = pushCollect(PUSH_STATE.tree, []);
  if (!files.length && !PUSH_STATE.aheadOnly) { toast('没有选中任何文件', true); return; }
  const message = (PUSH_STATE.msg || '').trim() || 'Update from NHT editor';
  if (!GIT_PUSH_AUTORETRY) { /* 第一次进入：允许一次自动重试 */ }
  gitState.busy = true;
  gitFlash(false);
  const goBtn = document.getElementById('pushGoBtn');
  const goTxt = goBtn ? goBtn.textContent : '';
  if (goBtn) { goBtn.disabled = true; goBtn.textContent = '正在推送…'; }
  toast('正在推送 ' + files.length + ' 个文件到仓库…');
  try {
    const url = '/__gitpush?dir=' + encodeURIComponent(g.dir)
      + '&branch=' + encodeURIComponent(g.branch || 'main')
      + '&message=' + encodeURIComponent(message)
      + '&name=' + encodeURIComponent(g.name || '')
      + '&email=' + encodeURIComponent(g.email || '')
      + '&sync=0'
      + '&body=' + encodeURIComponent(PUSH_STATE.body || '')
      + '&files=' + encodeURIComponent(files.join('\n'));
    const r = await fetch(url, { cache: 'no-store', method: 'POST' });
    const j = await r.json();
    if (j && j.ok) {
      gitFlash(true, 'push');
      gitLog('Push 成功', (j.log || '').trim() || '已推送');
      closeModal();
      gitState.pushGuardUntil = Date.now() + 6000;   // 刚推完：短暂忽略“落后”判定，避免自己刚推的提交被当成新提交
      await gitRefresh();                      // 立刻刷新「未推送 / 已同步」
      try { renderPatch(); } catch (e) { }      // 右侧区块重画
      try { gmkCheckNew(); } catch (e) { }      // 书签检查新版本
      toast(files.length ? ('已推送 ' + files.length + ' 个文件并同步状态：' + message) : ('已推送本地未推送的提交：' + message));
    } else if (j && j.hint === 'nothing-staged') {
      gitFlash(false, 'push');
      gitLog('Push 失败：没有改动', (j.log || ''));
      toast('选中的文件没有产生改动（可能路径不匹配/被忽略），已阻止推送空分支；刷新后重试', true);
      await gitRefresh();
      gitFlash(false, 'push');
    } else if (j && (j.hint === 'diverged' || j.hint === 'pull-first')) {
      gitLog('Push 被阻止', (j.log || '').trim());
      if (!GIT_PUSH_AUTORETRY) {
        // 第一次遇到：自动拉取（服务端会 ff 或「以本地为准」合并），然后重试一次推送
        GIT_PUSH_AUTORETRY = true;
        toast('远端有更新，正在自动拉取后重试推送…');
        const g2 = ensureGitSettings();
        try {
          const pr = await fetch('/__gitpull?dir=' + encodeURIComponent(g2.dir) + '&branch=' + encodeURIComponent(g2.branch || 'main'),
            { cache: 'no-store', method: 'POST' });
          const pj = await pr.json();
          if (pj && pj.ok) {
            gitLog('自动拉取完成', (pj.log || '').trim());
            await gitRefresh();
            gitFlash(false, 'push');
            setTimeout(() => { try { gitPushNow(); } catch (e) { } }, 60);
            return;
          }
          gitLog('自动拉取失败', (pj && (pj.log || pj.error)) || '未知错误');
        } catch (e) {
          gitLog('自动拉取失败', e && e.message);
        }
      }
      toast('本地和远端都有新提交：拉取未能自动完成，请手动点「拉取远端」后再推送', true);
      await gitRefresh();
      gitFlash(false, 'push');
    } else {
      gitFlash(false, 'push');
      const failLog = String((j && (j.log || j.error)) || '');
      if (/网络超时/.test(failLog)) {
        gitLog('Push 超时', failLog);
        toast('推送超时：连不上远端（网络 / 代理问题），已中止，不会卡住页面', true);
        await gitRefresh();
        gitFlash(false, 'push');
      } else
      gitLog('Push 失败', failLog || '未知错误');
      if (/Repository not found|repository .* not found|does not appear to be a git repository|This repository moved|redirect/i.test(failLog)) {
        toast('推送失败：远程地址可能已改名 / 迁移 —— 到「设置 → Git → 远程仓库」点齿轮改地址', true);
        setSettingsTab('git'); modalSettings();
      } else {
        toast('Push 失败，展开「同步日志」看原因', true);
      }
    }
  } catch (e) {
    gitFlash(false, 'push');
    gitLog('Push 失败', e && e.message);
    toast('Push 失败：' + (e && e.message), true);
  } finally {
    gitState.busy = false;
    if (goBtn) { goBtn.disabled = false; goBtn.textContent = goTxt || '推送'; }
    renderGitUI();
  }
}

async function gitDoPull() {
  if (!gitValid()) return;
  if (gitBranchBad(ensureGitSettings().branch)) { toast('分支不能为空：请到「设置 → Git」填一个分支名', true); setSettingsTab('git'); modalSettings(); return; }
  if (!String(ensureGitSettings().branch || '').trim()) { toast('分支不能为空：先到「设置 → Git」选一个命名开头', true); setSettingsTab('git'); modalSettings(); return; }
  if (gitState.busy) return;
  if (!gitState.status) {
    await gitRefresh();
    if (!gitState.status) {
      toast('Git 配置有问题：连不上仓库（去看「设置 → Git」和同步日志）', true);
      setSettingsTab('git'); modalSettings();
      return;
    }
  }
  const g = ensureGitSettings();
  gitState.busy = true;
  try {
    const url = '/__gitpull?dir=' + encodeURIComponent(g.dir) + '&branch=' + encodeURIComponent((gitState.status && gitState.status.branch) || g.branch || 'main');
    const r = await fetch(url, { cache: 'no-store', method: 'POST' });
    const j = await r.json();
    if (j && j.ok) {
      gitFlash(true, 'pull');
      const modeTxt = j.mode === 'rebase' ? '（本地提交已变基到远端）'
        : (j.mode === 'merge' ? '（生成了一个合并提交）'
          : (j.mode === 'merge-ours' ? '（分叉冲突：已按「本地为准」合并）' : ''));
      gitLog('拉取成功' + modeTxt, (j.log || '').trim() || '已是最新');
      toast('已拉取仓库更新' + modeTxt);
    } else {
      gitFlash(false, 'pull');
      const pl = String((j && (j.log || j.error)) || '未知错误');
      gitLog('拉取失败', pl);
      if (/网络超时/.test(pl)) toast('拉取超时：连不上远端（网络 / 代理问题），已中止，页面其他操作不受影响', true);
      else toast('拉取失败，展开「同步日志」看原因', true);
    }
  } catch (e) {
    gitFlash(false, 'pull');
    gitLog('拉取失败', e && e.message);
    toast('拉取失败：' + (e && e.message), true);
  }
  gitState.busy = false;
  await gitRefresh();
  try { gmkCheckNew(); } catch (e) { }
  renderPatch();
}

/* ---------------- 导出模组文件（纯模组，不含编辑器） ---------------- */
async function writeTextFile(dirHandle, name, text) {
  const fh = await dirHandle.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

function aboutXML() {
  const p = S.project || {};
  const name = p.name || 'NHT Custom Dolls';
  const author = p.author || 'atian';
  const id = p.packageId || 'atian.nht.customdolls';
  return `<?xml version="1.0" encoding="utf-8"?>
<ModMetaData>
  <name>${xesc(name)}</name>
  <author>${xesc(author)}</author>
  <packageId>${xesc(id)}</packageId>
  <supportedVersions>
    <li>1.6</li>
    <li>1.7</li>
  </supportedVersions>
  <description>由 NHT 解剖编辑器导出：包含已注入的补丁与贴图，不含编辑器页面。</description>
</ModMetaData>
`;
}

function modDirtyList() {
  return S.canvases.filter(c => canvasDirty(c));
}

async function exportModFiles() {
  // 先问版本号：默认用编辑器里保存的 About.xml 的 modVersion
  const v0 = aboutVersion();
  openModal(`<div style="width:min(460px,92vw)">
    <div class="modal__head"><span class="idx">MOD</span><h3>导出模组文件</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <div class="field"><label>版本号</label><div class="ctl">
        <input class="inp" id="modExportVersion" value="${esc(v0)}" spellcheck="false" placeholder="例如 0.2">
      </div></div>
      <p class="mini-note" style="margin:2px 0 0">导出的是<b>模组文件夹当前的真实文件</b>（1.6 / 1.7、Patches、Textures、LoadFolders.xml 全部按原结构打包），<b>不会</b>重新生成补丁或改动任何文件；编辑器里未注入的改动不会包含在内。</p>
      <p class="mini-note" style="margin:4px 0 0">版本号留空 = 使用模组里的 <code>About.xml</code> 原样；填写则只覆盖 zip 内 About 的 <code>&lt;modVersion&gt;</code>。</p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--modx" data-act="mod-export-do">导出</button>
    </div></div>`);
  return;
}

async function exportModFilesStage2() {
  const dirty = modDirtyList();
  if (dirty.length) {
    openModal(`<div style="width:min(520px,92vw)">
      <div class="modal__head"><span class="idx">CHECK</span><h3>还有画布没注入</h3>
        <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
      <div class="modal__body">
        <div class="mxdirty">
          <b>下面 ${dirty.length} 个画布有改动，但还没注入模组：</b>
          <ul>${dirty.map(c => `<li>${esc(c.title)}</li>`).join('')}</ul>
        </div>
        <p class="mini-note" style="margin:0">导出的是磁盘上的现有模组文件，所以这些<b>尚未注入</b>的改动<b>不会</b>被带上；
          需要包含请先去「多选注入模组」或单画布注入，再导出。</p>
      </div>
      <div class="modal__foot">
        <button class="btn" data-act="close-modal">取消</button>
        <button class="btn btn--modx" data-act="mod-export-go">继续导出</button>
      </div></div>`);
    return;
  }
  await doExportModFiles();
}

async function doExportModFiles() {
  if (!LOCAL_HTTP) {
    toast('导出模组文件需要本地服务：请用「启动编辑器.bat」打开编辑器', true);
    return;
  }
  const prev = S.active;
  progStart('准备导出…', 5);
  try {
    // 直接打包磁盘上的模组文件：不重新生成补丁、不改任何文件
    progStep(1, '读取模组文件…');

    // 3) About 版本
    progStep(3, '写入 About.xml…');
    const aboutTxt = (typeof MOD_EXPORT_VERSION !== 'undefined' && MOD_EXPORT_VERSION)
      ? aboutWithVersion(MOD_EXPORT_VERSION)
      : '';
    if (typeof MOD_EXPORT_VERSION !== 'undefined' && MOD_EXPORT_VERSION) {
      try { aboutSetVersion(MOD_EXPORT_VERSION); } catch (e) { }
    }
    let aboutQ = '';
    if (aboutTxt.trim()) {
      const chk = aboutCheck(aboutTxt);
      if (!chk.ok) {
        toast('About.xml 有错误，先修好再导出：' + chk.errors[0], true);
        S.active = prev;
        setSettingsTab('about'); modalSettings();
        progDone();
        return;
      }
      aboutQ = '?about=' + encodeURIComponent(aboutTxt);
    }

    // 4) 打包并下载
    progStep(4, '打包模组文件夹…');
    let blob;
    if (HOST && !LOCAL_HTTP) {
      const b64 = await HOST.MakeModZip(aboutTxt && aboutTxt.trim() ? aboutTxt : '');
      if (!b64) throw new Error('zip failed');
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      blob = new Blob([arr], { type: 'application/zip' });
    } else {
      const r = await fetch('/__modzip' + aboutQ, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      blob = await r.blob();
    }
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    const base = slug((S.project && S.project.name) || 'NHT_CustomDolls');
    const stampOn = S.settings.zipStamp !== false;
    download(`${base}${stampOn ? '-mod-' + ts : ''}.zip`, blob, 'application/zip');
    progStep(5, '已下载 zip');

    S.active = prev;
    S.canvases.forEach(c => { c.savedSig = canvasSig(c); c.sigVer = CANVAS_SIG_VER; });
    persist();
    progDone();
    toast(`已导出模组文件（${Math.round(blob.size / 1024)} KB，保持原目录结构，不含 Editor/Source 等开发内容）`);
  } catch (e) {
    S.active = prev;
    progDone();
    toast('打包失败：' + (e && e.message), true);
  }
}

/* ---------------- 保存路径设置 ---------------- */
const SAVE_TARGETS = [
  { key: 'project', name: '本地保存（每个画布 → canvases/<种族>/）', hint: 'index.json + 每个画布一个 json，同时生成 nht-project.js', def: 'Editor/canvases/', pick: false },
  { key: 'patch',   name: '注入模组（单个/多选 → Patches/*.xml）', hint: '补丁 XML 写到模组的 Patches/', def: '__MOD__/Patches/', pick: true },
  { key: 'texture', name: '贴图（Textures/）', hint: '部位/发型贴图写到模组 Textures/', def: '__MOD__/Textures/', pick: true },
  { key: 'assets',  name: '素材目录（assets/）', hint: '「按勾选写入」使用的目录', def: 'Editor/assets/', pick: true }
];
function saveSettings() {
  if (!S.settings || typeof S.settings !== 'object') S.settings = {};
  if (typeof S.settings.checkPath !== 'boolean') S.settings.checkPath = true;
  if (typeof S.settings.tipCanvas !== 'boolean') S.settings.tipCanvas = true;
  if (typeof S.settings.tipTree !== 'boolean') S.settings.tipTree = true;
  if (typeof S.settings.zipStamp !== 'boolean') S.settings.zipStamp = true;
  if (typeof S.settings.autoCrop !== 'boolean') S.settings.autoCrop = false;
  if (!Number.isFinite(Number(S.settings.cropMax))) S.settings.cropMax = 4;
  if (!Array.isArray(S.settings.mineOrder)) S.settings.mineOrder = [];
  if (!S.settings.paths || typeof S.settings.paths !== 'object') S.settings.paths = {};
  SAVE_TARGETS.forEach(t2 => { if (!S.settings.paths[t2.key]) S.settings.paths[t2.key] = t2.def; });
  return S.settings;
}
const SAVE_DIRS = {};       // 手动选的目录句柄（仅本次会话可用）

function pathLabel(key) {
  saveSettings();
  const d = (SAVE_TARGETS.find(x => x.key === key) || {}).def || '';
  return S.settings.paths[key] || String(d).replace('__MOD__', SELF.name);
}

/* 保存前校验路径：本地服务模式固定路径；否则必须有可用目录句柄 */
async function ensureSavePath(key) {
  saveSettings();
  if (!S.settings.checkPath) return true;                  // 用户关掉了校验
  if (LOCAL_HTTP) return true;                             // 本地服务的路径由 serve.ps1 固定，一定可写
  const h = SAVE_DIRS[key];
  if (!h) {
    toast('还没有选择「' + pathLabel(key) + '」对应的文件夹，点设置里的文件夹图标选一个', true);
    return false;
  }
  try {
    let perm = await h.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') perm = await h.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') { toast('没有写入权限：' + pathLabel(key), true); return false; }
    return true;
  } catch (e) { toast('路径不可用：' + e.message, true); return false; }
}

async function pickSaveDir(key) {
  if (typeof window.showDirectoryPicker !== 'function') { toast('这个浏览器不支持选择文件夹', true); return; }
  try {
    const dir = await window.showDirectoryPicker({ id: 'nht-' + key, mode: 'readwrite' });
    SAVE_DIRS[key] = dir;
    saveSettings();
    S.settings.paths[key] = dir.name + '/';
    renderSettingsPaths();
    toast('已指定：' + S.settings.paths[key]);
  } catch (e) { if (!e || e.name !== 'AbortError') toast('选择失败：' + (e && e.message), true); }
}

function renderSettingsPaths() {
  const box = document.getElementById('setPaths');
  if (!box) return;
  box.innerHTML = SAVE_TARGETS.map(t2 => `
    <div class="sitem">
      <h4>${esc(t2.name)}</h4>
      <p class="hint">${esc(t2.hint)}</p>
      <div class="spath">
        <input class="inp" data-path="${t2.key}" value="${esc(pathLabel(t2.key))}" spellcheck="false" title="保存路径（可直接编辑）">
        <button class="spath__pick" data-act="set-pick" data-key="${t2.key}" title="手动指定文件夹">${icon('folder')}</button>
      </div>
    </div>`).join('');
}

function setSettingsTab(tab) { S.ui.settingsTab = tab; }

/* ---------------- About.xml ---------------- */
/* 简单校验：能不能被游戏读取、必填项有没有、packageId 格式对不对 */
function aboutCheck(text) {
  const out = { ok: false, level: 'bad', errors: [], warns: [], info: {} };
  const raw = String(text || '');
  if (!raw.trim()) { out.errors.push('还没有内容：点「上传 About.xml」或粘贴一份进来'); return out; }
  let doc = null;
  try {
    doc = new DOMParser().parseFromString(raw, 'application/xml');
  } catch (e) {
    out.errors.push('XML 解析失败：' + e.message);
    return out;
  }
  const pe = doc.querySelector('parsererror');
  if (pe) {
    out.errors.push('XML 语法错误：' + (pe.textContent || '').trim().split('\n')[0].slice(0, 200));
    return out;
  }
  const root = doc.documentElement;
  if (!root || root.nodeName !== 'ModMetaData') {
    out.errors.push('根节点必须是 <ModMetaData>，现在是 <' + (root ? root.nodeName : '空') + '>');
    return out;
  }
  const txt = (tag) => {
    const el = root.querySelector(tag);
    if (!el) return '';
    // 只取根节点下的直接子节点，避免 modDependencies 里的 name 混进来
    for (let i = root.children.length - 1; i >= 0; i--) { }
    return (el.textContent || '').trim();
  };
  const name = txt('name'), author = txt('author'), pkg = txt('packageId');
  const vers = Array.from(root.querySelectorAll('supportedVersions > li')).map(x => (x.textContent || '').trim()).filter(Boolean);
  const desc = txt('description');
  const deps = Array.from(root.querySelectorAll('modDependencies > li > packageId')).map(x => (x.textContent || '').trim()).filter(Boolean);
  out.info = { name: name, author: author, packageId: pkg, versions: vers, deps: deps, descLen: desc.length };

  if (!name) out.errors.push('缺少 <name>（模组列表里显示的名字）');
  else if (name.length > 80) out.warns.push('<name> 有点长（' + name.length + ' 字），列表里会被截断');
  if (!pkg) out.errors.push('缺少 <packageId>（下载别人存档时用来定位模组，必须唯一）');
  else if (!/^[A-Za-z0-9_.\-]+$/.test(pkg)) out.errors.push('<packageId> 有非法字符：只能用字母 / 数字 / . _ -');
  else if (pkg.indexOf('.') < 0) out.warns.push('<packageId> 建议写成 author.mod 的格式（例如 atian.nht.customdolls）');
  else if (pkg.length > 100) out.warns.push('<packageId> 太长了');
  if (!author) out.warns.push('缺少 <author>（作者名，可以不填但建议写上）');
  if (!vers.length) out.errors.push('缺少 <supportedVersions>，游戏不知道该在哪个版本加载');
  else {
    const okVers = vers.filter(v => /^(1\.[5-7])$/.test(v));
    if (!okVers.length) out.warns.push('supportedVersions 里没有 1.5 / 1.6 / 1.7：现在是 ' + vers.join('、'));
    if (okVers.indexOf('1.6') < 0) out.warns.push('没有声明 1.6：这个模组在当前版本可能不会显示');
  }
  if (!desc) out.warns.push('缺少 <description>（模组页里的说明，可留空但看起来像坏包）');
  else if (desc.length < 20) out.warns.push('<description> 很短（' + desc.length + ' 字）');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw)) out.warns.push('内容里有不可见控制字符，建议删掉');
  if (raw.indexOf('\uFEFF') === 0) out.warns.push('文件带 BOM：RimWorld 能读，但有些工具会出问题，建议存成无 BOM');
  out.ok = out.errors.length === 0;
  out.level = out.ok ? (out.warns.length ? 'warn' : 'ok') : 'bad';
  return out;
}

/* About.xml 版本号：编辑器保存的那份（S.project.aboutXml）里的 <modVersion> */
function aboutVersion() {
  const m = String(aboutCurrent()).match(/<modVersion>([\s\S]*?)<\/modVersion>/i);
  return m ? m[1].trim() : '';
}
function aboutWithVersion(v) {
  const val = String(v == null ? '' : v).trim();
  let t = aboutCurrent();
  if (!val) return t;
  if (/<modVersion>[\s\S]*?<\/modVersion>/i.test(t)) {
    return t.replace(/<modVersion>[\s\S]*?<\/modVersion>/i, '<modVersion>' + val + '</modVersion>');
  }
  return t.replace(/<\/ModMetaData>/i, '\t<modVersion>' + val + '</modVersion>\n</ModMetaData>');
}
function aboutSetVersion(v) {
  const t = aboutWithVersion(v);
  if (!t) return false;
  S.project.aboutXml = t;
  try { const ta = document.getElementById('aboutTa'); if (ta) ta.value = t; } catch (e) { }
  persist();
  return true;
}

function aboutCurrent() {
  return String((S.project && S.project.aboutXml) || '');
}

function settingsBodyHTML(tab) {
  const g = ensureGitSettings();
  const gi = gitState.info;
  const gitLine = !LOCAL_HTTP
    ? '<p class="gitlocal is-fail">当前不是本地服务模式：Git 功能不可用，请用「启动编辑器.bat」打开。</p>'
    : (gi === null ? '<p class="gitlocal">正在检测本机 Git…</p>'
      : (gi && gi.installed
        ? `<p class="gitlocal is-ok">本机 Git：<b>${esc(gi.version || '已安装')}</b></p>`
        : '<p class="gitlocal is-fail">没检测到本机 Git：请先安装 <b>Git for Windows</b>，否则推送/拉取不可用。</p>'));
  if (tab === 'about') {
    const txt = aboutCurrent();
    const chk = aboutCheck(txt);
    const lv = chk.level;
    const rowCls = lv === 'ok' ? 'is-ok' : (lv === 'warn' ? 'is-warn' : 'is-bad');
    const inf = chk.info || {};
    const issues = []
      .concat(chk.errors.map(m => `<div class="issue issue--err"><b>err</b><span>${esc(m)}</span></div>`))
      .concat(chk.warns.map(m => `<div class="issue issue--warn"><b>warn</b><span>${esc(m)}</span></div>`));
    return `
      <div class="setabs">
        <button class="setab" data-act="set-tab" data-tab="paths">保存</button>
        <button class="setab" data-act="set-tab" data-tab="git">Git</button>
        <button class="setab" data-act="set-tab" data-tab="ui">界面</button>
        <button class="setab is-on" data-act="set-tab" data-tab="about">About</button>
      </div>
      <p class="mini-note" style="margin:0 0 8px">
        导出模组文件时会<b>忽略模组目录里的 About/About.xml</b>，用这里的内容写进 zip。
        如果这里没配置，才回退到模组目录里的那份。
      </p>
      <div class="aboutstat ${rowCls}">
        <b>${lv === 'ok' ? 'About.xml 正常' : (lv === 'warn' ? '能读，但有警告' : '有问题，导出会被拦下')}</b>
        <span>${chk.ok ? (chk.warns.length ? chk.warns.length + ' 条警告' : '没有发现问题') : chk.errors.length + ' 处错误'}</span>
      </div>
      ${issues.length ? `<div class="issues" style="margin:8px 0">${issues.join('')}</div>` : ''}
      <div class="aboutgrid">
        <div><b>名称</b><span>${esc(inf.name || '—')}</span></div>
        <div><b>作者</b><span>${esc(inf.author || '—')}</span></div>
        <div><b>包名</b><span>${esc(inf.packageId || '—')}</span></div>
        <div><b>版本</b><span>${esc((inf.versions || []).join(' / ') || '—')}</span></div>
        <div><b>依赖</b><span>${esc((inf.deps || []).join('、') || '无')}</span></div>
        <div><b>说明</b><span>${(inf.descLen || 0)} 字</span></div>
      </div>
      <div class="rowflex" style="gap:6px;margin:10px 0 6px;flex-wrap:wrap">
        <button class="btn btn--sm" data-act="about-up">${icon('file')}上传 About.xml</button>
        <button class="btn btn--sm" data-act="about-load-cur" ${LOCAL_HTTP ? '' : 'disabled'}>读取模组目录现有</button>
        <button class="btn btn--sm" data-act="about-auto">用项目信息生成</button>
        <button class="btn btn--sm btn--danger" data-act="about-clear">清空</button>
      </div>
      <textarea class="inp aboutta" id="aboutTa" spellcheck="false"
        placeholder="在这里粘贴 About.xml 内容，或点上面的「上传 About.xml」">${esc(txt)}</textarea>
      <p class="mini-note" style="margin:6px 0 0">修改后会随项目一起保存；导出模组文件时用这份。</p>
    `;
  }
  if (tab === 'ui') {
    return `
      <div class="setabs">
        <button class="setab" data-act="set-tab" data-tab="paths">保存</button>
        <button class="setab" data-act="set-tab" data-tab="git">Git</button>
        <button class="setab is-on" data-act="set-tab" data-tab="ui">界面</button>
        <button class="setab" data-act="set-tab" data-tab="about">About</button>
      </div>
      <p class="mini-note" style="margin:0 0 10px">鼠标悬停提示（气泡）。关掉之后左下两块面板里就不再弹气泡，界面更干净。</p>
      <div class="swrow" style="margin:0 0 10px">
        <button class="switch${S.settings.tipCanvas !== false ? ' is-on' : ''}" data-act="set-tip-canvas" role="switch"
          aria-checked="${S.settings.tipCanvas !== false ? 'true' : 'false'}"
          title="体型画布列表里的悬浮提示"><i></i></button>
        <div style="min-width:0"><b>${S.settings.tipCanvas !== false ? '体型画布：显示悬浮提示' : '体型画布：已关闭悬浮提示'}</b>
          <span>画布条目、分组、右键菜单的说明</span></div>
      </div>
      <div class="swrow" style="margin:0 0 10px">
        <button class="switch${S.settings.tipTree !== false ? ' is-on' : ''}" data-act="set-tip-tree" role="switch"
          aria-checked="${S.settings.tipTree !== false ? 'true' : 'false'}"
          title="部位结构树里的悬浮提示"><i></i></button>
        <div style="min-width:0"><b>${S.settings.tipTree !== false ? '部位结构：显示悬浮提示' : '部位结构：已关闭悬浮提示'}</b>
          <span>部位行、分组行的说明</span></div>
      </div>
      <p class="setnote">其余区域（标签、按钮、字段）的提示保持开启；这两项只影响左侧两块面板。</p>
`;
  }
  if (tab === 'git') {
    return `
      <div class="setabs">
        <button class="setab" data-act="set-tab" data-tab="paths">保存</button>
        <button class="setab is-on" data-act="set-tab" data-tab="git">Git</button>
        <button class="setab" data-act="set-tab" data-tab="ui">界面</button>
        <button class="setab" data-act="set-tab" data-tab="about">About</button>
      </div>
      ${gitLine}
      <div class="repoline">远程仓库：
        <b data-tip="${esc((gitState.remote && gitState.remote.url) || '（未读取）')}">${esc((gitState.remote && gitState.remote.url) || '（未读取）')}</b>
        <button class="iconbtn iconbtn--xs" data-act="git-change-remote" title="仓库改名 / 换地址后在这里改">${icon('gear')}</button>
      </div>
      <div class="repoline">本机仓库：<b data-tip="${esc(g.dir || '（未设置）')}">${esc(g.dir || '（未设置）')}</b>
        <button class="iconbtn iconbtn--xs" data-act="g-pick" title="选择本机文件夹">${icon('folder')}</button>
      </div>
      <div class="field"><label>提交者名</label><div class="ctl" title="会写进 git 提交记录，GitHub 上显示的就是这个名字">
        <input class="inp" data-f="g.name" value="${esc(g.name || '')}" spellcheck="false" placeholder="可空">
      </div></div>
      <div class="field"><label>提交者邮箱</label><div class="ctl" title="会写进 git 提交记录；留空则用本机 git 全局配置">
        <input class="inp" data-f="g.email" value="${esc(g.email || '')}" spellcheck="false" placeholder="可空">
      </div></div>
      <div class="swrow" style="margin:8px 0 2px">
        <button class="switch${g.syncMod === false ? '' : ' is-on'}" data-act="set-git-sync" role="switch"
          aria-checked="${g.syncMod === false ? 'false' : 'true'}"
          title="推送前把当前正在使用的模组目录内容复制进仓库目录"><i></i></button>
        <div style="min-width:0"><b>${g.syncMod === false ? '推送前不同步模组文件' : '推送前同步模组文件'}</b>
          <span>把模组目录（About / Defs / Patches / Textures …）复制到仓库目录再提交</span></div>
      </div>
      <div class="rowline" style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button class="btn btn--sm" data-act="git-test">${icon('check')}测试连接</button>
        <button class="btn btn--sm" data-act="git-open-folder">${icon('refresh')}刷新状态</button>
      </div>
      <p class="setnote">状态：${gitState.status
        ? `<span class="setstat-ok">已连接 · 分支 ${esc(gitState.status.branch)} · 待推送 ${gitState.status.ahead || 0} / 待拉取 ${gitState.status.behind || 0}</span>`
        : '<span class="setstat-idle">未连接</span>'} · ${gitState.stateOk === true
        ? `<span class="setstat-ok">${esc(gitState.stateText || '已同步')}</span>`
        : (gitState.stateOk === false ? `<span class="setstat-fail">${esc(gitState.stateText || '同步失败')}</span>` : '<span class="setstat-idle">未同步</span>')}</p>
      <p class="setnote">默认值仅作参考：仓库目录 <code>C:\\Misaki\\Work\\github\\NHT_CustomDolls</code>。换成你自己的仓库时，路径要改；分支在「项目 → 仓库同步」里写。</p>
      <p class="setnote" style="margin-top:10px"><b>同步日志</b>（测试连接 / 推送 / 拉取的结果与失败原因）</p>
      <div class="setlog">${gitState.logs.length ? esc(gitLogsText()) : ''}</div>`;
  }
  return `
      <div class="setabs">
        <button class="setab is-on" data-act="set-tab" data-tab="paths">保存</button>
        <button class="setab" data-act="set-tab" data-tab="git">Git</button>
        <button class="setab" data-act="set-tab" data-tab="ui">界面</button>
        <button class="setab" data-act="set-tab" data-tab="about">About</button>
      </div>
      <div class="swrow" style="margin:0 0 10px">
        <button class="switch${S.settings.checkPath ? ' is-on' : ''}" data-act="set-checkpath" role="switch"
          aria-checked="${S.settings.checkPath ? 'true' : 'false'}"
          title="保存前验证目标路径是否存在、是否有写权限"><i></i></button>
        <div style="min-width:0"><b>${S.settings.checkPath ? '保存前校验路径：开' : '保存前校验路径：关'}</b>
          <span>关掉后保存不再检查目录，失败会直接报错</span></div>
      </div>
      <p class="mini-note" style="margin:0 0 8px">下面是每个保存按钮对应的路径。用文件夹图标可以手动指定（本地服务模式下路径由服务固定，图标仅作记录）。</p>
      <div class="swrow" style="margin:6px 0 8px">
        <div style="min-width:0"><b>自动裁剪缓存数量</b>
          <span>素材页「自动裁剪」最多同时缓存几张（1–12）</span></div>
        <input class="inp" type="number" min="1" max="12" step="1" style="width:64px"
          data-f="cropMax" value="${S.settings && S.settings.cropMax ? S.settings.cropMax : 4}"
          title="同时缓存的自动裁剪素材数量">
      </div>
      <div class="rowline" style="margin:6px 0 8px;display:flex;gap:6px">
        <button class="btn btn--sm" data-act="clean-scan" title="扫描 Textures/Custom，删除没有被任何画布/补丁引用的贴图；删除前自动备份到 Editor/history">清理无用贴图</button>
        <button class="btn btn--sm" data-act="clean-restore" title="从 Editor/history 的清理备份还原贴图">还原清理备份</button>
        <button class="btn btn--sm" data-act="gray-regen" title="备份当前种族的灰度目录，递归删除后按画布重新生成">重新生成灰度图</button>
        <button class="btn btn--sm" data-act="gray-restore" title="还原最近一次灰度备份（每个种族最多 2 份）">还原灰度备份</button>
      </div>
      <div id="setPaths"></div>
      <hr class="sec__rule">
      <div class="swrow" style="margin:8px 0 6px">
        <button class="switch${S.settings.zipStamp !== false ? ' is-on' : ''}" data-act="set-zipstamp" role="switch"
          aria-checked="${S.settings.zipStamp !== false ? 'true' : 'false'}"
          title="导出模组文件时，文件名里是否带上 -mod-日期-时间"><i></i></button>
        <div style="min-width:0"><b>${S.settings.zipStamp !== false ? '导出模组文件带日期后缀' : '导出模组文件不带日期后缀'}</b>
          <span>命名示例：<code>${esc((S.project && S.project.name ? String(S.project.name) : 'NHT_CustomDolls').replace(/[\\/:*?"<>|\s]+/g, '_'))}${S.settings.zipStamp !== false ? '-mod-20261103-1133' : ''}.zip</code></span></div>
      </div>`;
}

function refreshSettingsInPlace() {
  const mo = document.querySelector('.modal');
  if (!mo) { modalSettings(); return; }
  const body = mo.querySelector('.modal__body');
  if (body) body.innerHTML = settingsBodyHTML(S.ui.settingsTab || 'paths');
  mo.classList.add('is-focus');
  if ((S.ui.settingsTab || 'paths') === 'paths') renderSettingsPaths();
  if (!gitState.info && LOCAL_HTTP) gitLoadInfo().then(() => { if (document.querySelector('.modal')) refreshSettingsInPlace(); });
  if ((S.ui.settingsTab || 'paths') === 'git' && LOCAL_HTTP) { gitLoadRemote(); if (!gitState.status) gitRefresh(); }
}

function modalSettings() {
  saveSettings();
  const tab = S.ui.settingsTab || 'paths';
  openModal(`<div class="modalfix">
    <div class="modal__head"><span class="idx">SETTINGS</span><h3>设置</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">${settingsBodyHTML(tab)}</div>
    <div class="modal__foot">
      <button class="btn btn--danger" data-act="close-modal">放弃</button>
      <button class="btn btn--multi" data-act="set-save">保存</button>
    </div></div>`);
  const mo = document.querySelector('.modal');
  if (mo) mo.classList.add('is-focus');
  if (tab === 'paths') renderSettingsPaths();
  if (LOCAL_HTTP && !gitState.info) gitLoadInfo().then(() => refreshSettingsInPlace());
  if (tab === 'git' && LOCAL_HTTP) { gitLoadRemote().then(() => refreshSettingsInPlace()); if (!gitState.status) gitRefresh(); }
}



async function loadSelf() {
  if (!LOCAL_HTTP) return;
  try {
    const r = await fetch('/__self', { cache: 'no-store' });
    const j = await r.json();
    if (j && j.ok) {
      SELF.name = j.name || SELF.name;
      SELF.dir = j.dir || '';
      // 文件夹改过名：把保存路径里旧的模组名前缀换成新的
      if (migrateModPaths()) { try { persist(); } catch (e) { } }
    }
  } catch (e) { }
}

async function gitLoadRemote() {
  if (!LOCAL_HTTP) return null;
  try {
    const g = ensureGitSettings();
    const r = await fetch('/__gitremote?dir=' + encodeURIComponent(g.dir), { cache: 'no-store' });
    const j = await r.json();
    gitState.remote = (j && j.ok) ? j : null;
  } catch (e) { gitState.remote = null; }
  return gitState.remote;
}

async function gitChangeRemote() {
  const g = ensureGitSettings();
  const cur = (gitState.remote && gitState.remote.url) || '';
  const url = window.prompt('远程仓库地址（GitHub 改名后填新地址）', cur);
  if (url === null) return;
  const clean = url.trim();
  if (!clean) return;
  if (!/^(https?:\/\/|git@|ssh:\/\/)/.test(clean)) { toast('地址要以 https:// 或 git@ 开头', true); return; }
  const r = await fetch('/__gitsetremote?dir=' + encodeURIComponent(g.dir) + '&url=' + encodeURIComponent(clean), { method: 'POST', cache: 'no-store' });
  const j = await r.json();
  if (j && j.ok) {
    toast('远程地址已改为：' + clean);
    gitLog('远程地址', clean);
    await gitLoadRemote();
    await gitRefresh();
    refreshSettingsInPlace();
  } else {
    toast('修改失败：' + ((j && j.error) || (j && j.log) || '未知错误'), true);
  }
}

async function gitLoadInfo() {
  if (!LOCAL_HTTP) { gitState.info = { installed: false }; return; }
  try {
    const r = await fetch('/__gitinfo', { cache: 'no-store' });
    gitState.info = await r.json();
    try {
      const g = ensureGitSettings();
      const inf = gitState.info || {};
      let changed = false;
      if (!String(g.name || '').trim() && inf.userName) { g.name = inf.userName; changed = true; }
      if (!String(g.email || '').trim() && inf.userEmail) { g.email = inf.userEmail; changed = true; }
      if (changed) { saveSettings(); try { refreshSettingsInPlace(); } catch (e) { } }
    } catch (e) { }
  } catch (e) { gitState.info = { installed: false, error: e && e.message }; }
}

async function gitPickDir() {
  if (!LOCAL_HTTP) { toast('需要本地服务才能选目录', true); return; }
  toast('请在弹出的窗口里选择仓库文件夹…');
  try {
    const r = await fetch('/__pickdir', { cache: 'no-store' });
    const j = await r.json();
    if (j && j.ok && j.path) {
      ensureGitSettings().dir = j.path;
      persist();
      refreshSettingsInPlace();
      toast('已选择：' + j.path);
      gitRefresh();
    } else {
      toast('没有选择文件夹', true);
    }
  } catch (e) { toast('选择失败：' + (e && e.message), true); }
}


const CANVAS_SIG_VER = 4;
function canvasSig(c) {
  if (!c) return '';
  return hashStr(JSON.stringify({
    // 部位：位置/缩放/旋转/图层/置顶/联动置顶/部位颜色/可见/镜像/名字/编号
    // 以及命中框、偏移、装甲图标、提示图标偏移、跟随发色、自动变换、bodyType
    p: (c.parts || []).map(p => [p.img, p.id, p.name, p.bid, p.kind,
      Math.round(p.x || 0), Math.round(p.y || 0),
      +(+p.sx || 1).toFixed(3), +(+p.sy || 1).toFixed(3), Math.round(p.rot || 0),
      p.layer, p.overHair ? 1 : 0, p.linkTop ? 1 : 0, Math.round(overLevelOf(p)),
      p.desat ? 1 : 0, p.grayImg || '', p.vis === false ? 0 : 1, p.flip ? 1 : 0,
      p.state || 'ok', p.extra || 0,
      p.armor === false ? 0 : 1, p.onlyBad ? 1 : 0, p.nx || 0, p.ny || 0,
      p.hb ? [p.hb[0], p.hb[1]] : null,
      p.hbox ? [Math.round(p.hbox.dx || 0), Math.round(p.hbox.dy || 0), Math.round(p.hbox.w || 0), Math.round(p.hbox.h || 0)] : null,
      p.hbPx ? 1 : 0,
      p.autoFollow ? 1 : 0, p.followAddon || '', p.followPath || '', p.followRot || 0,
      p.bodyType || '', p.hairTint ? 1 : 0]),
    h: c.hairFit || null, en: !!c.hairFitEnabled, uo: !!c.hairFitUseWhenOff,
    fol: !!c.hairFollowOffset,
    hp: c.hairPreviewImg || '', hs: c.hairPreviewShow !== false ? 1 : 0,
    hl: Number.isFinite(c.hairPreviewLayer) ? c.hairPreviewLayer : null,
    hb: Number.isFinite(c.hairBackLayer) ? c.hairBackLayer : null,
    ht: c.hairTint || '', hts: c.hairTintShow !== false ? 1 : 0, htps: c.hairTintPartsSync !== false ? 1 : 0,
    hx: c.hairShowInXray ? 1 : 0,
    hd: c.hairDisabled ? 1 : 0,
    eo: c.exportOffset ? [Math.round(c.exportOffset.x || 0), Math.round(c.exportOffset.y || 0)] : null,
    d: c.displayBox ? [Math.round(c.displayBox.w), Math.round(c.displayBox.h), c.displayBox.pos] : null,
    meta: [c.doll || '', c.xenotype || '', c.bodytype || '', c.base || '', c.kind || '', c.rjw ? 1 : 0],
    cv: (c.colorVariants || []).map(v => [v.id, v.label, v.hediff, v.xenotype, v.genes || null,
      Object.entries(Object.assign({}, v.parts || {}, v.extraParts || {})).map(([uid, r]) => [uid, r && r.img, r && r.gray])]),
    ba: c.bodyAliases || [],
    rc: c.race ? [c.race.defName, c.race.bodyDef, c.race.nhtIndexed ? 1 : 0,
      (c.race.bodyParts || []).map(x => [x.i, x.def, x.label]),
      (c.race.remap || []).map(x => [x && x[0], x && x[1]])] : null
  }));
}

/* 默认体型画布（Male / Female / Fat / Hulk / Kid）如果和 NHT 自带坐标一致，
   就不该被导出成补丁 —— 那样等于用同一份数据覆盖原版，还会盖掉别人的改动。 */

/* 按 bodytype 造一张「原版坐标」画布，并沿用给定画布的 RJW 开关 */
function baseCanvasFor(c) {
  const bt = (D.bodytypes || []).find(b => b.doll === c.doll) || (D.bodytypes || []).find(b => b.id === c.base);
  if (!bt) return null;
  const fresh = canvasFromBodytype(bt);
  if (c && c.rjw === false) {
    fresh.rjw = false;
    fresh.parts = (fresh.parts || []).filter(p => p.source !== 'rjw');
    fresh.detached = [];
  } else if (c && c.rjw) {
    fresh.rjw = true;
  }
  return fresh;
}

let SELF = { name: 'NHT_CustomDolls', dir: '' };   // 运行时从 /__self 读实际模组文件夹名
const PRISTINE_SIG = new Map();
function canvasIsPristineDefault(c) {
  if (!c || c.kind !== 'default') return false;
  const key = (c.doll || '') + '|' + (c.rjw ? 1 : 0);
  let sig = PRISTINE_SIG.get(key);
  if (!sig) {
    try { const fresh = baseCanvasFor(c); sig = fresh ? canvasSig(fresh) : ''; } catch (e) { sig = ''; }
    if (sig) PRISTINE_SIG.set(key, sig);
  }
  return !!sig && canvasSig(c) === sig;
}

function migrateCanvasSigs() {
  try {
    (S.canvases || []).forEach(c => {
      if (!c) return;
      if (c.sigVer !== CANVAS_SIG_VER) { c.savedSig = canvasSig(c); c.sigVer = CANVAS_SIG_VER; }
      else if (!c.savedSig) c.savedSig = canvasSig(c);
    });
  } catch (e) { }
}

function canvasDirty(c) { if (!c || c.kind === 'default') return false; if (canvasIsPristineDefault(c)) return false; return !c.savedSig || c.savedSig !== canvasSig(c); }

function mxRowHTML(c) {
  const isDefault = c.kind === 'default';
  const bad = !isDefault && canvasDirty(c);
  const prim = !isDefault && canvasIsPristineDefault(c);
  const right = isDefault ? '<span class="dim" style="margin-left:auto">默认画布（锁定）</span>'
    : (bad ? '<em>已修改</em>'
      : (prim ? '<span class="dim" style="margin-left:auto">默认（NHT 坐标）</span>'
        : '<span class="dim" style="margin-left:auto">未改动</span>'));
  return `<label class="mxrow${isDefault ? ' is-locked' : ''}"><input type="checkbox" data-mx-cv="${esc(c.id)}"${isDefault ? ' disabled' : ''}>
      <span>${esc(c.title)}</span>${right}</label>`;
}

function modalMultiExport() {
  ensureCanvasGroups();
  const st = Object.assign({}, S.ui.mxOpen || {});
  S.ui.mxOpen = st;
  const ids = new Set((S.ui.cvGroups || []).map(g => g.id));
  const groups = (S.ui.cvGroups || []).map(g => ({ id: g.id, name: g.name, items: S.canvases.filter(c => c.group === g.id) }));
  const loose = S.canvases.filter(c => !c.group || !ids.has(c.group));
  if (loose.length) groups.push({ id: '', name: '未分组', items: loose });

  const body = groups.map(g => {
    const hasDirty = g.items.some(c => canvasDirty(c));
    const allDefault = g.items.length > 0 && g.items.every(c => c.kind === 'default');
    // 默认折叠；但组里有“改过没注入”的画布时自动展开；全是默认画布的组永远折叠
    const shut = allDefault ? true : (st[g.id] === undefined ? !hasDirty : !!st[g.id]);
    return `<div class="mxgrp${shut ? ' is-shut' : ''}" data-mx-g="${esc(g.id)}">
      <div class="mxgrp__h" data-act="mx-group-toggle" data-gid="${esc(g.id)}">
        <button class="mxgrp__chev">${shut ? '▸' : '▾'}</button>
        <input type="checkbox" data-mx-grp="${esc(g.id)}"${allDefault ? ' disabled' : ''}>
        <b>${esc(g.name)}</b><span class="n">${g.items.length}</span>
      </div>
      <div class="mxgrp__b">${g.items.map(mxRowHTML).join('') || '<span class="dim" style="font-size:11px">（空）</span>'}</div>
    </div>`;
  }).join('');

  openModal(`<div style="width:min(560px,92vw)">
    <div class="modal__head"><span class="idx">MULTI</span><h3>多选注入模组</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 8px">勾选要写进 <code>${esc(SELF.name)}/Patches/</code> 的画布，每个画布生成一个 <code>nht-*.xml</code>。
        默认折叠，<b>改过的画布会自动勾上</b>（带「已修改」标记）。</p>
      <div class="artsave__bar" style="margin-bottom:6px">
        <button class="btn btn--xs" data-act="mx-all">全选</button>
        <button class="btn btn--xs" data-act="mx-none">全不选</button>
        <button class="btn btn--xs" data-act="mx-dirty">只选已修改</button>
        <span class="mini-note" id="mxCount" style="margin-left:auto"></span>
      </div>
      <div id="mxList">${body}</div>
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--multi" data-act="mx-go">注入选中画布</button>
    </div></div>`);
  mxInit();
}

function mxInit() {
  const box = document.getElementById('mxList');
  if (!box) return;
  const sync = () => {
    // 组 → 子
    box.querySelectorAll('[data-mx-grp]').forEach(g => {
      const gid = g.dataset.mxGrp;
      const rows = [...box.querySelectorAll(`[data-mx-g]`)]
        .filter(d => d.dataset.mxG === gid)
        .flatMap(d => [...d.querySelectorAll('input[data-mx-cv]')]);
      const on = rows.filter(r => r.checked).length;
      g.checked = rows.length > 0 && on === rows.length;
      g.indeterminate = on > 0 && on < rows.length;
    });
    // 子 → 组已由上面处理；计数
    const n = box.querySelectorAll('input[data-mx-cv]:checked').length;
    const el = document.getElementById('mxCount');
    if (el) el.textContent = n + ' 个画布将写入';
  };
  // 默认勾选：已修改的画布
  box.querySelectorAll('input[data-mx-cv]').forEach(cb => {
    const c = S.canvases.find(x => x.id === cb.dataset.mxCv);
    if (c && c.kind !== 'default' && canvasDirty(c)) cb.checked = true;
  });
  box.addEventListener('change', ev => {
    const t2 = ev.target;
    if (t2.dataset.mxGrp !== undefined) {
      const gid = t2.dataset.mxGrp;
      box.querySelectorAll('[data-mx-g]').forEach(d => {
        if (d.dataset.mxG !== gid) return;
        d.querySelectorAll('input[data-mx-cv]').forEach(cb => { cb.checked = t2.checked; });
      });
    }
    sync();
  });
  mxSync = sync;
  sync();
}
let mxSync = null;

async function mxSelectedIds() {
  return [...document.querySelectorAll('input[data-mx-cv]:checked')].map(cb => cb.dataset.mxCv);
}

async function multiExportRun(ids) {
  if (!(await ensureSavePath('patch'))) return;
  const prev = S.active;
  let ok = 0, fail = 0;
  const missing = [];
  beginExportBadScan();       // t58-R3-1：批量导出的清空/提示都放在循环外
  for (const id of ids) {
    const c = S.canvases.find(x => x.id === id);
    if (!c) continue;
    S.active = id;
    try { await ensureGrayArt([c]); } catch (e) { }
    let xml = '';
    try { xml = buildPatchXML('one'); } catch (e) { fail++; continue; }
    const name = 'nht-' + slug(c.doll || c.title) + '.xml';
    const good = await apiSave('to=patch&name=' + encodeURIComponent(name), xml);
    if (!good) { fail++; continue; }
    try {
      const tex = await pushCustomTextures(c);
      if (tex.missing && tex.missing.length) missing.push(...tex.missing);
    } catch (e) { }
    c.savedSig = canvasSig(c); c.sigVer = CANVAS_SIG_VER; c._patchOn = true;
    ok++;
  }
  S.active = prev;
  reportBadVariantNames();    // t58-R3-1
  closeModal();
  renderAll(); persist(); pushHistory();
  toast(`已注入 ${ok} 个画布${fail ? `，失败 ${fail} 个` : ''}${missing.length ? `，缺 ${missing.length} 张贴图` : ''}`, fail > 0);
  if (missing.length) openTexFix(missing);
}

/* ---------------- 左侧面板折叠状态（记忆在项目里） ---------------- */
function applyPanelCollapse() {
  const st = (S.ui && S.ui.panels) || {};
  document.querySelectorAll('.panel__head[data-panel]').forEach(h => {
    const id = h.dataset.panel;
    const p = h.closest('.panel');
    if (!p) return;
    const shut = st[id] === true;
    p.classList.toggle('is-shut', shut);
    const ch = h.querySelector('.phead__chev');
    if (ch) ch.textContent = shut ? '▸' : '▾';
  });
}

/* ====== HAR 头发（独立分栏） ====== */
/* 非 HAR 发型种族（原版 HairDef）：上色/坐标/跟随偏移统一由模组设置控制 */
function isVanillaHairRace(c) {
  return !!(c && c.kind === 'race' && c.race && !harHairOf(c));
}
function lockVanillaHairControls(c, pane) {
  if (!pane || !isVanillaHairRace(c)) return;
  try {
    ['hairfit-toggle', 'hairfit-useoff', 'hair-follow'].forEach(act => {
      const btn = pane.querySelector('[data-act="' + act + '"]');
      if (!btn) return;
      const row = btn.closest('.swrow') || btn.closest('.field');
      if (row) row.style.display = 'none';
    });
    const sec = pane.querySelector('.sec');
    if (sec && !sec.querySelector('.vanillahairlock')) {
      const p = document.createElement('p');
      p.className = 'mini-note warnline vanillahairlock';
      p.textContent = '非 HAR 发型种族：是否上色、跟随偏移由模组设置「非 HAR 发型按发色重绘」统一控制；'
        + '下面的坐标就是游戏实际生效的 HairFitDef 值（<scale>/<offsetX>/<offsetY>），与游戏一致。';
      const rows = sec.querySelector('.swrow');
      if (rows) sec.insertBefore(p, rows); else sec.appendChild(p);

      // t16：非 HAR 面板显示/编辑「游戏实际生效」的 hairFit 三元组（导出成 <scale/offsetX/offsetY>）。
      // 以前这里绑的是 vanillaFit（导出成 <vanilla*>），而游戏默认不读那组，所以改了没反应。
      pane.querySelectorAll('.haronly').forEach(x => { x.style.display = 'none'; });
      const hf = c.hairFit || (c.hairFit = { scale: 0.78, offsetX: 0, offsetY: -0.21 });
      const box = document.createElement('div');
      box.className = 'field vfitbox';
      box.style.marginTop = '6px';
      box.innerHTML = '<label>非 HAR 坐标（游戏实际生效）</label><div class="ctl num3">'
        // t18：min/max 与 HairTuning.ValidHarValues 同口径（scale 0.05–3、偏移 ±2），
        // 否则面板能输入 0.02，导入游戏后会被校验判为非法直接丢弃。
        + '<input class="inp" type="number" step="0.001" min="0.05" max="3" data-f="c.hfs" value="' + (Number(hf.scale) || 0.78).toFixed(3) + '" title="缩放（画布单位，0.05–3，与游戏一致）">'
        + '<input class="inp" type="number" step="0.001" min="-2" max="2" data-f="c.hfx" value="' + (Number(hf.offsetX) || 0).toFixed(3) + '" title="左右偏移（画布单位，±2）">'
        + '<input class="inp" type="number" step="0.001" min="-2" max="2" data-f="c.hfy" value="' + (Number(hf.offsetY) || -0.21).toFixed(3) + '" title="上下偏移（画布单位，±2）">'
        + '</div>';
      sec.insertBefore(box, p.nextSibling);
    }
  } catch (e) { }
}

function hairTintPartsInfo(c) {
  if (!c) return '';
  const n = (c.parts || []).filter(p => p && p.hairTint && !p.raceOff).length;
  if (!n) return '当前画布没有开启「跟随发色」的部位';
  return c.hairTintPartsSync !== false
    ? `有 ${n} 个部位跟随发色：预览按发色染色`
    : `有 ${n} 个部位跟随发色：预览用原贴图`;
}

function hairFlagsHTML(c) {
  const main = c && (c.hairPreviewImg || (S.hairRef && S.hairRef.img));
  if (!main) return '<span class="hair-flags is-empty">无预览</span>';
  const hb = !!findBackHair(main);
  const ha = !!ahogeKeyOf(main);
  if (!hb && !ha) return '<span class="hair-flags is-empty">无附加层</span>';
  const bOn = c.hairBackShow !== false, aOn = c.hairAhogeShow !== false;
  return `<span class="hair-flags">${hb ? `<button type="button" class="hf hf--b${bOn ? '' : ' is-off'}" data-act="hair-back-toggle" title="显示 / 隐藏后脑层">B</button>` : ''}${ha ? `<button type="button" class="hf hf--d${aOn ? '' : ' is-off'}" data-act="hair-ahoge-toggle" title="显示 / 隐藏呆毛">D</button>` : ''}</span>`;
}

function hairSectionHTML(c) {
  return `  <div class="sec">
    <div class="sec__h"><b>发型 HAIR</b><span class="tagx">模组自绘</span></div>
    <div class="swrow">
      <button class="switch${c.hairFitEnabled ? ' is-on' : ''}" data-act="hairfit-toggle" role="switch"
        aria-checked="${c.hairFitEnabled ? 'true' : 'false'}"
        title="发型重绘：在 NHT 画完头发之后，再按这里的参数补画一遍"><i></i></button>
      <div style="min-width:0">
        <b>发型重绘<span class="qmark" title="发型重绘：在原有头发之上再补画一遍，用这里的位置/缩放/层级参数。主要是让「非 HAR 发型」（原版 HairDef，如 RatKin/Wolfein 那种没有 bodyAddon 的种族）也能显示发色；HAR 种族用它微调。注意：重画只还原贴图，会盖住该部位原有的疤痕/伤口表现。">?</span></b>
      </div>
    </div>
    <div class="field haronly" style="margin-top:6px"><label>缩放 / 偏移X / 偏移Y</label><div class="ctl num3">
      <input class="inp" type="number" data-f="c.hfs" value="${((c.hairFit && c.hairFit.scale) || 0.78).toFixed(3)}" step="0.001" min="0.1" max="3">
      <input class="inp" type="number" data-f="c.hfx" value="${((c.hairFit && c.hairFit.offsetX) || 0).toFixed(3)}" step="0.001">
      <input class="inp" type="number" data-f="c.hfy" value="${((c.hairFit && c.hairFit.offsetY) || -0.21).toFixed(3)}" step="0.001">
    </div></div>
    <div class="swrow" style="margin-top:6px">
      <button class="switch${c.hairFitUseWhenOff ? ' is-on' : ''}" data-act="hairfit-useoff" role="switch"
        aria-checked="${c.hairFitUseWhenOff ? 'true' : 'false'}"
        title="把这套缩放 / 偏移 / 层级写进补丁（NHTCD_HairFit_*）；关闭时游戏用默认值"><i></i></button>
      <div style="min-width:0">
        <b>${c.hairFitUseWhenOff ? '导出发型坐标：开' : '导出发型坐标：关'}</b>
        <span>${c.hairFitUseWhenOff ? '补丁写入 NHTCD_HairFit_*，游戏按这里的数值绘制' : '补丁不写参数，游戏用默认值 0.78 / -0.21'}</span>
      </div>
    </div>
    <div class="swrow" style="margin-top:6px">
      <button class="switch${c.hairTintShow === false ? '' : ' is-on'}" data-act="hair-tint-toggle" role="switch"
        aria-checked="${c.hairTintShow === false ? 'false' : 'true'}" title="关闭后头发按原图显示（不上色）"><i></i></button>
      <div style="min-width:0"><b>${c.hairTintShow === false ? '已隐藏发色' : '显示发色'}</b>
        <span>只影响编辑器预览</span></div>
      ${hairFlagsHTML(c)}
    </div>
    <div class="field" style="margin-top:6px"><label>发色（预览）</label><div class="ctl">
      <input class="inp" type="color" data-f="c.htint" value="${esc(c.hairTint || '#c8b48a')}"
        style="width:44px;flex:0 0 44px;padding:2px" title="仅编辑器预览：游戏里用的是小人自己的发色">
      <button class="btn btn--sm" data-act="hair-tint-reset" title="恢复默认发色">重置</button>
      <span class="mini-note" style="margin:0">按正片叠底上色，接近游戏里的效果</span>
    </div></div>
    <div class="rowline" style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <button class="btn btn--sm" data-act="hair-prev-pick">${icon('eye')}选择预览头发</button>
      <button class="btn btn--sm" data-act="hair-prev-toggle">${icon(c.hairPreviewShow === false ? 'eye' : 'eyeoff')}${c.hairPreviewShow === false ? '显示预览' : '隐藏预览'}</button>
      <button class="btn btn--sm${c.hairLocked ? ' btn--on' : ''}" data-act="hair-lock-fit">${icon(c.hairLocked ? 'lock' : 'unlock')}${c.hairLocked ? '已锁定' : '锁定头发'}</button>
      <button class="btn btn--sm${c.hairFrameHide ? ' btn--on' : ''}" data-act="hair-frame" title="隐藏画布上头发预览的角标文字与缩放手柄">${icon('grid')}${c.hairFrameHide ? '已隐藏边框' : '隐藏预览边框'}</button>
    </div>
    <div class="field" style="margin-top:6px"><label>层级</label><div class="ctl">
      <input class="inp" type="number" data-f="c.hlp" step="1" min="0" max="29"
        style="flex:0 0 66px;min-width:66px"
        value="${Number.isFinite(c.hairPreviewLayer) ? c.hairPreviewLayer : (Number.isFinite(c.hairLayer) ? c.hairLayer : 29)}"
        title="主层层级 0–29（编辑器显示 + 写入补丁）">
    </div></div>
    <p class="mini-note" style="margin:2px 0 0">主层层级 · 越大越靠上（后背层固定画在所有部位之下）</p>
    <p class="mini-note offnote">层级同时用于<b class="hl">编辑器显示</b>和<b class="hl">写入补丁</b>（主层 / 后背层各一个）。</p>
    ${c.race && c.race.hairDefCount ? `<p class="mini-note" style="color:#e3b558;margin:4px 0 0">这张画布是「原版 HairDef」头发：缩放/偏移的用法和 HAR 发型完全一样 —— 滚轮缩放、拖动移位，调完就是游戏里的效果。</p>` : ''}
    
    
  </div>

  <div class="sec">
    <div class="sec__h"><b>高级 ADVANCED</b><span class="tagx">显示 / 偏移联动</span></div>
    <div class="field" style="margin-top:2px"><label>骨骼 / 器官视图显示</label><div class="ctl">
      <span class="mini-note" style="margin:0 8px 0 0">${c.hairShowInXray ? '显示头发' : '隐藏头发'}</span>
      <button class="switch${c.hairShowInXray ? ' is-on' : ''}" data-act="hair-xray" role="switch" style="margin-left:auto"
        aria-checked="${c.hairShowInXray ? 'true' : 'false'}"
        title="骨骼 / 器官视图里是否显示头发（默认不显示）"><i></i></button>
    </div></div>
    <div class="swrow" style="margin-top:6px">
      <button class="switch${c.hairFollowOffset ? ' is-on' : ''}" data-act="hair-follow" role="switch"
        aria-checked="${c.hairFollowOffset ? 'true' : 'false'}"
        title="让发型跟着「导出偏移」一起移动：导出时自动从发型 Y 偏移里扣掉画布偏移"><i></i></button>
      <div style="min-width:0">
        <b>发型跟随偏移</b>
        <span>${hairOffsetInfo(c)}</span>
      </div>
    </div>
    <div class="swrow" style="margin-top:6px">
      <button class="switch${c.hairTintPartsSync !== false ? ' is-on' : ''}" data-act="hair-tint-parts-sync" role="switch"
        aria-checked="${c.hairTintPartsSync !== false ? 'true' : 'false'}"
        title="只影响编辑器预览：开启后，勾了「跟随发色」的部位按上方发色预览；关闭则显示原贴图"><i></i></button>
      <div style="min-width:0">
        <b>部位跟随发色预览</b>
        <span>${hairTintPartsInfo(c)}</span>
      </div>
    </div>
    ${(() => {
      const sh = hairOffsetShift(c);
      if (!c.hairFitEnabled || c.hairFollowOffset) return '';
      if (!sh.ox && !sh.oy) return '';
      const sx = (sh.ox > 0 ? '+' : '') + round(sh.ox, 1);
      const sy = (sh.oy > 0 ? '+' : '') + round(sh.oy, 1);
      return `<p class="mini-note warnline">⚠ 画布设置了导出偏移（X ${sx} / Y ${sy}），但发型的偏移不会跟着移动：导出后头发会与身体错开同样的距离。建议打开「发型跟随偏移」。</p>`;
    })()}
    <p class="mini-note">HAR 种族（如米莉拉）的头发是附加件，模组按这些参数自绘：缩放 1 = 铺满整身，偏移以身高为单位（负值向上）。</p>
  </div>`;
}


/* 只要当前就在 HAR 分栏，立刻重绘它，让开关按钮的状态跟上 */

/* HAR 面板的开关状态就地同步（不重建 DOM，避免闪烁/丢焦点） */
function syncHairSwitches() {
  try {
    const c = activeCanvas();
    if (!c) return;
    const pane = document.getElementById('paneHair');
    if (!pane) return;
    const state = {
      'hairfit-toggle': !!c.hairFitEnabled,
      'hairfit-useoff': !!c.hairFitUseWhenOff,
      'hair-tint-toggle': c.hairTintShow !== false,
      'hair-tint-parts-sync': c.hairTintPartsSync !== false,
      'hair-back': c.hairBackShow !== false,
      'hair-xray': !!c.hairShowInXray,
      'hair-follow': !!c.hairFollowOffset,
    };
    pane.querySelectorAll('.switch[data-act]').forEach(el => {
      const act = el.dataset.act;
      if (!(act in state)) return;
      el.classList.toggle('is-on', state[act]);
      el.setAttribute('aria-checked', state[act] ? 'true' : 'false');
    });
    // 锁定头发：文字 + 图标 + 高亮都要跟着变（之前只改数据，按钮看起来没反应）
    const lockBtn = pane.querySelector('[data-act="hair-lock-fit"]');
    if (lockBtn) {
      const on = !!c.hairLocked;
      lockBtn.classList.toggle('btn--on', on);
      lockBtn.innerHTML = icon(on ? 'lock' : 'unlock') + (on ? '已锁定' : '未锁定');
      lockBtn.title = on ? '头发已锁定，点击解锁' : '锁定头发：对齐好后防止被拖动';
    }
  } catch (e) { }
}

function refreshHairPaneIfActive() {
  try { if (S.tab === 'hair') renderHairPane(); } catch (e) { }
}

function variantState(c) {
  if (!Array.isArray(c.colorVariants)) c.colorVariants = [];
  if (!S.ui.variantSel) S.ui.variantSel = {};
  const has = Object.prototype.hasOwnProperty.call(S.ui.variantSel, c.id);
  let id = has ? S.ui.variantSel[c.id]
    : (Array.isArray(c.geneGroups) && c.geneGroups.length
      ? (((pickGeneVariant(c) || {}).id) || null)
      : (c.colorVariants[0] ? c.colorVariants[0].id : null));
  if (id && !c.colorVariants.some(v => v.id === id)) id = c.colorVariants[0] ? c.colorVariants[0].id : null;
  S.ui.variantSel[c.id] = id;
  return c.colorVariants.find(v => v.id === id) || null;
}

function sameGeneSet(a, b) {
  const A = (a || []).filter(Boolean).slice().sort().join('|');
  const B = (b || []).filter(Boolean).slice().sort().join('|');
  return A === B;
}

function geneCellVariant(c, genes) {
  const want = (genes || []).filter(Boolean);
  if (!want.length) return null;
  return ((c && c.colorVariants) || []).find(v => v && v.gen && sameGeneSet(v.genes, want)) || null;
}

/* 基因组合：第一个是皮肤组（默认/Chemskin），第二个是发光组（无/蓝/紫/罗兰） */
function geneMatrixData(c) {
  const groups = (c && Array.isArray(c.geneGroups)) ? c.geneGroups : [];
  if (groups.length < 2) return null;
  const skin = groups.find(g => /skin|chemskin/i.test((g.genes || []).join(' '))) || groups[0];
  const glow = groups.find(g => g !== skin && /glow/i.test((g.genes || []).join(' '))) || groups.find(g => g !== skin);
  if (!skin || !glow) return null;
  const rows = [{ gene: '', label: '默认' }].concat((skin.genes || []).map(g => ({ gene: g, label: geneShortName(g) })));
  const cols = [{ gene: '', label: '无' }].concat((glow.genes || []).map(g => ({ gene: g, label: geneShortName(g) })));
  return { skin, glow, rows, cols };
}

function presetGenes(v) {
  const out = Array.isArray(v && v.xenoGenes) ? v.xenoGenes.filter(Boolean).slice() : [];
  if (!out.length) {
    const lb = String((v && v.label) || '');
    if (/chemskin/i.test(lb)) out.push('Moyo2_Skin_Chemskin');
    if (/chemskin|depthborn|glow/i.test(lb)) out.push('Moyo2_Glow_Blue');
  }
  return out;
}

function geneDotColor(gene) {
  const g = String(gene || '');
  if (/blue/i.test(g)) return '#57b6ff';
  if (/violet/i.test(g)) return '#c47bff';
  if (/purple/i.test(g)) return '#a06cff';
  if (/skin|chemskin/i.test(g)) return '#9fe0b6';
  return '#8b949a';
}

function glowTint(gene) {
  const g = String(gene || '');
  if (/blue/i.test(g)) return '#57b6ff';
  if (/purple/i.test(g)) return '#a06cff';
  if (/violet/i.test(g)) return '#c47bff';
  return '';
}

function renderGeneMatrix(c, cur, m) {
  const overN = v => v ? variantOverCount(v) : 0;
  const cell = (r, col) => {
    const genes = [r.gene, col.gene].filter(Boolean);
    const v = genes.length ? geneCellVariant(c, genes) : null;
    const isBase = !genes.length;
    const on = isBase ? !cur : !!(cur && cur.gen && sameGeneSet(cur.genes, genes));
    const dis = !isBase && !v;
    const dot = isBase ? '#5d6569' : geneDotColor(col.gene || r.gene);
    const title = isBase ? '基础贴图' : (genes.map(g => geneShortName(g)).join(' + ') + (v ? ' · 覆盖 ' + overN(v) + ' 处' : ' · 未生成'));
    return `<button class="gmx__c${on ? ' is-on' : ''}${dis ? ' is-off' : ''}" data-act="gene-cell" data-skin="${esc(r.gene)}" data-glow="${esc(col.gene)}"${dis ? ' disabled' : ''} title="${esc(title)}"><i class="gmx__dot" style="--c:${dot}"></i></button>`;
  };
  const head = `<div class="gmx__h"><b></b>${m.cols.map(col => `<b>${esc(col.label)}</b>`).join('')}</div>`;
  const rows = m.rows.map(r => `<div class="gmx__r"><b>${esc(r.label)}</b>${m.cols.map(col => cell(r, col)).join('')}</div>`).join('');
  return `<div class="gmx" style="--gcols:${m.cols.length}">${head}${rows}</div>`;
}

function renderVariantPane() {
  const pane = document.getElementById('paneVariant');
  if (!pane) return;
  const c = activeCanvas();
  if (!c) { pane.innerHTML = '<p class="mini-note" style="padding:14px">先在左边选一张画布。</p>'; return; }
  try { migrateGlowVariantPathsSync(c); } catch (e) { }
  applyRaceBodyPartValidity(c);
  const vs = Array.isArray(c.colorVariants) ? c.colorVariants : [];
  const cur = variantState(c);
  const m = geneMatrixData(c);
  const genCount = vs.filter(v => v && v.gen).length;
  const head = `<div class="selhead"><div class="selhead__badge">${icon('tag')}</div>
    <div class="selhead__t"><b>${esc(c.title)}</b><span>异种 · ${genCount ? '基因 ' + genCount : ''}${genCount && (vs.length - genCount) ? ' / ' : ''}${(vs.length - genCount) ? '其他 ' + (vs.length - genCount) : (genCount ? '' : vs.length + ' 个')}</span></div></div>`;
  const actions = `<div class="rowline" style="margin:6px 0 5px;gap:5px;flex-wrap:wrap">
      <button class="btn btn--sm btn--primary" data-act="variant-import">${icon('plus')}导入异种（自动全部生成）</button>
    </div>`;

  const overCount = cur ? variantOverCount(cur) : 0;
  const matrixHtml = m ? `<div class="sec">
    <div class="sec__h"><b>外观状态 GENE LOOK</b><span class="tagx">${m.rows.length} × ${m.cols.length}</span></div>
    ${renderGeneMatrix(c, cur, m)}
    <p class="mini-note" style="margin:6px 0 0">当前：<b style="color:#e8d4bf">${esc(cur ? cur.label : '基础贴图')}</b>${cur && overCount ? ` · 覆盖 ${overCount} 处` : ''}
      ${cur ? `<button class="linkbtn" data-act="variant-base" style="margin-left:6px">清除</button>` : ''}</p>
    ${(() => {
      const presets = vs.filter(v => !v.gen && v.xenotype && !Object.keys(v.parts || {}).length);
      return presets.length ? `<div class="gpresets"><span>异种预设</span>${presets.map(v => `<button class="gpreset" data-act="gene-preset" data-id="${esc(v.id)}" title="套用这个异种的基因状态">${esc(v.label || v.xenotype)}</button>`).join('')}</div>` : '';
    })()}
    <p class="mini-note">游戏里按小人的基因自动匹配；这里只切换编辑器预览。</p>
  </div>` : '';

  const hasMatrix = !!m;
  const others = vs.filter(v => (!hasMatrix || !v.gen) && (v.hediff || variantOverCount(v) || !hasMatrix));
  const otherRows = others.map(v => {
    const n = variantOverCount(v);
    const trigger = v.gen ? ('基因 · ' + (v.genes || []).map(g => geneShortName(g)).join(' + '))
      : (v.hediff ? ('Hediff · ' + v.hediff) : (v.xenotype ? ('异种 · ' + v.xenotype) : '手动'));
    return `<button class="varpickrow${cur && cur.id === v.id ? ' is-on' : ''}" data-act="variant-select" data-id="${esc(v.id)}">
      <i></i><b>${esc(v.label || v.id)}</b><span>${esc(trigger)}${n ? ' · ' + n + ' 处覆盖' : ''}</span></button>`;
  }).join('');
  const otherHtml = (others.length || !hasMatrix) ? `<div class="sec">
    <div class="sec__h"><b>其他异种</b><span class="tagx">${others.length}</span></div>
    <div class="varpicklist">
      ${!hasMatrix ? `<button class="varpickrow${!cur ? ' is-on' : ''}" data-act="variant-base"><i></i><b>基础贴图</b><span>所有未覆盖部位使用基础</span></button>` : ''}
      ${otherRows}
    </div>
    ${others.length || hasMatrix ? '' : '<p class="mini-note" style="margin:6px 0 0">还没有异种。点上面的「导入异种」读取 XenotypeDef / Hediff 异种；种族画布还可以生成基因外观。</p>'}
  </div>` : '';

  const extraPartList = cur ? variantExtraParts(cur) : [];
  const overParts = cur
    ? (c.parts || []).filter(p => p.img && variantPartRec(cur, p.uid)).concat(extraPartList)
    : [];
  const allParts = (c.parts || []).filter(p => p.img).concat(extraPartList);
  const onlyOver = S.ui.variantScope !== 'all';
  const scopeBar = cur ? `<div class="rowline" style="margin:2px 0 6px;gap:4px">
      <button class="btn btn--xs${onlyOver ? ' btn--on' : ''}" data-act="variant-scope" data-v="over">只看覆盖 ${overParts.length}</button>
      <button class="btn btn--xs${!onlyOver ? ' btn--on' : ''}" data-act="variant-scope" data-v="all">全部 ${allParts.length}</button>
    </div>` : '';
  const partItems = cur ? (onlyOver ? overParts : allParts) : [];
  if (!S.ui.variantPartOpen) S.ui.variantPartOpen = {};
  const partRow = (p) => {
    // t52：异种专属部位没有基础部位，记录在 cur.extraParts[uid]，其它逻辑与覆盖一致
    const isExtra = p.source === 'variant-extra' || variantIsExtraUid(cur, p.uid);
    const rec = isExtra ? variantExtraRec(cur, p.uid) : variantPartRec(cur, p.uid);
    const over = rec && rec.img ? rec.img : '';
    const src = over || p.img;
    const tuned = !(rec && rec.auto) && !!(rec && (Number.isFinite(rec.x) || Number.isFinite(rec.y) || Number.isFinite(rec.sx) || Number.isFinite(rec.sy)));
    const isTail = /tail|尾/i.test(String(p.nameEn || '') + ' ' + String(p.name || '') + ' ' + String(p.id || ''));
    const tag = isExtra ? '异种专属' : (over ? ('覆盖' + (tuned ? ' · 已调坐标' : '')) : '继承基础贴图');
    return `<div class="varrow${p.raceOff ? ' is-raceoff' : ''}">
      <span class="varrow__img" style="background-image:url('${imgURL(src)}')"></span>
      <span class="varrow__t"><b>${esc(partDisplayName(p) || p.name || p.id)}</b><i>${p.raceOff ? '<span class="race-off-pill">种族无此部位</span>' : tag}${isTail && over ? ' · 左右自动' : ''}</i></span>
      ${over ? `<button class="btn btn--xs" data-act="variant-geom" data-uid="${esc(p.uid)}">调整</button>` : ''}
      <button class="btn btn--xs" data-act="variant-pick" data-uid="${esc(p.uid)}">${over ? '更换' : '选择'}</button>
      ${over && isExtra ? `<button class="iconbtn" data-act="variant-extra-del" data-uid="${esc(p.uid)}" title="删除这个异种专属部位（不影响基础画布）">${icon('x')}</button>`
        : (over ? `<button class="iconbtn" data-act="variant-clear" data-uid="${esc(p.uid)}" title="恢复基础贴图">${icon('x')}</button>` : '')}
    </div>`;
  };
  const pgMap = new Map();
  partItems.forEach(p => {
    const g = groupOf(p);
    if (!pgMap.has(g)) pgMap.set(g, []);
    pgMap.get(g).push(p);
  });
  const pgOrder = KGROUPS.map(g => g.k).filter(k => pgMap.has(k));
  pgMap.forEach((_, k) => { if (pgOrder.indexOf(k) < 0) pgOrder.push(k); });
  const partListHtml = pgOrder.map(k => {
    const items = pgMap.get(k) || [];
    const label = (KGROUPS.find(g => g.k === k) || {}).label || k;
    const open = S.ui.variantPartOpen[k] !== false;
    return `<div class="vpcvgroup">
      <button class="vpcvgroup__h" data-act="variant-part-group" data-g="${esc(k)}">
        <span>${open ? '▾' : '▸'}</span><b>${esc(label)}</b><i>${items.length}</i>
      </button>
      ${open ? `<div class="varlist">${items.map(partRow).join('')}</div>` : ''}
    </div>`;
  }).join('');

  let detail = '';
  if (cur) {
    if (cur.gen) {
      detail = `<div class="sec">
        <div class="sec__h sec__h--plain"><b style="flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cur.label || '基因异种')}</b><button class="btn btn--xs btn--danger" style="margin-left:auto;flex:0 0 auto" data-act="variant-del" data-id="${esc(cur.id)}" title="删除当前基因异种">${icon('trash')}删除</button></div>
        <p class="mini-note" style="margin:2px 0">基因：${(cur.genes || []).map(g => `<b>${esc(geneShortName(g))}</b>`).join(' + ')} · 优先级 ${Number(cur.priority) || 0}</p>
        <p class="mini-note">由「生成基因外观」生成；重新生成会替换。下面的部位覆盖可以单独调整。</p>
      </div>`;
    } else {
      detail = `<details class="fold">
        <summary>条件与名称 · <b>${esc(cur.label || '异种')}</b></summary>
        <div class="fold__body">
          <div class="field"><label>名称</label><div class="ctl"><input class="inp" data-f="vf.label" value="${esc(cur.label || '')}" spellcheck="false"></div></div>
          <div class="field"><label>Hediff</label><div class="ctl"><input class="inp" data-f="vf.hediff" value="${esc(cur.hediff || '')}" placeholder="Mincho_BluePolarBear_Hediff" spellcheck="false"></div></div>
          ${cur.xenotype ? `<div class="field"><label>异种</label><div class="ctl"><input class="inp" data-f="vf.xenotype" value="${esc(cur.xenotype)}" spellcheck="false"></div></div>` : ''}
          <div class="field"><label>基因（逗号分隔）</label><div class="ctl"><input class="inp" data-f="vf.genes" value="${esc((cur.genes || []).join(', '))}" placeholder="Moyo2_Glow_Blue, Moyo2_Skin_Chemskin" spellcheck="false"></div></div>
          <div class="field"><label>优先级</label><div class="ctl"><input class="inp" type="number" data-f="vf.priority" value="${Number(cur.priority) || 0}" step="1" title="多条异种同时命中时，数字大的先生效"></div></div>
          <p class="mini-note">${cur.xenotype ? '异种异种：按异种区分同一体型的贴图。' : '当前小人带有这个 Hediff 时，选中的部位改用覆盖贴图。'}</p>
          <button class="btn btn--xs btn--danger" data-act="variant-del" data-id="${esc(cur.id)}" style="margin-top:4px">${icon('trash')}删除这个异种</button>
        </div>
      </details>`;
    }
  }

  const partSec = `<div class="sec">
    <div class="sec__h"><b>部位覆盖</b>
      ${cur ? `<button class="linkbtn" data-act="variant-add-part" title="只给当前异种新增一个部位；不会改动基础画布">+ 添加部位</button>` : ''}
      <span class="tagx">${cur ? (onlyOver ? overParts.length : allParts.length) : 0}</span></div>
    ${scopeBar}
    ${cur ? (partListHtml || '<p class="mini-note">当前异种还没有部位覆盖；点「全部」选择要覆盖的部位，或点「+ 添加部位」新增一个只属于这个异种的部位。</p>')
      : '<p class="mini-note">当前是基础贴图，没有异种覆盖。点上面的基因格或异种再编辑部位。</p>'}
  </div>`;

  pane.innerHTML = head + actions + matrixHtml + otherHtml + detail + partSec;
}

/* XML 里直接子节点的文字（避免把子 Def 的 defName 认成父级的） */
function directChildText(el, tag) {
  if (!el) return '';
  const n = el.querySelector(':scope > ' + tag);
  return n ? String(n.textContent || '').trim() : '';
}

/* 从一批文件里收集异种来源：HAR <body> 里的 Hediff 引用 + Biotech 的 XenotypeDef */
async function collectVariantSources(files) {
  const xmls = (files || []).filter(f => /\.xml$/i.test(f.name || ''));
  const labels = new Map();     // HediffDef defName -> label
  const refs = [];              // <body><Hediff For="..."> 引用 + 外观 HediffDef
  const xenos = new Map();      // XenotypeDef defName -> label
  const appearances = new Map();// 纯外观 HediffDef：defName -> { label, group, priority }
  for (const f of xmls) {
    let text = '';
    try { text = await f.text(); } catch (e) { continue; }
    if (!/Hediff|Xenotype|BodyType/i.test(text)) continue;
    let doc;
    try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) { continue; }
    if (!doc || doc.querySelector('parsererror')) continue;
    const hdList = Array.from(doc.querySelectorAll('HediffDef'));
    const hdByKey = new Map();
    const ownInfo = (hd) => {
      const defName = directChildText(hd, 'defName');
      const name = String(hd.getAttribute('Name') || '').trim();
      const parent = String(hd.getAttribute('ParentName') || '').trim();
      const stageLis = Array.from(hd.querySelectorAll(':scope > stages > li'));
      const hidden = stageLis.some(li => String(directChildText(li, 'becomeVisible')).toLowerCase() === 'false');
      const notCurable = String(directChildText(hd, 'everCurableByItem')).toLowerCase() === 'false';
      const notDup = String(directChildText(hd, 'duplicationAllowed')).toLowerCase() === 'false';
      return { defName, name, parent, hidden, notCurable, notDup, label: directChildText(hd, 'label') };
    };
    hdList.forEach(hd => {
      const info = ownInfo(hd);
      if (info.defName) hdByKey.set(info.defName, info);
      if (info.name) hdByKey.set(info.name, info);
      if (info.defName && !labels.has(info.defName)) labels.set(info.defName, info.label);
    });
    hdList.forEach(hd => {
      const info = ownInfo(hd);
      let eff = info;
      let guard = 0;
      // 外观开关常常定义在 Abstract 父级（Axolotl_LotlQiChangeStyleHediffBase），子级只写 defName；
      // 所以沿 ParentName 继承父级的 becomeVisible/everCurableByItem/duplicationAllowed。
      while (eff && eff.parent && hdByKey.has(eff.parent) && guard++ < 8) {
        const par = hdByKey.get(eff.parent);
        eff = {
          defName: eff.defName, name: eff.name, label: eff.label,
          parent: par.parent || eff.parent,
          hidden: eff.hidden || par.hidden,
          notCurable: eff.notCurable || par.notCurable,
          notDup: eff.notDup || par.notDup,
        };
      }
      const dn = info.defName;
      if (!dn || !(eff.hidden && eff.notCurable && eff.notDup)) return;
      let commentLabel = '';
      try {
        let sib = hd.previousSibling;
        while (sib) {
          if (sib.nodeType === 8) {
            const m = /\/\/\/\s*([^\n\r<]+)/.exec(String(sib.nodeValue || ''));
            if (m) { commentLabel = m[1].trim(); break; }
          }
          if (sib.nodeType === 1) break;
          sib = sib.previousSibling;
        }
      } catch (e) { }
      const suffix = dn.split('_').filter(Boolean).pop() || dn;
      const label = info.label || commentLabel || upperFirst(suffix.replace(/([a-z])([A-Z])/g, '$1 $2'));
      const group = info.parent || eff.parent || 'appearance';
      if (!appearances.has(dn)) appearances.set(dn, { label, group, priority: 1000 + appearances.size });
      if (refs.indexOf(dn) < 0) refs.push(dn);
    });
    Array.from(doc.querySelectorAll('XenotypeDef')).forEach(xd => {
      const dn = directChildText(xd, 'defName');
      if (!dn || xenos.has(dn)) return;
      const genes = Array.from(xd.querySelectorAll(':scope > genes > li'))
        .map(li => String(li.textContent || '').trim()).filter(Boolean);
      xenos.set(dn, {
        label: directChildText(xd, 'label') || directChildText(xd, 'labelShort') || dn,
        genes,
      });
    });
    Array.from(doc.querySelectorAll('body')).forEach(body => {
      Array.from(body.querySelectorAll('Hediff[For]')).forEach(hd => {
        const dn = String(hd.getAttribute('For') || '').trim();
        if (dn && refs.indexOf(dn) < 0) refs.push(dn);
      });
    });
  }
  return { refs, labels, xenos, appearances };
}

/* 外观 Hediff 自动猜图：只在该异种名称/defName 后缀唯一匹配到一张模组贴图时自动挂到身体部位，
   不唯一就留空，交给用户手动调整。 */
async function autoGuessAppearanceTextures(c, files, variants) {
  if (!c || !LOCAL_HTTP) return 0;
  const list = (variants || []).filter(v => v && v.appearance);
  if (!list.length) return 0;
  const raceDir = variantTextureFolder(c);
  const imgs = [];
  (files || []).forEach(f => {
    const fp = String((f && (f.webkitRelativePath || f.__relPath || f.name)) || '').replace(/\\/g, '/');
    if (!/Textures\/.*\.(png|webp)$/i.test(fp)) return;
    imgs.push({ file: f, path: fp, name: String(f.name || fp.split('/').pop() || '') });
  });
  if (!imgs.length) return 0;
  const bodyPart = (c.parts || []).find(p => p && !p.glowLayer && !p.raceOff && /body|torso|躯干|身体/i.test(String(p.name || '') + ' ' + String(p.nameEn || '') + ' ' + String(p.id || '')))
    || (c.parts || []).find(p => p && !p.glowLayer && !p.raceOff && p.kind === 'body');
  if (!bodyPart) return 0;
  let n = 0;
  for (const v of list) {
    const suffix = String(v.hediff || '').split('_').filter(Boolean).pop() || '';
    const keys = [suffix, v.label].map(x => String(x || '').toLowerCase()).filter(Boolean);
    const cands = imgs.filter(im => keys.some(k => k && (im.path.toLowerCase().includes(k) || im.name.toLowerCase().includes(k))));
    if (cands.length !== 1) continue;
    const im = cands[0];
    const fname = String(im.name || 'texture').replace(/[^\w\u4e00-\u9fa5.-]+/g, '_').replace(/\.(png|webp)$/i, '');
    const key = 'Custom/' + raceDir + '/' + variantNameFolder(v) + '/' + fname;
    let data = '';
    try { data = await fileToDataURL(im.file); } catch (e) { continue; }
    if (!data) continue;
    try {
      const ok = await apiSave('to=texture&key=' + encodeURIComponent(key), data);
      if (!ok) continue;
      let w = 64, h = 64;
      try {
        await new Promise(res => { const image = new Image(); image.onload = () => { w = image.naturalWidth || 64; h = image.naturalHeight || 64; res(); }; image.onerror = res; image.src = data; });
      } catch (e) { }
      EXT.set(key, { url: data, w, h });
      if (DISK_TEX_KEYS) DISK_TEX_KEYS.add(key);
      if (!S.customAssets) S.customAssets = [];
      if (!S.customAssets.some(a => a && a.p === key)) {
        S.customAssets.push({ p: key, n: fname, w, h, cat: customCatFor(c), data });
      }
      v.parts = v.parts || {};
      v.parts[bodyPart.uid] = { img: key, auto: true, note: '自动猜图' };
      n++;
    } catch (e) { }
  }
  return n;
}

async function importVariantFolder(files, opts) {
  const c = activeCanvas();
  if (!c) { toast('先选一张画布再导入异种', true); return 0; }
  const src = await collectVariantSources(files);
  const uniq = [...new Set(src.refs)];
  const xenos = [...src.xenos.entries()];
  if (!uniq.length && !xenos.length) {
    toast(opts && opts.xml
      ? '没有识别到异种：选中的 XML 里没有 XenotypeDef，也没有 body 的 Hediff 引用'
      : '没有识别到异种：这个模组里没有 XenotypeDef 或 body 的 Hediff 引用', true);
    return 0;
  }
  if (!Array.isArray(c.colorVariants)) c.colorVariants = [];
  const haveHediff = new Set(c.colorVariants.map(v => v && v.hediff).filter(Boolean));
  const haveXeno = new Set(c.colorVariants.map(v => v && v.xenotype).filter(Boolean));
  const stamp = Date.now().toString(36);
  const added = [];
  const push = (rec) => {
    rec.id = 'v' + stamp + added.length;
    rec.parts = {};
    added.push(rec);
  };
  const appearances = src.appearances || new Map();
  uniq.forEach(h => {
    if (!h || haveHediff.has(h)) return;
    const info = appearances.get(h) || null;
    let label = (info && info.label) || src.labels.get(h) || h.replace(/_Hediff$/i, '').replace(/_/g, ' ');
    label = upperFirst(String(label).replace(/^mincho\s*/i, '').replace(/\s*Hediff\s*$/i, '').trim() || h);
    push({
      label, hediff: h, xenotype: '',
      group: (info && info.group) || '',
      priority: info ? (Number(info.priority) || 0) : 0,
      appearance: !!info,
    });
    haveHediff.add(h);
  });
  xenos.forEach(([dn, info]) => {
    if (!dn || haveXeno.has(dn)) return;
    const lb = (info && info.label) || String(info || '');
    const xg = (info && Array.isArray(info.genes)) ? info.genes.slice() : [];
    const label = upperFirst(String(lb || dn).trim() || dn);
    push({ label, hediff: '', xenotype: dn, xenoGenes: xg });
    haveXeno.add(dn);
  });
  added.forEach(v => c.colorVariants.push(v));
  if (!S.ui.variantSel) S.ui.variantSel = {};
  if (added.length) S.ui.variantSel[c.id] = added[0].id;
  // 外观 Hediff 自动猜图；不唯一就留空，之后手动调整
  let autoTex = 0;
  try { autoTex = await autoGuessAppearanceTextures(c, files, added); } catch (e) { }
  // 同一轮里自动生成基因外观（会覆盖旧的 v.gen 基因异种）
  let geneCount = 0;
  try {
    await buildGeneLooks(files, { autoParts: true });
    geneCount = (c.colorVariants || []).filter(v => v && v.gen).length;
  } catch (e) { }
  if (added.length) {
    const gen = (c.colorVariants || []).find(v => v && v.gen);
    if (gen && !(c.colorVariants || []).some(v => v.id === S.ui.variantSel[c.id])) S.ui.variantSel[c.id] = added[0].id;
  }
  renderAll();
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
  const bits = [];
  if (added.length) bits.push(`${added.length} 个外观/Xenotype 异种`);
  if (geneCount) bits.push(`${geneCount} 个基因异种`);
  if (autoTex) bits.push(`${autoTex} 个自动贴图`);
  toast('已自动导入：' + (bits.join('，') || '没有新增内容'));
  return added.length + geneCount;
}

function modalVariantImport() {
  openModal(`<div style="width:min(560px,92vw)">
    <div class="modal__head"><span class="idx">VARIANT</span><h3>导入异种</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 10px">选一种来源。会自动识别 <b>XenotypeDef</b>、HAR <b>&lt;body&gt;</b> 里的 <b>Hediff</b> 引用，以及隐藏的<b>外观 Hediff</b>（例如 Axolotl 的 5 种形态）；不需要手动配置 Gene/Hediff。</p>
      <div class="cards" style="grid-template-columns:1fr">
        <button class="card" data-act="variant-import-mod">
          <span class="ico">${icon('folder')}</span><b>导入模组（全部自动）</b>
          <p>扫描外观 Hediff / Xenotype / HAR Hediff，自动生成基因外观并覆盖旧基因异种；外观贴图会自动猜图，猜不准再手动调整。</p>
        </button>
      </div>
    </div>
    <div class="modal__foot"><button class="btn" data-act="close-modal">取消</button></div></div>`);
}

/* ==========================================================================
   基因外观 / HAR bodyAddons → 烘焙组合贴图 + 带基因条件的异种
   ========================================================================== */
function geneShortName(defName, labels) {
  const raw = String(defName || '');
  const lb = labels && labels.get ? (labels.get(raw) || '') : '';
  if (lb) {
    let s = lb.replace(/\bmoyo\b/gi, '').replace(/\bbioluminescence\b/gi, '')
      .replace(/\bskin pattern\b/gi, '').replace(/\bpattern\b/gi, '').trim();
    if (s) return upperFirst(s);
  }
  const tail = raw.split('_').filter(Boolean).pop() || raw;
  return upperFirst(tail.replace(/([a-z])([A-Z])/g, '$1 $2'));
}

function geneGroupLabel(genes, labels) {
  const txt = (genes || []).join(' ');
  if (/glow/i.test(txt)) return '发光';
  if (/skin|chemskin/i.test(txt)) return '皮肤';
  return '基因';
}

function geneStateActive(c) {
  const set = new Set();
  Object.keys((c && c.geneState) || {}).forEach(k => { const v = c.geneState[k]; if (v) set.add(v); });
  return set;
}

function pickGeneVariant(c) {
  const active = geneStateActive(c);
  let best = null, bestP = -1;
  ((c && c.colorVariants) || []).forEach(v => {
    if (!v || !v.gen || !Array.isArray(v.genes) || !v.genes.length) return;
    if (!v.genes.every(g => active.has(g))) return;
    const p = Number(v.priority) || 0;
    if (p > bestP) { bestP = p; best = v; }
  });
  return best;
}

function applyGeneState(c) {
  if (!c) return null;
  const v = pickGeneVariant(c);
  if (!S.ui.variantSel) S.ui.variantSel = {};
  S.ui.variantSel[c.id] = v ? v.id : null;
  try { renderVariantPane(); renderStage(); } catch (e) { }
  return v;
}

document.addEventListener('change', e => {
  const el = e.target && e.target.closest ? e.target.closest('[data-act="gene-set"]') : null;
  if (!el) return;
  const c = activeCanvas();
  if (!c) return;
  if (!c.geneState) c.geneState = {};
  c.geneState[el.dataset.g] = el.value || '';
  applyGeneState(c);
  persist();
});

function levDist(a, b) {
  const s = String(a || ''), t = String(b || '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  let prev = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;
  for (let i = 1; i <= s.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[t.length];
}

/* "Moyo/Head/MoyoAtenna_Left" -> 模组 Texture 索引里的 Moyo/Head/MoyoAtenna_Left_south */
function resolveAddonTexture(path, texFiles, dir) {
  const base = String(path || '').replace(/\.png$/i, '');
  if (!base) return '';
  const tries = dir ? [dir, 'south', ''] : ['south', ''];
  for (const d of tries) {
    const k = d ? base + '_' + d : base;
    if (texFiles.has(k)) return k;
  }
  const want = norm(base.split('/').pop());
  if (!want) return '';
  let best = '', bestScore = 0;
  texFiles.forEach((f, k) => {
    const bn = norm(String(k).split('/').pop().replace(/_(south|north|east|west)$/i, ''));
    if (!bn) return;
    let score;
    if (bn === want) score = 1;
    else if (bn.indexOf(want) >= 0 || want.indexOf(bn) >= 0) score = 0.88;
    else score = 1 - levDist(bn, want) / Math.max(bn.length, want.length);
    if (score > bestScore) { bestScore = score; best = k; }
  });
  return bestScore >= 0.55 ? best : '';
}

async function ensureExtTexture(key, file) {
  if (!key || !file) return '';
  if (!EXT.has(key)) {
    const url = URL.createObjectURL(file);
    const dim = await new Promise(r => {
      const im = new Image();
      im.onload = () => r([im.naturalWidth, im.naturalHeight]);
      im.onerror = () => r([64, 64]);
      im.src = url;
    });
    EXT.set(key, { url, w: dim[0], h: dim[1] });
  }
  return key;
}

function addonGlow(a) {
  return /glow/i.test(String((a && a.shaderType) || '')) || /glow/i.test(String((a && a.name) || ''));
}

async function bakeAddonLayers(layerDefs) {
  const imgs = [];
  let w = 0, h = 0;
  for (const L of layerDefs) {
    const im = await loadTextureEl(L.key);
    if (!im || !im.naturalWidth) continue;
    let src = im;
    if (L.tint) {
      try {
        const t = document.createElement('canvas');
        t.width = im.naturalWidth; t.height = im.naturalHeight;
        const tg = t.getContext('2d');
        tg.drawImage(im, 0, 0);
        tg.globalCompositeOperation = 'source-in';
        tg.fillStyle = L.tint;
        tg.fillRect(0, 0, t.width, t.height);
        src = t;
      } catch (e) { src = im; }
    }
    imgs.push({ im: src, glow: !!L.glow });
    w = Math.max(w, im.naturalWidth);
    h = Math.max(h, im.naturalHeight);
  }
  if (!imgs.length) return null;
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const g = cvs.getContext('2d');
  imgs.forEach(({ im, glow }) => {
    g.globalCompositeOperation = glow ? 'lighter' : 'source-over';
    g.globalAlpha = 1;
    g.drawImage(im, 0, 0);
    if (glow) {
      // 轻微泛光，让烘焙图看起来“亮”，NHT 不跑 MoteGlow 着色器
      try {
        g.globalAlpha = 0.45;
        g.filter = 'blur(2px)';
        g.drawImage(im, 0, 0);
        g.filter = 'none';
      } catch (e) { }
    }
  });
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  // 裁到可见区域：NHT 的判定框是居中的，留着 512×512 透明边会让判定框盖住整个头
  let ax0 = w, ay0 = h, ax1 = -1, ay1 = -1;
  try {
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (d[(row + x) * 4 + 3] > 8) {
          if (x < ax0) ax0 = x; if (x > ax1) ax1 = x;
          if (y < ay0) ay0 = y; if (y > ay1) ay1 = y;
        }
      }
    }
  } catch (e) { }
  if (ax1 < ax0 || ay1 < ay0) return { data: cvs.toDataURL('image/png'), w, h, artW: w, artH: h };
  const pad = 2;
  const x0 = Math.max(0, ax0 - pad), y0 = Math.max(0, ay0 - pad);
  const x1 = Math.min(w - 1, ax1 + pad), y1 = Math.min(h - 1, ay1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  if (cw === w && ch === h) return { data: cvs.toDataURL('image/png'), w, h, artW: ax1 - ax0 + 1, artH: ay1 - ay0 + 1 };
  const c2 = document.createElement('canvas');
  c2.width = cw; c2.height = ch;
  c2.getContext('2d').drawImage(cvs, x0, y0, cw, ch, 0, 0, cw, ch);
  return { data: c2.toDataURL('image/png'), w: cw, h: ch, artW: ax1 - ax0 + 1, artH: ay1 - ay0 + 1 };
}

async function saveBakedTexture(key, data, w, h) {
  let ok = false;
  try { ok = await apiSave('to=texture&key=' + encodeURIComponent(key), data); } catch (e) { }
  EXT.set(key, { url: data, w: w || 64, h: h || 64 });
  if (ok) {
    try { TEX_ON_DISK.add(key); } catch (e) { }
    try { if (DISK_TEX_KEYS) DISK_TEX_KEYS.add(key); } catch (e) { }
  }
  return ok;
}

/* 第二层发光用的全透明底图 */
async function ensureEmptyTexture() {
  const key = 'Custom/NHTCD/Empty';
  if (!EXT.has(key)) {
    const cvs = document.createElement('canvas');
    cvs.width = 1; cvs.height = 1;
    const data = cvs.toDataURL('image/png');
    await saveBakedTexture(key, data, 1, 1);
  }
  return key;
}

/* 把 raw glow 做成“亮一点”的独立发光层：主层保留颜色，再叠一层模糊 bloom */
async function softGlowTexture(rawKey, outKey, alpha) {
  const im = await loadTextureEl(rawKey);
  if (!im || !im.naturalWidth) return '';
  const cvs = document.createElement('canvas');
  cvs.width = im.naturalWidth; cvs.height = im.naturalHeight;
  const g = cvs.getContext('2d');
  g.globalAlpha = alpha == null ? 0.8 : alpha;
  g.drawImage(im, 0, 0);
  // 模糊光晕：让发光层在游戏里也显得更亮，而不是单纯变透明
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.5;
  try { g.filter = 'blur(4px)'; } catch (e) { }
  g.drawImage(im, 0, 0);
  try { g.filter = 'none'; } catch (e) { }
  const data = cvs.toDataURL('image/png');
  await saveBakedTexture(outKey, data, cvs.width, cvs.height);
  return outKey;
}

/* 直接把部位换成原始贴图（不裁剪），用于 base / Chemskin 天线 */
async function updatePartTextureRaw(p, newKey) {
  const oldKey = p.img;
  let oldBox = null, oldDim = [0, 0];
  try {
    if (oldKey) { oldDim = imgDim(oldKey); oldBox = await alphaBoxAsync(oldKey); }
  } catch (e) { }
  p.img = newKey;
  let nb = null, nd = [0, 0];
  try { nd = imgDim(newKey); nb = await alphaBoxAsync(newKey); } catch (e) { }
  if (oldBox && oldBox.ok !== false && nb && nb.ok !== false && nd[0]) {
    const osx = Number(p.sx) || 1, osy = Number(p.sy) || 1;
    const visW = oldBox.w * Math.abs(osx), visH = oldBox.h * Math.abs(osy);
    p.sx = round(clamp(visW / nb.w, 0.05, 12), 3);
    p.sy = round(clamp(visH / nb.h, 0.05, 12), 3);
    const ocx = p.x + ((oldBox.x0 + oldBox.w / 2) - oldDim[0] / 2) * osx;
    const ocy = p.y + ((oldBox.y0 + oldBox.h / 2) - oldDim[1] / 2) * osy;
    p.x = round(ocx - ((nb.x0 + nb.w / 2) - nd[0] / 2) * p.sx, 2);
    p.y = round(ocy - ((nb.y0 + nb.h / 2) - nd[1] / 2) * p.sy, 2);
    p.hb = [clamp(nb.w / nd[0], 0.02, 1), clamp(nb.h / nd[1], 0.02, 1)];
    p.hbox = null;
  }
}

function bodyTypeMatches(conds, bodyType) {
  const list = ((conds && conds.bodyTypes) || []).filter(Boolean);
  if (!list.length) return true;
  const bt = String(bodyType || '').toLowerCase();
  return list.some(x => String(x).toLowerCase() === bt);
}

function addonPartKeys(p) {
  return [p && p.nameEn, p && p.name, p && p.id].map(norm).filter(Boolean);
}

function addonsForPart(c, p, addons) {
  const keys = addonPartKeys(p);
  const bp = [];
  const addBP = x => {
    if (!x) return;
    const a = norm(x.label), b = norm(x.def);
    if (a) bp.push(a);
    if (b) bp.push(b);
  };
  const raceParts = (c.race && c.race.bodyParts) || [];
  let nameHit = null;
  for (const x of raceParts) {
    const a = norm(x.label), b = norm(x.def);
    if ((a && keys.indexOf(a) >= 0) || (b && keys.indexOf(b) >= 0)) { nameHit = x; break; }
  }
  if (nameHit) addBP(nameHit);
  else raceParts.filter(x => Number(x.i) === Number(p.bid)).forEach(addBP);
  const out = [];
  (addons || []).forEach(a => {
    const al = norm(a.bodyPartLabel);
    const ad = norm(a.bodyPartDef);
    if (al && (keys.indexOf(al) >= 0 || bp.indexOf(al) >= 0)) { out.push(a); return; }
    if (ad && (keys.indexOf(ad) >= 0 || bp.indexOf(ad) >= 0)) { out.push(a); return; }
    if (al && keys.some(k => k.indexOf(al) >= 0 || al.indexOf(k) >= 0)) out.push(a);
  });
  return out.sort((x, y) => (x.order || 0) - (y.order || 0));
}

/* t115：bodyAddon（耳/尾/翅…）没有对应的“身体部位贴图”。
   以前只能被 findTex 的模糊匹配随机配一张（Yuran 的耳朵就配到过头盔图），
   这里按 addon 的 bodyPart 条件找到对应部位，再用 addon 自己的正面图当底稿。 */
function addonArtForPart(res, rp) {
  const addons = ((res && res.race && res.race.addons) || [])
    .filter(a => a && a.path)
    .filter(a => !/hair/i.test(String(a.path) + ' ' + String(a.name || '')))
    // 服装层（TR_Apparel_out / Non_SI …）也是 bodyAddon，但它们由衣服决定，不能当身体部位
    .filter(a => !/apparel|cloth|gear|armor/i.test(String(a.path) + ' ' + String(a.name || '')));
  if (!addons.length) return null;
  const kd = norm(rp.defName || ''), kl = norm(rp.label || '');
  // 先按左右标签找（Left ear / Right ear），找不到才退回按 def 找 ——
  // 否则左右耳 def 都叫 Ear，会一起配到第一条 addon（右耳显示左耳图）。
  const labelHits = addons.filter(a => {
    const al = norm(a.bodyPartLabel || '');
    return al && (al === kl || al.indexOf(kl) >= 0 || kl.indexOf(al) >= 0);
  });
  // Nyaron 这种同标签有 Back/Front 两套：正面视图要 Front（Back 的 _south 是全透明）
  labelHits.sort((a, b) => {
    const fa = /front/i.test(String(a.path) + ' ' + String(a.name || '')) ? 0 : 1;
    const fb = /front/i.test(String(b.path) + ' ' + String(b.name || '')) ? 0 : 1;
    return fa - fb || (a.order || 0) - (b.order || 0);
  });
  const hit = labelHits[0] || addons.find(a => {
    const ad = norm(a.bodyPartDef || '');
    return ad && (ad === kd || kd.indexOf(ad) === 0);
  });
  if (!hit) return null;
  const keys = new Set(((res.assets || []).concat(res.hairs || [], res.masks || []))
    .map(x => String((x && x.key) || '').toLowerCase()));
  for (const cand of [hit.path + '_south', hit.path + '_east', hit.path]) {
    const k = String(cand).toLowerCase();
    if (keys.has(k) || keys.has(k + '.png')) return { path: cand, addon: hit };
  }
  return null;
}

function addonLayerOptions(addon, bodyType) {
  const map = new Map();
  ((addon && addon.rules) || []).forEach(r => {
    const genes = ((r.conds && r.conds.genes) || []).filter(Boolean);
    if (!genes.length) return;
    if (!bodyTypeMatches(r.conds, bodyType)) return;
    if (((r.conds && r.conds.hediffs) || []).length) return;   // Hediff 条件交给普通异种
    const key = genes.slice().sort().join('|');
    if (!map.has(key)) map.set(key, { genes, path: r.path || addon.path, order: r.order || 0 });
  });
  return [...map.values()];
}

function comboProduct(axes, limit) {
  let out = [[]];
  for (const axis of axes) {
    const next = [];
    for (const prev of out) {
      for (const opt of axis) {
        next.push(prev.concat([opt]));
        if (next.length >= limit) break;
      }
      if (next.length >= limit) break;
    }
    out = next;
    if (out.length >= limit) break;
  }
  return out.slice(0, Math.max(1, limit));
}

function partFileBase(p) {
  let raw = String((p && (p.nameEn || p.name || p.id)) || 'part');
  if (/[^\x00-\x7F]/.test(raw) && p && p.id) raw = String(p.id);
  let s = raw.replace(/[^\w\u4e00-\u9fa5-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!s) s = 'part';
  return s.toLowerCase();
}

function geneRank(genes, allGlowGenes) {
  const glow = (genes || []).find(g => /glow/i.test(g));
  if (!glow) return 5;
  const i = (allGlowGenes || []).indexOf(glow);
  return i >= 0 ? Math.max(1, 10 - i) : 5;
}

async function updatePartBaseImage(p, newKey, baked) {
  const oldKey = p.img;
  let oldBox = null, oldDim = [0, 0];
  try {
    if (oldKey) { oldDim = imgDim(oldKey); oldBox = await alphaBoxAsync(oldKey); }
  } catch (e) { }
  p.img = newKey;
  const oldSx = Number(p.sx) || 1, oldSy = Number(p.sy) || 1;
  if (oldBox && oldBox.ok !== false && baked && baked.artW > 0 && baked.artH > 0) {
    // 旧图的可见尺寸（画布单位）→ 新图（裁过）用同样的可见尺寸，避免裁图尺寸变化导致尾巴突然爆炸
    const visW = oldBox.w * Math.abs(oldSx), visH = oldBox.h * Math.abs(oldSy);
    p.sx = round(clamp(visW / baked.artW, 0.05, 12), 3);
    p.sy = round(clamp(visH / baked.artH, 0.05, 12), 3);
  }
  if (oldBox && oldBox.ok !== false && oldDim[0]) {
    // 旧图的可见中心（画布坐标）→ 新图（裁过）直接以它为中心
    const acx = p.x + ((oldBox.x0 + oldBox.w / 2) - oldDim[0] / 2) * oldSx;
    const acy = p.y + ((oldBox.y0 + oldBox.h / 2) - oldDim[1] / 2) * oldSy;
    p.x = round(acx, 2);
    p.y = round(acy, 2);
  }
  if (baked && baked.w > 0 && baked.h > 0 && baked.artW > 0) {
    p.hb = [clamp(baked.artW / baked.w, 0.02, 1), clamp(baked.artH / baked.h, 0.02, 1)];
    p.hbox = null;
  }
}

/* 主入口：读模组文件夹 → 解析被选中种族的 bodyAddons → 给匹配到的部位烘焙组合图并生成基因异种 */
function followRotFromImage(p) {
  const m = String((p && (p.img || p.name || '')) || '').match(/_r(-?\d+(?:\.\d+)?)/);
  if (m) return Number(m[1]);
  return Number.isFinite(Number(p && p.rot)) ? Number(p.rot) : 0;
}
/* P1：自动变换的候选规则从「非标准 colorChannel」改为「不是头发 addon」。
   旧规则把 colorChannel=hair 的 addon（Nyaron 的耳朵/尾巴、大量种族的角/耳/尾）全部排除，
   导致这些部位永远看不到「自动变换」开关；头发本身仍要排除（由发型系统绘制）。
   P2：一个部位同时匹配多条 addon 时，优先「south 方向真有像素」的那条
   （健康面板娃娃是正面视图），其次按名字 Front/Back 兜底 —— Nyaron 一只耳朵同时挂了
   Back/Front 两条 addon，而 Back 的 south 图是全透明，选错就等于耳朵消失。 */
const FOLLOW_HAIR_WORDS = /hair|ahoge|bangs|ponytail|twintail|braid|呆毛/i;
function isHairLikeAddon(a) {
  return FOLLOW_HAIR_WORDS.test(String((a && (a.path || a.name)) || ''));
}
/* southArt：Map<addon.path, true|false|null>，只有 scanFollowParts 会预先量好；
   其它调用点拿不到像素数据时传 null（退回 Front/Back 名字判断）。 */
function followRank(a, pn, southArt, img) {
  const an = String((a && (a.name || a.path)) || '').toLowerCase();
  const base = String((a && a.path) || '');
  let n = 0;
  // 部位当前贴图就是这条 addon 的画（例如 Cat_RightFrontEar_south）时优先绑定同一条，
  // 否则左右耳会一起绑到左边那条，右耳就变成左耳的镜像。
  if (img && base) { const bp = base.toLowerCase(); if (String(img).toLowerCase().indexOf(bp) === 0) n += 2000; }
  if (/halo|光环|aureole/.test(an)) n += 10;
  if (/halo|光环|aureole/.test(pn) && /halo|光环|aureole/.test(an)) n += 6;
  if (/highlight|battle/.test(an) && !/highlight|battle/.test(pn)) n -= 8;
  if (String((a && a.bodyPartLabel) || '').trim()) n += 1;
  const sa = (southArt && base) ? southArt.get(base) : undefined;
  if (sa === true) n += 1000;
  else if (sa === false) n -= 1000;
  if (/front/.test(an)) n += 100;
  else if (/back/.test(an)) n -= 100;
  return n;
}
/* t124：左右部位必须配到同侧的 bodyAddon。
   Yuran 的两只耳朵都被配成 Ear/R（自动变换后左耳显示右耳贴图），
   因为 bodyAddon 的 bodyPartLabel 对左右耳都是 "Ear"，排序挑到了同一个候选。 */
function partSideKey(p) {
  const s = String((p && (p.name || p.nameEn || '')) || '') + ' ' + String((p && p.id) || '');
  if (/左|left|u5de6/i.test(s)) return 'L';
  if (/右|right|u53f3/i.test(s)) return 'R';
  return '';
}
function addonSideKey(a) {
  if (!a) return '';
  const path = String(a.path || '');
  const m = path.match(/\/(L|R)\//);
  if (m) return m[1];
  const s = path + ' ' + String(a.bodyPartLabel || '') + ' ' + String(a.name || '');
  if (/左|left/i.test(s)) return 'L';
  if (/右|right/i.test(s)) return 'R';
  return '';
}
function swapSidePath(path, want) {
  const p = String(path || '').replace(/\\/g, '/');
  const segs = p.split('/');
  const wantTok = want === 'L' ? 'L' : 'R';
  const badTok = want === 'L' ? 'R' : 'L';
  let changed = false;
  for (let i = 0; i < segs.length; i += 1) {
    if (segs[i] === badTok) { segs[i] = wantTok; changed = true; }
  }
  const last = segs[segs.length - 1] || '';
  if (last) {
    if (last.slice(-1) === badTok) { segs[segs.length - 1] = last.slice(0, -1) + wantTok; changed = true; }
    else if (last.indexOf(badTok) >= 0) { segs[segs.length - 1] = last.split(badTok).join(wantTok); changed = true; }
  }
  return changed ? segs.join('/') : '';
}
function markFollowParts(c, race, addonList, southArt) {
  let n = 0;
  (c.parts || []).forEach(p => {
    if (p) {
      p.followDetected = false;
      p.followAddon = '';
      p.followPath = '';
      p.followChannel = '';
      p.followRot = 0;
      p.followScore = 0;
    }
  });
  (c.parts || []).forEach(p => {
    if (!p) return;
    let aa = [];
    try { aa = addonsForPart(c, p, addonList || []); } catch (e) { aa = []; }
    const cand = aa.filter(a => a && !isHairLikeAddon(a));
    if (!cand.length) return;
    const pn = String((p.name || p.nameEn || '') + ' ' + (p.img || '') + ' ' + (p.id || '')).toLowerCase();
    const pimg = String(p.img || '').toLowerCase();
    const ranked = cand.slice().sort((x, y) => followRank(y, pn, southArt, pimg) - followRank(x, pn, southArt, pimg));
    let a = ranked[0];
    // t124：同侧优先；没有同侧候选就把路径左右互换（并用 _south 图确认真存在）
    const want = partSideKey(p);
    if (want) {
      const sameSide = cand.filter(x => addonSideKey(x) === want);
      if (sameSide.length) {
        a = sameSide.slice().sort((x, y) => followRank(y, pn, southArt, pimg) - followRank(x, pn, southArt, pimg))[0];
      } else {
        const alt = swapSidePath(a.path, want);
        if (alt) {
          const known = southArt && southArt.has(alt) ? southArt.get(alt) : null;
          if (known === true || known === null) a = Object.assign({}, a, { path: alt, name: alt });
        }
      }
    }
    p.followDetected = true;
    p.followAddon = String(a.name || a.path || '');
    p.followPath = String(a.path || '');
    p.followChannel = String(a.colorChannel || '');
    p.followRot = followRotFromImage(p);
    p.followScore = followRank(a, pn, southArt, pimg);
    n++;
  });
  return n;
}
/* P2 取数：从这次选中的模组文件夹里直接找 <addon.path>_south.png，量它是否真有像素。
   不能依赖 EXT：贴图可能还没注册，imgURL 会退回占位图，量出来全是"有像素"，
   反而把"只有空白图"的 addon 判成可用。找不到文件就记 null = 未知，不参与排序。 */
async function addonSouthArtMap(addons, raw) {
  const files = new Map();
  const addFile = (f, p) => {
    const rel = String(p || '').replace(/\\/g, '/');
    if (!rel || !/\.png$/i.test(rel)) return;
    const m = rel.match(/(?:^|\/)Textures\/(.+)$/i);
    if (!m) return;
    const key = m[1].replace(/\.png$/i, '').toLowerCase();
    if (key && !files.has(key)) files.set(key, f);
  };
  (raw || []).forEach(x => {
    if (!x) return;
    let f = null, p = '';
    if (x.file) { f = x.file; p = x.path || x.file.__relPath || x.file.webkitRelativePath || x.file.name; }
    else if (typeof File !== 'undefined' && x instanceof File) { f = x; p = x.__relPath || x.webkitRelativePath || x.name; }
    if (f) addFile(f, p);
  });
  const out = new Map();
  for (const a of (addons || [])) {
    const base = String((a && a.path) || '');
    if (!base || out.has(base)) continue;
    const f = files.get((base + '_south').toLowerCase());
    if (!f) { out.set(base, null); continue; }
    let url = '';
    try {
      url = URL.createObjectURL(f);
      const box = await measureAlpha(url);
      out.set(base, !!(box && box[2] > 0 && box[3] > 0));
    } catch (e) { out.set(base, null); }
    if (url) { try { URL.revokeObjectURL(url); } catch (e) { } }
  }
  return out;
}
async function scanFollowParts(inputFiles) {
  const c = activeCanvas();
  if (!c) { toast('先在左边选一张画布', true); return; }
  if (!c.race) { toast('这张画布不是从种族模组导入的，没有 bodyAddons 可扫描', true); return; }
  const raw = Array.from(inputFiles || []);
  if (!raw.length) { toast('没有选择文件', true); return; }
  const files = raw.map(x => {
    if (x && x.file) {
      try { Object.defineProperty(x.file, '__relPath', { value: String(x.path || x.file.name || ''), configurable: true }); } catch (e) { }
      return x.file;
    }
    return x;
  });
  let res;
  try { res = await parseRaceMod(files); } catch (e) { toast('解析失败：' + e.message, true); return; }
  const races = res.races || [];
  const want = String((c.race && c.race.defName) || '');
  const race = races.find(r => r.defName === want)
    || races.find(r => r.label === (c.race && c.race.label))
    || (res.race ? races.find(r => r.defName === res.race.defName) : null)
    || races[0];
  if (!race || !race.addons || !race.addons.length) { toast('选中的模组里没有解析到 bodyAddons', true); return; }
  const addonList = (race.addons || []).filter(a => !/hair/i.test(String(a.path || '') + ' ' + String(a.name || '')));
  // P2：先量每条 addon 的 south 贴图（正面视图）是否真有像素，再挑候选
  let southArt = null;
  try { toast('正在检查 bodyAddons 的正面贴图…'); southArt = await addonSouthArtMap(addonList, raw); } catch (e) { southArt = null; }
  const n = markFollowParts(c, race, addonList, southArt);
  persist();
  if (n) {
    const marked = (c.parts || []).filter(p => p && p.followDetected);
    const first = marked.slice().sort((a, b) => (Number(b.followScore) || 0) - (Number(a.followScore) || 0))[0];
    if (first) {
      S.sel = first.uid;
      try {
        const g = groupOf(first);
        if (!S.ui.closed) S.ui.closed = {};
        S.ui.closed[g] = false;
        S.ui.allClosed = false;
      } catch (e) { }
    }
    renderAll();
  } else {
    renderTree(); renderInspector();
  }
  toast(n ? `已标记 ${n} 个可自动变换部位（已选中第一个，开关默认关闭）` : '没有找到自定义 colorChannel 的 bodyAddon 部位');
}

async function buildGeneLooks(inputFiles, opts) {
  const c = activeCanvas();
  if (!c) { toast('先在左边选一张画布', true); return null; }
  try { pruneGlowLayers(c); } catch (e) { }
  if (!c.race) { toast('这张画布不是从种族模组导入的，没有 bodyAddons 可解析', true); return null; }
  const raw = Array.from(inputFiles || []);
  if (!raw.length) { toast('没有选择文件', true); return null; }
  const files = raw.map(x => {
    if (x && x.file) {
      try { Object.defineProperty(x.file, '__relPath', { value: String(x.path || x.file.name || ''), configurable: true }); } catch (e) { }
      return x.file;
    }
    return x;
  });
  toast('正在解析模组 bodyAddons…');
  let res;
  try { res = await parseRaceMod(files); }
  catch (e) { toast('解析失败：' + e.message, true); return null; }
  const races = res.races || [];
  const want = String((c.race && c.race.defName) || '');
  let race = races.find(r => r.defName === want)
    || races.find(r => r.label === (c.race && c.race.label))
    || races.find(r => r.addons && r.addons.length)
    || (res.race ? races.find(r => r.defName === res.race.defName) : null)
    || races[0];
  if (!race || !race.addons || !race.addons.length) {
    toast('选中的模组里没有解析到 bodyAddons（要选种族模组根目录，含 1.6/Defs 与 Textures）', true);
    return null;
  }
  // 头发走发型系统，不参与基因外观烘焙
  const addonList = race.addons.filter(a => !/hair/i.test(String(a.path || '') + ' ' + String(a.name || '')));
  try { markFollowParts(c, race, addonList); } catch (e) { }
  const labels = new Map(((res.geneLabels || [])).map(x => [x.defName, x.label]));

  // 模组贴图索引：Textures/xxx.png -> File
  const texFiles = new Map();
  raw.forEach(x => {
    const f = x && x.file ? x.file : x;
    const fp = String((x && x.file ? (x.path || x.file.__relPath || x.file.webkitRelativePath || x.file.name)
      : (x.__relPath || x.webkitRelativePath || x.name)) || '').replace(/\\/g, '/');
    if (f && /(^|\/)Textures\/.*\.png$/i.test(fp)) {
      try { texFiles.set(textureKey(fp), f); } catch (e) { }
    }
  });
  if (!texFiles.size) { toast('模组里没有 Textures/*.png', true); return null; }

  // 匹配部位 + 组装层
  const matches = [];
  (c.parts || []).forEach(p => {
    if (p && p.glowLayer) return;   // 发光层不是独立目标，避免生成“天线·发光·发光”
    const aa = addonsForPart(c, p, addonList);
    if (!aa.length) return;
    // bodyAddon 写了 colorChannel=hair（Kiiro/Wolfein/Miho 的耳朵尾巴）→ 自动标记跟随发色
    if (aa.some(a => String((a && a.colorChannel) || '').toLowerCase() === 'hair')) p.hairTint = true;
    const layers = aa.map((a, i) => ({
      addon: a,
      isBase: i === 0,
      glow: addonGlow(a),
      options: addonLayerOptions(a, c.bodytype),
    }));
    matches.push({ part: p, layers });
  });
  if (!matches.length) {
    toast('bodyAddons 里的 bodyPartLabel 没对上画布部位（部位英文名要能和 bodyPartLabel 对上）', true);
    return null;
  }

  // 只保留至少有一层能解析到贴图的匹配
  for (const m of matches) {
    for (const L of m.layers) {
      L.baseKey = resolveAddonTexture(L.addon.path, texFiles);
      if (L.baseKey) await ensureExtTexture(L.baseKey, texFiles.get(L.baseKey));
      const opts2 = [];
      for (const o of L.options) {
        const key = resolveAddonTexture(o.path, texFiles);
        if (!key) continue;
        await ensureExtTexture(key, texFiles.get(key));
        opts2.push(Object.assign({}, o, { key }));
      }
      L.options = opts2;
    }
    m.valid = m.layers.some(L => L.baseKey || L.options.length);
  }
  const validMatches = matches.filter(m => m.valid);
  if (!validMatches.length) { toast('找到了部位，但 addon 贴图路径没解析出来', true); return null; }

  let chosen = null;
  if (opts && Array.isArray(opts.uids)) chosen = opts.uids;
  else if (opts && opts.autoParts) chosen = validMatches.map(m => m.part.uid);
  else {
    chosen = await pickGeneLookParts(validMatches);
    if (!chosen || !chosen.length) return null;
  }
  const targets = validMatches.filter(m => chosen.indexOf(m.part.uid) >= 0);
  if (!targets.length) { toast('没有选中任何部位', true); return null; }

  // 清掉上一轮生成的基因异种
  const oldGen = (c.colorVariants || []).filter(v => v && v.gen).length;
  c.colorVariants = (c.colorVariants || []).filter(v => !v || !v.gen);
  c.colorVariants = c.colorVariants.filter(Boolean);

  const raceDir = variantTextureFolder(c);
  // 有些发光层（例如尾巴）没有写 <Gene For="Glow_Blue">，Blue 就是它的默认 path。
  // 把“其它发光层已经出现的、这一层没有的”颜色补成 base path 选项。
  const glowUnion = [...new Set(
    targets.flatMap(m => m.layers.flatMap(L => (L.options || []).flatMap(o => o.genes || [])))
  )].filter(g => /glow/i.test(g));
  for (const m of targets) {
    for (const L of m.layers) {
      if (L.isBase || !L.glow || !L.baseKey || !L.options.length) continue;
      const have = new Set(L.options.flatMap(o => (o.genes || [])).filter(g => /glow/i.test(g)));
      glowUnion.forEach(g => {
        if (!have.has(g)) L.options.push({ genes: [g], path: '', key: L.baseKey, order: 9999 });
      });
    }
  }
  const allGlowGenes = [...new Set(
    targets.flatMap(m => m.layers.flatMap(L => L.options.flatMap(o => o.genes)))
  )].filter(g => /glow/i.test(g));
  const groupMap = new Map();
  for (const m of targets) {
    for (const L of m.layers) {
      const gGenes = [...new Set(L.options.flatMap(o => o.genes))];
      if (!gGenes.length) continue;
      const gkey = gGenes.slice().sort().join('|');
      if (!groupMap.has(gkey)) groupMap.set(gkey, { genes: gGenes, label: geneGroupLabel(gGenes, labels) });
    }
  }
  const stateMap = new Map();   // genesKey -> { genes, parts:[{p,key}] }
  const refByPart = new Map();   // 基准可见尺寸 / 中心，用于把不同尺寸的异种图对齐
  const bakedKeys = [];
  let baked = 0;

  const tailTargets = targets.filter(m => m.layers.some(L => /tail|尾/i.test(
    String((L.addon && L.addon.name) || '') + ' ' + String((L.addon && L.addon.path) || ''))));
  const antennaTargets = targets.filter(m => tailTargets.indexOf(m) < 0);

  // 天线：base 部位保持原始贴图；另建一个同 bid、layer+1 的透明发光层部位。
  // 发光层只放软化后的 glow 图，由异种单独覆盖，底图不再被 additive 冲掉。
  const emptyKey = antennaTargets.length ? await ensureEmptyTexture() : '';
  for (const m of antennaTargets) {
    const parts = m.part;
    const baseLayer = m.layers.find(L => L.isBase) || m.layers[0];
    const glowLayer = m.layers.find(L => L.glow) || m.layers[1];
    if (!baseLayer || !glowLayer || !baseLayer.baseKey) continue;
    await updatePartTextureRaw(parts, baseLayer.baseKey);
    const chemOpt = (baseLayer.options || []).find(o => (o.genes || []).some(g => /chemskin/i.test(g)));
    const chemKey = chemOpt ? chemOpt.key : '';
    const glowRaw = {};
    for (const o of (glowLayer.options || [])) {
      const gene = (o.genes || []).find(g => /glow/i.test(g));
      if (!gene || !o.key || glowRaw[gene]) continue;
      glowRaw[gene] = o.key;
    }
    c.parts = (c.parts || []).filter(x => !(x && x.glowLayer && x.glowFor === parts.uid));
    const gp = {
      uid: uid(), id: (parts.id || 'part') + '_Glow',
      name: String(parts.name || '部位') + '·发光',
      nameEn: String(parts.nameEn || parts.name || 'part') + ' glow',
      kind: parts.kind, bid: parts.bid, img: emptyKey,
      x: parts.x, y: parts.y, sx: parts.sx, sy: parts.sy,
      flip: false, rot: 0, layer: (Number(parts.layer) || 0) + 1, extra: 0,
      hb: [0.9, 0.9], armor: false, vis: true, locked: false,
      state: 'ok', sev: 0, wound: 'cut', prosth: null,
      overHair: !!parts.overHair, linkTop: !!parts.linkTop, desat: !!parts.desat,
      atlas: null, uv: null, custom: false, source: parts.source || 'race',
      glowLayer: true, glowFor: parts.uid,
    };
    c.parts.push(gp);
    m.glowPart = gp;
    m.chemKey = chemKey;
    m.glowRaw = glowRaw;
  }

  for (const m of targets) {
    const parts = m.part;
    const layers = m.layers;
    const isTailLook = layers.some(L => /tail|尾/i.test(
      String((L.addon && L.addon.name) || '') + ' ' + String((L.addon && L.addon.path) || '')));
    // 每层：[null, ...gene options]；base 层 null = 默认图，overlay 层 null = 不画
    const axes = layers.map(L => [null].concat(L.options));
    const combos = comboProduct(axes, 64);
    for (const combo of combos) {
      const genes = [];
      let label = '';
      combo.forEach((sel, i) => {
        if (!sel) return;
        (sel.genes || []).forEach(g => { if (genes.indexOf(g) < 0) genes.push(g); });
      });
      if (genes.length) {
        label = genes.map(g => geneShortName(g, labels)).join(' + ');
        if (genes.some(g => /glow/i.test(g)) && !/glow$/i.test(label)) label += ' glow';
      }
      const geneKey = genes.slice().sort().join('|');
      if (!isTailLook) {
        // 天线：base 层只在 Chemskin 状态覆盖；glow 层只在发光状态覆盖。
        const st = stateMap.get(geneKey) || { genes: genes.slice(), label, parts: [] };
        const chem = genes.some(g => /chemskin/i.test(g));
        const glowGene = genes.find(g => /glow/i.test(g));
        if (chem && m.chemKey) st.parts.push({ p: parts, key: m.chemKey });
        if (glowGene && m.glowRaw && m.glowRaw[glowGene]) {
          const folder = variantNameFolder({ label });
          const outKey = 'Custom/' + raceDir + '/' + folder + '/' + partFileBase(parts) + '_Glow';
          const sk = await softGlowTexture(m.glowRaw[glowGene], outKey, 0.8);
          if (sk) {
            baked++; bakedKeys.push(sk);
            st.parts.push({ p: m.glowPart, key: sk });
          }
        }
        if (st.parts.length) stateMap.set(geneKey, st);
        continue;
      }
      const layerDefs = [];
      if (isTailLook) {
        // 尾巴用 east：south 的 glow 贴图是空图；Moyo/Body 的 east 套是完整 512 画布，
        // base / glow 对齐，再把 glow 按 Blue/Purple/Violet 染色。
        const glowGene = genes.find(g => /glow/i.test(g));
        const chem = genes.some(g => /chemskin/i.test(g));
        const basePath = chem ? 'Moyo/Tail/ChemSkinTail' : 'Moyo/Body/MoyoTail';
        const baseKey = resolveAddonTexture(basePath, texFiles, 'east');
        if (baseKey) {
          await ensureExtTexture(baseKey, texFiles.get(baseKey));
          layerDefs.push({ key: baseKey, glow: false });
        }
        if (glowGene) {
          const glowPath = chem ? 'Moyo/Tail/ChemSkinTailGlow'
            : /blue/i.test(glowGene) ? 'Moyo/Body/MoyoTailGlow'
              : /purple/i.test(glowGene) ? 'Moyo/Body/MoyoTailGlowA'
                : 'Moyo/Body/MoyoTailGlowB';
          const gk = resolveAddonTexture(glowPath, texFiles, 'east');
          if (gk) {
            await ensureExtTexture(gk, texFiles.get(gk));
            layerDefs.push({ key: gk, glow: true, tint: glowTint(glowGene) });
          }
        }
      } else {
        layers.forEach((L, i) => {
          const sel = combo[i];
          let key = '';
          const glow = L.glow;
          if (sel) key = sel.key || L.baseKey;
          else if (!L.options.length || L.isBase) key = L.baseKey;
          if (key) layerDefs.push({ key, glow });
        });
      }
      if (!layerDefs.length) continue;
      const b = await bakeAddonLayers(layerDefs);
      if (!b) continue;
      const isBase = !genes.length;
      const folder = isBase ? 'Base' : variantNameFolder({ label });
      const key = 'Custom/' + raceDir + '/' + folder + '/' + partFileBase(parts);
      const ok = await saveBakedTexture(key, b.data, b.w, b.h);
      if (ok) baked++;
      bakedKeys.push(key);
      if (isBase) {
        await updatePartBaseImage(parts, key, b);
        const rw = Math.abs(Number(parts.sx) || 1) * b.artW;
        const rh = Math.abs(Number(parts.sy) || 1) * b.artH;
        refByPart.set(parts.uid, { x: parts.x, y: parts.y, w: rw, h: rh });
      } else {
        const st = stateMap.get(geneKey) || { genes: genes.slice(), label, parts: [] };
        st.parts.push({ p: parts, key, artW: b.artW, artH: b.artH });
        stateMap.set(geneKey, st);
      }
    }
  }

  // 生成异种（每个基因组合一个，覆盖所有匹配部位）
  let added = 0;
  const stamp = Date.now().toString(36);
  stateMap.forEach((st, geneKey) => {
    if (!st.genes.length || !st.parts.length) return;
    const label = st.label || st.genes.map(g => geneShortName(g, labels)).join(' + ');
    const priority = 1000 + st.genes.length * 100 + geneRank(st.genes, allGlowGenes);
    const v = { id: 'g' + stamp + added, label, genes: st.genes.slice(), priority, gen: true, parts: {} };
    st.parts.forEach(({ p, key, artW, artH }) => {
      const rec = { img: key };
      const ref = refByPart.get(p.uid);
      if (ref && artW > 0 && artH > 0) {
        rec.x = ref.x;
        rec.y = ref.y;
        rec.sx = round(ref.w / artW, 4);
        rec.sy = round(ref.h / artH, 4);
        rec.auto = true;
      }
      v.parts[p.uid] = rec;
    });
    c.colorVariants.push(v);
    added++;
  });

  // 基因分组（UI 下拉）
  const groups = [...groupMap.values()].map((g, i) => ({
    key: 'g' + i,
    label: g.label,
    genes: g.genes.slice(),
  }));
  c.geneGroups = groups;
  c.geneState = {};
  groups.forEach(g => { c.geneState[g.key] = ''; });
  c.geneLook = { race: race.defName, at: Date.now(), parts: targets.map(m => m.part.uid), baked: bakedKeys.length };
  if (!S.ui.variantSel) S.ui.variantSel = {};
  S.ui.variantSel[c.id] = null;
  renderAll();
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
  toast(`已生成 ${added} 个基因异种（${targets.length} 个部位 · ${bakedKeys.length} 张烘焙图${oldGen ? `，替换旧 ${oldGen} 个` : ''}）；到「项目」页导出补丁后游戏生效`);
  return { variants: added, parts: targets.length, baked: bakedKeys.length, groups, keys: bakedKeys };
}

function pickGeneLookParts(matches) {
  return new Promise(resolve => {
    if (!S.ui) S.ui = {};
    S.ui.geneLookResolve = resolve;
    const looksAntenna = m => {
      const txt = String((m.part && (m.part.nameEn || '')) + ' ' + (m.part && (m.part.name || '')) + ' ' +
        m.layers.map(L => (L.addon && L.addon.name) || '').join(' '));
      return /antenna|antennae|tail|尾巴|天线/i.test(txt);
    };
    const ant = matches.filter(looksAntenna);
    const def = new Set((ant.length ? ant : matches).map(m => m.part.uid));
    const rows = matches.map(m => {
      const addonNames = m.layers.map(L => (L.addon && (L.addon.name || L.addon.path)) || '').filter(Boolean).join(' / ');
      return `<label style="display:flex;gap:8px;align-items:flex-start;padding:7px 8px;border:1px solid #2b3236;border-radius:5px;margin:5px 0;cursor:pointer">
        <input type="checkbox" value="${esc(m.part.uid)}"${def.has(m.part.uid) ? ' checked' : ''} style="margin-top:2px">
        <span style="min-width:0"><b style="font-size:11px">${esc(m.part.name || m.part.nameEn || m.part.id)}</b>
          <em style="display:block;font:9px/1.5 var(--font-mono);color:#8b949a;font-style:normal">${esc(m.part.nameEn || '')} · ${esc(addonNames)}</em></span>
      </label>`;
    }).join('');
    openModal(`<div style="width:min(560px,92vw)">
      <div class="modal__head"><span class="idx">GENE LOOK</span><h3>选择要生成基因外观的部位</h3>
        <button class="iconbtn x" data-act="gene-look-cancel">${icon('x')}</button></div>
      <div class="modal__body">
        <p class="mini-note" style="margin:0 0 8px">默认勾选天线；可以勾选头 / 尾巴 / 躯干等带发光层的部位。生成会覆盖这些部位当前的贴图和上一轮生成的基因异种。</p>
        <div style="max-height:46vh;overflow:auto">${rows}</div>
      </div>
      <div class="modal__foot"><button class="btn" data-act="gene-look-cancel">取消</button>
        <button class="btn btn--primary" data-act="gene-look-go">生成</button></div></div>`);
  });
}

function variantAddModal() {
  const c = activeCanvas(); if (!c) return;
  openModal(`<div style="width:min(460px,92vw)">
    <div class="modal__head"><span class="idx">VARIANT</span><h3>新建颜色异种</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <div class="field"><label>名称</label><div class="ctl"><input class="inp" id="vName" placeholder="BluePolarBear"></div></div>
      <div class="field"><label>Hediff</label><div class="ctl"><input class="inp" id="vHediff" placeholder="Mincho_BluePolarBear_Hediff"></div></div>
      <p class="mini-note" id="vErr" style="color:#e2483c;margin:4px 0 0"></p>
    </div>
    <div class="modal__foot"><button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--primary" data-act="variant-do">创建</button></div></div>`);
}

function variantAddDo() {
  const c = activeCanvas(); if (!c) return;
  const name = (document.getElementById('vName') || {}).value || '';
  const hediff = (document.getElementById('vHediff') || {}).value || '';
  if (!name.trim()) { const e = document.getElementById('vErr'); if (e) e.textContent = '名称不能为空'; return; }
  if (!Array.isArray(c.colorVariants)) c.colorVariants = [];
  const v = { id: 'v' + Date.now().toString(36), label: name.trim(), hediff: hediff.trim(), parts: {} };
  c.colorVariants.push(v);
  S.ui.variantSel[c.id] = v.id;
  closeModal();
  renderAll();
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
}

let VG_FLOAT = null;

function closeVariantGeomFloat(save) {
  if (VG_FLOAT && save !== false) {
    try { persist(); saveAllCanvasFiles(true); } catch (e) { }
  }
  if (VG_FLOAT && VG_FLOAT.el && VG_FLOAT.el.parentNode) VG_FLOAT.el.parentNode.removeChild(VG_FLOAT.el);
  VG_FLOAT = null;
}

function variantGeomCtx() {
  if (!VG_FLOAT) return null;
  const c = activeCanvas();
  if (!c || c.id !== VG_FLOAT.cid) return null;
  const v = (c.colorVariants || []).find(x => x.id === VG_FLOAT.vid);
  if (!v) return null;
  let p = (c.parts || []).find(x => x.uid === VG_FLOAT.uid);
  let r = variantPartRec(v, VG_FLOAT.uid);
  let isExtra = false;
  if (!p) {
    // t52：异种专属部位没有基础部位，用记录包装成部位对象（p 是只读视图，几何改动写回 r）
    const er = variantExtraRec(v, VG_FLOAT.uid);
    if (er) { p = variantExtraAsPart(v, VG_FLOAT.uid); r = er; isExtra = true; }
  }
  if (!p || !r || !r.img) return null;
  return { c, v, p, r, isExtra };
}

/* t52：写回几何记录 —— 异种专属部位写 extraParts，覆盖基础部位的写 parts。
   asExtra 显式传入（新记录还没写进 extraParts 时 variantIsExtraUid 判不出来）。 */
function variantSetRec(v, uid, rec, asExtra) {
  if (!v || !uid || !rec) return;
  if (asExtra === undefined) asExtra = variantIsExtraUid(v, uid);
  if (asExtra) { variantExtraMap(v)[uid] = rec; return; }
  if (!v.parts) v.parts = {};
  v.parts[uid] = rec;
}

function syncVariantGeomFloat(force) {
  if (!VG_FLOAT) return;
  const ctx = variantGeomCtx();
  if (!ctx) { closeVariantGeomFloat(false); return; }
  const { p, r } = ctx;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!force && document.activeElement === el) return;
    el.value = String(round(val, 2));
  };
  set('vgX', Number.isFinite(r.x) ? r.x : p.x);
  set('vgY', Number.isFinite(r.y) ? r.y : p.y);
  const sx = Number.isFinite(r.sx) ? r.sx : p.sx;
  const sy = Number.isFinite(r.sy) ? r.sy : p.sy;
  set('vgSX', sx);
  set('vgSY', sy);
  set('vgRot', Number.isFinite(r.rot) ? r.rot : (p.rot || 0));
  const hb = hitBox(p);
  set('vgHW', hb.w);
  set('vgHH', hb.h);
  const flipBtn = document.getElementById('vgFlip');
  if (flipBtn) flipBtn.classList.toggle('btn--on', !!((r.flip != null) ? r.flip : p.flip));
  const sc = Math.abs(sx - sy) < 0.001 ? sx : sx;
  const range = document.getElementById('vgScale');
  const num = document.getElementById('vgScaleN');
  if (range && (force || document.activeElement !== range)) range.value = String(clamp(sc, 0.1, 3));
  if (num && (force || document.activeElement !== num)) num.value = String(round(sc, 2));
}

function variantGeomInput(e, commit) {
  const t = e.target;
  const key = t && t.dataset && t.dataset.vg;
  if (!key) return;
  const ctx = variantGeomCtx();
  if (!ctx) { closeVariantGeomFloat(false); return; }
  const { v, r } = ctx;
  const rec = Object.assign({}, r);
  const raw = String(t.value == null ? '' : t.value).trim();
  if (key === 'hw' || key === 'hh') {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    // t52：异种专属部位的命中框存在它自己的记录里；基础部位仍写在基础部位上
    const owner = ctx.isExtra ? ctx.r : ctx.p;
    const cur = hitBox(owner);
    owner.hbox = {
      dx: cur.dx, dy: cur.dy,
      w: key === 'hw' ? clamp(n, 1, 4000) : cur.w,
      h: key === 'hh' ? clamp(n, 1, 4000) : cur.h,
    };
    syncHbFromBox(owner);
    try { renderStage(); } catch (err) { }
    persist();
    scheduleVariantCanvasSave();
    if (commit) { try { renderVariantPane(); } catch (err) { } }
    return;
  }
  if (key === 'scale') {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    rec.sx = n; rec.sy = n;
    const otherId = t.id === 'vgScale' ? 'vgScaleN' : 'vgScale';
    const other = document.getElementById(otherId);
    if (other) other.value = otherId === 'vgScale' ? String(clamp(n, 0.1, 3)) : String(round(n, 2));
    ['vgSX', 'vgSY'].forEach(id => {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = String(round(n, 2));
    });
  } else {
    if (raw === '') delete rec[key];
    else {
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      if ((key === 'sx' || key === 'sy') && n <= 0) return;
      rec[key] = n;
    }
    if (key === 'sx' || key === 'sy') {
      if (Number.isFinite(rec.sx) && Number.isFinite(rec.sy) && Math.abs(rec.sx - rec.sy) < 0.001) {
        const range = document.getElementById('vgScale');
        const num = document.getElementById('vgScaleN');
        if (range && document.activeElement !== range) range.value = String(clamp(rec.sx, 0.1, 3));
        if (num && document.activeElement !== num) num.value = String(round(rec.sx, 2));
      }
    }
  }
  variantSetRec(v, VG_FLOAT.uid, rec, ctx.isExtra);
  try { renderStage(); } catch (err) { }
  persist();
  scheduleVariantCanvasSave();
  if (commit) { try { renderVariantPane(); } catch (err) { } }
}

async function variantCropPart(ctx) {
  try {
    const { c, v, r } = ctx;
    if (!r.img) return;
    // t44-A：改走 saveVariantTexture，输出规范路径 Custom/<race>/<异种名>/<部位>_<素材>（同时生成 _Gray）。
    // 旧实现 saveCroppedAsset(r.img,'new',customCatFor(c)) 会把文件写成 Custom/<race>/Crop_<素材>_<hash>，
    // buildPatchXML 认不出这个命名，导出后异种部位会退回默认贴图，等于裁剪白做。
    const uid = (VG_FLOAT && VG_FLOAT.uid) || (ctx.p && ctx.p.uid);
    if (!uid) { toast('裁剪失败：找不到部位 uid，请先在异种页选中该部位', true); return; }
    const saved = await saveVariantTexture(c, v, uid, r.img, true);
    if (!saved || !saved.img || saved.img === r.img) return;   // 保存失败或已在该目录（幂等）
    // 回写方式与 variant-set 一致：保留原 rec 的几何字段，只换 img / gray
    const prevRec = variantPartRec(v, uid) || variantExtraRec(v, uid);
    const prev = (prevRec && typeof prevRec === 'object') ? prevRec : (prevRec ? { img: String(prevRec) } : {});
    const next = Object.assign({}, prev, { img: saved.img });
    if (saved.gray) next.gray = saved.gray; else delete next.gray;
    variantSetRec(v, uid, next, ctx.isExtra);
    try { renderStage(); renderVariantPane(); } catch (e) { }
    try { syncVariantGeomFloat(true); } catch (e) { }
    persist();
    scheduleVariantCanvasSave();
    toast('已自动裁剪异种贴图：' + saved.img.split('/').pop() + (saved.gray ? '（含灰度）' : ''));
  } catch (e) { toast('裁剪失败：' + (e && e.message), true); }
}

function variantVisboxToHit(ctx) {
  const { p, r } = ctx;
  const vp = Object.assign({}, p, {
    img: r.img,
    sx: Number.isFinite(r.sx) ? r.sx : p.sx,
    sy: Number.isFinite(r.sy) ? r.sy : p.sy,
    flip: (r.flip != null) ? r.flip : p.flip,
  });
  const vb = visBox(vp);
  if (!vb || !(vb.w > 1) || !(vb.h > 1)) {
    toast('算不出可见框，先点「自动裁剪透明区域」或等贴图解码', true);
    return;
  }
  // t55-B2：专属部位的命中框写在它自己的记录里（原来写的是临时包装对象，closeVariantGeomFloat 后就丢了）
  const owner = ctx.isExtra ? ctx.r : p;
  owner.hbox = { dx: round(vb.dx, 1), dy: round(vb.dy, 1), w: round(vb.w, 1), h: round(vb.h, 1) };
  syncHbFromBox(owner);
  if (ctx.isExtra) {
    const uid = (VG_FLOAT && VG_FLOAT.uid) || (ctx.p && ctx.p.uid);
    if (uid) variantSetRec(ctx.v, uid, ctx.r, true);
  }
  try { renderStage(); renderVariantPane(); } catch (e) { }
  try { syncVariantGeomFloat(true); } catch (e) { }
  persist();
  scheduleVariantCanvasSave();
  toast(`命中框已设为异种可见区 ${Math.round(vb.w)}×${Math.round(vb.h)}`);
}

function variantGeomFloat(uid) {
  closeVariantGeomFloat(false);
  const c = activeCanvas();
  if (!c) return;
  const v = variantState(c);
  if (!v) { toast('先选一个异种', true); return; }
  // t52：异种专属部位（uid 不在 c.parts）同样可以打开调整面板
  const p = (c.parts || []).find(x => x.uid === uid)
    || (variantExtraRec(v, uid) ? variantExtraAsPart(v, uid) : null);
  const r = variantPartRec(v, uid) || variantExtraRec(v, uid);
  if (!p || !r || !r.img) { toast('这个部位没有异种贴图', true); return; }
  // t58：专属部位所属的模组部位（defName）只在上面只读显示 —— 名称在「+ 添加部位」弹窗里定，不再手填 defName
  const extraDef = (p && p.source === 'variant-extra') ? variantExtraDefName(r) : '';
  const el = document.createElement('div');
  el.className = 'vgfloat';
  el.id = 'vgFloat';
  const pos = (S.ui && S.ui.vgFloatPos) || null;
  const w = 276;
  const stageEl = document.getElementById('stage');
  const sr = stageEl ? stageEl.getBoundingClientRect() : null;
  let left = pos ? Number(pos.left)
    : (sr ? Math.max(8, sr.right - w - 14) : Math.max(8, window.innerWidth - w - 26));
  let top = pos ? Number(pos.top) : (sr ? Math.max(8, sr.top + 56) : 112);
  left = clamp(Number.isFinite(left) ? left : 8, 4, Math.max(4, window.innerWidth - w - 4));
  top = clamp(Number.isFinite(top) ? top : 112, 4, Math.max(4, window.innerHeight - 190));
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  el.innerHTML = `<div class="vgfloat__h" data-vg-drag="1">
      <b>调整异种部位</b><em>${esc(p.name || p.nameEn || p.id)} · ${esc(v.label || v.id)}</em>
      <button class="iconbtn" data-act="variant-geom-close" title="关闭">${icon('x')}</button>
    </div>
    <div class="vgfloat__b">
      ${extraDef ? `<div class="vgfloat__sec">所属部位 PART</div>
      <div class="vgfloat__row vgfloat__row--one"><label>defName</label><input class="inp" type="text" id="vgDefName" value="${esc(extraDef)}" readonly title="游戏里实际绘制的 BodyPartDef；要换请删掉这个专属部位后重新添加"></div>` : ''}
      <div class="vgfloat__sec">变换 TRANSFORM</div>
      <div class="vgfloat__row"><label>X</label><input class="inp" type="number" id="vgX" data-vg="x" step="0.5"><label>Y</label><input class="inp" type="number" id="vgY" data-vg="y" step="0.5"></div>
      <div class="vgfloat__row vgfloat__row--one"><label>缩放</label><input type="range" id="vgScale" data-vg="scale" min="0.1" max="3" step="0.01"><input class="inp" type="number" id="vgScaleN" data-vg="scale" step="0.01" min="0.1" max="5"></div>
      <div class="vgfloat__row"><label>宽</label><input class="inp" type="number" id="vgSX" data-vg="sx" step="0.01" min="0.01"><label>高</label><input class="inp" type="number" id="vgSY" data-vg="sy" step="0.01" min="0.01"></div>
      <div class="vgfloat__row"><label>旋转</label><input class="inp" type="number" id="vgRot" data-vg="rot" step="1"><label></label><button class="btn btn--xs" id="vgFlip" data-act="variant-geom-flip" title="水平翻转（只影响编辑器预览）">翻转</button></div>
      <div class="vgfloat__row vgfloat__row--one"><label></label><button class="btn btn--xs" data-act="variant-geom-screset" title="缩放恢复 100%">重置缩放</button><button class="btn btn--xs" data-act="variant-geom-rotreset" title="旋转归零">旋转归零</button></div>
      <div class="vgfloat__sec">命中框 HITBOX</div>
      <div class="vgfloat__row"><label>宽</label><input class="inp" type="number" id="vgHW" data-vg="hw" step="1" min="1"><label>高</label><input class="inp" type="number" id="vgHH" data-vg="hh" step="1" min="1"></div>
      <div class="vgfloat__row vgfloat__row--one"><label></label><button class="btn btn--xs" data-act="variant-geom-hitreset" title="命中框恢复自动（按贴图比例）">复位命中框</button></div>
      <div class="vgfloat__sec">贴图 TEXTURE</div>
      <div class="vgfloat__btns">
        <button class="btn btn--xs" data-act="variant-geom-crop" title="把异种贴图的透明边裁掉，生成新的异种贴图">自动裁剪透明区域</button>
        <button class="btn btn--xs" data-act="variant-geom-visbox" title="按异种贴图的可见像素设置基础部位命中框">可见框→命中框</button>
      </div>
      <p class="mini-note">拖动标题栏移动 · 留空 = 继承基础 · 缩放同时改宽/高 · 旋转/翻转只影响编辑器预览；命中框和贴图裁剪作用于实际导出的部位/异种。</p>
    </div>
    <div class="vgfloat__f">
      <button class="btn btn--danger" data-act="variant-geom-reset" data-uid="${esc(uid)}">恢复默认</button>
      <button class="btn btn--primary" data-act="variant-geom-do" data-uid="${esc(uid)}">完成</button>
    </div>`;
  document.body.appendChild(el);
  VG_FLOAT = { el, cid: c.id, vid: v.id, uid };
  const head = el.querySelector('.vgfloat__h');
  let drag = null;
  head.addEventListener('pointerdown', ev => {
    if (ev.target.closest('button')) return;
    ev.preventDefault();
    drag = { dx: ev.clientX - el.offsetLeft, dy: ev.clientY - el.offsetTop };
    try { head.setPointerCapture(ev.pointerId); } catch (e) { }
  });
  head.addEventListener('pointermove', ev => {
    if (!drag) return;
    const nl = clamp(ev.clientX - drag.dx, 4, Math.max(4, window.innerWidth - el.offsetWidth - 4));
    const nt = clamp(ev.clientY - drag.dy, 4, Math.max(4, window.innerHeight - el.offsetHeight - 4));
    el.style.left = nl + 'px';
    el.style.top = nt + 'px';
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    if (S.ui) S.ui.vgFloatPos = { left: el.offsetLeft, top: el.offsetTop };
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
  el.addEventListener('input', ev => variantGeomInput(ev, false));
  el.addEventListener('change', ev => variantGeomInput(ev, true));
  syncVariantGeomFloat(true);
}

let variantPickUid = null;
// t52：本次选图是给「异种专属新部位」创建记录，还是覆盖已有部位
let variantPickNew = false;
// t55-B1：新建专属部位时用户填写的游戏 BodyPartDef defName（沿用到这里，避免用贴图文件名当部位名）
let variantPickNewName = '';
let variantPickQ = '';
let variantPickCat = 'all';
let variantPickCrop = false;
const VP_CATS = [
  ['all', '全部'],
  ['mine', '我的素材'],
  ['race', '种族素材'],
  ['body', '身体部件'],
  ['organs', '器官 / 骨骼'],
  ['rjw', 'RJW'],
  ['other', '其它'],
];
function variantCatMatch(a, sel) {
  const cat = String((a && a.cat) || '');
  if (sel === 'all') return true;
  if (sel === 'mine') return cat === 'mine';
  if (sel === 'race') return cat === 'race';
  if (sel === 'body') return cat === 'baseliner' || cat === 'prosthesis' || cat === 'xeno' || cat === 'common' || cat === 'armor';
  if (sel === 'organs') return cat === 'organs' || cat === 'bones';
  if (sel === 'rjw') return cat === 'rjw';
  if (sel === 'other') return !(cat === 'mine' || cat === 'race' || cat === 'baseliner' || cat === 'prosthesis' || cat === 'xeno' || cat === 'common' || cat === 'armor' || cat === 'organs' || cat === 'bones' || cat === 'rjw');
  return true;
}

function variantPickSource() {
  const seen = new Set();
  const out = [];
  (ASSETS || []).forEach(a => {
    if (!a || !a.p || seen.has(a.p)) return;
    if (a.cat === 'hair') return;
    if (/(^|\/)(hair|hair_?back)(\/|$)/i.test(String(a.p))) return;
    seen.add(a.p);
    out.push(a);
  });
  return out;
}

let variantPickOpen = {};
let variantPickLimit = {};

function variantPickIsOpen(key) {
  if (Object.prototype.hasOwnProperty.call(variantPickOpen, key)) return !!variantPickOpen[key];
  if (variantPickQ) return true;
  return key === 'mine';
}

function variantPickLimitFor(key) {
  const n = Number(variantPickLimit[key]);
  return Number.isFinite(n) && n > 0 ? n : 240;
}

function variantPickGroups() {
  const q = norm(variantPickQ);
  const rows = variantPickSource().filter(a => {
    if (!variantCatMatch(a, variantPickCat)) return false;
    if (q && !norm(a.n).includes(q) && !norm(a.p).includes(q)) return false;
    return true;
  });
  const mine = [];
  const by = new Map();
  rows.forEach(a => {
    if (a.cat === 'mine') { mine.push(a); return; }
    let g = '';
    if (a.cat === 'rjw') g = '模组 · RJW 器官';
    else if (a.cat === 'race') g = displayGroupName(a.g || ('模组 · ' + (a.modKey || '种族素材')));
    else {
      const hit = CATS.find(x => x[0] === a.cat);
      g = hit ? hit[1] : (a.g || '其它素材');
    }
    if (!by.has(g)) by.set(g, []);
    by.get(g).push(a);
  });

  const out = [];
  if (mine.length) {
    const subs = new Map();
    mine.forEach(a => {
      const parts = String(a.p).split('/');
      const sub = upperFirst(parts.length > 2 ? parts[1] : '未分类');
      if (!subs.has(sub)) subs.set(sub, []);
      subs.get(sub).push(a);
    });
    out.push({ key: 'mine', label: '★ 我的素材', items: mine, subs: [...subs.entries()] });
  }
  [...by.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .forEach(([g, items]) => out.push({ key: 'g:' + g, label: g, items }));
  return out;
}

function variantPickCard(a) {
  return `<button class="varpick" data-act="variant-set" data-p="${esc(a.p)}" title="${esc(a.p)}">
    <span style="background-image:url('${imgURL(a.p)}')"></span><b>${esc(upperFirst(a.n || a.p.split('/').pop()))}</b></button>`;
}

function variantPickGrid(items, key) {
  const limit = variantPickLimitFor(key);
  const shown = items.slice(0, limit);
  const more = items.length > shown.length;
  return `<div class="varpickgrid">${shown.map(variantPickCard).join('')}</div>
    ${more ? `<button class="btn btn--sm vpmore" data-act="variant-pick-more" data-key="${esc(key)}">还有 ${items.length - shown.length} 张 · 显示更多</button>` : ''}`;
}

function variantPickBodyHTML() {
  const groups = variantPickGroups();
  if (!groups.length) return '<p class="mini-note" style="padding:12px">没有匹配的素材。</p>';
  return groups.map(g => {
    if (g.key === 'mine') {
      const open = variantPickIsOpen('mine');
      const subHtml = open ? g.subs.map(([sub, items]) => {
        const sk = 'mine:' + sub;
        const so = variantPickIsOpen(sk);
        return `<div class="vpgroup vpgroup--sub">
          <div class="vphead vphead--toggle vphead--sub" data-act="variant-pick-group" data-key="${esc(sk)}">
            <span class="vpchev">${so ? '▾' : '▸'}</span><b>${esc(sub)}</b><i>${items.length}</i></div>
          ${so ? variantPickGrid(items, sk) : ''}
        </div>`;
      }).join('') : '';
      return `<div class="vpgroup">
        <div class="vphead vphead--toggle" data-act="variant-pick-group" data-key="mine">
          <span class="vpchev">${open ? '▾' : '▸'}</span><b>★ 我的素材</b><i>${g.items.length}</i></div>
        ${subHtml}
      </div>`;
    }
    const open = variantPickIsOpen(g.key);
    return `<div class="vpgroup">
      <div class="vphead vphead--toggle" data-act="variant-pick-group" data-key="${esc(g.key)}">
        <span class="vpchev">${open ? '▾' : '▸'}</span><b>${esc(g.label)}</b><i>${g.items.length}</i></div>
      ${open ? variantPickGrid(g.items, g.key) : ''}
    </div>`;
  }).join('');
}

function renderVariantPickBody() {
  const body = document.getElementById('varPickBody');
  if (body) body.innerHTML = variantPickBodyHTML();
}

function variantTextureFolder(c) {
  const raw = (c && c.race && (c.race.label || c.race.defName)) || (c && c.title) || '未分类';
  return String(raw).replace(/^mod\s*·\s*/i, '').replace(/[^\w\u4e00-\u9fa5-]+/g, '_').replace(/^_+|_+$/g, '') || '未分类';
}

function variantNameFolder(v) {
  if (!v) return 'Variant';
  // 1) 优先用实际图片所在文件夹（磁盘上已经是英文，和补丁路径一致）
  try {
    const parts = v.parts || {};
    for (const uid of Object.keys(parts)) {
      const img = parts[uid] && parts[uid].img;
      if (!img || !/^Custom\//.test(String(img))) continue;
      const m = /^Custom\/[^/]+\/([^/]+)\//.exec(String(img));
      if (m && m[1]) return m[1];
    }
  } catch (e) { }
  // 2) Hediff 后缀（..._Thunder）
  const hm = /_([A-Za-z0-9]+)$/.exec(String(v.hediff || ''));
  if (hm && hm[1]) return hm[1];
  // 3) label / defName
  const raw = (v.defName || v.label || v.hediff) || 'Variant';
  return String(raw).replace(/[^\w\u4e00-\u9fa5-]+/g, '_').replace(/^_+|_+$/g, '') || 'Variant';
}

/* t20：异种灰图的唯一 key 规则。
   必须与 saveVariantTexture（:10916-10928）实际落盘的表达式逐字一致，否则「重新生成」写出的
   文件和「保存异种贴图」写出的文件对不上，导出又会引用到不存在的那张。 */
function variantPartSlug(c, uid) {
  const p = (c && c.parts || []).find(x => x.uid === uid);
  if (p) return String((p.id || p.name) || 'Part').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  // t55-B3：异种专属部位不在 c.parts，由调用方（variantGrayKey）用记录里的 defName 覆盖；这里兜底
  return 'Part';
}
// t55-B3：异种记录的 uid 列表 = 覆盖 v.parts + 专属 v.extraParts（去重）
function variantAllUids(v) {
  if (!v) return [];
  return Array.from(new Set(Object.keys(v.parts || {}).concat(Object.keys(v.extraParts || {}))));
}
function variantRecOf(v, uid) {
  const rec = variantPartRec(v, uid);
  if (rec) return rec;
  return variantExtraRec(v, uid);
}
/* t58：专属部位在游戏里对应哪个部位 —— 取记录上的 defName（旧记录回退 name） */
function variantExtraDefName(rec) {
  return String((rec && (rec.defName || rec.name)) || '').trim();
}
function variantGrayKey(c, v, uid) {
  const vname = variantNameFolder(v);
  const rec = variantRecOf(v, uid) || {};
  const isExtra = !!(v && variantIsExtraUid(v, uid));
  // t58：专属部位的部位名用记录里的 defName（同导出），没有就退回 slug
  const extraName = isExtra ? variantExtraDefName(rec) : '';
  const slug = /^[A-Za-z0-9_]+$/.test(extraName) ? extraName : variantPartSlug(c, uid);
  let base = String(rec.img || '').split('/').pop().replace(/\.[^.]+$/, '').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  // t27：保存侧 saveVariantTexture 的 fname 恒为「部位名_素材名」（写完 img basename 就等于 fname），
  // 因此灰图名按「缺则补、有则不动」补一次部位前缀：22 条已带前缀的记录保持原样，
  // 18 条早期直传（basename 只有素材名）补上部位前缀，才能与保存侧逐字一致，
  // 同时仍然不会出现 部位名_部位名_… 的双前缀。
  if (!base) base = slug;                                  // img 缺失时用部位名兜底，保证 key 非空
  else if (base.indexOf(slug + '_') !== 0) base = slug + '_' + base;
  return 'Custom/NHTCD_Gray/' + customCatFor(c) + '/' + vname + '/' + base + '_Gray';
}

/* t20：按 r.img（异种的实际贴图）重新生成灰图，写到 variantGrayKey 并回写 r.gray。
   force=true 时无视磁盘已有文件重写（「重新生成灰度图」按钮用）。
   同一个 r.img 只解码一次，多个部位/异种共用结果。 */
async function regenVariantGrays(c, opts) {
  const force = !!(opts && opts.force);
  if (!c || !Array.isArray(c.colorVariants)) return 0;
  let n = 0;
  const byUid = new Map((c.parts || []).map(p => [p.uid, p]));
  const memo = new Map();                       // src -> {data,w,h} | null
  for (const v of c.colorVariants) {
    if (!v) continue;
    // t55-B3：专属部位（extraParts）也要生成灰图，否则「重新生成灰度图」后它们仍是彩色
    for (const uid of variantAllUids(v)) {
      let r = variantRecOf(v, uid);
      if (!r) continue;
      if (typeof r === 'string') { r = { img: r }; variantSetRec(v, uid, r, variantIsExtraUid(v, uid)); }
      if (!r.img) continue;                     // 没有贴图就不凭空造
      const p = byUid.get(uid);
      if (p && p.raceOff) continue;             // 与导出/渲染一致：关闭颜色的部位不需要灰图
      const src = String(r.img);
      if (!/^Custom\//.test(src)) continue;     // 只处理已经落进模组 Textures 的异种贴图
      const key = variantGrayKey(c, v, uid);
      if (!force && r.gray === key && texOnDisk(key)) continue;
      let g;
      if (memo.has(src)) g = memo.get(src);
      else { g = await grayPngDataURL(src); memo.set(src, g); }
      if (!g || !g.data) continue;
      const ok = await saveBakedTexture(key, g.data, g.w | 0, g.h | 0);   // 同步 EXT/DISK_TEX_KEYS/TEX_ON_DISK
      if (!ok) continue;
      r.gray = key;                             // 写成功才改，失败保留旧值
      n++;
    }
  }
  return n;
}

/* 导出侧守卫：知道磁盘索引的时候，只有确实存在的 Custom/ 灰图才写进 <grayPath>，
   避免导出指向「被重新生成删掉 / 迁移命名对不上」的悬空文件。 */
function grayKeyUsable(k) {
  if (!k) return false;
  if (!/^Custom\//.test(String(k))) return true;       // 非本模组贴图（原版/别的 mod）不判断
  if (!TEX_INDEX_LOADED || !TEX_ON_DISK.size) return true;   // 索引没加载成功时保持旧行为
  return texOnDisk(k);
}

async function migrateVariantGrays(c) {
  if (!c || !Array.isArray(c.colorVariants) || (!LOCAL_HTTP && !HOST)) return 0;
  let n = 0;
  const byUid = new Map((c.parts || []).map(p => [p.uid, p]));
  for (const v of c.colorVariants) {
    if (!v) continue;
    // t55-B3：迁移同样覆盖专属部位
    for (const uid of variantAllUids(v)) {
      const rec0 = variantRecOf(v, uid);
      if (!rec0) continue;
      let r = rec0;
      if (typeof rec0 === 'string') { r = { img: rec0 }; variantSetRec(v, uid, r, variantIsExtraUid(v, uid)); }   // 老项目里裸字符串形态
      if (!r.img) continue;                       // 没有异种贴图就不凭空造灰图
      const p = byUid.get(uid);
      if (p && p.raceOff) continue;               // 与渲染/导出保持同一口径
      const src = String(r.img);
      if (!/^Custom\//.test(src)) continue;
      const key = variantGrayKey(c, v, uid);      // t20：与 saveVariantTexture 完全一致的唯一 key 规则
      if (await textureLooksValid(key)) {         // 已在磁盘上：只补索引，重复调用不重写（幂等）
        if (DISK_TEX_KEYS) DISK_TEX_KEYS.add(key);
        try { TEX_ON_DISK.add(key); } catch (e) { }
        if (r.gray !== key) { r.gray = key; n++; }
        continue;
      }
      // 旧版迁移的 <部位>_Gray / 共享 Variant_Gray 命名语义错误（丢图片基名、多部位共用一张）：
      // 不再产生也不沿用，按 r.img 重新生成这个部位自己的灰图。
      const g = await grayPngDataURL(src);
      if (g && g.data) {
        const ok = await saveBakedTexture(key, g.data, g.w | 0, g.h | 0);
        if (ok) { r.gray = key; n++; continue; }
      }
      // 生成失败：保留原 r.gray（可能仍是旧 key），交由导出侧 grayKeyUsable 拦掉悬空路径
    }
  }
  return n;
}

async function migrateAllVariantGrays() {
  let n = 0;
  for (const c of (S.canvases || [])) {
    try { n += await migrateVariantGrays(c); } catch (e) { }
  }
  return n;
}

/* 旧版发光层图片在共享 Custom/<race>/Glow/ 下：迁移到每个异种自己的文件夹 */
function migrateGlowVariantPathsSync(c) {
  if (!c || !Array.isArray(c.colorVariants)) return 0;
  const raceDir = variantTextureFolder(c);
  let n = 0;
  for (const v of c.colorVariants) {
    if (!v || !v.gen || !v.parts) continue;
    const folder = variantNameFolder(v);
    for (const uid of Object.keys(v.parts)) {
      const r = v.parts[uid];
      if (!r || !r.img) continue;
      const m = /^Custom\/[^/]+\/Glow\/(left|right)_antennae_([A-Za-z0-9_-]+)$/.exec(String(r.img));
      if (!m) continue;
      r.img = 'Custom/' + raceDir + '/' + folder + '/' + m[1] + '_antennae_Glow';
      n++;
    }
  }
  return n;
}

async function migrateVariantPaths(c) {
  if (!c || !Array.isArray(c.colorVariants) || (!LOCAL_HTTP && !HOST)) return 0;
  const raceDir = variantTextureFolder(c);
  let n = 0;
  for (const v of c.colorVariants) {
    if (!v || !v.parts) continue;
    const folder = variantNameFolder(v);
    const prefix = 'Custom/' + raceDir + '/' + folder + '/';
    const byUid = new Map((c.parts || []).map(p => [p.uid, p]));
    for (const uid of Object.keys(v.parts)) {
      const r = v.parts[uid];
      if (!r || !r.img) continue;
      const src = String(r.img);
      if (!/^Custom\//.test(src)) continue;
      // 图片已经在磁盘上时先把索引补上，否则检查会一直报“不在磁盘”
      if (await textureLooksValid(src)) {
        if (DISK_TEX_KEYS) DISK_TEX_KEYS.add(src);
        try { TEX_ON_DISK.add(src); } catch (e) { }
      }
      if (src.indexOf(prefix) === 0) continue;
      const p = byUid.get(uid);
      const pname = String((p && (p.id || p.name)) || 'Part').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
      const bname = String(src.split('/').pop() || 'tex').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
      const newKey = prefix + pname + '_' + bname;
      try {
        if (!(await textureLooksValid(newKey))) {
          const data = await textureDataURL(src);
          if (data) {
            const d = imgDim(src);
            await saveBakedTexture(newKey, data, d[0] || 64, d[1] || 64);
          }
        }
        if (await textureLooksValid(newKey)) { r.img = newKey; n++; }
      } catch (e) { }
    }
  }
  return n;
}

async function saveVariantTexture(c, v, uid, src, autoCrop) {
  if (!c || !v || !src) return { img: src, gray: '' };
  const race = variantTextureFolder(c);
  const vname = variantNameFolder(v);
  const prefix = 'Custom/' + race + '/' + vname + '/';
  if (String(src).indexOf(prefix) === 0) {
    const old = variantPartRec(v, uid);
    return { img: src, gray: (old && old.gray) || '' };
  }
  let data = '';
  let cw = 0, chh = 0;
  if (autoCrop) {
    try {
      const cr = await cropAssetKey(src);
      if (cr && cr.data) { data = cr.data; cw = cr.w | 0; chh = cr.h | 0; }
    } catch (e) { }
  }
  try {
    const idx = artLoadIndex();
    if (!data && idx[src] && idx[src].d) data = idx[src].d;
  } catch (e) { }
  if (!data) {
    try {
      const u = imgURL(src);
      if (u) {
        const r = await fetch(u);
        const b = await r.blob();
        data = await fileToDataURL(b);
      }
    } catch (e) { }
  }
  if (!data) return { img: src, gray: '' };
  const part = (c.parts || []).find(p => p.uid === uid);
  const pname = String((part && (part.id || part.name)) || 'Part').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  const base = String(src).split('/').pop().replace(/\.[^.]+$/, '');
  const fname = pname + '_' + base.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  const key = prefix + fname;
  try {
    const ok = await apiSave('to=texture&key=' + encodeURIComponent(key), data);
    if (!ok) { toast('异种贴图保存失败：写入 Textures/Custom 失败', true); return { img: src, gray: '' }; }
    const dim = imgDim(src);
    const ow = cw || dim[0] || 64, oh = chh || dim[1] || 64;
    EXT.set(key, { url: data, w: ow, h: oh });
    try { const idx2 = artLoadIndex(); idx2[key] = { d: data, w: ow, h: oh, n: fname, cat: 'asset', group: '模组 · ' + race + ' · ' + vname, modKey: (c.race && c.race.defName) || race }; artSaveIndex(); } catch (e) { }

    // 同规则再保存一张灰度：同种族 / 同异种文件夹 / 文件名 + _Gray
    let grayKey = '';
    try {
      const g = await grayPngDataURL(key);
      if (g && g.data) {
        grayKey = 'Custom/NHTCD_Gray/' + customCatFor(c) + '/' + vname + '/' + fname + '_Gray';
        const gok = await apiSave('to=texture&key=' + encodeURIComponent(grayKey), g.data);
        if (gok) {
          EXT.set(grayKey, { url: g.data, w: g.w | 0, h: g.h | 0 });
          try { const idx3 = artLoadIndex(); idx3[grayKey] = { d: g.data, w: g.w | 0, h: g.h | 0, n: fname + '_Gray', cat: 'asset', group: '模组 · ' + race + ' · ' + vname, modKey: (c.race && c.race.defName) || race }; artSaveIndex(); } catch (e) { }
        } else grayKey = '';
      }
    } catch (e) { grayKey = ''; }

    if (DISK_TEX_KEYS) {
      DISK_TEX_KEYS.add(key);
      if (grayKey) DISK_TEX_KEYS.add(grayKey);
    }
    try { scheduleHarBadgeRefresh(); } catch (e) { }
    toast('异种贴图已保存：' + key + (grayKey ? '（含灰度）' : ''));
    return { img: key, gray: grayKey };
  } catch (e) {
    toast('异种贴图保存失败：' + e.message, true);
    return { img: src, gray: '' };
  }
}

/* t58：异种「+ 添加部位」——不是新建 BodyPartDef，而是从模组自带的部位里挑一个
   （决定游戏里画在哪个部位），再给这张画布起个显示名。显示名可重复，只用于编辑器里辨认。 */
function modalAddVariantPart() {
  const c = activeCanvas();
  const v = c && variantState(c);
  if (!v) { toast('先选一个异种', true); return; }
  if (!S.ui) S.ui = {};
  S.ui.addVpQ = '';
  S.ui.addVpSel = '';
  S.ui.addVpName = '';
  openModal(`<div style="width:min(620px,94vw)">
    <div class="modal__head"><span class="idx">ADD PART</span><h3>添加异种专属部位</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 8px">从模组自带的部位里选一个（决定游戏里画在哪个部位），再给这张画布起个显示名。显示名可以重复；同一个部位可以加多次。</p>
      <div class="libsearch" style="margin-bottom:8px">${icon('search')}<input class="inp inp--txt" id="vpPartQ" placeholder="搜索部位：耳朵 / tail / 尾巴 …" spellcheck="false"></div>
      <div id="vpPartList" style="max-height:min(46vh,380px);overflow:auto"></div>
      <div class="field" style="margin-top:10px"><label>显示名称</label>
        <div class="ctl"><input class="inp inp--txt" id="vpPartName" placeholder="留空则用部位 defName" spellcheck="false"></div></div>
      <p class="mini-note" id="vpPartErr" style="color:#e2483c;margin:6px 0 0"></p>
    </div>
    <div class="modal__foot"><button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--primary" data-act="variant-add-part-do">添加</button></div></div>`);
  renderAddVariantPartList();
}

function renderAddVariantPartList() {
  const box = document.getElementById('vpPartList');
  if (!box) return;
  const c = activeCanvas();
  const pool = partDefNamePool(c);
  const q = norm(String((S.ui && S.ui.addVpQ) || ''));
  const rows = [];
  pool.forEach((label, dn) => {
    if (q && norm(dn).indexOf(q) < 0 && norm(label).indexOf(q) < 0) return;
    rows.push([dn, label]);
  });
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  if (!rows.length) { box.innerHTML = '<p class="mini-note">没有匹配的部位</p>'; return; }
  const sel = (S.ui && S.ui.addVpSel) || '';
  box.innerHTML = rows.slice(0, 400).map(([dn, label]) =>
    `<button class="stack__row${dn === sel ? ' is-on' : ''}" data-act="variant-add-part-pick" data-dn="${esc(dn)}" title="${esc(dn)}">
       <b>${esc(dn)}</b><em>${esc(label || '')}</em></button>`).join('');
}

function variantAddPartCreate() {
  const c = activeCanvas();
  const v = c && variantState(c);
  if (!c || !v) { toast('先选一个异种', true); return; }
  const errEl = document.getElementById('vpPartErr');
  const dn = String((S.ui && S.ui.addVpSel) || '').trim();
  const pool = partDefNamePool(c);
  if (!dn) { if (errEl) errEl.textContent = '先在列表里选一个部位'; return; }
  if (!pool.has(dn)) { if (errEl) errEl.textContent = '这个部位不在模组自带的部位列表里'; return; }
  const nameEl = document.getElementById('vpPartName');
  const nm = String((nameEl && nameEl.value) || '').trim() || String(dn).split('_').pop();
  const nameMap = exportPartNameMap(c).nameMap;
  const baseUid = nameMap.get(dn);
  const base = ((c.parts || []).concat(c.detached || [])).find(p => p && p.uid === baseUid) || null;
  const uid = 've' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const rec = {
    uid, id: '', name: nm, defName: dn,
    img: (base && base.img) || '',
    gray: '',
    x: base && Number.isFinite(base.x) ? base.x : 0,
    y: base && Number.isFinite(base.y) ? base.y : 0,
    sx: base && Number.isFinite(base.sx) ? base.sx : 1,
    sy: base && Number.isFinite(base.sy) ? base.sy : 1,
    rot: (base && base.rot) || 0,
    flip: !!(base && base.flip),
    layer: Number.isFinite(base && base.layer) ? base.layer : 15,
    hb: base && Array.isArray(base.hb) ? base.hb.slice() : [0.9, 0.9],
    armor: !!(base && base.armor),
    group: (base && base.group) || '',
    bid: (base && base.bid) || 0,
    vis: base && base.vis ? Object.assign({}, base.vis) : undefined,
    source: 'variant-extra',
    kind: 'custom',
  };
  pushHistory();
  variantExtraMap(v)[uid] = rec;
  closeModal();
  try { renderVariantPane(); renderAll(); } catch (e) { }
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
  try { select(uid); } catch (e) { }
  toast('已添加「' + nm + '」→ ' + dn + '，可在右侧替换贴图 / 调坐标');
}

function variantPickModal(uid, isNew) {
  variantPickUid = uid;
  // t52：从「+ 添加部位」进来时，选完图要新建一条异种专属记录（而不是覆盖基础部位）
  variantPickNew = !!isNew;
  variantPickQ = '';
  variantPickCat = 'all';
  variantPickCrop = !!(S.settings && S.settings.autoCrop);
  openModal(`<div style="width:min(760px,94vw)">
    <div class="modal__head"><span class="idx">PICK</span><h3>选择异种贴图</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <div class="vpbar">
        <div class="libsearch">${icon('search')}<input class="inp inp--txt" id="vpQ" data-vp-q="1" placeholder="搜索贴图：耳朵 / tail / wing …" spellcheck="false"></div>
        <select class="inp vpcat" id="vpCat" title="分类">${VP_CATS.map(([k, l]) => `<option value="${k}"${variantPickCat === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <label class="vpcrop" title="开启后选中的贴图会先裁掉透明边，再保存到这个异种的文件夹"><input type="checkbox" id="vpCrop" ${variantPickCrop ? 'checked' : ''}>自动裁剪</label>
      </div>
      <div id="varPickBody" class="vppickbody">${variantPickBodyHTML()}</div>
    </div></div>`);
}

let hairPickHideAhoge = true;
let hairPickHideBack = true;
let hairPickSort = 'default';

function hairPickNum(x) {
  const m = String((x && (x.n || x.p)) || '').match(/(\d+)/);
  return m ? Number(m[1]) : 999999;
}

function hairPickData() {
  const list = [];
  const seen = new Set();
  const sigs = new Set();
  const sigOf = (p, n) => {
    const clean = String(p || '').replace(/\.png$/i, '');
    const parts = clean.split('/');
    const base = String(n || parts[parts.length - 1] || '').replace(/^Hair_?/i, '');
    return norm(base) + '|' + parts.slice(-4, -1).join('/');
  };
  const groupOf = h => displayGroupName(h.g || h.modKey || h.mod || '').replace(/^模组\s*·\s*/, '');
  const add = (p, n, g, aFlag, bFlag) => {
    if (!p || seen.has(p)) return;
    const sig = sigOf(p, n);
    if (sigs.has(sig)) return;
    seen.add(p);
    sigs.add(sig);
    const hb = !!bFlag || !!findBackHair(p);
    const ha = !!aFlag || !!ahogeKeyOf(p);
    list.push({ p, n, m: groupOf({ g, modKey: g }), a: !!aFlag, b: !!bFlag, hb, ha });
  };
  (typeof HAIRS !== 'undefined' ? HAIRS : []).forEach(h => {
    if (!h || !h.p) return;
    const n = h.n || h.p.split('/').pop();
    add(h.p, n, h.g || h.modKey || h.mod || '', !!h.a || /ahoge|uppermore/i.test(h.p),
      !!h.b || /(^|[\/_-])lower([\/_-]|$)/i.test(h.p) || /(^|[\/_-])hair[_-]?back([\/_-]|$)/i.test(h.p) || /backhair/i.test(h.p));
  });
  ASSETS.forEach(a => {
    if (!a || !a.p) return;
    if (!/hair/i.test(a.p) && !/hair/i.test(a.n || '')) return;
    add(a.p, a.n || a.p.split('/').pop(), a.g || a.modKey || a.mod || '',
      /ahoge|uppermore/i.test(a.p), /(^|[\/_-])lower([\/_-]|$)/i.test(a.p) || /(^|[\/_-])hair[_-]?back([\/_-]|$)/i.test(a.p) || /backhair/i.test(a.p));
  });
  return list.filter(x => {
    if (hairPickHideAhoge && x.a) return false;
    if (hairPickHideBack && x.b) return false;
    return true;
  });
}

function hairPickBodyHTML() {
  const items = hairPickData();
  if (!items.length) return '<p class="mini-note" style="padding:10px">没有符合当前筛选的发型。</p>';
  const groups = new Map();
  items.forEach(x => {
    const key = x.m || '其它';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(x);
  });
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  return ordered.map(([mod, arr]) => {
    let rows = arr.slice();
    if (hairPickSort === 'asc') rows.sort((a, b) => hairPickNum(a) - hairPickNum(b) || String(a.n).localeCompare(String(b.n)));
    if (hairPickSort === 'desc') rows.sort((a, b) => hairPickNum(b) - hairPickNum(a) || String(a.n).localeCompare(String(b.n)));
    return `<details class="fold">
      <summary>${esc(mod)} <span style="opacity:.6">（${rows.length}）</span></summary>
      <div class="grid">${rows.slice(0, 300).map(x => `
        <button class="tile tile--hair" data-act="hair-prev-set" data-p="${esc(x.p)}" title="${esc(x.p)}">
          <span class="tile__img"><i style="background-image:url('${imgURL(x.p)}')"></i></span>
          <b>${esc(upperFirst(x.n))}</b>
          ${(x.hb || x.ha) ? `<span class="hair-badges">${x.hb ? '<em class="hb hb--b" title="有后脑层">B</em>' : ''}${x.ha ? '<em class="hb hb--d" title="有呆毛">D</em>' : ''}</span>` : ''}
        </button>`).join('')}</div>
    </details>`;
  }).join('') + '<p class="mini-note" style="margin:6px 0 0">每组最多显示 300 张；可用上方导入更多，或按名称搜索。</p>';
}

function renderHairPickBody() {
  const box = document.getElementById('hairPickList');
  if (box) box.innerHTML = hairPickBodyHTML();
}

function closeHairPickFloat() {
  const el = document.getElementById('hairPickFloat');
  if (el) el.remove();
}

function openHairPickModal() {
  const c = activeCanvas(); if (!c) return;
  const old = document.getElementById('hairPickFloat');
  if (old) { old.remove(); return; }
  if (!hairPickData().length && !(typeof HAIRS !== 'undefined' && HAIRS.length)) {
    toast('素材库/发型里还没有贴图，先「导入发型」或「导入素材」', true);
    return;
  }
  const html = `
  <div id="hairPickFloat" class="hpfloat">
    <div class="hpfloat__bar" id="hairPickBar">
      <span class="idx">HAIR</span><b>选择预览头发</b>
      <i>拖动标题移动 · 拖右下角缩放</i>
      <button class="iconbtn x" data-act="hair-pick-close" title="关闭">${icon('x')}</button>
    </div>
    <div class="hpfloat__body">
      <p class="mini-note">按模组分组。点一张贴图作为编辑器里的头发预览；窗口不会挡住画布，可随时拖动/缩放。</p>
      <div class="rowline" style="margin:0 0 7px;gap:7px;align-items:center;flex-wrap:wrap">
        <button class="btn btn--sm" data-act="hair-import">${icon('plus')}导入模组发型…</button>
        <label class="hpick-chk"><input type="checkbox" id="hpHideAhoge" ${hairPickHideAhoge ? 'checked' : ''}>隐藏呆毛</label>
        <label class="hpick-chk"><input type="checkbox" id="hpHideBack" ${hairPickHideBack ? 'checked' : ''}>隐藏后脑层</label>
        <label class="hpick-chk">排序
          <select class="inp hpick-sort" id="hpSort">
            <option value="default"${hairPickSort === 'default' ? ' selected' : ''}>默认</option>
            <option value="asc"${hairPickSort === 'asc' ? ' selected' : ''}>数值 ↑</option>
            <option value="desc"${hairPickSort === 'desc' ? ' selected' : ''}>数值 ↓</option>
          </select>
        </label>
      </div>
      <div id="hairPickList">${hairPickBodyHTML()}</div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  const box = document.getElementById('hairPickFloat');
  const bar = document.getElementById('hairPickBar');
  const vw = window.innerWidth, vh = window.innerHeight;
  box.style.width = Math.min(640, Math.max(380, vw * 0.42)) + 'px';
  box.style.height = Math.min(760, Math.max(420, vh * 0.74)) + 'px';
  let d = null;
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const r = box.getBoundingClientRect();
    d = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    try { bar.setPointerCapture(e.pointerId); } catch (err) { }
  });
  bar.addEventListener('pointermove', e => {
    if (!d) return;
    e.preventDefault();
    const w = box.offsetWidth, h = box.offsetHeight;
    const x = Math.max(4, Math.min(window.innerWidth - w - 4, e.clientX - d.dx));
    const y = Math.max(4, Math.min(window.innerHeight - 40, e.clientY - d.dy));
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.right = 'auto';
    box.style.bottom = 'auto';
  });
  const end = () => { d = null; };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
}


function normalizeHairFlags() {
  (typeof HAIRS !== 'undefined' ? HAIRS : []).forEach(h => {
    if (!h || !h.p) return;
    if (/(^|[\/_-])lower([\/_-]|$)/i.test(h.p)) h.b = true;
  });
}

function renderHairPane() {
  const pane = document.getElementById('paneHair');
  try { scanSavedHairAssets(); } catch (e) { }
  if (!pane) return;
  const c = activeCanvas();
  if (!c) {
    pane.innerHTML = '<p class="mini-note" style="padding:14px">先在左边选一张画布。</p>';
    return;
  }
  normalizeHairFlags();
  const head = `<div class="selhead"><div class="selhead__badge">${esc(String(c.doll || '').slice(0, 1).toUpperCase())}</div>
    <div class="selhead__t"><b>${esc(c.title || '')}</b><span>${esc(c.doll || '')} · 发型显示设置</span></div></div>`;
  pane.classList.add('is-hair');
  pane.innerHTML = head + (typeof hairSectionHTML === 'function' ? hairSectionHTML(c) : '') + hairStatusHTML(c);
  try { lockVanillaHairControls(c, pane); } catch (e) { }
}

function renderTabs() {
  $$('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.tab === S.tab));
  try {
    const sel = selPart();
    const tp = document.getElementById('tabPart');
    if (tp) tp.classList.toggle('is-off', !sel);
  } catch (e) { }
  $('#paneInspect').hidden = !(S.tab === 'inspect' || S.tab === 'global');
  $('#paneHair').hidden = S.tab !== 'hair';
  $('#paneAssets').hidden = S.tab !== 'assets';
  $('#paneVariant').hidden = S.tab !== 'variant';
  $('#panePatch').hidden = S.tab !== 'patch';
  if (S.tab === 'hair') { try { renderHairPane(); } catch (e) { } }
  try { renderRefDock(); } catch (e) { }
  if (S.tab === 'assets') renderLibrary();
  if (S.tab === 'variant') renderVariantPane();
  if (S.tab === 'patch') renderPatch();
  if (S.tab === 'inspect' || S.tab === 'global') renderInspector();
}

/* ==========================================================================
   validation
   ========================================================================== */
/* NHT defs have no rotation field, so a tilted part must carry the tilt in its own png:
   draw the art rotated into a new texture, point the part at it and zero the angle */
async function bakeRotation(p) {
  if (!p || !p.img || Math.abs(p.rot || 0) < 0.01) return;
  const im = await loadTextureEl(p.img);
  if (!im) { toast('贴图读不出来，没法烘焙', true); return; }
  const w = im.naturalWidth || 1, h = im.naturalHeight || 1;
  const a = ((p.rot || 0) * Math.PI) / 180;
  const nw = Math.ceil(Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)));
  const nh = Math.ceil(Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a)));
  const c = document.createElement('canvas');
  c.width = nw; c.height = nh;
  const g = c.getContext('2d');
  g.translate(nw / 2, nh / 2);
  g.rotate(a);
  g.drawImage(im, -w / 2, -h / 2);
  let url;
  try { url = c.toDataURL('image/png'); } catch (e) { toast('烘焙失败：' + e.message, true); return; }
  const name = String(p.img).split('/').pop() + '_r' + Math.round(p.rot);
  const key = 'Custom/Rot/' + name;
  CUSTOM.set(key, { data: url, w: nw, h: nh });
  PENDING_CUSTOM.add(key);
  let onDisk = false;
  try { onDisk = await apiSave('to=texture&key=' + encodeURIComponent(key), url); } catch (e) { onDisk = false; }
  if (onDisk) EXT.set(key, { url, w: nw, h: nh });
  // keep it in the project so a refresh (and a project export) still has the baked art
  const rec = { p: key, n: name, w: nw, h: nh, data: url, cat: 'mine', custom: true, disk: onDisk };
  const at = (S.customAssets || []).findIndex(a => a.p === key);
  if (at >= 0) S.customAssets[at] = rec; else (S.customAssets = S.customAssets || []).push(rec);
  registerCustomAsset(rec);
  const kx = w / nw, ky = h / nh;
  const sx = p.sx * kx, sy = p.sy * ky;
  if (p.hbox && p.hbox.w > 0) {
    p.hbox = {
      dx: round(p.hbox.dx * kx, 1), dy: round(p.hbox.dy * ky, 1),
      w: Math.max(4, round(p.hbox.w * kx, 1)), h: Math.max(4, round(p.hbox.h * ky, 1)),
    };
    // t30：烘焙旋转后尺寸变化同样要走上限守卫
    clampHitboxToVis(p);
    syncHbFromBox(p);
  }
  p.img = key;
  p.sx = sx; p.sy = sy;
  p.rot = 0;
  p.custom = true;
  delete p.grayImg;
  select(p.uid);
  persist();
  try { saveAllCanvasFiles(true); } catch (e) { }
  renderStage(); renderInspector(); renderLibrary(); pushHistory();
  toast('已烘焙：新贴图 ' + nw + '×' + nh + '，角度归零' + (onDisk ? '，已保存到 Textures/Custom/Rot' : '（尚未写盘，保存素材时会写入）'));
}
/* every doll uses the same in-game canvas as the stock bodies (512×1024, the outline artwork
   the mod stretches into each doll). No special case for race canvases: a race part that
   lands outside this box would be clipped in game exactly like a stock one. */
function gameCanvasOf(c) {
  // NHT fits the doll's <BoundingBox> into the tab, so the box itself is the visible area:
  // anything drawn outside it is cropped in game.
  const b = c && c.bounds;
  if (b && b.w > 1 && b.h > 1) {
    return { x: b.x, y: b.y, w: b.w, h: b.h, how: '边界映射', doll: c.doll };
  }
  const bt = D.bodytypes.find(b2 => (b2.outlineW || 0) > 1 && (b2.outlineH || 0) > 1);
  const w = bt ? bt.outlineW : 512, h = bt ? bt.outlineH : 1024;
  return { x: -w / 2, y: -h / 2, w, h, how: '原版画布', doll: (c && c.doll) || 'Male' };
}

function overflowParts(c, which) {
  const g = (which === 'display')
    ? (c && c.displayBox && c.displayBox.w > 1 && c.displayBox.h > 1 ? c.displayBox : null)
    : gameCanvasOf(c);
  if (!g) return { box: null, list: [] };
  const list = [];
  c.parts.forEach(p => {
    if (p.vis === false || isWindowOnly(p)) return;
    // artwork routinely bleeds past the canvas (the stock dolls do too), so only the
    // part's anchor point matters: that is what the def's <position> stores
    const ex = 0, ey = 0;
    const over = {
      left: (p.x - ex) < g.x,
      right: (p.x + ex) > g.x + g.w,
      top: (p.y - ey) < g.y,
      bottom: (p.y + ey) > g.y + g.h
    };
    if (over.left || over.right || over.top || over.bottom) list.push({ p, over });
  });
  return { box: g, list };
}


/* ---------------- 模组 Textures 已有贴图清单 ---------------- */
const TEX_ON_DISK = new Set();
let TEX_INDEX_LOADED = false;
async function loadTexIndex() {
  if (!LOCAL_HTTP) { TEX_INDEX_LOADED = true; return; }
  try {
    const r = await fetch('/__texindex', { cache: 'no-store' });
    const j = await r.json();
    TEX_ON_DISK.clear();
    (j && j.keys ? j.keys : []).forEach(k => TEX_ON_DISK.add(String(k)));
    TEX_INDEX_LOADED = true;
  } catch (e) { TEX_INDEX_LOADED = true; }
}
function texOnDisk(key) {
  if (!key) return false;
  if (TEX_ON_DISK.has(key)) return true;
  // 有些贴图导出成 _south 异种，两个都算
  return TEX_ON_DISK.has(String(key).replace(/_south$/, ''));
}

function validateAll() {
  const out = [];
  const rjwBids = new Set(RJW_PARTS.map(p => p.bid));
  S.canvases.forEach(c => {
    const b = c.bounds;
    if (!c.parts.length) out.push({ lv: 'warn', msg: `画布「${c.title}」还没有任何部位。` });
    const ids = new Map();
    c.parts.forEach(p => {
      if (p.bid >= 0) ids.set(p.bid, (ids.get(p.bid) || 0) + 1);
      if (!p.img) out.push({ lv: 'warn', msg: `${c.title} · ${p.name}：还没有选贴图（不会导出）。` });
      else if (String(p.img).indexOf('Custom/') === 0) {
        if (!texOnDisk(p.img)) out.push({ lv: 'warn', msg: `${c.title} · ${p.name}：使用本机素材（还没在模组 Textures 里），注入时会自动推送；手动导出时需要把 PNG 放到 Textures/${p.img}.png` });
      }
      else if (!imgURL(p.img) || imgURL(p.img) === MISSING_IMG) out.push({ lv: 'error', msg: `${c.title} · ${p.name}：贴图缺失（${p.img}）。` });
      if (p.sx <= 0 || p.sy <= 0) out.push({ lv: 'error', msg: `${c.title} · ${p.name}：缩放不能为 0。` });
      if (!isWindowOnly(p) && (p.x < b.x || p.x > b.x + b.w || p.y < b.y || p.y > b.y + b.h))
        out.push({ lv: 'warn', msg: `${c.title} · ${p.name}：中心点 (${Math.round(p.x)}, ${Math.round(p.y)}) 在画布边界之外。` });
      if (p.custom && p.bid < 0) out.push({ lv: 'info', msg: `${c.title} · ${p.name}：自定义部位未绑定部位序号，需在 BodyDef 中新增对应部位。` });
      // the defs have no rotation field: a tilted part loses its angle in game
      if (Math.abs(p.rot || 0) > 0.01)
        out.push({ lv: 'warn', msg: `${c.title} · ${p.name}：旋转 ${round(p.rot, 1)}° 不会写进 Defs（模组没有旋转字段），游戏里会按未旋转显示 —— 用属性面板的「把旋转烘焙进贴图」。` });
    });
    const byBid = new Map();
    c.parts.forEach(p => {
      if (p.bid < 0) return;
      if (!byBid.has(p.bid)) byBid.set(p.bid, []);
      byBid.get(p.bid).push(p);
    });
    ids.forEach((n, id) => {
      if (n <= 1) return;
      const group = byBid.get(id) || [];
      // RJW 故意复用序号；整组都是 RJW 标记时不算问题
      if (rjwBids.has(id) || group.every(p => p.source === 'rjw')) return;
      const names = group.map(p => p.name).slice(0, 4).join('、');
      out.push({ lv: 'warn', msg: `${c.title}：部位序号 #${id} 被 ${n} 个部位共用（${names}）——除尾巴等“盖在躯干槽位”的刻意做法外，应该改回各自槽位。` });
    });
    const e = partsExtent(c);
    const src = D.bodytypes.find(bt => bt.doll === c.doll);
    const untouched = !!src && Math.abs(src.bounds[0] - b.x) < 1 && Math.abs(src.bounds[1] - b.y) < 1
      && Math.abs(src.bounds[2] - b.w) < 1 && Math.abs(src.bounds[3] - b.h) < 1;
    if (e && !untouched && (Math.abs(e.x - b.x) > 8 || Math.abs(e.y - b.y) > 8 || Math.abs(e.w - b.w) > 8 || Math.abs(e.h - b.h) > 8))
      out.push({ lv: 'info', msg: `${c.title}：边界与部位外接框不一致（外接框 ${Math.round(e.w)}×${Math.round(e.h)}），可在画布属性中一键适配。` });
    if (c.kind === 'race' && !(c.race && c.race.defName) && !c.xenotype) out.push({ lv: 'info', msg: `${c.title}：种族画布还没有填写种族 defName。` });
    const rj = c.parts.filter(p => p.source === 'rjw');
    if (c.rjw && !rj.length) out.push({ lv: 'warn', msg: `${c.title}：RJW 开关是打开的，但画布上没有 RJW 部位。` });
    if (rj.length && !RJW_BY_DOLL.has(c.doll)) out.push({ lv: 'info', msg: `${c.title}：RJW 部位会以 DollName「${c.doll}」新增，坐标借自 ${rjwSourceDoll(c)}。` });
    if (rj.length && !rj.some(p => p.vis) && c.rjw) out.push({ lv: 'info', msg: `${c.title}：所有 RJW 部位都被隐藏了。` });

    /* ---- 头发相关 ---- */
    const fitOn = !!(c.hairFitEnabled || c.hairFitUseWhenOff);
    const anyAbove = c.parts.some(p => !p.raceOff && p.overHair && p.img);
    if (anyAbove && !fitOn) {
      out.push({ lv: 'warn', msg: `${c.title}：有部位开了「置顶重画」，但「导出发型坐标」是关的 → 补丁里不会有 aboveParts，游戏里置顶重画不生效。` });
    }
    if (fitOn && !c.hairFit) {
      out.push({ lv: 'warn', msg: `${c.title}：开了「导出发型坐标」但还没填缩放 / 偏移，会按 0.78 / -0.21 的默认值导出（头发会偏大偏下）。` });
    }
    if (c.hairFit && Number(c.hairFit.layer) > 29) {
      out.push({ lv: 'warn', msg: `${c.title}：头发层级 ${c.hairFit.layer} 超出 0–29，导出时会按 29 处理。` });
    }
    if (c.hairPreviewImg && (!imgURL(c.hairPreviewImg) || imgURL(c.hairPreviewImg) === MISSING_IMG)) {
      out.push({ lv: 'error', msg: `${c.title}：头发预览贴图缺失（${c.hairPreviewImg}）。` });
    }
    if (c.hairTintShow === false) {
      out.push({ lv: 'info', msg: `${c.title}：发色预览已隐藏（只影响编辑器，不影响导出）。` });
    }

    /* ---- 部位细节 ---- */
    c.parts.forEach(p => {
      if (!p.img) return;
      if (p.layer < 0 || p.layer > 29) {
        out.push({ lv: 'warn', msg: `${c.title} · ${p.name}：图层 ${p.layer} 超出 0–29，会被夹到边界值。` });
      }
      const hbW = Math.abs(Number(p.hb && p.hb[0]) || 1), hbH = Math.abs(Number(p.hb && p.hb[1]) || 1);
      if (hbW < 0.05 || hbH < 0.05) {
        out.push({ lv: 'warn', msg: `${c.title} · ${p.name}：判定框太小（${hbW.toFixed(2)}×${hbH.toFixed(2)}），游戏里几乎点不到。` });
      }
      if (p.overHair && !p.img) {
        out.push({ lv: 'info', msg: `${c.title} · ${p.name}：开了置顶重画但没有贴图。` });
      }
    });

    /* ---- 种族槽位对齐 ---- */
    if (c.kind === 'race' && c.race && !c.race.nhtIndexed && (c.race.bodyParts || []).length) {
      out.push({ lv: 'info', msg: `${c.title}：部位编号还没按 NHT 槽位对齐过，建议点「全局 → 按对照表修正编号」再导出。` });
    }
    if (!String(c.title || '').trim()) out.push({ lv: 'error', msg: '有画布还没填名字。' });
    if (!String(c.doll || '').trim()) out.push({ lv: 'error', msg: `画布「${c.title || '(未命名)'}」没有 Doll defName，导出会失败。` });
    // clipped in game: the art rectangle leaves the outline canvas
    const ov = overflowParts(c, 'display');
    if (ov.box && ov.list.length) {
      const names = ov.list.slice(0, 4).map(o => o.p.name).join('、');
      const dirs = new Set();
      ov.list.forEach(o => Object.keys(o.over).forEach(k => o.over[k] && dirs.add(k)));
      const dirLabel = { left: '左', right: '右', top: '上', bottom: '下' };
      out.push({
        lv: 'warn',
        msg: `${c.title}：${ov.list.length} 个部位超出实际显示框 ${round(ov.box.w, 0)}×${round(ov.box.h, 0)}（${[...dirs].map(d => dirLabel[d]).join('/')}边缘），NHT 面板里可能显示不全：${names}${ov.list.length > 4 ? ' 等' : ''}。`
      });
    }
  });
  const dolls = new Map();
  S.canvases.forEach(c => dolls.set(c.doll, (dolls.get(c.doll) || 0) + 1));
  dolls.forEach((n, d) => { if (n > 1) out.push({ lv: 'warn', msg: `Doll defName「${d}」被 ${n} 个画布共用，导出补丁时会互相覆盖。` }); });
  const titleCount = new Map();
  S.canvases.forEach(c => titleCount.set(String(c.title || ''), (titleCount.get(String(c.title || '')) || 0) + 1));
  titleCount.forEach((n, t2) => { if (n > 1 && t2) out.push({ lv: 'info', msg: `画布名字「${t2}」用了 ${n} 次，导出文件名可能重复。` }); });
  const order = { error: 0, warn: 1, info: 2 };
  out.sort((a, b2) => order[a.lv] - order[b2.lv]);
  return out.slice(0, 40);
}



/* ==========================================================================
   Git 画布书签：读取仓库里 Editor/canvases 最近 3 个版本的画布，可预览 / 应用 / 撤销
   ========================================================================== */
const GMK = { loaded: false, loading: false, open: false, versions: null, openRev: null, applied: {}, err: null, hasNew: false, newCount: 0 };

function gmkHTML() {
  return `<button class="gmk__tab" data-act="gmk-toggle" title="Git 画布书签：看看最近推送过的画布版本，可一键应用或撤销">
      <svg viewBox="0 0 16 16"><path fill="currentColor" d="M3 2h8a1 1 0 0 1 1 1v11l-4.5-2.6L3 14V3a1 1 0 0 1 1-1z"/></svg>
      <span class="gmk__label">GIT</span>
      <span class="gmk__title">GIT 画布书签</span>
    </button>
    <div class="gmk__panel" id="gmkPanel" hidden></div>`;
}

function gmkMount() {
  const panel = document.querySelector('.panel--cvs');
  if (!panel || document.getElementById('gitBookmark')) return;
  const wrap = document.createElement('div');
  GMK.open = false;   // 默认折叠：只有手动点开才展开
  wrap.className = 'gmk';
  wrap.id = 'gitBookmark';
  wrap.innerHTML = gmkHTML();
  panel.appendChild(wrap);
}

function gmkVersionLabel(v) {
  return (v.date || '').slice(0, 16) || (v.rev || '').slice(0, 7);
}

function gmkParse(file) {
  try { return JSON.parse(file.text); } catch (e) { return null; }
}


/* 临时查看 Git 画布时，顶部显示提示条 */
function syncGmkViewBar() {
  let bar = document.getElementById('gmkViewBar');
  if (S.preview) {
    const meta = S.preview.meta || {};
    const cv = S.preview.canvas || {};
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'gmkViewBar';
      bar.className = 'gmkview is-preview';
      document.body.appendChild(bar);
    }
    const act = meta.kind === 'trash'
      ? `<button class="gmkview__x" data-act="trash-restore" data-trid="${esc(meta.trashId || '')}" title="把这个画布放回项目">还原</button>`
      : `<button class="gmkview__x" data-act="gmk-apply-preview" title="把这版画布写入项目（可编辑）">应用</button>`;
    bar.innerHTML = `<span class="gmkview__ico">只读</span>
      <span>预览${meta.kind === 'trash' ? '（最近改动）' : '（Git 版本）'}：<b>${esc(cv.title || '')}</b> · ${(cv.parts || []).length} 部位</span>
      ${act}
      <button class="gmkview__x" data-act="gmk-exit" title="关闭预览">返回</button>`;
    return;
  }
  if (!S.viewOnly) { if (bar) bar.remove(); return; }
  const cv = S.canvases.find(c => c.id === S.viewOnly);
  if (!cv) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'gmkViewBar';
    bar.className = 'gmkview';
    document.body.appendChild(bar);
  }
  bar.className = 'gmkview';
  bar.innerHTML = `<span class="gmkview__ico">GIT</span>
    <span>正在查看 Git 画布：<b>${esc(cv.title || '')}</b></span>
    <button class="gmkview__x" data-act="gmk-exit" title="退出临时查看，回到原来的画布">返回</button>`;
}

function gmkRender() {
  const wrap = document.getElementById('gitBookmark');
  if (!wrap) return;
  wrap.classList.toggle('is-open', !!GMK.open);
  wrap.classList.toggle('has-new', !!GMK.hasNew && !GMK.open);
  try { syncGmkViewBar(); } catch (e) { }
  const panel = document.getElementById('gmkPanel');
  if (!panel) return;
  if (!GMK.open) { panel.hidden = true; return; }
  panel.hidden = false;
  if (GMK.loading) { panel.innerHTML = '<div class="gmk__empty">正在读取仓库里的画布版本…</div>'; return; }
  if (GMK.err) { panel.innerHTML = `<div class="gmk__empty">读取失败：${esc(GMK.err)}</div>`; return; }
  const vers = GMK.versions || [];
  if (!vers.length) {
    panel.innerHTML = `<div class="gmk__h"><b>Git 画布书签</b><span class="n">0 个版本</span></div>
      <div class="gmk__empty">仓库里还没有画布的历史版本。<br>先在「仓库同步 REPO」推送一次画布，这里就会出现最近 3 个版本。</div>`;
    return;
  }
  const body = vers.map((v, i) => {
    const open = GMK.openRev ? GMK.openRev === v.rev : i === 0;
    const cards = (v.files || []).filter(f => f.rel !== 'index.json' && f.rel.indexOf('.backup/') < 0).map(f => {
      const c = gmkParse(f);
      const key = v.rev + ':' + f.rel;
      const appliedRec = GMK.applied[key];
      const isApplied = !!appliedRec;
      const isStale = !!(appliedRec && appliedRec.stale);
      const title = c ? (c.title || f.rel) : f.rel;
      const doll = c ? c.doll : '';
      const n = c && c.parts ? c.parts.length : 0;
      const isRace = c && c.kind === 'race';
      return `<div class="gmkc${isApplied ? ' is-applied' : ''}${isStale ? ' is-stale' : ''}" data-gmkkey="${esc(key)}" data-act="gmk-card" data-rev="${esc(v.rev)}" data-rel="${esc(f.rel)}" title="点击打开这版画布，像普通画布一样编辑部位">
          <div class="cv__fig gmkc__fig" data-gmkfig="${esc(key)}"></div>
          <div class="gmkc__body">
          <div class="gmkc__top"><b>${esc(title)}</b>
            <button class="gmk__btn${isApplied ? (isStale ? ' is-stale' : ' is-undo') : ''}" data-act="gmk-apply" data-rev="${esc(v.rev)}" data-rel="${esc(f.rel)}"${isStale ? ' disabled' : ''}
              title="${isStale ? '已被更新的版本替代' : (isApplied ? '撤销：恢复到应用之前的画布' : '应用：有同名画布就替换，没有就作为游离画布加入')}">${isStale ? '已替代' : (isApplied ? '撤销' : '应用')}</button>
          </div>
          <div class="gmkc__line"><span>${esc(doll)} · ${n} 部位</span>
            <span class="tags">${isRace ? '<span class="cv__tag">RACE</span>' : '<span class="cv__tag">MOD</span>'}</span>
          </div>
          </div>
        </div>`;
    }).join('');
    return `<div class="gmkv">
        <div class="gmkv__h" data-act="gmk-fold" data-rev="${esc(v.rev)}">
          <span class="gmkv__chev">${open ? '▾' : '▸'}</span>
          <b>${esc(gmkVersionLabel(v))}</b>
          <span class="gmkv__sha">${esc((v.rev || '').slice(0, 7))}</span>
          <span class="gmkv__n">${(v.files || []).length} 张</span>
        </div>
        <div class="gmkv__items${open ? '' : ' is-shut'}">${cards || '<div class="gmk__empty">这个提交里没有画布文件</div>'}</div>
      </div>`;
  }).join('');
  panel.innerHTML = `<div class="gmk__h"><b>Git 画布书签</b><span class="n">最近 ${vers.length} 个版本</span></div>${body}`;
  try { syncGmkViewBar(); } catch (e) { }
  try {
    vers.forEach(v => {
      (v.files || []).forEach(f => {
        if (f.rel === 'index.json') return;
        const key = v.rev + ':' + f.rel;
        const box = panel.querySelector(`[data-gmkfig="${CSS.escape(key)}"]`);
        if (!box) return;
        const cv = gmkParse(f);
        if (!cv) return;
        box.innerHTML = '';
        try { paintMini(box, cv); } catch (e) { }
        // 贴图是异步解码的：稍后重画一次，避免缩略图空白
        [300, 900, 1800].forEach(ms => setTimeout(() => {
          try { if (box.isConnected) { box.innerHTML = ''; paintMini(box, cv); } } catch (e) { }
        }, ms));
      });
    });
  } catch (e) { }
}


const GMK_SEEN_KEY = 'nht.gmk.seen';

function gmkSeen() { try { return localStorage.getItem(GMK_SEEN_KEY) || ''; } catch (e) { return ''; } }
function gmkMarkSeen() {
  const v = (GMK.versions || [])[0];
  if (!v) return;
  try { localStorage.setItem(GMK_SEEN_KEY, v.rev || ''); } catch (e) { }
  GMK.hasNew = false; GMK.newCount = 0;
  gmkRender();
}

async function gmkCheckNew() {
  try {
    const g = ensureGitSettings();
    const r = await fetch('/__gitcanvases?dir=' + encodeURIComponent(g.dir), { cache: 'no-store' });
    const j = await r.json();
    if (!j || !j.ok) return;
    GMK.versions = j.commits || [];
    GMK.loaded = true;
    const seen = gmkSeen();
    let count = 0;
    for (const v of GMK.versions) {
      if (v.rev === seen) break;
      count++;
    }
    // 第一次打开（没有已读记录）也算有新画布，这样刚拉取下来就能看到提醒
    GMK.hasNew = count > 0;
    GMK.newCount = count;
    gmkRender();
  } catch (e) { }
}

async function gmkLoad() {
  GMK.loading = true; GMK.err = null; gmkRender();
  try {
    const g = ensureGitSettings();
    const r = await fetch('/__gitcanvases?dir=' + encodeURIComponent(g.dir), { cache: 'no-store' });
    const j = await r.json();
    if (!j || !j.ok) { GMK.err = (j && j.error) || '读取失败'; GMK.versions = []; }
    else GMK.versions = j.commits || [];
  } catch (e) {
    GMK.err = e && e.message; GMK.versions = [];
  }
  GMK.loading = false; GMK.loaded = true; gmkRender();
}

async function gmkToggle() {
  GMK.open = !GMK.open;
  if (GMK.open && !GMK.loaded) await gmkLoad();
  if (GMK.open) gmkMarkSeen();
  gmkRender();
}

function gmkFind(rev, rel) {
  const v = (GMK.versions || []).find(x => x.rev === rev);
  const f = v && (v.files || []).find(x => x.rel === rel);
  return f ? { ver: v, file: f, canvas: gmkParse(f) } : null;
}

function gmkApply(rev, rel) {
  const hit = gmkFind(rev, rel);
  if (!hit || !hit.canvas) { toast('这版画布内容解析失败', true); return; }
  const key = rev + ':' + rel;
  if (GMK.applied[key] && !GMK.applied[key].stale) { gmkUndo(rev, rel); return; }

  const c = JSON.parse(JSON.stringify(hit.canvas));
  const existing = S.canvases.find(x => x.doll === c.doll && (x.kind || '') === (c.kind || '')) || S.canvases.find(x => x.id === c.id);

  if (existing) {
    Object.keys(GMK.applied).forEach(k => {
      const st = GMK.applied[k];
      if (k !== key && st && st.canvasId === existing.id) st.stale = true;
    });
    pushTrash(existing, '替换');
    GMK.applied[key] = { mode: 'replace', canvasId: existing.id, doll: c.doll, prev: JSON.parse(JSON.stringify(existing)) };
    const idx = S.canvases.indexOf(existing);
    c.id = existing.id;
    c.group = existing.group;
    S.canvases[idx] = c;
    S.active = c.id;
    renderAll(); persist(); pushHistory();
    toast('已用该版本替换画布：' + (c.title || rel));
  } else {
    c.id = 'gmk' + Math.random().toString(36).slice(2, 8);
    c.group = null;
    c.gmkOrphan = true;
    GMK.applied[key] = { mode: 'add', canvasId: c.id, doll: c.doll };
    S.canvases.push(c);
    S.active = c.id;
    renderAll(); persist(); pushHistory();
    toast('项目里没有 Doll「' + (c.doll || '?') + '」对应的画布，已作为「游离」画布加入（未分组，可自行归组）', true);
  }
  gmkRender();
}

function gmkUndo(rev, rel) {
  const key = rev + ':' + rel;
  const st = GMK.applied[key];
  if (!st) return;
  if (st.stale) {
    delete GMK.applied[key];
    toast('这版已被更新的版本替代，不能再单独撤销（画布保持最新应用的那一版）', true);
    gmkRender();
    return;
  }
  if (st.mode === 'replace' && st.prev) {
    const idx = S.canvases.findIndex(x => x.id === st.canvasId);
    if (idx >= 0) S.canvases[idx] = st.prev;
    S.active = st.canvasId;
  } else if (st.mode === 'add') {
    S.canvases = S.canvases.filter(x => x.id !== st.canvasId);
    if (!S.canvases.some(x => x.id === S.active)) S.active = S.canvases[0] && S.canvases[0].id;
  }
  delete GMK.applied[key];
  renderAll(); persist(); pushHistory();
  toast('已撤销，恢复到应用前的画布');
  gmkRender();
}

/* 点击卡片：把这版画布打开到画布列表并切过去，像普通画布一样编辑部位 */
/* 点击卡片：临时把该版本画布显示到画布区（不改变左侧列表的选中，不跳转） */
/* 点击卡片：只读预览该版本（不写入项目、不能编辑） */
function gmkOpenCanvas(rev, rel) {
  const hit = gmkFind(rev, rel);
  if (!hit || !hit.canvas) { toast('这版画布内容解析失败', true); return; }
  setPreview(hit.canvas, { kind: 'git', rev: rev, rel: rel, title: hit.canvas.title || rel });
}

/* 点击回收站条目：同样只读预览 */
function trashPreview(id) {
  if (!Array.isArray(S.trash)) return;
  const item = S.trash.find(x => x.id === id);
  if (!item) return;
  setPreview(item.canvas, { kind: 'trash', trashId: id, title: (item.canvas && item.canvas.title) || '已删除的画布' });
}

function setPreview(canvas, meta) {
  S.preview = { canvas: JSON.parse(JSON.stringify(canvas)), meta: meta || {} };
  S.sel = null;
  S.viewOnly = null;
  document.body.classList.add('is-preview');
  GMK.open = false;
  renderAll();
  try { fitView(); } catch (e) { }
  gmkRender();
  toast('只读预览：' + (meta && meta.title ? meta.title : '') + '（不能编辑；要编辑请先「应用」或「还原」）');
}

function clearPreview() {
  if (!S.preview) return;
  S.preview = null;
  document.body.classList.remove('is-preview');
  renderAll();
  try { fitView(); } catch (e) { }
  gmkRender();
}

function gmkExitView() {
  if (S.preview) { clearPreview(); return; }
  if (!S.viewOnly) return;
  S.viewOnly = null;
  renderAll();
  try { fitView(); } catch (e) { }
  gmkRender();
}

function gmkPreview(rev, rel) {
  const hit = gmkFind(rev, rel);
  if (!hit || !hit.canvas) { toast('这版画布内容解析失败', true); return; }
  const c = hit.canvas;
  const applied = !!GMK.applied[rev + ':' + rel];
  openModal(`<div class="modalfix" style="width:min(520px,92vw);height:auto">
    <div class="modal__head"><span class="idx">GIT</span><h3>${esc(c.title || rel)}</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 8px">版本 ${esc((hit.ver.date || '').slice(0, 16))} · ${esc((hit.ver.rev || '').slice(0, 7))}</p>
      <p class="setnote">Doll：<code>${esc(c.doll || '')}</code> · 部位 ${(c.parts || []).length} 个 · 分组 ${esc(c.kind || '')}</p>
      <p class="setnote">${esc(c.desc || '（无备注）')}</p>
    </div>
    <div class="modal__foot">
      <button class="btn btn--danger" data-act="close-modal">关闭</button>
      <button class="btn btn--multi" data-act="gmk-apply" data-rev="${esc(rev)}" data-rel="${esc(rel)}">${applied ? '撤销' : '应用这版画布'}</button>
    </div></div>`);
}

/* ==========================================================================
   画布分文件存储：Editor/canvases/<分组>/<标题>__<id>.json
   - index.json 里放非画布数据（项目信息 / 设置 / 界面状态 / 顺序）
   - 每个画布单独一个 json，便于按种族归档、单独对比、单独推送
   ========================================================================== */
const CANVAS_DIR = 'Editor/canvases/';
const CANVAS_BAK_DIR = 'Editor/canvases/.backup/';

function canvasSlug(txt, fallback) {
  const t = String(txt || '').trim().replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '');
  return (t || fallback || 'canvas').slice(0, 60);
}

/* 分组目录：种族画布 → 种族名；默认体型 → Default；其它 → Other */
function canvasGroupDir(c) {
  if (!c) return 'Other';
  if (c.kind === 'race') {
    const name = (c.race && (c.race.defName || c.race.name)) || c.doll || c.title;
    return canvasSlug(name, 'Race');
  }
  if (c.kind === 'default') return 'Default';
  return 'Other';
}

function canvasFileRel(c) {
  return canvasGroupDir(c) + '/' + canvasSlug(c.title, c.doll) + '__' + String(c.id || '').replace(/[^\w-]/g, '') + '.json';
}

function canvasIndexPayload() {
  const p = projectPayload();
  delete p.canvases;
  p.v = 5;
  p.canvasFiles = S.canvases.map(c => ({ rel: canvasFileRel(c), id: c.id, title: c.title, kind: c.kind, doll: c.doll }));
  return p;
}

async function canvasPut(rel, text) {
  if (HOST) {
    const ok = await HOST.SaveCanvasRel(rel, text);
    if (!ok) throw new Error('write failed');
    return true;
  }
  const r = await fetch('/__canvas-put?rel=' + encodeURIComponent(rel), {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: text,
  });
  const j = await r.json();
  if (!j || !j.ok) throw new Error((j && j.error) || 'write failed');
  return true;
}

async function canvasGet(rel) {
  if (HOST) {
    const t = await HOST.ReadCanvas(rel);
    return t || null;
  }
  const r = await fetch('/__canvas-get?rel=' + encodeURIComponent(rel), { cache: 'no-store' });
  const j = await r.json();
  if (!j || !j.ok) return null;
  return j.text;
}

async function canvasDelete(rel) {
  try {
    if (HOST) { await HOST.DeleteCanvas(rel); return; }
    await fetch('/__canvas-del?rel=' + encodeURIComponent(rel), { method: 'POST', cache: 'no-store' });
  } catch (e) { }
}

async function canvasList() {
  if (HOST) {
    try { return JSON.parse(await HOST.ListCanvases()) || []; } catch (e) { return []; }
  }
  try {
    const r = await fetch('/__canvas-list', { cache: 'no-store' });
    const j = await r.json();
    return (j && j.files) || [];
  } catch (e) { return []; }
}

/* 写单个画布 */
async function saveCanvasFile(c) {
  if (!LOCAL_HTTP || !c) return false;
  if (S.preview) return false;
  try {
    await canvasPut(canvasFileRel(c), JSON.stringify(c));
    noteCanvasSaved();
    return true;
  } catch (e) { return false; }
}

/* 写全部画布 + index */
async function saveAllCanvasFiles(quiet) {
  if (!LOCAL_HTTP) return false;
  try {
    const keep = new Set();
    for (const c of S.canvases) {
      const rel = canvasFileRel(c);
      keep.add(rel);
      await canvasPut(rel, JSON.stringify(c));
    }
    await canvasPut('index.json', JSON.stringify(canvasIndexPayload()));
    // 删掉已经不存在于项目里的画布文件（只删 canvases 下的 .json，不动 index）
    try {
      const files = await canvasList();
      for (const f of files) {
        if (f.rel === 'index.json') continue;
        if (String(f.rel).indexOf('.backup/') === 0) continue;
        if (!keep.has(f.rel)) await canvasDelete(f.rel);
      }
    } catch (e) { }
    if (!quiet) setSaveStatus('已保存 ' + S.canvases.length + ' 个画布文件 · ' + now());
    return true;
  } catch (e) {
    if (!quiet) toast('画布文件保存失败：' + (e && e.message), true);
    return false;
  }
}

let canvasSaveTimer = null;
function scheduleCanvasSave() {
  if (!LOCAL_HTTP) return;
  if (S.preview) return;                        // 预览的是仓库里的版本，不能写回项目文件
  clearTimeout(canvasSaveTimer);
  canvasSaveTimer = setTimeout(() => {
    const c = activeCanvas();
    if (c) saveCanvasFile(c);
  }, 900);
}

/* 异种编辑：只靠 scheduleCanvasSave 只会写当前画布，而且 900ms 内刷新会丢；
   这里再做一个短防抖，把全部画布文件落盘。 */
let variantCanvasTimer = null;
function scheduleVariantCanvasSave() {
  if (!LOCAL_HTTP || S.preview) return;
  clearTimeout(variantCanvasTimer);
  variantCanvasTimer = setTimeout(() => { saveAllCanvasFiles(true); }, 600);
}

/* 启动时从 canvases/index.json 读回；返回 {payload, canvases} 或 null */
async function loadCanvasFiles() {
  if (!LOCAL_HTTP) return null;
  try {
    const files = await canvasList();
    const hasIndex = files.some(f => f.rel === 'index.json');
    if (!hasIndex) return null;
    const idxText = await canvasGet('index.json');
    if (!idxText) return null;
    const payload = JSON.parse(idxText);
    const canvases = [];
    for (const meta of payload.canvasFiles || []) {
      const text = await canvasGet(meta.rel);
      if (!text) continue;
      try { canvases.push(JSON.parse(text)); } catch (e) { }
    }
    if (!canvases.length) return null;
    return { payload, canvases };
  } catch (e) { return null; }
}

/* ==========================================================================
   XML patch export
   ========================================================================== */
const xesc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const nf = v => {
  const n = round(v, 2);
  return Number.isInteger(n) ? String(n) : String(n);
};

function tagOf(kind) {
  return kind === 'organ' ? 'NiceHealthTab.DollOrgan'
    : kind === 'bone' ? 'NiceHealthTab.DollBone'
      : kind === 'eye' ? 'NiceHealthTab.DollEye'
        : 'NiceHealthTab.DollBodyPart';
}

/* a hand / foot window part as a DollBodyPart def (same fields NHT's HandDoll/FeetDoll use) */
function detailPartXML(now, base, doll, indent) {
  const i2 = indent || '';
  const [iw, ih] = imgDim(now.img);
  const sx = (now.w || 10) / (iw || 1);
  const sy = sx * ((base.sx && base.sy) ? (base.sy / base.sx) : 1);
  const lines = [];
  lines.push(`${i2}<NiceHealthTab.DollBodyPart>`);
  lines.push(`${i2}  <defName>${xesc(base.id)}</defName>`);
  lines.push(`${i2}  <dollName>${xesc(doll)}</dollName>`);
  lines.push(`${i2}  <imagePath>${xesc(now.img)}</imagePath>`);
  if (now.bid != null && now.bid >= 0) lines.push(`${i2}  <bodyPartId>${now.bid}</bodyPartId>`);
  lines.push(`${i2}  <position><x>${nf(now.x)}</x><y>${nf(now.y)}</y></position>`);
  // t123：HandDoll/FeetDoll 里有 width/height 为负（= 水平/垂直镜像）的 Def，
  // 旧代码把 height 一律写成正数，导出后镜像丢失 → 手指/脚趾错位。
  const sgnW = (base.w < 0 ? -1 : 1) * (now.flip ? -1 : 1);
  const sgnH = (base.h < 0 ? -1 : 1);
  lines.push(`${i2}  <width>${nf(sgnW * sx)}</width>`);
  lines.push(`${i2}  <height>${nf(sgnH * sy)}</height>`);
  lines.push(`${i2}  <layer>${base.l != null ? base.l : 0}</layer>`);
  lines.push(`${i2}  <visibleByDefault>true</visibleByDefault>`);
  lines.push(`${i2}  <showArmorCover>${(now && now.armor != null) ? now.armor : (base.armor !== false)}</showArmorCover>`);
  lines.push(`${i2}  <bondageScale>1.00</bondageScale>`);
  // window parts have no hit box of their own: keep the one the def ships with
  let hbD = null;
  if (now && Array.isArray(now.hb)) hbD = exportHitbox(now);
  if (!hbD) hbD = originalHitbox(base.id) || HB_FALLBACK[base.id] || null;
  if (!hbD && now && Array.isArray(now.hb)) hbD = now.hb;
  lines.push(`${i2}  <hitboxScale><x>${nf(hbD ? hbD[0] : 1)}</x><y>${nf(hbD ? hbD[1] : 1)}</y></hitboxScale>`);
  const hbOff = hitboxExportXML(now, i2 + '  ');
  if (hbOff) lines.push(hbOff);
  if (now.rot) lines.push(`${i2}  <!-- 编辑器里额外旋转 ${round(now.rot, 1)}°，Defs 没有对应字段 -->`);
  lines.push(`${i2}</NiceHealthTab.DollBodyPart>`);
  return lines.join('\n');
}

/* the hit box a def ships with (0.87x0.70 for the hand base, ...). Replacing a def must not
   silently blow it up to 1x1 — that is what made the hand window swallow every finger. */
const NHT_HITBOX = new Map();
function originalHitbox(id) {
  if (!NHT_HITBOX.size) {
    D.bodytypes.forEach(b => (b.parts || []).forEach(p => {
      if (p.id && Array.isArray(p.hb)) NHT_HITBOX.set(p.id, p.hb);
    }));
    (D.details ? Object.values(D.details) : []).forEach(d => (d.parts || []).forEach(p => {
      if (p.id && Array.isArray(p.hb)) NHT_HITBOX.set(p.id, p.hb);
    }));
  }
  return NHT_HITBOX.get(id) || null;
}

const HB_FALLBACK = {
  HandBaseRight: [0.87, 0.70], HandBaseLeft: [0.87, 0.70],
  MiddleLeft: [0.76, 0.87], MiddleRight: [0.76, 0.87],
  FeetBaseRight: [0.80, 0.80], FeetBaseLeft: [0.80, 0.80],
};

const HB_EXPORT_CAP = 1.5;
const HB_WARNED = new Set();
function exportHitbox(p) {
  // 只有勾了 hbPx 的部位才按“画布像素 / 512”直出；其他部位仍走 hb 比例。
  if (p.hbPx && p.hbox && p.hbox.w > 0 && p.hbox.h > 0) {
    return [p.hbox.w / 512, p.hbox.h / 512];
  }
  let hb = [p.hb[0], p.hb[1]];
  // t30：导出守卫——比例异常（>1.5）且用户没勾「允许判定框大于贴图」时夹到 1.0，
  // 避免再把 2.32 这种「框比贴图大 2 倍」的值写进 Patches。每部位只提示一次。
  if (!p.hbBig && (hb[0] > HB_EXPORT_CAP || hb[1] > HB_EXPORT_CAP)) {
    console.warn('[hitbox] 比例异常已夹紧：', p.id || p.name, hb, '→ 1.0');
    if (!HB_WARNED.has(p.uid)) {
      HB_WARNED.add(p.uid);
      try { toast('命中框比例异常（' + hb.join(' / ') + '）已按 1.0 导出：' + (p.name || p.id), true); } catch (e) { }
    }
    hb = [Math.min(hb[0], 1.0), Math.min(hb[1], 1.0)];
  }
  return hb;
}

/* 命中框偏移：写成“可见宽/高的比例”，测试模组的 HitboxOffsetExtension 直接按这个比例挪判定框 */
function hitboxOffsetXML(p, indent) {
  if (!p || !p.hbox) return '';
  const dx = Number(p.hbox.dx) || 0, dy = Number(p.hbox.dy) || 0;
  const w = Math.max(1, Number(p.hbox.w) || 1), h = Math.max(1, Number(p.hbox.h) || 1);
  const fx = dx / w, fy = dy / h;
  if (Math.abs(fx) < 0.0005 && Math.abs(fy) < 0.0005) return '';
  return `${indent}<modExtensions>\n`
    + `${indent}  <li Class="NHT_CustomDolls.HitboxOffsetExtension">\n`
    + `${indent}    <x>${nf(fx)}</x>\n`
    + `${indent}    <y>${nf(fy)}</y>\n`
    + `${indent}  </li>\n`
    + `${indent}</modExtensions>`;
}

/* t114：自动变换部位的判定框直接写“画布单位”的矩形。
   hitboxScale 的语义是 2s-1（0.55 只剩 10%），而且它的换算要乘贴图像素尺寸，
   编辑器拿不到 addon 贴图的真实尺寸时会按 64 兜底，导出的比例和游戏差好几倍。
   这里直接写 w/h/dx/dy（512 画布单位），运行时按 k = 屏上框宽/画布框宽 换算。 */
function hitboxRectXML(p, indent) {
  if (!p || !p.hbox) return '';
  const w = Number(p.hbox.w) || 0, h = Number(p.hbox.h) || 0;
  if (!(w > 0) || !(h > 0)) return '';
  const dx = Number(p.hbox.dx) || 0, dy = Number(p.hbox.dy) || 0;
  return `${indent}<modExtensions>\n`
    + `${indent}  <li Class="NHT_CustomDolls.HitboxRectExtension">\n`
    + `${indent}    <w>${nf(w)}</w>\n`
    + `${indent}    <h>${nf(h)}</h>\n`
    + `${indent}    <dx>${nf(dx)}</dx>\n`
    + `${indent}    <dy>${nf(dy)}</dy>\n`
    + `${indent}  </li>\n`
    + `${indent}</modExtensions>`;
}

/* 自动变换部位的判定框走 hitboxRectXML，其余部位保持原来的偏移比例导出 */
function hitboxExportXML(p, indent) {
  if (p && p.autoFollow) return hitboxRectXML(p, indent);
  return hitboxOffsetXML(p, indent);
}

/* 部位颜色：把贴图转成灰度（保留 alpha 与明暗），返回 dataURL */
function grayPngDataURL(srcKey) {
  return new Promise(resolve => {
    const im = new Image();
    im.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        const g = cv.getContext('2d');
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height);
        const px = d.data;
        for (let i = 0; i < px.length; i += 4) {
          const l = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
          px[i] = l; px[i + 1] = l; px[i + 2] = l;
        }
        g.putImageData(d, 0, 0);
        resolve({ data: cv.toDataURL('image/png'), w: cv.width, h: cv.height });
      } catch (e) { resolve(null); }
    };
    im.onerror = () => resolve(null);
    try { im.src = imgURL(srcKey); } catch (e) { resolve(null); }
  });
}

/* 我的素材分类：优先用当前画布种族 defName，其次未分类 */
function assetsCatFor(rec) {
  try {
    const name = String((rec && (rec.mod || rec.group || rec.modKey)) || '');
    const key = String((rec && rec.key) || '');
    const probe = (name + ' ' + key).toLowerCase();
    const c = (S.canvases || []).find(cv => {
      const t = String(cv.title || '').toLowerCase();
      const r = String((cv.race && (cv.race.label || cv.race.defName)) || '').toLowerCase();
      return (t && probe.indexOf(t) >= 0) || (r && probe.indexOf(r) >= 0);
    });
    if (c) return customCatFor(c);
    return (name || '本地素材').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  } catch (e) { return '本地素材'; }
}

function defaultArmorFor(p) {
  if (!p) return true;
  if (p.kind === 'organ' || p.kind === 'bone') return false;
  const n = String(p.name || p.label || '');
  // t115：左右眼睛默认不显示护甲图标（眼睛不是护甲覆盖部位）
  if (/眼|eye/i.test(n)) return false;
  if (/鼻子|下颚|脑|心|肺|肾|肝|胃|脊柱|肋骨|骨盆|nose|jaw|brain|heart|lung|kidney|liver|stomach|spine|ribcage|pelvis/i.test(n)) return false;
  return true;
}

function customCatFor(c) {
  try {
    if (c && c.title) return String(cleanTitle(c.title)).replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    const r = c && c.race && (c.race.defName || c.doll);
    if (r) return String(r).replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  } catch (e) { }
  return '未分类';
}

function customCat() {
  try {
    const c = (S.canvases || []).find(x => x.id === S.active);
    if (c && c.title) return String(cleanTitle(c.title)).replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    const r = c && c.race && (c.race.defName || c.doll);
    if (r) return String(r).replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  } catch (e) { }
  return '未分类';
}

function grayCatFor(c) {
  return customCatFor(c);
}
function grayKeyFor(doll, p, cat) {
  const bt = String((p && (p.bodyType || p.bodytype)) || '').trim();
  const sub = bt ? slug(bt) + '/' : '';
  return 'Custom/NHTCD_Gray/' + (cat || customCat()) + '/' + sub + slug(String(doll || 'doll')) + '_' + slug(String((p && (p.id || p.name)) || 'part'));
}
function grayArtKey(c, p) {
  return grayKeyFor((c && (c.doll || c.title)) || 'doll', p, grayCatFor(c));
}

/* 重新生成灰度图前清掉这个种族在浏览器里的灰度缓存 */
function clearGrayCache(race) {
  const prefix = 'Custom/NHTCD_Gray/' + race + '/';
  try { for (const k of [...EXT.keys()]) if (String(k).startsWith(prefix)) EXT.delete(k); } catch (e) { }
  try {
    const idx = artLoadIndex();
    let changed = false;
    for (const k of Object.keys(idx)) if (String(k).startsWith(prefix)) { delete idx[k]; changed = true; }
    if (changed) artSaveIndex();
  } catch (e) { }
  try { for (const k of [...DISK_TEX_KEYS]) if (String(k).startsWith(prefix)) DISK_TEX_KEYS.delete(k); } catch (e) { }
  try { for (const k of [...TEX_ON_DISK]) if (String(k).startsWith(prefix)) TEX_ON_DISK.delete(k); } catch (e) { }
}

/* 导出前确保所有标记过的部位都有灰度贴图（没有就现生成） */
async function ensureGrayArt(list) {
  const canvases = list || S.canvases || [];
  for (const c of canvases) {
    for (const p of (c.parts || [])) {
      if (!p.desat || !p.img) continue;
      const key = grayArtKey(c, p);
      let has = false;
      try { const idx = artLoadIndex(); has = !!(idx[key] && idx[key].d); } catch (e) { }
      if (has) { p.grayImg = key; continue; }
      const g = await grayPngDataURL(p.img);
      if (!g) continue;
      try {
        const idx = artLoadIndex();
        idx[key] = { d: g.data, w: g.w, h: g.h };
        artSaveIndex();
        EXT.set(key, { url: g.data, w: g.w, h: g.h });
      } catch (e) { }
      p.grayImg = key;
    }
  }
}

async function flushAllGrayArt() {
  for (const c of (S.canvases || [])) {
    try { await flushGrayForCanvas(c); } catch (e) { }
  }
}

async function flushGrayForCanvas(c) {
  if (!c || (!LOCAL_HTTP && !HOST)) return 0;
  let n = 0;
  for (const p of (c.parts || [])) {
    if (!p || !p.desat || !p.img || p.raceOff) continue;
    const key = grayArtKey(c, p);
    if (DISK_TEX_KEYS && DISK_TEX_KEYS.has(key) && await textureLooksValid(key)) { p.grayImg = key; continue; }
    let data = '', w = 0, h = 0;
    try { const idx = artLoadIndex(); if (idx[key] && idx[key].d) { data = idx[key].d; w = idx[key].w | 0; h = idx[key].h | 0; } } catch (e) { }
    if (!data) { try { const g = await grayPngDataURL(p.img); if (g && g.data) { data = g.data; w = g.w | 0; h = g.h | 0; } } catch (e) { } }
    if (!data) continue;
    try {
      const ok = await apiSave('to=texture&key=' + encodeURIComponent(key), data);
      if (!ok) continue;
      try {
        const idx = artLoadIndex(); idx[key] = { d: data, w, h }; artSaveIndex();
        EXT.set(key, { url: data, w, h });
      } catch (e) { }
      p.grayImg = key;
      if (DISK_TEX_KEYS) DISK_TEX_KEYS.add(key);
      TEX_ON_DISK.add(key);
      n++;
    } catch (e) { }
  }
  return n;
}

function partXML(p, doll, indent, fit, idOverride) {  const tag = tagOf(p.kind);
  const f = fit || { k: 1, cx: 0, cy: 0 };
  const i2 = indent || '';
  const lines = [];
  lines.push(`${i2}<!-- ${p.custom ? '自定义部位 · ' : ''}${p.name}${p.state !== 'ok' ? ' · 状态: ' + stateLabel(p.state) : ''} -->`);
  lines.push(`${i2}<${tag}>`);
  lines.push(`${i2}  <defName>${xesc(safeDefName(idOverride || p.id, 'Part'))}</defName>`);
  lines.push(`${i2}  <imagePath>${xesc(p.img)}</imagePath>`);
  if (p.kind === 'bone' && p.atlas) {
    lines.push(`${i2}  <atlasPath>${xesc(p.atlas)}</atlasPath>`);
    if (p.uv) {
      lines.push(`${i2}  <uvRect>`);
      ['m_XMin', 'm_YMin', 'm_Width', 'm_Height'].forEach(k => lines.push(`${i2}    <${k}>${nf(p.uv[k] || 0)}</${k}>`));
      lines.push(`${i2}  </uvRect>`);
    }
  }
  lines.push(`${i2}  <position>`);
  lines.push(`${i2}    <x>${nf((p.x - f.cx) * f.k + (f.ox || 0))}</x>`);
  lines.push(`${i2}    <y>${nf((p.y - f.cy) * f.k + (f.oy || 0))}</y>`);
  lines.push(`${i2}  </position>`);
  // NHT's dolls only use layers 0..29 and anything above is not drawn
  const layerOut = Math.max(0, Math.min(29, Math.round(p.layer || 0)));
  lines.push(`${i2}  <layer>${layerOut}</layer>`);
  lines.push(`${i2}  <dollName>${xesc(doll)}</dollName>`);
  const bidOut = exportBid(activeCanvas(), p);
  if (bidOut >= 0) lines.push(`${i2}  <bodyPartId>${bidOut}</bodyPartId>`);
  lines.push(`${i2}  <notifyPosition><x>${nf(p.nx || 0)}</x><y>${nf(p.ny || 0)}</y></notifyPosition>`);
  lines.push(`${i2}  <showArmorCover>${p.armor === false ? 'false' : 'true'}</showArmorCover>`);
  // organs and bones are an x-ray layer in NHT: hidden until the toolbar buttons are used,
  // so they always export as visibleByDefault=false (matches the mod's own defs)
  const visibleByDefault = (p.kind === 'organ' || p.kind === 'bone') ? false : p.vis;
  lines.push(`${i2}  <visibleByDefault>${visibleByDefault ? 'true' : 'false'}</visibleByDefault>`);
  lines.push(`${i2}  <bondageScale>1.00</bondageScale>`);
  // NHT 的 width/height 是缩放比例（1 = 原始贴图大小），不是像素尺寸；
  // 乘图片尺寸会把所有部位放大成几百倍。画布预览已经按真实图片尺寸显示，导出只写比例。
  lines.push(`${i2}  <width>${nf((p.flip ? -p.sx : p.sx) * f.k)}</width>`);
  lines.push(`${i2}  <height>${nf(Math.abs(p.sy) * f.k)}</height>`);   // 镜像只写 width，height 永远为正
  const hbOut = exportHitbox(p);
  lines.push(`${i2}  <hitboxScale><x>${nf(hbOut[0])}</x><y>${nf(hbOut[1])}</y></hitboxScale>`);
  const hbOff = hitboxExportXML(p, i2 + '  ');
  if (hbOff) lines.push(hbOff);
  if (p.kind === 'organ' || p.kind === 'bone') lines.push(`${i2}  <extraLayer>${p.extra || 0}</extraLayer>`);
  lines.push(`${i2}</${tag}>`);
  if (p.desat && p.img) {
    const gkey = grayKeyFor(doll, p);
    const gc = Object.assign({}, p, { img: gkey, desat: false, grayImg: null, name: String(p.name || '') + '（灰）' });
    const gid = String(idOverride || p.id || 'Part') + '_NHTCD_Gray';
    lines.push('');
    lines.push(partXML(gc, doll, indent, fit, gid));
  }
  return lines.join('\n');
}

/* the game draws a doll scaled to its <BoundingBox>, so a race doll authored in its own
   pixel space would come out tiny. Everything gets mapped into the stock canvas
   (512 x 1024, centred) on export, parts and box together. */
const EXPORT_CANVAS = { w: 512, h: 1024 };


/* 多层发型：按命名规律找同款的后背层贴图（只用于编辑器预览） */
const BACK_HAIR_CACHE = new Map();
let BACK_IDX = null, BACK_IDX_N = -1;

/* 归一化名字：去掉 BG / Back / _back / _b 标记，只留"主名 + 编号" */
/* ---------------- 我的素材：分类来自 Custom 文件夹 ---------------- */
let MINE_DIRS = null;
let DISK_TEX_KEYS = null;
function mineCatOrder() {
  const o = (S.settings && S.settings.mineOrder) || [];
  return Array.isArray(o) ? o.slice() : [];
}
/* 磁盘上贴图已被移动/重新分类时，把浏览器里旧的 Custom/ 路径同步到真实位置 */
async function syncCustomPathsFromDisk(silent) {
  if (!LOCAL_HTTP) return 0;
  try {
    const r = await fetch('/__texindex?t=' + Date.now(), { cache: 'no-store' });
    const j = await r.json();
    if (!j || !j.ok || !Array.isArray(j.keys)) return 0;
    const all = new Set(j.keys);
    DISK_TEX_KEYS = all;
    // 手动放进 Textures/Custom/<分类>/ 的贴图：补进素材库
    let diskAdded = 0;
    if (S.customAssets) {
      const have = new Set((S.customAssets || []).map(a => a.p));
      j.keys.forEach(k => {
        if (!/^Custom\//.test(k)) return;
        if (/^Custom\/(NHTCD_Gray|Icons|Rot)\//.test(k)) return;
        if (have.has(k)) return;
        const parts = k.split('/');
        if (parts.length < 3) return;
        const rec = { p: k, n: parts[parts.length - 1], w: 0, h: 0, cat: 'mine', g: '我的素材', catName: parts[1], disk: true };
        S.customAssets.push(rec);
        try { registerCustomAsset(rec); } catch (e) { }
        have.add(k);
        diskAdded++;
        // 读一次真实尺寸（/__tex 由本地服务提供）
        try {
          const im = new Image();
          im.onload = () => {
            rec.w = im.naturalWidth; rec.h = im.naturalHeight;
            try { const a = ASSETS.find(x => x.p === rec.p); if (a) { a.w = rec.w; a.h = rec.h; } } catch (e) { }
            try { EXT.set(k, { url: imgURL(k), w: rec.w, h: rec.h }); } catch (e) { }
            if (typeof renderLibrary === 'function') renderLibrary();
          };
          im.src = '/__tex?key=' + encodeURIComponent(k);
        } catch (e) { }
      });
    }
    // 我的素材以磁盘为准：删除已经不存在的条目（未保存的裁剪缓存保留）
    (S.customAssets || []).forEach(a => {
      if (a && /^Custom\//.test(String(a.p || '')) && a.cat !== 'mine' && !a.disk) {
        const parts = String(a.p).split('/');
        a.catName = a.catName || (parts.length > 2 ? parts[1] : '未分类');
        a.cat = 'mine';
        a.g = '我的素材';
      }
    });
    S.customAssets = (S.customAssets || []).filter(a => {
      if (!a || !/^Custom\//.test(String(a.p || ''))) return true;
      if (all.has(a.p)) return true;
      if (CROP_CACHE.has(a.p)) return true;
      return false;
    });
    const norm = new Map(), gray = new Map();
    j.keys.forEach(k => {
      if (!/^Custom\//.test(k)) return;
      const isG = k.indexOf('Custom/NHTCD_Gray/') === 0;
      const name = k.split('/').pop();
      (isG ? gray : norm).set(name, k);
    });
    const rep = v => {
      if (!v || !/^Custom\//.test(v) || all.has(v)) return v;
      const isG = v.indexOf('Custom/NHTCD_Gray/') === 0;
      const name = v.split('/').pop();
      return (isG ? gray : norm).get(name) || v;
    };
    try {
    const byP = new Map();
    (S.customAssets || []).forEach(a => {
      if (!a || !a.p) return;
      const prev = byP.get(a.p);
      const better = !prev || (a.disk && !prev.disk) || ((a.w || 0) > (prev.w || 0) && (a.disk === prev.disk));
      if (better) byP.set(a.p, a);
    });
    S.customAssets = [...byP.values()];
  } catch (e) { }
  // 已有磁盘条目如果尺寸还是 0，补读一次真实尺寸
  try {
    (S.customAssets || []).filter(a => a && a.disk && (!a.w || !a.h)).slice(0, 60).forEach(a => {
      const im = new Image();
      im.onload = () => {
        a.w = im.naturalWidth; a.h = im.naturalHeight;
        try { const e = ASSETS.find(x => x.p === a.p); if (e) { e.w = a.w; e.h = a.h; } } catch (er) { }
        try { if (typeof renderLibrary === 'function') renderLibrary(); } catch (er) { }
      };
      im.src = imgURL(a.p);
    });
  } catch (e) { }
  let n = diskAdded;
    (S.customAssets || []).forEach(a => {
      const nk = rep(a.p); if (nk !== a.p) { a.p = nk; n++; }
      // 磁盘上已有文件的素材：不再在 index.json 里内嵌 base64
      if (a && a.data && DISK_TEX_KEYS && DISK_TEX_KEYS.has(a.p)) delete a.data;
    });
    (ASSETS || []).forEach(a => { const nk = rep(a.p); if (nk !== a.p) { a.p = nk; n++; } });
    (S.canvases || []).forEach(c => {
      (c.parts || []).concat(c.detached || []).forEach(p => {
        if (p.img) { const nk = rep(p.img); if (nk !== p.img) { p.img = nk; n++; } }
        if (p.grayImg) { const nk = rep(p.grayImg); if (nk !== p.grayImg) { p.grayImg = nk; n++; } }
      });
    });
    (S.hairRefs || []).forEach(h => { if (h && h.key) { const nk = rep(h.key); if (nk !== h.key) h.key = nk; } });
    if (n) {
      persist();
      if (typeof renderAll === 'function') renderAll();
      if (typeof renderLibrary === 'function') renderLibrary();
      if (!silent) toast('已同步 ' + n + ' 个素材路径到磁盘分类');
    }
    return n;
  } catch (e) { return 0; }
}

async function loadMineDirs(refresh) {
  if (!LOCAL_HTTP) return;
  try {
    const r = await fetch('/__customdirs?t=' + Date.now(), { cache: 'no-store' });
    const j = await r.json();
    if (j && j.ok) {
      MINE_DIRS = (j.dirs || []).slice();
      if (refresh) renderLibrary();
    }
  } catch (e) { }
}

function modCategoryFor(key) {
  try {
    const a = (ASSETS || []).find(x => x.p === key);
    let g = String((a && a.g) || '').replace(/^模组\s*·\s*/, '').trim();
    if (!g) g = String(key).split('/')[0];
    const k = g.toLowerCase();
    const c = (S.canvases || []).find(cv => {
      const t = String(cv.title || '').toLowerCase();
      const r = String((cv.race && (cv.race.label || cv.race.defName)) || '').toLowerCase();
      return k && (t === k || r === k || t.indexOf(k) >= 0 || k.indexOf(t) >= 0 || (r && (r.indexOf(k) >= 0 || k.indexOf(r) >= 0)));
    });
    if (c) return customCatFor(c);
    if (g) return g.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  } catch (e) { }
  return '未分类';
}

/* 换成裁剪后的图时，保持裁剪前在画布上的位置和显示大小 */
function applyCroppedPart(p, key, rec, newKey) {
  // 不继承缩放：sx/sy 保持原值；位置沿用之前的中心轴点（x/y 不变）
  p.img = newKey;
}


async function textureDataURL(key) {
  if (!key) return '';
  try {
    const u = imgURL(key);
    if (!u || u === MISSING_IMG) return '';
    const r = await fetch(u, { cache: 'no-store' });
    if (!r.ok) return '';
    const blob = await r.blob();
    if (!blob || blob.size < 50) return '';
    const ct = String(r.headers.get('content-type') || '').toLowerCase();
    if (ct && !ct.startsWith('image/') && !/^data:image\//i.test(String(u))) return '';
    return await fileToDataURL(blob);
  } catch (e) { return ''; }
}

async function textureLooksValid(key) {
  return !!(await textureDataURL(key));
}

async function cropDataOfKey(key) {
  try {
    const idx = artLoadIndex();
    if (idx[key] && idx[key].d) return idx[key].d;
  } catch (e) { }
  const cu = CUSTOM.get(key);
  if (cu && cu.data) return cu.data;
  try {
    const a = (S.customAssets || []).find(x => x && x.p === key);
    if (a && a.data) return a.data;
  } catch (e) { }
  const e = EXT.get(key);
  if (e && e.url) {
    if (/^data:/.test(e.url)) return e.url;
    try { return await fileToDataURL(await (await fetch(e.url)).blob()); } catch (err) { }
  }
  try { return await textureDataURL(key); } catch (err) { }
  return '';
}

function cropBaseName(key) {
  return String(key || '').split('/').pop().replace(/\.[^.]+$/, '');
}

async function findExistingCrop(base, hash) {
  const names = new Set();
  if (DISK_TEX_KEYS) DISK_TEX_KEYS.forEach(k => names.add(k));
  (S.customAssets || []).forEach(a => { if (a && a.p) names.add(a.p); });
  EXT.forEach((v, k) => names.add(k));
  CUSTOM.forEach((v, k) => names.add(k));
  try { const idx = artLoadIndex(); Object.keys(idx).forEach(k => names.add(k)); } catch (e) { }
  const safe = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^Crop_' + safe + '(?:\\.[^.]+)?_', 'i');
  for (const key of names) {
    const fn = String(key).split('/').pop();
    if (!re.test(fn)) continue;
    const data = await cropDataOfKey(key);
    if (!data) continue;
    if (await dataHash8(data) === hash) return key;
  }
  return null;
}

async function chooseCropKey(c, sourceKey, rec) {
  const base = cropBaseName(sourceKey);
  const cat = customCatFor(c);
  const hash = await dataHash8(rec.data);
  const canonical = 'Custom/' + cat + '/Crop_' + base + '_' + hash;
  const existing = await findExistingCrop(base, hash);
  if (existing) return { key: existing, hash, reuse: true };
  return { key: canonical, hash, reuse: false };
}

async function ensureCropEntry(key, rec, cat, data) {
  if (!key) return;
  const d = data || rec.data || '';
  try {
    if (!EXT.has(key)) EXT.set(key, { url: d || imgURL(key), w: rec.w | 0 || 64, h: rec.h | 0 || 64 });
  } catch (e) { }
  try {
    const idx = artLoadIndex();
    if (!idx[key] && d) { idx[key] = { d, w: rec.w | 0, h: rec.h | 0 }; artSaveIndex(); }
  } catch (e) { }
  if (!S.customAssets) S.customAssets = [];
  if (!S.customAssets.some(a => a && a.p === key)) {
    S.customAssets.push({ p: key, n: key.split('/').pop(), w: rec.w | 0, h: rec.h | 0, cat, srcKey: '', cropHash: '' });
  }
}

async function autoCropApplied(part, key) {
  try {
    const c = activeCanvas();
    if (!c || !part) return;
    const rec = await cropAssetKey(key);
    if (!rec) { toast('自动裁剪失败：读不到这张图', true); return; }
    const cat = customCatFor(c);
    const picked = await chooseCropKey(c, key, rec);
    const newKey = picked.key;
    if (picked.reuse) {
      const data = await cropDataOfKey(newKey);
      await ensureCropEntry(newKey, rec, cat, data);
      part.img = newKey;
      persist(); renderAll(); renderLibrary();
      toast('复用已有裁剪素材：' + newKey.split('/').pop());
      return;
    }
    let onDisk = false;
    try { onDisk = (await (await fetch('/__tex-exists?key=' + encodeURIComponent(newKey), { cache: 'no-store' })).text()).trim() === 'yes'; } catch (e) { }
    if (!onDisk) {
      const old = CUSTOM.get(newKey) || {};
      const data = old.data || rec.data;
      if (!CUSTOM.has(newKey)) {
        CUSTOM.set(newKey, { p: newKey, n: newKey.split('/').pop(), w: rec.w, h: rec.h, data });
        try {
          EXT.set(newKey, { url: data, w: rec.w, h: rec.h });
          const idx = artLoadIndex();
          idx[newKey] = { d: data, w: rec.w, h: rec.h };
          artSaveIndex();
        } catch (e) { }
      }
      if (!S.customAssets) S.customAssets = [];
      if (!S.customAssets.some(a => a.p === newKey)) {
        S.customAssets.push({ p: newKey, n: newKey.split('/').pop(), w: rec.w, h: rec.h, cat, data });
      }
      // 缓存到待写入列表：本地保存时才落盘
      if (!CROP_CACHE.has(newKey)) CROP_CACHE.set(newKey, Object.assign({}, rec, { data, pending: true }));
    }
    part.img = newKey;
    persist();
    renderAll();
    renderLibrary();
    toast('已裁剪并应用（保存时写入磁盘）：我的素材 - ' + cat);
  } catch (e) { toast('自动裁剪失败：' + (e && e.message), true); }
}

async function cropSelectedPart() {
  try {
    const c = activeCanvas();
    const p = c && (c.parts || []).concat(c.detached || []).find(x => x.uid === S.sel);
    if (!p || !p.img) { toast('先选中一个有贴图的部位', true); return; }
    const key = p.img;
    const rec = await cropAssetKey(key);
    if (!rec) { toast('裁剪失败：读不到这张图', true); return; }
    // 分类 = 当前画布名（统一不带 race）
    const cat = customCatFor(c);
    const picked = await chooseCropKey(c, key, rec);
    if (picked.reuse) {
      const data = await cropDataOfKey(picked.key);
      await ensureCropEntry(picked.key, rec, cat, data);
      applyCroppedPart(p, key, rec, picked.key);
      persist(); renderAll(); renderLibrary();
      toast('复用已有裁剪素材：' + picked.key.split('/').pop());
      return;
    }
    const newKey = picked.key;
    // 先只进缓存，不立刻写盘；点「本地保存」时只写真正用在部位上的裁剪图
    const old = CUSTOM.get(newKey) || {};
    const data = old.data || rec.data;
    try {
      if (!CUSTOM.has(newKey)) CUSTOM.set(newKey, { p: newKey, n: newKey.split('/').pop(), w: rec.w, h: rec.h, data });
      const idx = artLoadIndex();
      idx[newKey] = { d: data, w: rec.w, h: rec.h };
      artSaveIndex();
      EXT.set(newKey, { url: data, w: rec.w, h: rec.h });
    } catch (e) { }
    if (!S.customAssets) S.customAssets = [];
    if (!S.customAssets.some(a => a.p === newKey)) {
      S.customAssets.push({ p: newKey, n: newKey.split('/').pop(), w: rec.w, h: rec.h, cat, data });
    }
    if (!CROP_CACHE.has(newKey)) CROP_CACHE.set(newKey, Object.assign({}, rec, { data, pending: true }));
    // 用回未裁剪的旧图时，别让缓存把新图当成“已裁剪”
    CROP_CACHE.delete(key);
    applyCroppedPart(p, key, rec, newKey);
    persist();
    renderAll();
    renderLibrary();
    toast('已裁剪并应用（本地保存时写入磁盘）：我的素材 - ' + cat);
  } catch (e) { toast('裁剪失败：' + (e && e.message), true); }
}

async function mineMoveAsset(key, cat, createCat) {
  try {
    const safeCat = String(cat || '').replace(/[^\w\u4e00-\u9fa5-]+/g, '_') || '未分类';
    const idx = artLoadIndex();
    const rec = idx[key] || {};
    let data = rec.d || '';
    if (!data) {
      try {
        const u = imgURL(key);
        if (u) { const b = await (await fetch(u)).blob(); data = await fileToDataURL(b); }
      } catch (e) { }
    }
    let newKey = key;
    if (data) {
      // 只存在浏览器里的素材：先写到 Textures/Custom/<分类>/ 再删旧文件
      newKey = 'Custom/' + safeCat + '/' + String(key).split('/').pop();
      const good = await apiSave('to=texture&key=' + encodeURIComponent(newKey), data);
      if (!good) { toast('移动失败：写入贴图失败', true); return; }
      try {
        idx[newKey] = Object.assign({}, rec, { d: data });
        artSaveIndex();
        EXT.set(newKey, { url: data, w: rec.w | 0, h: rec.h | 0 });
      } catch (e) { }
      try { fetch('/__customdelfile?key=' + encodeURIComponent(key), { cache: 'no-store' }); } catch (e) { }
      const a = (S.customAssets || []).find(x => x.p === key);
      if (a) { a.p = newKey; a.cat = safeCat; }
    } else {
      const r = await fetch('/__custommove?key=' + encodeURIComponent(key) + '&cat=' + encodeURIComponent(safeCat), { cache: 'no-store' });
      const j = await r.json();
      if (!j || !j.ok) { toast('移动失败：' + ((j && j.error) || '找不到素材文件'), true); return; }
      newKey = j.key;
      const a = (S.customAssets || []).find(x => x.p === key);
      if (a) { a.p = newKey; a.cat = safeCat; }
    }
    S.canvases.forEach(c => (c.parts || []).concat(c.detached || []).forEach(p => {
      if (p.img === key) p.img = newKey;
      if (p.grayImg === key) p.grayImg = newKey;
    }));
    (ASSETS || []).forEach(a => { if (a.p === key) a.p = newKey; });
    persist();
    if (typeof loadMineDirs === 'function') await loadMineDirs(false);
    if (typeof renderAll === 'function') renderAll();
    renderLibrary();
    toast('已放入分类：' + safeCat);
  } catch (e) { toast('移动失败：' + (e && e.message), true); }
}

async function mineRenameCat(oldName, newName) {
  if (!LOCAL_HTTP) { toast('需要本地服务', true); return; }
  try {
    const r = await fetch('/__customrename?old=' + encodeURIComponent(oldName) + '&new=' + encodeURIComponent(newName), { cache: 'no-store' });
    const j = await r.json();
    if (!j || !j.ok) { toast('改名失败：' + ((j && j.error) || '未知错误'), true); return; }
    const rep = (v) => String(v)
      .replace('Custom/' + oldName + '/', 'Custom/' + newName + '/')
      .replace('Custom/NHTCD_Gray/' + oldName + '/', 'Custom/NHTCD_Gray/' + newName + '/');
    (S.customAssets || []).forEach(a => { if (a.p) a.p = rep(a.p); });
    (S.canvases || []).forEach(c => {
      (c.parts || []).concat(c.detached || []).forEach(p => {
        if (p.img) p.img = rep(p.img);
        if (p.grayImg) p.grayImg = rep(p.grayImg);
      });
    });
    if (Array.isArray(S.settings.mineOrder)) S.settings.mineOrder = S.settings.mineOrder.map(x => x === oldName ? newName : x);
    persist();
    if (typeof loadMineDirs === 'function') await loadMineDirs(true);
    toast('已改名：' + oldName + ' → ' + newName);
  } catch (e) { toast('改名失败：' + (e && e.message), true); }
}

async function mineDeleteCat(name) {
  if (!LOCAL_HTTP) { toast('需要本地服务', true); return; }
  try {
    const r = await fetch('/__customdelete?name=' + encodeURIComponent(name), { cache: 'no-store' });
    const j = await r.json();
    if (!j || !j.ok) { toast('删除失败：' + ((j && j.error) || '未知错误'), true); return; }
    S.customAssets = (S.customAssets || []).filter(a => !String(a.p || '').startsWith('Custom/' + name + '/'));
    if (typeof loadMineDirs === 'function') await loadMineDirs(true);
    toast('已删除分类：' + name);
  } catch (e) { toast('删除失败：' + (e && e.message), true); }
}

function mineReorder(src, target, after) {
  const cats = (MINE_DIRS && MINE_DIRS.length ? MINE_DIRS.slice() : []);
  const names = cats.filter(n => n !== src);
  let idx = names.indexOf(target);
  if (idx < 0) names.push(src);
  else { if (after) idx++; names.splice(idx, 0, src); }
  S.settings.mineOrder = names;
  MINE_DIRS = names.slice();
  persist();
  renderLibrary();
}

function mineCats(items) {
  const custom = (items || []).filter(a => /^Custom\//.test(String(a.p || '')) && !/^Custom\/(NHTCD_Gray|Icons|Rot)\//.test(String(a.p || '')));
  // 分类 = 磁盘上已有的文件夹 + 当前素材里出现的分类（刚导入、还没落盘的也要显示）
  const nameSet = new Set(MINE_DIRS && MINE_DIRS.length ? MINE_DIRS : []);
  custom.forEach(a => {
    const parts = String(a.p).split('/');
    if (parts.length > 2) nameSet.add(parts[1]);
  });
  const names = [...nameSet];
  const order = mineCatOrder();
  names.sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (a === '未分类') return 1;
    if (b === '未分类') return -1;
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    return a.localeCompare(b, 'zh');
  });
  const out = names.map(name => ({
    name,
    list: custom.filter(a => String(a.p).startsWith('Custom/' + name + '/'))
  }));
  const loose = custom.filter(a => {
    const parts = String(a.p).split('/');
    if (parts.length !== 2) return false;   // Custom/xxx.png → 未分类
    // 磁盘上已不存在、浏览器里也没有数据的旧引用，不再显示成“未分类素材”
    if (!DISK_TEX_KEYS) return true;
    if (DISK_TEX_KEYS.has(a.p)) return true;
    try { return !!(EXT && EXT.has && EXT.has(a.p)); } catch (e) { return false; }
  });
  const un = out.find(x => x.name === '未分类');
  if (un) un.list = un.list.concat(loose);
  else if (loose.length) out.push({ name: '未分类', list: loose });
  return out.filter(x => x.list.length || x.name === '未分类' || (MINE_DIRS && MINE_DIRS.includes(x.name)));
}

/* 从种族 XML 自动学到的“后层目录”（layerOffset < 0） */
const HAIR_BACK_DIRS = new Set();
const HAIR_BACK_KEYS = new Set();
function hairPathIsBackDir(k) {
  const s = String(k || '').toLowerCase();
  if (!s) return false;
  // Mincho 这类：后脑层文件夹直接叫 Lower / Lower_north
  if (/[\/_-]lower([\/_-]|$)/i.test(s)) return true;
  for (const d of HAIR_BACK_DIRS) if (s.startsWith(d)) return true;
  return false;
}

function hairNormBase(name) {
  return String(name || '')
    .replace(/\.png$/i, '')
    .replace(/_(north|south|east|west)$/i, '')
    // Yuran 这类：后脑层是「数值前面加 A」（YR_hairA5 / YR_hairA），归一后要和前层 YR_hair5 同名
    .replace(/(hair)[_-]?a(?=\d*$)/i, '$1')
    // Monolyn 这类：HairF / HairB + 编号（HairF1 / HairB1）→ 都归一成 Hair + 编号
    .replace(/(hair)[_-]?[fb](?=\d*$)/i, '$1')
    .replace(/BG(?=\d*$)/i, '')
    .replace(/BackGround(?=\d*$)/i, '')
    .replace(/Back(?=\d*$)/i, '')
    .replace(/_back(?=\d*$)/i, '')
    .replace(/_b(?=\d*$)/i, '');
}
function hairIsBackName(name) {
  const n = String(name || '').replace(/\.png$/i, '').replace(/_(north|south|east|west)$/i, '');
  if (/back/i.test(n) || /bg\d*$/i.test(n)) return true;
  if (/^lower(\d|_|$)/i.test(n)) return true;          // Mincho: Lower0 / Lower_north0
  if (/_b\d*$/i.test(n)) return true;                 // hair1_b
  if (/\d+b$/i.test(n)) return true;                  // hair1b
  if (/hair[_-]?b\d*$/i.test(n)) return true;         // Monolyn / Maru: HairB / MRHairB10
  if (/(^|[_-])hair[_-]?a\d*$/i.test(n)) return true; // Yuran: InHair/YR_hairA5（数值前加 A = 后脑层）
  return false;
}
let _hairBackIdx = null, _hairBackIdxKey = '';
function hairBackIndex() {
  const key = HAIRS.length + '|' + EXT.size;
  if (_hairBackIdx && _hairBackIdxKey === key) return _hairBackIdx;
  // 素材是异步载入的（大文件夹 + localStorage 两波）；按数量失效
  const idx = new Map();
  const all = new Set(HAIRS.map(h => h.p));
  EXT.forEach((v, k) => all.add(k));
  const hairKeys = new Set(HAIRS.map(h => h.p));
  all.forEach(k => {
    const name = k.split('/').pop();
    if (!/hair/i.test(name) && !hairKeys.has(k)) return;
    const base = hairNormBase(name);
    if (!base || !/\d*$/.test(base)) return;
    const rec = idx.get(base) || { front: null, back: null, backs: [], fronts: [] };
    if (hairIsBackName(name) || hairPathIsBackDir(k) || HAIR_BACK_KEYS.has(k)) {
      if (!rec.back) rec.back = k;
      rec.backs.push(k);
    } else {
      if (!rec.front) rec.front = k;
      rec.fronts.push(k);
    }
    idx.set(base, rec);
  });
  _hairBackIdx = idx; _hairBackIdxKey = key;
  return idx;
}
function hairKeyExists(k) {
  return EXT.has(k) || HAIRS.some(h => h.p === k);
}
function hairIsSideName(name) {
  const n = String(name || '').replace(/\.png$/i, '').replace(/_(north|south|east|west)$/i, '');
  if (/(^|[_-])hair[_-]?a\d*$/i.test(n)) return false;       // A = 后脑层
  return /(^|[_-])hair[_-]?b\d*$/i.test(n);                  // B = 侧层（Yuran SideHair）
}
function findSideHair(key) {
  if (!key) return null;
  const name = String(key).split('/').pop();
  if (hairIsSideName(name) || hairIsBackName(name)) return null;
  const base = hairNormBase(name);
  const rec = hairBackIndex().get(base);
  if (!rec || !rec.backs || !rec.backs.length) return null;
  const cands = rec.backs.filter(k => hairIsSideName(String(k).split('/').pop()));
  if (!cands.length) return null;
  const parts = String(key).split('/');
  let best = null, bestN = -1;
  for (const k of cands) {
    const op = String(k).split('/');
    let n = 0;
    while (n < parts.length - 1 && n < op.length - 1 && parts[n] === op[n]) n++;
    if (n > bestN) { bestN = n; best = k; }
  }
  return best;
}

function findBackHair(key) {
  if (!key) return null;
  const name = String(key).split('/').pop();
  if (hairIsBackName(name)) return null;
  const baseKey = hairNormBase(name);
  // Mincho / 分层命名：先直接试 UpperN → LowerN，避免每次重建全量索引
  {
    let direct = String(key).replace(/_(north|south|east|west)m?$/i, '');
    direct = direct.replace(/\/(UpperMore|Upper)\//i, '/Lower/');
    direct = direct.replace(/\/(UpperMore|Upper)(\d+)(\.png)?$/i, '/Lower$2$3');
    // 只接受「换了层」的直通：Yuran 去掉方向后缀后还是同一张前层图，不能当后层
    if (direct !== key && hairKeyExists(direct)
        && hairNormBase(String(direct).split('/').pop()) !== hairNormBase(name)) return direct;
  }
  const idx = hairBackIndex();
  // 同名后层候选：直接查表，不能每个发型都遍历整个索引
  const rec0 = idx.get(baseKey);
  const cands = [];
  if (rec0) (rec0.backs && rec0.backs.length ? rec0.backs : (rec0.back ? [rec0.back] : []))
    .slice().sort((a, b) => (hairIsSideName(String(a).split('/').pop()) ? 1 : 0) - (hairIsSideName(String(b).split('/').pop()) ? 1 : 0))
    .forEach(x => cands.push(x));
  if (!cands.length) {
    // Mincho / 分层命名：Upper0 → Lower0，UpperMore0 → Lower0
    let direct = String(key).replace(/_(north|south|east|west)m?$/i, '');
    direct = direct.replace(/\/(UpperMore|Upper)\//i, '/Lower/');
    direct = direct.replace(/\/(UpperMore|Upper)(\d+)$/i, '/Lower$2');
    if (direct !== key && hairKeyExists(direct)
        && hairNormBase(String(direct).split('/').pop()) !== hairNormBase(name)) return direct;
    return null;
  }
  const parts = String(key).split('/');
  const common = (other) => {
    const op = String(other).split('/');
    let n = 0;
    while (n < parts.length - 1 && n < op.length - 1 && parts[n] === op[n]) n++;
    return n;
  };
  let best = null, bestScore = -1;
  const keyTokens = _hairTokens(key);
  cands.forEach(c => {
    const len = common(c);
    const ct = _hairTokens(c);
    let shared = 0;
    keyTokens.forEach(t => { if (ct.has(t)) shared++; });
    // 同模组/同名前缀优先，其次才是目录重合长度
    const score = shared * 100 + len;
    if (score > bestScore) { bestScore = score; best = c; }
  });
  return best;
}

/* 呆毛配对：按编号（hair3 ↔ Ahoge3），没有编号就用 Ahoge */
let _ahogeMap = null, _ahogeMapKey = '';
const _HAIR_GENERIC = new Set(['hair', 'ahoge', 'pawn', 'bodyaddon', 'special', 'large', 'medium', 'small', 'humanlike', 'south', 'north', 'east', 'west', 'assets', 'textures', 'addon', 'head', 'body', 'style', 'null']);
function _hairTokens(p) {
  const out = new Set();
  String(p || '').replace(/\.png$/i, '').split('/').forEach(seg => {
    seg.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).forEach(t => {
      t = t.toLowerCase();
      if (t.length >= 3 && !/^\d+$/.test(t) && !_HAIR_GENERIC.has(t)) out.add(t);
    });
  });
  return out;
}
function ahogeMap() {
  const key = HAIRS.length + '|' + EXT.size;
  if (_ahogeMap && _ahogeMapKey === key) return _ahogeMap;
  const list = [];
  const all = new Set(HAIRS.map(h => h.p));
  EXT.forEach((v, k) => all.add(k));
  all.forEach(k => {
    const n = k.split('/').pop();
    if (!/ahoge/i.test(n)) return;
    // 只取朝向正面的呆毛；north/east/west 在正面画布上不可见
    if (/_(north|east|west)m?$/i.test(n)) return;
    const nn = n.replace(/_(north|south|east|west)m?$/i, '');
    const m = (nn.match(/(\d+)$/) || [])[1] || '';
    list.push({ k, num: m, tokens: _hairTokens(k) });
  });
  _ahogeMap = { list }; _ahogeMapKey = key;
  return _ahogeMap;
}
function ahogeKeyOf(key) {
  if (!key) return null;
  const base = String(key).replace(/_(north|south|east|west)m?$/i, '');
  const name0 = String(base).split('/').pop();
  if (/upper_?more/i.test(name0)) return null;
  const nums = base.match(/\d+/g) || [];
  const num = nums.length ? nums[nums.length - 1] : '';
  const tokens = _hairTokens(base);
  if (!tokens.size) return null;
  let best = null, bestScore = -1;
  ahogeMap().list.forEach(c => {
    let shared = 0;
    tokens.forEach(t => { if (c.tokens.has(t)) shared++; });
    if (!shared) return;
    if (num && c.num && c.num !== num) return;
    let score = shared * 10;
    if (num && c.num === num) score += 30;
    if (!c.num) score += 1;
    if (score > bestScore) { bestScore = score; best = c.k; }
  });
  return best;
}

function backHairOf(c) {
  if (!c) return null;
  const main = c.hairPreviewImg || (S.hairRef && S.hairRef.img) || null;
  if (!main || c.hairBackShow === false) return null;
  return c.hairBackImg || findBackHair(main);
}
function sideHairOf(c) {
  if (!c) return null;
  const main = c.hairPreviewImg || (S.hairRef && S.hairRef.img) || null;
  if (!main || c.hairSideShow === false) return null;
  return c.hairSideImg || findSideHair(main);
}
function backHairLabel(c) {
  const main = c && (c.hairPreviewImg || (S.hairRef && S.hairRef.img));
  if (!main) return '选了预览头发后自动匹配';
  if (HAIRS.length + EXT.size < 50) return '素材载入中…';   // 刷新后贴图是异步载入的
  const b = c.hairBackImg || findBackHair(main);
  return b ? `已匹配：${b.split('/').pop()}` : '这发型没有单独的后背层';
}


function hairOffsetShift(c) {
  const off = (c && c.exportOffset) || { x: 0, y: 0 };
  const ox = Number(off.x) || 0, oy = Number(off.y) || 0;
  return { ox, oy, dx: ox / 1024, dy: oy / 1024 };
}

function hairOffsetInfo(c) {
  const sh = hairOffsetShift(c);
  const en = LANG === 'en';
  if (!sh.ox && !sh.oy) return en ? 'Canvas has no export offset (0 / 0)' : '画布没有设置导出偏移（0 / 0）';
  const dirX = sh.ox === 0 ? '' : (sh.ox > 0 ? (en ? 'right' : '右') : (en ? 'left' : '左'));
  const dirY = sh.oy === 0 ? '' : (sh.oy > 0 ? (en ? 'down' : '下') : (en ? 'up' : '上'));
  const sign = v => (v > 0 ? '+' : '') + round(v, 1);
  const word = v => (v >= 0 ? (en ? '+' : '加') : (en ? '-' : '减'));
  const follow = c && c.hairFollowOffset
    ? (en
      ? ` → hair follows offset (X ${word(sh.dx)} ${Math.abs(sh.dx).toFixed(3)} / Y ${word(sh.dy)} ${Math.abs(sh.dy).toFixed(3)} on export)`
      : ` → 发型已跟随偏移（导出时 X ${word(sh.dx)} ${Math.abs(sh.dx).toFixed(3)} / Y ${word(sh.dy)} ${Math.abs(sh.dy).toFixed(3)}）`)
    : '';
  return en
    ? `Canvas offset X ${sign(sh.ox)}${dirX ? ' (' + dirX + ')' : ''} / Y ${sign(sh.oy)}${dirY ? ' (' + dirY + ')' : ''}${follow}`
    : `画布偏移 X ${sign(sh.ox)}${dirX ? '（' + dirX + '）' : ''} / Y ${sign(sh.oy)}${dirY ? '（' + dirY + '）' : ''}${follow}`;
}

function exportFit(c) {
  // ox/oy: the author's manual nudge, added on top of the automatic centring below
  const off = (c && c.exportOffset) || { x: 0, y: 0 };
  const ox = Number(off.x) || 0, oy = Number(off.y) || 0;
  const e = partsExtent(c);
  if (!e) return { k: 1, cx: 0, cy: 0, ox, oy };
  let k = Math.min(EXPORT_CANVAS.w / e.w, EXPORT_CANVAS.h / e.h, 1);
  // 画布已有合理参考框时，只有内容真的远超它才缩放；装饰大件不应把整只娃娃缩小
  if (c && c.bounds && c.bounds.w > 100) {
    const lim = Math.max(EXPORT_CANVAS.w / Math.max(1, e.w), EXPORT_CANVAS.h / Math.max(1, e.h), 1);
    const need = (e.w > c.bounds.w * 2.5 || e.h > c.bounds.h * 2.5);
    if (!need) k = Math.max(k, Math.min(1, lim));
  }
  // 「不自动居中」：仍然按内容缩放，但不减内容中心 —— 导出坐标 = 画布坐标 × k + 偏移
  if (c && c.noExportCenter) return { k, cx: 0, cy: 0, ox, oy };
  return { k, cx: e.x + e.w / 2, cy: e.y + e.h / 2, ox, oy };
}

function dollXML(c, indent, nameOf) {
  const i2 = indent || '';
  const lines = [];
  lines.push(`${i2}<NiceHealthTab.HumanlikeDoll>`);
  lines.push(`${i2}  <defName>${xesc(c.doll)}</defName>`);
  lines.push(`${i2}  <gender>${xesc(c.gender || '*')}</gender>`);
  lines.push(`${i2}  <xenotype>${xesc(c.xenotype || '*')}</xenotype>`);
  lines.push(`${i2}  <bodytype>${xesc(c.bodytype || '*')}</bodytype>`);
  lines.push(`${i2}  <outlinePath>${xesc(c.outline || '')}</outlinePath>`);
  // NHT places the hair overlay relative to this part; without it no hair is drawn
  // t116：异种画布会把底座部位隐藏（img 为空），只留整图立绘；头部位要取「真正有图」的那条，
  // 否则 <headPart> 会指到被隐藏的空部位，游戏里头发叠层会找不到锚点。
  const headCands = (c.parts || []).filter(p => !p.raceOff && Number(p.bid) === 13);
  const headP = headCands.find(p => p.img)
    || (c.parts || []).find(p => !p.raceOff && Number(p.bid) === 13)
    || (c.parts || []).find(p => !p.raceOff && /head/i.test(p.id || ''))
    || (c.parts || []).find(p => /头/.test(p.name || ''));
  if (headP && headP.id) {
    const finalId = nameOf ? (nameOf(headP) || headP.id) : headP.id;
    lines.push(`${i2}  <headPart>${xesc(finalId)}</headPart>`);
  }
  const ft = exportFit(c);
  // an imported race canvas sometimes carries a wildly inflated <BoundingBox> (art from
  // elsewhere pulls the auto bounds out); the game scales the doll to that box, so the
  // doll comes out tiny. Use the real part extent whenever the box is far bigger.
  const ext = partsExtent(c);
  let box = c.bounds;
  const inflated = ext && ext.w > 1 && ext.h > 1 && (box.w > ext.w * 1.6 || box.h > ext.h * 1.6);
  if (inflated) {
    const pad = 1.06;
    box = { x: ext.x - (ext.w * (pad - 1)) / 2, y: ext.y - (ext.h * (pad - 1)) / 2, w: ext.w * pad, h: ext.h * pad };
  }
  if (ft.k < 0.999) box = { x: -EXPORT_CANVAS.w / 2, y: -EXPORT_CANVAS.h / 2, w: EXPORT_CANVAS.w, h: EXPORT_CANVAS.h };
  lines.push(`${i2}  <BoundingBox>`);
  lines.push(`${i2}    <m_XMin>${nf(box.x)}</m_XMin>`);
  lines.push(`${i2}    <m_YMin>${nf(box.y)}</m_YMin>`);
  lines.push(`${i2}    <m_Width>${nf(box.w)}</m_Width>`);
  lines.push(`${i2}    <m_Height>${nf(box.h)}</m_Height>`);
  lines.push(`${i2}  </BoundingBox>`);
  // NHT draws the pawn's hair as a head overlay sized by these two fields; the stock doll uses
  // scale 310 / offset -2 for a 320 wide box, so keep them proportional to ours
  const ovScale = Math.round((box.w * 310 / 320) * 100) / 100;
  const ovOff = Math.round((-2 * box.w / 320) * 100) / 100;
  lines.push(`${i2}  <headOverlayOffset><x>${ovOff}</x><y>${ovOff}</y></headOverlayOffset>`);
  lines.push(`${i2}  <headOverlayScale><x>${ovScale}</x><y>${ovScale}</y></headOverlayScale>`);
  lines.push(`${i2}</NiceHealthTab.HumanlikeDoll>`);
  return lines.join('\n');
}

function originalDefs(doll) {
  const map = new Map();   // defName -> kind
  D.bodytypes.filter(b => b.doll === doll).forEach(b => {
    b.parts.forEach(p => map.set(p.id, p.k));
  });
  return map;
}

function originalRjwDefs(doll) {
  const map = new Map();
  RJW_PARTS.filter(p => p.doll === doll).forEach(p => map.set(p.id, p.k));
  return map;
}

const RJW_MAYREQUIRE = `
    <MayRequire>rim.job.world</MayRequire>`;

function xpathDef(tag, id) {
  return `Defs/${tag}[defName="${String(id).replace(/"/g, '&quot;')}"]`;
}


/* every defName NHT already ships: a new part must not reuse one, or the stock doll whose
   part has that name gets hijacked (that is how the female body disappeared) */
function nhtDefNames() {
  const set = new Set();
  D.bodytypes.forEach(b => (b.parts || []).forEach(p => { if (p.id) set.add(p.id); }));
  return set;
}

/* prefix for new defs: the race's own English defName, minus the trailing "_Race"
   (Milira_Race -> Milira), falling back to the doll name */
function isFormCanvas(c) {
  return !!(c && c.kind === 'race' && !(D.bodytypes || []).some(b => b.doll === c.doll));
}

function formPartId(c, p) {
  return safeDefName(String((c && c.doll) || 'Form') + '_' + String((p && p.id) || 'Part'), 'Part');
}

function defPrefix(c) {
  const raw = (c && c.race && (c.race.defName || c.race.name)) || (c && c.doll) || 'Part';
  let p = String(raw).replace(/[^A-Za-z0-9_]+/g, '_');
  p = p.replace(/_?Race$/i, '').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!p) p = 'Part';
  return p;
}

function uniqueNewId(c, p, taken) {
  const used = taken || nhtDefNames();
  const prefix = defPrefix(c);
  // already carries the race prefix: keep the author's name as it is
  if (String(p.id).toLowerCase().indexOf(prefix.toLowerCase()) === 0 && !used.has(p.id)) {
    used.add(p.id);
    return p.id;
  }
  let id = prefix + '_' + p.id;
  let n = 2;
  while (used.has(id)) id = prefix + '_' + p.id + '_' + (n++);
  used.add(id);
  return id;
}

/* official defName -> bodyPartId, taken straight from the mod's own dolls. A canvas that was
   authored with the old hand-written table still holds wrong (mirrored) ids; this maps each
   part back onto the id NHT uses for the def it replaces. */
function officialBidMap() {
  const map = new Map();
  D.bodytypes.forEach(b => (b.parts || []).forEach(p => { if (p.id && p.bid != null) map.set(p.id, p.bid); }));
  return map;
}

/* parts NHT has no def for, but whose index is fixed by the human body order */
const BID_BY_NAME = [
  [/LeftEar$/i, 18], [/RightEar$/i, 19],
  [/LeftEye$/i, 16], [/RightEye$/i, 17],
  [/Nose$/i, 20], [/Jaw$/i, 21], [/Tongue$/i, 22],
];

function bidByName(id) {
  const s0 = String(id || '');
  for (let i = 0; i < BID_BY_NAME.length; i++) if (BID_BY_NAME[i][0].test(s0)) return BID_BY_NAME[i][1];
  return null;
}

function officialBidFor(id) {
  const map = officialBidMap();
  const s0 = String(id || '');
  const cands = [s0];
  if (s0.indexOf('Milira_') === 0) cands.push(s0.slice(7));
  if (s0.indexOf('Female') !== 0) cands.push('Female' + s0);
  for (let i = 0; i < cands.length; i++) if (map.has(cands[i])) return map.get(cands[i]);
  for (let i = 0; i < cands.length; i++) { const byName = bidByName(cands[i]); if (byName != null) return byName; }
  return null;
}

function fixCanvasBids(c) {
  if (!c || !Array.isArray(c.parts)) return 0;
  let n = 0;
  c.parts.forEach(p => {
    const want = officialBidFor(p.id) != null ? officialBidFor(p.id) : raceSlotFor(c, p.bid);
    if (want != null && want !== p.bid) { p.bid = want; n++; }
  });
  return n;
}

/* the injector mod hands the race-only parts slots starting at 64, in the race body's own
   order. Keep the editor in sync so nothing has to be typed by hand. */
function raceSlotFor(c, bid) {
  if (!c || !c.race || !Array.isArray(c.race.bodyParts) || !c.race.bodyParts.length) return null;
  if (bid == null || bid < 0) return null;
  if (bid >= 64) return bid;                 // already a slot
  const human = new Set(HUMAN_SLOTS.map(x => x[0]));
  const list = c.race.bodyParts.slice().sort((a, b) => Number(a.i) - Number(b.i));
  let pos = 0;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (human.has(String(r.def || ''))) continue;
    if (Number(r.i) === Number(bid)) return 64 + pos;
    pos++;
  }
  return null;
}

/* shrink/expand the whole canvas into the stock doll box. Positions, sizes and hit boxes are
   multiplied by the same factor, so nothing visibly changes — but the doll then lives in the
   same coordinate space as NHT's own dolls (320 x 890). */
function normalizeBox(c) {
  if (!c || !c.bounds || !(c.bounds.w > 1)) return -1;
  const k = 320 / c.bounds.w;
  if (Math.abs(k - 1) < 0.002) { c.bounds = { x: -160, y: -455, w: 320, h: 890 }; delete c.gameBox; return 0; }
  (c.parts || []).forEach(p => {
    p.x = Math.round(p.x * k * 100) / 100;
    p.y = Math.round(p.y * k * 100) / 100;
    p.sx = Math.round((p.sx || 1) * k * 1000) / 1000;
    p.sy = Math.round((p.sy || 1) * k * 1000) / 1000;
    if (p.hbox) {
      p.hbox = { dx: p.hbox.dx * k, dy: p.hbox.dy * k, w: p.hbox.w * k, h: p.hbox.h * k };
    }
  });
  c.bounds = { x: -160, y: -455, w: 320, h: 890 };   // same box as the stock Female doll
  if (c.displayBox) syncDisplayBox(c);
  delete c.gameBox;                                  // the in-game canvas stays 512 x 1024
  return (c.parts || []).length;
}

/* the extra frame hugs the bottom edge and stays centred, so only its size needs editing */
function syncDisplayBox(c) {
  const d = c && c.displayBox, b = c && c.bounds;
  if (!d || !b) return;
  if (d.pos && d.pos !== 'free') return placeDisplayBox(c, d.pos);
  d.x = b.x + (b.w - d.w) / 2;
  d.y = b.y + b.h - d.h;
}

/* align the display frame: bottom / middle / top, or 自定义 (free drag) */
function placeDisplayBox(c, mode) {
  const d = c && c.displayBox, b = c && c.bounds;
  if (!d || !b) return;
  d.pos = mode || 'bottom';
  d.x = b.x + (b.w - d.w) / 2;
  if (d.pos === 'top') d.y = b.y;
  else if (d.pos === 'middle') d.y = b.y + (b.h - d.h) / 2;
  else d.y = b.y + b.h - d.h;
}

/* ---------- 标尺参考线 ---------- */

/* ---------- 备注贴纸 ---------- */
const NOTE_COLORS = ['', 'note--cyan', 'note--pink'];

function renderNotes(c) {
  const nl = $('#notesLayer');
  if (!nl) return;
  if (S.flags.notes === false) { nl.innerHTML = ''; return; }
  try {
  const list = (c && c.stickers) || [];
  nl.innerHTML = list.map((n, i) => `
    <div class="note ${n.color || ''}" data-note="${i}" style="left:${n.x}px;top:${n.y}px">
      <button class="note__x" data-note-del="${i}" title="删除备注">×</button>${esc(n.text || '')}
    </div>`).join('');
  nl.querySelectorAll('[data-note]').forEach(el => {
    el.addEventListener('dblclick', ev => {
      ev.stopPropagation();
      const cv = activeCanvas(); if (!cv) return;
      const n = cv.stickers[+el.dataset.note];
      const txt = window.prompt('修改备注（留空则删除）', n.text || '');
      if (txt == null) return;
      if (!txt.trim()) { cv.stickers.splice(+el.dataset.note, 1); }
      else n.text = txt;
      renderStage(); renderInspector(); persist();
    });
  });
  nl.querySelectorAll('[data-note-del]').forEach(btn => {
    btn.addEventListener('pointerdown', ev => ev.stopPropagation());
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const cv = activeCanvas(); if (!cv) return;
      cv.stickers.splice(+btn.dataset.noteDel, 1);
      renderStage(); persist();
    });
  });
  } catch (e) { /* ignore */ }
}

function addNote() {
  const c = activeCanvas(); if (!c) return;
  const txt = window.prompt('备注内容', '');
  if (txt == null || !txt.trim()) return;
  c.stickers = c.stickers || [];
  const pt = S.lastBoard || { x: 0, y: 0 };
  c.stickers.push({ x: Math.round(pt.x), y: Math.round(pt.y), text: txt, color: '' });
  renderStage(); renderInspector(); pushHistory();
  toast('已添加备注贴纸（可拖动 / 双击改字 / × 删除）');
}

function renderGuides(c) {
  const gl = $('#guidesLayer');
  if (!gl) return;
  gl.classList.toggle('is-off', S.flags.guides === false);
  const list = (c && c.guides) || [];
  const OFF = 2400;   // .guides 层是 left/top:-2400px 的 4800 大画布
  gl.innerHTML = list.map((g, i) => g.o === 'h'
    ? `<div class="guide-line guide-line--h" data-guide="${i}" style="top:${g.p + OFF}px"></div>`
    : `<div class="guide-line guide-line--v" data-guide="${i}" style="left:${g.p + OFF}px"></div>`).join('');
  gl.querySelectorAll('[data-guide]').forEach(el => {
    el.addEventListener('contextmenu', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const cv = activeCanvas(); if (!cv) return;
      cv.guides.splice(+el.dataset.guide, 1);
      renderStage(); pushHistory();
      toast('已删除参考线');
    });
  });
}

const HAIRFIT_DEF = new Map();
  const DESAT_DEFS = new Set();   // 每个种族只导一条 DesatPartsDef
  const HAIR_TINT_DEFS = new Set(); // 每个种族只导一条 HairTintDef
  const ADDON_FOLLOW_DEFS = new Set(); // 每个种族只导一条 AddonFollowDef

/* ---------------- NHT 种族部位对照表 ---------------- */
/* NHT 的 64 个标准槽位（顺序 = bodyPartId），和 DLL 里的 NHT_SLOT_DEFS 一致 */
const NHT_SLOT_DEFS = ['Torso','Ribcage','Sternum','Pelvis','Spine','Stomach','Heart','Lung','Lung',
  'Kidney','Kidney','Liver','Neck','Head','Skull','Brain','Eye','Eye','Ear','Ear','Nose','Jaw','Tongue',
  'Shoulder','Clavicle','Arm','Humerus','Radius','Hand','Finger','Finger','Finger','Finger','Finger',
  'Shoulder','Clavicle','Arm','Humerus','Radius','Hand','Finger','Finger','Finger','Finger','Finger',
  'Waist','Leg','Femur','Tibia','Foot','Toe','Toe','Toe','Toe','Toe','Leg','Femur','Tibia','Foot',
  'Toe','Toe','Toe','Toe','Toe'];

/* 用 BodyDef 的原始部位表算对照：[[nhtSlot, bodyIndex], ...]
   注意：导入后 race.bodyParts 已被改写成「NHT 槽位下标」，真正的身体下标只留在 race.bodyDefs 里，
   所以这里优先读 bodyDefs，否则会算成恒等表（Yuran 这种在 Spine 后插了一条尾巴的身体会整体错位）。 */
/* 左/右这类标签归一化：小写、去标点、词序无关（"Left ear" == "ear left"） */
function normBodyLabel(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .trim().split(/\s+/).filter(Boolean).sort().join(' ');
}

function remapFromBodyParts(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const defs = list.map(x => String((x && x.def) || '').toLowerCase());
  const labs = list.map(x => normBodyLabel(x && x.label));
  const idx = list.map((x, i) => Number.isFinite(Number(x && x.i)) ? Number(x.i) : i);
  const used = new Array(defs.length).fill(false);
  const slotIdx = new Array(HUMAN_SLOTS.length).fill(-1);
  const take = (slot, hit) => { used[hit] = true; slotIdx[slot] = idx[hit]; };

  // 第一轮：带左右标签的槽位按 def + 标签精确匹配。
  // 人手指/脚趾比种族多一节时（Yuran 是 4 指 3 趾），旧的“退回任意同名部位”会把后面每一格都顶偏一格。
  HUMAN_SLOTS.forEach(([def, label], slot) => {
    const dn = String(def).toLowerCase();
    const ln = normBodyLabel(label);
    if (!ln) return;
    for (let i = 0; i < defs.length; i++) {
      if (used[i] || defs[i] !== dn || labs[i] !== ln) continue;
      take(slot, i); return;
    }
  });
  // 第二轮：标签缺失（label 就是 defName）的部位按出现顺序补上，只认“没有左右信息”的那些
  HUMAN_SLOTS.forEach(([def, label], slot) => {
    if (slotIdx[slot] >= 0) return;
    const dn = String(def).toLowerCase();
    if (!normBodyLabel(label)) return;
    for (let i = 0; i < defs.length; i++) {
      if (used[i] || defs[i] !== dn) continue;
      if (labs[i] && labs[i] !== dn) continue;
      take(slot, i); return;
    }
  });
  // 第三轮：没有标签的槽位（Torso / Waist 这类）只按 def 取第一个没用过的
  HUMAN_SLOTS.forEach(([def, label], slot) => {
    if (slotIdx[slot] >= 0 || normBodyLabel(label)) return;
    const dn = String(def).toLowerCase();
    for (let i = 0; i < defs.length; i++) {
      if (!used[i] && defs[i] === dn) { take(slot, i); return; }
    }
  });

  const pairs = [];
  slotIdx.forEach((v, slot) => { if (v >= 0) pairs.push([slot, v]); });
  // 种族多出来的部位（尾巴/腮/翅……）排到 64+
  let extra = 64;
  for (let i = 0; i < defs.length; i++) { if (!used[i]) pairs.push([extra++, idx[i]]); }
  return pairs.sort((a, b) => a[0] - b[0]);
}

/* 从画布里记录的种族身体部位表算对照（bodyDefs 缺失时的兜底） */
function raceBodyRemap(c) {
  const rp = (c && c.race && Array.isArray(c.race.bodyParts)) ? c.race.bodyParts : null;
  if (!rp || !rp.length) return null;
  return remapFromBodyParts(rp);
}

/* 确保画布上存着对照表（导入时 / 导出时都会补） */
function ensureRaceRemap(c) {
  if (!c || c.kind !== 'race' || !c.race) return null;
  const body = c.race.bodyDef;
  if (!body || /^Human$/i.test(body)) return null;
  // 游戏写回来的对照表最准（下标就是 AllParts 顺序），有就优先用
  if (c.race.remapSrc === 'game' && Array.isArray(c.race.remap) && c.race.remap.length) return c.race.remap;
  const bd = (c.race.bodyDefs || []).find(d => d && d.defName === body);
  const pairs = remapFromBodyParts(bd && bd.parts) || raceBodyRemap(c);
  if (!pairs || !pairs.length) return null;
  c.race.remap = pairs;
  c.race.remapBody = body;
  c.race.remapSrc = 'guess';
  return pairs;
}

/* 从 Editor/body-map-<body>.json 读游戏给的对照表（多个画布共用同一个身体时只读一次） */
async function loadRaceRemaps() {
  if (!LOCAL_HTTP) return 0;
  const cache = new Map();
  let n = 0;
  const list = (S.canvases || []).filter(c => c && c.kind === 'race' && c.race && c.race.bodyDef && !/^Human$/i.test(c.race.bodyDef));
  for (const c of list) {
    const body = c.race.bodyDef;
    let j = cache.get(body);
    if (j === undefined) {
      j = null;
      try {
        const r = await fetch('body-map-' + encodeURIComponent(body) + '.json', { cache: 'no-store' });
        if (r.ok) {
          const t = await r.json();
          if (t && Array.isArray(t.pairs) && t.pairs.length) j = t;
        }
      } catch (e) { }
      cache.set(body, j);
    }
    if (!j) continue;
    const pairs = j.pairs.map(p => [Number(p.nht), Number(p.body)]);
    c.race.remap = pairs;
    c.race.remapBody = j.body || body;
    c.race.remapSrc = 'game';
    n++;
  }
  // 没有游戏对照表的画布，按 BodyDef 原始部位表重算一次（修掉以前算成恒等表的错表）
  let fixed = 0;
  for (const c of list) {
    if (c.race.remapSrc === 'game') continue;
    try { if (ensureRaceRemap(c)) fixed++; } catch (e) { }
  }
  if (n || fixed) persist();
  return n + fixed;
}

function bodyRemapXML(bodyDef, pairs, indent) {
  const pad = indent || '      ';
  const defName = 'NHTCD_BodyRemap_' + String(bodyDef).replace(/[^\w.-]+/g, '_');
  const rows = pairs.map(([a, b]) => pad + '      <li>' + a + ', ' + b + '</li>').join('\n');
  return pad + '<!-- ' + bodyDef + ' · 种族部位对照表（NHT 槽位 → 身体部位下标） -->\n'
    + pad + '<NiceHealthTab.BodyPartIndexesRemap>\n'
    + pad + '  <defName>' + xesc(defName) + '</defName>\n'
    + pad + '  <bodyDefName>' + xesc(bodyDef) + '</bodyDefName>\n'
    + pad + '  <parts>\n' + rows + '\n' + pad + '  </parts>\n'
    + pad + '</NiceHealthTab.BodyPartIndexesRemap>';
}

// t58：本次导出中被跳过的专属部位（defName 为空 / 不在模组自带部位列表里）
const BAD_VARIANT_NAMES = [];
// t56-R3：导出收尾时汇总提示一次（同一批内容不重复弹）
let badNamesLastSig = '';
/* t58-E(R3-1)：清空移到调用方 —— 每个导出入口在构建 XML **之前**调用一次 */
function beginExportBadScan() { try { BAD_VARIANT_NAMES.length = 0; } catch (e) { } }
function reportBadVariantNames() {
  try {
    if (!BAD_VARIANT_NAMES.length) return;
    const head = BAD_VARIANT_NAMES.slice(0, 5).map(x =>
      (x.race || '?') + ' · ' + (x.title || '?') + ' · ' + (x.name ? x.name : '(' + x.uid + ')'));
    const total = BAD_VARIANT_NAMES.length;
    const msg = '有 ' + total + ' 个异种专属部位缺少合法 defName，跳过 ' + total + ' 行：' + head.join('；')
      + (total > head.length ? ' 等' : '');
    const sig = String(total) + '#' + head.join('|');
    console.warn('[NHT 编辑器] ' + msg);
    if (sig !== badNamesLastSig) { badNamesLastSig = sig; toast(msg, true); }
    BAD_VARIANT_NAMES.length = 0;   // 消费掉，避免下次误报
  } catch (e) { }
}
/* t58：导出时每个部位最终写进 XML 的 defName —— 这是「游戏里真实存在的部位」的唯一权威来源。
   「+ 添加部位」的候选列表与导出校验都调它，避免 UI 和导出各算一套命名而漂移。 */
function exportPartNameMap(c) {
  const orig = originalDefs(c.doll);
  const rjwOrig = originalRjwDefs(c.doll);
  const nameSeed = nhtDefNames();
  const nameMap = new Map();
  sortParts((c && c.parts) || []).forEach(p => {
    if (p.raceOff) return;
    if (!p.img) return;
    if (c.rjw === false && p.source === 'rjw') return;      // RJW 关闭：不导出
    const isRjw = p.source === 'rjw' && rjwOrig.has(p.id);
    if (isFormCanvas(c)) nameMap.set(p.uid, formPartId(c, p));
    else if (orig.has(p.id) || isRjw) nameMap.set(p.uid, p.id);
    // 只修 Moyo：它的尾巴/触角 id 已经带 Alien_Moyo_ 前缀，不能再加一次。
    else if (p.id && p.id.startsWith('Alien_Moyo_')) nameMap.set(p.uid, p.id);
    else nameMap.set(p.uid, uniqueNewId(c, p, nameSeed));
  });
  return { nameMap, nameOf: p => nameMap.get(p.uid) };
}

/* t58：模组自带部位的 defName 全集（defName → 人类可读名），供「+ 添加部位」弹窗列出可选部位 */
function partDefNamePool(c) {
  const pool = new Map();
  if (!c) return pool;
  const map = exportPartNameMap(c);
  // t59-A6：只列「模组自带的真实部位」——detached 里的 Empty_* / Race_1_copy 之类是画布占位，
  // bid<0 且没有真正 defName，放进池子会让导出写出游戏匹配不到的 <part>。
  (c.parts || []).forEach(p => {
    if (!p || !p.uid) return;
    if (Number(p.bid) < 0) return;
    const dn = map.nameMap.get(p.uid) || String(p.defName || p.id || '').trim();
    if (!dn || /^Empty_/i.test(dn) || pool.has(dn)) return;
    pool.set(dn, partDisplayName(p) || p.nameEn || p.name || p.id || '');
  });
  return pool;
}

function buildPatchXML(scope) {
  const list = (scope === 'one' ? [activeCanvas()] : S.canvases)
    .filter(Boolean)
    .filter(c => !canvasIsPristineDefault(c));   // 默认坐标没动过 → 不导出
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const ops = [];
  const adds = [];
  const opCount = () => ops.filter(s => s.startsWith('  <Operation')).length;
  // 每次生成补丁前清掉上一轮记录的 HairFitDef，否则会留下指向不存在的 Def 的 aboveParts
  list.forEach(cv => { try { HAIRFIT_DEF.delete(cv.id); } catch (e) { } });
  try { DESAT_DEFS.clear(); } catch (e) { }   // 每次生成都重算，别被上一次预览占掉
  try { HAIR_TINT_DEFS.clear(); } catch (e) { }
  try { ADDON_FOLLOW_DEFS.clear(); } catch (e) { }
  // 导出前重新校验种族 BodyDef：种族没有的部位不写进补丁
  list.forEach(cv => { try { applyRaceBodyPartValidity(cv); } catch (e) { } });

  // 导出前把过小的命中框自动放大到可用尺寸（太小的框在游戏里点不到）
  list.forEach(cv => [].concat(cv.parts || [], cv.detached || []).forEach(pp => { try { (EYE_HB_ENABLED && isEyePart(pp)) ? applyEyeHitbox(pp, true) : ensureHitbox(pp); } catch (e) { } }));

  const usedColorDefs = new Set();
  // t58-E：BAD_VARIANT_NAMES 的清空移到调用方（导出入口统一 beginExportBadScan → report），
  // 这里不再清空，否则 renderPatch / 批量导出中途会互相抹掉对方的扫描结果。
  list.forEach(c => {
    // 只要有人开了「置顶重画」，就必须导出 HairFitDef（aboveParts 存在里面），否则补丁里会出现悬空的 xpath
    const anyAbove = (c.parts || []).some(p => p.overHair && p.img);
    const vanillaHairRace = c.kind === 'race' && !!c.race && !harHairOf(c);
    if ((c.hairFitEnabled || c.hairFitUseWhenOff || anyAbove || vanillaHairRace) && c.doll) {
      const f = c.hairFit || { scale: 0.78, offsetX: 0, offsetY: -0.21 };
      // NHT 用 pawn.def.defName 查表：可能是 doll 名，也可能是异种/种族名，两个都写一份
      const rawKeys = (Array.isArray(c.hairRaceKeys) && c.hairRaceKeys.length ? c.hairRaceKeys : [])
        .concat([c.race && (c.race.defName || c.race.name), c.xenotype, c.doll])
        .filter(v => v && String(v).trim() && String(v).trim() !== '*');
      const raceKeys = [...new Set(rawKeys.map(v => String(v).trim()))];
      const sx = (+f.scale || 0.78).toFixed(3);
      const followOff = c.hairFollowOffset || vanillaHairRace;
      const ox = ((+f.offsetX || 0) + (followOff ? hairOffsetShift(c).dx : 0)).toFixed(3);
      const oy = ((+f.offsetY || 0) + (followOff ? hairOffsetShift(c).dy : 0)).toFixed(3);
      const lay = (Number.isFinite(c.hairPreviewLayer) ? c.hairPreviewLayer
        : (Number.isFinite(c.hairLayer) ? c.hairLayer : 29)).toFixed(0);
      const backLay = (Number.isFinite(c.hairBackLayer) ? c.hairBackLayer : 0).toFixed(0);
      const defs = [];
      raceKeys.forEach(raceKey => {
        const fitDef = 'NHTCD_HairFit_' + safeDefName(raceKey, 'Race');
        defs.push(fitDef);
        ops.push(`  <!-- ${c.title} · HAR 头发参数（种族 ${raceKey}） -->`);
        ops.push(`  <Operation Class="PatchOperationAdd">
    <xpath>Defs</xpath>
    <value>
      <NHT_CustomDolls.HairFitDef>
        <defName>${fitDef}</defName>
        <race>${xesc(raceKey)}</race>
        <scale>${sx}</scale>
        <offsetX>${ox}</offsetX>
        <offsetY>${oy}</offsetY>
        <front>true</front>
        <layer>${lay}</layer>
        <showInXray>${c.hairShowInXray ? 'true' : 'false'}</showInXray>
        <vanillaScale>1.000</vanillaScale>
        <vanillaOffsetX>0.000</vanillaOffsetX>
        <vanillaOffsetY>0.000</vanillaOffsetY>
        <aboveParts>
        </aboveParts>
        <topParts>
        </topParts>
      </NHT_CustomDolls.HairFitDef>
    </value>
  </Operation>`);
      });
      HAIRFIT_DEF.set(c.id, defs);
    }
    // t70：映射到同模组的其他种族（共享本画布的娃娃）
    const raceAliases = Array.isArray(c.raceAliases) ? c.raceAliases.filter(Boolean) : [];
    if (raceAliases.length && c.doll) {
      raceAliases.forEach((from) => {
        const rn = safeDefName('NHTCD_RaceAlias_' + from + '_to_' + (c.doll || 'Doll'), 'RaceAlias');
        adds.push(`      <!-- ${c.title} · 种族映射 ${from} → ${c.doll} -->
      <NHT_CustomDolls.RaceAliasDef>
        <defName>${xesc(rn)}</defName>
        <from>${xesc(from)}</from>
        <to>${xesc(c.doll)}</to>
      </NHT_CustomDolls.RaceAliasDef>`);
      });
    }
    const aliases = Array.isArray(c.bodyAliases) ? c.bodyAliases.filter(Boolean) : [];
    if (aliases.length && c.bodytype && c.bodytype !== '*') {
      aliases.forEach((from, ai) => {
        const an = safeDefName('NHTCD_Alias_' + (c.doll || 'Doll') + '_' + ai, 'Alias');
        adds.push(`      <!-- ${c.title} · 形态映射 ${from} → ${c.bodytype} -->
      <NHT_CustomDolls.BodyAliasDef>
        <defName>${xesc(an)}</defName>
        <race>${xesc((c.race && c.race.defName) || '*')}</race>
        <fromBody>${xesc(from)}</fromBody>
        <toBody>${xesc(c.bodytype)}</toBody>
      </NHT_CustomDolls.BodyAliasDef>`);
      });
    }


    const orig = originalDefs(c.doll);
    const rjwOrig = originalRjwDefs(c.doll);
    const present = new Set();
    // t58：导出名映射抽成 exportPartNameMap()，「+ 添加部位」的候选列表用同一个来源
    const { nameMap, nameOf } = exportPartNameMap(c);

    // 部位颜色：编辑器里标记过的部位（关闭模组设置的总开关后变黑白）
    // 这里必须写导出后的 defName（nameOf），不能写画布 id，否则 Desat.Controlled 匹配不到部位。
    {
      const desatParts = sortParts(c.parts || []).map(p => ({ p, dn: nameOf(p) })).filter(x =>
        x.dn && !x.p.raceOff && x.p.desat && x.p.img &&
        Number.isFinite(Number(x.p.bid)) && Number(x.p.bid) >= 0);
      const raceKey = (c.race && c.race.defName) ? String(c.race.defName) : '';
      const dollKey = String(c.doll || '');
      const key = raceKey || dollKey;
      if (desatParts.length && key && !DESAT_DEFS.has(key)) {
        DESAT_DEFS.add(key);
        const defName = 'NHTCD_Desat_' + safeDefName(key, 'Parts');
        const rows = desatParts.map(({ p, dn }) =>
          `          <li><part>${xesc(dn)}</part><id>${Math.trunc(Number(p.bid))}</id><label>${xesc(p.name || ('#' + p.bid))}</label></li>`).join('\n');
        ops.push(`  <!-- ${c.title} · 部位颜色开关：关闭后这些部位显示为黑白 -->`);
        ops.push(`  <Operation Class="PatchOperationAdd">
    <xpath>Defs</xpath>
    <value>
      <NHT_CustomDolls.DesatPartsDef>
        <defName>${defName}</defName>
        <label>${xesc(c.title || key)}</label>
        <race>${xesc(raceKey || '*')}</race>
        <doll>${xesc(dollKey || '*')}</doll>
        <parts>
${rows}
        </parts>
      </NHT_CustomDolls.DesatPartsDef>
    </value>
  </Operation>`);
      }
    }

    {
      // 跟随发色：编辑器自动标记的 bodyAddon colorChannel=hair 部位
      const hairParts = (c.parts || []).filter(p => p && p.hairTint && !p.raceOff && (p.id || p.name));
      const raceKey = (c.race && c.race.defName) ? String(c.race.defName) : '';
      const dollKey = String(c.doll || '');
      const key = raceKey || dollKey;
      if (hairParts.length && key && !HAIR_TINT_DEFS.has(key)) {
        HAIR_TINT_DEFS.add(key);
        const defName = 'NHTCD_HairTint_' + safeDefName(key, 'Parts');
        const rows = hairParts.map(p => `          <li>${xesc(nameOf(p))}</li>`).join('\n');
        ops.push(`  <!-- ${c.title} · 跟随发色部位（耳朵/尾巴等） -->`);
        ops.push(`  <Operation Class="PatchOperationAdd">
    <xpath>Defs</xpath>
    <value>
      <NHT_CustomDolls.HairTintDef>
        <defName>${defName}</defName>
        <label>${xesc(c.title || key)} HairTint</label>
        <race>${xesc(raceKey || '*')}</race>
        <doll>${xesc(dollKey || '*')}</doll>
        <parts>
${rows}
        </parts>
      </NHT_CustomDolls.HairTintDef>
    </value>
  </Operation>`);
      }
    }

    {
      // 自动变换：编辑器标记的自定义 colorChannel bodyAddon 部位
      const followParts = (c.parts || []).filter(p => p && p.autoFollow && p.followAddon && (p.id || p.name));
      const raceKey2 = (c.race && c.race.defName) ? String(c.race.defName) : '';
      const dollKey2 = String(c.doll || '');
      const key2 = raceKey2 || dollKey2;
      if (followParts.length && key2 && !ADDON_FOLLOW_DEFS.has(key2)) {
        ADDON_FOLLOW_DEFS.add(key2);
        const defName = 'NHTCD_AddonFollow_' + safeDefName(key2, 'Parts');
        const rows = followParts.map(p => `          <li><part>${xesc(nameOf(p))}</part><addon>${xesc(p.followAddon || '')}</addon><path>${xesc(p.followPath || '')}</path><rot>${round(Number(p.followRot) || 0, 1)}</rot></li>`).join('\n');
        ops.push(`  <!-- ${c.title} · 自动变换 bodyAddon 部位 -->`);
        ops.push(`  <Operation Class="PatchOperationAdd">
    <xpath>Defs</xpath>
    <value>
      <NHT_CustomDolls.AddonFollowDef>
        <defName>${defName}</defName>
        <label>${xesc(c.title || key2)} AddonFollow</label>
        <race>${xesc(raceKey2 || '*')}</race>
        <doll>${xesc(dollKey2 || '*')}</doll>
        <parts>
${rows}
        </parts>
      </NHT_CustomDolls.AddonFollowDef>
    </value>
  </Operation>`);
      }
    }

    const vfit = exportFit(c);
    const variants = Array.isArray(c.colorVariants) ? c.colorVariants : [];
    // t58：专属部位的 <part> 必须是模组自带部位的 defName，导出前先算出允许集合
    const pool = partDefNamePool(c);
    variants.forEach((v, vi) => {
      if (!v) return;
      const genes = (v.genes || []).map(String).filter(Boolean);
      const notGenes = (v.notGenes || []).map(String).filter(Boolean);
      if (!v.hediff && !v.xenotype && !genes.length && !notGenes.length) return;
      const rows = Object.keys(v.parts || {}).map(uid => {
        const p = (c.parts || []).find(x => x.uid === uid);
        if (!p || p.raceOff || !p.img) return '';
        const dn = nameOf(p);
        if (!dn) return '';
        const r = variantPartRec(v, uid);
        if (!r || !r.img) return '';
        // 优先用异种文件夹里的灰度（迁移后的 r.gray）；没有才退回部位基础灰度。
        const gray = (r.gray && String(r.gray).startsWith('Custom/NHTCD_Gray/'))
          ? r.gray
          : ((p && p.grayImg) || r.gray);
        let out = `        <li><part>${xesc(dn)}</part><imagePath>${xesc(r.img)}</imagePath>`;
        // t20：只写磁盘上确实存在的灰图，避免重新生成/迁移后 <grayPath> 指向消失的文件
        if (gray && grayKeyUsable(gray)) out += `<grayPath>${xesc(gray)}</grayPath>`;
        if (Number.isFinite(r.x)) out += `<x>${r.x}</x>`;
        if (Number.isFinite(r.y)) out += `<y>${r.y}</y>`;
        if (Number.isFinite(r.sx)) out += `<width>${nf(r.sx * vfit.k)}</width>`;
        if (Number.isFinite(r.sy)) out += `<height>${nf(r.sy * vfit.k)}</height>`;
        return out + '</li>';
      }).filter(Boolean);
      // t58：异种专属部位（没有基础部位）也导出。<part> 写**选中的游戏部位 defName**（不是显示名），
      // 且必须真的在模组自带的部位列表里，否则游戏侧匹配不到、这条永远不会画出来。
      Object.keys(v.extraParts || {}).forEach(euid => {
        const r = variantExtraPart(v, euid);
        if (!r || !r.img) return;
        const dnX = String(r.defName || '').trim();
        if (!dnX || (pool && !pool.has(dnX))) {
          if (!BAD_VARIANT_NAMES.some(x => x.race === ((c.race && c.race.defName) || '') && x.uid === euid)) {
            BAD_VARIANT_NAMES.push({ race: (c.race && c.race.defName) || '', title: c.title || '', uid: euid, name: dnX || String(r.name || '(空)') });
          }
          return;
        }
        const grayX = (r.gray && String(r.gray).startsWith('Custom/NHTCD_Gray/')) ? r.gray : '';
        let out = `        <li><part>${xesc(dnX)}</part><imagePath>${xesc(r.img)}</imagePath>`;
        if (grayX && grayKeyUsable(grayX)) out += `<grayPath>${xesc(grayX)}</grayPath>`;
        if (Number.isFinite(r.x)) out += `<x>${r.x}</x>`;
        if (Number.isFinite(r.y)) out += `<y>${r.y}</y>`;
        if (Number.isFinite(r.sx)) out += `<width>${nf(r.sx * vfit.k)}</width>`;
        if (Number.isFinite(r.sy)) out += `<height>${nf(r.sy * vfit.k)}</height>`;
        rows.push(out + '</li>');
      });
      if (!rows.length) return;
      const dnBase = safeDefName('NHTCD_Color_' + (c.doll || 'Doll') + '_' + (v.label || vi), 'ColorVariant');
      let dn = dnBase;
      for (let n = 2; usedColorDefs.has(dn); n++) dn = dnBase + '_' + n;
      usedColorDefs.add(dn);
      const conds = [];
      if (v.hediff) conds.push(`<hediff>${xesc(v.hediff)}</hediff>`);
      if (v.xenotype) conds.push(`<xenotype>${xesc(v.xenotype)}</xenotype>`);
      if (genes.length) conds.push(`<genes>\n${genes.map(g => `          <li>${xesc(g)}</li>`).join('\n')}\n        </genes>`);
      if (notGenes.length) conds.push(`<notGenes>\n${notGenes.map(g => `          <li>${xesc(g)}</li>`).join('\n')}\n        </notGenes>`);
      if (Number(v.priority)) conds.push(`<priority>${Math.round(Number(v.priority))}</priority>`);
      adds.push(`      <!-- ${c.title} · 异种 ${v.label || v.hediff || v.xenotype || genes.join('+')} -->
      <NHT_CustomDolls.ColorVariantDef>
        <defName>${xesc(dn)}</defName>
        <race>${xesc((c.race && c.race.defName) || '*')}</race>
        <bodyType>*</bodyType>
        ${conds.join('\n        ')}
        <parts>
${rows.join('\n')}
        </parts>
      </NHT_CustomDolls.ColorVariantDef>`);
    });

    {
      // 手动指定：哪些部位画在头发之上（列表为空 = 不重画任何部位）
      const above = sortParts(c.parts).filter(p => p.overHair && p.img).map(p => nameOf(p));
      const topParts = sortParts(c.parts)
        .filter(p => !p.raceOff && p.img && (p.overHair || p.linkTop))
        .map(p => ({ id: nameOf(p), lv: Math.round(overLevelOf(p)), vanilla: !!p.linkTop && !p.overHair }));
      const topXml = topParts.map(t => `\n        <li><part>${t.id}</part><level>${t.lv}</level><vanilla>${t.vanilla ? 'true' : 'false'}</vanilla></li>`).join('');
      // 只有本次真的写了 HairFitDef 才去改它的 aboveParts；
      // 没写的话 xpath 会指向不存在的 Def，游戏加载时会报 Patch operation failed
      const fitDefs2 = HAIRFIT_DEF.get(c.id);
      if (!fitDefs2) { /* 没有 HairFitDef：跳过 aboveParts，避免悬空 xpath */ } else (Array.isArray(fitDefs2) ? fitDefs2 : [fitDefs2]).forEach(fitDef2 => {
        ops.push(`  <!-- ${c.title} · 画在头发之上的部位（${fitDef2}） -->`);
        ops.push(`  <Operation Class="PatchOperationReplace">
    <xpath>Defs/NHT_CustomDolls.HairFitDef[defName="${fitDef2}"]/aboveParts</xpath>
    <value>
      <aboveParts>${above.map(n => `\n        <li>${n}</li>`).join('')}\n      </aboveParts>
    </value>
  </Operation>`);
        ops.push(`  <Operation Class="PatchOperationReplace">
    <xpath>Defs/NHT_CustomDolls.HairFitDef[defName="${fitDef2}"]/topParts</xpath>
    <value>
      <topParts>${topXml}\n      </topParts>
    </value>
  </Operation>`);
      });
    }
    if (orig.size) {
      ops.push(`  <!-- ${c.title} · 覆盖 HumanlikeDoll ${c.doll} -->`);
      ops.push(`  <Operation Class="PatchOperationReplace">
    <xpath>${xpathDef('NiceHealthTab.HumanlikeDoll', c.doll)}</xpath>
    <value>
${dollXML(c, '      ', nameOf)}
    </value>
  </Operation>`);
    } else {
      adds.push(`      <!-- ${c.title} · 新建 HumanlikeDoll ${c.doll} -->`);
      adds.push(dollXML(c, '      ', nameOf));
    }

    const newIds = nhtDefNames();
    sortParts(c.parts).forEach(p => {
      if (p.raceOff) return;              // 种族 BodyDef 没有这个部位：不写进补丁
      if (!p.img) return;                 // empty part: no texture chosen yet, nothing to export
      if (c.rjw === false && p.source === 'rjw') return;   // RJW 关闭：数据保留但不导出
      present.add(p.id);
      const isRjw = p.source === 'rjw' && rjwOrig.has(p.id);
      const form = isFormCanvas(c);
      const pid = form ? formPartId(c, p) : p.id;
      if (!form && (orig.has(p.id) || isRjw)) {
        const tag = tagOf(orig.has(p.id) ? orig.get(p.id) : rjwOrig.get(p.id));
        ops.push(`  <!-- ${c.title} · ${p.name}${p.source === 'rjw' ? ' · RJW' : ''} -->`);
        ops.push(`  <Operation Class="PatchOperationReplace"${isRjw ? ' MayRequire="rim.job.world"' : ''}>
    <xpath>${xpathDef(tag, p.id)}</xpath>
    <value>
${partXML(p, c.doll, '      ', exportFit(c), pid)}
    </value>
  </Operation>`);
      } else {
        adds.push(partXML(p, c.doll, '      ', exportFit(c), form ? pid : uniqueNewId(c, p, newIds)));
      }
    });

    orig.forEach((kind, id) => {
      if (present.has(id)) return;
      ops.push(`  <!-- ${c.title} · 已拆卸，移除原部位 ${id} -->`);
      ops.push(`  <Operation Class="PatchOperationRemove">
    <xpath>${xpathDef(tagOf(kind), id)}</xpath>
  </Operation>`);
    });

    // t66：关闭 RJW 时**不再**从这里 remove RJW 自己的 DollBodyPart Def。
    // 这些 def 属于 RJW 补丁模组（它只定义、不挂到娃娃上），删掉它们等于修改 RJW，
    // 且会影响所有引用这些 defName 的娃娃。关闭 RJW 的正确语义 = 导出的补丁里
    // 完全不出现 RJW 相关的 Add / Replace / Remove（上面的 skip + 这里不写即可）。
    // t123：手/脚窗口的部位是**全局共享**的 HandDoll / FeetDoll Def（所有种族共用一张手），
    // 以前按画布导出成 PatchOperationReplace，等于让每个种族补丁都去改写这张共享 Def，
    // 最后一次导出的坐标会覆盖 Nice Health Tab 原值 → 所有种族的手指/脚趾整体错位。
    // 现在不再从种族补丁里导出这些改动（需要的全局校准将来单独写一条专用补丁）。
    ['hand', 'feet'].forEach(id => {
      // t127：手/脚窗口的部位改成**按种族画布导出** NhtHandPartOverride Def，
      // 运行时（Source/NHT_CustomDolls.cs 的 ApplyHandOverride）只在画 HandDoll/FeetDoll 时套用、画完立刻还原，
      // 不再改写全局共享 Def。只导出用户真正改过的字段（x/y），其余保持 Def 原值。
      const ov = c && c.winOv && c.winOv[id] && c.winOv[id].parts;
      if (!ov) return;
      const doll = id === 'hand' ? 'HandDoll' : 'FeetDoll';
      const base = winBaseParts(id, c);
      const byKey = new Map(base.map(p => [p.key, p]));
      const raceName = (c.race && c.race.defName) || c.xenotype || null;
      if (!raceName) return;
      Object.keys(ov).forEach(key => {
        const o = ov[key], b = byKey.get(key);
        if (!o || !b || !b.def) return;
        if (o.x == null && o.y == null) return;
        ops.push(`  <!-- ${doll} · ${raceName} · ${b.def} -->`);
        ops.push(`  <Operation Class="PatchOperationAdd">
    <xpath>Defs</xpath>
    <value>
      <NHT_CustomDolls.NhtHandPartOverride>
        <defName>NHTCD_HandOv_${raceName}_${doll}_${b.def}</defName>
        <race>${raceName}</race>
        <doll>${doll}</doll>
        <part>${b.def}</part>` +
            (o.x != null ? `\n    <x>${nf(o.x)}</x>` : '') +
            (o.y != null ? `\n    <y>${nf(o.y)}</y>` : '') +
            `\n  </NHT_CustomDolls.NhtHandPartOverride>
    </value>
  </Operation>`);
      });
    });

  });
  // 每个种族身体各写一份对照表（同 bodyDef 只写一次）
  // t110：任何种族都不再导出身体对照表。运行时 SolvePostfix 会按当前 BodyDef 现场补 0..N 与 64+ 槽位；
  // 静态表在其他模组（RJW 等）增删身体部位后会过期，把腮/尾巴等槽位指到肛门、性腺等错误部位。
  try { list.forEach(c => { if (!c || c.kind !== 'race') return; }); } catch (e) { }

  if (adds.length) {
    ops.push(`  <!-- 新增定义 -->`);
    ops.push(`  <Operation Class="PatchOperationAdd">
    <xpath>Defs</xpath>
    <value>
${adds.join('\n')}
    </value>
  </Operation>`);
  }

  const head = `<?xml version="1.0" encoding="utf-8"?>
<!--
  ${xesc(S.project.name)}${S.project.author ? ' · ' + xesc(S.project.author) : ''}
  由 NHT Anatomy Editor 生成 · ${stamp}
  基准模组：Nice Health Tab (${MOD.packageId}) v${MOD.version} · 创意工坊 ${MOD.workshop}
${RJW_PARTS.length ? `  RJW 层：${xesc(RJW_MOD.name)} (${RJW_MOD.packageId}) · 相关操作带 MayRequire rim.job.world
` : ''}  画布：${list.length} 个 · 部位：${list.reduce((n, c) => n + c.parts.length, 0)} 个 · 补丁操作：${opCount()} 段
  贴图路径指向 Nice Health Tab（以及 RJW 补丁）的 Textures/ 目录。直接点「保存到注入模组」写进 ${esc(SELF.name)}/Patches/ 即可，也可以手动放进任意模组的 Patches/。
  ${S.project.note ? '备注：' + xesc(S.project.note).replace(/\n/g, ' ') : ''}
-->`;
  // 给每段 Operation 加 <success>Always</success>：别的模组换了 Def / 少了某个部位时，
  // 补丁不会在日志里刷红色错误，也不会中断后续操作
  const seenOps = new Set();
  const uniqOps = ops.filter(op => { if (seenOps.has(op)) return false; seenOps.add(op); return true; });
  const body = uniqOps.join('\n').replace(/<Operation Class="([^"]+)">/g,
    '<Operation Class="$1">\n    <success>Always</success>');
  // t94：种族补丁按「种族 ThingDef 是否存在」加守卫 ——
  // 该种族模组缺失时整档不注入，避免补丁引用的别家贴图在加载期报 Could not load Texture2D。
  // 用 Defs/*[defName=...] 而不是包名：HAR 种族的元素名是 AlienRace.ThingDef_AlienRace，
  // 通配 * 能同时覆盖 ThingDef 与 AlienRace.ThingDef_AlienRace，也不受整合包/改名影响。
  const guardRace = (() => {
    if (!list.length) return '';
    if (list.some(c => c.kind !== 'race')) return '';
    // t99: NHT 用 doll 的 <xenotype> 做种族索引；画布的 race.defName 可能只是娃娃名
    // （如 Miho 的 Alien_Miho_Mech_Bulgasal vs 真实种族 Alien_Miho），守卫必须以 xenotype 优先。
    const guardOf = c => String(c.xenotype || (c.race && c.race.defName) || c.doll || '').trim();
    const races = [...new Set(list.map(guardOf).filter(Boolean))];
    return races.length === 1 ? races[0] : '';
  })();
  // t96: race markers live OUTSIDE the guard, so the settings page can still list
  // races whose mod is missing and show them as not loaded.
  const markerRaces = [...new Set(list.map(c => String((c.race && c.race.defName) || '').trim()).filter(Boolean))];
  const markerXml = markerRaces.map(r => `  <!-- race marker: ${xesc(r)} -->
  <Operation Class="PatchOperationAdd">
    <xpath>Defs</xpath>
    <value>
      <NHT_CustomDolls.RaceMarkerDef>
        <defName>NHTCD_RaceMarker_${safeDefName(r, 'Race')}</defName>
        <race>${xesc(r)}</race>
      </NHT_CustomDolls.RaceMarkerDef>
    </value>
  </Operation>`).join('\n');

  let patchBody = guardRace
    ? `  <Operation Class="PatchOperationConditional">
    <xpath>Defs/*[defName='${xesc(guardRace)}']</xpath>
    <match Class="PatchOperationSequence">
      <operations>
${body.split('\n').map(l => {
        const t = l.trim();
        if (!t) return l;
        return '        ' + t.replace(/^<Operation Class=/, '<li Class=').replace(/<\/Operation>$/, '</li>');
      }).join('\n')}
      </operations>
    </match>
  </Operation>`
    : body;
  if (markerXml) patchBody = markerXml + '\n' + patchBody;
  return `${head}
<Patch>
${patchBody}
</Patch>
`;
}

function stateLabel(s) {
  return { ok: '完好', hurt: '受伤', missing: '缺失', prosthetic: '假体' }[s] || s;
}

/* ==========================================================================
   actions
   ========================================================================== */
function select(uidVal) {
  S.winSel = null;
  S.sel = uidVal;
  if (uidVal) { S.lastSel = uidVal; S.tab = 'inspect'; }
  else if (S.tab === 'inspect') { S.tab = 'global'; }
  try { renderTabs(); } catch (e) { }
  $$('.part').forEach(el => el.classList.toggle('is-selected', el.dataset.uid === uidVal));
  renderOverlay();
  renderSelInfo();
  renderInspector();
  renderTree();
  $$('.dollwin .wpart.is-sel').forEach(el => el.classList.remove('is-sel'));
}

function switchCanvas(id) {
  S.viewOnly = null;
  if (S.preview) { S.preview = null; document.body.classList.remove('is-preview'); }
  if (S.active === id) return;
  closeVariantGeomFloat(false);
  S.active = id; S.sel = null;
  // the organ / bone chips are global: keep their promise on the canvas we just opened
  revealKindLayers(activeCanvas());
  renderAll();
  fitView();
  persist();
  const c = activeCanvas();
  if (c) toast(`切换画布：${c.title}`);
}

/* when the 器官 / 骨骼 layer is on, make sure that canvas actually shows those parts */
function revealKindLayers(c) {
  if (!c) return;
  ['organ', 'bone'].forEach(k => {
    if (S.kinds[k] === false) return;
    c.parts.forEach(p => { if (p.kind === k) p.vis = true; });
  });
}

function addPart(opts) {
  const c = activeCanvas(); if (!c) return null;
  const [w, h] = imgDim(opts.img);
  const p = {
    uid: uid(),
    id: opts.id || ('Custom_' + (c.parts.filter(x => x.custom).length + 1)),
    name: opts.name || prettyAsset(opts.img),
    nameEn: opts.name || prettyAsset(opts.img),
    kind: 'custom', bid: opts.bid == null ? -1 : opts.bid,
    img: opts.img,
    x: opts.x == null ? 0 : opts.x,
    y: opts.y == null ? 0 : opts.y,
    sx: opts.sx == null ? 1 : opts.sx,
    sy: opts.sy == null ? 1 : opts.sy,
    flip: !!opts.flip, rot: opts.rot || 0,
    layer: opts.layer == null ? 30 : opts.layer, extra: 0,
    hb: [0.9, 0.9], armor: true, vis: true, locked: false,
    state: 'ok', sev: 0, wound: 'cut', prosth: null,
    atlas: null, uv: null, custom: true, source: opts.source || 'library'
  };
  c.parts.push(p);
  return p;
}

function addAsset(path, at) {
  const c = activeCanvas(); if (!c) return;
  const p = addPart({
    img: path,
    x: at ? round(at.x, 1) : 0,
    y: at ? round(at.y, 1) : 0,
    name: prettyAsset(path)
  });
  S.sel = p.uid;
  renderAll();
  pushHistory();
  toast(`已添加自定义部位：${p.name}`);
}

/* a part is created empty (in the tree) and only then gets a texture */
function addEmptyPart(c, gk, name) {
  if (!c) return null;
  const p = addPart({ img: '', x: 0, y: 0, name: name || '新部位' });
  if (!p) return null;
  const b = canvasBounds(c);
  p.x = round(b.x + b.w / 2, 1);
  p.y = round(b.y + b.h / 2, 1);
  p.id = 'Empty_' + (c.parts.filter(x => x.custom).length);
  p.name = name || '新部位';
  p.nameEn = '';
  p.group = KGROUP_KEYS.has(gk) && gk !== 'rjw' ? gk : 'body';
  p.kind = p.group;
  p.custom = true;
  p.bid = -1;
  return p;
}

/* ---- user materials: PNGs the author adds to the library ------------------ */
function registerCustomAsset(rec) {
  if (!rec || !rec.p) return null;
  if (!rec.data) {
    const entry0 = { p: rec.p, n: rec.n || String(rec.p).split('/').pop(), w: rec.w || 0, h: rec.h || 0, cat: 'mine', g: '我的素材', custom: true, disk: true };
    ASSETMAP.set(rec.p, entry0);
    const at0 = ASSETS.findIndex(a => a.p === rec.p);
    if (at0 >= 0) ASSETS[at0] = entry0; else ASSETS.unshift(entry0);
    return entry0;
  }
  CUSTOM.set(rec.p, rec);
  // 待保存的裁剪缓存：只用于画布渲染，不作为素材展示
  if (!rec.disk && /\/Crop_[^/]+$/.test(String(rec.p))) {
    const at0 = ASSETS.findIndex(a => a.p === rec.p);
    if (at0 >= 0) ASSETS.splice(at0, 1);
    ASSETMAP.delete(rec.p);
    return null;
  }
  const entry = {
    p: rec.p, n: rec.n || String(rec.p).split('/').pop(),
    w: rec.w || 64, h: rec.h || 64,
    cat: 'mine', g: '我的素材', ab: [0, 0, rec.w || 64, rec.h || 64], custom: true,
  };
  ASSETMAP.set(rec.p, entry);
  const at = ASSETS.findIndex(a => a.p === rec.p);
  if (at >= 0) ASSETS[at] = entry; else ASSETS.unshift(entry);
  return entry;
}

function restoreCustomAssets() {
  (S.customAssets || []).forEach(registerCustomAsset);
}

function addAssetFiles(files) {
  const list = Array.from(files || []).filter(f => /^image\//.test(f.type || '') || /\.(png|webp|gif|jpe?g)$/i.test(f.name || ''));
  if (!list.length) { toast('请选择 PNG / WebP / JPG 图片', true); return; }
  let done = 0;
  const finish = () => {
    if (++done < list.length) return;
    try {
      const cat = customCat();
      if (!S.ui.open) S.ui.open = {};
      S.ui.open['我的素材'] = true;
      S.ui.open['mine:' + cat] = true;
    } catch (e) { }
    renderLibrary();
    persist();
    const big = list.filter(f => f.size > 1.2e6).length;
    toast(`已添加 ${list.length} 个素材${big ? `（有 ${big} 张超过 1MB，建议压到 512px 内）` : ''}：点它，或拖到部位上`);
  };
  list.forEach(f => {
    const rd = new FileReader();
    rd.onload = () => {
      const url = String(rd.result || '');
      const im = new Image();
      im.onload = () => {
        const name = String(f.name || '素材').replace(/\.[^.]+$/, '');
        const p = 'Custom/' + customCat() + '/' + name.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
        const rec = { p, n: name, w: im.naturalWidth, h: im.naturalHeight, data: url };
        if (!S.customAssets) S.customAssets = [];
        const i = S.customAssets.findIndex(x => x.p === p);
        if (i >= 0) S.customAssets[i] = rec; else S.customAssets.push(rec);
        registerCustomAsset(rec);
        finish();
      };
      im.onerror = finish;
      im.src = url;
    };
    rd.onerror = finish;
    rd.readAsDataURL(f);
  });
}

/* give a texture to an existing part - never creates one */
function assignAssetTo(p, path) {  if (!p || !path) return false;
  if (p.source === 'rjw') {
    toast('RJW 部位的贴图由模组形态决定，不能直接替换', true);
    return false;
  }
  const wasEmpty = !p.img;
  p.img = path;
  if (wasEmpty || !p.name || p.name === '新部位') {
    p.name = prettyAsset(path);
    p.nameEn = p.name;
    p.custom = true;
    p.kind = 'custom';
  }
  if (wasEmpty) { p.sx = 1; p.sy = 1; }
  S.sel = p.uid;
  renderAll();
  pushHistory();
  toast(`「${p.name}」已加上贴图：${prettyAsset(path)}`);
  return true;
}

function addPreset(i) {
  const pr = PRESETS[i]; if (!pr) return;
  const c = activeCanvas(); if (!c) return;
  const base = { img: pr.img, sx: pr.sx, sy: pr.sy, layer: pr.layer, name: pr.label };
  const created = [];
  if (pr.pair) {
    created.push(addPart({ ...base, x: -pr.x, y: pr.y, flip: true }));
    created.push(addPart({ ...base, x: pr.x, y: pr.y, flip: false }));
  } else {
    created.push(addPart({ ...base, x: pr.x, y: pr.y, flip: false }));
  }
  S.sel = created[created.length - 1].uid;
  renderAll();
  pushHistory();
  toast(pr.pair ? `已添加成对部位：${pr.label}` : `已添加部位：${pr.label}`);
}

function detachPart(p) {
  const c = activeCanvas(); if (!c || !p) return;
  const i = c.parts.indexOf(p);
  if (i < 0) return;
  c.parts.splice(i, 1);
  c.detached.push(p);
  S.sel = null;
  renderAll();
  pushHistory();
  toast(`已拆卸：${p.name} · 可在下方「已拆卸」中装回`);
}
function reattachPart(p) {
  const c = activeCanvas(); if (!c || !p) return;
  const i = c.detached.indexOf(p);
  if (i < 0) return;
  c.detached.splice(i, 1);
  c.parts.push(p);
  S.sel = p.uid;
  renderAll();
  pushHistory();
  toast(`已装回：${p.name}`);
}
function deletePart(p, hard) {
  const c = activeCanvas(); if (!c || !p) return;
  let i = c.parts.indexOf(p);
  if (i >= 0) c.parts.splice(i, 1);
  i = c.detached.indexOf(p);
  if (i >= 0) c.detached.splice(i, 1);
  S.sel = null;
  renderAll();
  pushHistory();
  toast(`已删除：${p.name}`);
}
function duplicatePart(p) {
  const c = activeCanvas(); if (!c || !p) return;
  const copy = JSON.parse(JSON.stringify(p));
  copy.uid = uid();
  copy.id = p.id + '_copy';
  copy.name = p.name + ' 副本';
  copy.x = p.x + 18; copy.y = p.y + 18;
  c.parts.push(copy);
  S.sel = copy.uid;
  renderAll(); pushHistory();
  toast('已复制部位');
}
function mirrorPart(p) {
  const c = activeCanvas(); if (!c || !p) return;
  const copy = JSON.parse(JSON.stringify(p));
  copy.uid = uid();
  copy.id = p.id + '_L';
  copy.name = p.name.replace(/(右|左)/, m => (m === '右' ? '左' : '右')) + '（镜像）';
  copy.x = -p.x; copy.flip = !p.flip;
  c.parts.push(copy);
  S.sel = copy.uid;
  renderAll(); pushHistory();
  toast('已生成镜像部位');
}

/* ==========================================================================
   pointer interaction
   ========================================================================== */
let drag = null;
let guideDrag = null;
let spaceDown = false;

function onPointerDown(e) {
  if (e.button === 2) return;
  if (S.preview) { toast('只读预览：要编辑请先点「应用」或「还原」', true); return; }
  // 从标尺拖出参考线（PS 风格）
  const ruler = e.target.closest('.ruler');
  if (ruler) {
    guideDrag = { o: ruler.id === 'rulerX' ? 'h' : 'v', preview: null };
    try { $('#stage').setPointerCapture(e.pointerId); } catch (err) { }
    e.preventDefault(); return;
  }
  // the stage also hosts real controls (toolbar chips, zoom buttons): never start a pan
  // on top of them, otherwise the pointer capture steals their click
  if (e.target.closest('[data-act], .stage__bar, .zoomer, .stage__sel, .dollwin')) return;
  const stage = $('#stage');
  const handle = e.target.closest('[data-handle]');
  const rot = e.target.closest('[data-rot]');
  const hitH = e.target.closest('[data-hh]');
  const noteEl = e.target.closest('[data-note]');
  if (noteEl && !e.target.closest('[data-note-del]')) {
    const c = activeCanvas();
    const n = c && c.stickers && c.stickers[+noteEl.dataset.note];
    if (n) {
      drag = { mode: 'notemove', start: boardPoint(e.clientX, e.clientY), x0: n.x, y0: n.y, n };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { }
      e.preventDefault(); return;
    }
  }
  const hairPrev = e.target.closest('.hairprev, #hairPreview, #hairBackPreview');
  const hairGrip = e.target.closest('[data-hpgrip]');
  const dispRect = e.target.closest('#dispRect');
  const dispGrip = e.target.closest('[data-dispgrip]');
  const iconNode = e.target.closest('[data-ico]');
  const partNode = e.target.closest('.part');
  const picked = (partNode || hairPrev) ? pickAt(e.clientX, e.clientY) : null;

  if (hitH) {
    const p = selPart(); if (!p) return;
    const b = hitBox(p);
    const i = +hitH.dataset.hh;
    const opp = [
      { x: b.dx + b.w / 2, y: b.dy + b.h / 2 },   // opposite of TL
      { x: b.dx - b.w / 2, y: b.dy + b.h / 2 },
      { x: b.dx - b.w / 2, y: b.dy - b.h / 2 },
      { x: b.dx + b.w / 2, y: b.dy - b.h / 2 },
    ][i];
    drag = { mode: 'hitsize', p, oppStart: opp };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    e.preventDefault(); return;
  }
  if (HAIR_MODE) {
    const c = activeCanvas();
    // 参考头发
    if (HAIR_MODE_TARGET === 'ref' && HAIR_REF && HAIR_REF.img && HAIR_REF.vis !== false && !HAIR_REF.locked) {
      drag = { mode: 'hairref', start: boardPoint(e.clientX, e.clientY), x0: HAIR_REF.x, y0: HAIR_REF.y };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { }
      e.preventDefault(); return;
    }
    if (HAIR_MODE_TARGET === 'preview' && c && c.hairPreviewImg && !c.hairLocked) {
      const hf = c.hairFit || { scale: 0.78, offsetX: 0, offsetY: -0.21 };
      if (!c.hairFit) c.hairFit = hf;
      drag = { mode: 'hairmove', start: boardPoint(e.clientX, e.clientY), x0: hf.offsetX || 0, y0: hf.offsetY || 0, c };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { }
      e.preventDefault(); return;
    }
  }
  if (hairPrev || (picked && picked.type === 'hair')) {
    const c = activeCanvas();
    if (c && c.hairLocked) return;                 // 锁定后不再拖得动
    const hf = (c && c.hairFit) || { scale: 0.78, offsetX: 0, offsetY: -0.21 };
    if (c && !c.hairFit) c.hairFit = hf;          // 老画布没有参数时补一份默认值
    drag = hairGrip
      ? { mode: 'hairscale', start: boardPoint(e.clientX, e.clientY), s0: hf.scale || 0.78, c }
      : { mode: 'hairmove', start: boardPoint(e.clientX, e.clientY), x0: hf.offsetX || 0, y0: hf.offsetY || 0, c };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    e.preventDefault(); return;
  }
  if (dispRect) {
    const c = activeCanvas();
    const d = c && c.displayBox;
    if (!d || d.locked) return;
    drag = dispGrip
      ? { mode: 'dispsize', start: boardPoint(e.clientX, e.clientY), w0: d.w, h0: d.h, x0: d.x, y0: d.y, c }
      : { mode: 'dispmove', start: boardPoint(e.clientX, e.clientY), x0: d.x, y0: d.y, c };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    e.preventDefault(); return;
  }
  if (iconNode) {
    const uid = iconNode.dataset.ico;
    const c = activeCanvas();
    const p = c && c.parts.find(x => String(x.uid) === uid);
    if (p) {
      select(p.uid);
      drag = { mode: 'iconmove', p, start: boardPoint(e.clientX, e.clientY), nx0: p.nx || 0, ny0: p.ny || 0 };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { }
      e.preventDefault(); return;
    }
  }
  if (handle) {
    const p = selPart(); if (!p) return;
    drag = { mode: 'scale', p, idx: +handle.dataset.handle, start: boardPoint(e.clientX, e.clientY), sx0: p.sx, sy0: p.sy, x0: p.x, y0: p.y,
      // t32-B2：把拖动起点的命中框快照下来。原来每次 pointermove 都用「当前 hbox × 增量比例」，
      // 同一个拖动里越乘越大（50 → 80 → 128 …），松手时已经顶到上限。
      hb0: p.hbox ? { dx: Number(p.hbox.dx) || 0, dy: Number(p.hbox.dy) || 0, w: Number(p.hbox.w) || 0, h: Number(p.hbox.h) || 0 } : null };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    e.preventDefault(); return;
  }
  if (rot) {
    const p = selPart(); if (!p) return;
    drag = { mode: 'rotate', p, rot0: p.rot || 0 };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    e.preventDefault(); return;
  }
  if (partNode) {
    // 穿透透明像素：找到指针下真正不透明的那一层（部位或头发）
    const p = (picked && picked.type === 'part') ? picked.p : partAtPoint(e.clientX, e.clientY);
    if (picked && picked.type === 'hair') return;   // 最上层是头发，交给上面的头发分支处理
    if (!p) {
      drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, px: S.view.px, py: S.view.py, maybeDeselect: true, moved: false };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { }
      return;
    }
    const partNode2 = document.querySelector(`#partsLayer .part[data-uid="${p.uid}"]`) || partNode;
    if (S.sel !== p.uid) select(p.uid);
    if (p.locked) return;
    drag = { mode: 'move', p, start: boardPoint(e.clientX, e.clientY), x0: p.x, y0: p.y, moved: false };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    e.preventDefault(); return;
  }
  if (e.button === 1 || spaceDown) {
    drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, px: S.view.px, py: S.view.py };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    e.preventDefault(); return;
  }
  // empty space: pan + click-to-deselect
  drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, px: S.view.px, py: S.view.py, maybeDeselect: true, moved: false };
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
}

function onPointerMove(e) {
  S.lastBoard = boardPoint(e.clientX, e.clientY);
  // 悬停在部位上：只有画得出来的像素才显示抓取光标
  if (!drag && !winDrag) {
    const pe = e.target && e.target.closest ? e.target.closest('#partsLayer .part') : null;
    if (pe) {
      const pp = byUid(pe.dataset.uid);
      pe.style.cursor = pp && partPixelSolid(pp, e.clientX, e.clientY) ? '' : 'default';
    }
  }
  if (guideDrag) {
    const c = activeCanvas(); if (!c) return;
    const pt = boardPoint(e.clientX, e.clientY);
    if (!c.guides) c.guides = [];
    if (guideDrag.preview == null) { guideDrag.preview = c.guides.length; c.guides.push({ o: guideDrag.o, p: 0 }); }
    const g = c.guides[guideDrag.preview];
    g.p = Math.round(guideDrag.o === 'h' ? pt.y : pt.x);
    renderGuides(c);
    return;
  }
  if (!drag) return;
  const d = drag;
  if (d.mode === 'pan') {
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) { d.moved = true; S.userZoomed = true; }
    S.view.px = d.px + dx;
    S.view.py = d.py + dy;
    applyView();
    return;
  }
  const pt = boardPoint(e.clientX, e.clientY);
  if (d.mode === 'notemove') {
    d.n.x = Math.round(d.x0 + (pt.x - d.start.x));
    d.n.y = Math.round(d.y0 + (pt.y - d.start.y));
    renderNotes(d.c || activeCanvas());
    return;
  }
  if (d.mode === 'hairref') {
    HAIR_REF.x = d.x0 + (pt.x - d.start.x);
    HAIR_REF.y = d.y0 + (pt.y - d.start.y);
    const refEl = document.querySelector('#partsLayer .hair-ref');
    if (refEl) refEl.style.transform = `translate(-50%,-50%) translate(${HAIR_REF.x}px,${HAIR_REF.y}px)`;
    return;
  }
  if (d.mode === 'hairmove') {
    if (d.c.hairLocked) return;          // 锁定后即使指针事件漏进来也不移动
    d.c.hairFitEnabled = true;
    const hf = d.c.hairFit;
    let nx = d.x0 + (pt.x - d.start.x) / 1024;
    let ny = d.y0 + (pt.y - d.start.y) / 1024;
    if (e.shiftKey) {
      // 按住 Shift：把头发中心吸到头部中心 / 头顶，和素材里的参考发型一样
      const head = (d.c.parts || []).find(p => Number(p.bid) === 13)
        || (d.c.parts || []).find(p => /head|头/i.test((p.id || '') + (p.name || '')));
      if (head) {
        const tol = 14 / 1024;
        const cands = [
          [head.x / 1024, head.y / 1024],
          [head.x / 1024, (head.y - (head.hbox ? head.hbox.h : imgDim(head.img)[1] * head.sy) * 0.2) / 1024],
        ];
        let best = null, bestD = tol;
        cands.forEach(([tx, ty]) => {
          const dxy = Math.hypot(nx - tx, ny - ty);
          if (dxy < bestD) { bestD = dxy; best = [tx, ty]; }
        });
        if (best) { nx = best[0]; ny = best[1]; }
      }
    }
    hf.offsetX = round(nx, 4);
    hf.offsetY = round(ny, 4);
    renderStage(); renderLibrary(); syncHairNums(d.c);
    return;
  }
  if (d.mode === 'hairscale') {
    d.c.hairFitEnabled = true;
    const hf = d.c.hairFit;
    const dx = pt.x - d.start.x, dy = pt.y - d.start.y;
    hf.scale = clamp(round(d.s0 + (dx + dy) / 2048, 4), 0.1, 3);
    renderStage(); syncHairNums(d.c);
    return;
  }
  if (d.mode === 'dispmove' || d.mode === 'dispsize') {
    const box = d.c && d.c.displayBox;
    if (!box) return;
    box.pos = 'free';
    if (d.mode === 'dispmove') {
      box.x = round(d.x0 + (pt.x - d.start.x), 1);
      box.y = round(d.y0 + (pt.y - d.start.y), 1);
    } else {
      box.w = Math.max(16, round(d.w0 + (pt.x - d.start.x), 1));
      box.h = Math.max(16, round(d.h0 + (pt.y - d.start.y), 1));
    }
    renderStage();
    if (S.tab === 'inspect') renderInspector();
    return;
  }
  if (d.mode === 'iconmove') {
    d.p.nx = round(d.nx0 + (pt.x - d.start.x), 1);
    d.p.ny = round(d.ny0 + (pt.y - d.start.y), 1);
    renderOverlay();
    return;
  }
  if (d.mode === 'move') {
    let nx = d.x0 + (pt.x - d.start.x);
    let ny = d.y0 + (pt.y - d.start.y);
    S.guides = [];
    if (!e.altKey) {
      const t = 3 / S.view.z;
      if (Math.abs(nx) < t) { nx = 0; S.guides.push('x'); }
      if (Math.abs(ny) < t) { ny = 0; S.guides.push('y'); }
      if (!S.guides.length) { nx = round(nx, 1); ny = round(ny, 1); }
    }
    d.p.x = round(nx, 1); d.p.y = round(ny, 1);
    d.moved = true;
    paintPart(d.p); renderOverlay(); syncNums(d.p);
    return;
  }
  if (d.mode === 'scale') {
    const cx = d.p.x, cy = d.p.y;
    const dist0 = Math.max(6, Math.hypot(d.start.x - cx, d.start.y - cy));
    const dist1 = Math.max(2, Math.hypot(pt.x - cx, pt.y - cy));
    let k = dist1 / dist0;
    k = clamp(k, 0.05, 8);
    const kUse = e.shiftKey ? Math.abs(k) : k;
    if (e.shiftKey) {
      d.p.sx = clamp(round(d.sx0 * Math.abs(k), 3), 0.02, 10);
    } else {
      d.p.sx = clamp(round(d.sx0 * k, 3), 0.02, 10);
      d.p.sy = clamp(round(d.sy0 * k, 3), 0.02, 10);
    }
    // 判定框也随缩放一起变，否则贴图放大后框还是原来的大小
    if (d.hb0 && d.hb0.w > 0) {
      // t32-B2：始终以拖动起点的框为基准 × 一次比例（f 就是 dist1/dist0），
      // 不在当前框上累乘；这样一次拖动只得到一次缩放，拖回来还能还原。
      const f = clamp(kUse, 0.05, 8);
      const nhb = scaleHboxFromBase(d.hb0, f);
      if (nhb) d.p.hbox = nhb;
      // t30：上限仍要夹（单次 f 已限幅，但起点本身可能就偏大）
      clampHitboxToVis(d.p);
      syncHbFromBox(d.p);
    }
    paintPart(d.p); renderOverlay(); syncNums(d.p);
    return;
  }
  if (d.mode === 'hitsize') {
    const l = toPartLocal(d.p, pt.x, pt.y);
    const x0 = Math.min(d.oppStart.x, l.x), x1 = Math.max(d.oppStart.x, l.x);
    const y0 = Math.min(d.oppStart.y, l.y), y1 = Math.max(d.oppStart.y, l.y);
    d.p.hbox = {
      dx: 0, dy: 0,                                  // 固定居中
      w: Math.max(4, round(x1 - x0, 1)), h: Math.max(4, round(y1 - y0, 1)),
    };
    // t30：拖角也要夹上限（否则能把框拖得比可见区大几十倍）
    clampHitboxToVis(d.p);
    syncHbFromBox(d.p);
    renderOverlay(); syncNums(d.p);
    return;
  }
  if (d.mode === 'rotate') {
    const ang = Math.atan2(pt.y - d.p.y, pt.x - d.p.x) * 180 / Math.PI + 90;
    d.p.rot = e.shiftKey ? Math.round(ang / 15) * 15 : round(ang, 1);
    paintPart(d.p); renderOverlay(); syncNums(d.p);
    return;
  }
}

function onPointerUp(e) {
  if (guideDrag) {
    const c = activeCanvas();
    guideDrag = null;
    if (c) { renderStage(); pushHistory(); toast('已添加参考线（右键可删除）'); }
    return;
  }
  if (!drag) return;
  const d = drag; drag = null;
  S.guides = null;
  if (d.mode === 'pan') {
    if (d.maybeDeselect && !d.moved) select(null);
    return;
  }
  if (d.mode === 'move' && !d.moved) return;
  if (d.mode === 'hairref') {
    try { saveRefForCanvas(); } catch (e) { }
    persist();
  }
  renderOverlay();
  renderInspector();
  pushHistory();
  renderStatus();
  if (d.mode === 'move') renderTree();
}

function syncNums(p) {
  const pane = $('#paneInspect');
  if (!pane || !p) return;
  const map = { x: p.x, y: p.y, sx: p.sx, sy: p.sy, rot: p.rot || 0 };
  Object.entries(map).forEach(([k, v]) => {
    const inp = pane.querySelector(`[data-f="${k}"]`);
    if (inp && document.activeElement !== inp) inp.value = round(v, 2);
  });
  // 命中框也是可拖的：这些输入框同样要跟着动
  const hbx = hitBox(p);
  const hmap = { hx: hbx.dx, hy: hbx.dy, hw: hbx.w, hh: hbx.h };
  Object.entries(hmap).forEach(([k, v]) => {
    const inp = pane.querySelector(`[data-f="${k}"]`);
    if (inp && document.activeElement !== inp) inp.value = round(v, 1);
  });
  renderSelInfo();
}

/* 拖动/滚轮改完发型后，让「缩放 / 偏移」输入框跟上 */
function syncHairNums(c) {
  const pane = $('#paneInspect');
  if (!pane || !c) return;
  const hf = c.hairFit || {};
  const set = (sel, v) => {
    const inp = pane.querySelector(sel);
    if (inp && document.activeElement !== inp) inp.value = v;
  };
  set('[data-f="c.hfs"]', (Number(hf.scale) || 0.78).toFixed(3));
  set('[data-f="c.hfx"]', (Number(hf.offsetX) || 0).toFixed(3));
  set('[data-f="c.hfy"]', (Number(hf.offsetY) || -0.21).toFixed(3));
}

/* ==========================================================================
   keyboard
   ========================================================================== */
function onKeyDown(e) {
  const t = e.target;
  const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
  const mod = e.ctrlKey || e.metaKey;
  const modalOpen = !!$('#modalRoot').firstElementChild;

  if (e.key === 'Escape') {
    if (S.preview) { clearPreview(); return; }
    if (modalOpen) { closeModal(); e.preventDefault(); }
    else select(null);
    return;
  }
  if (modalOpen) return;

  if (e.code === 'Space' && !typing) { spaceDown = true; }

  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveProjectFile(); return; }
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); if (selPart()) duplicatePart(selPart()); return; }

  if (typing) return;
  if (S.preview && (e.key === 'Delete' || e.key === 'Backspace' || (mod && (e.key.toLowerCase() === 'd')))) {
    e.preventDefault();
    toast('只读预览：要编辑请先点「应用」或「还原」', true);
    return;
  }

  if (e.key === 'f' || e.key === 'F') { fitView(); return; }
  if (e.key === 'g' || e.key === 'G') { S.flags.grid = !S.flags.grid; $('#gridLayer').classList.toggle('is-off', !S.flags.grid); renderKindChips(); return; }

  const p = selPart();
  if (!p) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); detachPart(p); return; }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') p.x -= step;
    if (e.key === 'ArrowRight') p.x += step;
    if (e.key === 'ArrowUp') p.y -= step;
    if (e.key === 'ArrowDown') p.y += step;
    p.x = round(p.x, 1); p.y = round(p.y, 1);
    paintPart(p); renderOverlay(); syncNums(p); renderTree();
    pushHistory();
    return;
  }
  if (e.key === '[') { p.layer -= 1; paintPart(p); renderStage(); pushHistory(); }
  if (e.key === ']') { p.layer += 1; paintPart(p); renderStage(); pushHistory(); }
  if (e.key === 'm' || e.key === 'M') { mirrorPart(p); }
}
function onKeyUp(e) { if (e.code === 'Space') spaceDown = false; }

/* ==========================================================================
   exporter
   ========================================================================== */
function download(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1200);
}
const slug = s => String(s || 'patch').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60);

/* write the patch straight into the injector mod: <mod>/Patches/nht-<doll>.xml */
let injectDir = null;


/* ---------- progress bar ---------- */
let progTotal = 0, progAt = 0;
function progStart(label, total) {
  progTotal = Math.max(1, total || 1); progAt = 0;
  const bar = $('#progBar'), fill = $('#progFill'), lab = $('#progLab');
  if (!bar) return;
  bar.hidden = false;
  if (fill) fill.style.width = '0%';
  if (lab) lab.textContent = label;
}
function progStep(n, label) {
  progAt = Math.min(progTotal, n == null ? progAt + 1 : n);
  const fill = $('#progFill'), lab = $('#progLab');
  if (fill) fill.style.width = Math.round((progAt / progTotal) * 100) + '%';
  if (lab && label) lab.textContent = label;
}
function progDone() {
  const bar = $('#progBar'), fill = $('#progFill');
  if (fill) fill.style.width = '100%';
  setTimeout(() => { if (bar) bar.hidden = true; if (fill) fill.style.width = '0%'; }, 480);
}



/* 把画布上用到的本机素材写进 Mod/Textures/，否则游戏会报 Could not load Texture2D */
/* ---------------- 自动裁剪 ---------------- */
const CROP_CACHE = new Map();   // key -> {data,w,h}
function isCroppedAsset(key) {
  const k = String(key || '');
  return /\/Crop_[^/]+$/.test(k) || CROP_CACHE.has(k);
}

function cropMaxCount() {
  const n = Number(S.settings && S.settings.cropMax);
  return Math.max(1, Math.min(12, Number.isFinite(n) && n > 0 ? n : 4));
}
function cropCachePut(key, rec) {
  CROP_CACHE.delete(key);
  CROP_CACHE.set(key, rec);
  while (CROP_CACHE.size > cropMaxCount()) {
    const first = CROP_CACHE.keys().next().value;
    CROP_CACHE.delete(first);
  }
}
function cropPng(key) {
  return new Promise(resolve => {
    try {
      const url = imgURL(key);
      if (!url) { resolve(null); return; }
      const im = new Image();
      im.onload = () => {
        try {
          const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
          if (!w || !h) { resolve(null); return; }
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const g = cv.getContext('2d');
          g.drawImage(im, 0, 0);
          const d = g.getImageData(0, 0, w, h).data;
          let x0 = w, y0 = h, x1 = -1, y1 = -1;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (d[(y * w + x) * 4 + 3] > 4) {
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
              }
            }
          }
          if (x1 < x0 || y1 < y0) { resolve(null); return; }
          const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
          const cv2 = document.createElement('canvas');
          cv2.width = cw; cv2.height = ch;
          cv2.getContext('2d').drawImage(cv, x0, y0, cw, ch, 0, 0, cw, ch);
          resolve({ data: cv2.toDataURL('image/png'), w: cw, h: ch, x0: x0, y0: y0, sw: w, sh: h, from: key });
        } catch (e) { resolve(null); }
      };
      im.onerror = () => resolve(null);
      im.src = url;
    } catch (e) { resolve(null); }
  });
}
async function dataHash8(dataUrl) {
  try {
    const b64 = String(dataUrl).split(',')[1] || '';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const buf = await crypto.subtle.digest('SHA-256', arr);
    return [...new Uint8Array(buf)].slice(0, 4).map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 0x811c9dc5;
    const str = String(dataUrl);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
}

async function cropAssetKey(key) {
  if (CROP_CACHE.has(key)) return CROP_CACHE.get(key);
  if (/\/Crop_[^/]+$/.test(String(key))) return null;   // 已经是裁剪产物，不再二次裁剪
  const rec = await cropPng(key);
  if (rec) cropCachePut(key, rec);
  return rec;
}
function cropTargetName(key) {
  const base = String(key).split('/').pop().replace(/\.png$/i, '');
  return 'Crop_' + base + '_' + Date.now().toString(36);
}
async function saveCroppedAsset(key, mode, targetCat) {
  const rec = await cropAssetKey(key);
  if (!rec) { toast('裁剪失败：读不到这张图', true); return null; }
  const cat = targetCat || customCat();
  const inplace = mode === 'inplace';
  const newKey = inplace ? String(key) : ('Custom/' + cat + '/' + cropTargetName(key));
  try {
    const good = await apiSave('to=texture&key=' + encodeURIComponent(newKey), rec.data);
    if (!good) { toast('保存裁剪素材失败', true); return null; }
    try {
      const idx = artLoadIndex();
      idx[newKey] = { d: rec.data, w: rec.w, h: rec.h, aw: rec.w, ah: rec.h };
      artSaveIndex();
      EXT.set(newKey, { url: rec.data, w: rec.w, h: rec.h });
    } catch (e) { }
    if (!inplace) {
      if (!S.customAssets) S.customAssets = [];
      S.customAssets.push({ p: newKey, n: newKey.split('/').pop(), w: rec.w, h: rec.h, cat });
      TEX_ON_DISK.add(newKey);
    }
    persist();
    if (typeof renderAll === 'function') renderAll();
    if (typeof renderLibrary === 'function') renderLibrary();
    toast(inplace ? ('已裁剪并覆盖保存：我的素材 - ' + cat) : ('已裁剪并保存到「我的素材 - ' + cat + '」'));
    return newKey;
  } catch (e) { toast('保存裁剪素材失败：' + (e && e.message), true); return null; }
}

/* 本地保存时：把已裁剪且当前画布在用的素材写成正式文件 */
async function cleanupScan(incGray, keepUncat) {
  if (HOST) { try { return JSON.parse(await HOST.CleanupScan(!!incGray, !!keepUncat)); } catch (e) { return { ok: false }; } }
  try {
    const r = await fetch('/__cleanup-scan?includeGray=' + (incGray ? 1 : 0) + '&keepUncat=' + (keepUncat ? 1 : 0), { cache: 'no-store' });
    return await r.json();
  } catch (e) { return { ok: false }; }
}
async function cleanupApply(incGray, keepUncat) {
  if (HOST) { try { return JSON.parse(await HOST.CleanupApply(!!incGray, !!keepUncat)); } catch (e) { return { ok: false }; } }
  try {
    const r = await fetch('/__cleanup-apply?includeGray=' + (incGray ? 1 : 0) + '&keepUncat=' + (keepUncat ? 1 : 0), { cache: 'no-store' });
    return await r.json();
  } catch (e) { return { ok: false }; }
}
async function cleanupList() {
  if (HOST) { try { return JSON.parse(await HOST.CleanupList()); } catch (e) { return { ok: false, backups: [] }; } }
  try { return await (await fetch('/__cleanup-list', { cache: 'no-store' })).json(); } catch (e) { return { ok: false, backups: [] }; }
}
async function cleanupDiff(name) {
  if (HOST) { try { return JSON.parse(await HOST.CleanupDiff(name)); } catch (e) { return { ok: false, changes: [] }; } }
  try { return await (await fetch('/__cleanup-diff?name=' + encodeURIComponent(name), { cache: 'no-store' })).json(); } catch (e) { return { ok: false, changes: [] }; }
}
async function cleanupRestoreSelected(name, paths) {
  if (HOST) { try { return { ok: true, restored: await HOST.CleanupRestoreSelected(name, paths.join('|')) }; } catch (e) { return { ok: false, restored: 0 }; } }
  try { return await (await fetch('/__cleanup-restore-selected?name=' + encodeURIComponent(name) + '&paths=' + encodeURIComponent(paths.join('|')), { cache: 'no-store' })).json(); } catch (e) { return { ok: false, restored: 0 }; }
}
function cleanupBackupURL(name, key) {
  if (HOST) return 'https://history.local/' + encodeURIComponent(name) + '/files/' + key + '.png';
  return '/__cleanup-backup-tex?name=' + encodeURIComponent(name) + '&key=' + encodeURIComponent(key);
}

async function openCleanupRestore() {
  try {
    const j = await cleanupList();
    const list = (j && j.backups) || [];
    if (!list.length) { toast('没有清理备份', true); return; }
    const old = document.getElementById('cleanRestoreModal');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'cleanRestoreModal';
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center';
    box.innerHTML = '<div style="width:min(940px,94vw);max-height:86vh;overflow:auto;background:#141a1d;border:1px solid #2b3438;border-radius:4px;padding:14px 16px;color:#d7dde0">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      + '<b style="font-size:14px">还原清理备份</b>'
      + '<select id="crSel" style="background:#0d1011;color:#d7dde0;border:1px solid #2b3438;border-radius:3px;padding:3px 6px">'
      + list.map(b => '<option value="' + esc(b.name) + '">' + esc(b.name) + ' · ' + b.count + ' 个文件 · ' + (b.bytes / 1048576).toFixed(2) + ' MB</option>').join('')
      + '</select><span id="crInfo" style="opacity:.7;font-size:12px"></span>'
      + '<button class="btn btn--sm" id="crClose" style="margin-left:auto">关闭</button></div>'
      + '<div id="crList" style="font-size:12px"></div>'
      + '<div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">'
      + '<button class="btn btn--sm" id="crAll">全选</button>'
      + '<button class="btn btn--sm" id="crNone">全不选</button>'
      + '<button class="btn btn--sm" id="crApply">还原选中</button></div></div>';
    document.body.appendChild(box);
    const sel = box.querySelector('#crSel');
    const listBox = box.querySelector('#crList');
    const info = box.querySelector('#crInfo');

    const render = async () => {
      const name = sel.value;
      const d = await cleanupDiff(name);
      const changes = (d && d.changes) || [];
      info.textContent = '差异 ' + changes.length + ' 项';
      if (!changes.length) {
        listBox.innerHTML = '<p class="mini-note">当前贴图与这份备份一致，没有需要还原的内容。</p>';
        return;
      }
      listBox.innerHTML = changes.map(c => {
        const bk = cleanupBackupURL(name, c.path);
        const cur = c.status === 'missing' ? '' : ('/__tex?key=' + encodeURIComponent(c.path) + '&t=' + Date.now());
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #232b2f">'
          + '<input type="checkbox" class="crChk" data-key="' + esc(c.path) + '" checked>'
          + '<div style="min-width:0;flex:1"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.path) + '</div>'
          + '<div style="opacity:.65">' + (c.status === 'missing' ? '当前缺失' : '内容不同') + ' · 备份 ' + Math.round(c.size / 1024) + ' KB · 当前 ' + Math.round(c.curSize / 1024) + ' KB</div></div>'
          + '<div style="display:flex;gap:8px">'
          + '<figure style="margin:0;text-align:center"><img src="' + bk + '" style="width:64px;height:64px;object-fit:contain;background:#0b0e0f;border:1px solid #2b3438"><figcaption style="font-size:10px;opacity:.6">备份</figcaption></figure>'
          + '<figure style="margin:0;text-align:center">' + (cur ? '<img src="' + cur + '" style="width:64px;height:64px;object-fit:contain;background:#0b0e0f;border:1px solid #2b3438">' : '<div style="width:64px;height:64px;background:#0b0e0f;border:1px solid #2b3438;display:grid;place-items:center;color:#666">缺失</div>') + '<figcaption style="font-size:10px;opacity:.6">当前</figcaption></figure>'
          + '</div></div>';
      }).join('');
    };

    sel.addEventListener('change', render);
    box.querySelector('#crClose').onclick = () => box.remove();
    box.querySelector('#crAll').onclick = () => box.querySelectorAll('.crChk').forEach(x => x.checked = true);
    box.querySelector('#crNone').onclick = () => box.querySelectorAll('.crChk').forEach(x => x.checked = false);
    box.querySelector('#crApply').onclick = async () => {
      const paths = [...box.querySelectorAll('.crChk')].filter(x => x.checked).map(x => x.dataset.key);
      if (!paths.length) { toast('没有选中要还原的贴图', true); return; }
      const r = await cleanupRestoreSelected(sel.value, paths);
      if (!r || !r.ok) { toast('还原失败', true); return; }
      toast('已还原 ' + r.restored + ' 个文件');
      if (typeof loadMineDirs === 'function') loadMineDirs(true);
      await render();
    };
    await render();
  } catch (e) { toast('打开还原窗口失败：' + (e && e.message), true); }
}

async function flushCroppedForCanvas(c) {
  if (!c || !LOCAL_HTTP) return;
  const used = new Set();
  // t44 注：这里只统计 c.parts / c.detached 的贴图。异种（colorVariants）部位不在其中，
  // 它们的裁剪贴图与路径规范化由 saveVariantTexture（写入时）和 migrateVariantPaths（保存兜底）负责，
  // 所以不要把变体部位加进来——否则这里会按画布级 Crop_ 规则重复落盘。行为保持原样。
  (c.parts || []).concat(c.detached || []).forEach(p => {
    if (p && p.img) used.add(p.img);
    if (p && p.grayImg) used.add(p.grayImg);
  });
  const idx = artLoadIndex();
  const keys = new Set();
  CROP_CACHE.forEach((v, k) => { if (/\/Crop_/.test(k) && used.has(k)) keys.add(k); });
  used.forEach(k => { if (/\/Crop_/.test(String(k))) keys.add(k); });
  for (const key of keys) {
    if (DISK_TEX_KEYS && DISK_TEX_KEYS.has(key)) { CROP_CACHE.delete(key); continue; }
    const rec = CROP_CACHE.get(key) || (idx[key] && idx[key].d ? { data: idx[key].d, w: idx[key].w | 0, h: idx[key].h | 0 } : null);
    if (!rec || !rec.data) continue;
    try {
      const good = await apiSave('to=texture&key=' + encodeURIComponent(key), rec.data);
      if (!good) continue;
      try {
        idx[key] = { d: rec.data, w: rec.w | 0, h: rec.h | 0 };
        artSaveIndex();
        EXT.set(key, { url: rec.data, w: rec.w | 0, h: rec.h | 0 });
      } catch (e) { }
      if (!S.customAssets) S.customAssets = [];
      const rec0 = (S.customAssets || []).find(a => a.p === key);
      if (rec0) delete rec0.data;
      if (!S.customAssets.some(a => a.p === key)) {
        S.customAssets.push({ p: key, n: key.split('/').pop(), w: rec.w | 0, h: rec.h | 0, cat: customCatFor(c) });
      }
      CROP_CACHE.delete(key);
      if (DISK_TEX_KEYS) DISK_TEX_KEYS.add(key);
      TEX_ON_DISK.add(key);
    } catch (e) { }
  }
}

async function flushAllCroppedAssets() {
  for (const c of (S.canvases || [])) {
    try { await flushCroppedForCanvas(c); } catch (e) { }
  }
}

async function pushCustomTextures(c) {
  // 结束后会刷新一次 Textures 清单

  if (!c || !LOCAL_HTTP) return { tried: 0, ok: 0, missing: [] };
  try { await flushCroppedForCanvas(c); } catch (e) { }
  const idx = artLoadIndex();
  const keys = new Set();
  (c.parts || []).forEach(p => {
    if (p.img && String(p.img).indexOf('Custom/') === 0) keys.add(p.img);
    if (p.grayImg && String(p.grayImg).indexOf('Custom/') === 0) keys.add(p.grayImg);
  });
  const missing = [];
  let ok = 0;
  for (const key of keys) {
    const rec = idx[key];
    if (!rec || !rec.d) {
      // 浏览器里没有这张图：先看磁盘 Textures/ 是不是已经有了
      let onDisk = false;
      try {
        const r = await fetch('/__tex-exists?key=' + encodeURIComponent(key), { cache: 'no-store' });
        onDisk = (await r.text()).trim() === 'yes';
      } catch (e) { }
      if (onDisk) { ok++; continue; }
      missing.push(key);
      continue;
    }
    try {
      const good = await apiSave('to=texture&key=' + encodeURIComponent(key), rec.d);
      if (good) { ok++; TEX_ON_DISK.add(key); } else missing.push(key);
    } catch (e) { missing.push(key); }
  }
  return { tried: keys.size, ok, missing };
}


/* 缺少贴图：让用户从本机选 PNG 补齐到 Textures/ */
function openTexFix(missing) {
  const list = missing.map(k => `<li><code>${esc(k)}.png</code></li>`).join('');
  openModal(`
    <div class="modal__head"><span class="idx">TEXTURES</span><h3>缺少 ${missing.length} 张贴图</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note">下面这些贴图在 <code>${esc(SELF.name)}/Textures/</code> 里找不到，游戏会报
        <code>Could not load Texture2D</code>：</p>
      <ul class="mini-note" style="margin:6px 0 10px">${list}</ul>
      <p class="mini-note">点下面的按钮选本机 PNG（文件名对应即可，比如 <b>MihoTail2.png</b> → <code>Custom/&lt;当前种族&gt;/MihoTail2</code>（没有种族画布时进 <code>Custom/未分类</code>）），
        选完会直接写进 Textures/。</p>
      <div class="rowline" style="margin-top:8px">
        <button class="btn btn--sm" data-act="tex-fill">选择 PNG 补齐…</button>
      </div>
    </div>`);
  TEX_MISSING = missing.slice();
}
let TEX_MISSING = [];

async function fillMissingTextures(files) {
  if (!TEX_MISSING.length) { toast('现在没有缺失的贴图', true); return; }
  const byBase = new Map();
  TEX_MISSING.forEach(k => {
    const base = String(k).split('/').pop().toLowerCase();
    byBase.set(base, k);
  });
  let ok = 0, skipped = [];
  for (const f of files) {
    const base = String(f.name || '').replace(/\.[^.]+$/, '').toLowerCase();
    const key = byBase.get(base);
    if (!key) { skipped.push(f.name); continue; }
    try {
      const data = await fileToDataURL(f);
      const good = await apiSave('to=texture&key=' + encodeURIComponent(key), data);
      if (good) { ok++; byBase.delete(base); } else skipped.push(f.name);
    } catch (e) { skipped.push(f.name); }
  }
  try { closeModal(); } catch (e) { }
  if (ok) toast(`已写入 ${ok} 张贴图到 Textures/，重新进游戏就不会报错了`);
  if (skipped.length) toast('这些没对上名字，跳过了：' + skipped.slice(0, 4).join('、'), true);
  TEX_MISSING = [];
  renderStage();
}

async function savePatchToMod() {
  if (!(await ensureSavePath('patch'))) return;
  const cur = activeCanvas();
  // 灰度图必须在这一步就落盘：只调用 ensureGrayArt 只会写进浏览器缓存，
  // 补丁里虽然已经有 _NHTCD_Gray 部件，游戏却找不到对应 PNG，关色彩后部位会消失。
  try { await ensureGrayArt(cur ? [cur] : []); } catch (e) { }
  try { await flushGrayForCanvas(cur); } catch (e) { }
  beginExportBadScan();      // t58-R3-1：清空由调用方负责，buildPatchXML 不再清
  const xml = buildPatchXML('one');
  reportBadVariantNames();   // t56-R3
  const name = 'nht-' + slug(cur ? (cur.doll || cur.title) : 'patch') + '.xml';
  if (LOCAL_HTTP) {
    apiSave('to=patch&name=' + encodeURIComponent(name), xml).then(async ok => {
      if (!ok) { toast('本地服务写入 Patches 失败', true); return; }
      const tex = await pushCustomTextures(cur);
      try {
        cur.savedSig = canvasSig(cur); cur.sigVer = CANVAS_SIG_VER; cur._patchOn = true;
        updateHarBadge(cur); persist();
      } catch (e) { }
      if (tex.missing.length) {
        toast(`已写入 Patches/${name}，但有 ${tex.missing.length} 张贴图缺失`, true);
        openTexFix(tex.missing);
      } else if (tex.ok) {
        toast(`已写入 Patches/${name}（仅当前画布）· 附带 ${tex.ok} 张贴图`);
      } else {
        toast('已写入模组 Patches/' + name + '（仅当前画布）');
      }
    });
    return;
  }
  if (typeof window.showDirectoryPicker !== 'function') {
    download(name, xml, 'application/xml');
    toast('这个浏览器不支持直接写文件夹，已改为下载', true);
    return;
  }
  if (!injectDir) {
    // ask until we get a real mod root: picking Patches/ or Textures/ would nest everything
    for (let tries = 0; tries < 3 && !injectDir; tries++) {
      let dir;
      try {
        dir = await window.showDirectoryPicker({ id: 'nht-inject-mod', mode: 'readwrite' });
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        toast('没有拿到文件夹权限：' + e.message, true);
        return;
      }
      const low = (dir.name || '').toLowerCase();
      if (low === 'patches' || low === 'textures' || low === 'defs' || low === 'about') {
        toast('请选模组根目录（能看到 About、Patches 的那一层），不是 ' + dir.name + ' 本身', true);
        continue;
      }
      let hasAbout = false;
      try { await dir.getDirectoryHandle('About'); hasAbout = true; } catch (e) { hasAbout = false; }
      if (!hasAbout) {
        toast('这个文件夹里没有 About/ —— 再选一次模组根目录', true);
        continue;
      }
      injectDir = dir;
    }
    if (!injectDir) return;
  }
  try {
    // 任意模组文件夹都可以注入
    let isMod = false;
    try { await injectDir.getDirectoryHandle('About'); isMod = true; } catch (e) { isMod = false; }
    progStart('准备写入…', 4);
    progStep(1, '写入补丁…');
    const patches = await injectDir.getDirectoryHandle('Patches', { create: true });
    const fh = await patches.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(xml);
    await w.close();

    // the patch may point at art imported from this computer (Custom/...): those pixels only
    // live in the browser, so write them next to the patch or the game cannot load them
    let texCount = 0, texMissing = 0;
    const imgs = [];
    (cur ? cur.parts : []).forEach(p => { if (p.img && String(p.img).indexOf('Custom/') === 0) imgs.push(p.img); });
    S.customAssets.forEach(a => { if (a.p && String(a.p).indexOf('Custom/') === 0 && imgs.indexOf(a.p) < 0) imgs.push(a.p); });
    progTotal = 2 + Math.max(1, imgs.length);
    progStep(2, `写入贴图 0/${imgs.length}…`);
    let texI = 0;
    for (const key of imgs) {
      texI++;
      progStep(2 + texI, `写入贴图 ${texI}/${imgs.length}…`);
      const rec = CUSTOM.get(key) || EXT.get(key) || {};
      const url = rec.data || (/^data:/.test(rec.url || '') ? rec.url : null);
      if (!url) { texMissing++; continue; }
      try {
        const blob = await (await fetch(url)).blob();
        let dir = await injectDir.getDirectoryHandle('Textures', { create: true });
        const segs = String(key).split('/');
        const file = segs.pop() + '.png';
        for (const seg of segs) dir = await dir.getDirectoryHandle(safeSeg(seg), { create: true });
        const tf = await dir.getFileHandle(safeSeg(file), { create: true });
        const tw = await tf.createWritable();
        await tw.write(blob);
        await tw.close();
        texCount++;
      } catch (e) { texMissing++; }
    }

    progDone();
    toast(`已写入 ${injectDir.name}/Patches/${name}`
      + (texCount ? ` + ${texCount} 张贴图到 Textures/` : '')
      + (texMissing ? `（${texMissing} 张没找到素材，游戏里会缺图）` : '')
      + (isMod ? '' : '（这个文件夹没有 About/，确认选的是模组根目录）'));
    renderPatch();
  } catch (e) {
    injectDir = null;                 // recover on the next click instead of staying dead
    toast('写入失败：' + e.message + '（再点一次会重新选文件夹）', true);
  }
}

function exportPatch() {
  beginExportBadScan();      // t58-R3-1
  const xml = buildPatchXML('one');
  reportBadVariantNames();   // t56-R3
  const cur = activeCanvas();
  const scopeName = cur ? (cur.doll || cur.title || 'canvas') : 'canvas';
  download(`${slug(S.project.name)}_${scopeName}.xml`, xml, 'application/xml');
  toast('补丁已导出 · ' + (cur ? cur.title : '当前画布'));
}
function exportJSON() {
  const one = true;   // project JSON keeps the current canvas (same as the patch)
  const list = one ? [activeCanvas()].filter(Boolean) : S.canvases;
  const payload = {
    format: 'nht-anatomy-editor', version: 3, savedAt: new Date().toISOString(),
    project: S.project, canvases: one ? list : S.canvases, active: one ? (list[0] || {}).id : S.active,
    wins: S.wins,
    customAssets: S.customAssets,
    mine: S.mine,
    hairRef: S.hairRef
  };
  download(`${slug(S.project.name)}${one ? '_' + slug((list[0] || {}).title || 'canvas') : '_all'}.json`, JSON.stringify(payload, null, 2), 'application/json');
  toast(one ? '当前画布 JSON 已导出' : '项目 JSON 已导出');
}
function importJSON(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const st = JSON.parse(fr.result);
      if (!st.canvases || !Array.isArray(st.canvases) || !st.canvases.length) throw new Error('缺少 canvases');
      applyProject(st);
      renderAll(); fitView(); pushHistory();
      toast(`已导入项目 · ${S.canvases.length} 个画布`);
    } catch (err) {
      toast('导入失败：' + err.message, true);
    }
  };
  fr.readAsText(file);
}

async function exportPNG() {
  const c = activeCanvas(); if (!c) return;
  const b = canvasBounds(c);
  const scale = 2;
  const cv = document.createElement('canvas');
  cv.width = Math.round(b.w * scale); cv.height = Math.round(b.h * scale);
  const ctx = cv.getContext('2d');
  ctx.scale(scale, scale);
  const list = sortParts(c.parts.filter(p => p.vis !== false && (p.kind === 'body' || p.kind === 'eye' || p.kind === 'custom' || S.kinds[p.kind] !== false)));
  try {
    if (S.flags.outline && c.outline) {
      const [ow, oh] = imgDim(c.outline);
      const im = await loadImg(imgURL(c.outline));
      ctx.globalAlpha = 0.85;
      ctx.drawImage(im, b.x + b.w / 2 - ow / 2 - b.x, b.y + b.h / 2 - oh / 2 - b.y, ow, oh);
      ctx.globalAlpha = 1;
    }
    for (const p of list) {
      const [w, h] = imgDim(p.img);
      const im = await loadImg(p.state === 'prosthetic' && p.prosth ? imgURL(p.prosth.img) : imgURL(p.img));
      ctx.save();
      ctx.translate(p.x - b.x, p.y - b.y);
      ctx.rotate((p.rot || 0) * Math.PI / 180);
      ctx.scale(p.flip ? -p.sx : p.sx, p.sy);
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
      ctx.restore();
      if (p.state === 'missing') {
        ctx.save();
        ctx.translate(p.x - b.x, p.y - b.y);
        ctx.strokeStyle = 'rgba(226,86,74,.9)'; ctx.lineWidth = 2 / scale;
        ctx.beginPath(); ctx.moveTo(-w * p.sx * .3, -h * p.sy * .3); ctx.lineTo(w * p.sx * .3, h * p.sy * .3);
        ctx.moveTo(w * p.sx * .3, -h * p.sy * .3); ctx.lineTo(-w * p.sx * .3, h * p.sy * .3); ctx.stroke();
        ctx.restore();
      }
    }
    const url = cv.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `${slug(c.title)}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    toast('画布 PNG 已导出（2× 透明底）');
  } catch (err) {
    toast('PNG 导出失败：' + err.message, true);
  }
}
function copyText(text) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  };
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallback());
  }
  return Promise.resolve(fallback());
}

function loadImg(src) {  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('贴图加载失败'));
    im.src = src;
  });
}

/* ==========================================================================
   race mod import
   ========================================================================== */
const RACE_SAFE = /torso|head|neck|arm|hand|finger|thumb|pinky|ring|middle|index|leg|foot|feet|toe|eye|ear|nose|jaw|tongue|brain|heart|lung|kidney|liver|stomach|spine|rib|chest|pelvis|hip|shoulder|clavicle|skull|sternum|utility|teeth/i;

/* ---- HAR bodyAddons：部位挂件、条件与扩展贴图（基因 / 体型 / Hediff） ----
   一条 addon = 画在某个 BodyPart 上的一层；extendedGraphics 是“条件 → 换图”。
   这里把它拍平成：base path + [{path, conds:{genes,bodyTypes,hediffs}}]。 */
function collectAddonGraphicRules(eg, conds, out) {
  if (!eg) return;
  Array.from(eg.children || []).forEach(ch => {
    const tag = String(ch.tagName || '');
    const forAttr = String(ch.getAttribute('For') || '').trim();
    if (!forAttr) return;
    const c2 = {
      genes: (conds.genes || []).slice(),
      bodyTypes: (conds.bodyTypes || []).slice(),
      hediffs: (conds.hediffs || []).slice(),
    };
    if (/Gene$/i.test(tag)) c2.genes.push(forAttr);
    else if (/BodyType$/i.test(tag)) c2.bodyTypes.push(forAttr);
    else if (/^Body$/i.test(tag)) c2.bodyTypes.push(forAttr);
    else if (/Hediff$/i.test(tag)) c2.hediffs.push(forAttr);
    else return;
    const sub = ch.querySelector(':scope > extendedGraphics');
    const pathEl = ch.querySelector(':scope > path');
    let p = pathEl ? String(pathEl.textContent || '').trim() : '';
    if (!p && !sub) {
      const t = String(ch.textContent || '').trim();
      if (t && t.indexOf('<') < 0) p = t.split('\n')[0].trim();
    }
    if (p) out.push({ path: p, conds: c2, order: out.length });
    if (sub) collectAddonGraphicRules(sub, c2, out);
  });
}

function parseAddonNode(li, order) {
  if (!li) return null;
  const path = directChildText(li, 'path');
  if (!path) return null;
  const bp = li.querySelector(':scope > conditions > BodyPart');
  const bodyPartLabel = bp ? (directChildText(bp, 'bodyPartLabel') || '') : '';
  const bodyPartDef = bp ? (directChildText(bp, 'bodyPart') || directChildText(bp, 'bodyPartDef') || '') : '';
  const rules = [];
  collectAddonGraphicRules(li.querySelector(':scope > extendedGraphics'), {}, rules);
  const south = li.querySelector(':scope > offsets > south');
  const layerOffset = south ? num(directChildText(south, 'layerOffset'), NaN) : NaN;
  return {
    name: directChildText(li, 'name'),
    path,
    shaderType: directChildText(li, 'shaderType'),
    colorChannel: directChildText(li, 'colorChannel'),
    inFrontOfBody: /true/i.test(directChildText(li, 'inFrontOfBody')),
    alignWithHead: /true/i.test(directChildText(li, 'alignWithHead')),
    bodyPartLabel, bodyPartDef,
    layerOffset: Number.isFinite(layerOffset) ? layerOffset : NaN,
    rules,
    order: order == null ? 0 : order,
  };
}

/* t55-B6：BodyDef 选择用的小工具（只读 XML 节点，不改数据） */
function bodyDefCoreName(node) {
  try { return String(node.querySelector(':scope > corePart')?.textContent || '').trim(); } catch (e) { return ''; }
}
function bodyDefPartNames(node) {
  const set = new Set();
  try {
    Array.from(node.querySelectorAll('parts li')).forEach(li => {
      const n = String(li.querySelector(':scope > def')?.textContent || li.textContent || '').trim();
      if (n) set.add(n);
    });
  } catch (e) { }
  return set;
}
function countBodyParts(node) {
  let n = 0;
  try {
    const walk = (el, d) => {
      if (!el || d > 6) return;
      n++;
      const l = el.querySelector(':scope > parts');
      if (l) Array.from(l.children).forEach(li => walk(li.querySelector(':scope > part') || li, d + 1));
    };
    walk(node.querySelector(':scope > corePart'), 0);
  } catch (e) { }
  return n;
}
// t55-B6：没有 race.body 可依据时的挑选顺序（cand: {dn,n,core,parts}）
// ② defName 与种族 defName 同名 ③ corePart 真在自己的 parts 里（自洽，排除机械体等残缺定义）④ parts 最多
function pickManualBodyDef(cand, raceDefName) {
  if (!Array.isArray(cand) || !cand.length) return null;
  const rd = norm(String(raceDefName || ''));
  const selfOk = (c) => !!c.core && !!c.parts && c.parts.has(c.core);
  return (rd && cand.find(c => norm(c.dn) === rd))
    || cand.filter(selfOk).sort((a, b) => b.n - a.n)[0]
    || cand.slice().sort((a, b) => b.n - a.n)[0]
    || null;
}

async function parseRaceMod(files, extraBodyFiles, forcedBodyDef) {
  const list = Array.from(files);
  if (!list.length) throw new Error('文件夹为空');
  const paths = list.map(f => String(f.__relPath || f.webkitRelativePath || f.name || '').replace(/\\/g, '/'));
  const first = new Set(paths.map(p => p.split('/')[0]));
  const KNOWN_DIRS = ['About', 'Defs', 'Textures', 'Languages', 'Patches', 'Assemblies', 'Sounds', 'Preview', 'Source'];
  let rootPrefix = '';
  if (first.size === 1) {
    const seg = [...first][0];
    if (!KNOWN_DIRS.includes(seg)) rootPrefix = seg + '/';
  }
  const root = rootPrefix ? rootPrefix.slice(0, -1) : (paths[0].split('/')[0] || 'mod');
  const map = new Map();
  list.forEach((f, i) => map.set(paths[i].replace(rootPrefix, ''), f));

  let modName = root, packageId = '', author = '';
  const aboutFile = [...map.entries()].find(([k]) => /^About\/About\.xml$/i.test(k));
  if (aboutFile) {
    try {
      const doc = new DOMParser().parseFromString(await aboutFile[1].text(), 'text/xml');
      modName = (doc.querySelector('name') || {}).textContent?.trim() || modName;
      packageId = (doc.querySelector('packageId') || {}).textContent?.trim() || '';
      author = (doc.querySelector('author') || {}).textContent?.trim() || '';
    } catch (e) { /* ignore */ }
  }

  // t101：按 LoadFolders.xml 只扫描实际会加载的目录（例如 Miho 的 Experimental/ 未加载）
  let allowedFolders = null;
  try {
    const lfEntry = [...map.entries()].find(([k]) => /^LoadFolders\.xml$/i.test(k));
    if (lfEntry) {
      const lfDoc = new DOMParser().parseFromString(await lfEntry[1].text(), 'text/xml');
      const vkeys = Array.from(lfDoc.querySelectorAll('loadFolders > *'))
        .map(n => String(n.tagName || '').toLowerCase()).filter(k => /^v\d+(\.\d+)*$/.test(k));
      vkeys.sort((a, b) => {
        const pa = a.slice(1).split('.').map(Number), pb = b.slice(1).split('.').map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
        return 0;
      });
      const pick = vkeys[vkeys.length - 1];
      if (pick) {
        const box = lfDoc.querySelector('loadFolders > ' + pick);
        const set = new Set(['about', 'defs', 'textures', 'languages', 'patches', 'assemblies', 'sounds', 'preview', 'source']);
        Array.from(box ? box.children : []).forEach(li => {
          if (li.attributes && li.attributes.length) return;   // 条件目录（IfModActive 等）无法判定，保守跳过
          const v = String(li.textContent || '').trim().replace(/^\.?\//, '').replace(/\/+$/, '');
          if (v) set.add(v.split('/')[0].toLowerCase());
        });
        allowedFolders = set;
      }
    }
  } catch (e) { allowedFolders = null; }
  const inAllowed = (k) => {
    if (!allowedFolders) return true;
    return allowedFolders.has(String(k).split('/')[0].toLowerCase());
  };
  const allXml = [...map.entries()].filter(([k]) => /(^|\/)Defs\/.*\.xml$/i.test(k) && inAllowed(k));
  const verDirs = [...new Set(allXml.map(([k]) => k.split('/')[0]).filter(s => /^\d+\.\d+$/.test(s)))].sort();
  const preferredVer = verDirs[verDirs.length - 1];
  const xmls = (preferredVer
    ? allXml.filter(([k]) => k.startsWith(preferredVer + '/') || !/^\d+\.\d+\//.test(k))
    : allXml).slice(0, 900);
  const hairDefXmls = [];          // <HairDef> 定义（原版发型）
  const geneLabels = new Map();    // GeneDef defName -> label（基因外观命名用）
  const raceCandidates = [];
  let modHasHairAddon = false;     // 模组里是否有 hair bodyAddon（可能在父级 def 上）
  let bodyDef = null;
  const bodyDefs = new Map();
  const bodyTypeDefs = new Map();
  const thingDefNodes = [];        // 所有 ThingDef 节点（按 defName / Name 建索引，供 ParentName 继承解析）
  const xenoDefs = new Map();      // XenotypeDef：只定义异种、不改种族的模组（如 Expie）靠它导入
  // 种族候选的字段解析：「自带 <race>」与「从父级继承 <race>」两种来源共用
  const buildRaceCandidate = (node, tag, raceNode, defName, baseNode) => {
    const hosts = [raceNode, node, baseNode].filter(Boolean);
    const addonHost = hosts.find(n => n.querySelector('bodyAddons')) || null;
    let addonPaths = [];
    let addonList = [];
    try {
      const ba = addonHost ? addonHost.querySelector('bodyAddons') : null;
      if (ba) {
        Array.from(ba.querySelectorAll('li')).forEach(li => {
          const pn = li.querySelector('path');
          if (!pn) return;
          const v = (pn.textContent || '').trim();
          if (!v) return;
          addonPaths.push(v);
          const lo = li.querySelector('offsets > south > layerOffset') || li.querySelector('layerOffset');
          const inf = li.querySelector('inFrontOfBody');
          addonList.push({
            path: v,
            layer: lo ? parseFloat(lo.textContent) : NaN,
            front: inf ? /true/i.test(inf.textContent) : null
          });
        });
      }
    } catch (e) { }
    const parentName = node.getAttribute('ParentName') || '';
    const hairAddon = addonPaths.some(v => /hair/i.test(v))
      || (!!parentName && modHasHairAddon);   // 继承自父级 def 的 bodyAddons
    const addons = [];
    try {
      const ba = addonHost ? addonHost.querySelector('bodyAddons') : null;
      if (ba) {
        Array.from(ba.querySelectorAll(':scope > li')).forEach((li, i) => {
          const a = parseAddonNode(li, i);
          if (a) addons.push(a);
        });
      }
    } catch (e) { }
    const labelOf = (n) => n ? (n.querySelector(':scope > label')?.textContent?.trim() || '') : '';
    return {
      defName,
      label: labelOf(node) || labelOf(baseNode) || defName,
      body: raceNode.querySelector(':scope > body')?.textContent?.trim() || '',
      kind: tag,
      parentName,
      addonPaths,
      addonList,
      addons,
      hairAddon,
      bodyTypes: (() => {
        try {
          const bt = raceNode.querySelector('bodyTypes');
          return bt ? Array.from(bt.querySelectorAll(':scope > li')).map(x => String(x.textContent || '').trim()).filter(Boolean) : [];
        } catch (e) { return []; }
      })(),
      bodyTypeRefs: (() => {
        try {
          return Array.from(node.querySelectorAll('BodyType'))
            .map(x => String(x.getAttribute('For') || '').trim())
            .filter(Boolean);
        } catch (e) { return []; }
      })(),
      inheritedFrom: baseNode ? (baseNode.getAttribute('Name') || '') : ''
    };
  };
  for (const [k, f] of xmls) {
    if (f.size > 2.5 * 1024 * 1024) continue;
    let text;
    try { text = await f.text(); } catch (e) { continue; }
    if (!/ThingDef|BodyDef|BodyTypeDef|GeneDef|XenotypeDef|bodyAddons/.test(text)) continue;
    if (!modHasHairAddon && /bodyAddons[\s\S]{0,6000}?<path>[^<]*Hair/i.test(text)) modHasHairAddon = true;
    let doc;
    try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) { continue; }
    if (!doc || doc.querySelector('parsererror')) continue;
    Array.from(doc.documentElement.children).forEach(node => {
      const tag = node.tagName || '';
      if (/ThingDef$/.test(tag) || /AlienRace/.test(tag) && /ThingDef/.test(tag)) {
        const raceNode = node.querySelector(':scope > race');
        const defName = node.querySelector(':scope > defName')?.textContent?.trim();
        thingDefNodes.push({
          node, tag,
          defName: defName || '',
          nameAttr: node.getAttribute('Name') || '',
          parentName: node.getAttribute('ParentName') || '',
          hasRace: !!raceNode,
          abstract: String(node.getAttribute('Abstract') || '').toLowerCase() === 'true'
        });
        if (raceNode && defName) raceCandidates.push(buildRaceCandidate(node, tag, raceNode, defName, null));
      }
      if (/(^|\.)HairDef$/.test(tag)) hairDefXmls.push(node);
      if (/(^|\.)GeneDef$/.test(tag)) {
        const dn = node.querySelector(':scope > defName')?.textContent?.trim();
        if (dn && !geneLabels.has(dn)) {
          geneLabels.set(dn, node.querySelector(':scope > label')?.textContent?.trim()
            || node.querySelector(':scope > labelShortAdj')?.textContent?.trim() || '');
        }
      }
      if (/(^|\.)BodyTypeDef$/.test(tag)) {
        const dn = node.querySelector(':scope > defName')?.textContent?.trim();
        if (dn) {
          bodyTypeDefs.set(dn, {
            defName: dn,
            label: node.querySelector(':scope > label')?.textContent?.trim() || '',
            graphic: node.querySelector(':scope > bodyNakedGraphicPath')?.textContent?.trim() || '',
            parentName: node.getAttribute('ParentName') || '',
          });
        }
      }
      if (/(^|\.)BodyDef$/.test(tag)) {
        const defName = node.querySelector(':scope > defName')?.textContent?.trim();
        if (defName) bodyDefs.set(defName, node);
      }
      // 只做异种（xenotype）的模组没有自己的种族 ThingDef：Expie 这种挂原版 Human 身体，
      // 换的是 FurDef / HeadTypeDef / 基因 renderNode 的贴图。旧逻辑只找种族，整档识别不到。
      if (/(^|\.)XenotypeDef$/.test(tag) && !/XenotypeIconDef$/.test(tag)) {
        const defName = node.querySelector(':scope > defName')?.textContent?.trim();
        if (defName && !xenoDefs.has(defName)) {
          xenoDefs.set(defName, {
            defName,
            label: node.querySelector(':scope > label')?.textContent?.trim() || defName,
            iconPath: node.querySelector(':scope > iconPath')?.textContent?.trim() || '',
            genes: Array.from(node.querySelectorAll(':scope > genes > li'))
              .map(li => String(li.textContent || '').trim()).filter(Boolean),
          });
        }
      }
    });
  }
  // —— XML 继承（ParentName）：很多 HAR 种族把 <race>/<body> 写在 Abstract 基类里，
  //    具体种族只写 defName + ParentName（Nivarian 的 NivarianRace_Pawn 就是这样）。
  //    旧逻辑只认「自己身上有 <race>」的 def，这类种族会整条消失，
  //    最后被同模组里的机械体 / 载具 BodyDef 顶替 —— 表现就是「识别不到身体」。
  if (thingDefNodes.length) {
    const byName = new Map();
    for (const t of thingDefNodes) {
      if (t.defName && !byName.has(t.defName)) byName.set(t.defName, t);
      if (t.nameAttr && !byName.has(t.nameAttr)) byName.set(t.nameAttr, t);
    }
    const raceOfChain = (t) => {
      let cur = t;
      const seen = new Set([t]);
      for (let d = 0; d < 12 && cur && cur.parentName; d++) {
        const p = byName.get(String(cur.parentName).trim());
        if (!p || seen.has(p)) return null;
        seen.add(p);
        if (p.hasRace) return p;
        cur = p;
      }
      return null;
    };
    for (const t of thingDefNodes) {
      if (!t.defName || t.hasRace || t.abstract) continue;
      const base = raceOfChain(t);
      if (!base) continue;
      const raceNode = base.node.querySelector(':scope > race');
      if (!raceNode) continue;
      raceCandidates.push(buildRaceCandidate(t.node, t.tag, raceNode, t.defName, base.node));
    }
  }
  // t52：手动指定的 BodyDef 文件夹（用户单独选的那个目录）优先并入 bodyDefs，同名覆盖
  const manualBodyDefs = new Set();
  if (extraBodyFiles && extraBodyFiles.length) {
    for (const f of extraBodyFiles) {
      let doc;
      try { doc = new DOMParser().parseFromString(await f.text(), 'text/xml'); } catch (e) { continue; }
      if (!doc || doc.querySelector('parsererror')) continue;
      let nodes = Array.from(doc.querySelectorAll('BodyDef'));
      if (!nodes.length) nodes = Array.from(doc.getElementsByTagName('BodyDef'));
      nodes.forEach(node => {
        const defName = node.querySelector(':scope > defName')?.textContent?.trim();
        if (!defName) return;
        bodyDefs.set(defName, node);
        manualBodyDefs.add(defName);
      });
    }
  }
  // prefer an alien-race def whose body is defined by this mod and actually has parts
  // 同一个 defName 可能在 Cont/ 和 1.7/ 里各写一份（搬运/版本目录）→ 只保留一份
  const seenRace = new Map();
  for (const rc of raceCandidates) {
    const prev = seenRace.get(rc.defName);
    if (!prev) { seenRace.set(rc.defName, rc); continue; }
    if (!prev.body && rc.body) seenRace.set(rc.defName, rc);   // 优先留有 body 的那条
  }
  const uniqRaces = [...seenRace.values()];

  const scored = uniqRaces.map(r => {
    let s = 0;
    let n = 0;
    if (/AlienRace/.test(r.kind)) s += 10;
    if (r.body && bodyDefs.has(r.body)) {
      s += 8;
      const partsNode = bodyDefs.get(r.body).querySelector(':scope > corePart');
      const sel = partsNode ? partsNode.querySelectorAll('parts li').length : 0;
      s += Math.min(sel, 40) * 0.5;
      // 真实部位数（countBodyParts 走部位树）：只用于同分时判断“身体是否明显更大”。
      // 旧选择器会把嵌套 li 重复计数（Nivarian_Body 67 个部位被算成 164），
      // 所有种族都顶到 40 的上限、分数打平，最后只能按扫描顺序随便挑一个。
      n = countBodyParts(bodyDefs.get(r.body));
    }
    if (/human/i.test(r.defName)) s -= 20;
    if (/animal|mechanoid|insect/i.test(r.defName)) s -= 6;
    return { r, s, n };
  }).sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    // 同分时：只有身体部位数差到 1.5 倍以上才改选（Nivarian 67 vs 机械体 33），
    // 差别不大的同族变体（Epona 81/80/64）保留原有扫描顺序，避免导入默认值漂移。
    const big = Math.max(a.n, b.n), small = Math.min(a.n, b.n);
    if (small > 0 && big >= small * 1.5) return b.n - a.n;
    return 0;
  });
  const race = scored.length ? scored[0].r : null;
  if (race && race.body && bodyDefs.has(race.body)) bodyDef = bodyDefs.get(race.body);
  // t55-B6：用户在弹窗里显式指定的身体定义优先于任何启发式
  if (forcedBodyDef && bodyDefs.has(forcedBodyDef)) {
    bodyDef = bodyDefs.get(forcedBodyDef);
    try { console.warn('[NHT 编辑器] bodyDef forced by user:', forcedBodyDef, countBodyParts(bodyDef)); } catch (e) { }
  }
  if (!bodyDef && bodyDefs.size) {
    // 种族写了 body 但本模组没有这个 BodyDef（Monolyn 用 Human 就是这样）：
    // 绝对不能拿模组里别的 BodyDef（机械体 / 载具）硬套 —— 只按名字猜，猜不到就留空
    const nameOf = r => norm(((r && r.defName) || '') + ((r && r.label) || ''));
    const rk = nameOf(race) || '';
    for (const [dn, node] of bodyDefs) {
      const n = norm(dn);
      if (!n) continue;
      if (rk && (rk.includes(n) || n.includes(norm(race && race.defName)) || n.includes(norm(race && race.label)))) {
        bodyDef = node;
        break;
      }
    }
    // 只有“种族根本没写 body”才允许唯一 BodyDef 兜底；写了别的 body 就宁可不导部位
    if (!bodyDef && (!race || !race.body) && bodyDefs.size === 1) bodyDef = bodyDefs.values().next().value;
  }
  // t52：race.body 匹配不到、而用户给了 BodyDef 文件夹 —— 从其中挑一个并说明
  // t55-B6：挑选顺序改为 ②defName 与种族同名 ③corePart 确实在自己的 parts 里（自洽）
  //          ④parts 最多；并在 toast/console 里写清用了哪个 defName 与部位数。
  if (!bodyDef && manualBodyDefs.size) {
    const cand = [];
    manualBodyDefs.forEach(dn => {
      const node = bodyDefs.get(dn);
      if (!node) return;
      cand.push({ dn, node, n: countBodyParts(node), core: bodyDefCoreName(node), parts: bodyDefPartNames(node) });
    });
    if (cand.length) {
      const pick = pickManualBodyDef(cand, (race && race.defName) || '');
      if (pick) {
        bodyDef = pick.node;
        try { toast(`没匹配到种族写的 BodyDef，已用手动文件夹里的「${pick.dn}」（${pick.n} 个部位）`); } catch (e) { }
        try { console.warn('[NHT 编辑器] bodyDef fallback to manual folder:', pick.dn, pick.n, 'core=', pick.core); } catch (e) { }
      }
    }
  }

  // 有些模组只在 Languages/*/DefInjected/BodyPartDef 里给部位起名（本体 label 是英文甚至缺失）
  const injLabels = new Map();
  {
    const order = ['ChineseSimplified (简体中文)', 'ChineseSimplified', 'ChineseTraditional (繁體中文)', 'ChineseTraditional'];
    const files = [...map.entries()]
      .filter(([k]) => /(^|\/)(\d+\.\d+\/)?Languages\/[^/]+\/DefInjected\/BodyPartDef\/.*\.xml$/i.test(k));
    const rank = (k) => {
      const m = k.match(/Languages\/([^/]+)\//i);
      const lang = m ? m[1] : '';
      const i = order.indexOf(lang);
      if (i >= 0) return i;
      return /(^|\/)English/i.test(k) ? 50 : 20;
    };
    files.sort((a, b) => rank(a[0]) - rank(b[0]));
    for (const [, f] of files) {
      let doc;
      try { doc = new DOMParser().parseFromString(await f.text(), 'text/xml'); } catch (e) { continue; }
      if (!doc || doc.querySelector('parsererror')) continue;
      Array.from(doc.documentElement.children).forEach(node => {
        const m = (node.tagName || '').match(/^(.+)\.label$/);
        if (!m) return;
        const dn = m[1].trim();
        const val = (node.textContent || '').trim();
        if (dn && val && !injLabels.has(dn)) injLabels.set(dn, val);
      });
    }
  }

  const parts = [];
  if (bodyDef) {
    const readNode = (node, depth, parentName) => {
      const defName = node.querySelector(':scope > defName')?.textContent?.trim()
        || node.querySelector(':scope > def')?.textContent?.trim()
        || node.querySelector(':scope > customLabel')?.textContent?.trim() || '';
      const label = injLabels.get(defName)
        || node.querySelector(':scope > customLabel')?.textContent?.trim()
        || node.querySelector(':scope > label')?.textContent?.trim() || defName;
      if (!defName && !label) return;
      parts.push({ defName, label, depth, parent: parentName });
      const listNode = node.querySelector(':scope > parts');
      if (!listNode || depth > 6) return;
      Array.from(listNode.children).forEach(li => {
        readNode(li.querySelector(':scope > part') || li, depth + 1, label || defName);
      });
    };
    const core = bodyDef.querySelector(':scope > corePart');
    if (core) readNode(core, 0, '');
  }

  // texture index: any /Textures/*.png, keyed by file basename
  // 同一个贴图可能在 Cont/ 与 1.7/ 各有一份 → 按“版本目录优先级”去重
  const allTex = [...map.keys()].filter(k => /(^|\/)Textures\/.*\.png$/i.test(k));
  const texSeen = new Map();
  for (const k of allTex) {
    // 只按“去掉版本目录后的完整路径”去重：Content/ 与 1.6/ 视为同一张，
    // 但 Hair/ 与 Hair/PureBlood/ 下的同名文件必须都保留
    const norm2 = k.replace(/^\d+\.\d+\//, '').toLowerCase();
    const prev = texSeen.get(norm2);
    if (!prev) { texSeen.set(norm2, k); continue; }
    const pref = v => (preferredVer && v.startsWith(preferredVer + '/') ? 0 : 1);
    if (pref(k) < pref(prev)) texSeen.set(norm2, k);
  }
  const tex = [...texSeen.values()];
  // t115：按“文件名 token 边界”匹配，别再让 headgearnorth 里的 ear 命中耳朵。
  // 以前用 base.includes(key)，Ear 的 key 是 "ear"，"headgearnorth" 含 ear 且 endsWith("earnorth")
  // 直接拿 6 分 → Yuran 的左右耳被配成头盔贴图，整个导入结果看着就是“乱的”。
  const texIndex = tex.map(k => {
    const file = k.split('/').pop().replace(/\.png$/i, '');
    return { path: k, raw: String(file).toLowerCase(), base: norm(file) };
  });
  const SIDE_TAIL = /^(l|r|c)?\d*$/;
  const tokenHit = (raw, key) => {
    const toks = String(raw).split(/[^a-z0-9]+/).filter(Boolean);
    let best = 0;
    for (const tk of toks) {
      if (tk === key) return 2;
      if (tk.startsWith(key) && SIDE_TAIL.test(tk.slice(key.length))) best = Math.max(best, 1);
    }
    return best;
  };
  const isApparelTex = k => /(^|\/)apparel\//i.test(k);
  const findTex = key => {
    if (!key) return null;
    let exact = null, best = null, bestScore = 0;
    for (const t of texIndex) {
      if (isApparelTex(t.path)) continue;
      if (t.base === key) { exact = t; break; }
      const hit = tokenHit(t.raw, key);
      if (!hit) continue;
      let score = hit === 2 ? 5 : 2;
      if (hit === 2 && /[^a-z0-9]/.test(t.raw) === false) score += 0;
      if (/(^|[^a-z])(north|south|east|west)([^a-z]|$)/.test(t.raw)) score += 1;
      if (/_?body/.test(t.base)) score += 1;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return exact || best;
  };
  const matchParts = list => {
    const matched = [];
    list.forEach(p => {
      const keys = [norm(p.label), norm(p.defName)].filter(Boolean);
      for (const key of keys) {
        const hit = findTex(key);
        if (hit) {
          const idx = hit.path.lastIndexOf('/Textures/');
          const after = idx >= 0 ? hit.path.slice(idx + '/Textures/'.length) : hit.path.replace(/^.*?Textures\//, '');
          p.texture = after.replace(/\.png$/i, '');
          p.textureFile = map.get(hit.path);
          matched.push(p);
          return;
        }
      }
    });
    return matched;
  };
  const matched = matchParts(parts);

  // every race this mod defines, so the caller can offer a choice
  const readParts = node => {
    const out = [];
    if (!node) return out;
    const walk = (n, depth, parentName) => {
      const defName = n.querySelector(':scope > defName')?.textContent?.trim()
        || n.querySelector(':scope > def')?.textContent?.trim()
        || n.querySelector(':scope > customLabel')?.textContent?.trim() || '';
      const label = injLabels.get(defName)
        || n.querySelector(':scope > customLabel')?.textContent?.trim()
        || n.querySelector(':scope > label')?.textContent?.trim() || defName;
      if (!defName && !label) return;
      out.push({ defName, label, depth, parent: parentName, index: out.length });
      const listNode = n.querySelector(':scope > parts');
      if (!listNode || depth > 6) return;
      Array.from(listNode.children).forEach(li => walk(li.querySelector(':scope > part') || li, depth + 1, label || defName));
    };
    const core = node.querySelector(':scope > corePart');
    if (core) walk(core, 0, '');
    return out;
  };
  const races = scored.map(({ r, s }) => {
    const bd = r.body && bodyDefs.has(r.body) ? bodyDefs.get(r.body) : null;
    const list = readParts(bd);
    const m = matchParts(list);
    return {
      defName: r.defName, label: r.label, body: r.body, score: s,
      bodyDefName: bd ? (bd.querySelector(':scope > defName')?.textContent?.trim() || r.body) : '',
      bodyDefLabel: bd ? (bd.querySelector(':scope > label')?.textContent?.trim() || '') : '',
      parts: list, matched: m.length, texCount: tex.length,
      addons: Array.isArray(r.addons) ? r.addons : [],
    };
  });

  // t116：模组只定义异种（XenotypeDef）时（Expie 这类挂原版 Human 身体、靠基因换皮/换头/换尾），
  // 没有种族 ThingDef 可导入。这里把每个异种当成一个「伪种族」交给上层：
  // 建画布时用标准女性娃娃，doll 的 <xenotype> 写异种名，游戏侧按小人的异种名查娃娃。
  if (!races.length && xenoDefs.size) {
    [...xenoDefs.values()].slice(0, 24).forEach(x => {
      races.push({
        defName: x.defName, label: x.label, body: '', score: 0,
        bodyDefName: '', bodyDefLabel: '', parts: [], matched: 0, texCount: tex.length,
        addons: [], xenotype: true, genes: x.genes || [],
      });
    });
  }

  // 自动识别后层：按同一批头发附加件的 layerOffset 排序，最大的算前层，其余算后层
  try {
    (raceCandidates || []).forEach(r => {
      const hair = (r.addonList || []).filter(a => a && /hair/i.test(a.path) && !/ahoge/i.test(a.path));
      // t117：先认 inFrontOfBody=false —— 那是明确的「在身体后面」= 后层。
      // Yuran 的 InHair 就是这种，但它的 layerOffset 是 +0.451（比前层还大），
      // 旧规则「取最大算前层、其余算后层」会把它判反，把真正的前层头发当成后层。
      hair.filter(a => a.front === false).forEach(a => {
        const dir = String(a.path).split('/').slice(0, -1).join('/') + '/';
        if (dir.length > 1) HAIR_BACK_DIRS.add(dir.toLowerCase());
      });
      const pool = hair.filter(a => a.front !== false);
      const nums = pool.map(a => a.layer).filter(v => Number.isFinite(v) && Math.abs(v) > 0.001);
      if (!nums.length) return;
      const maxLayer = Math.max.apply(null, nums);
      pool.forEach(a => {
        if (!Number.isFinite(a.layer)) return;
        if (!(a.layer < maxLayer - 0.001)) return;
        const dir = String(a.path).split('/').slice(0, -1).join('/') + '/';
        if (dir.length > 1) HAIR_BACK_DIRS.add(dir.toLowerCase());
      });
    });
  } catch (e) { }

  // every png in the mod that looks like body art, plus the hairstyles we can apply
  const assetList = [], hairList = [], maskList = [];
  const ART_RE = /(body|torso|tail|ear|wing|horn|head|pawn|tusk|fin|claw|skin|fur|face|eye|leg|arm|hand|foot|toe|finger)/i;
  tex.forEach(k => {
    const key = textureKey(k);
    const isAhoge = /ahoge/i.test(k);
    const isHair = /(^|[\\/_-])hair/i.test(k) || isAhoge;
    const isBack = hairPathIsBackDir(k) || hairIsBackName(k.split('/').pop());
    if (isHair) {
      // *(_southm / _eastm …) 是发光/发色调色遮罩，不是第二种发型：
      // 收进 maskList，配对到去掉 m 的同一张发型，不能当普通发型丢掉。
      const mm = String(k).match(/_(north|south|east|west)m\.png$/i);
      if (mm) {
        const mk = key.replace(/_(north|south|east|west)m$/i, '').replace(/_(north|south|east|west)$/i, '');
        maskList.push({ key, path: k, file: map.get(k), base: mk });
        return;
      }
      // dolls face the viewer: keep the south-facing frame, drop north/east duplicates
      if (!/_south\.png$/i.test(k) && /_(north|east|west)\.png$/i.test(k)) return;
      // the mod's hair folder also holds UI buttons (Change / Style / Null …)
      const base = k.split('/').pop().replace(/\.png$/i, '');
      if (/^(change|style|null|add|remove|delete|button|btn|icon|bg|background|none|edit|random|reset)$/i.test(base)) return;
      if (hairList.length < 400) {
        hairList.push({
          key: key.replace(/_(north|south|east|west)$/i, ''),
          path: k, file: map.get(k), ahoge: isAhoge, back: isBack,
        });
      }
      return;
    }
    if (/\/icon/i.test(k)) return;
    if (ART_RE.test(k) && assetList.length < 900) assetList.push({ key, path: k, file: map.get(k) });
  });

  {
    const maskByBase = new Map();
    const maskFileByBase = new Map();
    maskList.forEach(m => {
      if (!m.base) return;
      maskByBase.set(m.base, m.key);
      maskFileByBase.set(m.base, m.file || null);
    });
    hairList.forEach(h => {
      h.mask = maskByBase.get(h.key) || '';
      h.maskFile = maskFileByBase.get(h.key) || null;
    });
  }

  const raceBodyTypes = (() => {
    const base = String((race && (race.defName || race.label)) || modName || '').replace(/_?Race$/i, '');
    const key = norm(base);
    let list = [...bodyTypeDefs.values()].filter(bt => {
      const n = norm(bt.defName);
      return !key || n.includes(key) || (bt.graphic && norm(bt.graphic).includes(key));
    });
    if (!list.length) list = [...bodyTypeDefs.values()];
    const defaults = (race && Array.isArray(race.bodyTypes)) ? race.bodyTypes : [];
    const seen = new Set(list.map(x => x.defName));
    defaults.forEach(dn => {
      if (!seen.has(dn)) { list.push({ defName: dn, label: '', graphic: '', parentName: '' }); seen.add(dn); }
    });
    ((race && race.bodyTypeRefs) || []).forEach(dn => {
      if (!seen.has(dn)) { list.push({ defName: dn, label: '', graphic: '', parentName: '' }); seen.add(dn); }
    });
    return list.map(bt => ({
      defName: bt.defName,
      label: bt.label || (() => { const rp = String((race && (race.defName || race.label)) || '').replace(/_?Race$/i, ''); let x = String(bt.defName); if (rp) x = x.replace(new RegExp('^' + rp.replace(/[^A-Za-z0-9]/g, '.?') + '[_]?', 'i'), ''); return x.replace(/^Body_/i, '').replace(/_/g, ' ').trim() || bt.defName; })(),
      graphic: bt.graphic || '',
      isDefault: defaults.includes(bt.defName),
      referenced: !bodyTypeDefs.has(bt.defName),
    }));
  })();

  return {
    root, modName, packageId, author, race,
    bodyTypes: raceBodyTypes,
    geneLabels: [...geneLabels.entries()].map(([defName, label]) => ({ defName, label })),
    races: (() => {
      const m = new Map();
      (races || []).forEach(r => { if (!m.has(r.defName)) m.set(r.defName, r); });
      return [...m.values()];
    })(),
    assets: assetList, hairs: hairList, masks: maskList,
    bodyDefName: bodyDef ? (bodyDef.querySelector(':scope > defName')?.textContent?.trim() || '') : '',
    bodyDefLabel: bodyDef ? (bodyDef.querySelector(':scope > label')?.textContent?.trim() || '') : '',
    bodyDefNames: [...bodyDefs.keys()],
    hairDefCount: hairDefXmls.length,
    harHair: (() => {
      // HAR 的头发是 bodyAddon：贴图在 .../Addon/Hair.../ 下面
      const paths = tex.filter(k => /\/Addon\/[^/]*Hair[^/]*\//i.test(k));
      if (!paths.length) return null;
      const back = paths.filter(k => /hair_?back|hairback/i.test(k)).length;
      const names = paths.map(k => k.split('/').pop().replace(/\.png$/i, '').replace(/_(north|south|east|west)$/i, ''));
      return {
        mod: modName, count: paths.length, back,
        samples: [...new Set(names)].slice(0, 6),
      };
    })(),
    bodyDefList: [...bodyDefs.entries()].map(([defName, node]) => ({
      defName,
      label: node.querySelector(':scope > label')?.textContent?.trim() || defName,
      parts: readParts(node),
    })).filter(x => x.parts && x.parts.length),
    raceBody: race ? race.body : '',
    parts, matched, texCount: tex.length, fileCount: list.length
  };
}

/* pick one of the races the mod defines and make it the active result */
function pickRace(res, defName) {
  const r = (res.races || []).find(x => x.defName === defName);
  if (!r) return res;
  // t70：按模组（packageId）记住导入到的全部种族，供「映射到同模组种族」使用
  try {
    if (res.packageId && Array.isArray(res.races) && res.races.length) {
      if (!S.project.modRaces) S.project.modRaces = {};
      const prev = Array.isArray(S.project.modRaces[res.packageId]) ? S.project.modRaces[res.packageId] : [];
      const m = new Map(prev.map(x => [x.defName, x]));
      res.races.forEach(x => { if (x && x.defName) m.set(x.defName, { defName: x.defName, label: x.label || x.defName }); });
      S.project.modRaces[res.packageId] = Array.from(m.values());
    }
  } catch (e) { }
  res.race = {
    defName: r.xenotype ? '' : r.defName,
    label: r.label, body: r.body,
    kind: r.xenotype ? 'xeno' : 'race',
    xenotype: r.xenotype ? r.defName : '',
    genes: Array.isArray(r.genes) ? r.genes : [],
  };
  res.bodyDefName = r.bodyDefName;
  res.bodyDefLabel = r.bodyDefLabel;
  res.parts = r.parts;
  res.matched = r.parts.filter(p => p.texture);
  return res;
}

async function registerRaceTextures(res) {
  const seen = new Set();
  const reg = async (p, wantBox) => {
    if (!p || !p.file || !p.key || seen.has(p.key)) return;
    seen.add(p.key);
    const url = URL.createObjectURL(p.file);
    const dim = await new Promise(r => {
      const im = new Image();
      im.onload = () => r([im.naturalWidth, im.naturalHeight]);
      im.onerror = () => r([64, 64]);
      im.src = url;
    });
    const rec = { url, w: dim[0], h: dim[1] };
    // blob urls are same-origin, so the alpha box can be measured here (file:// art later
    // would taint the canvas); hair fitting needs it
    if (wantBox) {
      const box = await measureAlpha(url);
      if (box) rec.ab = box;
    }
    EXT.set(p.key, rec);
  };
  // body parts first so the canvas can draw right away, then the rest of the mod's art
  const list = [];
  if (res.races && res.races.length) res.races.forEach(r => r.parts.forEach(p => { if (p.texture) list.push({ key: p.texture, file: p.textureFile }); }));
  (res.assets || []).forEach(a => list.push(a));
  (res.hairs || []).forEach(a => list.push(Object.assign({}, a, { box: true })));
  (res.masks || []).forEach(a => list.push(Object.assign({}, a, { box: false })));
  for (const it of list) await reg(it, !!it.box);
}

/* alpha bounding box straight from an image url, null when the canvas is tainted */
function measureAlpha(url) {
  return new Promise(resolve => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext('2d');
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++) {
          const row = y * c.width;
          for (let x = 0; x < c.width; x++) {
            if (d[(row + x) * 4 + 3] > 8) {
              if (x < x0) x0 = x; if (x > x1) x1 = x;
              if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
        }
        resolve(x1 >= x0 && y1 >= y0 ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null);
      } catch (e) { resolve(null); }
    };
    im.onerror = () => resolve(null);
    im.src = url;
  });
}

/* "Things/Miho/Body/Tail.png" -> "Things/Miho/Body/Tail" (the path form imagePath uses) */
function textureKey(path) {
  const idx = String(path).lastIndexOf('/Textures/');
  const after = idx >= 0 ? path.slice(idx + '/Textures/'.length) : path.replace(/^.*?Textures\//, '');
  return after.replace(/\.png$/i, '');
}

/* a race mod often ships several races: let the author pick the one with the doll */
function promptRacePick(res) {
  const rows = (res.races || []).slice(0, 24).map(r => `
    <button class="racepick" data-act="race-pick" data-race="${esc(r.defName)}">
      <b>${esc(r.label || r.defName)}</b>
      <em>${esc(r.defName)}</em>
      <span>身体 ${esc(r.bodyDefName || r.body || '—')} · ${r.parts.length} 个部位 · 贴图命中 ${r.matched}</span>
    </button>`).join('');
  openModal(`
    <div style="width:min(560px,88vw)">
    <div class="modal__head"><span class="idx">RACE</span><h3>选择要导入的种族</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note" style="margin:0 0 10px">这个模组里有 ${res.races.length} 个种族，选一个来建画布（默认高亮的是自动判断的那个）。</p>
      <div class="racepick__list">${rows}</div>
    </div>
    <div class="modal__foot"><button class="btn" data-act="close-modal">取消</button></div>
    </div>`);
  pendingRace = res;
}

/* build the canvas from the parsed result (a race has already been chosen) */

/* ---------------- HAR 头发检测 ---------------- */

/* ---------------- HAR 状态徽章（50x50）+ 气泡 ---------------- */
function hairWarnInfo(c) {
  if (!c) return null;
  const hh = harHairOf(c);
  const redraw = !!c.hairFitEnabled;
  if (!hh && !redraw) return null;
  const useoff = !!(c.hairFitUseWhenOff || c.hairFitEnabled);
  const fit = c.hairFit || {};
  const hasScale = Number.isFinite(fit.scale) && fit.scale > 0;
  const hasOff = Number.isFinite(fit.offsetX) && Number.isFinite(fit.offsetY);
  const missing = [];
  const en = LANG === 'en';
  if (!useoff) missing.push(en ? 'Export hair offsets is off' : '「导出发型坐标」没打开');
  if (!hasScale) missing.push(en ? 'Scale is not set' : '没设置「缩放」');
  if (!hasOff) missing.push(en ? 'Offset X / Y is not set' : '没设置「偏移 X / Y」');
  const hl = Number.isFinite(c.hairPreviewLayer) ? c.hairPreviewLayer
    : (Number.isFinite(c.hairLayer) ? c.hairLayer : 15);
  return { hh, redraw, useoff, hasScale, hasOff, missing, hl, warn: missing.length > 0 };
}

function harBubbleHTML(c, st) {
  const en = LANG === 'en';
  const rows = [];
  if (st.hh) {
    const names = (st.hh.samples && st.hh.samples.length) ? st.hh.samples.join(' / ') : (en ? '(unnamed)' : '（未命名）');
    rows.push(en
      ? `<b>${esc(st.hh.mod || '')}</b> — ${st.hh.count} hair textures${st.hh.back ? ` (incl. ${st.hh.back} back layers)` : ''}<br>e.g. <b>${esc(names)}</b>`
      : `<b>${esc(st.hh.mod || '')}</b> 共 ${st.hh.count} 张发型贴图${st.hh.back ? `（含 ${st.hh.back} 张后层）` : ''}<br>例如：<b>${esc(names)}</b>`);
    rows.push(en
      ? 'This race uses <b>HAR addon hair</b> (bodyAddon, not in HairDef); the mod draws it from the "HAR hair" settings.'
      : '这个种族用的是 <b>HAR 附加件头发</b>（bodyAddon，不写进 HairDef），模组会按「HAR 头发」栏里的参数绘制它。');
  }
  if (st.redraw) {
    rows.push(en
      ? '<b>Hair redraw is on</b>: after NHT draws the hair, the mod draws it again with these settings. It mainly lets <b>non-HAR hair</b> (vanilla HairDef, e.g. RatKin/Wolfein) show hair color; HAR races use it for fine-tuning. Redraw only restores the texture and covers scars/wounds on that part.'
      : '<b>已开启「发型重绘」</b>：模组会在 NHT 画完头发之后，按该栏参数再补画一遍。它主要用于让<b>非 HAR 发型</b>（原版 HairDef，如 RatKin/Wolfein）也能显示发色；HAR 种族用它微调位置。注意重画只还原贴图，会盖掉该部位原有的疤痕/伤口表现。');
  }
  rows.push(en
    ? `Hair layer = <b>${st.hl}</b>: hair is drawn before the first part with layer ≥ ${st.hl}, so <b>parts with layer > ${st.hl} cover the hair</b>; raise a part's layer or use On-top redraw to put it above the hair.`
    : `头发层级 = <b>${st.hl}</b>：头发会在第一个「图层 ≥ ${st.hl}」的部位之前绘制，所以<b>图层大于 ${st.hl} 的部位会盖在头发之上</b>；想让某部位压在头发上，把它的图层调大，或用「置顶重画」。`);
  if (st.missing.length) {
    rows.push(`<span class="harwarn__bad">${en ? 'Missing: ' : '还缺：'}${st.missing.map(x => esc(x)).join(en ? ', ' : '、')}</span>`);
  } else {
    rows.push(`<span class="harwarn__ok">${en ? 'Export settings complete ✓' : '导出设置完整 ✓'}</span>`);
  }
  const head = st.warn
    ? (st.hh ? (en ? '⚠ This canvas uses HAR hair' : '⚠ 这个画布是 HAR 发型') : (en ? '⚠ Hair redraw is on for this canvas' : '⚠ 这个画布开启了发型重绘'))
    : (en ? '✓ Hair settings OK' : '✓ 发型设置正常');
  return `
      <div class="harwarn__h${st.warn ? '' : ' harwarn__h--ok'}">${head}</div>
      <div class="harwarn__b">${rows.join('<br>')}</div>
      <div class="harwarn__f">
        <button class="btn btn--sm" data-act="har-warn-fix">${en ? 'Go to HAR hair settings' : '前往设置HAR发型'}</button>
        <button class="iconbtn" data-act="har-warn-close" title="${en ? 'Collapse' : '收起'}">${icon('x')}</button>
      </div>`;
}

function patchNameFor(c) {
  try {
    if (!c || c.kind !== 'race') return '';
    return 'nht-' + slug(c.doll || c.title) + '.xml';
  } catch (e) { return ''; }
}

async function patchExists(name) {
  if (!name) return false;
  try {
    if (HOST) return !!(await HOST.PatchExists(name));
    const r = await fetch('/__patch-exists?name=' + encodeURIComponent(name), { cache: 'no-store' });
    return (await r.text()).trim() === 'yes';
  } catch (e) { return false; }
}

function checkCanvasPatch(c) {
  const name = patchNameFor(c);
  if (!name) return;
  if (c._patchOn !== undefined) return;
  c._patchOn = null;
  patchExists(name).then(ok => {
    c._patchOn = !!ok;
    try { if (activeCanvas() === c) updateHarBadge(c); } catch (e) { }
  }).catch(() => { c._patchOn = false; });
}

let BASELINE = null;

const BASE_CANVAS_FIELDS = [
  // bounds / outline 按画布有意不同，不参与基准告警
  { k: 'hairFitEnabled', sev: 'yellow' },
  { k: 'hairFitUseWhenOff', sev: 'yellow' },
  { k: 'hairFront', sev: 'yellow' },
  { k: 'showArmorCover', sev: 'yellow' },
  { k: 'hairPreviewLayer', sev: 'info' },
];
const BASE_PART_FIELDS = [
  { k: 'layer', sev: 'yellow' },
  { k: 'scale', sev: 'yellow' },
  { k: 'desat', sev: 'yellow' },
  { k: 'armor', sev: 'yellow' },
  { k: 'hitboxScale', sev: 'yellow' },
  { k: 'showArmorCover', sev: 'yellow' },
];

function baselineGroupOf(c) {
  return (c && (c.harHair || (c.race && c.race.hairAddon))) ? 'HAR' : 'nonHAR';
}

function baselineValueKey(v) {
  if (v === undefined) return '<missing>';
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

function majorityValue(list) {
  const cnt = new Map();
  list.forEach(v => {
    const k = baselineValueKey(v);
    if (!cnt.has(k)) cnt.set(k, { n: 0, v });
    cnt.get(k).n++;
  });
  let best = null;
  cnt.forEach(e => { if (!best || e.n > best.n) best = e; });
  if (!best) return null;
  return { v: best.v, ratio: best.n / list.length, n: best.n, total: list.length };
}

function computeBaseline() {
  const groups = { HAR: [], nonHAR: [] };
  (S.canvases || []).forEach(c => {
    if (!c || c.kind === 'default') return;   // 基准只统计种族画布，不用默认体型画布
    groups[baselineGroupOf(c)].push(c);
  });
  const out = { v: 3, at: Date.now(), groups: {} };
  Object.keys(groups).forEach(g => {
    const cs = groups[g];
    const canvas = {};
    if (cs.length >= 2) {
      BASE_CANVAS_FIELDS.forEach(f => {
        // t116：非 HAR 组的「发型重绘」逐种族取值（对应模组设置「非 HAR 发型按发色重绘」），不做一致性基准
        if (g === 'nonHAR' && f.k === 'hairFitEnabled') return;
        const m = majorityValue(cs.map(c => c[f.k]));
        if (m && m.ratio >= 0.8 && m.v !== undefined) canvas[f.k] = { v: m.v, ratio: m.ratio, n: m.n, total: m.total };
      });
    }
    const parts = {};
    if (cs.length >= 2) {
      const ids = new Set();
      cs.forEach(c => (c.parts || []).forEach(p => { if (p && p.id && !p.raceOff) ids.add(p.id); }));
      ids.forEach(id => {
        const withPart = cs.filter(c => (c.parts || []).some(p => p && p.id === id && !p.raceOff));
        if (withPart.length / cs.length < 0.8) return;
        const fields = {};
        BASE_PART_FIELDS.forEach(f => {
          const vals = withPart.map(c => {
            const p = (c.parts || []).find(x => x && x.id === id);
            return p ? p[f.k] : undefined;
          });
          const m = majorityValue(vals);
          if (m && m.ratio >= 0.8 && m.v !== undefined) fields[f.k] = { v: m.v, ratio: m.ratio, n: m.n, total: m.total };
        });
        // t115：左右眼睛的护甲图标基准固定为 false（不受多数票影响）
        try {
          const p0 = (withPart[0].parts || []).find(x => x && x.id === id);
          const nm0 = String((p0 && p0.name) || '');
          if (/眼|eye/i.test(nm0)) fields.armor = { v: false, ratio: 1, n: withPart.length, total: withPart.length };
        } catch (e) { }
        if (Object.keys(fields).length) parts[id] = fields;
      });
    }
    out.groups[g] = { canvas, parts, samples: cs.length };
  });
  return out;
}

async function loadBaseline() {
  if ((S.canvases || []).length < 3) {
    setTimeout(() => { loadBaseline().then(() => { try { updateHarBadge(activeCanvas()); } catch (e) { } }); }, 900);
    return;
  }
  try {
    let txt = '';
    txt = (await canvasGet('_baseline.json')) || '';
    let b = null;
    try { b = txt && txt.trim() && txt.trim() !== '{}' ? JSON.parse(txt) : null; } catch (e) { b = null; }
    if (!b || b.v !== 3 || !b.groups) {
      b = computeBaseline();
      if ((S.canvases || []).length >= 3) await saveBaselineFile(b);
    }
    BASELINE = b;
    try { renderCanvasList(); } catch (e) { }
  } catch (e) { BASELINE = computeBaseline(); }
}

async function saveBaselineFile(b) {
  const txt = JSON.stringify(b);
  try {
    await canvasPut('_baseline.json', txt);
    return true;
  } catch (e) { return false; }
}

function baselineDiffs(c) {
  if (!BASELINE || !c) return [];
  const g = BASELINE.groups[baselineGroupOf(c)];
  if (!g) return [];
  const out = [];
  const fmt = v => {
    if (v === undefined) return '（无）';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.length > 40 ? s.slice(0, 40) + '…' : s;
  };
  const groupName = baselineGroupOf(c);
  BASE_CANVAS_FIELDS.forEach(f => {
    if (groupName === 'nonHAR' && f.k === 'hairFitEnabled') return;   // t116：非 HAR 不比较「发型重绘」
    const b = g.canvas && g.canvas[f.k];
    if (!b) return;
    if (baselineValueKey(c[f.k]) !== baselineValueKey(b.v)) {
      out.push({ scope: '画布', field: f.k, cur: fmt(c[f.k]), base: fmt(b.v), sev: f.sev, ratio: b.ratio });
    }
  });
  (c.parts || []).forEach(p => {
    if (!p || !p.id || p.raceOff) return;
    const bf = g.parts && g.parts[p.id];
    if (!bf) return;
    BASE_PART_FIELDS.forEach(f => {
      const b = bf[f.k];
      if (!b) return;
      if (baselineValueKey(p[f.k]) !== baselineValueKey(b.v)) {
        out.push({ scope: p.name || p.id, field: f.k, cur: fmt(p[f.k]), base: fmt(b.v), sev: f.sev, ratio: b.ratio });
      }
    });
  });
  return out;
}

async function refreshBaselineNow(silent) {
  const b = computeBaseline();
  BASELINE = b;
  const ok = await saveBaselineFile(b);
  if (!silent) toast(ok ? '基准参数已重新统计' : '基准参数保存失败', !ok);
  return ok;
}

function noteCanvasSaved() {
  try {
    S.baselineSaves = (Number(S.baselineSaves) || 0) + 1;
    if (S.baselineSaves >= 10) {
      S.baselineSaves = 0;
      refreshBaselineNow(true).then(() => { try { updateHarBadge(activeCanvas()); } catch (e) { } });
    }
  } catch (e) { }
}

function canvasHealth(c) {
  const items = [];
  if (c) { try { migrateGlowVariantPathsSync(c); } catch (e) { } }
  try {
    const st = hairWarnInfo(c);
    if (st) {
      items.push({
        key: 'hair', name: '发型参数', ok: !st.warn, fix: st.warn,
        detail: st.warn ? ('还缺：' + st.missing.join('、')) : '已配好，可导出',
      });
    }
    const grayMiss = [], grayWrong = [];
    (c.parts || []).forEach(p => {
      if (!p || p.raceOff || !p.desat || p.vis === false || !p.img) return;
      if (!DISK_TEX_KEYS) return;   // 磁盘清单未加载时不误报
      if (p.grayImg && p.grayImg.indexOf('Custom/NHTCD_Gray/') !== 0) { grayWrong.push(p.grayImg); return; }
      const expected = grayArtKey(c, p);
      const gk = p.grayImg || expected;
      if (!DISK_TEX_KEYS.has(gk)) grayMiss.push(gk);
    });
    if (grayMiss.length) items.push({ key: 'gray', name: '灰度图', ok: false, fix: true, detail: grayMiss.length + ' 个部位的灰度图不在磁盘' });
    if (grayWrong.length) items.push({ key: 'gray-path', name: '灰度路径', ok: false, fix: true, detail: grayWrong.length + ' 张灰度图不在 NHTCD_Gray' });
    // t115：蒙版（遮罩）自检 —— 文件是否落盘、命名是否符合「贴图名_m」
    const maskMiss = [], maskName = [];
    const scanMask = (p) => {
      if (!p || !p.mask) return;
      if (DISK_TEX_KEYS && !DISK_TEX_KEYS.has(p.mask)) maskMiss.push(p.mask);
      if (p.img && p.mask !== (String(p.img) + '_m')) maskName.push(p.mask);
    };
    (c.parts || []).concat(c.detached || []).forEach(scanMask);
    (c.colorVariants || []).forEach(v => variantExtraParts(v).forEach(scanMask));
    if (maskMiss.length) items.push({ key: 'mask', name: '蒙版文件', ok: false, fix: false, detail: maskMiss.length + ' 个部位的蒙版不在磁盘（重新导入）' });
    if (maskName.length) items.push({ key: 'mask-name', name: '蒙版命名', ok: false, fix: false, detail: maskName.length + ' 个蒙版不是「贴图名_m」，游戏可能找不到' });
    if (DISK_TEX_KEYS) {
      const miss = new Set();
      const scan = (p) => {
        if (!p || p.raceOff) return;
        if (p.img && /^Custom\//.test(p.img) && !DISK_TEX_KEYS.has(p.img)) miss.add(p.img);
        if (p.grayImg && !DISK_TEX_KEYS.has(p.grayImg)) miss.add(p.grayImg);
      };
      (c.parts || []).concat(c.detached || []).forEach(scan);
      // t52：异种专属部位的贴图也要算进来
      (c.colorVariants || []).forEach(v => variantExtraParts(v).forEach(scan));
      if (miss.size) items.push({ key: 'tex', name: '贴图文件', ok: false, fix: true, detail: miss.size + ' 张引用的贴图不在磁盘' });
    }
    // 异种贴图 / 灰度图：检查是否在磁盘，以及是否在对应的 Custom/<种族>/<异种>/ 目录
    if (DISK_TEX_KEYS && Array.isArray(c.colorVariants) && c.colorVariants.length) {
      const missImg = new Set(), missGray = new Set(), wrongImg = new Set(), wrongGray = new Set();
      const desatOn = (c.parts || []).some(p => p && p.desat && !p.raceOff);
      c.colorVariants.forEach(v => {
        if (!v) return;
        const raceDir = variantTextureFolder(c);
        const varDir = variantNameFolder(v);
        const imgPrefix = 'Custom/' + raceDir + '/' + varDir + '/';
        const grayPrefix = 'Custom/NHTCD_Gray/' + customCatFor(c) + '/' + varDir + '/';
        Object.keys(v.parts || {}).concat(Object.keys(v.extraParts || {})).forEach(uid => {
          const r = variantPartRec(v, uid) || variantExtraRec(v, uid) || {};
          if (r.img && /^Custom\//.test(r.img)) {
            if (!DISK_TEX_KEYS.has(r.img)) missImg.add(r.img);
            else if (r.img.indexOf(imgPrefix) !== 0) wrongImg.add(r.img);
          }
          if (desatOn && r.gray && /^Custom\//.test(r.gray)) {
            if (!DISK_TEX_KEYS.has(r.gray)) missGray.add(r.gray);
            else if (r.gray.indexOf(grayPrefix) !== 0) wrongGray.add(r.gray);
          }
        });
      });
      if (missImg.size) items.push({ key: 'variant-tex', name: '异种贴图', ok: false, fix: true, detail: missImg.size + ' 张不在磁盘' });
      if (missGray.size) items.push({ key: 'variant-gray', name: '异种灰度', ok: false, fix: true, detail: missGray.size + ' 张不在磁盘' });
      if (wrongImg.size) items.push({ key: 'variant-path', name: '异种路径', ok: false, fix: true, detail: wrongImg.size + ' 张图片不在对应异种文件夹' });
      if (wrongGray.size) items.push({ key: 'variant-path-gray', name: '异种灰度路径', ok: false, fix: true, detail: wrongGray.size + ' 张灰度不在 NHTCD_Gray 对应目录' });
    }
    // t55-B1：异种专属部位必须写游戏里真实存在的 BodyPartDef defName，否则导出后游戏侧匹配不到
    {
      const badNames = [];
      const poolOk = partDefNamePool(c);
      (c.colorVariants || []).forEach(v => {
        if (!v) return;
        Object.keys(v.extraParts || {}).forEach(uid => {
          const r = variantExtraPart(v, uid);
          if (!r || !r.img) return;
          // t58：<part> 必须是模组自带部位的 defName；显示名不参与校验
          const nm = variantExtraDefName(r);
          if (!nm || !poolOk.has(nm)) badNames.push(String(v.label || v.id || '异种') + ' · ' + (nm || '(空)'));
        });
      });
      if (badNames.length) {
        items.push({
          key: 'variant-name', name: '异种部位名', ok: false, fix: false,
          detail: badNames.length + ' 个异种专属部位没有选中模组自带的部位（如 ' + badNames[0] + '），这些行不会被导出',
        });
      }
    }
    // 部位颜色 / 置顶联动：在气泡里显示当前开关状态与提示
    {
      const desatOn = (c.parts || []).filter(p => p && p.desat && p.img && !p.raceOff).length;
      const linkOn = (c.parts || []).filter(p => p && p.linkTop && p.img && !p.raceOff).length;
      if (c.race || c.kind === 'race') {
        items.push({ key: 'desat-switch', name: '部位颜色', ok: true,
          detail: desatOn ? ('已开启 ' + desatOn + ' 个部位的灰度切换') : '未开启（不检测灰度图）' });
      }
      items.push({ key: 'linktop-switch', name: '置顶联动', ok: true,
        detail: linkOn ? ('已开启 ' + linkOn + ' 个部位的置顶联动') : '未开启' });
    }
    const raceOffParts = (c.parts || []).filter(p => p && p.raceOff);
    if (raceOffParts.length) {
      items.push({ key: 'raceparts', name: '种族部位', ok: true, fix: false,
        detail: raceOffParts.length + ' 个部位种族 BodyDef 没有，已自动关闭' });
    }
    const bd = baselineDiffs(c);
    if (bd.length) items.push({ key: 'baseline', name: '基准参数', ok: false, rows: bd, detail: bd.length + ' 个参数与多数画布不同' });
    if (c.kind === 'race' && c.race) {
      const rt = c.race.defName || c.race.name || '';
      const sibs = (S.canvases || []).filter(x => x !== c && x.kind === 'race' && x.race && (x.race.defName || x.race.name) === rt);
      const dup = (S.canvases || []).find(x => x !== c && x.doll === c.doll);
      if (dup) {
        items.push({ key: 'form', name: '形态', ok: false, fix: false, detail: 'Doll 名重复：' + c.doll });
      } else if ((!c.bodytype || c.bodytype === '*') && sibs.some(x => x.bodytype && x.bodytype !== '*')) {
        items.push({ key: 'form', name: '形态', ok: false, fix: false, detail: '同种族已有指定形态，本画布仍是 *' });
      } else if (c.form && (!c.bodytype || c.bodytype === '*')) {
        items.push({ key: 'form', name: '形态', ok: false, fix: false, detail: '形态缺少 BodyType' });
      } else if (Array.isArray(c.race.bodyTypes) && c.race.bodyTypes.length && c.bodytype && c.bodytype !== '*' && !c.race.bodyTypes.some(bt => bt.defName === c.bodytype)) {
        items.push({ key: 'form', name: '形态', ok: false, fix: false, detail: 'BodyType 不在种族列表：' + c.bodytype });
      }
    }
    if (c.kind === 'race') {
      const pn = patchNameFor(c);
      const dirty = !!(c.savedSig && canvasSig(c) !== c.savedSig);
      if (c._patchOn === null || c._patchOn === undefined) {
        items.push({ key: 'inject', name: '注入状态', ok: true, detail: '检测中…' });
      } else if (!c._patchOn) {
        items.push({ key: 'inject', name: '注入状态', ok: false, fix: true, detail: 'Patches 里还没有 ' + pn });
      } else if (dirty) {
        items.push({ key: 'inject', name: '注入状态', ok: false, fix: true, detail: '已注入，但画布有改动未再注入' });
      } else {
        items.push({ key: 'inject', name: '注入状态', ok: true, detail: '已注入 ' + pn });
      }
    }
  } catch (e) { }
  return items;
}

const HEALTH_NAMES = {
  '发型参数': 'Hair params', '灰度图': 'Grayscale', '灰度路径': 'Gray path', '贴图文件': 'Textures',
  '异种贴图': 'Xenotype textures', '异种灰度': 'Xenotype grayscale', '异种路径': 'Xenotype path',
  '异种灰度路径': 'Xenotype grayscale path', '部位颜色': 'Part color', '置顶联动': 'On-top link',
  '种族部位': 'Race parts', '基准参数': 'Baseline', '形态': 'Form', '注入状态': 'Injection'
};

function healthDetailEn(it) {
  const d = String((it && it.detail) || '');
  let m;
  if ((m = d.match(/^还缺：(.*)$/))) return 'Missing: ' + m[1];
  const table = {
    '已配好，可导出': 'Ready to export',
    '未开启（不检测灰度图）': 'Off (grayscale not checked)',
    '未开启': 'Off',
    '检测中…': 'Checking…',
    '已注入，但画布有改动未再注入': 'Injected, but the canvas changed since'
  };
  if (table[d]) return table[d];
  const pats = [
    [/^(\d+) 个部位的灰度图不在磁盘$/, '$1 part grayscale images not on disk'],
    [/^(\d+) 张灰度图不在 NHTCD_Gray$/, '$1 grayscale images not under NHTCD_Gray'],
    [/^(\d+) 张引用的贴图不在磁盘$/, '$1 referenced textures not on disk'],
    [/^(\d+) 张不在磁盘$/, '$1 not on disk'],
    [/^(\d+) 张图片不在对应异种文件夹$/, '$1 images not in the xenotype folder'],
    [/^(\d+) 张灰度不在 NHTCD_Gray 对应目录$/, '$1 grayscale images not in the matching NHTCD_Gray folder'],
    [/^已开启 (\d+) 个部位的灰度切换$/, 'Grayscale on for $1 parts'],
    [/^已开启 (\d+) 个部位的置顶联动$/, 'On-top link on for $1 parts'],
    [/^(\d+) 个部位种族 BodyDef 没有，已自动关闭$/, '$1 parts missing from the race BodyDef; disabled'],
    [/^(\d+) 个参数与多数画布不同$/, '$1 parameters differ from most canvases'],
    [/^Doll 名重复：(.*)$/, 'Duplicate Doll name: $1'],
    [/^同种族已有指定形态，本画布仍是 \*$/, 'The race already has a form; this canvas is still *'],
    [/^形态缺少 BodyType$/, 'Form is missing BodyType'],
    [/^BodyType 不在种族列表：(.*)$/, 'BodyType not in race list: $1'],
    [/^Patches 里还没有 (.*)$/, 'Not in Patches yet: $1'],
    [/^已注入 (.*)$/, 'Injected $1']
  ];
  for (const [re, rep] of pats) if (re.test(d)) return d.replace(re, rep);
  return d;
}

function healthBubbleHTML(c) {
  checkCanvasPatch(c);
  const items = canvasHealth(c);
  const bad = items.filter(x => !x.ok).length;
  const en = LANG === 'en';
  const fixLabel = {
    hair: en ? 'Go to Hair' : '去发型页',
    gray: en ? 'Generate grayscale' : '生成并写入灰图',
    'gray-path': en ? 'Generate grayscale' : '生成并写入灰图',
    'variant-gray': en ? 'Migrate grayscale' : '迁移并写入灰度',
    'variant-path': en ? 'Migrate grayscale' : '迁移并写入灰度',
    'variant-path-gray': en ? 'Migrate grayscale' : '迁移并写入灰度',
    tex: en ? 'Sync assets' : '同步素材',
    inject: en ? 'Inject now' : '立即注入'
  };
  const fixBtn = (x) => {
    if (x.ok || !x.fix) return '';
    let act = '';
    if (x.key === 'hair') act = 'health-hair';
    else if (x.key === 'gray' || x.key === 'gray-path') act = 'health-gray';
    else if (x.key === 'variant-gray' || x.key === 'variant-path' || x.key === 'variant-path-gray') act = 'health-variant-gray';
    else if (x.key === 'tex') act = 'health-sync';
    else if (x.key === 'inject') act = 'health-inject';
    if (!act) return '';
    return `<button class="linkbtn hhealth__fix" data-act="${act}">${fixLabel[x.key] || (en ? 'Fix' : '处理')}</button>`;
  };
  const subRows = (x) => {
    if (!x.rows || !x.rows.length) return '';
    const shown = x.rows.slice(0, 6);
    return shown.map(d => `<div class="hhealth__sub is-${esc(d.sev || 'info')}">
        <span class="hhealth__where">${esc(d.scope)} · ${esc(d.field)}</span>
        <span class="hhealth__cur">${en ? 'Current' : '当前'} ${esc(d.cur)}</span>
        <span class="hhealth__base">${en ? 'Base' : '基准'} ${esc(d.base)}</span>
      </div>`).join('') + (x.rows.length > shown.length ? `<div class="hhealth__more">${en ? `…${x.rows.length - shown.length} more` : `…还有 ${x.rows.length - shown.length} 项`}</div>` : '');
  };
  const rows = items.length
    ? items.map(x => `<div class="hhealth__row${x.ok ? '' : ' is-bad'}"><i>${x.ok ? '✓' : '!'}</i><b>${esc(en ? (HEALTH_NAMES[x.name] || x.name) : x.name)}</b><span>${esc(en ? healthDetailEn(x) : x.detail)}</span>${fixBtn(x)}</div>${subRows(x)}`).join('')
    : `<div class="hhealth__row"><i>✓</i><b>${en ? 'Canvas OK' : '画布正常'}</b><span>${en ? 'No problems detected' : '没有检测到问题'}</span></div>`;
  return `<div class="harwarn__h${bad ? '' : ' harwarn__h--ok'}">${bad ? (en ? ('⚠ Canvas check: ' + bad + ' pending') : ('⚠ 画布检查：' + bad + ' 项待处理')) : (en ? '✓ Canvas check OK' : '✓ 画布正常')}</div>
    <div class="harwarn__b">${rows}</div>`;
}

function hairStatusHTML(c) {
  try {
    const st = hairWarnInfo(c);
    if (!st) return '';
    const rows = [];
    if (st.hh) {
      const names = (st.hh.samples && st.hh.samples.length) ? st.hh.samples.join(' / ') : '（未命名）';
      rows.push(`<p class="mini-note">HAR 附加件发型：<b>${esc(st.hh.mod || '')}</b> 共 ${st.hh.count} 张${st.hh.back ? `（含 ${st.hh.back} 张后层）` : ''}，例如 ${esc(names)}。</p>`);
    }
    if (st.redraw) rows.push('<p class="mini-note">当前开启了「发型重绘」，会在 NHT 绘制后再补画一遍。</p>');
    rows.push(`<p class="mini-note">头发层级 = <b>${st.hl}</b>；图层更大的部位会盖在头发上。</p>`);
    if (st.missing.length) rows.push(`<p class="mini-note" style="color:#e3b558">还缺：${esc(st.missing.join('、'))}</p>`);
    else rows.push('<p class="mini-note" style="color:#86c98a">发型参数完整 ✓</p>');
    return `<div class="sec"><div class="sec__h"><b>发型状态 HAIR STATUS</b></div>${rows.join('')}</div>`;
  } catch (e) { return ''; }
}

/* 画布异种预览：圆形彩色图标，颜色取该异种第一张部位贴图的平均色 */
const VSWATCH = new Map();
const VSWATCH_LOADING = new Set();

function variantFallbackSwatch(seed) {
  const s = String(seed || 'x');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360} 58% 56%)`;
}

function variantSwatchColor(v) {
  if (!v) return '#6b7378';
  const id = v.id || v.label || 'x';
  if (VSWATCH.has(id)) return VSWATCH.get(id);
  const rec = Object.assign({}, v.parts || {}, v.extraParts || {});
  const recFirst = Object.keys(rec).map(k => rec[k]).find(r => r && r.img);
  const fb = variantFallbackSwatch(id);
  if (recFirst && !VSWATCH_LOADING.has(id)) {
    VSWATCH_LOADING.add(id);
    try {
      const im = new Image();
      im.onload = () => {
        try {
          const s = 24, cv = document.createElement('canvas');
          cv.width = s; cv.height = s;
          const g = cv.getContext('2d');
          g.drawImage(im, 0, 0, s, s);
          const d = g.getImageData(0, 0, s, s).data;
          let r = 0, gg = 0, b = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 32) continue;
            r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++;
          }
          if (n) {
            VSWATCH.set(id, `rgb(${Math.round(r / n)},${Math.round(gg / n)},${Math.round(b / n)})`);
            updateVariantDock(activeCanvas());
          }
        } catch (e) { }
      };
      im.src = imgURL(rec.img);
    } catch (e) { }
  }
  return fb;
}

function updateVariantDock(c) {
  const stage = document.getElementById('stage');
  if (!stage) return;
  let el = document.getElementById('variantDock');
  if (!el) {
    el = document.createElement('div');
    el.id = 'variantDock';
    el.className = 'vdock';
    stage.appendChild(el);
  }
  const vs = (c && Array.isArray(c.colorVariants)) ? c.colorVariants.filter(Boolean) : [];
  if (!c || !vs.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const cur = variantState(c);
  const closed = !!S.ui.variantDockClosed;
  el.classList.toggle('is-closed', closed);
  const base = `<button class="vdock__dot vdock__dot--base${!cur ? ' is-on' : ''}" data-act="variant-base" title="基础贴图" data-lb="基础"></button>`;
  const dots = vs.map(v => {
    const on = !!(cur && cur.id === v.id);
    const col = variantSwatchColor(v);
    return `<button class="vdock__dot${on ? ' is-on' : ''}" data-act="variant-select" data-id="${esc(v.id)}" style="--dot:${col}" data-lb="${esc(v.label || v.id)}" title="${esc(v.label || v.id)}"></button>`;
  }).join('');
  const fold = `<button class="vdock__fold" data-act="variant-dock-toggle" title="${closed ? '展开' : '折叠'}">${closed ? '▾' : '▴'}</button>`;
  el.innerHTML = fold + base + dots;
}

function updateHarBadge(c) {
  const badge = document.getElementById('harBadge');
  const bubble = document.getElementById('harBubble');
  if (!badge || !bubble) return;
  const stageEl = document.getElementById('stage');
  if (stageEl) {
    if (badge.parentElement !== stageEl) stageEl.appendChild(badge);
    if (bubble.parentElement !== stageEl) stageEl.appendChild(bubble);
  }
  if (!c) { badge.hidden = true; bubble.hidden = true; return; }
  const items = canvasHealth(c);
  const bad = items.filter(x => !x.ok).length;
  badge.hidden = false;
  badge.classList.toggle('is-warn', bad > 0);
  badge.classList.toggle('is-ok', bad === 0);
  badge.title = bad ? (LANG === 'en' ? ('Canvas check: ' + bad + ' pending') : ('画布检查：' + bad + ' 项待处理')) : (LANG === 'en' ? 'Canvas check: OK' : '画布检查：正常');
  bubble.classList.toggle('is-warn', bad > 0);
  bubble.innerHTML = healthBubbleHTML(c);
  bubble.hidden = !c.harBubbleOpen;
  badge.classList.toggle('is-open', !!c.harBubbleOpen);
  // 徽章状态变化时，同步刷新左侧画布小卡片右上角的小提示
  try { updateCanvasCardWarn(c); } catch (e) { }
}

/* 把画布内徽章的检查结果实时同步到画布列表小卡片的右上角提示 */
function updateCanvasCardWarn(c) {
  if (!c) return;
  let card = null;
  const cards = document.querySelectorAll('#canvasList .cv[data-act="canvas"]');
  for (const el of cards) {
    if (el.dataset && el.dataset.id === c.id) { card = el; break; }
  }
  if (!card) return;
  let wl = '';
  try { wl = canvasWarnLevel(c); } catch (e) { }
  let hint = card.querySelector('.cv__warn');
  if (!wl) { if (hint) hint.remove(); return; }
  if (!hint) {
    hint = document.createElement('span');
    card.insertBefore(hint, card.firstChild);
  }
  hint.className = 'cv__warn cv__warn--' + wl;
  hint.title = '有需要检查的项目';
}

function toggleHarBubble() {
  const c = activeCanvas();
  if (!c) return;
  c.harBubbleOpen = !c.harBubbleOpen;
  updateHarBadge(c);
}

function detectHarHair(res, title) {
  const list = (res && res.hairs) || [];
  if (!list.length) return null;
  const names = [];
  let back = 0;
  list.forEach(h => {
    const p = String(h.path || h.key || '');
    if (/hair_?back|\/hairback\//i.test(p)) back++;
    const base = p.split('/').pop().replace(/\.png$/i, '').replace(/_(north|south|east|west)$/i, '');
    if (base && !/^(change|style|null|add|remove|delete|button|btn|icon|bg|background|none|edit|random|reset)$/i.test(base)) names.push(base);
  });
  return {
    mod: (res && res.modName) || title || '模组',
    count: list.length,
    back,
    samples: [...new Set(names)].slice(0, 6),
  };
}

/* 老画布没存过 harHair：按"发型贴图的模组/路径"反推 */
/* 游戏运行时写出的权威判定：Editor/hair-map.js（window.__NHT_HAIRMAP） */
function applyHairMap() {
  const m = (typeof window !== 'undefined' && window.__NHT_HAIRMAP) || null;
  if (!m) return 0;
  let n = 0;
  (S.canvases || []).forEach(c => {
    if (!c || c.kind !== 'race' || !c.race) return;
    const keys = [c.race.defName, c.doll, c.title].filter(Boolean);
    let e = null;
    for (const k of keys) { if (m[k]) { e = m[k]; break; } }
    if (!e) return;
    c.harHairChecked = true;
    c.race.hairAddon = !!e.addon;
    c.harHair = e.addon
      ? { mod: c.race.modName || '', count: Number(e.count) || 0, samples: [], addon: true }
      : null;
    n++;
  });
  return n;
}

function loadHairMap() {
  // 新路径：Editor/history/hair-map.js（本地，默认锁定）；旧路径兜底
  const load = src => new Promise(resolve => {
    try {
      const sc = document.createElement('script');
      sc.src = src + '?t=' + Date.now();
      sc.onload = () => resolve(true);
      sc.onerror = () => resolve(false);
      document.head.appendChild(sc);
    } catch (e) { resolve(false); }
  });
  return new Promise(async resolve => {
    if (!LOCAL_HTTP) { resolve(0); return; }
    let ok = await load('/history/hair-map.js');
    if (!ok) ok = await load('/hair-map.js');
    const n = ok ? applyHairMap() : 0;
    try { if (n) { renderAll(); renderHairPane(); } } catch (e) { }
    resolve(n);
  });
}

function harHairOf(c) {
  if (!c) return null;
  if (c.harHair && c.harHair.addon) return c.harHair;   // 新数据/游戏写出的 hair-map：确认是 bodyAddon 头发
  if (c.harHairChecked) return c.harHair || null;       // 已判定过（true=HAR，null=原版发型）
  if (c.harHair) return c.harHair;                      // 老画布：先沿用旧结论，等 Editor/hair-map.js 纠正
  if (c.kind !== 'race') return null;
  const keys = [c.race && c.race.modName, c.title, c.race && c.race.defName].filter(Boolean).map(x => String(x).toLowerCase());
  const hits = (typeof HAIRS !== 'undefined' ? HAIRS : []).filter(h => {
    const mk = String(h.modKey || '').toLowerCase();
    const p = String(h.p || '').toLowerCase();
    return keys.some(k => (mk && mk === k) || (k.length > 2 && p.startsWith(k + '/')));
  });
  // 只认 bodyAddon 的头发（.../Addon/Hair.../），原版 HairDef 的 Textures/Hair/ 不算
  const addon = hits.filter(h => /\/addon\/[^/]*hair/i.test(String(h.p || '')));
  if (!addon.length) return null;
  const hit = detectHarHair({ hairs: addon.map(h => ({ path: h.p })), modName: c.title }, c.title);
  if (hit) hit.addon = true;
  return hit;
}

function createFromRace(res) {
  const title = cleanTitle((res.race && res.race.label) || res.modName);
  const raceDef = res.race && res.race.defName;
  const xenoDef = res.race && res.race.kind === 'xeno' ? String(res.race.xenotype || '') : '';
  const matchCanvas = x => x && x.kind === 'race' && (xenoDef ? (x.race && x.race.xenotype === xenoDef) : (x.race && x.race.defName === raceDef));
  const existing = (xenoDef || raceDef) ? ((S.canvases || []).find(x => matchCanvas(x) && !x.parentId) || (S.canvases || []).find(matchCanvas)) : null;
  if (existing) {
    const wasAssets = hasStoredArt(res.modName || title, 'asset');
    const wasHair = hasStoredArt(res.modName || title, 'hair');
    const added = wasAssets ? 0 : addRaceAssets(res, title);
    if (!wasHair) setHairs(res, title);
    if (Array.isArray(res.bodyTypes) && res.bodyTypes.length) existing.race.bodyTypes = res.bodyTypes;
    if (Array.isArray(res.bodyTypes) && res.bodyTypes.length) {
      (S.canvases || []).forEach(x => {
        if (x && x.kind === 'race' && x.race && x.race.defName === raceDef) x.race.bodyTypes = res.bodyTypes;
      });
    }
    try {
      const addonList = ((res.race && res.race.addons) || []).filter(a => !/hair/i.test(String(a.path || '') + ' ' + String(a.name || '')));
      markFollowParts(existing, res.race, addonList);
    } catch (e) { }
    S.active = existing.id;
    renderAll();
    persist();
    try { saveAllCanvasFiles(true); } catch (e) { }
    toast(`已更新「${title}」：${added ? `补收 ${added} 张素材` : '素材已存在'}，${wasHair ? '发型已存在' : '已收进发型库'}`);
    return existing;
  }
  const c = createRaceCanvas(res, 'female', title);
  try {
    const addonList = ((res.race && res.race.addons) || []).filter(a => !/hair/i.test(String(a.path || '') + ' ' + String(a.name || '')));
    markFollowParts(c, res.race, addonList);
  } catch (e) { }
  try {
    if (LOCAL_HTTP) fetch('/__custommkdir?name=' + encodeURIComponent(customCatFor(c)), { cache: 'no-store' });
  } catch (e) { }
  const hasAssets = hasStoredArt(res.modName || title, 'asset');
  const hasHair = hasStoredArt(res.modName || title, 'hair');
  const added = hasAssets ? 0 : addRaceAssets(res, title);
  if (!hasHair) setHairs(res, title);
  // 只有种族 bodyAddons 里真的有 Hair 附加件，才算 HAR 头发；
  // 原版 HairDef 的 Textures/.../Hairs/*.png 是普通发型，不能当成 HAR
  try {
    // 后层目录已在 parseRaceMod 里按 layerOffset 相对顺序登记
    const isHarHair = !!(res.race && res.race.hairAddon);
    const addonHairs = (res.hairs || []).filter(h => /\/Addon\/[^/]*Hair/i.test(String(h.path || h.key || '')));
    c.harHair = isHarHair ? detectHarHair({ hairs: addonHairs, modName: res.modName || title }, title) : null;
    c.harHairChecked = true;
    if (c.harHair) c.harHair.addon = true;
  } catch (e) { }
  const stored = hasAssets && hasHair;
  S.canvases.push(c);
  S.active = c.id;
  S.sel = null;
  revealKindLayers(c);
  renderAll();
  fitView();
  pushHistory();
  try { saveAllCanvasFiles(true); } catch (e) { }
  const skipped = c.race.skipped || 0;
  const noParts = !c.race.partCount;
  toast(`已导入种族「${title}」：${noParts ? '这个种族没有自带身体部位，套用「标准女性」' : '默认体型「标准女性」'}${c.race.added ? `，补了 ${c.race.added} 个新部位` : ''}${added ? `，收进 ${added} 张模组素材` : (stored ? '，素材和发型本地已有，只新建画布' : '')}${skipped ? `（${skipped} 个部位没找到贴图，已跳过）` : ''}`);
  return c;
}


/* 自动对齐：新建的种族画布把 bid 从“身体下标”换成“NHT 槽位” */
function autoAlignRaceBids(c) {
  if (!c || !c.race) return 0;
  const race = c.race;
  const bodyParts = Array.isArray(race.bodyParts) ? race.bodyParts : null;
  if (!bodyParts || !bodyParts.length) return 0;
  const slot = nhtSlotMap(c);                 // 身体下标 -> NHT 槽位
  if (!slot) return 0;
  const byBody = new Map(bodyParts.map(x => [Number(x.i), String(x.def || '').toLowerCase()]));
  let changed = 0;

  // 1) 部位：只有“名字与那一格 def 匹配”才换算
  (c.parts || []).forEach(p => {
    const bid = Number(p.bid);
    if (!Number.isFinite(bid) || bid < 0) return;
    if (!slot.has(bid)) return;               // 已经是槽位/没有对应格
    const def = byBody.get(bid) || '';
    const want = defFromLabel(p.name);
    if (!want || !def || (want !== def && !def.startsWith(want) && !want.startsWith(def))) return;
    const to = slot.get(bid);
    if (to !== bid) { p.bid = to; changed++; }
  });

  // 2) 身体表本身也换成槽位，这样“部位”下拉里列出来的就是游戏用的编号
  race.bodyParts = bodyParts
    .map(x => ({ ...x, i: slot.has(Number(x.i)) ? slot.get(Number(x.i)) : x.i }))
    .sort((a, b) => Number(a.i) - Number(b.i));
  race.nhtIndexed = true;

  // 3) 有游戏写出的精确对照表时再校正一遍
  loadBodyMap(true, race.bodyDef).then(map => {
    if (!map || !Array.isArray(map.pairs)) return;
    const r2 = fixBidsWithMap(c, map);
    if (r2.changed) {
      try { renderStage(); renderTree(); renderInspector(); } catch (e) { }
    }
  }).catch(() => { });
  return changed;
}

function cleanTitle(t) {
  return String(t || '').replace(/\s*race\s*$/i, '').trim();
}

function createRaceCanvas(res, baseId, title) {
  // 记录这个画布对应的种族 key（游戏里用 pawn.def.defName 查 HAR 头发参数）
  // 放在画布上，导出时直接用，不再靠猜

  // a race without body parts of its own (body = Human, or no BodyDef in the mod) has no
  // geometry to copy, so the canvas always starts from the standard female doll
  const noParts = !res.parts || !res.parts.length;
  const wantId = noParts ? 'female' : (baseId || 'female');
  const bt = D.bodytypes.find(b => b.id === wantId) || D.bodytypes.find(b => b.id === 'female') || D.bodytypes[0];
  const c = canvasFromBodytype(bt);
  c.id = 'race-' + Date.now().toString(36);
  c.kind = 'race';
  c.title = cleanTitle(title || (res.race && res.race.label) || res.modName);
  c.hairFitEnabled = false;   // HAR 画布默认关闭「发型重绘」
  c.sub = res.race ? res.race.label : res.modName;
  c.base = bt.id;
  c.doll = res.race ? res.race.defName : bt.doll;
  // t116：只做异种的模组（没有种族 ThingDef）——doll 名要唯一，<xenotype> 写异种 defName，
  // 游戏侧按小人的异种名找这个娃娃；种族名留空，避免被当成某个种族。
  const xenoName = res.race && res.race.kind === 'xeno' ? String(res.race.xenotype || res.race.defName || '') : '';
  if (xenoName) {
    c.doll = 'NHTCD_X_' + xenoName.replace(/[^A-Za-z0-9_]/g, '_');
    c.sub = '异种 · ' + (res.race.label || xenoName);
  }
  const forms = Array.isArray(res.bodyTypes) ? res.bodyTypes : [];
  if (forms.length) {
    const def = forms.find(f => f.isDefault) || forms[0];
    c.bodytype = def.defName;
    c.form = def.label || def.defName;
  }
  // NHT keys the doll on the xenotype: the race defName works for every Miho xenotype
  // when the NHTRaceDolls hook is present; without it the gene xenotype name is needed.
  c.xenotype = xenoName || (res.race ? res.race.defName : bt.xenotype);
  // the RJW markers are doll-name specific: start disabled, regenerate on demand
  c.rjw = false;
  removeRJW(c);
  c.race = {
    modName: res.modName, packageId: res.packageId, author: res.author,
    defName: res.race ? res.race.defName : '', label: res.race ? res.race.label : '',
    kind: xenoName ? 'xeno' : 'race', xenotype: xenoName,
    bodyDef: res.bodyDefName, partCount: res.parts.length, added: 0,
    harHair: res.harHair || null,
    harHairChecked: true,
    hairDefCount: res.hairDefCount || 0,
    bodyTypes: forms,
    bodyParts: res.parts.map(p => ({ i: p.index, def: p.defName, label: p.label, src: res.modName || '模组' })).slice(0, 200),
    bodyDefs: (() => {                      // t101：保存全部部位表；没有 BodyDef 时补一张 Humanlike
      const list = (res.bodyDefList || []).map(b => ({
        defName: b.defName, label: b.label,
        parts: b.parts.map(p => ({ i: p.index, def: p.defName, label: p.label })).slice(0, 300),
      }));
      const want = res.bodyDefName || 'Human';
      if (!list.some(d => d.defName === want)) {
        const synth = (c.parts || [])
          .map(p => ({ i: Number(p.bid), def: String(p.id || p.name || ''), label: String(p.name || '') }))
          .filter(x => x.def && Number.isFinite(x.i) && x.i >= 0);
        if (synth.length) list.unshift({ defName: want, label: want === 'Human' ? '原版人类（Human）' : want, parts: synth });
      }
      return list.slice(0, 40);
    })()
  };
  // 自动把部位编号对齐到 NHT 槽位（避免“左耳变鼻、右耳变下颚”）
  try { autoAlignRaceBids(c); } catch (e) { }
  // 同时生成 NHT 部位对照表（尾巴/腮这类多出来的部位会被排到 64+）
  try { ensureRaceRemap(c); } catch (e) { }
  c.parts.forEach(p => { p.name = p.name; });
  c.notes = (res.race
    ? `从模组「${res.modName}」读取的种族画布：${res.race.defName} / ${res.bodyDefName}。基础几何来自「${bt.title}」${noParts ? '（这个种族没有自带身体部位，默认套用标准女性）' : ''}，请按种族贴图重新摆位。`
    : `从模组「${res.modName}」导入，未检测到种族定义，使用「${bt.title}」作为几何底稿。`)
    + ' 种族自带贴图以外部文件形式引用，刷新页面后需重新导入模组文件夹。';

  // what the base bodytype already has (ids like FemaleTorso -> torso)
  const dollKeys = new Set();
  bt.parts.forEach(p => {
    const raw = String(p.id || '').replace(new RegExp('^' + String(bt.doll || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '');
    const key = norm(raw.replace(/Left|Right/g, ''));
    if (key) dollKeys.add(key);
  });

  let added = 0, skipped = 0;
  const b = canvasBounds(c);
  res.parts.forEach(rp => {
    const label = String(rp.label || rp.defName || '').trim();
    if (!label) return;
    const k1 = norm(rp.defName || ''), k2 = norm(label);
    // t115：先看有没有 bodyAddon（尾巴这种 def 叫 Spine、customLabel 叫 Tail 的，
    // 光按 def 会和躯干撞名被当成“底座已有”直接跳过）
    const artAddon = addonArtForPart(res, rp);
    if (!artAddon && ((k1 && dollKeys.has(k1)) || (k2 && dollKeys.has(k2)))) return;   // already on the base doll
    let tex = rp.texture;
    if (!tex && artAddon) tex = artAddon.path;                        // bodyAddon 用自己的正面图
    if (!tex) { skipped++; return; }                                  // no art in this mod
    const col = added % 3, row = Math.floor(added / 3);
    const p = addPartTo(c, {
      img: tex,
      name: label.slice(0, 18),
      x: Math.round((col - 1) * 86 + b.x + b.w / 2),
      y: Math.round(b.y + b.h * 0.52 + row * 90),
      sx: 1, sy: 1,
      layer: 44 + added,
      kind: 'body',
      custom: false,
      source: 'race',
      bid: rp.index,          // 该部位在种族 BodyDef.AllParts 里的序号（翅膀这类新部位就靠它）
    });
    if (p && artAddon) {      // bodyAddon 生成的部位默认就打开「自动变换」，省得再手动扫一遍
      p.autoFollow = true;
      p.followDetected = true;
      p.followAddon = String(artAddon.addon.name || artAddon.addon.path || '');
      p.followPath = String(artAddon.addon.path || '');
      p.followChannel = artAddon.addon.colorChannel || 'hair';
      p.followRot = 0;
    }
    if (p) added++;
  });
  // t116：异种模组没有自己的部位表，身体/头/尾巴都是整张 512×512 的立绘（Bodies / Heads / Tails 目录）。
  // 这类图本身就画在画布坐标系里，塞进躯干/头的原几何会被「按部位尺寸缩放 + 按部位锚点平移」，位置全错；
  // 正确做法是：先隐藏底座各部位的默认贴图，再各自加一条「整图」部位（居中、1 倍大小）。
  let xenoArt = 0;
  if (xenoName) {
    const assetKey = a => String((a && (a.key || a.path)) || '');
    const pickArt = (re) => {
      const hits = (res.assets || []).filter(a => re.test(assetKey(a)));
      if (!hits.length) return null;
      // t116b：优先正面图，其次是「不带体型后缀」的通用图。
      // 例：ERN_Expie/Bodies 下同时有 ERN_ExpieBody_south、ERN_ExpieBodyMale_south、
      // ERN_ExpieBodyChild_south —— 按目录顺序会取到 Child，躯干直接变成儿童体型。
      const rank = a => {
        const k = assetKey(a).toLowerCase();
        const base = k.split('/').pop();
        let n = 0;
        if (/_south$/.test(k)) n -= 8;
        if (/(male|female|child|baby|fat|hulk|thin)/.test(base.replace(/[^a-z]/g, ''))) n += 4;
        n += Math.min(4, base.length / 30);
        return n;
      };
      return hits.slice().sort((a, b) => rank(a) - rank(b))[0];
    };
    const bodyA = pickArt(/(^|\/)Bodies\/[^/]*$/i);
    const headA = pickArt(/(^|\/)Heads?\/[^/]*$/i);
    const tailA = pickArt(/(^|\/)Tails?\/[^/]*$/i);
    const addFull = (a, name, bid, layer) => {
      if (!a) return false;
      const p = addPartTo(c, {
        id: 'Race_X_' + name, img: a.key, name, x: 0, y: 0, sx: 1, sy: 1,
        layer, kind: 'body', custom: false, source: 'race', bid,
      });
      if (!p) return false;
      p.nameEn = name;
      p.hb = [0.9, 0.9];
      return true;
    };
    // 立绘已经包含整个身体，底座默认贴图留着会从下面透出来
    (c.parts || []).forEach(pp => { if (pp && !pp.custom) pp.img = ''; });
    if (addFull(tailA, 'tail', 64, 0)) xenoArt++;
    if (addFull(bodyA, 'body', 0, 1)) xenoArt++;
    if (addFull(headA, 'head', 13, 2)) xenoArt++;
    c.xenoArt = xenoArt;
  }
  c.race.added = added;
  c.race.skipped = skipped;
  try {
    const keys = [res && res.race && res.race.defName, res && res.race && res.race.label, c.xenotype, c.doll]
      .filter(v => v && String(v).trim() && String(v).trim() !== '*')
      .map(v => String(v).trim());
    c.hairRaceKeys = [...new Set(keys)];
  } catch (e) { }

  return c;
}

function addPartTo(c, opts) {
  const [w, h] = imgDim(opts.img);
  const p = {
    uid: uid(),
    id: opts.id || ('Race_' + (c.parts.filter(x => x.custom).length + 1)),
    name: opts.name || prettyAsset(opts.img),
    nameEn: opts.name || prettyAsset(opts.img),
    kind: opts.kind || 'custom', bid: opts.bid == null ? -1 : opts.bid, img: opts.img,
    x: opts.x, y: opts.y, sx: opts.sx, sy: opts.sy, flip: !!opts.flip, rot: 0,
    layer: opts.layer, extra: 0, hb: [0.9, 0.9], armor: true, vis: true, locked: false,
    state: 'ok', sev: 0, wound: 'cut', prosth: null, overHair: false, atlas: null, uv: null,
    custom: opts.custom == null ? true : !!opts.custom, source: opts.source || 'race'
  };
  c.parts.push(p);
  return p;
}

/* ==========================================================================
   modal
   ========================================================================== */
let modalState = null;

function openModal(html) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal" data-modal="1"><div class="modal__box">${html}</div></div>`;
}
function closeModal() {
  $('#modalRoot').innerHTML = '';
  modalState = null;
  try {
    if (S.ui && S.ui.geneLookResolve) {
      const fn = S.ui.geneLookResolve;
      S.ui.geneLookResolve = null;
      fn(null);
    }
  } catch (e) { }
}

function modalNewCanvas() {
  modalState = { mode: 'blank', title: '', base: 'female', bounds: 'female', race: null, status: 'idle', err: '' };
  modalNewCanvasRender();
}

/* name a new part before it is created (the ＋ button on a group) */
function promptPartName(gk) {
  S.ui.addGroup = gk;
  S.ui.addName = '新部位';
  openModal(`
    <div style="width:min(440px,84vw)">
    <div class="modal__head"><span class="idx">NEW</span><h3>新建部位</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <div class="field"><label>名称</label><div class="ctl">
        <input class="inp inp--txt" id="newPartName" data-f="ui.addName" value="${esc(S.ui.addName)}" placeholder="狼耳朵 / 尾巴 / 翅膀" spellcheck="false">
      </div></div>
      <p class="mini-note" style="margin-top:10px">会建在「${esc(KGROUP_LABEL[gk] || '外形')}」栏里，位置在画布中央，之后选中它再点贴图（或把贴图拖到那一行）。</p>
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--primary" data-act="new-part-ok">创建</button>
    </div>
    </div>`);
  const inp = $('#newPartName');
  if (inp) {
    inp.focus(); inp.select();
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); const b = document.querySelector('[data-act="new-part-ok"]'); if (b) b.click(); }
    });
  }
}

/* bounding boxes shipped by NHT's own dolls; Alien is the 512 x 1024 draw area (1:1 in game) */
const BOUND_PRESETS = [
  { id: 'female', label: '标准女性 Female · 320 × 890', box: { x: -160, y: -455, w: 320, h: 890 } },
  { id: 'male', label: '标准男性 Male · 360 × 910', box: { x: -180, y: -465, w: 360, h: 910 } },
  { id: 'fat', label: '肥胖 Fat · 380 × 870', box: { x: -190, y: -440, w: 380, h: 870 } },
  { id: 'hulk', label: '壮硕 Hulk · 440 × 980', box: { x: -220, y: -495, w: 440, h: 980 } },
  { id: 'kid', label: '幼体 Kid · 360 × 900', box: { x: -180, y: -450, w: 360, h: 900 } },
  { id: 'alien', label: 'Alien Race · 512 × 1024（y 下移 49，与游戏画布对齐）', box: { x: -256, y: -460, w: 512, h: 1024 } },
];

function boundOf(id) {
  const p = BOUND_PRESETS.find(x => x.id === id) || BOUND_PRESETS[0];
  return { x: p.box.x, y: p.box.y, w: p.box.w, h: p.box.h };
}

function boundSelect(st) {
  const cur = st.bounds || 'female';
  const p = BOUND_PRESETS.find(x => x.id === cur) || BOUND_PRESETS[0];
  return `<details class="fold">
        <summary>边界预设 · <b>${esc(p.label)}</b></summary>
        <div class="fold__body">
          <select class="inp" data-f="m.bounds">
            ${BOUND_PRESETS.map(b => `<option value="${b.id}"${cur === b.id ? ' selected' : ''}>${esc(b.label)}</option>`).join('')}
          </select>
          <p class="mini-note">选「Alien Race」时边界正好等于游戏画布 512 × 1024，导出后游戏里和编辑器 1:1；选官方体型则沿用原版娃娃的边界。</p>
        </div>
      </details>`;
}

function modalNewCanvasRender() {
  const st = modalState;
  const body = `
    <div class="modal__head"><span class="idx">NEW</span><h3>新建画布</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <div class="cards">
        <button class="card ${st.mode === 'blank' ? 'is-on' : ''}" data-act="mode" data-v="blank">
          <span class="ico">${icon('plus')}</span><b>空白画布</b><p>从零开始，用素材库里的贴图一块块拼出体型。</p>
        </button>
        <button class="card ${st.mode === 'copy' ? 'is-on' : ''}" data-act="mode" data-v="copy">
          <span class="ico">${icon('copy')}</span><b>复制当前</b><p>以「${esc(activeCanvas() ? activeCanvas().title : '—')}」为底稿新建一个异种。</p>
        </button>
        <button class="card ${st.mode === 'race' ? 'is-on' : ''}" data-act="mode" data-v="race">
          <span class="ico">${icon('dna')}</span><b>从种族模组</b><p>读取种族模组文件夹，用种族名称命名画布。</p>
        </button>
      </div>
      <div class="field field--wide" style="margin-top:14px">
        <label>画布名称</label>
        <div class="ctl"><input class="inp inp--txt" data-f="m.title" value="${esc(st.title)}" placeholder="${st.mode === 'race' ? '读取种族模组后自动填入' : '例如：Kurin · 三尾狐'}"></div>
      </div>
      ${boundSelect(st)}
      ${st.mode === 'race' ? `
        <div class="field"><label>几何底稿</label><div class="ctl">
          <select class="inp" data-f="m.base">${D.bodytypes.map(b => `<option value="${b.id}"${st.base === b.id ? ' selected' : ''}>${b.title} · ${b.doll}</option>`).join('')}</select>
        </div></div>
        <div class="filerow">
          <div class="path ${st.race ? 'is-set' : ''}">${st.race ? esc(st.race.root) : '选择种族模组的根文件夹（含 About / Defs / Textures）'}</div>
          <button class="btn btn--sm" data-act="pick-race-dir">${icon('folder')}选择文件夹</button>
        </div>
        ${st.status === 'parsing' ? `<p class="mini-note">正在读取 About.xml 与 Defs…</p>` : ''}
        ${st.err ? `<p class="mini-note" style="color:#e2564a">${esc(st.err)}</p>` : ''}
        ${st.race ? raceInfoHTML(st.race) : ''}
      ` : ''}
    </div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--primary" data-act="create-canvas" ${st.mode === 'race' && !st.race ? 'disabled style="opacity:.4"' : ''}>创建画布</button>
    </div>`;
  openModal(body);
}

function raceInfoHTML(res) {
  const info = res.race ? `${res.race.defName}` : '未检测到种族定义';
  return `<div class="raceinfo">
    <div class="raceinfo__head">${icon('dna')}<b>${esc(res.modName)}</b><span style="margin-left:auto;font:9.5px/1 var(--font-mono);color:#5d6569">${res.fileCount} 个文件</span></div>
    <div class="raceinfo__body">
      <div><span>种族</span><em>${esc(info)}</em></div>
      <div><span>BodyDef</span><em>${esc(res.bodyDefName || '—')}</em></div>
      <div><span>包名</span><em>${esc(res.packageId || '—')}</em></div>
      <div><span>贴图</span><em>${res.matched.length} / ${res.parts.length} 已匹配</em></div>
      <div><span>头发</span><em>${(() => {
const h = (res.race && res.race.hairAddon) ? res.harHair : null;
        if (h) return `<b style="color:#7fd18a">HAR 附加件</b> · 共 ${h.count} 张${h.back ? `（后层 ${h.back}）` : ''}`;
        if (res.hairDefCount) return `<b style="color:#e3b558">原版 HairDef</b> · ${res.hairDefCount} 个样式`;
        return '<b style="color:#e2564a">未检测到头发</b>';
      })()}</em></div>
    </div>
    
    <div class="raceparts">
      ${res.parts.slice(0, 42).map(p => `<i class="${p.texture ? 'new' : ''}">${esc(p.label || p.defName)}</i>`).join('')}
    </div>
  </div>`;
}

function modalHelp() {
  const en = LANG === 'en';
  const shortcuts = en
    ? `<div>Move part <span><kbd>Arrows</kbd><kbd>Shift</kbd>+10</span></div>
       <div>Zoom canvas <span><kbd>Wheel</kbd></span></div>
       <div>Pan <span><kbd>Space</kbd>+drag</span></div>
       <div>Fit view <span><kbd>F</kbd></span></div>
       <div>Detach part <span><kbd>Delete</kbd></span></div>
       <div>Duplicate part <span><kbd>Ctrl</kbd><kbd>D</kbd></span></div>
       <div>Mirror pair <span><kbd>M</kbd></span></div>
       <div>Layer <span><kbd>[</kbd><kbd>]</kbd></span></div>
       <div>Grid / outline <span><kbd>G</kbd><kbd>O</kbd></span></div>
       <div>Undo / redo <span><kbd>Ctrl</kbd><kbd>Z</kbd></span></div>
       <div>Save / cancel <span><kbd>Ctrl</kbd><kbd>S</kbd><kbd>Esc</kbd></span></div>`
    : `<div>移动部位 <span><kbd>方向键</kbd><kbd>Shift</kbd>+10</span></div>
       <div>缩放画布 <span><kbd>滚轮</kbd></span></div>
       <div>平移 <span><kbd>空格</kbd>拖动</span></div>
       <div>适配视图 <span><kbd>F</kbd></span></div>
       <div>拆卸部位 <span><kbd>Delete</kbd></span></div>
       <div>复制部位 <span><kbd>Ctrl</kbd><kbd>D</kbd></span></div>
       <div>镜像成对 <span><kbd>M</kbd></span></div>
       <div>图层 <span><kbd>[</kbd><kbd>]</kbd></span></div>
       <div>网格 / 轮廓 <span><kbd>G</kbd><kbd>O</kbd></span></div>
       <div>撤销 / 重做 <span><kbd>Ctrl</kbd><kbd>Z</kbd></span></div>
       <div>保存 / 取消 <span><kbd>Ctrl</kbd><kbd>S</kbd><kbd>Esc</kbd></span></div>`;
  const zhFirst = `
    <h4 class="help-h">画布与部位</h4>
    <p class="help-p"><b>每个体型都是一张独立画布</b>，左侧列表切换。模组 1.6 的 5 个体型（Male / Female / Fat / Hulk / Kid）已全部载入，共 135 个基础部位${RJW_PARTS.length ? `；启用 RJW 后每个体型再增加 ${(RJW_BY_DOLL.get('Male') || []).length} 个生殖 / 胸部标记` : ''}。</p>
    <p class="help-p"><b>拖动</b>部位即可移动；角上的方块缩放、上方圆点旋转。选中后可拆卸到左下「已拆卸」托盘，再装回或拖到新位置。</p>
    <p class="help-p"><b>自定义部位</b>（翅膀、尾巴、触手）来自「素材」页：点一张贴图即添加，它们在受伤 / 缺失 / 假体上和原生部位完全一致。</p>
    <p class="help-p"><b>导入种族</b>选种族模组的根文件夹后直接建画布：画布名用种族自己的名字，默认体型是<b>标准女性</b>，这个体型没有的部位会按种族 BodyDef 里的名称自动新建到「外形」栏。</p>
    <p class="help-p"><b>RJW 开关</b>在画布工具栏右端（也可在画布属性里）。打开后会按 Nice Health Tab - RJW Genitalia 的 Defs 自动补上该体型的 12 个 RJW 标记；关闭则从补丁里移除这些标记。成人向内容，需要 RimJobWorld。</p>
    <p class="help-p"><b>X 光视图</b>：点工具栏的「器官」或「骨骼」后，皮肤会变成深色剪影，只留白色的器官 / 骨骼浮在上面；再点一次回到正常外观。</p>
    <p class="help-p"><b>命中框</b>：点工具栏「命中框」把判定框显示出来，选中的部位会出现四个角柄和中间圆点 —— 拖角柄改大小（跟着部位一起旋转），拖圆点整块移动；属性面板里也能精确输 宽 / 高，或一键复位（判定框固定居中，没有偏移字段）。导出的补丁只写 <code>hitboxScale</code>（宽高比例），偏移量写不进 Defs。</p>
    <p class="help-p"><b>加新部位 / 换贴图</b>：左栏「部位结构」每个分类右边有 <b>＋</b>，点它先给部位起名字，就会建在<b>点的那一栏</b>里；选中这个部位后，在「素材」页点任意贴图，或把贴图直接拖到部位结构里的那一行。素材页的「<b>导入素材</b>」可以把自己电脑里的 PNG / WebP 加进素材库（存在 <b>我的素材</b> 分类里，卡片右上角的 <b>×</b> 连点两次即可删除）。</p>
    <p class="help-p"><b>从种族模组收素材</b>：导入种族时会把这个模组里的贴图一起收进来，按模组名单独归一组（素材页里的「模组 · 名字」，也在 <b>种族素材</b> 分类里）；素材页的分组都可以点标题折叠，默认全部收起。模组里的<b>发型</b>不进素材栏，单独出现在「<b>发型 HAIR</b>」里：点一个就换上去，同一时刻只留一个，自动贴在头部并锁住，不能拖动。</p>
    <p class="help-p"><b>固定小窗</b>：右侧一列小窗（肛门 / RJW 下体 / 手掌·手指 / 脚掌·脚趾）默认停靠在画布右侧并已锁定，缩放画布时它们不会跟着变大；手掌窗里是左右两只手，脚掌窗里是左右两只脚，每个指头、脚趾、掌底都是独立部件。点标题栏右侧的锁解锁后，拖标题栏即可移动、拖右下角可等比缩放；窗内部位可以单独拖动，右侧属性面板还能精确调位置 / 宽度 / 旋转。肛门窗和下体窗的底图和摆位来自 RJW 模组自己的面板数据；下体窗按画布「性别」显示：男＝性腺+生殖器、女＝子宫+卵巢+阴道、无性别＝只显示底图。</p>
    <h4 class="help-h">新功能</h4>
    <p class="help-p"><b>语言切换</b>：顶栏右侧的圆点按钮，橙色 = 中文，蓝色 = English；选择会保存，界面 / 弹窗 / 提示一起切换。</p>
    <p class="help-p"><b>异种</b>：「导入异种」会自动扫描 XenotypeDef / HAR body Hediff / 隐藏外观 Hediff，并生成基因外观；有异种的画布右下角会出现彩色圆点，点圆点切换预览，点「基础」恢复。</p>
    <p class="help-p"><b>发色</b>：耳朵 / 尾巴这类 bodyAddon colorChannel=hair 的部位，在部位属性打开「发色」就会跟随小人当前发色；关闭色彩时自动不染色。</p>
    <p class="help-p"><b>画布检查</b>：画布右上角徽章，红色 = 有缺失或错误；点开可以看贴图 / 灰度 / 异种 / 注入，并直接修复。</p>`;
  const enFirst = `
    <h4 class="help-h">Canvas &amp; parts</h4>
    <p class="help-p"><b>Each body type is a separate canvas</b>; switch in the left list. All 5 body types from mod 1.6 (Male / Female / Fat / Hulk / Kid) are loaded, with 135 base parts${RJW_PARTS.length ? `; with RJW each body type adds ${(RJW_BY_DOLL.get('Male') || []).length} genital / chest markers` : ''}.</p>
    <p class="help-p"><b>Drag</b> a part to move it; corner handles scale, the top dot rotates. You can detach a selected part to the bottom-left Detached tray and put it back or elsewhere.</p>
    <p class="help-p"><b>Custom parts</b> (wings, tails, tentacles) come from Assets: click a texture to add it; they behave like native parts for injured / missing / prosthetic.</p>
    <p class="help-p"><b>Import race</b> picks the race mod root and creates a canvas named after the race; the base is <b>Standard female</b> and parts missing from that body are created under Custom using the race BodyDef names.</p>
    <p class="help-p"><b>RJW switch</b> is at the right end of the canvas toolbar (also in canvas properties). It adds the 12 RJW markers for that body from Nice Health Tab - RJW Genitalia Defs; turning it off removes them. Adult content; requires RimJobWorld.</p>
    <p class="help-p"><b>X-ray view</b>: click Organs or Bones in the toolbar to turn the skin into a dark silhouette with white organs / bones on top; click again to return.</p>
    <p class="help-p"><b>Hitbox</b>: click Hitbox in the toolbar to show it; the selected part gets four corner handles and a center dot — drag handles to resize (rotates with the part), drag the dot to move the whole box. The property panel also takes exact width / height or resets it (fixed centered, no offset field). Exported patches only write <code>hitboxScale</code>; offsets can't be written to Defs.</p>
    <p class="help-p"><b>Add part / change texture</b>: in Part tree, click <b>＋</b> on a column, name the part, and it is created in <b>that column</b>; then click a texture in Assets or drag it onto the part row. Assets → <b>Import assets</b> adds your own PNG / WebP into <b>My assets</b>; click the card's <b>×</b> twice to delete.</p>
    <p class="help-p"><b>Race assets</b>: importing a race also collects the mod's textures into a group named after the mod (Mod · name, also under Race assets); groups collapse by title and start collapsed. Mod <b>hair</b> is separate under <b>Hair HAIR</b>: click one to apply; only one at a time, attached to the head and locked.</p>
    <p class="help-p"><b>Fixed windows</b>: the right-side windows (anus / RJW lower body / palm·fingers / sole·toes) are docked and locked by default and don't scale with the canvas; the palm window has both hands and the sole window both feet, each finger / toe / palm a separate part. Unlock via the title-bar lock to move and resize; parts can be dragged inside and adjusted precisely in the property panel. The anus / lower-body windows use RJW's own panel data; the lower-body window follows the canvas Sex: male = gonads + genitals, female = uterus + ovaries + vagina, none = background only.</p>
    <h4 class="help-h">New features</h4>
    <p class="help-p"><b>Language</b>: the dot button at the top-right; orange = 中文, blue = English. The choice is saved and the UI / dialogs / tips switch together.</p>
    <p class="help-p"><b>Xenotypes</b>: Import xenotypes scans XenotypeDef / HAR body Hediff / hidden appearance Hediff and generates gene looks; canvases with xenotypes show colored dots at the bottom-right — click to preview, click Base to reset.</p>
    <p class="help-p"><b>Hair color</b>: for bodyAddon colorChannel=hair parts such as ears and tails, turn on Hair color in the part properties to follow the pawn's hair color; it is skipped when color is off.</p>
    <p class="help-p"><b>Canvas check</b>: the top-right badge turns red for missing files or errors; click to see textures / grayscale / xenotypes / injection and fix them.</p>`;
  const gitZh = `
    <h4 class="help-h">GIT 书签 · 最近改动</h4>
    <p class="help-p"><b>画布现在一张一个文件</b>（<code>Editor/canvases/&lt;种族&gt;/…json</code>），自动保存只写当前这张。</p>
    <p class="help-p"><b>GIT 书签</b>在「体型画布」面板右边缘：点开能看到仓库里最近 3 个画布版本；<b>点卡片 = 只读预览</b>（不能编辑），要改就点卡片上的「应用」；应用后可「撤销」。</p>
    <p class="help-p"><b>最近改动</b>固定在画布列表下方：保留最近 5 张被替换 / 删除的画布，点一下只读预览，右键只有「还原」。</p>
    <p class="help-p"><b>推送弹窗</b>会先列出本地改动：默认全选，但 <code>Editor/history</code>、<code>nht-project.js</code>、<code>*.bak</code>、编译产物等个人数据默认锁定（红色），避免覆盖别人的仓库。</p>`;
  const gitEn = `
    <h4 class="help-h">GIT bookmark · Recent changes</h4>
    <p class="help-p"><b>Each canvas is now one file</b> (<code>Editor/canvases/&lt;race&gt;/…json</code>); autosave writes only the current one.</p>
    <p class="help-p">The <b>GIT bookmark</b> on the right edge of Body canvases shows the last 3 canvas versions in the repo; <b>clicking a card = read-only preview</b> (not editable); click Apply on the card to edit. Apply can be Undone.</p>
    <p class="help-p"><b>Recent changes</b> below the canvas list keeps the last 5 replaced / deleted canvases; click for read-only preview, right-click offers only Restore.</p>
    <p class="help-p">The <b>push dialog</b> lists local changes first: all checked by default, but <code>Editor/history</code>, <code>nht-project.js</code>, <code>*.bak</code> and build outputs are locked (red) by default to avoid overwriting others.</p>`;
  const body = en
    ? `<div class="help-grid"><div>${enFirst}</div><div><h4 class="help-h">Shortcuts</h4><div class="help-list">${shortcuts}</div></div><div>${gitEn}</div></div>
       <div class="credit"><img src="${imgURL('About/ModIcon')}" alt=""><div><b>Nice Health Tab · Andromeda</b>All hand-drawn anatomy art, icons and outlines come from that mod's Textures/HediffTab (Workshop 3328729902). ${RJW_PARTS.length ? `RJW part textures come from ${esc(RJW_MOD.name)} (${esc(RJW_MOD.author)}) Textures/HediffTab/RJW*.` : ''}The page only handles layout and interaction and does not redraw any art.</div></div>`
    : `<div class="help-grid"><div>${zhFirst}</div><div><h4 class="help-h">快捷键</h4><div class="help-list">${shortcuts}</div></div><div>${gitZh}</div></div>
       <div class="credit"><img src="${imgURL('About/ModIcon')}" alt=""><div><b>Nice Health Tab · Andromeda</b>本页全部手绘解剖贴图、图标与轮廓均来自该模组 Textures/HediffTab（创意工坊 3328729902）。${RJW_PARTS.length ? `RJW 部位贴图来自 ${esc(RJW_MOD.name)}（${esc(RJW_MOD.author)}）的 Textures/HediffTab/RJW*。` : ''}页面只做排版与交互，不重新绘制任何美术资源。</div></div>`;
  openModal(`<div class="modal__head"><span class="idx">HELP</span><h3>${en ? 'Help · shortcuts' : '操作说明 · 快捷键'}</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">${body}</div>
    <div class="modal__foot"><button class="btn btn--primary" data-act="close-modal">${en ? 'Got it' : '知道了'}</button></div>`);
}

function modalConfirm(title, msg, act, data) {
  openModal(`
    <div class="modal__head"><span class="idx">!</span><h3>${esc(title)}</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body"><p class="help-p" style="margin:0">${esc(msg)}</p></div>
    <div class="modal__foot">
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn--danger" data-act="${act}" ${data ? `data-id="${esc(data)}"` : ''}>确认</button>
    </div>`);
}

/* ==========================================================================
   toast
   ========================================================================== */
function toast(msg, danger) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (danger ? ' is-danger' : '');
  el.innerHTML = `${icon(danger ? 'warn' : 'check')}<span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2400);
  setTimeout(() => el.remove(), 2800);
}

/* ==========================================================================
   global events
   ========================================================================== */

/* 只读预览时，右栏输入框改动一律回滚并提示（不再靠 CSS 封死交互） */
function blockPreviewEdit(el) {
  if (!S.preview) return false;
  if (!el || !el.closest || !el.closest('.col--r')) return false;
  toast('只读预览：要编辑请先点「应用」或「还原」', true);
  try { renderInspector(); } catch (e) { }
  return true;
}
['input', 'change'].forEach(evt => {
  document.addEventListener(evt, e => {
    if (!S.preview) return;
    const t = e.target;
    if (!t || !t.closest) return;
    if (blockPreviewEdit(t)) { try { e.stopPropagation(); } catch (err) { } }
  }, true);
});
document.addEventListener('click', e => {
  if (!S.preview) return;
  const t = e.target;
  if (t && t.closest && t.closest('.col--l .cv')) { /* 切画布会自己退出预览 */ }
}, true);

const PREVIEW_BLOCKED_ACTS = new Set([
  'add-part', 'del-part', 'duplicate-part', 'part-img', 'part-img-clear', 'apply-bodytype',
  'flip-h', 'flip-v', 'auto-align', 'canvas-new', 'new-canvas', 'del-canvas-ok', 'import-race',
  'hair-redraw-toggle', 'hairfit-toggle', 'fit-bounds', 'scale-reset', 'box-fit', 'box-reset',
  'dock-detach', 'dock-attach', 'edit-part-name', 'part-lock', 'part-vis', 'layer-up', 'layer-down',
  // 导出 / 注入 / 复制 / 保存 也一并禁用：预览的是仓库版本，不能当成项目内容导出
  'export-patch', 'export-png', 'export-json', 'copy-xml', 'mod-export', 'mod-export-go',
  'patch-to-mod', 'multi-export', 'set-save', 'import-json', 'import-assets', 'import-hair',
  'hair-import', 'hair-clear', 'hair-reset', 'asset-del', 'del-canvas', 'delete-part', 'over-hair'
]);
/* HAR 面板里“开关类”动作由 syncHairSwitches 就地同步（不重建 DOM，避免闪烁）；
   其余动作改的是文字 / 图标 / 数值，执行完统一刷新一次面板 */
const HAIR_SYNCED_ACTS = new Set([
  'hairfit-toggle', 'hairfit-useoff', 'hair-tint-toggle', 'hair-back', 'hair-xray', 'hair-follow',
  'hair-lock-fit', 'hair-prev-toggle',
]);
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (S.preview && PREVIEW_BLOCKED_ACTS.has(act)) {
    e.stopPropagation(); e.preventDefault();
    const isExport = /export|patch-to-mod|mod-export|multi-export|copy-xml/.test(act);
    toast(isExport
      ? '只读预览：不能导出 / 注入，请先点「应用」把画布写入项目'
      : '只读预览：要编辑请先点「应用」或「还原」', true);
    return;
  }

  switch (act) {
    case 'canvas': switchCanvas(el.dataset.id); break;
    case 'bar-more': {
      const m = document.getElementById('barMore');
      if (!m) break;
      m.hidden = !m.hidden;
      el.classList.toggle('is-on', !m.hidden);
      break;
    }
    case 'bar-toggle': {
      const bar = document.getElementById('stageBar');
      if (!bar) break;
      const on = !bar.classList.contains('is-collapsed');
      bar.classList.toggle('is-collapsed', on);
      S.flags.barCollapsed = on;
      persist();
      break;
    }
    case 'reset-scale': {
      const p = selPart();
      if (!p) { toast('先选中一个部位', true); break; }
      const sx0 = p.sx, sy0 = p.sy;
      if (p.hbox && p.hbox.w > 0 && sx0 > 0 && sy0 > 0) {
        p.hbox = {
          dx: round(p.hbox.dx / sx0, 1), dy: round(p.hbox.dy / sy0, 1),
          w: Math.max(4, round(p.hbox.w / sx0, 1)), h: Math.max(4, round(p.hbox.h / sy0, 1)),
        };
        // t30：sx0 最小 0.02 ⇒ 最多 ÷0.02 = ×50，夹一下别让框爆掉
        clampHitboxToVis(p);
        syncHbFromBox(p);
      }
      p.sx = 1; p.sy = 1;
      paintPart(p); renderOverlay(); renderInspector(); syncNums(p);
      persist(); pushHistory();
      toast(`缩放已重置为 100%（原 ${round(sx0, 2)} × ${round(sy0, 2)}）`);
      break;
    }
    case 'scroll-top': scrollPaneTop(); break;
    case 'settings': modalSettings(); break;
    case 'g-prefix': gitApplyPrefix(el.dataset.prefix || ''); refreshSettingsInPlace(); break;
    case 'g-pick': gitPickDir(); break;
    case 'set-tab': setSettingsTab(el.dataset.tab); refreshSettingsInPlace(); break;
    case 'git-change-remote': gitChangeRemote(); break;
    case 'git-test': gitRefresh().then(() => {
      if (gitState.status) {
        gitLog('测试连接成功', '分支 ' + gitState.status.branch + ' · 待推送 ' + (gitState.status.ahead || 0) + ' · 待拉取 ' + (gitState.status.behind || 0));
        toast('Git 连接正常');
      } else {
        gitLog('测试连接失败', gitState.stateText || '无法连接仓库');
        toast('Git 连接失败，看下方同步日志', true);
      }
      refreshSettingsInPlace();
    }); break;
    case 'git-open-folder': gitRefresh().then(() => { refreshSettingsInPlace(); toast(gitState.status ? ('分支 ' + gitState.status.branch + ' · 待推送 ' + (gitState.status.ahead || 0) + ' · 待拉取 ' + (gitState.status.behind || 0)) : '还没有连接成功', !gitState.status); }); break;

    case 'git-use-current': {
      const apply = (cur) => {
        ensureGitSettings().branch = cur;
        saveSettings();
        const inp = document.getElementById('gitBranchInput');
        if (inp) inp.value = cur;
        try { renderPatch(); } catch (e) { }
        try { if (document.querySelector('.modal')) refreshSettingsInPlace(); } catch (e) { }
        toast('分支已改为当前分支：' + cur);
      };
      const cur = (gitState.status && gitState.status.branch) || (gitState.remote && gitState.remote.branch) || '';
      if (cur) { apply(cur); break; }
      fetch('/__gitremote?dir=' + encodeURIComponent(ensureGitSettings().dir || ''), { cache: 'no-store' })
        .then(r => r.json())
        .then(j => {
          const b = (j && j.branch) || '';
          if (b) apply(b); else toast('读不到当前分支（仓库没连上？）', true);
        })
        .catch(() => toast('读不到当前分支', true));
      break;
    }
    case 'git-sync-now': e.stopPropagation(); toast('正在连接远端检查…'); gitRefresh(true).then(() => { toast(gitState.status ? '已同步仓库状态' : '同步失败，看下方日志', !gitState.status); }); break;

    case 'git-prefix': {
      const sel = el;
      gitApplyPrefix(sel.value || '');
      renderGitUI();
      gitRefresh();
      break;
    }
    case 'git-prefix-menu': {
      const m = document.getElementById('gitPrefixMenu');
      if (!m) break;
      if (!m.hidden) { m.hidden = true; break; }
      // 面板里有 overflow:hidden，会把绝对定位的菜单裁掉 → 挂到 body 上做成浮层
      if (m.parentElement !== document.body) document.body.appendChild(m);
      const btn = document.querySelector('#gitPrefixSel .gitsel__btn');
      const r = btn ? btn.getBoundingClientRect() : { left: 8, bottom: 8 };
      m.style.position = 'fixed';
      m.style.left = Math.max(8, Math.min(r.left, innerWidth - 210)) + 'px';
      m.style.top = Math.min(r.bottom + 5, innerHeight - 220) + 'px';
      m.style.zIndex = '220000';
      m.style.minWidth = '190px';
      m.hidden = false;
      break;
    }
    case 'git-prefix-set': {
      const m = document.getElementById('gitPrefixMenu');
      if (m) m.hidden = true;
      gitApplyPrefix(el.dataset.prefix || '');
      // 重画右栏，让“分支开头”按钮文字和分支输入框立刻跟着变
      try { renderPatch(); } catch (err) { }
      renderGitUI();
      gitRefresh();
      break;
    }
    case 'git-gear': {
      try { e.stopPropagation(); } catch (err) { }
      setSettingsTab('git');
      modalSettings();
      if (LOCAL_HTTP) gitRefresh().then(() => { refreshSettingsInPlace(); renderRepoGear(); });
      break;
    }
    case 'gmk-apply-preview': {
      const meta = (S.preview && S.preview.meta) || {};
      if (meta.kind === 'git' && meta.rev) { const r = meta.rev, l = meta.rel; clearPreview(); gmkApply(r, l); }
      break;
    }
    case 'trash-preview': trashPreview(el.dataset.trid); break;
    case 'gmk-exit': gmkExitView(); break;
    case 'gmk-toggle': gmkToggle(); break;
    case 'gmk-fold': {
      GMK.openRev = (GMK.openRev === el.dataset.rev) ? '' : el.dataset.rev;
      gmkRender();
      break;
    }
    case 'gmk-apply': {
      try { e.stopPropagation(); } catch (err) { }
      gmkApply(el.dataset.rev, el.dataset.rel);
      break;
    }
    case 'gmk-card': gmkOpenCanvas(el.dataset.rev, el.dataset.rel); break;
    case 'git-push': gitOpenPushDialog(); break;
    case 'push-check': {
      const node = pushFindNode(PUSH_STATE.tree, el.dataset.path);
      if (node && !node.locked) {
        const val = !(node.checked && !node.partial);
        pushSetAll(node, val);
        pushRecompute(PUSH_STATE.tree);
        renderPushDialog();
      }
      break;
    }
    case 'push-lock': {
      const node = pushFindNode(PUSH_STATE.tree, el.dataset.path);
      if (node) {
        node.locked = !node.locked;
        if (node.locked) {
          PUSH_STATE.locked[node.path] = true;
          if (node.type === 'dir') node.open = false;
        } else {
          delete PUSH_STATE.locked[node.path];
        }
        pushRecompute(PUSH_STATE.tree);
        renderPushDialog();
      }
      break;
    }
    case 'push-fold': {
      const node = pushFindNode(PUSH_STATE.tree, el.dataset.path);
      if (node) { node.open = !node.open; renderPushDialog(); }
      break;
    }
    case 'push-all': pushSetAll(PUSH_STATE.tree, true); pushRecompute(PUSH_STATE.tree); renderPushDialog(); break;
    case 'push-none': pushSetAll(PUSH_STATE.tree, false); pushRecompute(PUSH_STATE.tree); renderPushDialog(); break;
    case 'push-cancel': closeModal(); break;
    case 'push-go': gitPushNow(); break;

    case 'git-pull': gitDoPull(); break;
    case 'mod-export': exportModFiles(); break;
    case 'mod-export-do': {
      const inp = document.getElementById('modExportVersion');
      const v = (inp && inp.value || '').trim() || aboutVersion();
      MOD_EXPORT_VERSION = v;
      if (v) { try { aboutSetVersion(v); } catch (e) { } }
      closeModal();
      exportModFilesStage2();
      break;
    }

    case 'mod-export-go': doExportModFiles(); break;

    case 'set-zipstamp': saveSettings(); S.settings.zipStamp = S.settings.zipStamp === false; persist(); refreshSettingsInPlace(); break;
    case 'set-git-sync': { const git2 = ensureGitSettings(); git2.syncMod = git2.syncMod === false; persist(); refreshSettingsInPlace(); break; }
    case 'set-tip-canvas': saveSettings(); S.settings.tipCanvas = S.settings.tipCanvas === false; persist(); refreshSettingsInPlace(); break;
    case 'set-tip-tree': saveSettings(); S.settings.tipTree = S.settings.tipTree === false; persist(); refreshSettingsInPlace(); break;
    case 'set-checkpath': {
      saveSettings();
      S.settings.checkPath = !S.settings.checkPath;
      modalSettings();
      break;
    }
    case 'set-pick': pickSaveDir(el.dataset.key); break;
    case 'set-save': {
      saveSettings();
      const tab = S.ui.settingsTab || 'paths';
      // 每个页签只校验自己的配置：目前只有 Git 页有校验，其它页不加
      if (tab === 'git') {
        if (gitBranchBad(ensureGitSettings().branch)) {
          toast('分支不能填 main，请改成自己的分支（如 feature-你的名字）', true);
          refreshSettingsInPlace();
          break;
        }
        if (!String(ensureGitSettings().branch || '').trim()) {
          toast('分支不能为空：选一个命名开头，或自己填一个分支名', true);
          refreshSettingsInPlace();
          break;
        }
      }
      persist(); pushHistory();
      closeModal();
      toast(tab === 'git' ? 'Git 设置已保存' : '设置已保存');
      break;
    }

    case 'multi-export': modalMultiExport(); break;
    case 'mx-group-toggle': {
      const gid = el.dataset.gid;
      S.ui.mxOpen = S.ui.mxOpen || {};
      const grp = el.closest('.mxgrp');
      const attrOpen = grp ? !grp.classList.contains('is-shut') : false;
      const next = attrOpen;                  // true = 这次要折叠
      S.ui.mxOpen[gid] = next;
      if (grp) grp.classList.toggle('is-shut', next);
      const chev = grp ? grp.querySelector('.mxgrp__chev') : null;
      if (chev) chev.textContent = next ? '▸' : '▾';
      break;
    }
    case 'mx-all': {
      document.querySelectorAll('input[data-mx-cv]').forEach(cb => { cb.checked = true; });
      if (mxSync) mxSync(); break;
    }
    case 'mx-none': {
      document.querySelectorAll('input[data-mx-cv]').forEach(cb => { cb.checked = false; });
      if (mxSync) mxSync(); break;
    }
    case 'mx-dirty': {
      document.querySelectorAll('input[data-mx-cv]').forEach(cb => {
        const c = S.canvases.find(x => x.id === cb.dataset.mxCv);
        cb.checked = !!(c && canvasDirty(c));
      });
      if (mxSync) mxSync(); break;
    }
    case 'mx-go': {
      const ids = [...document.querySelectorAll('input[data-mx-cv]:checked')].map(cb => cb.dataset.mxCv);
      if (!ids.length) { toast('先勾选要注入的画布', true); break; }
      if (!LOCAL_HTTP) { toast('多选注入需要本地服务（用 启动编辑器.bat 打开）', true); break; }
      multiExportRun(ids);
      break;
    }
    case 'panel-toggle': {
      const id = el.dataset.panel;
      S.ui.panels = S.ui.panels || {};
      S.ui.panels[id] = !S.ui.panels[id];
      applyPanelCollapse();
      persist();
      break;
    }

    case 'guides': modalGuides(); seenSet('guides', hashStr(JSON.stringify(window.NHT_GUIDES || []))); refreshAttention(); break;
    case 'guide-toggle': {
      const gi = el.dataset.gi;
      const box2 = document.querySelector(`[data-gb="${gi}"]`);
      if (box2) {
        const open2 = box2.hidden;
        box2.hidden = !open2;
        const chev = el.querySelector('.gdi__chev');
        if (chev) chev.textContent = open2 ? '▾' : '▸';
      }
      break;
    }

    case 'refdock-toggle': {
      const shutNow = S.ui.refDockShut !== false;   // 与 renderRefDock 的默认值保持一致
      S.ui.refDockShut = !shutNow;
      renderRefDock();
      break;
    }
    case 'cv-group-toggle': {
      const gid = el.dataset.gid;
      S.ui.cvCollapsed = S.ui.cvCollapsed || {};
      S.ui.cvCollapsed[gid] = !S.ui.cvCollapsed[gid];
      renderCanvasList(); persist();
      break;
    }
    case 'trash-toggle': S.ui.trashOpen = !(S.ui.trashOpen !== false); renderCanvasList(); break;
    case 'trash-restore': { try { e.stopPropagation(); } catch (err) { } trashRestore(el.dataset.trid); break; }
    case 'trash-del': {
      try { e.stopPropagation(); } catch (err) { }
      { const id = el.dataset.trid; const i = S.trash.findIndex(t => t.id === id);
        if (i >= 0) { S.trash.splice(i, 1); if (S.viewOnly === id) S.viewOnly = null; }
        renderCanvasList(); persist(); pushHistory(); toast('已从最近改动中移除'); }
      break;
    }
    case 'cv-group-add': cvGroupAdd(); break;
    case 'cv-group-del': cvGroupDel(el.dataset.gid); break;
    case 'cv-group-del-no': {
      const gid = cvGroupPending;
      S.canvases.forEach(c => { if (c.group === gid) c.group = null; });
      S.ui.cvGroups = (S.ui.cvGroups || []).filter(g => g.id !== gid);
      cvGroupPending = null; closeModal(); renderCanvasList(); persist(); pushHistory();
      toast('已删除分组，里面的画布变为未分组');
      break;
    }
    case 'cv-group-del-yes': {
      const gid = cvGroupPending;
      const g = (S.ui.cvGroups || []).find(x => x.id === gid);
      const n = S.canvases.filter(c => c.group === gid).length;
      openModal(`<div style="width:min(410px,86vw)">
        <div class="modal__head"><span class="idx">CONFIRM</span><h3>再次确认</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
        <div class="modal__body"><p class="mini-note" style="margin:0">这会<b>永久删除</b>分组「${esc(g ? g.name : '')}」里的 <b>${n}</b> 个画布及其全部部位。确定吗？</p></div>
        <div class="modal__foot">
          <button class="btn" data-act="close-modal">取消</button>
          <button class="btn btn--danger" data-act="cv-group-del-final">确认删除</button>
        </div></div>`);
      break;
    }
    case 'cv-group-del-final': {
      const gid = cvGroupPending;
      const before = S.canvases.length;
      S.canvases = S.canvases.filter(c => c.group !== gid);
      S.ui.cvGroups = (S.ui.cvGroups || []).filter(g => g.id !== gid);
      if (!S.canvases.length) S.canvases.push(canvasFromBodytype(D.bodytypes[0]));
      if (!S.canvases.some(c => c.id === S.active)) S.active = S.canvases[0].id;
      cvGroupPending = null; closeModal(); renderAll(); fitView(); pushHistory();
      toast(`已删除分组及其中 ${before - S.canvases.length} 个画布`);
      break;
    }
    case 'har-warn-fix': {
      const c = activeCanvas(); if (!c) break;
      S.tab = 'hair'; S.sel = null;
      renderAll();
      toast('已打开「发型」分栏：检查「发型重绘 / 导出发型坐标」和缩放、偏移');
      break;
    }

    case 'har-warn-close': {
      const c = activeCanvas(); if (!c) break;
      c.harBubbleOpen = false;
      updateHarBadge(c);
      break;
    }
    case 'har-badge': toggleHarBubble(); break;
    case 'har-badge-open': {
      const c = activeCanvas(); if (!c) break;
      c.harBubbleOpen = false; updateHarBadge(c);
      c.hairFitEnabled = true;
      if (!c.hairFit) c.hairFit = { scale: 0.78, offsetX: 0, offsetY: -0.21 };
      c.hairPreviewShow = true;
      S.tab = 'global'; S.sel = null;
      renderAll();
      setTimeout(() => {
        const sec = [...document.querySelectorAll('#paneInspect .sec')].find(x => /发型 HAIR/.test(x.textContent));
        if (sec) {
          sec.scrollIntoView({ block: 'center' });
          const fold = sec.querySelector('details'); if (fold) fold.open = true;
          sec.animate && sec.animate([{ background: 'rgba(227,181,88,.22)' }, { background: 'transparent' }], { duration: 1100 });
        }
      }, 120);
      pushHistory();
      toast('已开启 HAR 头发自绘，接着调缩放 / 偏移即可');
      break;
    }
    case 'hair-mode': openHairModeMenu(); break;
    case 'hair-mode-preview': closeModal(); setHairMode(true, 'preview'); break;
    case 'hair-mode-ref': closeModal(); setHairMode(true, 'ref'); break;
    case 'tex-fill': { const ti = $('#texFillInput'); if (ti) ti.click(); break; }
    case 'tip-open': openTipList(); break;
    case 'history': openHistory(); break;
    case 'history-load': loadHistoryVersion(el.dataset.name); break;
    case 'visbox-to-hit': {
      const p = selPart();
      if (!p) { toast('先选中一个部位', true); break; }
      const vb = visBox(p);
      if (!vb || !(vb.w > 1) || !(vb.h > 1)) { toast('算不出可见框，先点「贴合可见像素」', true); break; }
      p.hbox = { dx: round(vb.dx, 1), dy: round(vb.dy, 1), w: round(vb.w, 1), h: round(vb.h, 1) };
      delete p.hbBad;   // t30：修好后清掉异常标记
      syncHbFromBox(p);
      renderStage(); renderOverlay(); renderInspector(); persist(); pushHistory();
      toast(`命中框已设为可见区 ${Math.round(vb.w)}×${Math.round(vb.h)}（导出判定框同步更新）`);
      break;
    }
    case 'visbox-recalc': {
      const p = selPart();
      if (!p) { toast('先选中一个部位', true); break; }
      recalcVisBox(p);
      break;
    }
    case 'global-props': {
      S.sel = null; S.winSel = null;
      renderStage(); renderInspector(); renderTree();
      toast('已切到全局属性（画布 / 项目）');
      break;
    }
    case 'auto-center': {
      const c = activeCanvas(); if (!c) break;
      c.noExportCenter = !c.noExportCenter;
      renderInspector(); persist(); pushHistory();
      toast(c.noExportCenter ? '已关闭自动居中：导出坐标 = 画布坐标 × k + 偏移' : '已开启自动居中：导出时先减内容中心');
      break;
    }
    case 'no-center': {
      const c = activeCanvas(); if (!c) break;
      c.noExportCenter = !c.noExportCenter;
      renderInspector(); persist(); pushHistory();
      toast(c.noExportCenter ? '已关闭自动居中：导出坐标 = 画布坐标 + 偏移' : '已恢复自动居中');
      break;
    }
    case 'goto-offset': {
      const id = el.dataset.id || (activeCanvas() && activeCanvas().id);
      const c2 = S.canvases.find(x => x.id === id);
      if (c2) { S.active = c2.id; }
      S.sel = null; S.winSel = null; S.tab = 'global';
      renderTabs(); renderCanvasList(); renderInspector(); renderStage();
      const input = document.querySelector('input[data-f="c.offx"]');
      if (input) {
        const field = input.closest('.field');
        try { field.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
        field.classList.add('is-flash');
        input.focus(); input.select();
        setTimeout(() => field.classList.remove('is-flash'), 1400);
      }
      toast('已跳到导出偏移（X / Y）');
      break;
    }
    case 'notif-toggle': {
      const pop = notifPopup();
      if (!pop) break;
      if (pop.hidden) showNotif(); else collapseNotif();
      break;
    }
    case 'notif-ack': ackNotif(); break;
    case 'notes-toggle': {
      S.flags.notes = S.flags.notes === false;
      renderNotes(activeCanvas());
      const sw = document.getElementById('notesSwitch');
      if (sw) {
        sw.classList.toggle('is-on', S.flags.notes !== false);
        sw.setAttribute('aria-checked', S.flags.notes === false ? 'false' : 'true');
      }
      persist();
      toast(S.flags.notes === false ? '备注贴纸已隐藏' : '备注贴纸已显示');
      break;
    }
    case 'guides-toggle': {
      S.flags.guides = S.flags.guides === false;
      renderGuides(activeCanvas());
      const sw = document.getElementById('guidesSwitch');
      if (sw) {
        sw.classList.toggle('is-on', S.flags.guides !== false);
        sw.setAttribute('aria-checked', S.flags.guides === false ? 'false' : 'true');
      }
      persist();
      toast(S.flags.guides === false ? '参考线已隐藏（标尺仍在）' : '参考线已显示');
      break;
    }
    case 'jump-section': {
      const want = el.dataset.sec || '';
      const bm = document.getElementById('barMore');
      if (bm) bm.hidden = true;
      const mb = document.getElementById('barMoreBtn'); if (mb) mb.classList.remove('is-on');
      S.tab = 'global'; S.sel = null; S.winSel = null;
      renderTabs(); renderInspector(); renderCanvasList();
      setTimeout(() => {
        const pane = document.getElementById('paneInspect') || document;
        const secs = [...pane.querySelectorAll('.sec')];
        const hit = secs.find(sec => {
          const h = sec.querySelector('.sec__h');
          return h && h.textContent.trim().indexOf(want) === 0;
        });
        if (!hit) {
          const folds = [...pane.querySelectorAll('details.gfold')];
          const fold = folds.find(d => {
            const h = d.querySelector('summary b');
            return h && h.textContent.trim().indexOf(want) === 0;
          });
          if (!fold) { toast((LANG === 'en' ? 'Section not found: ' : '没有找到该分区：') + want, true); return; }
          fold.open = true;
          try { fold.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
          fold.classList.add('is-flash');
          setTimeout(() => fold.classList.remove('is-flash'), 1400);
          return;
        }
        try { hit.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
        hit.classList.add('is-flash');
        setTimeout(() => hit.classList.remove('is-flash'), 1400);
      }, 40);
      break;
    }
    case 'gear-toggle': {
      const p = document.getElementById('gearPanel');
      if (!p) break;
      p.hidden = !p.hidden;
      el.classList.toggle('is-on', !p.hidden);
      break;
    }
    case 'hair-follow': {
      const c = activeCanvas(); if (!c) break;
      c.hairFollowOffset = !c.hairFollowOffset;      // 只切自己，不再顺手打开「发型重绘」
      renderStage(); renderInspector(); syncHairSwitches(); persist(); pushHistory();
      toast(c.hairFollowOffset ? '已开启：发型跟随导出偏移' : '已关闭：发型跟随导出偏移');
      break;
    }
    case 'canvas-lock': {
      const c = activeCanvas(); if (!c) break;
      c.locked = !c.locked;
      renderStage(); persist();
      toast(c.locked ? '画布已锁定：删除画布/部位已被禁用' : '画布已解锁');
      break;
    }
    case 'del-canvas': {
      const c = S.canvases.find(x => x.id === el.dataset.id);
      if (c && c.locked) { toast('画布已锁定，先解锁再删除', true); break; }
      if (c) modalConfirm('删除画布', `确认删除「${c.title}」？该画布上的 ${c.parts.length} 个部位会一起移除（可撤销）。`, 'del-canvas-ok', c.id);
      e.stopPropagation();
      break;
    }
    case 'del-canvas-ok': {
      const id = el.dataset.id;
      { const cc = S.canvases.find(x => x.id === id); if (cc && cc.locked) { closeModal(); toast('画布已锁定，已取消删除', true); break; } }
      { const cc = S.canvases.find(x => x.id === id); if (cc) pushTrash(cc, '删除'); }
      S.canvases = S.canvases.filter(c => c.id !== id);
      if (!S.canvases.length) S.canvases.push(canvasFromBodytype(D.bodytypes[0]));
      if (!S.canvases.some(c => c.id === S.active)) S.active = S.canvases[0].id;
      S.sel = null; closeModal(); renderAll(); fitView(); pushHistory(); toast('画布已删除');
      break;
    }
    case 'new-canvas': modalNewCanvas(); break;
    case 'import-race': {
      // t52：两种入口 —— 自动识别（默认扫整个模组文件夹）或手动指定 BodyDef 文件夹
      pendingRace = null;
      modalImportRace();
      break;
    }
    case 'race-pick-auto': {
      closeModal();
      pendingBodyFiles = [];
      dirPurpose = 'race';
      $('#dirInput').click();
      break;
    }
    case 'race-pick-bodydir': {
      closeModal();
      // 先选 BodyDef 文件夹，再选模组根文件夹（顺序写进弹窗，避免用户搞反）
      const bdEl = $('#bodyDirInput');
      if (!bdEl) { toast('当前页面还没更新（缺 BodyDef 选择器），请重新构建编辑器页面', true); break; }
      bdEl.click();
      break;
    }
    case 'race-bodydef-go': {
      // t55-B6：把用户指定的身体定义带进后续 parseRaceMod（空 = 自动）
      const sel = document.getElementById('raceBodydefPick');
      pendingBodyDef = sel ? String(sel.value || '') : '';
      closeModal();
      dirPurpose = 'race';
      toast(pendingBodyDef ? ('已指定身体定义 ' + pendingBodyDef + '，接下来选模组根文件夹') : '接下来选模组根文件夹（身体定义自动选择）');
      $('#dirInput').click();
      break;
    }
    case 'close-modal': closeModal(); break;
    case 'import-assets': modalAssetImport(); break;
    case 'asset-pick-files': closeModal(); $('#assetInput').click(); break;
    case 'asset-pick-dir': closeModal(); dirPurpose = 'assets'; pendingRace = null; $('#dirInput').click(); break;
    case 'import-hair': modalHairImport(); break;
    case 'hair-pick-files': closeModal(); $('#hairInput').click(); break;
    case 'hair-pick-dir': closeModal(); dirPurpose = 'hair'; pendingRace = null; $('#dirInput').click(); break;
    case 'pick-bid': openBidPicker(); break;
    case 'pick-win-bid': openBidPicker(true); break;
    case 'set-bid': {
      const want = Math.round(num(el.dataset.bid, -1));
      if (bidPickFor === 'window' && S.winSel) {
        const st = winState(S.winSel.win);
        st.parts[S.winSel.key] = Object.assign({}, st.parts[S.winSel.key] || {}, { bid: want });
        closeModal();
        renderInspector(); renderStage();
        pushHistory();
        break;
      }
      const p = selPart();
      const c = activeCanvas();
      if (p && c) {
        p.bid = want;
        // defName follows the choice: the mod's own name when it exists, otherwise a fresh one
        const next = defNameFor(c, p.bid, p);
        const isOrig = !!origDefsByBid(c).get(p.bid);
        if (next && p.source !== 'rjw') {
          p.id = next;
          if (!p.name || /^Race_|^Custom_|^Part_/.test(p.name)) p.name = next;
          toast(isOrig ? `#${p.bid} → defName = ${next}（替换模组原部位）` : `#${p.bid} → defName = ${next}（新增贴图）`);
        }
        closeModal();
        renderTree(); renderInspector(); renderStage();
        pushHistory();
      }
      break;
    }
    case 'mode': {
      const prev = modalState.mode;
      modalState.mode = el.dataset.v;
      if (el.dataset.v === 'race' && (!modalState.bounds || modalState.bounds === 'female')) modalState.bounds = 'alien';
      if (el.dataset.v !== 'race' && prev === 'race' && modalState.bounds === 'alien') modalState.bounds = 'female';
      modalNewCanvasRender();
      break;
    }
    case 'pick-race-dir': dirPurpose = 'race'; $('#dirInput').click(); break;
    case 'create-canvas': {
      const st = modalState; if (!st) break;
      if (st.mode === 'race' && !st.race) { toast('请先选择种族模组文件夹', true); break; }
      let c;
      if (st.mode === 'blank') {
        c = {
          id: 'cv-' + Date.now().toString(36), title: st.title || '新画布', sub: 'custom', kind: 'custom',
          doll: 'CustomDoll', bodytype: '*', gender: '*', xenotype: '*',
          bounds: boundOf(st.bounds), outline: '', desc: '', base: 'male',
          parts: [], detached: [], race: null, rjw: false, notes: '空白画布：从素材库添加部位开始。'
        };
      } else if (st.mode === 'copy') {
        const src = activeCanvas();
        c = JSON.parse(JSON.stringify(src));
        c.id = 'cv-' + Date.now().toString(36);
        c.title = st.title || (src.title + ' 异种');
        c.kind = 'custom';
        c.parts.forEach(p => p.uid = uid());
        c.detached.forEach(p => p.uid = uid());
        c.race = src.race ? { ...src.race } : null;
      } else {
        c = createRaceCanvas(st.race, st.base, st.title || st.race.modName);
        c.bounds = boundOf(st.bounds || 'alien');
        if ((st.bounds || 'alien') === 'alien') {
          // 自建种族默认带一个可见的实际显示框
          c.displayBox = { x: 0, y: 0, w: 512, h: 896, show: true, pos: 'bottom', locked: true };
          syncDisplayBox(c);
        }
      }
      S.canvases.push(c);
      S.active = c.id; S.sel = null;
      revealKindLayers(c);
      closeModal(); renderAll(); fitView(); pushHistory();
      if (c.kind === 'race' && c.race && c.race.added) {
        const first = c.parts.find(p => p.source === 'race');
        if (first) { select(first.uid); }
        toast(`已创建画布：${c.title} · 接入 ${c.race.added} 个种族部位（可拖动定位）`);
      } else {
        toast(`已创建画布：${c.title}（${c.parts.length} 部位）`);
      }
      break;
    }
    case 'select': select(el.dataset.uid); break;
    case 'select-detached': { const p = byUid(el.dataset.uid); if (p) select(p.uid); break; }
    case 'part-race-restore': {
      const c = activeCanvas(); if (!c) break;
      const p = (c.parts || []).find(x => x.uid === el.dataset.uid); if (!p) break;
      p.raceOff = false;
      p.raceForced = true;
      p.raceMissing = true;
      renderAll(); persist(); saveAllCanvasFiles(true);
      toast('已还原部位：种族没有对应身体部位，仍强制绘制');
      break;
    }
    case 'toggle-vis': {
      const p = byUid(el.dataset.uid); if (!p) break;
      p.vis = !p.vis; renderStage(); renderTree(); renderLibrary(); pushHistory(); break;
    }
    case 'toggle-lock': {
      const p = byUid(el.dataset.uid); if (!p) break;
      p.locked = !p.locked; renderTree(); renderStage(); break;
    }
    case 'group': {
      const k = el.dataset.k;
      if (S.ui.allClosed) S.ui.closed[k] = !S.ui.closed[k];
      else S.ui.closed[k] = !S.ui.closed[k];
      renderTree(); break;
    }
    case 'group-lock': {
      const k = el.dataset.k;
      const c = activeCanvas(); if (!c) break;
      const list = c.parts.filter(p => groupOf(p) === k);
      if (!list.length) break;
      const allLocked = list.every(p => p.locked);
      list.forEach(p => p.locked = !allLocked);
      renderStage(); renderTree(); pushHistory();
      toast(`「${KGROUP_LABEL[k] || k}」${allLocked ? '已解锁' : '已锁定'} ${list.length} 个部位`);
      break;
    }
    case 'group-vis': {
      const k = el.dataset.k;
      const c = activeCanvas(); if (!c) break;
      const list = c.parts.filter(p => groupOf(p) === k);
      const any = list.some(p => p.vis);
      list.forEach(p => p.vis = !any);
      renderStage(); renderTree(); pushHistory(); break;
    }
    case 'collapse-all': {
      S.ui.allClosed = !S.ui.allClosed;
      if (S.ui.allClosed) S.ui.closed = {};
      renderTree(); break;
    }
    case 'layer-up': {
      const p = selPart();
      if (p) { p.layer = Math.min(29, p.layer + 1); renderStage(); renderInspector(); renderTree(); pushHistory(); } break; }
    case 'layer-down': {
      const p = selPart();
      if (p) { p.layer = Math.max(0, p.layer - 1); renderStage(); renderInspector(); renderTree(); pushHistory(); } break; }
    case 'over-level-up':
    case 'over-level-down': {
      const p = selPart(); if (!p) break;
      const dir = act === 'over-level-up' ? 1 : -1;
      const before = overLevelOf(p);
      const next = clamp(before + dir, 0, 99);
      if (next === before) { toast(dir > 0 ? '已经是最高置顶层级' : '已经是最低置顶层级', true); break; }
      p.overLevel = next;
      renderStage(); renderInspector(); renderTree(); pushHistory();
      toast('置顶层级 ' + (dir > 0 ? '+1' : '-1') + '：' + next);
      break;
    }
    case 'part-linktop': {
      const p = selPart(); if (!p) break;
      p.linkTop = !p.linkTop;
      let cleared = false;
      if (p.linkTop && p.overHair) { p.overHair = false; cleared = true; delete p.layerBefore; }
      if (p.linkTop && !Number.isFinite(p.overLevel)) p.overLevel = 1;
      renderStage(); renderInspector(); renderTree(); pushHistory();
      toast((p.linkTop ? '已开启联动置顶（模组开关打开时在发型之后重画）' : '已关闭联动置顶')
        + (cleared ? '；置顶重画已关闭（两者互斥）' : ''));
      break;
    }
    case 'flip': {
      const p = selPart();
      if (p && p.overHair) {
        toast('置顶重画的部位不支持水平翻转：补画是直接贴图，镜像会错位。先关闭置顶重画再翻转。', true);
        break;
      }
      if (p) {
        p.flip = !p.flip;
        if (p.hbox && p.hbox.w > 0) { p.hbox.dx = -p.hbox.dx; syncHbFromBox(p); }
        paintPart(p); renderOverlay(); renderInspector(); pushHistory();
      }
      break;
    }
    case 'rot-reset': { const p = selPart(); if (p) { p.rot = 0; paintPart(p); renderOverlay(); renderInspector(); pushHistory(); } break; }
    case 'bake-rot': { bakeRotation(selPart()); break; }
    case 'icon-reset': { const p = selPart(); if (p) { p.nx = 0; p.ny = 0; renderOverlay(); renderInspector(); pushHistory(); } break; }
    case 'hit-reset': {
      const p = selPart();
      if (p) { delete p.hbox; renderOverlay(); renderInspector(); pushHistory(); toast('命中框已复位'); }
      break;
    }
    case 'part-hbpx': {
      const p = selPart();
      if (p) { p.hbPx = !p.hbPx; renderOverlay(); renderInspector(); pushHistory(); }
      break;
    }
    case 'part-hbbig': {
      // t30：用户显式声明「这个部位就是要大点击区」——勾上后不再夹紧/告警
      const p = selPart();
      if (p) {
        p.hbBig = !p.hbBig;
        if (p.hbBig) delete p.hbBad;
        else if (p.hbox) syncHbFromBox(p);
        renderOverlay(); renderInspector(); renderTree(); pushHistory();
        toast(p.hbBig ? '已允许该部位使用大判定框：导出时不再夹紧' : '已恢复判定框上限（超过可见区 1.5 倍会被夹紧）');
      }
      break;
    }
    case 'reload-file': {
      try { localStorage.removeItem(LS_KEY); } catch (e) { }
      location.reload();
      break;
    }
    case 'state': {
      const p = selPart(); if (!p) break;
      const v = e.target.closest('[data-v]');
      if (!v) break;
      p.state = v.dataset.v;
      if (p.state === 'hurt' && !p.sev) p.sev = 35;
      if (p.state === 'prosthetic' && !p.prosth) {
        const cand = defaultProsth(p);
        p.prosth = { img: cand.img, id: cand.id };
      }
      renderStage(); renderInspector(); renderTree(); pushHistory();
      break;
    }
    case 'part-desat': {
      const p = selPart(); if (!p) break;
      const cc = activeCanvas();
      if (!cc || !cc.race || !cc.race.defName) { toast('只有种族画布的部位可以设置颜色开关', true); break; }
      p.desat = !p.desat;
      renderInspector(); syncHairSwitches(); pushHistory(); persist();
      toast(p.desat ? '已设为受「部位颜色」开关控制（关闭后会变黑白）' : '已取消颜色开关控制');
      break;
    }
    case 'part-hair-tint': {
      const p = selPart(); if (!p) break;
      p.hairTint = !p.hairTint;
      renderInspector(); renderStage(); pushHistory(); persist();
      toast(p.hairTint ? '已设为跟随小人当前发色（导出 HairTintDef）' : '已取消跟随发色');
      break;
    }
    case 'part-mask-import': {
      const p = selPart(); if (!p) break;
      pickMaskForPart(p);
      break;
    }
    case 'part-mask-clear': {
      const p = selPart(); if (!p) break;
      delete p.mask;
      renderInspector(); renderStage(); pushHistory(); persist();
      toast('已清除蒙版');
      break;
    }
    case 'part-auto-follow': {
      const p = selPart(); if (!p) break;
      p.autoFollow = !p.autoFollow;
      renderInspector(); renderTree(); pushHistory(); persist();
      toast(p.autoFollow ? '已开启自动变换（导出 AddonFollowDef）' : '已关闭自动变换');
      break;
    }
    case 'over-hair': {
      const p = selPart(); if (!p) break;
      p.overHair = !p.overHair;
      const fixed = [];
      if (p.overHair) {
        if (p.linkTop) { p.linkTop = false; fixed.push('联动置顶'); }
        if (!Number.isFinite(p.overLevel)) p.overLevel = 1;
        // 补画时只按 position/width/height 画贴图，镜像和旋转会错位 → 直接关掉
        if (p.flip) { p.flip = false; fixed.push('水平翻转'); }
        if (Number(p.rot || 0) !== 0) { p.rot = 0; fixed.push('旋转'); }
      }
      renderStage(); renderInspector(); pushHistory();
      toast(p.overHair
        ? `已启用置顶重画：用「置顶层级」排序，补画只支持平移/缩放${fixed.length ? '，已自动关闭 ' + fixed.join('、') : ''}`
        : `已关闭置顶重画：图层恢复为 ${p.layer}`);
      break;
    }
    case 'bandage': {
      const p = selPart(); if (!p) break;
      p.bandage = el.dataset.b || '';
      renderStage(); renderInspector(); pushHistory();
      break;
    }
    case 'wound': {
      const p = selPart(); if (!p) break;
      p.wound = el.dataset.w;
      renderStage(); renderInspector(); pushHistory();
      break;
    }
    case 'dup': { const p = selPart(); if (p) duplicatePart(p); break; }
    case 'mirror': { const p = selPart(); if (p) mirrorPart(p); break; }
    case 'detach': { const p = selPart(); if (p) detachPart(p); break; }
    case 'delete-part': {
      if (activeCanvas() && activeCanvas().locked) { toast('画布已锁定，先解锁再删除部位', true); break; } const p = byUid(el.dataset.uid); if (p) deletePart(p); break; }
    case 'reattach': { const p = byUid(el.dataset.uid); if (p) reattachPart(p); break; }
    case 'pick-img': {
      S.ui.pick = S.sel;
      S.tab = 'assets';
      renderTabs(); renderLibrary();
      toast('请在素材页点选要替换的贴图');
      break;
    }
    case 'asset-up': {
      const fi = $('#fileInput');
      fi.accept = 'image/*';
      fi.multiple = true;
      filePurpose = 'asset';
      fi.click();
      break;
    }
    case 'asset-del': {
      const path = el.dataset.p;
      const rec = (S.customAssets || []).find(x => x.p === path);
      if (!rec) break;
      if (S.ui.delArm !== path) {
        S.ui.delArm = path;
        renderLibrary();
        clearTimeout(delArmTimer);
        delArmTimer = setTimeout(() => {
          if (S.ui.delArm === path) { S.ui.delArm = null; renderLibrary(); }
        }, 3500);
        toast('再点一次「删除?」确认');
        break;
      }
      clearTimeout(delArmTimer);
      S.ui.delArm = null;
      let used = 0;
      S.canvases.forEach(c => c.parts.forEach(p => { if (p.img === path) { p.img = ''; used++; } }));
      S.customAssets = (S.customAssets || []).filter(x => x.p !== path);
      if (/^Custom\//.test(path)) { try { fetch('/__customdelfile?key=' + encodeURIComponent(path), { cache: 'no-store' }); } catch (e) { } }
      CUSTOM.delete(path);
      ASSETMAP.delete(path);
      const at = ASSETS.findIndex(a => a.p === path);
      if (at >= 0) ASSETS.splice(at, 1);
      renderAll();
      renderLibrary();
      persist();
      toast(`已删除素材「${rec.n || path}」${used ? `，并清空 ${used} 个部位的贴图` : ''}`);
      break;
    }
    case 'mine-move-asset': {
      const key = el.dataset.p, cat = el.dataset.cat;
      if (key && cat) mineMoveAsset(key, cat);
      break;
    }
    case 'mine-new-cat-asset': {
      const key = el.dataset.p;
      const nn = window.prompt('新建分类名称（会创建 Custom 下的文件夹）', '');
      if (key && nn && nn.trim()) mineMoveAsset(key, nn.trim(), true);
      break;
    }
    case 'win-hide': {
      const id = el.dataset.win;
      if (!id) break;
      const st = winState(id);
      st.hidden = true;
      renderWins(activeCanvas());
      persist();
      break;
    }
    case 'win-toggle': {
      const id = el.dataset.win;
      if (!id) break;
      const st = winState(id);
      st.hidden = !st.hidden;
      renderWins(activeCanvas());
      persist();
      break;
    }
    case 'host-restart': {
      try {
        const wv = window.chrome && window.chrome.webview;
        if (wv) wv.postMessage('restart');
      } catch (e) { }
      break;
    }
    case 'health-hair': {
      S.tab = 'hair';
      renderTabs();
      renderHairPane();
      break;
    }
    case 'health-gray': {
      (async () => {
        try {
          const c = activeCanvas();
          if (c) {
            await ensureGrayArt([c]);
            await flushGrayForCanvas(c);
          }
          renderAll();
          scheduleHarBadgeRefresh();
          toast('已生成并写入 NHTCD_Gray', false);
        } catch (e) { toast('生成灰图失败：' + (e && e.message ? e.message : e), true); }
      })();
      break;
    }
    case 'health-variant-gray': {
      (async () => {
        try {
          const c = activeCanvas();
          if (c) {
            try { await syncCustomPathsFromDisk(true); } catch (e) { }
            await migrateVariantPaths(c);
            await migrateVariantGrays(c);
            await ensureGrayArt([c]);
            await flushGrayForCanvas(c);
            try { await saveAllCanvasFiles(true); } catch (e) { }
          }
          renderAll();
          scheduleHarBadgeRefresh();
          toast('已迁移异种图片/灰度到对应文件夹，并写入 NHTCD_Gray', false);
        } catch (e) { toast('迁移异种灰度失败：' + (e && e.message ? e.message : e), true); }
      })();
      break;
    }
    case 'health-sync': {
      (async () => {
        try {
          const c = activeCanvas();
          const n = c ? await flushImportedArt(c) : 0;
          await syncCustomPathsFromDisk(false);
          renderLibrary();
          renderAll();
          scheduleHarBadgeRefresh();
          toast(n ? ('已写入 ' + n + ' 张导入素材到磁盘') : '已重新同步磁盘素材');
        } catch (e) { toast('同步失败：' + (e && e.message), true); }
      })();
      break;
    }
    case 'health-inject': {
      (async () => {
        try {
          await savePatchToMod();
          const c = activeCanvas(); if (c) c._patchOn = true;
          updateHarBadge(activeCanvas());
        } catch (e) { toast('注入失败：' + (e && e.message), true); }
      })();
      break;
    }
    case 'cv-combo-do': {
      cvComboDo();
      break;
    }
    case 'cv-link-toggle': {
      const id = el.dataset.id;
      if (!id) break;
      if (!S.ui.linkOpen) S.ui.linkOpen = {};
      S.ui.linkOpen[id] = S.ui.linkOpen[id] === false;
      renderCanvasList();
      persist();
      break;
    }
    case 'variant-import': {
      modalVariantImport();
      break;
    }
    case 'variant-import-mod': {
      closeModal();
      dirPurpose = 'variants';
      pendingRace = null;
      const di = document.getElementById('dirInput');
      if (di) di.click();
      break;
    }
    case 'variant-import-xml': {
      closeModal();
      const xi = document.getElementById('variantXmlInput');
      if (xi) xi.click();
      break;
    }
    case 'scan-follow': {
      const c0 = activeCanvas();
      if (!c0 || !c0.race) { toast('这张画布不是从种族模组导入的', true); break; }
      dirPurpose = 'scan-follow';
      $('#dirInput').click();
      break;
    }
    case 'gene-looks': {
      dirPurpose = 'gene-looks';
      pendingRace = null;
      const gi = document.getElementById('dirInput');
      if (gi) gi.click();
      break;
    }
    case 'gene-look-go': {
      const uids = [...document.querySelectorAll('#modalRoot input[type="checkbox"]')]
        .filter(x => x.checked).map(x => x.value);
      const fn = S.ui && S.ui.geneLookResolve;
      if (S.ui) S.ui.geneLookResolve = null;
      closeModal();
      if (fn) fn(uids);
      break;
    }
    case 'gene-look-cancel': {
      const fn = S.ui && S.ui.geneLookResolve;
      if (S.ui) S.ui.geneLookResolve = null;
      closeModal();
      if (fn) fn(null);
      break;
    }
    case 'variant-dock-toggle': {
      S.ui.variantDockClosed = !S.ui.variantDockClosed;
      updateVariantDock(activeCanvas());
      persist();
      break;
    }
    case 'variant-select': {
      const c = activeCanvas(); if (!c) break;
      const id = el.dataset.id;
      const v = (c.colorVariants || []).find(x => x.id === id);
      if (v && v.gen && Array.isArray(v.genes)) {
        if (!c.geneGroups) c.geneGroups = [];
        if (!c.geneState) c.geneState = {};
        c.geneGroups.forEach(g => {
          const hit = (g.genes || []).find(gn => v.genes.indexOf(gn) >= 0);
          c.geneState[g.key] = hit || '';
        });
      }
      const prevSel = S.sel;
      S.ui.variantSel[c.id] = id;
      closeVariantGeomFloat(false);
      // t58/t59-A5：切异种后，原来选中的专属部位在新异种里已解析不到 —— 清掉选择，避免右侧设置页写错记录
      try {
        if (prevSel && !byUid(prevSel)) S.sel = null;
      } catch (e) { }
      renderVariantPane(); renderStage(); persist();
      break;
    }
    case 'variant-part-group': {
      if (!S.ui.variantPartOpen) S.ui.variantPartOpen = {};
      const g = el.dataset.g || '';
      S.ui.variantPartOpen[g] = S.ui.variantPartOpen[g] === false;
      renderVariantPane();
      break;
    }
    case 'gene-cell': {
      const c = activeCanvas(); if (!c) break;
      const m = geneMatrixData(c); if (!m) break;
      if (!c.geneState) c.geneState = {};
      c.geneState[m.skin.key] = el.dataset.skin || '';
      c.geneState[m.glow.key] = el.dataset.glow || '';
      closeVariantGeomFloat(false);
      const v = applyGeneState(c);
      renderVariantPane(); renderStage(); persist();
      if (!v && (el.dataset.skin || el.dataset.glow)) toast('这个基因状态还没有生成异种', true);
      break;
    }
    case 'gene-preset': {
      const c = activeCanvas(); if (!c) break;
      const v = (c.colorVariants || []).find(x => x.id === el.dataset.id);
      if (!v) break;
      const m = geneMatrixData(c); if (!m) break;
      let gs = presetGenes(v);
      if (!gs.length) {
        // 旧导入的 Xenotype 异种没有 xenoGenes：Depthborn = 默认皮肤 + Blue；
        // Chemskin = Chemskin + Blue。这样两个预设都能落到“base + 发光层”。
        const key = String((v.xenotype || '') + ' ' + (v.label || '') + ' ' + (v.id || ''));
        const blue = (m.glow.genes || []).find(g => /blue/i.test(g)) || (m.glow.genes || [])[0] || '';
        const chem = (m.skin.genes || []).find(g => /chemskin/i.test(g)) || '';
        if (/depthborn/i.test(key)) gs = blue ? [blue] : [];
        else if (/chemskin/i.test(key)) gs = [chem, blue].filter(Boolean);
        if (gs.length && (!Array.isArray(v.xenoGenes) || !v.xenoGenes.length)) v.xenoGenes = gs.slice();
      }
      if (!gs.length) { toast('这个预设没有基因信息，先重新导入它的 XenotypeDef', true); break; }
      if (!c.geneState) c.geneState = {};
      c.geneState[m.skin.key] = (m.skin.genes || []).find(g => gs.indexOf(g) >= 0) || '';
      c.geneState[m.glow.key] = (m.glow.genes || []).find(g => gs.indexOf(g) >= 0) || '';
      closeVariantGeomFloat(false);
      const hit = applyGeneState(c);
      renderVariantPane(); renderStage(); persist();
      if (!hit) toast('这个预设对应的基因状态还没有生成异种', true);
      break;
    }
    case 'variant-scope': {
      S.ui.variantScope = el.dataset.v === 'all' ? 'all' : 'over';
      renderVariantPane();
      break;
    }
    case 'variant-base': {
      const c = activeCanvas(); if (!c) break;
      closeVariantGeomFloat(false);
      S.ui.variantSel[c.id] = null;
      renderVariantPane(); renderStage(); break;
    }
    case 'variant-del': {
      const c = activeCanvas(); if (!c) break;
      const v = (c.colorVariants || []).find(x => x.id === el.dataset.id);
      if (!v) break;
      openModal(`<div style="width:min(430px,92vw)">
        <div class="modal__head"><span class="idx">VARIANT</span><h3>删除异种</h3>
          <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
        <div class="modal__body"><p class="mini-note">删除「${esc(v.label || v.id)}」以及它的部位覆盖吗？此操作只影响当前画布。</p></div>
        <div class="modal__foot"><button class="btn" data-act="close-modal">取消</button>
          <button class="btn btn--danger" data-act="variant-del-do" data-id="${esc(v.id)}">删除</button></div></div>`);
      break;
    }
    case 'variant-del-do': {
      const c = activeCanvas(); if (!c) break;
      closeVariantGeomFloat(false);
      c.colorVariants = (c.colorVariants || []).filter(v => v.id !== el.dataset.id);
      S.ui.variantSel[c.id] = null;
      closeModal(); renderAll(); persist(); saveAllCanvasFiles(true); break;
    }
    case 'variant-geom': { variantGeomFloat(el.dataset.uid); break; }
    case 'variant-geom-close': { closeVariantGeomFloat(true); renderVariantPane(); break; }
    case 'variant-geom-do': {
      const c = activeCanvas(); const v = c && variantState(c); if (!v) break;
      const uid = el.dataset.uid || (VG_FLOAT && VG_FLOAT.uid);
      if (!uid) break;
      const rec = variantPartRec(v, uid) || variantExtraRec(v, uid); if (!rec || !rec.img) break;
      const next = Object.assign({}, rec);
      const fields = [['x', 'vgX'], ['y', 'vgY'], ['sx', 'vgSX'], ['sy', 'vgSY']];
      fields.forEach(([key, id]) => {
        const raw = (document.getElementById(id) || {}).value;
        if (raw == null || String(raw).trim() === '') { delete next[key]; return; }
        const n = Number(raw);
        if (!Number.isFinite(n) || ((key === 'sx' || key === 'sy') && n <= 0)) { delete next[key]; return; }
        next[key] = n;
      });
      variantSetRec(v, uid, next);
      closeVariantGeomFloat(false);
      renderVariantPane(); renderStage(); persist(); saveAllCanvasFiles(true); break;
    }
    case 'variant-geom-flip': {
      const ctx = variantGeomCtx(); if (!ctx) break;
      ctx.r.flip = !((ctx.r.flip != null) ? ctx.r.flip : ctx.p.flip);
      renderStage(); renderVariantPane(); syncVariantGeomFloat(true); persist();
      break;
    }
    case 'variant-geom-rotreset': {
      const ctx = variantGeomCtx(); if (!ctx) break;
      ctx.r.rot = 0;
      renderStage(); renderVariantPane(); syncVariantGeomFloat(true); persist();
      break;
    }
    case 'variant-geom-screset': {
      const ctx = variantGeomCtx(); if (!ctx) break;
      ctx.r.sx = 1; ctx.r.sy = 1; delete ctx.r.auto;
      renderStage(); renderVariantPane(); syncVariantGeomFloat(true); persist();
      break;
    }
    case 'variant-geom-hitreset': {
      const ctx = variantGeomCtx(); if (!ctx) break;
      // t52：异种专属部位的命中框存在它自己的记录里
      delete (ctx.isExtra ? ctx.r : ctx.p).hbox;
      renderStage(); renderVariantPane(); syncVariantGeomFloat(true); persist();
      toast('命中框已复位');
      break;
    }
    case 'variant-geom-crop': {
      const ctx = variantGeomCtx(); if (!ctx) break;
      variantCropPart(ctx);
      break;
    }
    case 'variant-geom-visbox': {
      const ctx = variantGeomCtx(); if (!ctx) break;
      variantVisboxToHit(ctx);
      break;
    }
    case 'variant-geom-reset': {
      const c = activeCanvas(); const v = c && variantState(c); if (!v) break;
      const uid = el.dataset.uid || (VG_FLOAT && VG_FLOAT.uid);
      if (!uid) break;
      const rec = variantPartRec(v, uid) || variantExtraRec(v, uid); if (!rec || !rec.img) break;
      // t56-R1：「恢复默认」只复位几何/位置，身份字段（defName/标签/灰图）必须保留 ——
      // 否则专属部位会丢掉 name，导出时被判非法名而整行跳过。
      const isExtra = variantIsExtraUid(v, uid) || !!(v.extraParts && v.extraParts[uid]);
      const next = { img: rec.img };
      if (isExtra) {
        if (rec.name) next.name = rec.name;
        if (rec.label) next.label = rec.label;
      }
      if (rec.gray) next.gray = rec.gray;
      // asExtra 必须显式传：extra 的记录若写进 v.parts 会变成悬空覆盖
      variantSetRec(v, uid, next, isExtra);
      syncVariantGeomFloat(true);
      renderVariantPane(); renderStage(); persist(); break;
    }
    case 'variant-pick': { variantPickModal(el.dataset.uid); break; }
    case 'variant-pick-group': {
      const key = el.dataset.key || '';
      variantPickOpen[key] = !variantPickIsOpen(key);
      renderVariantPickBody();
      break;
    }
    case 'variant-pick-more': {
      const key = el.dataset.key || '';
      variantPickLimit[key] = variantPickLimitFor(key) + 240;
      renderVariantPickBody();
      break;
    }
    case 'variant-set': {
      const c = activeCanvas(); const v = c && variantState(c); if (!v || !variantPickUid) break;
      const uid = variantPickUid;
      const isNewPart = variantPickNew;
      variantPickNew = false;
      const src = el.dataset.p;
      (async () => {
        const saved = await saveVariantTexture(c, v, uid, src, variantPickCrop);
        if (!saved || !saved.img) { toast('保存异种贴图失败', true); return; }
        if (isNewPart) {
          // t58 起「+ 添加部位」走 modalAddVariantPart，不再经过这里；保留为旧入口的兜底（无 defName 时导出会跳过该行）
          const nm = String(variantPickNewName || '').trim();
          variantPickNewName = '';
          const base = /^[A-Za-z0-9_]+$/.test(nm) ? nm
            : String(saved.img).split('/').pop().replace(/\.[^.]+$/, '').replace(/_/g, ' ');
          const rec = {
            img: saved.img, name: base, uid,
            layer: 20, x: 0, y: 0, sx: 1, sy: 1, rot: 0, hb: [0.9, 0.9],
          };
          if (saved.gray) rec.gray = saved.gray;
          variantExtraMap(v)[uid] = rec;
        } else {
          if (!v.parts) v.parts = {};
          // 替换已有贴图时保留坐标；异种专属部位的记录不在 v.parts 里
          const prev = variantPartRec(v, uid) || variantExtraRec(v, uid) || {};
          const next = Object.assign({}, prev, { img: saved.img });
          if (saved.gray) next.gray = saved.gray; else delete next.gray;
          variantSetRec(v, uid, next);
        }
        closeModal();
        renderVariantPane(); renderAll(); persist(); saveAllCanvasFiles(true);
        // 新建后直接打开调整面板，省得用户再找一次
        if (isNewPart) { try { variantGeomFloat(uid); } catch (e) { } }
      })();
      break;
    }
    case 'variant-add-part': {
      // t58：不再要求手填 defName —— 弹窗里从模组自带部位中挑一个
      modalAddVariantPart();
      break;
    }
    case 'variant-add-part-pick': {
      if (!S.ui) S.ui = {};
      S.ui.addVpSel = String(el.dataset.dn || '');
      const nameEl = document.getElementById('vpPartName');
      const errEl = document.getElementById('vpPartErr');
      if (errEl) errEl.textContent = '';
      if (nameEl && !String(nameEl.value || '').trim()) {
        const pool = partDefNamePool(activeCanvas());
        nameEl.value = String(S.ui.addVpSel).split('_').pop() || pool.get(S.ui.addVpSel) || '';
      }
      renderAddVariantPartList();
      break;
    }
    case 'variant-add-part-do': {
      variantAddPartCreate();
      break;
    }
    case 'variant-extra-del': {
      const c = activeCanvas(); const v = c && variantState(c); if (!v) break;
      const uid = el.dataset.uid;
      try { closeVariantGeomFloat(false); } catch (e) { }
      if (v.extraParts && uid) delete v.extraParts[uid];
      renderVariantPane(); renderAll(); persist(); saveAllCanvasFiles(true);
      toast('已删除这个异种专属部位');
      break;
    }
    case 'variant-clear': {
      const c = activeCanvas(); const v = c && variantState(c); if (!v) break;
      const uid = el.dataset.uid;
      // t52：异种专属部位没有基础部位可回退，删掉整条记录
      if (uid && variantIsExtraUid(v, uid)) { if (v.extraParts) delete v.extraParts[uid]; }
      else if (v.parts) delete v.parts[uid];
      renderVariantPane(); renderAll(); persist(); saveAllCanvasFiles(true); break;
    }
    case 'canvas-alias-add': {
      canvasAliasModal();
      break;
    }
    case 'canvas-racealias-open': {
      canvasRaceAliasModal();
      break;
    }
    case 'canvas-racealias-import': {
      dirPurpose = 'race-alias';
      $('#dirInput').click();
      break;
    }
    case 'canvas-racealias-do': {
      canvasRaceAliasDo();
      break;
    }
    case 'canvas-racealias-del': {
      const c = activeCanvas();
      if (c && Array.isArray(c.raceAliases)) {
        c.raceAliases = c.raceAliases.filter(x => x !== el.dataset.race);
        renderAll(); persist();
        try { saveAllCanvasFiles(true); } catch (e) { }
        try { canvasRaceAliasModal(); } catch (e) { }
      }
      break;
    }
    case 'canvas-alias-do': {
      canvasAliasDo();
      break;
    }
    case 'canvas-alias-del': {
      const c = activeCanvas();
      if (c && Array.isArray(c.bodyAliases)) {
        c.bodyAliases = c.bodyAliases.filter(x => x !== el.dataset.name);
        renderAll(); persist();
        try { saveAllCanvasFiles(true); } catch (e) { }
      }
      break;
    }
    case 'canvas-form-dup': {
      canvasFormDupModal();
      break;
    }
    case 'canvas-form-do': {
      canvasFormDupDo();
      break;
    }
    case 'clean-scan': {
      (async () => {
        try {
          const scan = await cleanupScan(true, false);
          if (!scan || !scan.ok) { toast('扫描失败', true); return; }
          if (!scan.count) { toast('没有需要清理的贴图'); return; }
          const mb = (scan.bytes / 1048576).toFixed(2);
          if (!window.confirm('将删除 ' + scan.count + ' 个未被画布/补丁引用的贴图（约 ' + mb + ' MB）。\n会先完整备份到 Editor/history。继续？')) return;
          const r = await cleanupApply(true, false);
          if (!r || !r.ok) { toast('清理失败', true); return; }
          toast('已清理 ' + r.deleted + ' 个文件，备份：' + r.backup);
          if (typeof syncCustomPathsFromDisk === 'function') await syncCustomPathsFromDisk(true);
          if (typeof loadMineDirs === 'function') loadMineDirs(true);
        } catch (e) { toast('清理失败：' + (e && e.message), true); }
      })();
      break;
    }
    case 'clean-restore': {
      openCleanupRestore();
      break;
    }
    case 'gray-regen': {
      (async () => {
        const c = activeCanvas();
        if (!c) { toast('先切到一张画布', true); return; }
        const race = grayCatFor(c);
        const b = await apiGray('backup', race);
        if (!b || !b.ok) { toast('灰度备份失败：' + ((b && b.error) || ''), true); return; }
        const d = await apiGray('delete', race);
        if (!d || !d.ok) { toast('灰度删除失败：' + ((d && d.error) || ''), true); return; }
        clearGrayCache(race);
        try { await ensureGrayArt([c]); await flushGrayForCanvas(c); } catch (e) { }
        // t20：apiGray('delete') 删的是整棵 NHTCD_Gray/<race>/，异种子目录也一起没了；
        // 这里按每个异种自己的 r.img 重新生成灰图（基础灰图上面已单独处理）。
        let vn = 0;
        try { vn = await regenVariantGrays(c, { force: true }); } catch (e) { }
        try { await saveAllCanvasFiles(true); } catch (e) { }   // 新的 r.gray 要落进 canvases/*.json，否则重开工程又丢
        if (typeof syncCustomPathsFromDisk === 'function') await syncCustomPathsFromDisk(true);
        renderInspector(); renderStage();
        toast('灰度图已重新生成（异种 ' + vn + ' 张；备份：' + (b.name || '') + '）');
      })();
      break;
    }
    case 'gray-restore': {
      (async () => {
        const c = activeCanvas();
        if (!c) { toast('先切到一张画布', true); return; }
        const race = grayCatFor(c);
        const l = await apiGray('list', race);
        const name = (l && l.backups && l.backups[0]) || '';
        if (!name) { toast('没有灰度备份', true); return; }
        if (!window.confirm('还原灰度备份 ' + name + '？当前灰度目录会被替换。')) return;
        const r = await apiGray('restore', race, name);
        if (!r || !r.ok) { toast('灰度还原失败：' + ((r && r.error) || ''), true); return; }
        clearGrayCache(race);
        try { await ensureGrayArt([c]); await flushGrayForCanvas(c); } catch (e) { }
        // t20：备份还原是整目录替换，备份里可能是旧命名或缺少异种灰图；按 r.img 补齐（已存在的合法文件不动）
        try { await regenVariantGrays(c, { force: false }); } catch (e) { }
        try { await saveAllCanvasFiles(true); } catch (e) { }
        if (typeof syncCustomPathsFromDisk === 'function') await syncCustomPathsFromDisk(true);
        renderInspector(); renderStage();
        toast('已还原灰度备份：' + name);
      })();
      break;
    }
    case 'crop-toggle': {
      S.settings.autoCrop = !(S.settings && S.settings.autoCrop);
      persist();
      renderLibrary();
      toast(S.settings.autoCrop ? '自动裁剪：开（点素材会裁剪并缓存）' : '自动裁剪：关');
      break;
    }
    case 'part-armor': {
      const c = activeCanvas();
      const p = c && (c.parts || []).concat(c.detached || []).find(x => x.uid === S.sel);
      if (p) { p.armor = !(p.armor !== false); persist(); renderAll(); renderInspector(); renderLibrary(); }
      break;
    }
    case 'part-crop': {
      cropSelectedPart();
      break;
    }
    case 'crop-inplace': {
      const k = el.dataset.key;
      if (k) saveCroppedAsset(k, 'inplace');
      break;
    }
    case 'crop-save-mod': {
      const k = el.dataset.key;
      if (k) saveCroppedAsset(k, 'new', modCategoryFor(k));
      break;
    }
    case 'mine-new': {
      const name = window.prompt('新建子栏名称', '分组 ' + (mineState().folders.length + 1));
      if (name != null) mineNewFolder(name);
      break;
    }
    case 'mine-rename': {
      const f = mineState().folders.find(x => x.id === el.dataset.folder);
      if (!f) break;
      const name = window.prompt('重命名子栏', f.name);
      if (name != null) mineRenameFolder(f.id, name);
      break;
    }
    case 'asset-to-folder': {
      const path = el.dataset.p;
      // 复制到子栏: mod art also gets a copy under 我的素材, the mod group keeps its own
      if (!ASSETS.some(a => a.p === path && a.cat === 'mine')) {
        const src = ASSETS.find(a => a.p === path);
        const dim = EXT.get(path) || {};
        const w = (src && src.w) || dim.w | 0, h = (src && src.h) || dim.h | 0;
        ASSETS.push({ p: path, n: (src && src.n) || path.split('/').pop(), g: '我的素材', cat: 'mine', w, h, custom: true });
        if (!(S.customAssets || []).some(x => x.p === path)) {
          S.customAssets = S.customAssets || [];
          S.customAssets.push({ p: path, w, h });
        }
      }
      mineAssign(path, el.dataset.folder);
      closeAssetMenu();
      break;
    }
    case 'asset-export': {
      exportAsset(el.dataset.p);
      closeAssetMenu();
      break;
    }
    case 'asset-reveal': {
      revealAsset(el.dataset.p);
      closeAssetMenu();
      break;
    }
    case 'asset-new-folder': {
      const name = window.prompt('新建子栏名称并放入这张素材', '分组 ' + (mineState().folders.length + 1));
      if (name != null) {
        const id = mineNewFolder(name);
        mineAssign(el.dataset.p, id);
      }
      closeAssetMenu();
      break;
    }
    case 'lib-cat': S.ui.cat = el.dataset.cat; renderLibrary(); break;
    case 'lib-grp': {
      if (!S.ui.open) S.ui.open = {};
      const g = el.dataset.g;
      S.ui.open[g] = !S.ui.open[g];
      renderLibrary();
      break;
    }
    case 'use-hair': applyHair(el.dataset.p);
      S.ui.refDockShut = false;   // 点发型 → 展开参考窗
      try { renderRefDock(); } catch (e) { }
      break;
    case 'hair-clear': clearHairRef(); toast('已关掉发型参考'); break;
    case 'hair-lock': toggleHairLock(); break;
    case 'hair-vis': toggleHairVis(); break;
    case 'hair-up': setHairZ(1); break;
    case 'hair-down': setHairZ(-1); break;
    case 'hair-reset': resetHairFit(); break;
    case 'art-save': modalArtSave(); break;
    case 'art-rebuild': rebuildArtManifest(); break;
    case 'art-chk': {
      artSelToggle(el.dataset.key);
      renderLibrary();
      break;
    }
    case 'art-save-pick': {
      const sel = artSelList();
      let plan;
      if (sel.length) {
        plan = artSavePlan().filter(e => artSelMatch(e, sel));
        if (!plan.length) { toast('勾选的栏里没有能写入磁盘的素材', true); break; }
      } else {
        const cat = S.ui.cat || 'all';
        if (cat === 'all') { toast('先在分组标题右侧勾选要保存的栏，或先选一个分类', true); break; }
        plan = artSavePlan().filter(e => {
          if (cat === 'mine') return e.cat === 'mine';
          return e.cat === cat;
        });
        if (!plan.length) { toast('当前分类里没有能写入磁盘的素材', true); break; }
        toast(`未勾选分组，保存当前分类：${plan.length} 张…`);
      }
      if (!plan.length) { toast('没有可保存的素材', true); break; }
      toast(`正在保存 ${plan.length} 张素材…`);
      Promise.resolve(saveArtToAssets(plan)).catch(err => toast('保存失败：' + (err && err.message ? err.message : err), true));
      break;
    }
    case 'art-save-go': {
      const keys = [...document.querySelectorAll('#artSaveList input[type=checkbox]:checked')]
        .map(i => i.dataset.key);
      const pick = (ART_SAVE_PLAN || []).filter(p => keys.includes(p.key));
      if (!pick.length) { toast('一个都没勾选，先勾选要保存的素材', true); break; }
      closeModal();
      saveArtToAssets(pick);
      break;
    }
    case 'art-sel-all':
    case 'art-sel-none': {
      const on = act === 'art-sel-all';
      document.querySelectorAll('#artSaveList input[type=checkbox]').forEach(i => { i.checked = on; });
      artSaveCount();
      break;
    }
    case 'art-clear': {
      artClearAll();
      for (let i = ASSETS.length - 1; i >= 0; i--) if (ASSETS[i].cat === 'race') ASSETS.splice(i, 1);
      HAIRS = [];
      renderLibrary();
      toast('本地素材已清空（画布上的贴图引用还在，但刷新后会失效）');
      break;
    }
    case 'race-pick': {
      if (!pendingRace) break;
      const defName = el.dataset.race;
      const res = pickRace(pendingRace, defName);
      closeModal();
      createFromRace(res);
      pendingRace = null;
      break;
    }
    case 'group-add': {
      const c = activeCanvas();
      if (!c) { toast('先在左侧新建一个画布', true); break; }
      if (el.dataset.k === 'rjw') { toast('RJW 栏由画布的 RJW 开关自动生成', true); break; }
      promptPartName(el.dataset.k);
      break;
    }
    case 'new-part-ok': {
      const c = activeCanvas();
      if (!c) { closeModal(); break; }
      const gk = S.ui.addGroup || 'body';
      const name = String(S.ui.addName || '').trim() || '新部位';
      const p = addEmptyPart(c, gk, name);
      closeModal();
      if (!p) break;
      S.sel = p.uid;
      S.tab = 'assets';
      renderTabs();
      renderAll();
      pushHistory();
      toast(`已新建部位「${name}」，放在「${KGROUP_LABEL[gk] || '外形'}」栏：点一张贴图，或把贴图拖到这一行`);
      break;
    }
    case 'add-asset': {
      const path = el.dataset.p;
      const target = S.ui.pick ? byUid(S.ui.pick) : selPart();
      if (!target) {
        toast('先在「部位结构」里点 ＋ 新建一个部位（或选中已有部位），再点贴图', true);
        break;
      }
      S.ui.pick = null;
      assignAssetTo(target, path);
      if (S.settings && S.settings.autoCrop) autoCropApplied(target, path);
      break;
    }
    case 'preset': addPreset(+el.dataset.i); break;
    case 'export-patch': exportPatch(); break;
    case 'patch-to-mod': savePatchToMod(); break;
    case 'fix-body-map': applyBodyMapFix(); break;
    case 'hairfit-useoff': {
      const c0 = activeCanvas();
      if (c0) {
        c0.hairFitUseWhenOff = !c0.hairFitUseWhenOff;
        renderInspector(); syncHairSwitches(); pushHistory();
        toast(c0.hairFitUseWhenOff ? '已开启：导出发型坐标' : '已关闭：导出发型坐标');
      }
      break;
    }
    case 'hair-tint-toggle': { const c0 = activeCanvas(); if (c0) { c0.hairTintShow = c0.hairTintShow === false; renderStage(); renderInspector(); syncHairSwitches(); pushHistory(); } break; }
    case 'hair-tint-parts-sync': { const c0 = activeCanvas(); if (c0) { c0.hairTintPartsSync = c0.hairTintPartsSync === false; renderStage(); renderInspector(); syncHairSwitches(); pushHistory(); } break; }
    case 'hair-tint-reset': { const c0 = activeCanvas(); if (c0) { c0.hairTint = '#c8b48a'; renderStage(); renderInspector(); syncHairSwitches(); pushHistory(); } break; }
    case 'sync-body-parts': syncBodyPartsFromGame(); break;
    case 'rebuild-body-parts': rebuildBodyParts(activeCanvas()); break;
    case 'reimport-body-parts': reimportRaceBodyParts(activeCanvas()); break;
    case 'norm-box': {
      const c = activeCanvas();
      const n = normalizeBox(c);
      renderStage(); renderInspector(); fitView(); pushHistory();
      toast(n > 0 ? `已把画布缩放到 320×890（${n} 个部位一起缩放，外观不变）` : (n === 0 ? '画布已经是 320×890' : '画布没有包围盒'));
      break;
    }
    case 'disp-512x890': {
      const c = activeCanvas(); if (!c) break;
      const d = c.displayBox;
      if (d) {
        // keep whatever width/height the author typed, only make sure it is visible
        d.show = true;
        syncDisplayBox(c);
        renderStage(); renderInspector(); pushHistory();
        toast(`已显示实际显示框 ${Math.round(d.w)} × ${Math.round(d.h)}`);
        break;
      }
      const w = 512, h = 896;
      c.displayBox = { x: 0, y: 0, w, h, show: true, pos: 'bottom', locked: true };
      syncDisplayBox(c);
      renderStage(); renderInspector(); pushHistory();
      toast('已添加并显示实际显示框 512 × 896');
      break;
    }
    case 'disp-lock': {
      const c = activeCanvas(); if (!c) break;
      if (!c.displayBox) {
        c.displayBox = { x: 0, y: 0, w: 512, h: 896, show: true, pos: 'bottom', locked: true };
        syncDisplayBox(c);
        renderStage(); renderInspector(); pushHistory();
        toast('已添加实际显示框 512 × 896（已固定）');
        break;
      }
      c.displayBox.locked = !c.displayBox.locked;
      renderStage(); renderInspector(); pushHistory();
      toast(c.displayBox.locked ? '实际显示框已固定（不能拖动）' : '实际显示框已解除固定');
      break;
    }
    case 'disp-apply-height': {
      const c = activeCanvas(); if (!c) break;
      if (!displayApplyHeight(c)) break;
      syncDisplayConversionRows(c);
      if (DISPLAY_LINK.toOffset) displayApplyOffset(c);
      renderStage(); renderInspector(); persist(); pushHistory();
      break;
    }
    case 'disp-apply-offset': {
      const c = activeCanvas(); if (!c) break;
      if (!displayApplyOffset(c)) break;
      syncDisplayConversionRows(c);
      if (DISPLAY_LINK.toHeight) displayApplyHeight(c);
      renderStage(); renderInspector(); persist(); pushHistory();
      break;
    }
    case 'disp-auto-height': {
      DISPLAY_LINK.toHeight = !DISPLAY_LINK.toHeight; saveDisplayLink();
      const c = activeCanvas();
      if (c && DISPLAY_LINK.toHeight) displayApplyHeight(c);
      renderStage(); renderInspector(); persist();
      break;
    }
    case 'disp-auto-offset': {
      DISPLAY_LINK.toOffset = !DISPLAY_LINK.toOffset; saveDisplayLink();
      const c = activeCanvas();
      if (c && DISPLAY_LINK.toOffset) displayApplyOffset(c);
      renderInspector(); persist();
      break;
    }
    case 'disp-toggle': {
      const c = activeCanvas(); if (!c) break;
      if (!c.displayBox) {
        c.displayBox = { x: 0, y: 0, w: 512, h: 896, show: true, pos: 'bottom', locked: true };
        syncDisplayBox(c);
        renderStage(); renderInspector(); pushHistory();
        toast('已添加并显示实际显示框 512 × 896');
        break;
      }
      c.displayBox.show = !c.displayBox.show;
      renderStage(); renderInspector(); pushHistory();
      toast(c.displayBox.show ? '实际显示框已显示' : '实际显示框已隐藏');
      break;
    }
    case 'hairfit-toggle': {
      const c = activeCanvas(); if (!c) break;
      c.hairFitEnabled = !c.hairFitEnabled;          // 只切这一个开关，不再联动「导出发型坐标」
      if (c.hairFitEnabled && !c.hairFit) c.hairFit = { scale: 0.78, offsetX: 0, offsetY: -0.21 };
      renderStage(); renderInspector(); syncHairSwitches(); pushHistory();
      toast(c.hairFitEnabled ? '已开启发型重绘' : '已关闭发型重绘');
      break;
    }
    case 'hair-xray': {
      const c = activeCanvas(); if (!c) break;
      c.hairShowInXray = !c.hairShowInXray;
      renderInspector(); syncHairSwitches(); persist();
      toast(c.hairShowInXray ? '骨骼/器官视图会显示头发' : '骨骼/器官视图隐藏头发');
      break;
    }
    case 'hair-prev-set': {
      const c = activeCanvas(); if (!c) break;
      c.hairPreviewImg = el.dataset.p;
      c.hairPreviewShow = true;          // 选了预览就一定要看得见
      c.hairFitEnabled = true;           // 允许在画布里点选/拖动
      if (!el.closest('#hairPickFloat')) closeModal();
      renderStage(); renderInspector(); renderHairPane(); syncHairSwitches(); pushHistory();
      toast('头发预览已设为：' + String(el.dataset.p).split('/').pop());
      break;
    }
    case 'note-add': addNote(); break;
    case 'note-color': {
      const c = activeCanvas(); if (!c) break;
      const i = +el.dataset.i;
      const n = c.stickers && c.stickers[i]; if (!n) break;
      n.color = NOTE_COLORS[(NOTE_COLORS.indexOf(n.color) + 1) % NOTE_COLORS.length];
      renderNotes(c); persist();
      break;
    }
    case 'hair-lock-fit': {
      const c = activeCanvas(); if (!c) break;
      c.hairLocked = !c.hairLocked;
      renderStage(); renderInspector(); syncHairSwitches(); persist(); pushHistory();
      toast(c.hairLocked ? '头发已锁定（拖动/滚轮不再移动它）' : '头发已解锁');
      break;
    }
    case 'hair-frame': {
      const c0 = activeCanvas(); if (!c0) break;
      c0.hairFrameHide = !c0.hairFrameHide;
      renderStage(); renderHairPane(); persist();
      toast(c0.hairFrameHide ? '已隐藏头发预览边框' : '已显示头发预览边框');
      break;
    }
    case 'hair-prev-pick': { openHairPickModal(); break; }
    case 'hair-pick-close': { closeHairPickFloat(); break; }
    case 'hair-back-toggle': {
      const c = activeCanvas(); if (!c) break;
      c.hairBackShow = c.hairBackShow === false;
      renderStage(); renderHairPane(); persist();
      break;
    }
    case 'hair-ahoge-toggle': {
      const c = activeCanvas(); if (!c) break;
      c.hairAhogeShow = c.hairAhogeShow === false;
      renderStage(); renderHairPane(); persist();
      break;
    }
    case 'hair-back': {
      const c = activeCanvas(); if (!c) break;
      c.hairBackShow = c.hairBackShow === false;
      renderStage(); renderInspector(); syncHairSwitches(); persist();
      toast(c.hairBackShow === false ? '已隐藏后背层预览' : '已显示后背层预览');
      break;
    }
    case 'hair-import': { const hi = $('#hairInput'); if (hi) hi.click(); break; }
    case 'hair-prev-toggle': {
      const c = activeCanvas(); if (!c) break;
      c.hairPreviewShow = c.hairPreviewShow === false;
      renderStage(); renderKindChips(); refreshHairPaneIfActive(); persist();
      toast(c.hairPreviewShow === false ? '头发预览已隐藏（仅这张画布）' : '头发预览已显示');
      break;
    }
    case 'disp-clear': {
      const c = activeCanvas(); if (!c) break;
      delete c.displayBox;
      renderStage(); pushHistory();
      toast('已清除实际显示框');
      break;
    }
    case 'fix-bids': {
      const c = activeCanvas();
      const n = fixCanvasBids(c);
      renderStage(); renderTree(); renderInspector(); pushHistory();
      toast(n ? `已校正 ${n} 个部位的编号（现在导出就是官方数值）` : '所有部位编号都已经是官方数值');
      break;
    }
    case 'pick-part': { const p = (activeCanvas() || {}).parts.find(x => String(x.uid) === el.dataset.uid); if (p) select(p.uid); break; }
    case 'export-json': exportJSON(); break;
    case 'about-up': {
      const fi = $('#fileInput');
      fi.accept = '.xml,application/xml,text/xml';
      fi.multiple = false;
      filePurpose = 'about';
      fi.click();
      break;
    }
    case 'about-load-cur': {
      fetch('/__about', { cache: 'no-store' }).then(r => r.json()).then(j => {
        if (j && j.ok) {
          S.project.aboutXml = j.text;
          persist(); modalSettings();
          toast('已读取模组目录里的 About.xml');
        } else toast('读取失败：' + ((j && j.error) || '未知错误'), true);
      }).catch(err => toast('读取失败：' + err.message, true));
      break;
    }
    case 'about-auto': {
      S.project.aboutXml = aboutXML();
      persist(); modalSettings();
      toast('已按项目信息生成 About.xml');
      break;
    }
    case 'about-clear': {
      S.project.aboutXml = '';
      persist(); modalSettings();
      toast('已清空：导出时会回退到模组目录里的 About.xml');
      break;
    }
    case 'import-json': {
      const fi = $('#fileInput');
      fi.accept = '.json,application/json';
      fi.multiple = false;
      filePurpose = 'json';
      fi.click();
      break;
    }
    case 'export-png': exportPNG(); break;
    case 'preview-toggle': S.ui.previewFull = !S.ui.previewFull; renderPatch(); break;
    case 'copy-xml': {
      beginExportBadScan();    // t58-R3-1
      const xmlOne = buildPatchXML('one');
      reportBadVariantNames();   // t56-R3
      copyText(xmlOne).then(ok => toast(ok ? '补丁 XML 已复制' : '复制失败，请用导出按钮', !ok));
      break;
    }
    case 'fit-bounds': {
      const c = activeCanvas(); if (!c) break;
      const b = partsExtent(c) || canvasBounds(c);
      c.bounds = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) };
      renderAll(); fitView(); pushHistory();
      toast('边界已按部位外接框适配');
      break;
    }
    case 'reset-canvas': {
      const c = activeCanvas();
      if (!c) break;
      modalConfirm('重置为模组默认', `「${c.title}」会恢复成模组 1.6 原始的部位与坐标，当前修改将被丢弃。`, 'reset-canvas-ok');
      break;
    }
    case 'reset-canvas-ok': {
      const c = activeCanvas();
      if (c) {
        const bt = D.bodytypes.find(b => b.id === c.base) || D.bodytypes[0];
        const fresh = canvasFromBodytype(bt);
        fresh.id = c.id;
        if (!c.rjw) { fresh.rjw = false; removeRJW(fresh); }
        const i = S.canvases.findIndex(x => x.id === c.id);
        if (i >= 0) S.canvases[i] = fresh;
        S.sel = null;
      }
      closeModal(); renderAll(); fitView(); pushHistory();
      toast('已重置为模组默认');
      break;
    }
    case 'win-pin': {
      const id = el.dataset.win;
      const st = winState(id);
      const wEl = winEl(id);
      if (st.x == null || st.y == null) { st.x = wEl.offsetLeft; st.y = wEl.offsetTop; }
      st.pin = !st.pin;
      applyWinPins();
      persist();
      toast(st.pin ? `「${WIN_DEF[id].title}」已固定窗位` : `「${WIN_DEF[id].title}」已解锁，可拖动 / 缩放`);
      break;
    }
    case 'win-part-reset': {
      if (!S.winSel) break;
      const st = winState(S.winSel.win);
      delete st.parts[S.winSel.key];
      renderWins(activeCanvas());
      renderInspector();
      pushHistory();
      toast('已恢复该部位的默认位置');
      break;
    }
    case 'win-part-flip': {
      if (!S.winSel) break;
      const st = winState(S.winSel.win);
      const cur = st.parts[S.winSel.key] || (st.parts[S.winSel.key] = {});
      const base = winBaseParts(S.winSel.win, activeCanvas()).find(p => p.key === S.winSel.key);
      cur.flip = !(cur.flip != null ? cur.flip : (base ? base.flip : false));
      renderWin(S.winSel.win, activeCanvas());
      pushHistory();
      break;
    }
    case 'win-sel-clear': {
      S.winSel = null;
      renderWins(activeCanvas());
      renderInspector();
      break;
    }
    case 'rjw': {
      const c = activeCanvas(); if (!c) break;
      setCanvasRJW(c, !c.rjw);
      break;
    }
    case 'rjw-vis': {
      const c = activeCanvas(); if (!c) break;
      const list = c.parts.filter(p => p.source === 'rjw');
      if (!list.length) { toast('这张画布还没有 RJW 部位：在「全局属性 → RJW 器官」里启用', true); break; }
      const anyVisible = list.some(p => p.vis !== false);
      list.forEach(p => { p.vis = !anyVisible; });
      renderStage(); renderTree(); renderInspector(); renderStatus(); pushHistory();
      toast(anyVisible ? '已隐藏 RJW 部位' : '已显示 RJW 部位');
      break;
    }
    case 'rjw-resync': {
      const c = activeCanvas(); if (!c || !c.rjw) break;
      removeRJW(c);
      const n = ensureRJW(c);
      renderAll(); fitView(); pushHistory();
      toast(`已按「${c.doll}」重新生成 ${n} 个 RJW 部位`);
      break;
    }
    case 'rjw-show-all': {
      const c = activeCanvas(); if (!c) break;
      c.parts.filter(p => p.source === 'rjw').forEach(p => { p.vis = true; });
      renderStage(); renderTree(); renderInspector(); pushHistory();
      toast('RJW 部位已全部显示');
      break;
    }
    case 'rjw-hide-all': {
      const c = activeCanvas(); if (!c) break;
      c.parts.filter(p => p.source === 'rjw').forEach(p => { p.vis = false; });
      renderStage(); renderTree(); renderInspector(); pushHistory();
      toast('RJW 部位已全部隐藏');
      break;
    }
    case 'flag': {
      const f = el.dataset.flag;
      S.flags[f] = !S.flags[f];
      renderStage(); renderKindChips();
      if (S.tab === 'inspect') renderInspector();
      break;
    }
    case 'kind': {
      const k = el.dataset.kind;
      const show = S.kinds[k] === false;
      S.kinds[k] = show;
      const c = activeCanvas();
      if (c) c.parts.filter(p => p.kind === k).forEach(p => { if (show) p.vis = true; });
      renderStage(); renderTree(); renderKindChips();
      break;
    }
    case 'tab': {
      if (el.dataset.global) { S.sel = null; S.winSel = null; }
      S.tab = el.dataset.tab; renderTabs(); renderInspector(); renderTree(); renderStage();
      break;
    }
    case 'zoom-in': zoomAt(S.view.z * 1.2, $('#stage').getBoundingClientRect().left + $('#stage').clientWidth / 2, $('#stage').getBoundingClientRect().top + $('#stage').clientHeight / 2); break;
    case 'zoom-out': zoomAt(S.view.z / 1.2, $('#stage').getBoundingClientRect().left + $('#stage').clientWidth / 2, $('#stage').getBoundingClientRect().top + $('#stage').clientHeight / 2); break;
    case 'fit': fitView(); break;
    case 'lang-toggle': {
      const m = document.getElementById('langMenu');
      if (m) m.hidden = !m.hidden;
      break;
    }
    case 'lang-set': {
      applyLang(el.dataset.lang === 'en' ? 'en' : 'zh');
      const m = document.getElementById('langMenu');
      if (m) m.hidden = true;
      break;
    }
    case 'undo': undo(); break;
    case 'redo': redo(); break;
    case 'save': saveProjectFile(); break;
    case 'help': modalHelp(); seenSet('help', hashStr(helpVersion())); refreshAttention(); break;
    case 'export-patch-top': exportPatch(); break;
  // hair-* 动作改完状态后，把 HAR 面板/参考图坞刷新一遍（开关类已在 syncHairSwitches 就地更新）
  try {
    if (/^hair[-]/.test(act) && !HAIR_SYNCED_ACTS.has(act)) {
      refreshHairPaneIfActive();
      try { renderRefDock(); } catch (e2) { }
    }
  } catch (e1) { }
  }
});

  $$('.tab').forEach(t => t.addEventListener('click', () => {
    if (t.dataset.tab === 'global') {
      if (S.sel) S.lastSel = S.sel;          // 记住，切回部位属性时恢复
      S.sel = null; S.winSel = null;
    } else if (t.dataset.tab === 'inspect') {
      if (!S.sel && S.lastSel) {
        const cv = activeCanvas();
        if (cv && (cv.parts || []).some(p => p.uid === S.lastSel)) S.sel = S.lastSel;
      }
    }
    S.tab = t.dataset.tab;
    renderTabs(); renderInspector(); renderTree(); renderStage();
  }));

document.addEventListener('change', e => {
  if (!e.target) return;
  if (e.target.id === 'hpHideAhoge') {
    hairPickHideAhoge = !!e.target.checked; renderHairPickBody(); return;
  }
  if (e.target.id === 'hpHideBack') {
    hairPickHideBack = !!e.target.checked; renderHairPickBody(); return;
  }
  if (e.target.id === 'hpSort') {
    hairPickSort = e.target.value || 'default'; renderHairPickBody(); return;
  }
  if (e.target.id === 'libCat') {
    S.ui.cat = e.target.value || 'all';
    renderLibrary();
    return;
  }
  if (e.target.id === 'vpCat') {
    variantPickCat = e.target.value || 'all';
    renderVariantPickBody();
  } else if (e.target.id === 'vpCrop') {
    variantPickCrop = !!e.target.checked;
    try { if (!S.settings) S.settings = {}; S.settings.autoCrop = variantPickCrop; persist(); } catch (err) { }
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'hairZInput') { setHairZFromInput(e.target.value); return; }
  if (e.target.id === 'hairBackZInput') { setHairBackZFromInput(e.target.value); return; }
  if (e.target.id === 'bidSearch') { filterBidList(e.target.value); return; }
  const f = e.target.dataset.f;
  if (!f) return;
  const p = selPart();
  const c = activeCanvas();

  if (f.startsWith('p.')) {
    const key = f.slice(2);
    S.project[key] = e.target.value;
    if (key === 'name') $('#projName').value = e.target.value;
    persist();
    return;
  }
  if (f && f.indexOf('g.') === 0) {
    ensureGitSettings();
    S.settings.git[f.slice(2)] = e.target.value;
    if (f === 'g.branch') {
      const bad = gitBranchBad(e.target.value);
      e.target.classList.toggle('is-bad', bad);
      clearTimeout(window.__gitBranchT);
      window.__gitBranchT = setTimeout(() => { try { gitRefresh(); } catch (err) { } }, 700);
    }
    return;
  }
  if (f && f.indexOf('path:') === 0) {
    saveSettings();
    S.settings.paths[f.slice(5)] = e.target.value;
    return;
  }
  if (f === 'cropMax') { S.settings.cropMax = Math.max(1, Math.min(12, Math.round(Number(e.target.value) || 4))); persist(); return; }
  if (f === 'lib.q') { S.ui.q = e.target.value; SEARCH_FOCUS = { caret: e.target.selectionStart }; renderLibrary(); return; }
  if (f === 'ui.addName') { S.ui.addName = e.target.value; return; }
  if (f.startsWith('m.')) { if (modalState) modalState[f.slice(2)] = e.target.value; return; }
  if (f.startsWith('wp.')) {
    if (!S.winSel) return;
    const win = S.winSel.win, key = S.winSel.key;
    const st = winState(win);
    const cur = st.parts[key] || (st.parts[key] = {});
    const prop = f.slice(3);
    const val = num(e.target.value, 0);
    if (prop === 'x' || prop === 'y') cur[prop] = round(val, 1);
    else if (prop === 'w') cur.w = clamp(val, 4, 400);
    else if (prop === 'rot') cur.rot = val;
    else if (prop === 'name') cur.name = e.target.value;
    renderWin(win, activeCanvas());
    return;
  }
  if (f && f.startsWith('vf.')) {
    const c = activeCanvas(); const v = c && variantState(c); if (!v) return;
    const key = f.slice(3);
    if (key === 'label') v.label = e.target.value;
    else if (key === 'hediff') v.hediff = e.target.value;
    else if (key === 'xenotype') v.xenotype = e.target.value.trim();
    else if (key === 'genes') v.genes = String(e.target.value || '').split(/[,，\s]+/).filter(Boolean);
    else if (key === 'priority') v.priority = num(e.target.value, 0);
    persist();
    return;
  }
  if (f.startsWith('c.')) {
    if (!c) return;
    const key = f.slice(2);
    if (key === 'bx') c.bounds.x = num(e.target.value, c.bounds.x);
    else if (key === 'by') c.bounds.y = num(e.target.value, c.bounds.y);
    else if (key === 'bw') c.bounds.w = Math.max(1, num(e.target.value, c.bounds.w));
    else if (key === 'bh') c.bounds.h = Math.max(1, num(e.target.value, c.bounds.h));

    else if (key === 'offx' || key === 'offy') {
      const raw = String(e.target.value == null ? '' : e.target.value).trim();
      if (raw === '' || !Number.isFinite(Number(raw))) {
        syncDisplayConversionRows(c);
        return;
      }
      c.exportOffset = c.exportOffset || { x: 0, y: 0 };
      const v = Number(raw);
      if (key === 'offx') c.exportOffset.x = v;
      else {
        c.exportOffset.y = v;
        // 最后一次编辑的是偏移：只让它单向驱动高度
        if (DISPLAY_LINK.toHeight) {
          displayApplyHeight(c);
          renderStage();
        }
      }
      syncDisplayConversionRows(c);
    }
    else if (key === 'hfs' || key === 'hfx' || key === 'hfy') {
      // t16：输入写回统一走 hairFit（游戏唯一生效的三元组），量程与 HairTuning.ValidHarValues 同口径
      const raw = String(e.target.value == null ? '' : e.target.value).trim();
      if (raw === '' || !Number.isFinite(Number(raw))) {
        syncHairFitLive(c);
        return;
      }
      c.hairFit = c.hairFit || { scale: 0.78, offsetX: 0, offsetY: -0.21 };
      const v = Number(raw);
      if (key === 'hfs') c.hairFit.scale = clamp(v, 0.05, 3);        // t18：与 HairTuning.ValidHarValues 同口径
      else if (key === 'hfx') c.hairFit.offsetX = clamp(v, -2, 2);
      else c.hairFit.offsetY = clamp(v, -2, 2);
      renderStage();                      // 输入框一改，画布上的头发立刻动
      persist();
    }
    else if (key === 'hlayer') {
      c.hairLayer = clamp(Math.round(num(e.target.value, 29)), 0, 29);
      c.hairFront = true;   // 游戏里始终在最上层
      renderStage(); renderLibrary(); persist();
    }
    else if (key === 'htint') {
      c.hairTint = String(e.target.value || '#c8b48a');
      c.hairTintShow = true;
      renderStage(); persist();
    }
    else if (key === 'hlp') {
      const v = clamp(Math.round(num(e.target.value, 29)), 0, 29);
      c.hairPreviewLayer = v;
      c.hairLayer = v;                   // 显示与导出同一个值
      c.hairFront = true;
      renderStage(); renderLibrary(); persist();
    }
    else if (key === 'hbl') {
      c.hairBackLayer = clamp(Math.round(num(e.target.value, 28)), 0, 29);
      renderStage(); persist();
    }
    else if (key === 'dpos') {
      if (!c.displayBox) c.displayBox = { x: 0, y: 0, w: 512, h: 896, show: true, pos: 'bottom', locked: true };
      placeDisplayBox(c, e.target.value);
    }
    else if (key === 'dw' || key === 'dh') {
      const raw = String(e.target.value == null ? '' : e.target.value).trim();
      if (raw === '' || !Number.isFinite(Number(raw))) {
        syncDisplayConversionRows(c);
        return;
      }
      if (!c.displayBox) c.displayBox = { x: 0, y: 0, w: 512, h: DISPLAY_BASE_H, show: true, pos: 'bottom', locked: true };
      const v = Math.max(16, Math.round(num(e.target.value, key === 'dw' ? c.displayBox.w : c.displayBox.h)));
      if (key === 'dw') c.displayBox.w = v; else c.displayBox.h = v;
      syncDisplayBox(c);
      if (key === 'dh' && DISPLAY_LINK.toOffset) displayApplyOffset(c);
      syncDisplayConversionRows(c);
    }
    else if (key === 'raceDef') { if (c.race) c.race.defName = e.target.value; }
    else if (key === 'title') { c.title = upperFirst(e.target.value); e.target.value = c.title; }
    else c[key] = e.target.value;
    if (['bx', 'by', 'bw', 'bh', 'dw', 'dh', 'dpos', 'gender', 'doll', 'bodytype'].includes(key)) { renderStage(); }
    if (key === 'title') { renderCanvasList(); renderTree(); }
    if (key === 'outline') renderStage();
    return;
  }
  if (!p) return;
  switch (f) {
    case 'name': {
      p.name = e.target.value;
      applyAutoPartId(activeCanvas(), p);
      const dn = document.getElementById('partDefName');
      if (dn) dn.textContent = partDefName(activeCanvas(), p);
      renderTree();
      break;
    }
    case 'id': p.id = e.target.value; break;
    case 'bid': p.bid = Math.round(num(e.target.value, p.bid)); renderTree(); break;
    case 'layer': {
      const p2 = selPart(); if (!p2) break;
      const raw = Math.round(num(e.target.value, p2.layer));
      const v = clamp(raw, 0, 29);
      p2.layer = v;
      if (String(raw) !== String(v)) e.target.value = String(v);   // 超范围立刻回写，别等失焦
      renderStage(); renderOverlay(); break;
    }
    case 'overlevel': {
      const p2 = selPart(); if (!p2) break;
      const raw = Math.round(num(e.target.value, overLevelOf(p2)));
      const v = clamp(raw, 0, 99);
      p2.overLevel = v;
      if (String(raw) !== String(v)) e.target.value = String(v);
      renderStage(); renderOverlay(); renderTree(); renderInspector(); break;
    }
    case 'x': p.x = round(num(e.target.value, p.x), 1); paintPart(p); renderOverlay(); renderSelInfo(); break;
    case 'y': p.y = round(num(e.target.value, p.y), 1); paintPart(p); renderOverlay(); renderSelInfo(); break;
    case 'sx': case 'sy': {
      const f0 = f === 'sx' ? p.sx : p.sy;
      const v = clamp(num(e.target.value, f0), 0.02, 10);
      const k = f0 > 0 ? v / f0 : 1;
      if (f === 'sx') p.sx = v; else p.sy = v;
      if (p.hbox && p.hbox.w > 0 && Number.isFinite(k) && k > 0) {
        p.hbox = {
          dx: round(p.hbox.dx * k, 1), dy: round(p.hbox.dy * k, 1),
          w: Math.max(4, round(p.hbox.w * k, 1)), h: Math.max(4, round(p.hbox.h * k, 1)),
        };
        // t30：k 最大 10/0.02 = ×500，不夹会直接甩出画布
        clampHitboxToVis(p);
        syncHbFromBox(p);
      }
      paintPart(p); renderOverlay(); renderSelInfo(); break;
    }
    case 'rot': {
      if (p.overHair) {
        p.rot = 0;
        e.target.value = '0';
        toast('置顶重画的部位不支持旋转：补画是直接贴图，旋转会错位。先关闭置顶重画再旋转。', true);
        break;
      }
      p.rot = num(e.target.value, p.rot); paintPart(p); renderOverlay(); break;
    }
    case 'hbx': p.hb[0] = clamp(num(e.target.value, p.hb[0]), 0.05, 3); renderOverlay(); break;
    case 'nx': p.nx = round(num(e.target.value, p.nx || 0), 1); renderOverlay(); break;
    case 'ny': p.ny = round(num(e.target.value, p.ny || 0), 1); renderOverlay(); break;
    case 'hx': case 'hy': case 'hw': case 'hh': {
      const cur = hitBox(p);
      const next = { dx: cur.dx, dy: cur.dy, w: cur.w, h: cur.h };
      const v = num(e.target.value, 0);
      // t30：检查器输入原来只有下限 4、没有上限 —— 手填 50×50 就是这么来的。
      const vb = visBox(p);
      const maxW = Math.max(4, Math.min(HB_MAX_ABS, vb.w * 1.5 + 2));
      const maxH = Math.max(4, Math.min(HB_MAX_ABS, vb.h * 1.5 + 2));
      if (f === 'hx') next.dx = round(v, 1);
      else if (f === 'hy') next.dy = round(v, 1);
      else if (f === 'hw') {
        next.w = Math.max(4, round(v, 1));
        if (next.w > maxW) { next.w = round(maxW, 1); toast('命中框宽度上限 ' + round(maxW, 1) + '（可见区 ' + Math.round(vb.w) + ' ×1.5）', true); }
      } else {
        next.h = Math.max(4, round(v, 1));
        if (next.h > maxH) { next.h = round(maxH, 1); toast('命中框高度上限 ' + round(maxH, 1) + '（可见区 ' + Math.round(vb.h) + ' ×1.5）', true); }
      }
      p.hbox = next;
      syncHbFromBox(p);
      renderOverlay();
      break;
    }
    case 'hby': p.hb[1] = clamp(num(e.target.value, p.hb[1]), 0.05, 3); renderOverlay(); break;
    case 'sev': p.sev = clamp(Math.round(num(e.target.value, p.sev)), 0, 100); renderStage(); break;
    case 'rjwsize': {
      const def = rjwDefOfPart(p);
      if (!p.rjw || !def) break;
      const form = def.forms.find(f => f.f === p.rjw.form) || def.forms[0];
      const n = Math.max(1, form.n);
      p.rjw.size = clamp(Math.round(num(e.target.value, 0)), 0, n - 1);
      p.img = `${form.p}_${p.rjw.size}`;
      paintPart(p);
      const label = e.target.parentElement && e.target.parentElement.querySelector('.unit');
      if (label) label.textContent = `${p.rjw.size + 1} / ${n}`;
      break;
    }
  }
  renderStatus();
});

document.addEventListener('change', e => {
  const f = e.target.dataset.f;
  if (!f) return;
  if (f === 'prosth') {
    const p = selPart();
    if (p) {
      p.prosth = { img: e.target.value, id: 'custom' };
      renderStage(); renderInspector(); pushHistory();
    }
    return;
  }
  if (f === 'rjwform') {
    const p = selPart();
    const def = p && rjwDefOfPart(p);
    if (p && p.rjw && def) {
      const form = def.forms.find(x => x.f === e.target.value) || def.forms[0];
      p.rjw.form = form.f;
      p.rjw.size = clamp(p.rjw.size || 0, 0, Math.max(0, form.n - 1));
      p.img = `${form.p}_${p.rjw.size}`;
      renderStage(); renderInspector(); pushHistory();
    }
    return;
  }
  if (f === 'rjwsize') { pushHistory(); return; }
  if (f.startsWith('wp.')) { pushHistory(); return; }
  if (f.startsWith('m.')) return;
  pushHistory();
});

/* stage pointer + wheel */
const stageEl = $('#stage');
stageEl.addEventListener('pointerdown', onPointerDown);

/* 标尺 -> 参考线：直接用鼠标事件，避免和 pointer capture 抢事件 */
['rulerX', 'rulerY'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('mousedown', ev => {
    if (ev.button !== 0) return;
    ev.preventDefault(); ev.stopPropagation();
    const c = activeCanvas(); if (!c) return;
    const o = id === 'rulerX' ? 'h' : 'v';
    c.guides = c.guides || [];
    const g = { o, p: 0 };
    c.guides.push(g);
    const mv = e2 => {
      const pt = boardPoint(e2.clientX, e2.clientY);
      g.p = Math.round(o === 'h' ? pt.y : pt.x);
      renderGuides(c);
    };
    const up = () => {
      document.removeEventListener('mousemove', mv);
      document.removeEventListener('mouseup', up);
      renderStage(); pushHistory();
      toast('已添加参考线（右键可删除）');
    };
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
  });
});
stageEl.addEventListener('pointermove', onPointerMove);
stageEl.addEventListener('pointerup', onPointerUp);
stageEl.addEventListener('pointercancel', onPointerUp);
stageEl.addEventListener('wheel', e => {
  e.preventDefault();
  zoomAt(S.view.z * Math.exp(-e.deltaY * 0.0014), e.clientX, e.clientY);
}, { passive: false });
stageEl.addEventListener('contextmenu', e => e.preventDefault());

/* detail windows: move / resize / inner part drag */
const dollWinsEl = $('#dollWins');
dollWinsEl.addEventListener('pointerdown', onWinPointerDown);
window.addEventListener('pointermove', onWinPointerMove);
window.addEventListener('pointerup', onWinPointerUp);
window.addEventListener('pointercancel', onWinPointerUp);

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

/* drag a texture from the library onto a part row in the tree */
document.addEventListener('dragstart', e => {
  const row = e.target.closest && e.target.closest('#tree .row');
  if (row) {
    e.dataTransfer.setData('text/nht-row', row.dataset.uid);
    e.dataTransfer.effectAllowed = 'move';
    row.classList.add('is-dragging');
    return;
  }
  const tile = e.target.closest && e.target.closest('.tile');
  if (!tile) return;
  e.dataTransfer.setData('text/plain', tile.dataset.p);
  e.dataTransfer.effectAllowed = 'copy';
  tile.classList.add('is-dragging');
});
document.addEventListener('dragend', e => {
  const tile = e.target.closest && e.target.closest('.tile');
  if (tile) tile.classList.remove('is-dragging');
  $$('#tree .row').forEach(r => r.classList.remove('is-drop', 'is-over-top', 'is-over-bottom', 'is-dragging'));
});
/* 我的素材: drop a tile onto another folder, or onto a tile to sort inside it */
const libPane = $('#paneAssets');
if (libPane) {
  const clearOver = () => $$('#paneAssets [data-drop-folder]').forEach(x => x.classList.remove('is-over'));
  libPane.addEventListener('dragover', e => {
    const t = e.target.closest('[data-drop-folder]');
    if (!t) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearOver();
    t.classList.add('is-over');
  });
  libPane.addEventListener('dragleave', e => {
    if (!e.relatedTarget || !libPane.contains(e.relatedTarget)) clearOver();
  });
  libPane.addEventListener('drop', e => {
    const t = e.target.closest('[data-drop-folder]');
    if (!t) return;
    e.preventDefault();
    clearOver();
    const path = e.dataTransfer.getData('text/plain');
    if (!path) return;
    const tileEl = e.target.closest('.tile__wrap');
    const before = tileEl && tileEl.dataset.p !== path ? tileEl.dataset.p : null;
    mineAssign(path, t.dataset.dropFolder, before);
  });
  libPane.addEventListener('contextmenu', e => {
    const tile = e.target.closest('.tile');
    if (!tile || !tile.dataset.p) return;
    e.preventDefault();
    assetMenu(tile.dataset.p, e.clientX, e.clientY);
  });
}
document.addEventListener('contextmenu', e => {
  const g = e.target.closest && e.target.closest('#overlay .ico');
  if (!g) return;
  e.preventDefault();
  const c = activeCanvas();
  const p = c && (c.parts || []).find(x => x.uid === g.dataset.ico);
  if (!p) return;
  p.armor = !(p.armor !== false);
  persist();
  renderAll();
  renderInspector();
  renderLibrary();
  toast(p.name + '：护甲图标 ' + (p.armor !== false ? '开' : '关'));
});
document.addEventListener('click', e => {
  if (e.target.closest('#barMore') || e.target.closest('#barMoreBtn')) return;
  const bm = document.getElementById('barMore');
  if (bm) bm.hidden = true;
  const mb = document.getElementById('barMoreBtn'); if (mb) mb.classList.remove('is-on');
});
document.addEventListener('click', e => {
  if (e.target.closest('#assetMenu')) return;
  closeAssetMenu();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAssetMenu(); });

const treeBox = $('#tree');
if (treeBox) {
  const clearMarks = () => $$('#tree .row').forEach(r => r.classList.remove('is-drop', 'is-over-top', 'is-over-bottom', 'is-dragging'));
  treeBox.addEventListener('dragover', e => {
    const row = e.target.closest('.row');
    if (!row) return;
    e.preventDefault();
    const isRow = e.dataTransfer.types.indexOf('text/nht-row') >= 0;
    e.dataTransfer.dropEffect = isRow ? 'move' : 'copy';
    $$('#tree .row').forEach(r => { if (r !== row) r.classList.remove('is-dark', 'is-drop', 'is-over-top', 'is-over-bottom'); });
    if (isRow) {
      const r = row.getBoundingClientRect();
      const before = (e.clientY - r.top) < r.height / 2;
      row.classList.toggle('is-over-top', before);
      row.classList.toggle('is-over-bottom', !before);
      row.classList.remove('is-drop');
    } else {
      row.classList.add('is-drop');
      row.classList.remove('is-over-top', 'is-over-bottom');
    }
  });
  treeBox.addEventListener('dragleave', e => {
    const row = e.target.closest('.row');
    if (row) row.classList.remove('is-drop', 'is-over-top', 'is-over-bottom');
  });
  treeBox.addEventListener('drop', e => {
    const row = e.target.closest('.row');
    if (!row) return;
    e.preventDefault();
    const rowUid = e.dataTransfer.getData('text/nht-row');
    const r = row.getBoundingClientRect();
    const before = (e.clientY - r.top) < r.height / 2;
    clearMarks();
    if (rowUid) {
      if (movePartTo(rowUid, row.dataset.uid, before)) toast('顺序已更新');
      return;
    }
    const path = e.dataTransfer.getData('text/plain');
    const part = byUid(row.dataset.uid);
    if (part && path) assignAssetTo(part, path);
  });
  treeBox.addEventListener('dragend', clearMarks);
}
window.addEventListener('resize', () => { renderStatus(); layoutWins(); if (!S.view.userZoom) fitView(); });

$('#projName').addEventListener('input', e => { S.project.name = e.target.value; persist(); });

/* modal backdrop close */
$('#modalRoot').addEventListener('pointerdown', e => {
  if (e.target.dataset.modal) closeModal();
});

/* file inputs */
let dirPurpose = 'race';
let filePurpose = 'json';
let pendingRace = null;
// t52：手动指定的 BodyDef 文件夹（先把文件拿在手里，再让用户选模组根文件夹）
let pendingBodyFiles = [];
// t55-B6：手动文件夹里检测到的 BodyDef 列表（defName + parts 数）与用户强制选择的那一个
let pendingBodyDefs = [];
let pendingBodyDef = '';

$('#dirInput').addEventListener('change', async e => {
  const files = e.target.files;
  if (!files || !files.length) return;
  const st = modalState;
  if (dirPurpose === 'race' && st) {
    st.status = 'parsing'; st.err = ''; st.race = null;
    modalNewCanvasRender();
    try {
      // t52：手动 BodyDef 文件夹里的定义优先（同名覆盖自动扫到的）
      const res = await parseRaceMod(files, pendingBodyFiles, pendingBodyDef);
      await registerRaceTextures(res);
      pendingRace = res;
      pendingBodyFiles = [];
      pendingBodyDef = '';
      // t56-R2：成功导入后清掉 BodyDef 候选，避免下次打开弹窗还显示上一次的过期列表
      pendingBodyDefs = [];
      if (!modalState) return;
      modalState.race = res;
      modalState.status = 'ready';
      if (!modalState.title) modalState.title = res.modName;
      modalNewCanvasRender();
      toast(`已读取模组：${res.modName} · ${res.parts.length} 个部位定义`);
    } catch (err) {
      if (!modalState) return;
      modalState.status = 'error';
      modalState.err = '读取失败：' + err.message;
      modalNewCanvasRender();
    }
    e.target.value = '';
    return;
  }
  if (dirPurpose === 'race-alias') {
    dirPurpose = 'race';
    try {
      const res = await parseRaceMod(files);
      const c = activeCanvas();
      const pkg = String((c && c.race && c.race.packageId) || '');
      if (res.packageId && pkg && res.packageId !== pkg) {
        toast('这个模组的包名是 ' + res.packageId + '，与当前画布的 ' + pkg + ' 不同，已忽略');
      } else {
        if (!S.project.modRaces) S.project.modRaces = {};
        const key = res.packageId || pkg || 'unknown';
        const prev = Array.isArray(S.project.modRaces[key]) ? S.project.modRaces[key] : [];
        const m = new Map(prev.map(x => [x.defName, x]));
        (res.races || []).forEach(x => { if (x && x.defName) m.set(x.defName, { defName: x.defName, label: x.label || x.defName }); });
        S.project.modRaces[key] = Array.from(m.values());
        persist();
        toast('已导入 ' + ((res.races || []).length) + ' 个种族：' + (res.modName || key));
        canvasAliasModal();
      }
    } catch (err) { toast('读取失败：' + err.message); }
    e.target.value = '';
    return;
  }
  if (dirPurpose === 'scan-follow') {
    dirPurpose = 'race';
    const picked = Array.prototype.slice.call(files);
    e.target.value = '';
    await scanFollowParts(picked);
    return;
  }
  if (dirPurpose === 'gene-looks') {
    dirPurpose = 'race';
    const picked = Array.prototype.slice.call(files);
    e.target.value = '';
    await buildGeneLooks(picked);
    return;
  }
  if (dirPurpose === 'variants') {
    dirPurpose = 'race';
    const picked = Array.prototype.slice.call(files);
    e.target.value = '';
    await importVariantFolder(picked);
    return;
  }
  if (dirPurpose === 'assets' || dirPurpose === 'hair') {
    const mode = dirPurpose;
    dirPurpose = 'race';
    // the FileList is live: clearing the input empties it, so take a copy first
    const picked = Array.prototype.slice.call(files);
    e.target.value = '';
    await importArtFolder(picked, mode);
    return;
  }
  if (dirPurpose === 'race') {
    // direct import: read the mod, name the canvas after the race, base on the female doll
    toast(`正在读取种族模组…（${files.length} 个文件）`);
    try {
      const res = await parseRaceMod(files, pendingBodyFiles, pendingBodyDef);
      if (!res.races || !res.races.length) {
        toast('这个模组里没找到种族定义', true);
        e.target.value = '';
        return;
      }
      // t58-R2-1 / t59-A11：候选只在真正导入成功后清 —— 失败时保留，用户重选目录不用再挑一次 BodyDef
      pendingBodyFiles = [];
      pendingBodyDef = '';
      pendingBodyDefs = [];
      await registerRaceTextures(res);
      if (res.races.length > 1) {
        pendingRace = res;
        promptRacePick(res);
        e.target.value = '';
        return;
      }
      pickRace(res, res.races[0].defName);
      createFromRace(res);
    } catch (err) {
      toast('读取失败：' + err.message, true);
    }
  }
  e.target.value = '';
});

/* t52：手动的 BodyDef 文件夹 —— 只收 .xml，解析延后到模组根文件夹选完一起做
   （旧版 HTML 里没有这个 input，取不到就跳过，不影响其它功能） */
const bodyDirEl = $('#bodyDirInput');
if (bodyDirEl) bodyDirEl.addEventListener('change', e => {
  const all = [...(e.target.files || [])];
  e.target.value = '';
  const xmls = all.filter(f => /\.xml$/i.test(f.name || ''));
  if (!xmls.length) { toast('这个文件夹里没有 .xml', true); return; }
  pendingBodyFiles = xmls;
  pendingBodyDef = '';
  // t55-B6：先把文件夹里的 BodyDef 都列出来，让用户指定用哪个（自动启发式在种族 BODY 缺失时会猜错）
  pendingBodyDefs = [];
  (async () => {
    for (const f of xmls) {
      try {
        const txt = await f.text();
        const doc = new DOMParser().parseFromString(txt, 'application/xml');
        doc.querySelectorAll('BodyDef').forEach(bd => {
          const dn = (bd.querySelector(':scope > defName') || {}).textContent || '';
          const name = String(dn).trim();
          if (!/^[A-Za-z0-9_]+$/.test(name)) return;
          if (pendingBodyDefs.some(x => x.defName === name)) return;
          let n = 0;
          const partsEl = bd.querySelector(':scope > parts');
          if (partsEl) n = partsEl.querySelectorAll(':scope > li').length;
          pendingBodyDefs.push({ defName: name, parts: n });
        });
      } catch (err) { }
    }
    if (!pendingBodyDefs.length) {
      toast('这个文件夹里没读到 BodyDef，仍会按自动识别继续', true);
      dirPurpose = 'race';
      $('#dirInput').click();
      return;
    }
    pendingBodyDefs.sort((a, b) => b.parts - a.parts || a.defName.localeCompare(b.defName));
    modalImportRace();
  })();
});

$('#variantXmlInput').addEventListener('change', async e => {
  const picked = [...(e.target.files || [])];
  e.target.value = '';
  if (picked.length) await importVariantFolder(picked, { xml: true });
});

$('#assetInput').addEventListener('change', e => {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  if (files.length) addAssetFiles(files);
});

$('#hairInput').addEventListener('change', e => {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  if (!files.length) return;
  const p = addHairFiles(files);
  // 导入完回到「选择预览头发」列表，方便直接挑刚导入的
  Promise.resolve(p).then(() => setTimeout(() => {
    const b = document.querySelector('[data-act="hair-prev-pick"]');
    if (b) { try { closeModal(); } catch (err) { } setTimeout(() => b.click(), 60); }
  }, 250));
});


document.addEventListener('input', e => {
  const t = e.target;
  if (t && t.id === 'vpPartQ') {
    // t58：添加部位弹窗的搜索框
    if (!S.ui) S.ui = {};
    S.ui.addVpQ = t.value || '';
    renderAddVariantPartList();
    return;
  }
  if (t && t.id === 'vpQ') {
    variantPickQ = t.value || '';
    renderVariantPickBody();
    return;
  }
  if (!t || t.id !== 'aboutTa') return;
  S.project.aboutXml = t.value;
  persist();
  clearTimeout(window.__aboutTaT);
  window.__aboutTaT = setTimeout(() => {
    try { if (document.querySelector('.modal')) modalSettings(); } catch (err) { }
  }, 900);
});

$('#fileInput').addEventListener('change', e => {
  if (filePurpose === 'asset') { addAssetFiles(e.target.files); e.target.value = ''; return; }
  const f = e.target.files && e.target.files[0];
  if (filePurpose === 'about') {
    if (f) {
      const rd = new FileReader();
      rd.onload = () => {
        S.project.aboutXml = String(rd.result || '');
        persist();
        try { modalSettings(); } catch (err) { }
        const chk = aboutCheck(S.project.aboutXml);
        toast(chk.ok ? 'About.xml 已载入（' + (chk.warns.length ? chk.warns.length + ' 条警告' : '格式正常') + '）'
          : 'About.xml 有问题：' + chk.errors[0], !chk.ok);
      };
      rd.readAsText(f, 'utf-8');
    }
    e.target.value = '';
    return;
  }
  if (f) importJSON(f);
  e.target.value = '';
});

/* pull just the art (or just the hairstyles) out of a race mod folder */
async function importArtFolder(files, mode) {
  const folder = String((files[0] && files[0].webkitRelativePath) || '').split('/')[0] || '模组';
  toast(`正在读取 ${folder}（${files.length} 个文件）…`);
  try {
    const res = await parseRaceMod(files);
    await registerRaceTextures(res);
    const label = res.modName && res.modName !== folder ? res.modName : folder;
    const kind = mode === 'hair' ? 'hair' : 'asset';
    if (mode === 'hair') {
      const n = setHairs(res, label);
      renderLibrary();
      toast(n ? `已收进 ${n} 个发型：${label}` : (res.hairs && res.hairs.length ? '发型都已存在，无需重复导入' : '这个模组里没找到发型贴图'), !n && !(res.hairs && res.hairs.length));
      return n;
    }
    if (hasStoredArt(res.modName || label, kind)) {
      toast(`「${label}」的素材本地已经有了，跳过重复导入`);
      renderLibrary();
      return 0;
    }
    const n = addRaceAssets(res, label);
    renderLibrary();
    toast(n ? `已收进 ${n} 张素材：${label}` : '这个模组里没找到可用素材', !n);
    return n;
  } catch (err) {
    toast('读取失败：' + err.message, true);
    return -1;
  }
}

/* ==========================================================================
   art store (localStorage data URLs) — keeps mod textures / hair across refreshes
   IndexedDB is unavailable on file:// origins, so everything lives in localStorage
   with a size budget; when it fills up we stop storing and stay memory-only.
   ========================================================================== */
const ART_KEY = 'nht.art.v2';
const ART_BUDGET = 4.2 * 1024 * 1024;      // base64 chars we are willing to keep
let artIndex = null;
let artWarned = false;
let artMissed = 0;

function artLoadIndex() {
  if (artIndex) return artIndex;
  artIndex = {};
  try {
    const raw = localStorage.getItem(ART_KEY);
    if (raw) artIndex = JSON.parse(raw) || {};
  } catch (e) { artIndex = {}; }
  return artIndex;
}

function artSaveIndex() {
  try { localStorage.setItem(ART_KEY, JSON.stringify(artIndex)); }
  catch (e) { /* quota: keep the in-memory copy only */ }
}

/* 导入素材只写进了 localStorage 的 art index；这里把画布引用到的导入图真正写到
   Textures/Custom/<...>.png，避免“导入后能用但磁盘上没有”。 */
async function flushImportedArt(c) {
  if (!c || !LOCAL_HTTP) return 0;
  const idx = artLoadIndex();
  const keys = new Set();
  const add = v => { if (v && /^Custom\//.test(String(v))) keys.add(String(v)); };
  (c.parts || []).concat(c.detached || []).forEach(p => { add(p.img); add(p.grayImg); });
  (c.colorVariants || []).forEach(v => {
    Object.values(v.parts || {}).forEach(r => {
      if (r && typeof r === 'object') { add(r.img); add(r.gray); }
    });
    // t52：异种专属部位的贴图也要进索引，否则会被判“不在磁盘”
    variantExtraParts(v).forEach(r => { add(r.img); add(r.grayImg); });
  });
  let n = 0;
  for (const key of keys) {
    if (DISK_TEX_KEYS && DISK_TEX_KEYS.has(key)) continue;
    // 导入素材存在 S.customAssets（data），不一定进了 artLoadIndex；两边都查。
    const ca = (S.customAssets || []).find(x => x && x.p === key);
    let ext = null;
    try { ext = (typeof EXT !== 'undefined' && EXT.get) ? EXT.get(key) : null; } catch (e) { }
    const data = (ca && (ca.data || ca.d))
      || (idx[key] && (idx[key].d || idx[key].data))
      || (ext && (ext.url || ext.data));
    if (!data) continue;
    try {
      const ok = await apiSave('to=texture&key=' + encodeURIComponent(key), data);
      if (ok) { if (DISK_TEX_KEYS) DISK_TEX_KEYS.add(key); n++; }
    } catch (e) { }
  }
  return n;
}

function artTotal() {
  return Object.keys(artIndex || {}).reduce((n, k) => n + (artIndex[k].d ? artIndex[k].d.length : 0), 0);
}

function fileToDataURL(file) {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result || ''));
    fr.onerror = () => res('');
    fr.readAsDataURL(file);
  });
}

/* shrink a picture before caching it: the original pixel size is kept in the metadata,
   only the stored bytes get smaller (the editor stretches it back to the same box) */
function blobToImage(blob) {
  return new Promise(res => {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => res({ im, url });
    im.onerror = () => { URL.revokeObjectURL(url); res(null); };
    im.src = url;
  });
}

async function compressToDataURL(blob, maxSide) {
  const o = await blobToImage(blob);
  if (!o) return '';
  const im = o.im;
  const scale = Math.min(1, maxSide / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round((im.naturalWidth || 1) * scale));
  c.height = Math.max(1, Math.round((im.naturalHeight || 1) * scale));
  try {
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, 0, 0, c.width, c.height);
  } catch (e) { URL.revokeObjectURL(o.url); return ''; }
  URL.revokeObjectURL(o.url);
  let d = '';
  try { d = c.toDataURL('image/webp', 0.85); } catch (e) { d = ''; }
  if (!/^data:image\/webp/.test(d)) { try { d = c.toDataURL('image/png'); } catch (e) { d = ''; } }
  return d;
}

async function artPut(rec) {
  if (!rec || !rec.key || !rec.blob) return false;
  const idx = artLoadIndex();
  if (idx[rec.key]) return true;                                  // already stored
  let data = await fileToDataURL(rec.blob);
  if (!data || !/^data:image\//.test(data)) return false;
  // big textures get re-encoded so a whole race mod fits the budget
  if (rec.blob.size > 48 * 1024) {
    const packed = await compressToDataURL(rec.blob, 640);
    if (packed && packed.length < data.length) data = packed;
  }
  if (artTotal() + data.length > ART_BUDGET) {
    const packed = await compressToDataURL(rec.blob, 320);
    if (packed && artTotal() + packed.length <= ART_BUDGET) data = packed;
  }
  if (artTotal() + data.length > ART_BUDGET) {
    artMissed++;
    if (!artWarned) {
      artWarned = true;
      toast('浏览器缓存放不下了，超出部分只在这次会话里有效 —— 想全留住就点「保存到 assets/ 文件夹」（存磁盘，没有上限）', true);
    }
    return false;
  }
  idx[rec.key] = { d: data, w: rec.w | 0, h: rec.h | 0, n: rec.name || '', g: rec.group || '', cat: rec.cat || 'texture', m: rec.modKey || '', mask: rec.mask || '', ab: rec.ab || null };
  artSaveIndex();
  return true;
}

/* rebuild EXT / ASSETS / HAIRS from disk first (assets/nht-art.js next to the html), then localStorage */
async function hydrateArt() {
  let n = await loadLocalArt();
  n += hydrateFromLocalStorage();
  return n;
}

/* the html folder can hold assets/nht-art.js + the png files: nothing to re-import after a refresh */
const LOCAL_ART_URL = 'assets/nht-art.js';
/* t104：素材加载诊断（显示在素材页底部） */
const ART_DIAG = { manifest: 0, index: 0, added: 0, bad: 0, err: '' };
const LOCAL_ART_BAK = 'assets/nht-art.bak.js';

/* mods put UI buttons in their hair folder (Change / Style / Null …) — never treat them as hair */
const HAIR_JUNK = /^(change|style|null|add|remove|delete|button|btn|icon|bg|background|none|edit|random|reset)$/i;

let savedHairScanStarted = false;
async function scanSavedHairAssets() {
  if (savedHairScanStarted || !LOCAL_HTTP) return 0;
  savedHairScanStarted = true;
  let files = [];
  try {
    const r = await fetch('/__assetindex?t=' + Date.now(), { cache: 'no-store' });
    const j = await r.json();
    files = Array.isArray(j && j.files) ? j.files : [];
    ART_DIAG.index = files.length;
  } catch (e) { ART_DIAG.err = 'asset index failed: ' + (e && e.message || e); return 0; }
  let n = 0;
  const savedMasks = [];
  const seen = new Set((HAIRS || []).map(h => norm(h.n) + '|' + String(h.p || '').split('/').slice(-4, -1).join('/')));
  const existingKeys = new Set((ASSETS || []).map(a => String((a && a.p) || '')));
  files.forEach(rel => {
    if (!/\.png$/i.test(rel)) return;
    const parts = String(rel).split('/');
    const mod = parts[0] || '本地';
    const base = parts[parts.length - 1].replace(/\.png$/i, '');
    const key = 'assets/' + rel;
    const isHair = /(^|\/)(hair|mincho_hair|ahoge|uppermore|lower)(\/|_|$)/i.test(rel);

    if (isHair) {
      const m = String(rel).match(/_(north|south|east|west)m\.png$/i);
      if (m) {
        const bkey = 'assets/' + rel.replace(/_(north|south|east|west)m\.png$/i, '');
        if (!EXT.has(key)) EXT.set(key, { url: key, w: 256, h: 256 });
        savedMasks.push({ key, base: bkey });
        return;
      }
      if (!/_south\.png$/i.test(rel) && /_(north|east|west)\.png$/i.test(rel)) return;
      const hname = base.replace(/^Hair_?/i, '');
      if (/^(change|style|null|add|remove|delete|button|btn|icon|bg|background|none|edit|random|reset)$/i.test(hname)) return;
      const sig = norm(hname) + '|' + parts.slice(-4, -1).join('/');
      if (seen.has(sig)) return;
      seen.add(sig);
      if (!EXT.has(key)) EXT.set(key, { url: key, w: 256, h: 256 });
      HAIRS.push({
        p: key, n: hname, modKey: mod,
        a: /uppermore|ahoge/i.test(rel),
        b: /(^|\/)(lower)(\/|_|$)/i.test(rel),
      });
      n++;
      return;
    }

    // t103：清单可能落后于磁盘（新导入的种族素材、手工拷进 assets/ 的图），
    // 这里直接用服务器目录索引补齐 —— 覆盖所有素材目录，不再只认 Mincho。
    // key 与 nht-art.js 清单同一套（去掉首个目录段和 .png），避免同一张图出现两份。
    if (/^nht-art(\.bak)?\.js\.png$/i.test(rel)) return;
    const canon = parts.slice(1).join('/').replace(/\.png$/i, '');
    if (!canon || existingKeys.has(canon)) return;
    const assetURL = 'assets/' + rel;
    if (!EXT.has(canon)) EXT.set(canon, { url: assetURL, w: 256, h: 256 });
    ASSETS.push({
      p: canon, n: base, g: '模组 · ' + modShortName(mod), cat: 'race',
      w: 256, h: 256, ext: true, modKey: mod,
    });
    existingKeys.add(canon);
    n++;
  });
  if (savedMasks.length) {
    savedMasks.forEach(m => {
      const h = HAIRS.find(x => x.p === m.base);
      if (h) h.m = m.key;
    });
  }
  ART_DIAG.added = n;
  if (n) {
    try { renderLibrary(); } catch (e) { }
    try { if (S.tab === 'hair') renderHairPane(); } catch (e) { }
  }
  return n;
}

function loadLocalArt() {
  return new Promise(resolve => {
    const tryLoad = (url, fallback) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => {
        const rows = Array.isArray(window.__NHT_LOCAL_ART) ? window.__NHT_LOCAL_ART : [];
        ART_DIAG.manifest = rows.length; ART_DIAG.err = '';
        // remember what the disk already has: a later save merges with it instead of
        // overwriting the manifest with whatever happens to be loaded right now
        DISK_ART = rows.filter(r => r && r.key);
        let n = 0;
        // t106：逐行 try/catch —— 单行数据异常不能中断整份清单的加载
        for (let __i = 0; __i < rows.length; __i++) {
          const r = rows[__i];
          try {
          if (!r || !r.key) return;
          const src = r.src || ('assets/' + r.key + '.png');
          if (!EXT.has(r.key)) EXT.set(r.key, { url: src, w: r.w | 0 || 64, h: r.h | 0 || 64, ab: r.ab || null });
          if (r.cat === 'asset' && !ASSETS.some(a => a.p === r.key)) {
            ASSETS.push({ p: r.key, n: r.name || r.key.split('/').pop(), g: r.group || '模组素材', cat: 'race', w: r.w | 0, h: r.h | 0, ext: true, modKey: r.modKey || r.mod || '' });
            n++;
          }
          if (r.cat === 'mask') { if (!EXT.has(r.key)) EXT.set(r.key, { url: src, w: r.w | 0 || 64, h: r.h | 0 || 64 }); return; }
          if (r.cat === 'hair' && !HAIR_JUNK.test(String(r.name || r.key.split('/').pop()).replace(/^Hair_?/i, '')) && !HAIRS.some(h => h.p === r.key)) {
            HAIRS.push({ p: r.key, n: r.name || r.key.split('/').pop(), modKey: r.modKey || r.mod || '', m: r.mask || '' });
            // an alignment saved with the assets folder is picked up on a fresh browser too
            if (r.fit && !hairFits()[r.key]) {
              const all = hairFits();
              all[r.key] = r.fit;
              try { localStorage.setItem(HAIR_FIT_KEY, JSON.stringify(all)); } catch (e) { }
            }
            n++;
          }
          } catch (__e) { ART_DIAG.bad++; ART_DIAG.err = 'row ' + __i + ': ' + ((__e && __e.message) || __e); }
        }
        if (!ART_DIAG.bad) ART_DIAG.err = '';
        resolve(n);
      };
      s.onerror = () => { ART_DIAG.err = 'disk manifest missing'; if (fallback) tryLoad(fallback, null); else resolve(0); };
      document.head.appendChild(s);
    };
    tryLoad(LOCAL_ART_URL, LOCAL_ART_BAK);
  });
}

function hydrateFromLocalStorage() {
  const idx = artLoadIndex();
  const keys = Object.keys(idx);
  if (!keys.length) return 0;
  let n = 0;
  keys.forEach(k => {
    const r = idx[k];
    if (!r || !r.d) return;
    if (!EXT.has(k)) EXT.set(k, { url: r.d, w: r.w | 0 || 64, h: r.h | 0 || 64 });
    if (r.cat === 'asset' && !ASSETS.some(a => a.p === k)) {
      ASSETS.push({ p: k, n: r.n || k.split('/').pop(), g: r.g || '模组素材', cat: 'race', w: r.w | 0, h: r.h | 0, ext: true, modKey: r.m });
      n++;
    }
    if (r.cat === 'mask') { if (!EXT.has(k)) EXT.set(k, { url: r.d, w: r.w | 0 || 64, h: r.h | 0 || 64 }); return; }
    if (r.cat === 'hair' && !HAIR_JUNK.test(String(r.n || k.split('/').pop()).replace(/^Hair_?/i, '')) && !HAIRS.some(h => h.p === k)) {
      HAIRS.push({ p: k, n: r.n || k.split('/').pop(), modKey: r.m, m: r.mask || '' });
      n++;
    }
  });
  return n;
}

function hasStoredArt(modKey, kind) {
  if (!modKey) return false;
  const want = kind === 'hair' ? 'hair' : (kind === 'asset' ? 'asset' : null);
  const idx = artLoadIndex();
  return Object.keys(idx).some(k => {
    const r = idx[k];
    if (!r || r.m !== modKey) return false;
    if (!want) return r.cat === 'asset' || r.cat === 'hair';
    return r.cat === want;
  });
}

function artClearAll() {
  artIndex = {};
  artCleared = true;
  DISK_ART = [];
  try { localStorage.removeItem(ART_KEY); } catch (e) { }
}

/* --- write the art into <html folder>/assets so a refresh loads it from disk --- */
function dataURLtoBlob(d) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(String(d || ''));
  if (!m) return null;
  const mime = m[1] || 'image/png';
  let bytes;
  if (m[2]) {
    const bin = atob(m[3]);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    const txt = decodeURIComponent(m[3]);
    bytes = new Uint8Array(txt.length);
    for (let i = 0; i < txt.length; i++) bytes[i] = txt.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/* entries already sitting in assets/nht-art.js when the page opened */
let DISK_ART = [];
let artCleared = false;

/* where each picture goes: assets/<模组名>/<原贴图路径>.png
   the plan covers everything the library currently shows (素材 + 发型), so hair that was
   imported before the cache existed still gets written */
function artSavePlan() {
  const idx = artLoadIndex();
  const plan = [];
  const seen = new Set();
  const push = (key, mod, cat, name, group, w, h, mask) => {
    if (!key || !EXT.has(key)) return;
    const prev = plan.find(p => p.key === key);
    if (prev) {
      // the same picture can show up as both an asset and a hairstyle — hair wins so the
      // shelf is rebuilt after a refresh
      if (cat === 'hair') {
        prev.cat = 'hair';
        prev.mod = safeSeg(mod || prev.mod);
        prev.modKey = mod || prev.modKey;
        prev.file = prev.mod + '/' + String(key).split('/').map(safeSeg).join('/') + '.png';
      }
      return;
    }
    seen.add(key);
    const m = safeSeg(mod || '本地素材');
    const ex = EXT.get(key) || {};
    const fx = hairFits()[key];
    plan.push({
      key, mod: m, name, group, cat, w, h, modKey: mod, ab: ex.ab || (idx[key] && idx[key].ab) || null,
      fit: (cat === 'hair' && fx) ? fx : null,
      mask: mask || '',
      file: m + '/' + String(key).split('/').map(safeSeg).join('/') + '.png',
    });
  };
  // keep whatever the disk already has (other mods imported in earlier sessions), then
  // overlay the current library / canvases
  if (!artCleared) {
    DISK_ART.forEach(r => {
      if (!r || !r.key) return;
      const src = r.src || ('assets/' + r.key + '.png');
      if (!EXT.has(r.key)) EXT.set(r.key, { url: src, w: r.w | 0 || 64, h: r.h | 0 || 64 });
      push(r.key, (r.modKey || r.mod || ''), r.cat || 'asset', r.name, r.group, r.w, r.h);
    });
  }
  Object.keys(idx).forEach(k => {
    const r = idx[k];
    if (!EXT.has(k) && r && r.d) EXT.set(k, { url: r.d, w: r.w | 0 || 64, h: r.h | 0 || 64 });
    const isMineKey = /^Custom\//.test(k) && !/^Custom\/(NHTCD_Gray|Rot|Icons)\//.test(k);
    const cat = (r.cat === 'mine' || (isMineKey && r.cat !== 'race')) ? 'mine' : r.cat;
    push(k, cat === 'mine' ? '我的素材' : r.m, cat, r.n, cat === 'mine' ? '我的素材' : r.g, r.w, r.h);
  });
  ASSETS.filter(a => a.cat === 'race').forEach(a => push(a.p, a.modKey, 'asset', a.n, a.g, a.w, a.h));
  // 我的素材（浏览器本地 / Custom 目录）也要能通过「保存选择的素材」落盘\n  ASSETS.filter(a => a.cat === 'mine').forEach(a => {\n    if (!a || !a.p) return;\n    if (!EXT.has(a.p)) { const rec = artLoadIndex()[a.p]; if (rec && rec.d) EXT.set(a.p, { url: rec.d, w: rec.w | 0 || 64, h: rec.h | 0 || 64 }); }\n    if (EXT.has(a.p)) push(a.p, '我的素材', 'mine', a.n || a.p.split('/').pop(), '我的素材', a.w, a.h);\n  });
  (S.customAssets || []).forEach(a => {
    if (!a || !a.p) return;
    if (!EXT.has(a.p)) {
      const c = CUSTOM.get(a.p);
      if (c && c.data) EXT.set(a.p, { url: c.data, w: c.w | 0 || 64, h: c.h | 0 || 64 });
    }
    if (EXT.has(a.p)) push(a.p, '我的素材', 'mine', a.n || a.p.split('/').pop(), '我的素材', a.w, a.h);
  });
  HAIRS.forEach(hh => {
    const d = EXT.get(hh.p) || {};
    push(hh.p, hh.modKey, 'hair', hh.n, '', d.w | 0, d.h | 0, hh.m || '');
    if (hh.m && EXT.has(hh.m)) {
      const dm = EXT.get(hh.m) || {};
      push(hh.m, hh.modKey, 'mask', hh.n + '_mask', '', dm.w | 0, dm.h | 0);
    }
  });
  // anything a canvas or a detail window actually paints: a part may use art that was
  // never added to the library (an applied hairstyle, a hand-drawn body part …)
  const used = new Map();
  const note = img => {
    if (!img || used.has(img)) return;
    if (/^HediffTab\//.test(img)) return;          // built into the html
    if (/^Custom\//.test(img)) return;             // data url lives in the project file
    used.set(img, true);
  };
  (S.canvases || []).forEach(c => {
    (c.parts || []).forEach(p => note(p.img));
    (c.detached || []).forEach(p => note(p.img));
  });
  ['hand', 'feet'].forEach(id => {
    try {
      if (!DETAILS[id]) return;
      limbParts(id).forEach(p => note(p.img));
    } catch (e) { }
  });
  used.forEach((_, key) => {
    const d = EXT.get(key) || {};
    const seg = String(key).split('/')[0] || '项目贴图';
    push(key, seg, 'asset', key.split('/').pop(), '模组 · ' + seg, d.w | 0, d.h | 0);
  });
  return plan;
}

function safeSeg(s) {
  return String(s || 'x').replace(/[\\/:*?"<>|]+/g, '_').replace(/^\.+/, '').trim() || 'x';
}

/* browsers never let a page write into its own folder silently: the picker is the
   security boundary, so explain it once and let the user aim at the html folder */
let ART_SAVE_PLAN = [];
function modalArtSave() {
  const plan = artSavePlan();
  if (!plan.length) { toast('本地还没有素材，先导入一次', true); return; }
  ART_SAVE_PLAN = plan;
  const mods = {};
  plan.forEach(p => { mods[p.mod] = (mods[p.mod] || 0) + 1; });
  const rows = Object.keys(mods).map(m => `<div class="kv"><span>${esc(m)}</span><b>${mods[m]} 个文件</b></div>`).join('');
  const groups = {};
  plan.forEach((p, i) => { (groups[p.mod] = groups[p.mod] || []).push({ p, i }); });
  const list = Object.keys(groups).map(m => `
    <div class="artsave__grp">
      <div class="artsave__gh">
        <input type="checkbox" data-artgrp="${esc(m)}" checked title="全选 / 全不选这一组">
        <b>${esc(m)}</b><span>${groups[m].length} 个</span></div>
      ${groups[m].map(({ p, i }) => `
        <label class="artsave__row" title="${esc(p.key)}">
          <input type="checkbox" data-key="${esc(p.key)}" checked>
          <span>${esc(p.name || p.key.split('/').pop())}</span>
          <em>${esc(p.cat === 'hair' ? '发型' : '素材')}</em>
        </label>`).join('')}
    </div>`).join('');
  openModal(`
    <div style="width:min(470px,88vw)">
      <div class="modal__head"><span class="idx">SAVE</span><h3>保存到 assets/</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
      <div class="modal__body">
        <p class="mini-note" style="margin:0 0 8px">浏览器出于安全不允许网页直接写自己的目录，所以这里必须由你**选一次文件夹**——选 <b>anatomy-editor.html 所在的那个文件夹</b>，文件会写进它下面的 <code>assets/</code>。</p>
        <div class="sec__h"><b>写入内容（取消勾选 = 不保存）</b></div>
        <div class="artsave__bar">
          <button class="btn btn--xs" data-act="art-sel-all">全选</button>
          <button class="btn btn--xs" data-act="art-sel-none">全不选</button>
          <span class="mini-note" id="artSaveCount" style="margin-left:auto"></span>
        </div>
        <div class="artsave__list" id="artSaveList">${list}</div>
        ${rows}
        <p class="mini-note" style="margin:8px 0 0">素材和发型都会写入（发型也在里面）。目录会按模组分开：<code>assets/&lt;模组名&gt;/&lt;原贴图路径&gt;.png</code>，另加一份 <code>assets/nht-art.js</code> 清单，下次打开自动读回。<b>选过一次之后，本次会话里再保存会直接写同一个目录，不再弹窗。</b></p>
      </div>
      <div class="modal__foot">
        <button class="btn" data-act="close-modal">取消</button>
        <button class="btn btn--primary" data-act="art-save-go">按勾选写入</button>
      </div>
    </div>`);
  artSaveCount();
  const box = $('#artSaveList');
  if (box) {
    box.addEventListener('change', ev => {
      const t2 = ev.target;
      if (t2.dataset && t2.dataset.artgrp !== undefined) {
        const mod = t2.dataset.artgrp;
        box.querySelectorAll('.artsave__grp').forEach(g => {
          const gh = g.querySelector('[data-artgrp]');
          if (!gh || gh.dataset.artgrp !== mod) return;
          g.querySelectorAll('input[data-key]').forEach(cb => { cb.checked = t2.checked; });
        });
      }
      // 子项变化 → 更新组勾选状态（全选 / 半选 / 未选）
      box.querySelectorAll('.artsave__grp').forEach(g => {
        const gh = g.querySelector('[data-artgrp]');
        const rows = [...g.querySelectorAll('input[data-key]')];
        if (!gh || !rows.length) return;
        const on = rows.filter(r => r.checked).length;
        gh.checked = on === rows.length;
        gh.indeterminate = on > 0 && on < rows.length;
      });
      artSaveCount();
    });
  }
}

/* 勾选清单的实时计数 */
function artSaveCount() {
  const box = $('#artSaveList');
  const el = $('#artSaveCount');
  if (!el) return;
  const all = box ? box.querySelectorAll('input[type=checkbox]').length : 0;
  const on = box ? box.querySelectorAll('input[type=checkbox]:checked').length : 0;
  el.textContent = `已选 ${on} / ${all}`;
  el.style.color = on ? '' : '#e2564a';
}

/* progress overlay while files are being written */
function modalArtProgress(total) {
  openModal(`
    <div style="width:min(430px,86vw)">
      <div class="modal__head"><span class="idx">SAVE</span><h3>正在保存到 assets/</h3></div>
      <div class="modal__body">
        <div class="prog"><i id="artProgFill"></i></div>
        <p class="mini-note" id="artProgTxt" style="margin:7px 0 0">准备中…</p>
      </div>
    </div>`);
  artProgress(0, total, '准备中…');
}

function artProgress(done, total, label) {
  const fill = $('#artProgFill');
  if (fill) fill.style.width = Math.max(0, Math.min(100, Math.round((done / Math.max(1, total)) * 100))) + '%';
  const txt = $('#artProgTxt');
  if (txt) txt.textContent = `${done}/${total} · ${label}`;
}

/* the folder picked last time: a page is never told where its own file lives, so we
   remember the handle and reuse it — later saves in the same session skip the dialog */
let lastArtDir = null;

async function pickArtDir() {
  if (lastArtDir) {
    try {
      let perm = await lastArtDir.queryPermission({ mode: 'readwrite' });
      if (perm === 'prompt') perm = await lastArtDir.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') return lastArtDir;
    } catch (e) { /* fall back to the picker */ }
  }
  const opts = { id: 'nht-art', mode: 'readwrite' };
  if (lastArtDir) opts.startIn = lastArtDir;
  let dir = null;
  try { dir = await window.showDirectoryPicker(opts); }
  catch (e) {
    if (e && e.name === 'AbortError') return null;
    try { dir = await window.showDirectoryPicker({ id: 'nht-art', mode: 'readwrite' }); }
    catch (e2) { return null; }
  }
  if (dir) lastArtDir = dir;
  return dir;
}


/* ---------- 素材：按栏保存到本地（磁盘上还没有素材时才出现） ---------- */
function artDiskIndexEmpty() {
  try { return Object.keys(artLoadIndex() || {}).length === 0; } catch (e) { return true; }
}

/* 本次会话里已经写进磁盘的 key（不持久化：刷新后以磁盘清单为准） */
let artSavedKeys = new Set();

function artNeedsLocalSave() {
  if (typeof window.showDirectoryPicker !== 'function') return false;
  if ((ASSETS.length + (typeof HAIRS !== 'undefined' ? HAIRS.length : 0)) <= 0) return false;
  let idx = {};
  try { idx = artLoadIndex() || {}; } catch (e) { idx = {}; }
  let plan = [];
  try { plan = artSavePlan() || []; } catch (e) { plan = []; }
  if (!plan.length) return artDiskIndexEmpty();
  for (const e of plan) {
    if (!idx[e.key] && !artSavedKeys.has(e.key)) return true;   // 还有没落盘的素材
  }
  return false;
}

function artSelList() {
  if (!Array.isArray(S.ui.artSel)) S.ui.artSel = [];
  return S.ui.artSel;
}
function artSelHas(k) { return artSelList().indexOf(k) >= 0; }
function artSelToggle(k) {
  const list = artSelList();
  const i = list.indexOf(k);
  if (i >= 0) list.splice(i, 1); else list.push(k);
}

function artSubOf(key) {
  const parts = String(key || '').split('/');
  return parts.length > 1 ? parts[parts.length - 2] : '其它';
}

function artSelMatch(entry, sel) {
  let eg = entry.group || (entry.cat === 'hair' ? '__hair' : '');
  if (entry.cat === 'rjw') eg = '模组 · RJW 器官';
  else if (eg && eg !== '__hair') eg = displayGroupName(/^模组/.test(eg) ? eg : ('模组 · ' + eg));
  const isMine = entry.cat === 'mine' || String(entry.group || '').indexOf('我的素材') >= 0;
  const mineCat = String(entry.key || '').split('/')[1] || '未分类';
  const hairSub = sel.length ? null : null;
  for (const s of sel) {
    if (isMine) {
      if (s === 'g:我的素材' || s === 'g:★ 我的素材' || s === 'g:mine') return true;
      if (s.indexOf('s:mine:') === 0 && s.slice(7) === mineCat) return true;
      continue;
    }
    if (s.indexOf('g:') === 0 && eg === s.slice(2)) return true;
    if (s.indexOf('s:') === 0) {
      const rest = s.slice(2);
      const bar = rest.search(/[:|]/);
      const g = bar < 0 ? rest : rest.slice(0, bar);
      const sub = bar < 0 ? '' : rest.slice(bar + 1);
      if (g === '__hair') {
        if (entry.cat === 'hair' && displayGroupName(entry.modKey || '') === sub) return true;
        continue;
      }
      if (eg === g && artSubOf(entry.key) === sub) return true;
    }
  }
  return false;
}

/* 在素材库里给每个大栏 / 子栏补一个复选框，并在顶部补一个保存按钮 */
function injectArtChecks() {
  const lib = document.querySelector('#paneAssets') || document.querySelector('#library');
  if (!lib) return;
  const on = artNeedsLocalSave();
  lib.querySelectorAll('.artchk, .artchk-bar').forEach(el => el.remove());
  if (!on) return;

  let planNow = [];
  try { planNow = artSavePlan() || []; } catch (e) { planNow = []; }
  const writable = k => {
    if (k === 'g:__hair') return planNow.some(e => e.cat === 'hair');
    if (k.indexOf('s:') === 0) {
      const rest = k.slice(2);
      const bar = rest.search(/[:|]/);
      const g = bar < 0 ? rest : rest.slice(0, bar);
      const sub = bar < 0 ? '' : rest.slice(bar + 1);
      if (g === '__hair') return planNow.some(e => e.cat === 'hair' && displayGroupName(e.modKey || '') === sub);
      return planNow.some(e => artSelMatch(e, ['g:' + g]) && artSubOf(e.key) === sub);
    }
    return planNow.some(e => artSelMatch(e, [k]));
  };

  lib.querySelectorAll('.libgrp').forEach(el => {
    const g = el.dataset.g || '';
    if (!g) return;
    const isSub = el.classList.contains('sub');
    const key = isSub ? ('s:' + g) : ('g:' + g);
    if (!writable(key)) return;          // 没有可落盘的素材：不显示复选框
    const chk = document.createElement('button');
    chk.className = 'artchk' + (artSelHas(key) ? ' is-on' : '');
    chk.dataset.act = 'art-chk';
    chk.dataset.key = key;
    chk.title = isSub ? '勾选这个子栏，点上面的「保存选择的素材」落盘' : '勾选这个栏，点上面的「保存选择的素材」落盘';
    chk.textContent = artSelHas(key) ? '✓' : '';
    el.appendChild(chk);
  });

  const bar = document.createElement('div');
  bar.className = 'artchk-bar';
  const n = artSelList().length;
  bar.innerHTML = `<button type="button" class="btn btn--sm" data-act="art-save-pick">${icon('save')}${n ? `保存选择的素材（${n} 栏）` : '保存当前分类'}</button>`;
  // 独占一行，并且紧贴第一个分组（中间不再夹其它内容）
  const firstGrp = lib.querySelector('.libgrp');
  if (firstGrp && firstGrp.parentNode) {
    firstGrp.parentNode.insertBefore(bar, firstGrp);
  } else {
    const searchBar = lib.querySelector('.libsearch') || lib.querySelector('.lib__bar');
    if (searchBar && searchBar.parentNode) searchBar.parentNode.insertBefore(bar, searchBar.nextSibling);
    else lib.insertBefore(bar, lib.firstChild);
  }
}



/* 导入种族等会走 renderAll：之后也补一次复选框 */
(function hookArtChecksAll() {
  if (typeof renderAll !== 'function') return;
  const origAll = renderAll;
  renderAll = function () {
    const r = origAll.apply(this, arguments);
    try { injectArtChecks(); } catch (e) { }
    return r;
  };
})();

/* 包装 renderLibrary：每次渲染完补上复选框 */
(function hookArtChecks() {
  const orig = renderLibrary;
  renderLibrary = function () {
    const r = orig.apply(this, arguments);
    try { injectArtChecks(); } catch (e) { }
    return r;
  };
})();


/* 扫描 assets/ 目录，重建 nht-art.js（用于找回「文件在、清单丢」的素材） */
async function rebuildArtManifest() {
  // t103：有本地服务器时，直接重扫 assets/ 目录索引（不用再选文件夹、也不会漏素材）
  if (LOCAL_HTTP) {
    savedHairScanStarted = false;
    let n = 0;
    try { n = await scanSavedHairAssets(); } catch (e) { }
    try { renderLibrary(); } catch (e) { }
    try { if (S.tab === 'hair') renderHairPane(); } catch (e) { }
    toast(n ? ('已从 assets/ 补齐 ' + n + ' 项素材') : 'assets/ 里没有新素材');
    return;
  }
  if (typeof window.showDirectoryPicker !== 'function') {
    toast('这个浏览器不支持直接读文件夹，请用 Chrome / Edge', true);
    return;
  }
  const root = await pickArtDir();
  if (!root) return;
  let assetsDir = null;
  try {
    assetsDir = root.name.toLowerCase() === 'assets' ? root : await root.getDirectoryHandle('assets');
  } catch (e) {
    toast('这个文件夹里没有 assets/ 子目录', true);
    return;
  }
  const rows = [];
  const walk = async (dir, rel) => {
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'directory') { await walk(handle, rel.concat(name)); continue; }
      if (!/\.png$/i.test(name)) continue;
      const file = await handle.getFile();
      const url = URL.createObjectURL(file);
      let w = 0, h = 0;
      try {
        const dim = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
          im.onerror = () => rej(new Error('img'));
          im.src = url;
        });
        w = dim.w; h = dim.h;
      } catch (e) { /* 读不到尺寸就先留 0 */ }
      URL.revokeObjectURL(url);
      const relParts = rel.concat(name.replace(/\.png$/i, ''));
      const modName = relParts[0] || '本地素材';
      const key = relParts.slice(1).join('/') || relParts[0];
      const baseName = name.replace(/\.png$/i, '');
      // 路径里带 Hair / Ahoge 的按发型收，和导入时的判断一致
      const isHair = /(^|\/)(hair|ahoge)/i.test(key)
        || /MiliraHair|HairMain|HairBackGround/i.test(key)
        || /^hair/i.test(baseName);
      rows.push({
        key, name: baseName,
        group: /^模组/.test(modName) ? modName : ('模组 · ' + modName),
        cat: isHair ? 'hair' : 'asset', w, h, modKey: modName,
        ab: null, fit: null,
        src: 'assets/' + relParts.join('/') + '.png'
      });
    }
  };
  await walk(assetsDir, []);
  if (!rows.length) { toast('assets/ 里没有找到 png', true); return; }
  const body = 'window.__NHT_LOCAL_ART=' + JSON.stringify(rows) + ';\n';
  for (const name of ['nht-art.js', 'nht-art.bak.js']) {
    const fh = await assetsDir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(body);
    await w.close();
  }
  const nHair = rows.filter(r => r.cat === 'hair').length;
  const nAsset = rows.length - nHair;
  const byMod = {};
  rows.forEach(r => { byMod[r.modKey] = byMod[r.modKey] || { a: 0, h: 0 }; if (r.cat === 'hair') byMod[r.modKey].h++; else byMod[r.modKey].a++; });
  const detail = Object.keys(byMod).slice(0, 6)
    .map(m => `${m}: ${byMod[m].a} 素材 / ${byMod[m].h} 发型`).join('；');
  toast(`已重建清单：${rows.length} 项（素材 ${nAsset} · 发型 ${nHair}）—— ${detail}。刷新后生效`);
}

async function saveArtToAssets(planIn) {
  if (!(await ensureSavePath('assets'))) return;
  const plan = planIn || artSavePlan();
  if (!plan.length) { toast('本地还没有素材，先导入一次', true); return; }
  // 本地服务：直接把每张贴图写进 assets/<key>.png
  if (LOCAL_HTTP) {
    closeModal();
    modalArtProgress(plan.length);
    let ok = 0, fail = 0, next = 0;
    const worker = async () => {
      for (;;) {
        const i = next++;
        if (i >= plan.length) return;
        const rec = plan[i];
        let data = '';
        try {
          const ext = EXT.get(rec.key);
          const src = ext && ext.url;
          if (src && /^data:image\//.test(src)) data = src;
          else if (src) {
            const blob = await (await fetch(src)).blob();
            data = await fileToDataURL(blob);
          }
        } catch (e) { data = ''; }
        if (!data) {
          fail++;
          artProgress(i + 1, plan.length, '跳过 ' + rec.key);
          continue;
        }
        // 按 模组/原路径 写入 → assets/<模组>/... 而不是平铺在 assets 根目录
        const catName = assetsCatFor(rec);
        const raw = String(rec.file || ((rec.mod || '本地素材') + '/' + rec.key)).replace(/\.png$/i, '');
        const rel = raw.indexOf('/') >= 0 ? (catName + '/' + raw.split('/').slice(1).join('/')) : (catName + '/' + raw);
        const r = await apiSave('to=asset&key=' + encodeURIComponent(rel), data);
        if (r) { ok++; artProgress(i + 1, plan.length, rec.key); }
        else { fail++; artProgress(i + 1, plan.length, '失败 ' + rec.key); }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);

    // 本地服务模式也要写 nht-art.js 清单：否则刷新后「发型 HAIR」和素材分组无法从磁盘恢复
    try {
      const written = plan.map(rec => ({
        key: rec.key,
        name: rec.name || String(rec.key).split('/').pop(),
        group: rec.group || '',
        cat: rec.cat === 'hair' ? 'hair' : (rec.cat === 'mask' ? 'mask' : 'asset'),
        w: rec.w | 0,
        h: rec.h | 0,
        modKey: rec.modKey || rec.mod || '',
        ab: rec.ab || null,
        fit: rec.fit || null,
        mask: rec.mask || '',
        src: 'assets/' + (rec.file || ((rec.mod || '本地素材') + '/' + rec.key + '.png')),
      }));
      const keys = new Set(written.map(r => r.key));
      const base = (DISK_ART && DISK_ART.length) ? DISK_ART : (Array.isArray(window.__NHT_LOCAL_ART) ? window.__NHT_LOCAL_ART : []);
      const merged = base.filter(r => r && r.key && !keys.has(r.key)).concat(written);
      const body = 'window.__NHT_LOCAL_ART=' + JSON.stringify(merged) + ';\n';
      const b64 = btoa(unescape(encodeURIComponent(body)));
      for (const name of ['nht-art.js', 'nht-art.bak.js']) {
        await apiSave('to=asset&key=' + encodeURIComponent(name), 'data:text/javascript;base64,' + b64);
      }
      DISK_ART = merged;
      window.__NHT_LOCAL_ART = merged;
    } catch (e) { }

    closeModal();
    S.ui.artSel = [];
    try { renderLibrary(); } catch (e) { }
    toast(`素材已写入 assets/：${ok} 张${fail ? `，失败 ${fail} 张` : ''}`);
    return;
  }
  if (typeof window.showDirectoryPicker !== 'function') {
    toast('这个浏览器不支持直接写文件夹，请用 Chrome / Edge 打开', true);
    return;
  }
  const dir = await pickArtDir();
  if (!dir) return;
  closeModal();
  const total = plan.length + 1;          // + the nht-art.js manifest
  let done = 0;
  modalArtProgress(total);
  // let the progress window paint once before the writes start (rAF may never fire in
  // a background / headless tab, so keep a timer fallback)
  await new Promise(r => {
    let done = false;
    const fin = () => { if (!done) { done = true; r(); } };
    requestAnimationFrame(() => setTimeout(fin, 30));
    setTimeout(fin, 150);
  });
  try {
    const assets = dir.name.toLowerCase() === 'assets'
      ? dir
      : await dir.getDirectoryHandle('assets', { create: true });
    const idx = artLoadIndex();
    const dirCache = new Map([['', assets]]);
    const dirFor = async parts => {
      let key = '', cur = assets;
      for (const seg of parts) {
        key += '/' + seg;
        const hit = dirCache.get(key);
        if (hit) { cur = hit; continue; }
        cur = await cur.getDirectoryHandle(seg, { create: true });
        dirCache.set(key, cur);
      }
      return cur;
    };
    const manifest = new Array(plan.length);
    let next = 0, done = 0;
    // a handful of writers in parallel: sequential writes are what made this crawl
    const worker = async () => {
      for (;;) {
        const i = next++;
        if (i >= plan.length) return;
        const p = plan[i];
        const parts = p.file.split('/');
        const fname = parts.pop();
        let ok = false, src = '';
        try {
          const rec = idx[p.key];
          const blob = rec && rec.d ? dataURLtoBlob(rec.d) : await (await fetch(EXT.get(p.key).url)).blob();
          const d = await dirFor(parts);
          const fh = await d.getFileHandle(fname, { create: true });
          const w = await fh.createWritable();
          await w.write(blob);
          await w.close();
          ok = true;
          src = 'assets/' + p.file;
        } catch (e) { ok = false; }
        manifest[i] = {
          key: p.key, name: p.name, group: p.group, cat: p.cat, w: p.w, h: p.h, modKey: p.modKey, ab: p.ab || null,
          fit: p.fit || null,
          src: ok ? src : ((idx[p.key] || {}).d || '')
        };
        done++;
        artProgress(done, total, p.file);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    // write the manifest twice: the .bak copy survives an accidental delete of the main one
    const written = manifest.filter(Boolean);
    const writtenKeys = new Set(written.map(e => e.key));
    const base = (typeof DISK_ART !== 'undefined' && DISK_ART && DISK_ART.length)
      ? DISK_ART
      : (Array.isArray(window.__NHT_LOCAL_ART) ? window.__NHT_LOCAL_ART : []);
    const kept = base.filter(r => r && r.key && !writtenKeys.has(r.key));
    const mergedRows = kept.concat(written);
    const body = 'window.__NHT_LOCAL_ART=' + JSON.stringify(mergedRows) + ';\n';
    for (const name of ['nht-art.js', 'nht-art.bak.js']) {
      const fh = await assets.getFileHandle(name, { create: true });
      const w2 = await fh.createWritable();
      await w2.write(body);
      await w2.close();
    }
    DISK_ART = mergedRows;
    window.__NHT_LOCAL_ART = mergedRows;
    done++;
    artProgress(done, total, 'nht-art.js 已写入');
    await new Promise(r => setTimeout(r, 450));
    const nFiles = manifest.filter(Boolean).length;
    closeModal();
    plan.forEach(e => artSavedKeys.add(e.key));
    try { renderLibrary(); } catch (e) { }
    S.ui.artSel = [];
    try { renderLibrary(); } catch (e) { }
    toast(`已写入 assets/：${nFiles} 个文件（按模组分目录，含 nht-art.js）`);
  } catch (e) {
    const txt = $('#artProgTxt');
    if (txt) { txt.textContent = '写入失败：' + e.message; txt.style.color = 'var(--danger)'; }
    toast('写入失败：' + e.message, true);
  }
}

/* assets: pick images from this computer, or pull a whole mod folder */
function modalAssetImport() {
  const m = mineState();
  openModal(`
    <div style="width:min(460px,86vw)">
      <div class="modal__head"><span class="idx">ASSET</span><h3>导入素材</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
      <div class="modal__body">
        <p class="mini-note" style="margin:0 0 10px">选图片可以直接多选（存进「我的素材」）；从模组文件夹导入会自动按模组名 + 部位分子组。</p>
        <div class="rowline" style="flex-direction:column;gap:6px">
          <button class="btn btn--wide" data-act="asset-pick-files">${icon('img')}选择图片（PNG / WebP，可多选）</button>
          <button class="btn btn--wide" data-act="asset-pick-dir">${icon('folder')}从模组文件夹导入</button>
        </div>
        <p class="mini-note" style="margin:10px 0 0">我的素材现有 ${m.folders.length} 个子栏，选的文件会进「${esc(m.folders[0].name)}」；可以再拖到别的子栏。</p>
      </div>
      <div class="modal__foot"><button class="btn" data-act="close-modal">取消</button></div>
    </div>`);
}

/* t52：导入种族 —— 默认自动扫模组根文件夹；找不到 BodyDef 时可手动指定 BodyDef 文件夹 */
function modalImportRace() {
  const haveBd = Array.isArray(pendingBodyDefs) && pendingBodyDefs.length > 0;
  const bdOpts = haveBd
    ? `<option value="">自动选择</option>` + pendingBodyDefs.map(b =>
      `<option value="${esc(b.defName)}"${pendingBodyDef === b.defName ? ' selected' : ''}>${esc(b.defName)}（${b.parts} 部位）</option>`).join('')
    : '';
  openModal(`
    <div style="width:min(520px,92vw)">
      <div class="modal__head"><span class="idx">RACE</span><h3>导入种族</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
      <div class="modal__body">
        <p class="mini-note" style="margin:0 0 10px">选模组的根文件夹，程序会从里面读 ThingDef / 贴图 / 发型 / BodyAddon，并按性别挑一个合适的 BodyDef 建画布。</p>
        ${haveBd ? `
        <div class="vgfloat__sec" style="margin-top:2px">身体定义 BODY</div>
        <p class="mini-note" style="margin:0 0 6px">已从 BodyDef 文件夹读到 ${pendingBodyDefs.length} 个定义。自动选择会依次按「种族 BODY 精确匹配 → 与种族 defName 同名 → corePart 命中 → parts 最多」挑选；不对就在下面手动指定。</p>
        <select class="inp" id="raceBodydefPick" style="width:100%;margin-bottom:8px">${bdOpts}</select>
        <div class="rowline" style="flex-direction:column;gap:8px">
          <button class="btn btn--wide btn--primary" data-act="race-bodydir-go">${icon('folder')}继续：选择模组根文件夹</button>
          <button class="btn btn--wide" data-act="race-pick-bodydir">${icon('folder')}重新选择 BodyDef 文件夹</button>
        </div>
        <p class="mini-note" style="margin:10px 0 0">顺序：<b>先选 BodyDef 文件夹 → 可指定身体定义 → 再选模组根文件夹</b>，其余数据仍然从模组根文件夹读。</p>
        ` : `
        <div class="rowline" style="flex-direction:column;gap:8px">
          <button class="btn btn--wide" data-act="race-pick-auto">${icon('folder')}自动识别（选择模组根文件夹）</button>
          <button class="btn btn--wide" data-act="race-pick-bodydir">${icon('folder')}手动选择 BodyDef 文件夹</button>
        </div>
        <p class="mini-note" style="margin:10px 0 0">少数模组把 BodyDef 放在很深的子目录（例如 <code>1.7/Core/Defs/BodyDefs</code>），文件太多时自动识别可能扫不到。这时用第二项：<b>先选 BodyDef 文件夹，再选模组根文件夹</b>，其余数据仍然从模组根文件夹读。</p>
        `}
      </div>
      <div class="modal__foot"><button class="btn" data-act="close-modal">取消</button></div>
    </div>`);
}

/* hairstyles: pick pictures from this computer, or pull a whole mod folder */
function modalHairImport() {
  openModal(`
    <div style="width:min(440px,86vw)">
      <div class="modal__head"><span class="idx">HAIR</span><h3>导入发型</h3><button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
      <div class="modal__body">
        <p class="mini-note" style="margin:0 0 10px">选图片可以直接多选；从模组文件夹导入会只挑 <code>Hair</code> 目录下朝前的那些帧。</p>
        <div class="rowline" style="flex-direction:column;gap:6px">
          <button class="btn btn--wide" data-act="hair-pick-files">${icon('img')}选择图片（PNG / WebP，可多选）</button>
          <button class="btn btn--wide" data-act="hair-pick-dir">${icon('folder')}从模组文件夹导入</button>
        </div>
        <p class="mini-note" style="margin:10px 0 0">导入后会存在浏览器本地（约 3.6 MB 预算），刷新不丢；同一张图不会重复添加。</p>
      </div>
      <div class="modal__foot"><button class="btn" data-act="close-modal">取消</button></div>
    </div>`);
}

/* ==========================================================================
   boot
   ========================================================================== */

/* the whole project, in the same shape localStorage uses */

/* ---------------- 本地 HTTP 服务（Editor/serve.ps1）----------------
   用 http://127.0.0.1:8765 打开时，保存可以直接写盘，不必再选目录。 */
const LOCAL_API = /^https?:$/.test(location.protocol) ? '' : '';
const LOCAL_HTTP = /^https?:$/.test(location.protocol);
async function apiSave(query, body) {
  // 程序模式：保存直接走 WebView2 宿主对象
  try {
    if (HOST && query) {
      const qp = new URLSearchParams(query);
      const to = qp.get('to');
      const key = qp.get('key');
      const name = qp.get('name');
      const txt = String(body == null ? '' : body);
      const b64 = txt.indexOf('base64,') >= 0 ? txt.slice(txt.indexOf('base64,') + 7) : txt;
      let ok = false;
      // HOST.SaveProject 只写 nht-project.js，不会生成 Editor/history 快照；
      // 项目保存必须走本地服务的 /__save，才能在服务端轮换历史文件。
      if (!(to === 'project' && LOCAL_HTTP) && !(to === 'patch' && LOCAL_HTTP)) {
        if (to === 'texture' && key) ok = await HOST.WriteTexture(key, b64);
        else if (to === 'asset' && key) ok = await HOST.SaveAsset(key, b64);
        else if (to === 'patch' && name) ok = await HOST.SavePatch(name, txt);
        else if (to === 'project') ok = await HOST.SaveProject(txt);
        if (ok) return true;
      }
    }
  } catch (e) { }
  if (!LOCAL_HTTP) return false;
  try {
    const r = await fetch('/__save?' + query, { method: 'POST', body: String(body) });
    return r.ok;
  } catch (e) { return false; }
}


async function apiGray(action, race, name) {
  const q = new URLSearchParams({ action: action || '', race: race || '', name: name || '' }).toString();
  try {
    if (HOST && HOST.GrayAction) {
      const j = await HOST.GrayAction(action || '', race || '', name || '');
      if (j) return JSON.parse(j);
    }
  } catch (e) { }
  try {
    const r = await fetch('/__gray?' + q, { method: 'POST' });
    return await r.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}


/* ---------------- 本地保存历史（最多 5 份，服务端轮换） ---------------- */
async function openHistory() {
  if (!LOCAL_HTTP) { toast('历史版本需要从「启动编辑器.bat」打开的页面使用', true); return; }
  let rows = [];
  try {
    const r = await fetch('/__history', { cache: 'no-store' });
    rows = await r.json();
  } catch (e) { toast('读取历史失败：' + e.message, true); return; }
  if (!Array.isArray(rows)) rows = rows ? [rows] : [];
  const list = rows.map((x, i) => `
    <div class="rowline" style="justify-content:space-between;align-items:center;margin:4px 0">
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        <b>${esc(x.time || x.name)}</b>
        <span class="mini-note" style="margin-left:6px">${Math.round((x.size || 0) / 1024)} KB</span>
      </span>
      <button class="btn btn--sm" data-act="history-load" data-name="${esc(x.name)}">载入这份</button>
    </div>`).join('');
  openModal(`
    <div class="modal__head"><span class="idx">HISTORY</span><h3>本地保存历史</h3>
      <button class="iconbtn x" data-act="close-modal">${icon('x')}</button></div>
    <div class="modal__body">
      <p class="mini-note">每次「本地保存」会留一份快照，最多保留 5 份，保存新的会替换最旧的一份。</p>
      ${list || '<p class="mini-note">还没有历史版本。</p>'}
    </div>`);
}

async function loadHistoryVersion(name) {
  if (S.preview) { S.preview = null; document.body.classList.remove('is-preview'); }
  try {
    const r = await fetch('/__history-file?name=' + encodeURIComponent(name), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    const m = /window\.__NHT_PROJECT\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(txt);
    if (!m) throw new Error('文件格式不对');
    const proj = JSON.parse(m[1]);
    applyProject(proj);
    if (proj.flags) Object.assign(S.flags, proj.flags);
    if (proj.wins && typeof proj.wins === 'object') S.wins = proj.wins;
    renderAll(); fitView();
    closeModal();
    persist(); pushHistory();
    toast('已载入历史版本：' + name + '（如需保留请再点「本地保存」）');
  } catch (e) {
    toast('载入历史失败：' + e.message, true);
  }
}

function projectPayload() {
  const flags = Object.assign({}, S.flags);
    return { v: 4, savedAt: Date.now(), project: S.project, canvases: S.canvases, active: S.active,
    flags: flags, kinds: Object.assign({}, S.kinds), wins: S.wins, customAssets: S.customAssets,
    mine: S.mine, hairRef: S.hairRef, hairFits: hairFits(),
    trash: S.trash || [],
    ui: {
      open: S.ui.open || {},
      panels: S.ui.panels || {},
      cvGroups: S.ui.cvGroups || [],
      cvCollapsed: S.ui.cvCollapsed || {},
      linkOpen: S.ui.linkOpen || {},
      cvBaseSeeded: !!S.ui.cvBaseSeeded,
      trashOpen: S.ui.trashOpen !== false,
      cat: S.ui.cat, q: S.ui.q
    },
    settings: saveSettings(),
    view: { z: S.view.z, px: S.view.px, py: S.view.py },
    tab: S.tab };
}

let projDir = null;

async function saveProjectFile(forcePick) {
  if (!(await ensureSavePath('project'))) return;
  progStart('保存项目…', 3);
  doPersist();                                   // always keep the browser copy current
  try { await ensureGrayArt(S.canvases); } catch (e) { }
  try { await flushAllGrayArt(); } catch (e) { }
  progStep(1, '整理异种灰度目录…');
  try { await migrateAllVariantGrays(); } catch (e) { }
  progStep(1, '已写入浏览器缓存…');
  // 走本地服务：直接写 Editor/nht-project.js
  if (LOCAL_HTTP) {
    // t44-B：保存兜底 —— 先把历史遗留的异种贴图（Custom/<race>/Crop_… 或其它非规范路径）
    // 迁移成 Custom/<race>/<异种名>/<部位>_<素材>，再写 nht-project.js，避免快照里留下游戏不认的路径。
    // 位置必须在 flushAllCroppedAssets() 之后（迁移要能读到已落盘的裁剪素材）、projectPayload() 之前。
    progStep(2, '写入已应用的裁剪素材…');
    try { await flushAllCroppedAssets(); } catch (e) { }
    progStep(2, '迁移异种贴图路径…');
    for (const cc of (S.canvases || [])) { try { await migrateVariantPaths(cc); } catch (e) { } }
    const body = 'window.__NHT_PROJECT=' + JSON.stringify(projectPayload()) + ';';
    const ok = await apiSave('to=project', body);
    if (ok) {
      scheduleHarBadgeRefresh();
      progStep(3, '写入 canvases/*.json + index.json…');
      const okFiles = await saveAllCanvasFiles(true);
      progDone();
      if (okFiles) {
        setSaveStatus('已保存 ' + S.canvases.length + ' 个画布文件 · ' + now());
        toast('画布已分别保存到 Editor/canvases/（' + S.canvases.length + ' 个）');
      } else {
        setSaveStatus('已保存 Editor/nht-project.js · ' + now());
        toast('已保存 nht-project.js，但画布分文件写入失败', true);
      }
      return;
    }
    toast('本地服务写入失败，改用文件夹选择', true);
  }
  if (typeof window.showDirectoryPicker !== 'function') { toast('这个浏览器不支持写文件夹', true); return; }
  if (!projDir || forcePick) {
    try {
      projDir = await window.showDirectoryPicker({ id: 'nht-project-dir', mode: 'readwrite' });
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast('没有拿到文件夹权限：' + e.message, true);
      return;
    }
  }
  try {
    let perm = 'granted';
    try { perm = await projDir.queryPermission({ mode: 'readwrite' }); } catch (e) { perm = 'prompt'; }
    if (perm !== 'granted') {
      try { perm = await projDir.requestPermission({ mode: 'readwrite' }); } catch (e) { perm = 'denied'; }
    }
    if (perm !== 'granted') {
      projDir = null;
      toast('文件夹权限过期，再点一次重新选择目录', true);
      return;
    }
    progStep(2, '生成项目文件…');
    const body = 'window.__NHT_PROJECT=' + JSON.stringify(projectPayload()) + ';';
    const fh = await projDir.getFileHandle('nht-project.js', { create: true });
    const w = await fh.createWritable();
    await w.write(body);
    await w.close();
    progStep(3, '写入 nht-project.js…');
    progDone();
    setSaveStatus('已保存到 ' + projDir.name + '/nht-project.js · ' + now());
    toast('项目已写入 nht-project.js（' + projDir.name + '）');
  } catch (e) {
    projDir = null;
    toast('保存失败：' + e.message, true);
  }
}

/* read nht-project.js that sits next to the html (script tag, because file:// blocks fetch) */
function loadProjectFile() {
  return new Promise(resolve => {
    const sc = document.createElement('script');
    sc.src = 'nht-project.js';
    sc.onload = () => resolve(window.__NHT_PROJECT || null);
    sc.onerror = () => resolve(null);
    document.head.appendChild(sc);
  });
}

let HOST = null;

async function mountHostBridge() {
  try {
    const wv = window.chrome && window.chrome.webview;
    if (!wv) return;
    HOST = (wv.hostObjects && wv.hostObjects.nht) || null;
    if (!HOST) return;
    document.body.classList.add('is-host');
    wv.addEventListener('message', ev => {
      if (ev && ev.data === 'files-changed') {
        try {
          syncCustomPathsFromDisk(true).then(() => {
            try { loadMineDirs(true); } catch (e) { }
            try { renderLibrary(); } catch (e) { }
          }).catch(() => { });
        } catch (e) { }
      }
    });
    try { HOST.StartWatch(); } catch (e) { }
  } catch (e) { }
}

function mountHostRestart() {
  try {
    const wv = window.chrome && window.chrome.webview;
    if (!wv) return;
    document.body.classList.add('is-host');   // 只有 exe 内才有：设置里显示“重启”
  } catch (e) { }
}

function boot() {
  if (S.flags.hairPreview === undefined) S.flags.hairPreview = true;
  const brand = $('#brandMark');
  if (brand) brand.src = imgURL('About/ModIcon');
  const fav = $('#favicon');
  if (fav) fav.href = imgURL('About/ModIcon');
  $$('.chip__ico').forEach(el => {
    const m = el.dataset.m;
    if (!m) return;
    const u = imgURL(m);
    el.style.webkitMaskImage = `url("${u}")`;
    el.style.maskImage = `url("${u}")`;
  });
  try {
    const bar = document.getElementById('stageBar');
    if (bar && S.flags.barCollapsed) bar.classList.add('is-collapsed');
  } catch (e) { }
  const emptyIco = document.querySelector('#stageEmpty .stage__empty-ico');
  if (emptyIco && !emptyIco.querySelector('svg')) {
    const u = imgURL('HediffTab/Common/DNAIcon');
    emptyIco.style.webkitMaskImage = `url("${u}")`;
    emptyIco.style.maskImage = `url("${u}")`;
  }

  // 进入页面时弹一次通知气泡（内容来自 notice.html）
  mountHostBridge();
  setTimeout(() => { loadBaseline().then(() => { try { updateHarBadge(activeCanvas()); } catch (e) { } }); }, 3000);
  mountHostRestart();
  loadNotice();
  loadTips();
  loadSelf().then(() => { try { renderSettingsPaths(); } catch (e) { } try { renderPatch(); } catch (e) { } });
setTimeout(() => { try { notifHint(); } catch (e) { } try { refreshAttention(); } catch (e) { } if (LOCAL_HTTP) { gitRefresh(); loadTexIndex().then(() => { try { renderPatch(); } catch (e) { } }); } }, 700);
  setTimeout(() => { try { if (!S.view.userZoom) fitView(); } catch (e) { } }, 400);

  // 先看浏览器缓存，等文件到了再比 savedAt，谁新用谁（避免旧文件把新数据盖掉）
  const saved = loadSaved();
  if (saved) {
    applyProject(saved);
    if (saved.flags) Object.assign(S.flags, saved.flags);
    if (saved.wins && typeof saved.wins === 'object') S.wins = saved.wins;
    setSaveStatus('已恢复上次工作 · ' + now());
  } else {
    applyProject(seedProject());
    setSaveStatus('已载入模组默认体型');
  }
  loadProjectFile().then(fileProj => {
    if (!fileProj || !Array.isArray(fileProj.canvases) || !fileProj.canvases.length) return;
    const fileAt = Number(fileProj.savedAt) || 0;
    const savedAt = Number((saved && saved.savedAt) || 0);
    if (saved && savedAt > fileAt) {
      // 浏览器里的更新：只保留在内存里，绝不自动写回 nht-project.js。
      // 以前这里会 apiSave 覆盖文件，导致手动同步进文件的画布/部位被旧缓存冲掉。
      setSaveStatus('已保留浏览器里较新的数据（未写盘）· ' + now());
      window.__mergeInfo = { branch: 'kept-local', savedAt, fileAt, http: LOCAL_HTTP };
      return;
    }
    applyProject(fileProj);
    if (fileProj.flags) { const f = Object.assign({}, fileProj.flags); Object.assign(S.flags, f); }
    if (fileProj.wins && typeof fileProj.wins === 'object') S.wins = fileProj.wins;
    setSaveStatus('已载入 nht-project.js · ' + now());
    migrateCanvasSigs();
    renderAll();
    try { if (typeof persist === 'function') persist(); } catch (e) { }
  });
  if (LOCAL_HTTP) {
    loadCanvasFiles().then(res => {
      if (!res) return;
      // 浏览器里的版本比画布文件新（比如刚调完异种还没落盘就刷新）：
      // 保留内存里的画布，并把它们写回文件，避免异种参数被旧文件覆盖。
      const localAt = Number((saved && saved.savedAt) || 0);
      const fileAt = Number((res.payload && res.payload.savedAt) || 0);
      if (saved && localAt > fileAt) {
        // 只保留浏览器内存版本，不自动 saveAllCanvasFiles，避免把文件里刚同步的部位冲掉。
        setSaveStatus('已保留浏览器里较新的画布（未写盘）· ' + now());
        return;
      }
      const keepActive = S.active;                 // 进入页面时用户看到的那张
      const prevById = new Map((S.canvases || []).map(x => [x.id, x]));
      applyProject(res.payload);
      S.canvases = res.canvases;
      S.canvases.forEach(c => { try { pruneGlowLayers(c); } catch (e) { } try { migrateGlowVariantPathsSync(c); } catch (e) { } });
      // 画布文件可能是旧版本：形态映射/形态列表以项目里较新的数据补齐
      S.canvases.forEach(c => {
        const p = prevById.get(c.id);
        if (!p) return;
        if (!Array.isArray(c.bodyAliases) && Array.isArray(p.bodyAliases)) c.bodyAliases = p.bodyAliases;
        if (!c.parentId && p.parentId) c.parentId = p.parentId;
        if (c.form == null && p.form != null) c.form = p.form;
        if (c.race && p.race && (!Array.isArray(c.race.bodyTypes) || !c.race.bodyTypes.length) && Array.isArray(p.race.bodyTypes) && p.race.bodyTypes.length) {
          c.race.bodyTypes = p.race.bodyTypes;
        }
      });
      migrateCanvasSigs();
      try { normalizeCanvasNames(); saveAllCanvasFiles(true); } catch (e) { }
      if (keepActive && S.canvases.some(c => c.id === keepActive)) S.active = keepActive;
      else if (!S.canvases.some(c => c.id === S.active)) S.active = S.canvases[0].id;
      renderAll();
      try { if (typeof persist === 'function') persist(); } catch (e) { }
      setSaveStatus('已载入 ' + res.canvases.length + ' 个画布文件 · ' + now());
      loadRaceRemaps().then(k => { if (k) { try { renderAll(); } catch (e) { } } }).catch(() => { });
      loadHairMap().then(n => { if (n) { try { renderAll(); renderHairPane(); } catch (e) { } } }).catch(() => { });
      syncCustomPathsFromDisk(true).then(() => { try { renderLibrary(); } catch (e) { } });
    }).catch(() => { });
  }
  if (LOCAL_HTTP) { syncCustomPathsFromDisk(true); loadMineDirs(false); }
  try { gmkMount(); gmkRender(); setTimeout(() => { try { gmkCheckNew(); } catch (e) { } }, 1600); } catch (e) { }
  $('#projName').value = S.project.name;

  // highest uid wins
  S.canvases.forEach(c => [...c.parts, ...(c.detached || [])].forEach(p => {
    const m = /^p([a-z0-9]+)/.exec(p.uid || '');
    if (m) { const n = parseInt(m[1], 36); if (Number.isFinite(n)) uidSeq = Math.max(uidSeq, n); }
  }));

  pushHistory();
  renderAll();
  try { applyLang((S.settings && S.settings.lang) || 'zh'); } catch (e) { }
try { startI18nObserver(); } catch (e) { }
  requestAnimationFrame(() => fitView());
  setTimeout(() => { if (!S.userZoomed) fitView(); }, 260);

  const total = S.canvases.reduce((n, c) => n + c.parts.length, 0);
  setTimeout(() => toast(`已载入 ${S.canvases.length} 个体型画布 · ${total} 个部位`), 400);

  // mod art is stored in the html folder / localStorage, so a refresh keeps it
  // stale page guard: the window hit boxes come from the embedded data
  try {
    const hp = (D.details && D.details.hand && D.details.hand.parts) || [];
    if (!hp.length || !hp[0].hb) {
      toast('页面是旧版本（内嵌数据缺判定框），请按 Ctrl+F5 刷新后再导出', true);
    }
  } catch (e) { }

  hydrateArt().then(n => {
    if (S.hairRef && S.hairRef.img && EXT.has(S.hairRef.img)) {
      applyHair(S.hairRef.img, true);       // bring the reference back silently
      renderAll();
      return;
    }
    // 素材（含发型后层清单）是异步载入的：不管有没有新增，都重画一次，
    // 否则早先渲染出来的"没有后背层"会一直留着
    renderLibrary();
    renderAll();
    renderInspector();
  }).catch(() => {});
}

/* ---------------- 后台自动同步：有操作就把面板数据刷成最新的 ---------------- */
let AUTO_SYNC_T = 0;
function autoSync(delay) {
  clearTimeout(AUTO_SYNC_T);
  AUTO_SYNC_T = setTimeout(runAutoSync, delay == null ? 200 : delay);
}
function runAutoSync() {
  // 正在拖拽 / 画参考线时别动 DOM
  if (drag || winDrag || hairDrag || guideDrag) { autoSync(160); return; }
  // 这一轮没有数据改动（只是点了一下空白/工具栏）→ 什么都不用重画
  if (!UI_DIRTY) return;
  UI_DIRTY = false;
  const pane = document.getElementById('paneInspect');
  const keepScroll = pane ? pane.scrollTop : 0;
  const ae = document.activeElement;
  const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
  try {
    renderStage();
    renderTree();
    renderStatus();
    renderSelInfo();
    if (typeof syncRjwChip === 'function') syncRjwChip();
    if (typeof syncLockChip === 'function') syncLockChip();
    if (typeof syncOffChip === 'function') syncOffChip();
    if (typeof syncViewSwitches === 'function') syncViewSwitches();
    if (!typing) renderInspector();      // 正在输入就不重建，免得丢光标
    renderLibrary();
    renderRefDock();
  } catch (e) { /* 单个渲染失败不该拖垮整页 */ }
  if (pane) pane.scrollTop = keepScroll;
}
document.addEventListener('pointerup', () => autoSync(), true);
document.addEventListener('click', () => autoSync(40), true);
document.addEventListener('change', () => autoSync(0), true);

boot();

/* dev hook: open the page with #dev to script the editor from the console */
if (location.hash === '#dev') {
  window.__nhtDev = { S, D, EXT, parseRaceMod, buildGeneLooks, applyGeneState, pickGeneVariant, geneShortName, parseAddonNode, findBackHair, hairBackIndex, bodyPartList, canvasBodyIdx, aboutVersion, aboutSetVersion, harHairOf, isVanillaHairRace, findBackHair, ahogeKeyOf, hairPathIsBackDir, hairIsBackName, syncCustomPathsFromDisk, autoCropApplied, flushCroppedForCanvas, assetMenu, mineMoveAsset, modCategoryFor, cleanTitle, hairNormBase, HAIRS, HAIR_BACK_DIRS, canvasDirty, canvasSig, loadHairMap, applyHairMap, ensureGrayArt, migrateVariantGrays, migrateAllVariantGrays, flushGrayForCanvas, flushAllGrayArt, savePatchToMod, saveProjectFile, hairNormBase, hairIsBackName, migrateRaceBids, nhtSlotMap, autoAlignRaceBids, syncBodyPartsFromGame, loadBodyMap, fixBidsWithMap, applyBodyMapFix, registerRaceTextures, createRaceCanvas, pickRace, createFromRace, addRaceAssets, setHairs, applyHair, renderAll, fitView, pushHistory, renderTabs, renderInspector, renderTree, addPart, canvasBounds, validateAll, buildPatchXML, renderStatus, importArtFolder, addHairFiles, saveArtToAssets, artSavePlan, artSelMatch, artSubOf, modalArtSave, artProgress, modalArtProgress, pickArtDir, artClearAll, artPut, hydrateArt, getHAIRS: () => HAIRS, getASSETS: () => ASSETS, artNeedsLocalSave, injectArtChecks, artSelList, setDiskArt: (rows) => { DISK_ART = rows || []; }, progStart, progStep, progDone, renderLibrary, imgURL, alphaBoxAsync, applyProject, partXML, exportFit, syncDisplayBox, placeDisplayBox, renderInspector, renderStage, getModalState: () => modalState, boundOf, BOUND_PRESETS, normalizeBox, dollXML, projectPayload, hairFits, detailPartXML, raceSlotFor, apiSave, pickAt, hairSolidAt, pushCustomTextures, partPixelSolid, alphaDataOf: (k) => ALPHA_DATA.get(k) || null, fixCanvasBids, officialBidFor, exportHitbox, originalHitbox, defPrefix, uniqueNewId, nhtDefNames, exportBid, humanSlotIndex, paintPart, registerCustomAsset, CUSTOM, measureAlpha, alphaBoxAsync, bakeRotation, overflowParts, gameCanvasOf, validateAll, mineState, mineAssign, mineNewFolder, mineRenameFolder, assetMenu, exportAsset, markFollowParts, addonSouthArtMap, addonsForPart, isHairLikeAddon, followRank, findSideHair, sideHairOf, hairIsSideName };
}
})();
