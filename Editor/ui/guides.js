/* ============================================================
 * 指南内容（可自行修改）
 * ------------------------------------------------------------
 * 每条格式：
 *   { title: '标题', body: `HTML 内容` }
 *
 * 可以用的样式：
 *   <b class="g-opt">要做 / 要设置的</b>   → 橙色
 *   <b class="g-bad">弊端 / 注意</b>        → 红色
 *   <ul class="g-ul"><li>…</li></ul>       → 普通列表
 * ============================================================ */
window.NHT_GUIDES = [
  {
    title: '怎么让「非 HAR 发型」显示颜色',
    body: `
      <p>RatKin / Wolfein 这类种族用的是<b>原版 HairDef</b>，NHT 面板默认只画部位、不画头发，所以看起来是光头。</p>
      <p>做法：打开 <b class="g-opt">HAR 头发</b> 分栏 → 打开 <b class="g-opt">发型重绘</b> →
         调好 <b class="g-opt">缩放 / 偏移 X / 偏移 Y / 层级</b>，并确认
         <b class="g-opt">导出发型坐标</b> 是开着的，然后保存到注入模组。</p>
      <p><b class="g-bad">副作用：</b>发型重绘是在所有部位画完之后再补画一遍头发，
         所以耳朵、角、呆毛这些位置比头发高的部位会被头发盖住。</p>
      <p>解决办法：给被盖住的部位打开 <b class="g-opt">部位属性 → 置顶重画</b>，
         它会在头发之后单独补画一次，于是又回到最上层。</p>
      <p><b class="g-bad">另一个弊端（颜色偏差）：</b>重绘出来的发型颜色可能和原本默认显示的<b>白色头发</b>有偏差 ——
         发色是乘算上去的，重绘层会再叠一次，看起来不完全一致；位置也可能需要<b>一层一层手动微调</b>，
         才能和默认显示的白发对齐、盖住。建议最后进游戏实际看一眼再收尾。</p>
      <p><b class="g-bad">置顶重画的弊端：</b>重画只还原贴图、位置和大小，
         该部位原本由 NHT 叠加的疤痕 / 伤口 / 包扎会看不见，悬停信息也可能缺失；
         所以它是装饰用途，建议只给耳朵、角、头饰这类没有生命值的部位打开。</p>
    `
  },
  {
    title: '头发层级是怎么决定谁盖住谁的',
    body: `
      <p>模组画头发时不是“永远最后画”，而是按当前种族的<b class="g-opt">头发层级</b>插在中间：
         头发会在第一个「图层 ≥ 头发层级」的部位之前绘制。</p>
      <ul class="g-ul">
        <li>图层 <b>小于</b> 头发层级 → 被头发盖住（例如头部 13 / 头发 14）</li>
        <li>图层 <b>大于</b> 头发层级 → 盖住头发（例如耳朵 15 / 头发 14）</li>
      </ul>
      <p>头发层级来自 <b class="g-opt">HAR 头发 → 层级</b>，必须勾选
         <b class="g-opt">导出发型坐标</b> 才会写进补丁；没写进补丁时游戏用默认值 15。</p>
    `
  },
  {
    title: 'GIT 书签：查看 / 应用 / 只读预览',
    body: `
      <p>「体型画布」面板右边缘有一枚绿色 <b class="g-opt">GIT 书签</b>。
         它读的是仓库里 <code>Editor/canvases/</code> 的提交记录，最多显示最近 <b>3 个版本</b>。</p>
      <ul class="g-ul">
        <li>点书签展开：每个版本一组，默认只展开最新一版</li>
        <li>卡片带缩略图，<b class="g-opt">点卡片 = 只读预览</b>（画布区显示，但不能编辑）</li>
        <li>想真正改这张：点卡片右上角的 <b class="g-opt">应用</b> → 写入项目并进入可编辑</li>
        <li>应用后卡片变灰、按钮变 <b class="g-opt">撤销</b>；同一张画布被新版本应用时，旧卡片显示「已替代」</li>
      </ul>
      <p><b class="g-bad">注意：</b>只读预览时，点画布、按 Delete、改右侧属性、<b>导出补丁 / 注入模组 / 导出模组文件</b>
         都会被拦下并提示；要先应用（或还原）把画布写进项目，才能导出与注入。</p>
      <p>仓库里还没有画布提交时，书签会提示「先在仓库同步 REPO 推送一次画布」。</p>
    `
  },
  {
    title: '最近改动：还原被替换 / 删除的画布',
    body: `
      <p>「体型画布」列表下面固定一块 <b class="g-opt">最近改动</b>，最多保留 <b>5 张</b>：</p>
      <ul class="g-ul">
        <li><b>删除</b>画布 → 记一条「删除」（红色标签）</li>
        <li>书签应用替换掉同名画布 → 记一条「替换」（黄色标签）</li>
      </ul>
      <p>每行都有缩略图、标题、Doll、部位数和时间。点一下是<b class="g-opt">只读预览</b>，
         <b class="g-opt">右键那行 → 还原</b>（只有这一个选项）把画布放回项目，之后就能正常编辑。</p>
    `
  },
  {
    title: '推送弹窗：为什么有些文件默认锁住',
    body: `
      <p>推送前会先列出本地改动，默认全部勾选，但下面这些会<b class="g-opt">默认锁定（红色）</b>：</p>
      <ul class="g-ul">
        <li><code>Editor/history</code>：本地保存快照，每次都不同</li>
        <li><code>Editor/nht-project.js</code>：你自己的画布数据</li>
        <li><code>Editor/assets</code>：本机导入的素材库</li>
        <li><code>*.bak</code> / <code>*.tmp</code> / <code>*.log</code> / <code>Source/bin</code> / <code>Source/obj</code> / <code>Source/build</code></li>
      </ul>
      <p>原因：这些是<b class="g-bad">每个人本地不同</b>的数据，推上去会把别人拉下来的覆盖掉。
         需要共享时点锁图标解锁即可。</p>
      <p>提交说明必填（会变成提交标题），下面的「提交描述」是可选的多行正文，
         可以直接写这次改了哪些种族 / 部位。</p>
    `
  },
  {
    title: '语言切换 / English',
    body: `
      <p>顶栏右侧的圆点按钮是语言切换：<b class="g-opt">橙色 = 中文</b>，<b class="g-opt">蓝色 = English</b>。</p>
      <p>选择会保存在项目设置里，下次打开编辑器继续使用。切换后顶栏、左右侧栏、弹窗、提示和画布检查都会跟着更新。</p>
      <p><b class="g-bad">说明：</b>画布、种族、部位、素材等来自模组的数据名称保持原样；少数还没收录的深层文案会回退中文。</p>
    `
  },
  {
    title: '异种：自动导入 + 彩色圆点预览',
    body: `
      <p>「<b class="g-opt">导入异种</b>」会扫描模组里的 XenotypeDef、HAR body Hediff 和隐藏外观 Hediff，并自动生成基因外观；外观贴图会先自动猜图，猜错再手动换。</p>
      <ul class="g-ul">
        <li>有异种的画布<b>右下角</b>会出现一列彩色圆点，颜色取该异种第一张部位贴图的平均色</li>
        <li>点圆点切换预览；点「基础」恢复；顶部小圆钮折叠</li>
        <li>异种页可以按基因 / Hediff / 异种条件单独调整部位覆盖</li>
      </ul>
      <p><b class="g-bad">注意：</b>重新「导入异种」会重新生成基因异种并覆盖旧的 <code>v.gen</code>；手动改过的部位覆盖需要重新调整。</p>
    `
  },
  {
    title: '发型与发色：跟随 / 层级 / 导出',
    body: `
      <p>发型页的「<b class="g-opt">导出发型坐标</b>」打开后，缩放 / 偏移 / 层级才会写进补丁；关闭时游戏使用默认值。</p>
      <p>耳朵 / 尾巴这类 <code>bodyAddon colorChannel=hair</code> 的部位，在部位属性里打开「<b class="g-opt">发色</b>」后会跟随小人当前发色（<code>story.hairColor</code>）；关闭色彩时自动不染色。</p>
      <ul class="g-ul">
        <li>层级越大越靠上；后背层固定在所有部位之下</li>
        <li>「命中框」区块的「画布像素直出」打开后，游戏判定框 = 画布框 / 512</li>
        <li>导出偏移只平移游戏坐标，编辑器画面不变</li>
      </ul>
    `
  },
  {
    title: '画布检查徽章：缺贴图 / 灰度 / 异种 / 注入',
    body: `
      <p>画布右上角的徽章是<b class="g-opt">画布检查</b>：<b class="g-bad">红色 = 有缺失或错误</b>，绿色 = 正常。</p>
      <p>点开可以看到：</p>
      <ul class="g-ul">
        <li>贴图 / 灰度图是否在磁盘、是否在对应目录</li>
        <li>异种贴图和异种灰度是否在正确文件夹</li>
        <li>发型参数、部位颜色、置顶联动、注入状态</li>
      </ul>
      <p>检查项右侧会给出「去发型页 / 生成并写入灰图 / 迁移并写入灰度 / 同步素材 / 立即注入」等修复按钮。</p>
    `
  },
  {
    title: 'Git 推送 / 拉取',
    body: `
      <p>推送前会列出本地改动：默认全选，但 <code>Editor/history</code>、<code>nht-project.js</code>、<code>*.bak</code>、编译产物等<b class="g-opt">个人数据默认锁定</b>，避免覆盖别人。</p>
      <ul class="g-ul">
        <li>「推送更改」= 提交 + push；第一次推会自动在远端创建当前分支</li>
        <li>「拉取远端」= 把远端的新提交同步下来；有未拉取提交时按钮会发光并显示数量</li>
        <li>分支名可以自由设置；多人协作时建议用自己的 <code>feature-名字</code> 分支，推上去再合并</li>
      </ul>
      <p><b class="g-bad">注意：</b>推送树里文件的说明来自 <code>ui/file-notes.html</code>；需要时可以自己维护。</p>
    `
  }
];

window.NHT_GUIDES_EN = [
  {
    title: 'How to make non-HAR hair show color',
    body: `
      <p>Races such as RatKin / Wolfein use <b>vanilla HairDef</b>; the NHT panel draws parts but not hair by default, so they look bald.</p>
      <p>Open the <b class="g-opt">HAR hair</b> tab → turn on <b class="g-opt">Hair redraw</b> → tune
         <b class="g-opt">Scale / Offset X / Offset Y / Layer</b>, make sure
         <b class="g-opt">Export hair offsets</b> is on, then save to the injected mod.</p>
      <p><b class="g-bad">Side effect:</b> redraw draws the hair again after all parts, so parts higher than the hair (ears, horns, ahoge) are covered by the hair.</p>
      <p>Fix: turn on <b class="g-opt">Part properties → On-top redraw</b> for the covered parts; they are drawn again after the hair and go back on top.</p>
      <p><b class="g-bad">Another downside (color):</b> the redrawn hair color may differ from the default <b>white hair</b> — hair color is multiplied and the redraw layer adds again; positions may need manual per-layer tuning. Check in game before finishing.</p>
      <p><b class="g-bad">On-top redraw downside:</b> it only restores texture, position and size; scars / wounds / bandages added by NHT on that part become invisible and hover info may be missing. Use it for decorations only (ears, horns, hats).</p>
    `
  },
  {
    title: 'How the hair layer decides what covers what',
    body: `
      <p>The mod doesn't draw hair last; it inserts it by the race's <b class="g-opt">hair layer</b>: hair is drawn before the first part with layer ≥ hair layer.</p>
      <ul class="g-ul">
        <li>Layer <b>below</b> the hair layer → covered by hair (e.g. head 13 / hair 14)</li>
        <li>Layer <b>above</b> the hair layer → covers the hair (e.g. ears 15 / hair 14)</li>
      </ul>
      <p>The hair layer comes from <b class="g-opt">HAR hair → Layer</b>; it is written only when
         <b class="g-opt">Export hair offsets</b> is checked; otherwise the game uses 15.</p>
    `
  },
  {
    title: 'GIT bookmark: view / apply / read-only preview',
    body: `
      <p>There is a green <b class="g-opt">GIT bookmark</b> on the right edge of the Body canvases panel. It reads commits under <code>Editor/canvases/</code> and shows up to the last <b>3 versions</b>.</p>
      <ul class="g-ul">
        <li>Click to expand; one group per version, newest expanded by default</li>
        <li>Cards have thumbnails; <b class="g-opt">clicking a card = read-only preview</b> (shown on the canvas but not editable)</li>
        <li>To edit: click <b class="g-opt">Apply</b> on the card → written into the project and editable</li>
        <li>After applying the card is grayed out and the button becomes <b class="g-opt">Undo</b>; if a newer version replaces the same canvas, the old card shows Replaced</li>
      </ul>
      <p><b class="g-bad">Note:</b> in read-only preview, clicking the canvas, Delete, property edits,
         <b>export patch / inject mod / export mod files</b> are blocked; apply (or restore) first.</p>
      <p>If the repo has no canvas commits, the bookmark asks you to push a canvas once.</p>
    `
  },
  {
    title: 'Recent changes: restore replaced / deleted canvases',
    body: `
      <p><b class="g-opt">Recent changes</b> below the canvas list keeps up to <b>5</b> canvases:</p>
      <ul class="g-ul">
        <li>Deleted canvas → a "delete" entry (red tag)</li>
        <li>Canvas replaced by bookmark Apply → a "replace" entry (yellow tag)</li>
      </ul>
      <p>Each row has a thumbnail, title, Doll, part count and time. Click for <b class="g-opt">read-only preview</b>;
         <b class="g-opt">right-click the row → Restore</b> (the only option) puts the canvas back, then it can be edited normally.</p>
    `
  },
  {
    title: 'Push dialog: why some files are locked',
    body: `
      <p>The push dialog lists local changes first, all checked by default, but these are <b class="g-opt">locked (red)</b>:</p>
      <ul class="g-ul">
        <li><code>Editor/history</code>: local save snapshots, different every time</li>
        <li><code>Editor/nht-project.js</code>: your own canvas data</li>
        <li><code>Editor/assets</code>: locally imported asset library</li>
        <li><code>*.bak</code> / <code>*.tmp</code> / <code>*.log</code> / <code>Source/bin</code> / <code>Source/obj</code> / <code>Source/build</code></li>
      </ul>
      <p>Reason: these are <b class="g-bad">different on every machine</b>; pushing them would overwrite others' data.
         Unlock with the lock icon when you need to share them.</p>
      <p>Commit message is required (becomes the title); Commit description is optional multi-line text for what changed.</p>
    `
  },
  {
    title: 'Language switch / English UI',
    body: `
      <p>The dot button at the right of the top bar is the language switch: <b class="g-opt">orange = 中文</b>, <b class="g-opt">blue = English</b>.</p>
      <p>Your choice is saved in the project settings and restored next time. The top bar, side panels, dialogs, tips and canvas checks all update.</p>
      <p><b class="g-bad">Note:</b> data names from mods (canvases, races, parts, assets) stay as-is; a few deep strings not yet in the dictionary fall back to Chinese.</p>
    `
  },
  {
    title: 'Xenotypes: auto import + colored dot preview',
    body: `
      <p><b class="g-opt">Import xenotypes</b> scans the mod for XenotypeDefs, HAR body Hediffs and hidden appearance Hediffs, then generates gene looks automatically. Appearance textures are auto-guessed first; replace them manually if wrong.</p>
      <ul class="g-ul">
        <li>Canvases with xenotypes show <b>a column of colored dots at the bottom-right</b>, using the average color of each xenotype's first texture</li>
        <li>Click a dot to preview; click Base to reset; the top dot collapses the rail</li>
        <li>The xenotype page lets you adjust part overrides per gene / Hediff / xenotype condition</li>
      </ul>
      <p><b class="g-bad">Note:</b> re-importing regenerates gene xenotypes and replaces the old <code>v.gen</code>; manual overrides need re-adjusting.</p>
    `
  },
  {
    title: 'Hair & hair color: follow / layer / export',
    body: `
      <p>With <b class="g-opt">Export hair offsets</b> on in the Hair tab, scale / offset / layer are written into the patch; when off the game uses defaults.</p>
      <p>For <code>bodyAddon colorChannel=hair</code> parts such as ears and tails, turn on <b class="g-opt">Hair color</b> in the part properties to follow the pawn's current hair color (<code>story.hairColor</code>); it is skipped when color is off.</p>
      <ul class="g-ul">
        <li>Higher layers are on top; the back layer is always below all parts</li>
        <li>With Canvas-pixel hitbox on, the in-game hitbox = canvas box / 512</li>
        <li>Export offset only shifts game coordinates; the editor view is unchanged</li>
      </ul>
    `
  },
  {
    title: 'Canvas check badge: textures / grayscale / xenotypes / injection',
    body: `
      <p>The badge at the top-right is the <b class="g-opt">canvas check</b>: <b class="g-bad">red = missing files or errors</b>, green = OK.</p>
      <p>Click it to see:</p>
      <ul class="g-ul">
        <li>Whether textures / grayscale images are on disk and in the right folder</li>
        <li>Whether xenotype textures and grayscale are in the matching folder</li>
        <li>Hair params, part color, on-top link and injection state</li>
      </ul>
      <p>Each item has fix buttons such as Go to Hair / Generate grayscale / Migrate grayscale / Sync assets / Inject now.</p>
    `
  },
  {
    title: 'Git push / pull',
    body: `
      <p>The push dialog lists local changes first: everything is checked by default, but <code>Editor/history</code>, <code>nht-project.js</code>, <code>*.bak</code> and build outputs are <b class="g-opt">locked by default</b> so they won't overwrite others.</p>
      <ul class="g-ul">
        <li>Push changes = commit + push; the first push creates the branch on the remote</li>
        <li>Pull remote = fetch new commits; the button glows with a count when behind</li>
        <li>The branch name is configurable; for collaboration use a <code>feature-name</code> branch and merge after pushing</li>
      </ul>
      <p><b class="g-bad">Note:</b> file notes in the push tree come from <code>ui/file-notes.html</code>; you can maintain that file yourself.</p>
    `
  }
];
