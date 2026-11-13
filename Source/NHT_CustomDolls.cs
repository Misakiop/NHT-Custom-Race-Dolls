using System;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using HarmonyLib;
using RimWorld;
using UnityEngine;
using Verse;
using NiceHealthTab;

namespace NHT_CustomDolls
{
    // 编辑器生成的形态映射：fromBody（附加形态）→ toBody（本画布主形态）
    public class BodyAliasDef : Def
    {
        public string race = "*";
        public string fromBody = "";
        public string toBody = "";
    }

    // 编辑器生成的按条件切换贴图：颜色变体 / 异种 / 基因 / 优先级
    public class ColorVariantDef : Def
    {
        public string race = "*";
        public string bodyType = "*";
        public string hediff = "";
        public string xenotype = "";
        public List<string> genes = new List<string>();
        public List<string> notGenes = new List<string>();
        public int priority = 0;
        public List<ColorVariantPart> parts = new List<ColorVariantPart>();
    }

    public class ColorVariantPart
    {
        public string part = "";
        public string imagePath = "";
        public string grayPath = "";
        public float x = float.NaN;
        public float y = float.NaN;
        public float width = float.NaN;
        public float height = float.NaN;
    }

    // 编辑器自动识别：这些部位跟随小人当前发色（HAR bodyAddon colorChannel=hair）
    public class HairTintDef : Def
    {
        public string race = "*";
        public string doll = "*";
        public List<string> parts = new List<string>();
    }

    // 编辑器自动识别：这些部位跟随小人身上实际 HAR bodyAddon 的贴图 / 颜色 / 旋转
    public class AddonFollowPart
    {
        public string part;
        public string addon;
        public string path;
        public float rot;
    }
    public class AddonFollowDef : Def
    {
        public string race = "*";
        public string doll = "*";
        public List<AddonFollowPart> parts = new List<AddonFollowPart>();
    }

    // ------------------------------------------------------------------ settings
    public class CustomDollsSettings : ModSettings
    {
        // key = "race|gender|bodytype" (any part may be "*"), value = HumanlikeDoll defName
        public Dictionary<string, string> rules = new Dictionary<string, string>();
        // 骨骼 / 器官视图里是否显示 HAR 头发（默认关闭）
        public bool showHairInXray = false;
        // 调试模式：输出启动信息、诊断日志、缺图警告等（默认关闭）
        public bool debug = false;
        // t43：调试日志同时写入 Config/NHTCD_Debug.log（默认开；关闭后只写 Player.log）
        public bool debugLogToFile = true;
        // 把所有发型类 addon 全画出来（默认关闭：只画主发 + 后发，避免多个发型叠在头上）
        public bool drawAllHairLayers = false;
        // 部位颜色总开关（默认开 = 正常显示）；关闭时，编辑器里标记过的部位会按灰度绘制
        public bool desatColorsOn = true;
        // 非 HAR 发型按发色重绘（默认开）：控制原版 HairDef 种族是否补画彩色发型
        public bool tintVanillaHair = true;
        // 非 HAR 发型使用编辑器/游戏内坐标（默认关 = 保持 NHT 原版几何）
        public bool vanillaHairUseEditor = false;
        // HAR 发型使用游戏内坐标（默认开）
        public bool harHairUseEditor = true;
        // HAR 发色显示（默认开）：关掉 = HAR 头发不按发色染色
        public bool harHairTint = true;
        // 自动校正发型错位（默认开）
        public bool autoFixHair = true;
        // 自动校正缓存： "race|shiftFrac"
        public List<string> hairAutoFix = new List<string>();
        // 开启了「与全族同步」的小人（thingID）
        public List<string> hairSyncPawns = new List<string>();
        // 手动拖动过滑条的小人（自动校正用更宽的阈值）
        public List<string> hairManualPawns = new List<string>();
        // 按小人的开关状态： "id:0/1"（1=开）
        public List<string> pawnCustom = new List<string>();
        public List<string> pawnColor = new List<string>();
        // 按小人保存的坐标调整： "pawnID|scale|ox|oy"
        public List<string> hairPawnOverrides = new List<string>();
        // 按种族强制关闭「色彩显示」（默认空；需要灰显的种族由玩家在设置页手动添加）。
        public List<string> colorOffRaces = new List<string>();
        // v6：编辑器「默认开色彩」开关导出的种族；每个种族只迁移一次，之后玩家手动开关不被覆盖。
        public List<string> colorDefaultOnDone = new List<string>();
        // v5：Monolyn / Epona Unicorn 默认开色彩，只有它们的发型不乘发色
        // （由 Dolls.HairTintOffRace 单独处理）。
        public bool colorDefaultsV5;
        // 旧版每次读档都把 Mincho_ThingDef 强塞进 colorOffRaces（导致「色彩显示」永远回不到开）：
        // 用这个一次性标记做迁移，之后不再强制加回。
        public bool minchoColorFixV1;
        // 旧版齿轮窗把「本人」的色彩状态写成了全局 desatColorsOn / tintVanillaHair，一旦落盘
        // 所有种族都变灰、而且本窗口再也写不回来（t8/t9 症状 2/4）。用这个一次性标记做迁移，
        // 只在「两个开关同时为 false」的旧签名下恢复 true；只改内存，不 Write()。
        public bool colorFixV2;
        // 关掉坐标的种族：key = race defName
        public List<string> vanillaHairOff = new List<string>();
        // 游戏内实时调整过的值： "race|scale|offX|offY"（覆盖编辑器导出的值）
        public List<string> hairOverrides = new List<string>();
        // 单独关掉颜色的部位：key = "doll#bodyPartId"
        public List<string> desatOff = new List<string>();
        // 形态别名后缀：例如 _YR_Bote → 复用去后缀的形态（Mincho RJW 附加形态共用主形态画布）
        public List<string> bodyAliasSuffixes = new List<string> { "_YR_Bote" };
        // 原版发型补画层（Mincho 等原版 HairDef 种族，按发色补画一次；关闭后不再补画）
        public bool enableHairTintOverlay = true;
        // HAR bodyAddon 跟随（光环/呆毛等按实际 addon 贴图和颜色绘制）
        public bool enableAddonFollow = true;
        // 命中框偏移（编辑器导出的 HitboxOffsetExtension）
        public bool enableHitboxOffset = true;
        // 护甲图标位置（消费编辑器导出的 notifyPosition；关闭后图标回到 NHT 默认的部位矩形中心）
        public bool armorIconOffset = true;
        // 异种/基因/状态颜色变体（ColorVariantDef）
        public bool enableColorVariants = true;
        // 非HAR发型阴影：开（默认）= 关色彩时由本模组按灰度画（保留贴图明暗）；
        // 关 = 关色彩时不插手，交回 NHT 原生 DrawHairClipped，显示原版发型
        public bool nonHarHairShadow = true;
        // 内置补丁：Nice Health Tab - RJW Genitalia 的面板/按钮/肛门窗口随娃娃列尺寸自适应，
        // 并让 LFS 等自绘列也能应用部位状态（默认关闭；开关在设置页「内置补丁」栏）。
        public bool rjwLayoutAdapt = false;
        // 内置补丁：RJW 的胸部/乳头画在头发层之下，让长发盖住它们（关闭 = RJW 原样，胸盖头发）。
        public bool rjwHairOverChest = true;
        // t141：一次性迁移——自动锚定已移除，清掉它当年写进「按小人」的个人发型校准
        public bool hairAnchorCleanupV1;

        /* t141：自动锚定已整个移除。它当年通过 HairTuning.MarkManual/Set 往 hairManualPawns 和
           hairPawnOverrides（"p<id>|scale|ox|oy"）里写过按小人的校准值；这些残留在重置/换发型后
           仍会覆盖种族默认值。这里做一次性迁移：清空按小人的校准与 manual 标记，只保留按种族的。 */
        public void CleanupAnchorLeftovers()
        {
            if (hairAnchorCleanupV1) return;
            hairAnchorCleanupV1 = true;
            int removed = 0;
            try
            {
                if (hairPawnOverrides != null) { removed = hairPawnOverrides.Count; hairPawnOverrides.Clear(); }
                if (hairManualPawns != null) hairManualPawns.Clear();
            }
            catch (Exception) { }
            Write();
            Log.Message("[NHT Custom Dolls] cleared " + removed + " per-pawn hair calibration(s) left by the removed auto-anchor.");
        }

        public override void ExposeData()
        {
            Scribe_Collections.Look(ref rules, "rules", LookMode.Value, LookMode.Value);
            Scribe_Values.Look(ref showHairInXray, "showHairInXray", false);
            Scribe_Values.Look(ref debug, "debug", false);
            Scribe_Values.Look(ref debugLogToFile, "debugLogToFile", true);
            Scribe_Values.Look(ref drawAllHairLayers, "drawAllHairLayers", false);
            Scribe_Values.Look(ref desatColorsOn, "desatColorsOn", true);
            Scribe_Values.Look(ref enableHairTintOverlay, "enableHairTintOverlay", true);
            Scribe_Values.Look(ref enableAddonFollow, "enableAddonFollow", true);
            Scribe_Values.Look(ref enableHitboxOffset, "enableHitboxOffset", true);
            Scribe_Values.Look(ref armorIconOffset, "armorIconOffset", true);
            Scribe_Values.Look(ref enableColorVariants, "enableColorVariants", true);
            Scribe_Values.Look(ref nonHarHairShadow, "nonHarHairShadow", true);
            Scribe_Values.Look(ref rjwLayoutAdapt, "rjwLayoutAdapt", false);
            Scribe_Values.Look(ref rjwHairOverChest, "rjwHairOverChest", true);
            Scribe_Values.Look(ref hairAnchorCleanupV1, "hairAnchorCleanupV1", false);
            Scribe_Values.Look(ref tintVanillaHair, "tintVanillaHair", true);
            Scribe_Values.Look(ref harHairUseEditor, "harHairUseEditor", true);
            Scribe_Values.Look(ref harHairTint, "harHairTint", true);
            Scribe_Collections.Look(ref hairSyncPawns, "hairSyncPawns", LookMode.Value);
            Scribe_Collections.Look(ref hairManualPawns, "hairManualPawns", LookMode.Value);
            Scribe_Collections.Look(ref pawnCustom, "pawnCustom", LookMode.Value);
            Scribe_Collections.Look(ref pawnColor, "pawnColor", LookMode.Value);
            if (Scribe.mode == LoadSaveMode.PostLoadInit && pawnCustom == null) pawnCustom = new List<string>();
            if (Scribe.mode == LoadSaveMode.PostLoadInit && pawnColor == null) pawnColor = new List<string>();
            if (Scribe.mode == LoadSaveMode.PostLoadInit && hairManualPawns == null) hairManualPawns = new List<string>();
            if (Scribe.mode == LoadSaveMode.PostLoadInit && hairSyncPawns == null) hairSyncPawns = new List<string>();
            Scribe_Collections.Look(ref hairPawnOverrides, "hairPawnOverrides", LookMode.Value);
            if (Scribe.mode == LoadSaveMode.PostLoadInit && hairSyncPawns == null) hairSyncPawns = new List<string>();
            Scribe_Values.Look(ref autoFixHair, "autoFixHair", true);
            Scribe_Collections.Look(ref hairAutoFix, "hairAutoFix", LookMode.Value);
            if (Scribe.mode == LoadSaveMode.PostLoadInit && hairAutoFix == null) hairAutoFix = new List<string>();
            if (Scribe.mode == LoadSaveMode.PostLoadInit && hairPawnOverrides == null) hairPawnOverrides = new List<string>();
            Scribe_Collections.Look(ref colorOffRaces, "colorOffRaces", LookMode.Value);
            Scribe_Values.Look(ref colorDefaultsV5, "colorDefaultsV5", false);
            Scribe_Collections.Look(ref colorDefaultOnDone, "colorDefaultOnDone", LookMode.Value);
            Scribe_Values.Look(ref minchoColorFixV1, "minchoColorFixV1", false);
            Scribe_Values.Look(ref colorFixV2, "colorFixV2", false);
            if (Scribe.mode == LoadSaveMode.PostLoadInit)
            {
                if (colorOffRaces == null) colorOffRaces = new List<string>();
                if (colorDefaultOnDone == null) colorDefaultOnDone = new List<string>();
                // 旧版 bug：每次 PostLoadInit 都无条件把 Mincho_ThingDef 加进 colorOffRaces，
                // 使得 ColorOff(Mincho) 恒真、「色彩显示」永远回不到开。这里只改内存、不 Write()
                // （Scribe 读取过程中重入写盘不安全）；minchoColorFixV1 会随下次正常保存落盘，
                // 期间每次读档重复 Remove 是幂等无害的。
                if (!minchoColorFixV1)
                {
                    minchoColorFixV1 = true;
                    colorOffRaces.Remove("Mincho_ThingDef");
                }
                // t10-P9：一次性恢复被旧齿轮窗写坏的全局色彩开关。只认「两个开关同时为 false」这个
                // 旧签名（只关 tintVanillaHair 可能是用户主动关的「原版发型上色」，不能动）。
                // 同样只改内存、不 Write()，标记/开关随下次正常保存一起落盘。
                if (!colorFixV2)
                {
                    colorFixV2 = true;
                    if (!desatColorsOn && !tintVanillaHair)
                    {
                        desatColorsOn = true;
                        tintVanillaHair = true;
                        // t43：一次性提示，同时落一份到调试文件
                        // t47-F5：此刻 Settings 仍为 null，LogDebug 会 return；置标记由 Bootstrap 补发
                        Dolls.PendingColorRestore = true;
                        Dolls.LogDebug("color:restore", "[NHT color] restore desatColorsOn=true (legacy)");
                    }
                }
                // v5：Monolyn / Epona Unicorn 改为默认开色彩，只让发型不乘发色。
                // 旧默认表曾把这两族整族写进 colorOffRaces（连身体一起灰），
                // 这里一次性移出；之后玩家手动开关不会被覆盖。
                if (!colorDefaultsV5)
                {
                    colorDefaultsV5 = true;
                    colorOffRaces.Remove("Alien_Unicorn");
                    colorOffRaces.Remove("MNRace");
                    colorOffRaces.Remove("Monolyn");
                }
            }
            Scribe_Collections.Look(ref vanillaHairOff, "vanillaHairOff", LookMode.Value);
            Scribe_Collections.Look(ref hairOverrides, "hairOverrides", LookMode.Value);
            if (Scribe.mode == LoadSaveMode.PostLoadInit && vanillaHairOff == null) vanillaHairOff = new List<string>();
            if (Scribe.mode == LoadSaveMode.PostLoadInit && hairOverrides == null) hairOverrides = new List<string>();
            Scribe_Collections.Look(ref desatOff, "desatOff", LookMode.Value);
            Scribe_Collections.Look(ref bodyAliasSuffixes, "bodyAliasSuffixes", LookMode.Value);
            if (Scribe.mode == LoadSaveMode.PostLoadInit && (bodyAliasSuffixes == null || bodyAliasSuffixes.Count == 0))
            {
                bodyAliasSuffixes = new List<string> { "_YR_Bote" };
            }
            if (Scribe.mode == LoadSaveMode.PostLoadInit && rules == null)
            {
                rules = new Dictionary<string, string>();
            }
            if (Scribe.mode == LoadSaveMode.PostLoadInit && desatOff == null)
            {
                desatOff = new List<string>();
            }
            // t43：读档/存档是低频事件，顺手把调试日志缓冲落盘（不依赖 0.5s 节流，
            // 保证「读档后立刻看文件」也能看到本会话 header 与之前累积的行）。
            // t47-B1：外层再加一次开关判断（双保险），默认 debug=false 时这里完全不碰磁盘。
            if ((Scribe.mode == LoadSaveMode.PostLoadInit || Scribe.mode == LoadSaveMode.Saving)
                && Dolls.DbgFile.Enabled)
            {
                try { Dolls.DbgFile.Flush(); }
                catch (Exception) { }
            }
        }
    }

    public class CustomDollsMod : Verse.Mod
    {
        public static CustomDollsSettings Settings;

        public CustomDollsMod(ModContentPack content) : base(content)
        {
            Settings = GetSettings<CustomDollsSettings>();
            try { Settings.CleanupAnchorLeftovers(); } catch (Exception) { }
            // t120：必须在这里装——def 加载（ThingDef.PostLoad）早于 [StaticConstructorOnStartup]，
            // 晚一步就拦不住 Nice Health Tab 在 ShaderTypeDef.get_Shader 上提前初始化 Assets。
            // t121：仅 1.7（Waylith/无 Unity）需要；1.6 是 Mono+Unity，不走这个守卫。
#if !NHT_16
            ShaderLoadGuard.Install();
#endif
        }

        public override string SettingsCategory()
        {
            return Translator.Translate("NHTCD_SettingsCategory").ToString();
        }

        public override void DoSettingsWindowContents(Rect inRect)
        {
            DollSettingsUI.Draw(inRect);
        }
    }

    // ------------------------------------------------------------------ 部位颜色（去色）
    public static class Desat
    {
        private class Entry
        {
            public readonly List<string> names = new List<string>();
            public readonly List<int> ids = new List<int>();
        }
        private static Dictionary<string, Entry> byRace;
        private static Dictionary<string, Entry> byDoll;
        private static bool loaded;

        public static void Ensure()
        {
            if (loaded) return;
            loaded = true;
            byRace = new Dictionary<string, Entry>(StringComparer.OrdinalIgnoreCase);
            byDoll = new Dictionary<string, Entry>(StringComparer.OrdinalIgnoreCase);
            try
            {
                foreach (DesatPartsDef d in DefDatabase<DesatPartsDef>.AllDefs)
                {
                    if (d == null || d.parts == null || d.parts.Count == 0) continue;
                    if (!string.IsNullOrEmpty(d.race) && d.race != "*") Add(byRace, d.race, d.parts);
                    if (!string.IsNullOrEmpty(d.doll) && d.doll != "*") Add(byDoll, d.doll, d.parts);
                    if (CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug)
                        Log.Message("[NHT desat] def " + d.defName + " race=" + d.race + " parts=" + d.parts.Count);
                }
            }
            catch (Exception e)
            {
                Log.ErrorOnce("[NHT Custom Dolls] desat defs failed: " + e, 0x4E434445);
            }
        }

        private static void Add(Dictionary<string, Entry> map, string key, List<DesatPartRef> parts)
        {
            Entry e;
            if (!map.TryGetValue(key, out e))
            {
                e = new Entry();
                map[key] = e;
            }
            for (int i = 0; i < parts.Count; i++)
            {
                DesatPartRef p = parts[i];
                if (p == null) continue;
                if (!string.IsNullOrEmpty(p.part))
                {
                    if (!e.names.Contains(p.part)) e.names.Add(p.part);
                }
                else if (!e.ids.Contains(p.id)) e.ids.Add(p.id);   // 旧数据没有 defName 时才按 id 兜底
            }
        }

        public static void Reset()
        {
            loaded = false;
            byRace = null;
            byDoll = null;
        }

        private static bool Hit(Entry e, string part, int id)
        {
            if (e == null) return false;
            if (!string.IsNullOrEmpty(part) && e.names.Contains(part)) return true;
            return id >= 0 && e.ids.Contains(id);
        }

        public static bool Controlled(string race, string doll, string part, int id)
        {
            if (id < 0 && string.IsNullOrEmpty(part)) return false;
            Ensure();
            Entry e;
            string arace = Dolls.AliasRace(race);
            if (!string.IsNullOrEmpty(arace) && byRace != null && byRace.TryGetValue(arace, out e) && Hit(e, part, id)) return true;
            if (!string.IsNullOrEmpty(doll) && byDoll != null && byDoll.TryGetValue(doll, out e) && Hit(e, part, id)) return true;
            return false;
        }

        public static string Key(string race, string doll, string part, int id)
        {
            string k = !string.IsNullOrEmpty(race) ? race : (string.IsNullOrEmpty(doll) ? "*" : doll);
            return k + "#" + (!string.IsNullOrEmpty(part) ? part : ("id" + id));
        }

        public static bool PartOn(string race, string doll, string part, int id)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || st.desatOff == null) return true;
            return !st.desatOff.Contains(Key(race, doll, part, id));
        }

        public static void SetPartOn(string race, string doll, string part, int id, bool on)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null) return;
            if (st.desatOff == null) st.desatOff = new List<string>();
            string k = Key(race, doll, part, id);
            st.desatOff.Remove(k);
            if (!on) st.desatOff.Add(k);
            st.Write();
        }

        /// <summary>这个部位现在要不要按灰度画：受控 +（总开关关 或 单独关）</summary>
        public static bool GrayNeeded(string race, string doll, string part, int id)
        {
            if (!Controlled(race, doll, part, id)) return false;
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null) return false;
            if (!st.desatColorsOn) return true;
            return !PartOn(race, doll, part, id);
        }
    }

    // ------------------------------------------------------------------ 发型坐标调整
    public static class HairTuning
    {
        public static bool GetPawnFlag(List<string> list, int pawnId, bool dflt)
        {
            if (list == null || pawnId < 0) return dflt;
            string k = pawnId + ":";
            for (int i = 0; i < list.Count; i++)
            {
                string e = list[i] ?? "";
                if (e.StartsWith(k)) return e.EndsWith("1");
            }
            return dflt;
        }

        public static void SetPawnFlag(List<string> list, int pawnId, bool val)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || pawnId < 0) return;
            if (list == null) return;
            for (int i = list.Count - 1; i >= 0; i--)
            {
                string e = list[i] ?? "";
                if (e.StartsWith(pawnId + ":")) list.RemoveAt(i);
            }
            list.Add(pawnId + ":" + (val ? "1" : "0"));
            st.Write();
        }

        public static bool ManualPawn(int pawnId)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || st.hairManualPawns == null || pawnId < 0) return false;
            return st.hairManualPawns.Contains(pawnId.ToString());
        }

        public static void MarkManual(int pawnId)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || pawnId < 0) return;
            if (st.hairManualPawns == null) st.hairManualPawns = new List<string>();
            string k = pawnId.ToString();
            if (!st.hairManualPawns.Contains(k)) { st.hairManualPawns.Add(k); st.Write(); }
        }

        public static void ClearManual(int pawnId)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || st.hairManualPawns == null || pawnId < 0) return;
            if (st.hairManualPawns.Remove(pawnId.ToString())) st.Write();
        }

        public static bool SyncPawn(int pawnId)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || st.hairSyncPawns == null || pawnId < 0) return false;
            return st.hairSyncPawns.Contains(pawnId.ToString());
        }

        public static void SetSyncPawn(int pawnId, bool on)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || pawnId < 0) return;
            if (st.hairSyncPawns == null) st.hairSyncPawns = new List<string>();
            string key = pawnId.ToString();
            st.hairSyncPawns.Remove(key);
            if (on) st.hairSyncPawns.Add(key);
            st.Write();
        }

        public static bool ColorOff(string race)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || st.colorOffRaces == null || string.IsNullOrEmpty(race)) return false;
            return st.colorOffRaces.Contains(race);
        }

        public static void SetColorOff(string race, bool off)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || string.IsNullOrEmpty(race)) return;
            if (st.colorOffRaces == null) st.colorOffRaces = new List<string>();
            st.colorOffRaces.Remove(race);
            if (off) st.colorOffRaces.Add(race);
            st.Write();
        }

        private static string Fmt(float v) { return v.ToString("F4", System.Globalization.CultureInfo.InvariantCulture); }

        /// <summary>HAR 的值是「画布比例」，超出这个范围说明是旧版按像素保存的残留值。</summary>
        public static bool ValidHarValues(float scale, float ox, float oy)
        {
            if (float.IsNaN(scale) || float.IsNaN(ox) || float.IsNaN(oy)) return false;
            if (float.IsInfinity(scale) || float.IsInfinity(ox) || float.IsInfinity(oy)) return false;
            return scale >= 0.05f && scale <= 3f && Math.Abs(ox) <= 2f && Math.Abs(oy) <= 2f;
        }

        public static bool TryGet(string race, out float scale, out float ox, out float oy)
        {
            scale = 1f; ox = 0f; oy = 0f;
            if (string.IsNullOrEmpty(race)) return false;
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null) return false;
            List<string> src = race.StartsWith("p") ? st.hairPawnOverrides : st.hairOverrides;
            if (src == null) return false;
            for (int i = 0; i < src.Count; i++)
            {
                string[] parts = (src[i] ?? "").Split('|');
                if (parts.Length != 4 || parts[0] != race) continue;
                float.TryParse(parts[1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out scale);
                float.TryParse(parts[2], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out ox);
                float.TryParse(parts[3], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out oy);
                return true;
            }
            return false;
        }

        public static void Set(string race, float scale, float ox, float oy)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || string.IsNullOrEmpty(race)) return;
            List<string> dst = race.StartsWith("p") ? st.hairPawnOverrides : st.hairOverrides;
            if (dst == null) { dst = new List<string>(); if (race.StartsWith("p")) st.hairPawnOverrides = dst; else st.hairOverrides = dst; }
            string val = race + "|" + Fmt(scale) + "|" + Fmt(ox) + "|" + Fmt(oy);
            for (int i = 0; i < dst.Count; i++)
            {
                string[] parts = (dst[i] ?? "").Split('|');
                if (parts.Length == 4 && parts[0] == race)
                {
                    if (dst[i] == val) return;
                    dst[i] = val; st.Write(); return;
                }
            }
            dst.Add(val);
            st.Write();
        }

        public static void Clear(string race)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null) return;
            List<string> dst = race.StartsWith("p") ? st.hairPawnOverrides : st.hairOverrides;
            if (dst == null) return;
            for (int i = dst.Count - 1; i >= 0; i--)
            {
                string[] parts = (dst[i] ?? "").Split('|');
                if (parts.Length == 4 && parts[0] == race) dst.RemoveAt(i);
            }
            st.Write();
        }

        public static bool VanillaRaceOff(string race)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || st.vanillaHairOff == null || string.IsNullOrEmpty(race)) return false;
            return st.vanillaHairOff.Contains(race);
        }

        public static void SetVanillaRaceOff(string race, bool off)
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || string.IsNullOrEmpty(race)) return;
            if (st.vanillaHairOff == null) st.vanillaHairOff = new List<string>();
            st.vanillaHairOff.Remove(race);
            if (off) st.vanillaHairOff.Add(race);
            st.Write();
        }
    }

    // ------------------------------------------------------------------ helpers
    public static class Dolls
    {
        public const string Prefix = "atian.nht.customdolls";

        private static List<HumanlikeDoll> all;
        private static Dictionary<string, List<HumanlikeDoll>> byRace;

        public static CustomDollsSettings Settings
        {
            get { return CustomDollsMod.Settings; }
        }

        // v6：编辑器「默认开色彩」开关导出的种族——启动时从 colorOffRaces 移出一次并记入
        // colorDefaultOnDone；之后玩家在设置里手动关色彩不会被覆盖。
        internal static void ApplyHairColorModeDefaults()
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null) return;
            List<HairColorModeDef> defs;
            try { defs = DefDatabase<HairColorModeDef>.AllDefsListForReading; }
            catch (Exception) { return; }
            if (defs == null || defs.Count == 0) return;
            if (st.colorDefaultOnDone == null) st.colorDefaultOnDone = new List<string>();
            if (st.colorOffRaces == null) st.colorOffRaces = new List<string>();
            bool changed = false;
            foreach (HairColorModeDef def in defs)
            {
                if (def == null || !def.defaultColorOn || string.IsNullOrEmpty(def.race)) continue;
                string race = def.race.Trim();
                if (race.Length == 0 || st.colorDefaultOnDone.Contains(race)) continue;
                st.colorDefaultOnDone.Add(race);
                st.colorOffRaces.Remove(race);
                changed = true;
            }
            if (changed) st.Write();
        }

        /// <summary>调试模式：只影响日志，不影响任何绘制行为</summary>
        public static bool DebugOn
        {
            get { return CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug; }
        }

        /* t10-P13：统一限流入口。所有「每帧可能触发」的日志都必须走这里。
           - 同一个 key 只打一次；全局硬上限 200 条，超过后只留一条 [NHT log] muted 提示
           - 调用点先用 Dolls.DebugOn 短路，debug 关闭时不拼 key、不拼字符串
           - 一次性关键日志（[NHT halo]、[NHT color] restore、灰度回退）不走这里，避免被限流吞掉 */
        private const int LogCap = 200;
        private static readonly List<string> logKeys = new List<string>();
        private static int logCount;
        private static bool logMuted;

        /* t52：本帧被 ApplyColorVariant 镜像（tailRight）的部位 id，-1 = 本帧无镜像部位。
           护甲图标补丁用它决定偏移是否取反：不能再看 def.width 符号，
           因为 ArmorIconOffsetPatch.Postfix 执行时 RestoreColorVariant 可能已把 width 还原成正数。 */
        public static int ArmorMirrorBodyPart = -1;
        // t52b：本帧每个部位「宿主实际绘制用」的 position / width（ApplyColorVariant 改完、RestoreColorVariant 之前抓取）。
        // 护甲图标在 Postfix 里必须用这份数据，否则 read 到的 def 可能已被还原（镜像状态下 pos/width 回到原值）。
        public static readonly Dictionary<string, Vector3> ArmorDrawn = new Dictionary<string, Vector3>();

        public static bool LogOnce(string key)
        {
            if (!DebugOn || logMuted) return false;
            if (logCount >= LogCap)
            {
                logMuted = true;
                Log.Warning("[NHT log] muted (cap reached) after " + LogCap + " debug lines");
                return false;
            }
            if (key != null)
            {
                if (logKeys.Contains(key)) return false;
                logKeys.Add(key);
            }
            logCount++;
            return true;
        }

        /* t43：统一调试日志入口 =「文件通道 + 原 Player.log 通道」。
           - 文件通道有自己的去重键与更宽的名额（4000 条），不受 Player.log 的 200 条上限影响；
           - Player.log 仍走 LogOnce（同一 key 只一次、200 条上限），行为与 t38 之后完全一致；
           - debug 关闭时立刻 return，不拼 key、不建文件。 */
        private static readonly List<string> fileKeys = new List<string>();
        private const int FileEntryCap = 4000;
        private static int fileCount;
        private static bool fileMuted;

        /* t47-F5：ExposeData 的 PostLoadInit 阶段 CustomDollsMod.Settings 还是 null，LogDebug 会直接返回，
           所以把「需要补报 color:restore」记下来，等 Bootstrap（Settings 已就绪）再补一条。 */
        internal static bool PendingColorRestore;

        /* t47：只写文件通道、不碰 Player.log 的入口（halo 需要「Player.log 只第一条、文件全量」） */
        public static void LogDebugFile(string key, string msg)
        {
            if (!DebugOn || msg == null) return;
            if (Settings != null && Settings.debugLogToFile && !fileMuted)
            {
                string k = key ?? msg;
                if (!fileKeys.Contains(k))
                {
                    if (fileCount < FileEntryCap)
                    {
                        fileKeys.Add(k);
                        fileCount++;
                        DbgFile.Write(msg);
                    }
                    else
                    {
                        // 名额用尽：只留一条提示，之后本会话不再写文件
                        fileMuted = true;
                        DbgFile.Write("[NHTCD] debug log entry cap reached (" + FileEntryCap + ")");
                    }
                }
            }
        }

        public static void LogDebug(string key, string msg)
        {
            if (!DebugOn || msg == null) return;
            LogDebugFile(key, msg);
            if (LogOnce(key)) Log.Message(msg);
        }

        /* t43：独立调试日志文件 Config/NHTCD_Debug.log。
           背景：Player.log 被其它模组的每帧异常栈挤爆，启动约 61 秒就触发 240k 行上限，
           NHTCD 的调试证据随之全丢。这里再开一条文件通道：
           - 启动时文件 >8MB ⇒ 删除旧 .old、把当前文件改名为 NHTCD_Debug.old.log（滚动一代）
           - 运行期累计 >16MB ⇒ 停止写入并追加一条 cap 提示（本会话不再写）
           - StringBuilder 缓冲：>=8KB 或距上次落盘 >=0.5s 才 File.AppendAllText
           - 所有 IO 异常一律吞掉（只 Log.Warning 一次），绝不影响游戏 */
        public static class DbgFile
        {
            private const long RotateBytes = 8L * 1024 * 1024;
            private const long CapBytes = 16L * 1024 * 1024;
            private const int FlushBytes = 8 * 1024;
            private const float FlushInterval = 0.5f;

            private static readonly object Gate = new object();
            private static readonly StringBuilder Buffer = new StringBuilder(16 * 1024);
            private static string filePath;
            private static bool initTried;
            private static bool stopped;      // 写失败 / 超上限 → 本会话不再写
            private static bool capped;
            private static long bytesOnDisk;
            private static float lastFlushAt;

            /* t47-B1：只有 debug 与 debugLogToFile 同时打开才允许碰磁盘。
               之前 CurrentPath / Flush 会先触发 EnsureInit，默认配置（debug=false）下也会建出
               Config/NHTCD_Debug.log，与「debug 关闭不建文件」的承诺矛盾。 */
            public static bool Enabled
            {
                get
                {
                    CustomDollsSettings s = Settings;
                    return s != null && s.debug && s.debugLogToFile;
                }
            }

            // t47-B1：纯路径计算，不再触发 EnsureInit（落盘副作用只应来自 Write/Flush）
            public static string CurrentPath
            {
                get { return System.IO.Path.Combine(GenFilePaths.ConfigFolderPath, "NHTCD_Debug.log"); }
            }

            public static void Write(string line)
            {
                // t47-B1：未启用时直接返回，且不触发 EnsureInit（InitTried 留给真正启用后的第一次写）
                if (!Enabled) return;
                if (stopped || line == null) return;
                try
                {
                    lock (Gate)
                    {
                        EnsureInit();
                        if (stopped) return;
                        Buffer.Append(DateTime.Now.ToString("HH:mm:ss.fff")).Append(' ').Append(line).Append('\n');
                        // 8KB 攒批 + 0.5s 节流：每帧调用也只是一次 Append，落盘频率上限 2 次/秒
                        if (Buffer.Length >= FlushBytes || Time.realtimeSinceStartup - lastFlushAt >= FlushInterval)
                            FlushLocked();
                    }
                }
                catch (Exception) { stopped = true; }
            }

            public static void Flush()
            {
                // t47-B1：未启用（或本次会话从未初始化过文件）时直接返回，绝不建文件
                if (!Enabled || !initTried) return;
                try { lock (Gate) { EnsureInit(); FlushLocked(); } }
                catch (Exception) { }
            }

            private static void EnsureInit()
            {
                // t47-B1：未启用就不初始化（不创建/轮转文件、不写 header）
                if (!Enabled) return;
                if (initTried) return;
                initTried = true;
                try
                {
                    filePath = System.IO.Path.Combine(GenFilePaths.ConfigFolderPath, "NHTCD_Debug.log");
                    string old = System.IO.Path.Combine(GenFilePaths.ConfigFolderPath, "NHTCD_Debug.old.log");
                    long len = 0L;
                    if (System.IO.File.Exists(filePath)) len = new System.IO.FileInfo(filePath).Length;
                    if (len > RotateBytes)
                    {
                        try { if (System.IO.File.Exists(old)) System.IO.File.Delete(old); }
                        catch (Exception) { }
                        try { System.IO.File.Move(filePath, old); len = 0L; }
                        catch (Exception) { }
                    }
                    bytesOnDisk = len;
                    lastFlushAt = Time.realtimeSinceStartup;
                    Buffer.Length = 0;
                    CustomDollsSettings s = Settings;
                    // t47-F4：header 打印真实开关状态，不再硬编码 debug=true
                    Buffer.Append("=== NHTCD debug session ").Append(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"))
                        .Append(" debug=").Append(s != null && s.debug)
                        .Append(" debugLogToFile=").Append(s != null && s.debugLogToFile)
                        .Append(" ===\n");
                    Buffer.Append("[NHTCD] settings desatColorsOn=").Append(s == null || s.desatColorsOn)
                        .Append(" tintVanillaHair=").Append(s == null || s.tintVanillaHair)
                        .Append(" harHairTint=").Append(s == null || s.harHairTint)
                        .Append(" nonHarHairShadow=").Append(s == null || s.nonHarHairShadow)
                        .Append(" armorIconOffset=").Append(s == null || s.armorIconOffset)
                        .Append(" showHairInXray=").Append(s != null && s.showHairInXray)
                        .Append(" enableHairTintOverlay=").Append(s == null || s.enableHairTintOverlay)
                        .Append(" enableAddonFollow=").Append(s == null || s.enableAddonFollow)
                        .Append(" enableColorVariants=").Append(s == null || s.enableColorVariants)
                        .Append('\n');
                    FlushLocked();
                }
                catch (Exception e)
                {
                    stopped = true;
                    Log.Warning("[NHTCD] debug file init failed: " + e.GetType().Name + " " + e.Message);
                }
            }

            private static void FlushLocked()
            {
                if (stopped) return;
                lastFlushAt = Time.realtimeSinceStartup;
                if (Buffer.Length == 0) return;
                string text = Buffer.ToString();
                Buffer.Length = 0;
                if (bytesOnDisk >= CapBytes)
                {
                    if (!capped)
                    {
                        capped = true;
                        try
                        {
                            System.IO.File.AppendAllText(filePath, "[NHTCD] debug log cap reached (16MB), stop writing for this session\n");
                        }
                        catch (Exception) { }
                    }
                    stopped = true;
                    return;
                }
                try
                {
                    System.IO.File.AppendAllText(filePath, text);
                    bytesOnDisk += Encoding.UTF8.GetByteCount(text);
                }
                catch (Exception)
                {
                    stopped = true;
                    Log.Warning("[NHTCD] debug file write failed, stop writing for this session");
                }
            }
        }

        private static Dictionary<string, NhtHandPartOverride> handOverrideCache;
        private static Dictionary<string, List<NhtHandPartOverride>> handOverrideByRacePart;

        /* t127：手/脚娃娃的按种族部位覆盖（编辑器导出 NhtHandPartOverride） */
        // t128：没有导出任何 NhtHandPartOverride 时，两只手/脚钩子必须完全不介入。
        private static int handOverrideCount = -1;
        public static bool HasHandOverrides()
        {
            if (handOverrideCount < 0)
            {
                int n = 0;
                try { n = DefDatabase<NhtHandPartOverride>.AllDefsListForReading.Count; } catch (Exception) { n = 0; }
                handOverrideCount = n;
            }
            return handOverrideCount > 0;
        }

        public static NhtHandPartOverride HandOverrideFor(string race, string doll, string part)
        {
            if (string.IsNullOrEmpty(race) || string.IsNullOrEmpty(doll) || string.IsNullOrEmpty(part)) return null;
            if (handOverrideCache == null)
            {
                handOverrideCache = new Dictionary<string, NhtHandPartOverride>();
                handOverrideByRacePart = new Dictionary<string, List<NhtHandPartOverride>>();
                try
                {
                    foreach (NhtHandPartOverride d in DefDatabase<NhtHandPartOverride>.AllDefs)
                    {
                        if (d == null || string.IsNullOrEmpty(d.race) || string.IsNullOrEmpty(d.part)) continue;
                        string key = d.race + "|" + d.doll + "|" + d.part;
                        handOverrideCache[key] = d;
                        string rp = d.race + "|" + d.part;
                        List<NhtHandPartOverride> list;
                        if (!handOverrideByRacePart.TryGetValue(rp, out list))
                        {
                            list = new List<NhtHandPartOverride>();
                            handOverrideByRacePart[rp] = list;
                        }
                        list.Add(d);
                    }
                }
                catch (Exception) { }
            }
            NhtHandPartOverride v;
            if (handOverrideCache.TryGetValue(race + "|" + doll + "|" + part, out v)) return v;
            // t128：导出的 doll 名与运行时娃娃名可能不一致（HandDoll / HandsDoll 等）。
            // 精确键没命中时，按 race|part 回退；同一条目唯一才采用，避免张冠李戴。
            List<NhtHandPartOverride> cands;
            if (handOverrideByRacePart != null && handOverrideByRacePart.TryGetValue(race + "|" + part, out cands) && cands != null && cands.Count == 1)
                return cands[0];
            return null;
        }

        public static bool HasHandOverrideForRacePart(string race, string part)
        {
            if (string.IsNullOrEmpty(race) || string.IsNullOrEmpty(part)) return false;
            if (handOverrideCache == null) HandOverrideFor(race, "HandDoll", part); // 触发懒建
            List<NhtHandPartOverride> cands;
            return handOverrideByRacePart != null
                && handOverrideByRacePart.TryGetValue(race + "|" + part, out cands)
                && cands != null && cands.Count > 0;
        }

        public static void Invalidate()
        {
            all = null;
            byRace = null;
            raceAliasCache = null;
            handOverrideCache = null;
            handOverrideCount = -1;
            vanillaCache = null;
            // 同时让 UseFit 重新读取开关/按小人保存的覆盖值，
            // 否则关同步、开自定义坐标后滑块写入的新值不会生效（非 HAR 尤其明显）
            Bootstrap.ResetFitCache();
        }

        private static void Build()
        {
            all = new List<HumanlikeDoll>();
            byRace = new Dictionary<string, List<HumanlikeDoll>>();
            List<HumanlikeDoll> defs = DefDatabase<HumanlikeDoll>.AllDefsListForReading;
            for (int i = 0; i < defs.Count; i++)
            {
                HumanlikeDoll d = defs[i];
                if (d == null) continue;
                all.Add(d);
                string key = string.IsNullOrEmpty(d.xenotype) ? "*" : d.xenotype;
                if (key == "*") continue;
                List<HumanlikeDoll> list;
                if (!byRace.TryGetValue(key, out list))
                {
                    list = new List<HumanlikeDoll>();
                    byRace[key] = list;
                }
                list.Add(d);
            }
        }

        private static void Ensure()
        {
            if (all == null || byRace == null) Build();
        }

        /// <summary>race defName -> the dolls that declare it as their xenotype</summary>
        public static Dictionary<string, List<HumanlikeDoll>> ByRace()
        {
            Ensure();
            return byRace;
        }

        /// <summary>NHT 自带的原版体型娃娃（Male / Female / Fat / Hulk / Kid），按 defName 去重</summary>
        private static List<HumanlikeDoll> vanillaCache;
        public static List<HumanlikeDoll> Vanilla()
        {
            if (vanillaCache != null) return vanillaCache;
            Ensure();
            vanillaCache = new List<HumanlikeDoll>();
            List<string> seen = new List<string>();
            for (int i = 0; i < all.Count; i++)
            {
                HumanlikeDoll d = all[i];
                if (d == null || string.IsNullOrEmpty(d.defName)) continue;
                string xen = d.xenotype;
                bool isBase = string.IsNullOrEmpty(xen) || xen == "*" || xen == "NHT_KidKidKid";
                if (!isBase) continue;
                bool dup = false;
                for (int k = 0; k < seen.Count; k++)
                {
                    if (string.Equals(seen[k], d.defName, StringComparison.OrdinalIgnoreCase)) { dup = true; break; }
                }
                if (dup) continue;
                seen.Add(d.defName);
                vanillaCache.Add(d);
            }
            /* 按 Male / Female / Fat / Hulk / 其它 的顺序排，方便阅读 */
            List<string> order = new List<string> { "Male", "Female", "Fat", "Hulk" };
            vanillaCache.Sort(delegate (HumanlikeDoll a, HumanlikeDoll b)
            {
                int ia = order.IndexOf(a.defName), ib = order.IndexOf(b.defName);
                if (ia < 0) ia = 99;
                if (ib < 0) ib = 99;
                if (ia != ib) return ia.CompareTo(ib);
                return string.Compare(a.defName, b.defName, StringComparison.OrdinalIgnoreCase);
            });
            return vanillaCache;
        }

        /// <summary>NHT 自带的「基础体型」xenotype 标记（Kid 等），它们不是种族</summary>
        public static bool IsBaseXenotype(string xen)
        {
            return string.IsNullOrEmpty(xen) || xen == "*" || xen == "NHT_KidKidKid";
        }

        public static List<HumanlikeDoll> ForRace(string race)
        {
            Ensure();
            List<HumanlikeDoll> list;
            if (race != null && byRace.TryGetValue(race, out list)) return list;
            // t70：同模组种族映射（RaceAliasDef: from → to），让未单独作画的种族复用目标种族的娃娃
            string target = RaceAliasTarget(race);
            if (target != null && byRace.TryGetValue(target, out list)) return list;
            return null;
        }

        /// <summary>t70：种族映射缓存（from → to），首次使用时从 DefDatabase 构建</summary>
        private static Dictionary<string, string> raceAliasCache;

        /// <summary>t70b：把种族名解析成它映射到的目标种族（无映射时原样返回）</summary>
        public static string AliasRace(string race)
        {
            string t = RaceAliasTarget(race);
            return string.IsNullOrEmpty(t) ? race : t;
        }

        private static string RaceAliasTarget(string race)
        {
            if (string.IsNullOrEmpty(race)) return null;
            if (raceAliasCache == null)
            {
                raceAliasCache = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    foreach (RaceAliasDef a in DefDatabase<RaceAliasDef>.AllDefs)
                    {
                        if (a == null || string.IsNullOrEmpty(a.from) || string.IsNullOrEmpty(a.to)) continue;
                        if (!raceAliasCache.ContainsKey(a.from)) raceAliasCache[a.from] = a.to;
                    }
                }
                catch (Exception) { }
            }
            string to;
            return raceAliasCache.TryGetValue(race, out to) ? to : null;
        }

        public static string GenderOf(Pawn pawn)
        {
            if (pawn == null || pawn.gender == Gender.None) return "None";
            return pawn.gender == Gender.Male ? "Male" : "Female";
        }

        public static string BodyOf(Pawn pawn)
        {
            try
            {
                if (pawn != null && pawn.story != null && pawn.story.bodyType != null)
                {
                    return pawn.story.bodyType.defName;
                }
            }
            catch (Exception) { }
            return "*";
        }

        /* RJW 等附加形态（如 Mincho 的 Slime_YR_Bote）没有独立画布时，
           去掉配置的后缀后复用主形态（Slime）的 Doll。 */
        public static BodyAliasDef FindAlias(string race, string body)
        {
            try
            {
                foreach (BodyAliasDef a in DefDatabase<BodyAliasDef>.AllDefs)
                {
                    if (a == null || string.IsNullOrEmpty(a.fromBody) || a.fromBody != body) continue;
                    if (string.IsNullOrEmpty(a.toBody)) continue;
                    if (!string.IsNullOrEmpty(race) && !string.IsNullOrEmpty(a.race) && a.race != "*" && a.race != race) continue;
                    return a;
                }
            }
            catch (Exception) { }
            return null;
        }

        public static string NormalizeBodyName(string body)
        {
            try
            {
                if (string.IsNullOrEmpty(body) || body == "*") return body;
                BodyAliasDef alias = FindAlias(null, body);
                if (alias != null) return alias.toBody;
                // 已有精确形态的 Doll 时不走别名（允许以后为附加形态单独建画布）
                foreach (HumanlikeDoll d0 in DefDatabase<HumanlikeDoll>.AllDefs)
                {
                    if (d0 != null && d0.bodytype == body) return body;
                }
                List<string> suffixes = (Settings != null && Settings.bodyAliasSuffixes != null)
                    ? Settings.bodyAliasSuffixes : null;
                if (suffixes == null || suffixes.Count == 0) return body;
                for (int i = 0; i < suffixes.Count; i++)
                {
                    string suf = suffixes[i];
                    if (string.IsNullOrEmpty(suf) || !body.EndsWith(suf, StringComparison.OrdinalIgnoreCase)) continue;
                    string cand = body.Substring(0, body.Length - suf.Length);
                    if (string.IsNullOrEmpty(cand)) continue;
                    foreach (HumanlikeDoll d in DefDatabase<HumanlikeDoll>.AllDefs)
                    {
                        if (d != null && d.bodytype == cand) return cand;
                    }
                }
            }
            catch (Exception) { }
            return body;
        }

        public static string NormalizeBody(string race, string body)
        {
            BodyAliasDef alias = FindAlias(race, body);
            if (alias != null) return alias.toBody;
            string norm = NormalizeBodyName(body);
            if (norm != body) return norm;
            try
            {
                List<HumanlikeDoll> list = ForRace(race);
                if (list == null || list.Count == 0) return body;
                List<string> suffixes = (Settings != null && Settings.bodyAliasSuffixes != null) ? Settings.bodyAliasSuffixes : null;
                if (suffixes == null) return body;
                for (int i = 0; i < suffixes.Count; i++)
                {
                    string suf = suffixes[i];
                    if (string.IsNullOrEmpty(suf) || !body.EndsWith(suf, StringComparison.OrdinalIgnoreCase)) continue;
                    string cand = body.Substring(0, body.Length - suf.Length);
                    for (int k = 0; k < list.Count; k++)
                    {
                        HumanlikeDoll d = list[k];
                        string db = string.IsNullOrEmpty(d.bodytype) ? "*" : d.bodytype;
                        if (db == cand) return cand;
                    }
                }
            }
            catch (Exception) { }
            return body;
        }

        public static string Key(string race, string gender, string body)
        {
            return race + "|" + gender + "|" + body;
        }

        public static string GetRule(string race, string gender, string body)
        {
            if (Settings == null || Settings.rules == null) return null;
            string v;
            if (Settings.rules.TryGetValue(Key(race, gender, body), out v) && !string.IsNullOrEmpty(v)) return v;
            if (Settings.rules.TryGetValue(Key(race, gender, "*"), out v) && !string.IsNullOrEmpty(v)) return v;
            if (Settings.rules.TryGetValue(Key(race, "*", body), out v) && !string.IsNullOrEmpty(v)) return v;
            if (Settings.rules.TryGetValue(Key(race, "*", "*"), out v) && !string.IsNullOrEmpty(v)) return v;
            return null;
        }

        public static void SetRule(string race, string gender, string body, string dollDefName)
        {
            if (Settings == null) return;
            if (Settings.rules == null) Settings.rules = new Dictionary<string, string>();
            string k = Key(race, gender, body);
            if (string.IsNullOrEmpty(dollDefName)) Settings.rules.Remove(k);
            else Settings.rules[k] = dollDefName;
        }

        /// <summary>the doll this pawn should use, or null to leave NHT alone</summary>
        /// <summary>t116：小人当前的基因异种名（没有基因系统/没有异种时返回空）</summary>
        public static string XenotypeOf(Pawn pawn)
        {
            try
            {
                if (pawn != null && pawn.genes != null && pawn.genes.Xenotype != null)
                    return pawn.genes.Xenotype.defName;
            }
            catch (Exception) { }
            return "";
        }

        public static HumanlikeDoll Pick(Pawn pawn)
        {
            if (pawn == null || pawn.def == null) return null;
            string race = pawn.def.defName;
            List<HumanlikeDoll> list = ForRace(race);
            // t116：只做异种的模组（Expie 这类）不改种族，小人仍是 Human；
            // 这类娃娃的 <xenotype> 写的是 XenotypeDef 名，按小人的异种再查一次。
            if (list == null || list.Count == 0)
            {
                string xen = XenotypeOf(pawn);
                if (!string.IsNullOrEmpty(xen))
                {
                    List<HumanlikeDoll> xl = ForRace(xen);
                    if (xl != null && xl.Count > 0) { list = xl; race = xen; }
                }
            }
            if (list == null || list.Count == 0) return null;

            string gender = GenderOf(pawn);
            string body = NormalizeBody(race, BodyOf(pawn));

            string rule = GetRule(race, gender, body);
            if (!string.IsNullOrEmpty(rule))
            {
                HumanlikeDoll named = DefDatabase<HumanlikeDoll>.GetNamedSilentFail(rule);
                if (named != null) return named;
            }

            // no rule: best match among this race's dolls (exact beats wildcard)
            HumanlikeDoll best = null;
            int bestScore = -1;
            for (int i = 0; i < list.Count; i++)
            {
                HumanlikeDoll d = list[i];
                string dg = string.IsNullOrEmpty(d.gender) ? "*" : d.gender;
                string db = string.IsNullOrEmpty(d.bodytype) ? "*" : d.bodytype;
                bool gOk = dg == "*" || dg == gender || (dg == "None" && gender == "None");
                bool bOk = db == "*" || db == body;
                if (!gOk || !bOk) continue;
                int score = 0;
                if (dg == gender) score += 3;
                if (db == body) score += 3;
                if (dg == "*") score += 1;
                if (db == "*") score += 1;
                if (score > bestScore)
                {
                    bestScore = score;
                    best = d;
                }
            }
            if (best != null) return best;

            /* 兜底：种族补丁里的娃娃常常只写了 Female（导出时性别字段固定），
               男小人按性别过滤会一个都匹配不到 → 放宽性别，只用体型匹配
               再不行就取该种族的第一个娃娃。这样「默认 = 用种族补丁」对男女都生效。 */
            for (int i = 0; i < list.Count; i++)
            {
                HumanlikeDoll d = list[i];
                string db = string.IsNullOrEmpty(d.bodytype) ? "*" : d.bodytype;
                if (db == "*" || db == body) { best = d; break; }
            }
            if (best == null && list.Count > 0) best = list[0];
            return best;
        }
    }

    // ------------------------------------------------------------------ hooks
    [StaticConstructorOnStartup]
    public static class Bootstrap
    {
        public static void ResetFitCache()
        {
            HairFix.ResetFitCache();
        }

        /* t23-C1：齿轮窗口需要在不暴露 HairFix 的前提下判断「坐标按画布单位」。 */
        internal static bool CanvasRace(ThingDef def)
        {
            return HairFix.CanvasRace(def);
        }

        static Bootstrap()
        {
            try
            {
                // t78：版本横幅 + 种族映射清单（每次启动一条，方便核对实际加载的 DLL）
                try
                {
                    StringBuilder sb = new StringBuilder();
                    int n = 0;
                    foreach (RaceAliasDef a in DefDatabase<RaceAliasDef>.AllDefs)
                    {
                        if (a == null) continue;
                        if (n > 0) sb.Append(", ");
                        sb.Append(a.from).Append("->").Append(a.to);
                        n++;
                    }
                    Log.Message("[NHT build] t123 quiet-log loaded, debug=" + (CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug)
                        + " raceAlias=" + n + (n > 0 ? (" [" + sb.ToString() + "]") : ""));
                }
                catch (Exception e) { Log.Message("[NHT build] alias dump failed: " + e.GetType().Name); }

                Harmony harmony = new Harmony(Dolls.Prefix);
                int patched = 0;

                MethodInfo getMain = AccessTools.Method(typeof(DollRenderContext), "GetMainDoll",
                    new Type[] { typeof(Pawn), typeof(string), typeof(string), typeof(string) });
                if (getMain != null)
                {
                    harmony.Patch(getMain, null,
                        new HarmonyMethod(typeof(Bootstrap).GetMethod("GetMainDollPostfix", BindingFlags.Static | BindingFlags.NonPublic)), null, null);
                    patched++;
                }
                else
                {
                    Log.Warning("[NHT Custom Dolls] DollRenderContext.GetMainDoll not found.");
                }

                // 附加形态别名：让 *_YR_Bote 之类在 NHT 的 DollManager 里复用主形态
                try
                {
                    Type dmOpen = null;
                    foreach (Type t in typeof(HumanlikeDoll).Assembly.GetTypes())
                    {
                        if (t.Name == "DollManager`1" && t.IsGenericTypeDefinition) { dmOpen = t; break; }
                    }
                    Type[] dollTypes = new Type[] { typeof(HumanlikeDoll), typeof(HandDoll), typeof(FeetDoll) };
                    for (int i = 0; dmOpen != null && i < dollTypes.Length; i++)
                    {
                        Type dm = dmOpen.MakeGenericType(dollTypes[i]);
                        MethodInfo getDoll = dm.GetMethod("GetDoll", new Type[] { typeof(string), typeof(string), typeof(string) });
                        if (getDoll == null) continue;
                        harmony.Patch(getDoll,
                            new HarmonyMethod(typeof(Bootstrap).GetMethod("BodyAliasPrefix", BindingFlags.Static | BindingFlags.NonPublic)), null, null, null);
                        patched++;
                    }
                }
                catch (Exception e)
                {
                    if (CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug) Log.Warning("[NHT Custom Dolls] body alias patch skipped: " + e.Message);
                }

                MethodInfo getXeno = AccessTools.Method(typeof(DollDrawer), "GetXenotype", new Type[] { typeof(Pawn) });
                if (getXeno != null)
                {
                    harmony.Patch(getXeno,
                        new HarmonyMethod(typeof(Bootstrap).GetMethod("GetXenotypePrefix", BindingFlags.Static | BindingFlags.NonPublic)), null, null, null);
                    patched++;
                }

                MethodInfo solve = AccessTools.Method(typeof(BodyPartIndexesRemap), "Solve", new Type[] { typeof(Pawn) });
                if (solve != null)
                {
                    harmony.Patch(solve, null,
                        new HarmonyMethod(typeof(Bootstrap).GetMethod("SolvePostfix", BindingFlags.Static | BindingFlags.NonPublic)), null, null);
                    patched++;
                }

                // hair: HAR races draw hair as body addons, so swap the texture while NHT draws
                Type widgetType = typeof(HumanlikeDoll).Assembly.GetType("NiceHealthTab.DollWidget");
                MethodInfo drawMain = widgetType == null ? null : AccessTools.Method(widgetType, "DrawMainDoll");
                Type hairFix = typeof(Bootstrap).GetNestedType("HairFix", BindingFlags.NonPublic);
                if (drawMain != null && hairFix != null)
                {
                    harmony.Patch(drawMain,
                        new HarmonyMethod(hairFix.GetMethod("Prefix", BindingFlags.Static | BindingFlags.NonPublic)),
                        new HarmonyMethod(hairFix.GetMethod("Postfix", BindingFlags.Static | BindingFlags.NonPublic)), null, null);
                    patched++;
                    int partHooks = 0;
                    foreach (Type tt in typeof(HumanlikeDoll).Assembly.GetTypes())
                    {
                        MethodInfo[] ms;
                        try { ms = tt.GetMethods(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic); }
                        catch (Exception) { continue; }
                        foreach (MethodInfo mi in ms)
                        {
                            if (mi.Name != "DrawPart" || mi.IsAbstract) continue;
                            try
                            {
                                harmony.Patch(mi,
                                    new HarmonyMethod(hairFix.GetMethod("PartPrefix", BindingFlags.Static | BindingFlags.NonPublic)),
                                    new HarmonyMethod(hairFix.GetMethod("PartPostfix", BindingFlags.Static | BindingFlags.NonPublic)), null, null);
                                partHooks++;
                                if (Dolls.DebugOn && partHooks <= 5)
                                {
                                    StringBuilder sb = new StringBuilder();
                                    foreach (ParameterInfo pi0 in mi.GetParameters()) sb.Append(pi0.ParameterType.Name).Append(' ').Append(pi0.Name).Append(", ");
                                    Log.Message("[NHT part sig] " + tt.Name + "." + mi.Name + "(" + sb.ToString().TrimEnd(' ', ',') + ")");
                                }
                            }
                            catch (Exception) { }
                        }
                    }
                    
                    // A 方案：给 NHT 画原版头发的方法挂前缀（开关打开时跳过白发）
                    int hairDrawHooks = 0;
                    try
                    {
                        MethodInfo hairDrawPrefix = hairFix.GetMethod("HairDrawPrefix", BindingFlags.Static | BindingFlags.NonPublic);
                        foreach (Type tt in typeof(HumanlikeDoll).Assembly.GetTypes())
                        {
                            MethodInfo[] ms;
                            try { ms = tt.GetMethods(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic); }
                            catch (Exception) { continue; }
                            foreach (MethodInfo mi in ms)
                            {
                                if (mi.IsAbstract || mi.ContainsGenericParameters) continue;
                                string nm = mi.Name;
                                if (nm.IndexOf("Draw", StringComparison.OrdinalIgnoreCase) < 0) continue;
                                if (nm.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) < 0) continue;
                                try
                                {
                                    harmony.Patch(mi, new HarmonyMethod(hairDrawPrefix), null, null, null);
                                    hairDrawHooks++;
                                    if (Dolls.DebugOn && hairDrawHooks <= 20)
                                    {
                                        StringBuilder hb = new StringBuilder();
                                        foreach (ParameterInfo hpi in mi.GetParameters()) hb.Append(hpi.ParameterType.Name).Append(' ').Append(hpi.Name).Append(", ");
                                        Log.Message("[NHT hair cand] " + tt.Name + "." + nm + "(" + hb.ToString().TrimEnd(' ', ',') + ")");
                                    }
                                }
                                catch (Exception) { }
                            }
                        }
                    }
                    catch (Exception) { }
                    Log.Message("[NHT Custom Dolls] vanilla hair skip hooks=" + hairDrawHooks);
                    Log.Message("[NHT Custom Dolls] hair hook on " + widgetType.FullName + ".DrawMainDoll, part hooks=" + partHooks);

                    /* t111（临时诊断）：健康面板悬浮为什么没有部位名。
                       DrawTooltips 每帧末尾都会被调用，这里把 ctx 的悬浮状态按 30 帧节流打出来。 */
                    if (Dolls.DebugOn) try
                    {
                        MethodInfo drawTips = AccessTools.Method(widgetType, "DrawTooltips");
                        if (drawTips != null)
                        {
                            harmony.Patch(drawTips, null,
                                new HarmonyMethod(typeof(Bootstrap).GetMethod("TooltipDiagPostfix", BindingFlags.Static | BindingFlags.NonPublic)), null, null);
                            Log.Message("[NHT hover] tooltip diag hook installed");
                        }
                        else Log.Message("[NHT hover] DrawTooltips not found");
                        // t112（临时诊断）：看提示有没有登记进 TooltipHandler、登记时 ctx 里的文本是否还在。
                        try
                        {
                            Type th = AccessTools.TypeByName("Verse.TooltipHandler");
                            MethodInfo dtg = th == null ? null : AccessTools.Method(th, "DoTooltipGUI");
                            if (dtg != null)
                            {
                                harmony.Patch(dtg,
                                    new HarmonyMethod(typeof(Bootstrap).GetMethod("TooltipGuiDiagPrefix", BindingFlags.Static | BindingFlags.NonPublic)), null, null, null);
                                Log.Message("[NHT hover] dotip diag hook installed");
                            }
                        }
                        catch (Exception) { }
                    }
                    catch (Exception e) { Log.Message("[NHT hover] hook failed: " + e.GetType().Name); }
                }
                else
                {
                    Log.Warning("[NHT Custom Dolls] hair hook target missing: widget=" + (widgetType != null)
                        + " method=" + (drawMain != null) + " class=" + (hairFix != null));
                }

                try { Dolls.ApplyHairColorModeDefaults(); } catch (Exception) { }
                Dictionary<string, List<HumanlikeDoll>> map = Dolls.ByRace();
                if (Dolls.DebugOn) Log.Message("[NHT Custom Dolls] hooks: " + patched + ", races with dolls: " + (map == null ? 0 : map.Count));
                // t47-B1/F5：boot 行整体放进 DebugOn（CurrentPath 现在无副作用），
                // 并在这里补发 ExposeData 阶段无法落盘的 color:restore 提示（那时 Settings 还是 null）。
                if (Dolls.DebugOn)
                {
                    Dolls.LogDebug("boot", "[NHT Custom Dolls] hooks: " + patched + ", races with dolls: " + (map == null ? 0 : map.Count)
                        + ", log file=" + Dolls.DbgFile.CurrentPath);
                    if (Dolls.PendingColorRestore)
                    {
                        Dolls.PendingColorRestore = false;
                        Dolls.LogDebug("color:restore", "[NHT color] restore desatColorsOn=true (legacy)");
                    }
                }
            }
            catch (Exception e)
            {
                Log.Error("[NHT Custom Dolls] bootstrap failed: " + e);
            }
        }

        public static void ClearHairAutoFix()
        {
            try
            {
                CustomDollsSettings st = CustomDollsMod.Settings;
                if (st != null && st.hairAutoFix != null)
                {
                    st.hairAutoFix.Clear();
                    st.Write();
                }
                Dolls.Invalidate();
            }
            catch (Exception) { }
        }

        public static void ResetHairState()
        {
            try { HairFix.ResetCache(); } catch (Exception) { }
        }

        /// <summary>齿轮按钮在屏幕上的位置（给调整窗口定位用）</summary>
        public static Rect HairGearRect;

        /* t82：HairGearRect 是绘制所在 GUI 组的局部坐标，检视面板的 windowRect 在 LFS 下拿不到（返回 0,0），
           所以每次绘制时把齿轮左上角用 UI.GUIToScreenPoint 换成屏幕 UI 坐标；再用鼠标全局坐标交叉校验。 */
        public static Rect HairGearScreenUI;
        // t88：小窗口锚点用“旧的齿轮位置”（镜像前），窗口位置改回退后整体下移 5px
        public static Rect HairGearLegacyLocal;
        public static Rect HairGearLegacyScreen;

        /* t79：HairGearRect 记录的是「绘制时所在 GUI 组」的局部坐标（检视面板内部），
           而 Window.windowRect 是屏幕坐标。检视面板本身是个 MainTabWindow，
           把局部坐标加上它的 windowRect 才是屏幕坐标。 */
        public static Rect GearInScreen(Rect local)
        {
            try
            {
                MainButtonDef def = DefDatabase<MainButtonDef>.GetNamedSilentFail("Inspect");
                MainTabWindow mt = (def != null) ? def.TabWindow : null;
                if (mt != null)
                {
                    Rect wr = mt.windowRect;
                    return new Rect(local.x + wr.x, local.y + wr.y, local.width, local.height);
                }
            }
            catch (Exception) { }
            return local;
        }
        /* t23-B：点齿轮那一下会先被「点外面」关掉窗口，同一帧 DrawHairGear 又会重开。
           记录「本帧这次关闭来自齿轮点击」，让 DrawHairGear 吞掉该点击，形成确定性 toggle。 */
        internal static int gearCloseFrame = -1;

        /* t107：判断「这次左键是不是点在齿轮上」。
           齿轮记录的是面板局部坐标，窗口回调拿到的是窗口局部坐标，两者都不能直接比较，
           统一换算到 UI 屏幕坐标（GearInScreen 兜底），否则关窗后同帧又会被重开。 */
        public static bool GearUnderMouseUI()
        {
            try
            {
                Vector2 m = UI.MousePositionOnUI;
                Rect g = HairGearScreenUI;
                if (g.width > 1f && g.height > 1f && g.Contains(m)) return true;
                Rect g2 = GearInScreen(HairGearRect);
                if (g2.width > 1f && g2.height > 1f && g2.Contains(m)) return true;
                Event e = Event.current;
                if (e != null && HairGearRect.width > 1f && HairGearRect.Contains(e.mousePosition)) return true;
            }
            catch (Exception) { }
            return false;
        }
        internal static bool gearCloseInGear;

        /// <summary>这个种族的头发是不是 HAR 附加件（true = HAR 头发；false = 原版 HairDef）</summary>
        public static bool RaceHasHarHair(ThingDef raceDef)
        {
            return HairFix.RaceHasHairAddon(raceDef);
        }

        private static void BodyAliasPrefix(ref string bodytype)
        {
            try { bodytype = Dolls.NormalizeBodyName(bodytype); }
            catch (Exception) { }
        }

        // replace the doll NHT picked for this pawn (race keyed, with gender/bodytype fallback)
        private static void GetMainDollPostfix(Pawn pawn, ref HumanlikeDoll __result)        {
            try
            {
                HumanlikeDoll pick = Dolls.Pick(pawn);
                if (pick != null) __result = pick;
            }
            catch (Exception e)
            {
                Log.ErrorOnce("[NHT Custom Dolls] pick failed: " + e, 0x4E434431);
            }
        }

        /* t111（临时诊断）：把 ctx 的悬浮状态打出来，判断「没有部位名」是
           HoveredPart 为空（hovered 没命中）、还是 HoverTooltip 为空、还是 ArmorMode。 */
        private static int hoverDiagFrame = -1000;
        private static DollRenderContext lastHoverCtx;
        private static int dotipDiagFrame = -1000;

        /* t112（临时诊断）：TooltipHandler.DoTooltipGUI 在整帧最后执行，
           如果此时 ctx 里的文本已经没了，说明提示虽然登记了、取文本时却是空。 */
        private static void TooltipGuiDiagPrefix()
        {
            try
            {
                if (!Dolls.DebugOn) return;
                if (Time.frameCount - dotipDiagFrame < 30) return;
                Type th = AccessTools.TypeByName("Verse.TooltipHandler");
                FieldInfo f = th == null ? null : th.GetField("activeTips", BindingFlags.Static | BindingFlags.NonPublic);
                IDictionary dict = f == null ? null : f.GetValue(null) as IDictionary;
                int n = dict == null ? -1 : dict.Count;
                string ctxTip = lastHoverCtx == null ? "noctx"
                    : (lastHoverCtx.HoverTooltip == null ? "null" : ("len" + lastHoverCtx.HoverTooltip.Length));
                string ctxPart = (lastHoverCtx == null || lastHoverCtx.HoveredPart == null)
                    ? "NULL" : lastHoverCtx.HoveredPart.def.defName;
                if (n <= 0 && ctxTip == "null") return;
                dotipDiagFrame = Time.frameCount;
                Log.Message("[NHT hover] dotip tips=" + n + " ctxTip=" + ctxTip + " ctxPart=" + ctxPart
                    + " evt=" + Event.current.type);
            }
            catch (Exception) { }
        }
        private static void TooltipDiagPostfix(object __instance)
        {
            try
            {
                if (!Dolls.DebugOn || __instance == null) return;
                if (Time.frameCount - hoverDiagFrame < 30) return;
                hoverDiagFrame = Time.frameCount;
                PropertyInfo pi = __instance.GetType().GetProperty("Ctx",
                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (pi == null) { Log.Message("[NHT hover] no Ctx property"); return; }
                DollRenderContext ctx = pi.GetValue(__instance, null) as DollRenderContext;
                if (ctx == null) { Log.Message("[NHT hover] ctx null"); return; }
                lastHoverCtx = ctx;
                string r18 = "?", r19 = "?", r64 = "?";
                try
                {
                    if (ctx.Remap != null)
                    {
                        r18 = ctx.Remap.Get(18).ToString();
                        r19 = ctx.Remap.Get(19).ToString();
                        r64 = ctx.Remap.Get(64).ToString();
                    }
                }
                catch (Exception) { }
                string mouse = "?";
                try { Event e0 = Event.current; if (e0 != null) mouse = e0.mousePosition.ToString(); } catch (Exception) { }
                Pawn p = ctx.Pawn;
                Log.Message("[NHT hover] hovered=" + (ctx.HoveredPart == null ? "NULL" : ctx.HoveredPart.def.defName)
                    + " tip=" + (ctx.HoverTooltip == null ? "null" : ("len" + ctx.HoverTooltip.Length))
                    + " hoverRect=" + ctx.HoverRect
                    + " armor=" + ctx.ArmorMode + " filter=" + ctx.FilterMode
                    + " block=" + ctx.BlockOverlay + " blockRect=" + ctx.OverlayBlockRect
                    + " map18=" + r18 + " map19=" + r19 + " map64=" + r64
                    + " pawn=" + (p == null ? "null" : p.def.defName)
                    + " mouse=" + mouse);
            }
            catch (Exception) { }
        }

        // legacy view: the doll registry key is the race defName
        private static bool GetXenotypePrefix(Pawn pawn, ref string __result)        {
            try
            {
                if (pawn == null || pawn.def == null) return true;
                if (Dolls.ForRace(pawn.def.defName) != null)
                {
                    __result = pawn.def.defName;
                    return false;
                }
            }
            catch (Exception) { }
            return true;
        }


        private static readonly List<string> loggedBodies = new List<string>();


        // races with their own BodyDef: map human body part names onto the race's parts
        private static readonly List<string> bodyOrderLogged = new List<string>();

        // bodies whose saved remap was thrown away and rebuilt (t129)
        private static readonly List<string> repairedBodies = new List<string>();

        private static void SolvePostfix(Pawn pawn, ref BodyPartIndexesRemap __result)
        {
            try
            {
                if (pawn == null || pawn.def == null || pawn.def.race == null) return;
                if (Dolls.ForRace(pawn.def.defName) == null) return;

                BodyDef body = pawn.def.race.body;
                // t108：不再跳过 Human —— Miho 这类「原版 Human 身体 + 64+ 自定义部位」
                // 正是需要现场补 64..96 槽位的情形（否则耳朵/尾巴会被判成无效槽位而整条消失）。
                if (body == null) return;

                // NHT keeps the real mapping in its settings dictionary; the renderer however
                // works off the pair list, which the settings UI leaves empty. Publish the pairs
                // from NHT's own numbers (never rebuild them by hand) and only fill the spare
                // slots when the dictionary has none.
                Dictionary<int, int> existing = RemapDict(__result);
                if (existing == null)
                {
                    // NHT 没给这张身体建对照表（Ratkin / Wolfein 这种）：现场构建。
                    // t129：绝不能把结果写回 __result —— 没有 def 的身体拿到的是 NHT 全局共享的
                    // "*" 默认实例，写进去会污染之后所有身体（1.6 下半身消失的根因）。
                    existing = BuildRemap(body);
                    if (existing.Count == 0) return;
                }

                // t125/t126：NHT 给的对照表可能是按“身体下标”直译出来的，遇到身体里
                // 有额外夹层部位（如 Nyaron 的 NR_CatTail 排在 Spine 前面）会整体错位一格，
                // 表现为部位乱掉/悬停名字不对。这里按 def 名逐槽校验，错得多就用自己的名字匹配重建。
                try
                {
                    List<BodyPartRecord> allAp = body.AllParts;
                    int checkedSlots = 0;
                    int mismatched = 0;
                    List<int> bad = new List<int>();
                    foreach (KeyValuePair<int, int> kv in existing)
                    {
                        if (kv.Key < 0 || kv.Key >= NHT_SLOT_DEFS.Length) continue;
                        int wantSide = SideOfLabel(NHT_SLOT_LABELS[kv.Key]);
                        int idx = kv.Value;
                        bool slotBad = false;
                        if (idx < 0 || idx >= allAp.Count) slotBad = true;
                        else
                        {
                            string want = NHT_SLOT_DEFS[kv.Key];
                            string have = allAp[idx].def == null ? "" : allAp[idx].def.defName;
                            if (!string.Equals(want, have, StringComparison.OrdinalIgnoreCase) && want.Length > 0) slotBad = true;
                            else if (wantSide != 0)
                            {
                                int haveSide = SideOfLabel(PartLabelOf(allAp[idx]));
                                if (haveSide != 0 && haveSide != wantSide) slotBad = true;
                            }
                        }
                        if (wantSide == 0 && NHT_SLOT_DEFS[kv.Key].Length == 0) continue;
                        checkedSlots++;
                        if (slotBad) { mismatched++; bad.Add(kv.Key); }
                    }
                    // t128：只做「按名字 + 左右侧」的逐槽局部修正；绝不整表重建、绝不删除条目。
                    // 整表重建（t126）会把手臂/腿这类高槽位判成无效，娃娃只剩躯干以上。

                    // t129：但如果这张表明显是别的身体写的（跨身体污染）或错位/缺槽过多，
                    // 就丢弃它、按本身体重建 —— 绝不能让 Ratkin 用 Milira 的表。
                    // 注意：污染表常见形态是「0..45 正确 + 46..63 缺失 + 64..99 多余」，
                    // 缺失的槽位不会出现在 existing 里，所以必须单独数缺失数。
                    int missingSlots = 0;
                    for (int s = 0; s < NHT_SLOT_DEFS.Length; s++)
                    {
                        if (!existing.ContainsKey(s)) missingSlots++;
                    }
                    if (mismatched + missingSlots > 6)
                    {
                        Dictionary<int, int> rebuilt = BuildRemap(body);
                        if (rebuilt.Count > 0)
                        {
                            existing = rebuilt;
                            if (!repairedBodies.Contains(body.defName))
                            {
                                repairedBodies.Add(body.defName);
                                Log.Message("[NHT Custom Dolls] remap rebuilt for " + body.defName + " (mismatched=" + mismatched + ", missing=" + missingSlots + ")");
                            }
                        }
                    }
                }
                catch (Exception) { }

                // 一次性诊断：游戏里 AllParts 的真实下标顺序（编辑器对照表就用它校准）
                // t123：整段只在 debug 开启时输出（body order / remap / body-map 写入提示都是排查用）
                if (Dolls.DebugOn && !bodyOrderLogged.Contains(body.defName))
                {
                    bodyOrderLogged.Add(body.defName);
                    try
                    {
                        List<string> desc = new List<string>();
                        List<BodyPartRecord> ap = body.AllParts;
                        for (int bi = 0; bi < ap.Count && bi < 80; bi++)
                            desc.Add(bi + ":" + (ap[bi].def == null ? "?" : ap[bi].def.defName));
                        Log.Message("[NHT body order] " + body.defName + " n=" + ap.Count + " | " + string.Join(",", desc.ToArray()));
                        // 同时把 NHT 的“槽位→身体下标”对照也打出来（尾巴这类自定义部位靠它）
                        List<string> remapDesc = new List<string>();
                        foreach (KeyValuePair<int, int> kv2 in existing)
                        {
                            string dn = (kv2.Value >= 0 && kv2.Value < ap.Count && ap[kv2.Value].def != null) ? ap[kv2.Value].def.defName : "?";
                            remapDesc.Add(kv2.Key + "->" + kv2.Value + ":" + dn);
                            if (remapDesc.Count >= 80) break;
                        }
                        Log.Message("[NHT remap] " + body.defName + " | " + string.Join(",", remapDesc.ToArray()));

                        // 把对照表写到编辑器目录，供“按真实槽位修正对照表”使用
                        try
                        {
                            string dir = null;
                            foreach (ModContentPack cp in LoadedModManager.RunningModsListForReading)
                            {
                                if (cp == null || cp.PackageId == null) continue;
                                if (cp.PackageId.IndexOf("nht.customdolls", StringComparison.OrdinalIgnoreCase) >= 0)
                                { dir = cp.RootDir; break; }
                            }
                            if (dir != null)
                            {
                                string path = System.IO.Path.Combine(dir, "Editor", "body-map.json");
                                StringBuilder sb = new StringBuilder();
                                sb.Append("{\"body\":\"").Append(body.defName).Append("\",\"pairs\":[");
                                bool first = true;
                                foreach (KeyValuePair<int, int> kv3 in existing)
                                {
                                    string dn = (kv3.Value >= 0 && kv3.Value < ap.Count && ap[kv3.Value].def != null) ? ap[kv3.Value].def.defName : "?";
                                    if (!first) sb.Append(",");
                                    first = false;
                                    sb.Append("{\"nht\":").Append(kv3.Key).Append(",\"body\":").Append(kv3.Value)
                                      .Append(",\"def\":\"").Append(dn).Append("\"}");
                                }
                                sb.Append("]}");
                                System.IO.File.WriteAllText(path, sb.ToString());
                                // 每个身体单独一份，避免被别的种族覆盖
                                string perBody = System.IO.Path.Combine(dir, "Editor", "body-map-" + body.defName + ".json");
                                System.IO.File.WriteAllText(perBody, sb.ToString());
                                Log.Message("[NHT body map] written " + perBody);
                            }
                        }
                        catch (Exception) { }
                    }
                    catch (Exception) { }
                }

                List<string> pairs = new List<string>();
                List<int> usedIdx = new List<int>();
                bool hasSlots = false;
                foreach (KeyValuePair<int, int> kv in existing)
                {
                    pairs.Add(kv.Key.ToString() + ", " + kv.Value.ToString());
                    usedIdx.Add(kv.Value);
                    if (kv.Key >= 64) hasSlots = true;
                }

                if (!hasSlots)
                {
                    List<BodyPartRecord> dst = body.AllParts;
                    int slot = 64;
                    for (int j = 0; j < dst.Count && slot < 96; j++)
                    {
                        if (usedIdx.Contains(j)) continue;
                        pairs.Add(slot.ToString() + ", " + j.ToString());
                        slot++;
                    }
                }

                BodyPartIndexesRemap remap = Activator.CreateInstance<BodyPartIndexesRemap>();
                remap.defName = "NHTCD_AutoRemap_" + body.defName;
                remap.bodyDefName = body.defName;
                remap.parts = pairs;
                remap.Initialize();
                __result = remap;

                if (!loggedBodies.Contains(body.defName))
                {
                    loggedBodies.Add(body.defName);
                    if (Dolls.DebugOn) Log.Message("[NHT Custom Dolls] map " + body.defName + ": pairs=" + pairs.Count
                        + " from NHT=" + existing.Count + " slots=" + hasSlots);
                }
            }
            catch (Exception e)
            {
                Log.ErrorOnce("[NHT Custom Dolls] part map failed: " + e, 0x4E434432);
            }
        }


        /* NHT 的 64 格部位布局（按 def 名，顺序即槽位） */
        private static readonly string[] NHT_SLOT_DEFS = new string[] { "Torso", "Ribcage", "Sternum", "Pelvis", "Spine", "Stomach", "Heart", "Lung", "Lung", "Kidney", "Kidney", "Liver", "Neck", "Head", "Skull", "Brain", "Eye", "Eye", "Ear", "Ear", "Nose", "Jaw", "Tongue", "Shoulder", "Clavicle", "Arm", "Humerus", "Radius", "Hand", "Finger", "Finger", "Finger", "Finger", "Finger", "Shoulder", "Clavicle", "Arm", "Humerus", "Radius", "Hand", "Finger", "Finger", "Finger", "Finger", "Finger", "Waist", "Leg", "Femur", "Tibia", "Foot", "Toe", "Toe", "Toe", "Toe", "Toe", "Leg", "Femur", "Tibia", "Foot", "Toe", "Toe", "Toe", "Toe", "Toe" };
        /* 与 NHT_SLOT_DEFS 一一对应的左右标签（空串=不分左右）。
           没有它就只能按 def 名匹配，遇到“种族比人类少一节手指/脚趾”的身体（Yuran 4 指 3 趾）
           会把后面每一格都顶偏一格，整条腿/手的部位就全错位了。 */
        private static readonly string[] NHT_SLOT_LABELS = new string[] {
            "", "", "", "", "", "", "",
            "left lung", "right lung", "left kidney", "right kidney", "", "", "", "", "",
            "left eye", "right eye", "left ear", "right ear", "", "", "",
            "left shoulder", "left clavicle", "left arm", "left humerus", "left radius", "left hand",
            "left pinky", "left ring finger", "left middle finger", "left index finger", "left thumb",
            "right shoulder", "right clavicle", "right arm", "right humerus", "right radius", "right hand",
            "right pinky", "right ring finger", "right middle finger", "right index finger", "right thumb",
            "", "left leg", "left femur", "left tibia", "left foot",
            "left little toe", "left fourth toe", "left middle toe", "left second toe", "left big toe",
            "right leg", "right femur", "right tibia", "right foot",
            "right little toe", "right fourth toe", "right middle toe", "right second toe", "right big toe" };

        private static string NormPartLabel(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            string[] parts = s.ToLowerInvariant().Split(new char[] { ' ', '_', '-', '(', ')', '.', ',', '/', '\\' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return "";
            List<string> list = new List<string>(parts);
            list.Sort(StringComparer.Ordinal);
            return string.Join(" ", list.ToArray());
        }

        private static string PartLabelOf(BodyPartRecord rec)
        {
            if (rec == null) return "";
            string lab = null;
            try { lab = rec.customLabel; } catch (Exception) { lab = null; }
            if (string.IsNullOrEmpty(lab) && rec.def != null) lab = rec.def.label;
            return NormPartLabel(lab);
        }

        /* t125：左右标签判定（用于修正“左手指槽位指向右手部位”这类跨侧错配）。 */
        private static int RemapMatchCount(Dictionary<int, int> map, List<BodyPartRecord> ap)
        {
            int n = 0;
            foreach (KeyValuePair<int, int> kv in map)
            {
                if (kv.Key < 0 || kv.Key >= NHT_SLOT_DEFS.Length) continue;
                string want = NHT_SLOT_DEFS[kv.Key];
                if (string.IsNullOrEmpty(want)) continue;
                if (kv.Value < 0 || kv.Value >= ap.Count) continue;
                string have = ap[kv.Value].def == null ? "" : ap[kv.Value].def.defName;
                if (string.Equals(want, have, StringComparison.OrdinalIgnoreCase)) n++;
            }
            return n;
        }

        private static bool RemapLooksSane(Dictionary<int, int> map, int bodyCount)
        {
            List<int> seen = new List<int>();
            foreach (KeyValuePair<int, int> kv in map)
            {
                if (kv.Value < 0 || kv.Value >= bodyCount) return false;
                if (seen.Contains(kv.Value)) return false;
                seen.Add(kv.Value);
            }
            return true;
        }

        // t130：逐槽校验/改写会把本来正确的对照表改坏（Yuran 表现为只剩躯干/颈/头），默认关闭。
        private static int SideOfLabel(string lab)
        {
            if (string.IsNullOrEmpty(lab)) return 0;
            string[] w = lab.Split(' ');
            for (int i = 0; i < w.Length; i++)
            {
                if (string.Equals(w[i], "left", StringComparison.OrdinalIgnoreCase)) return -1;
                if (string.Equals(w[i], "right", StringComparison.OrdinalIgnoreCase)) return 1;
            }
            return 0;
        }

        /* 没有现成对照表时，按 def + 左右标签把身体部位对到 NHT 槽位；多余部位排到 64+ */
        private static Dictionary<int, int> BuildRemap(BodyDef body)
        {
            // t138：按「槽位顺序 vs 身体顺序」做最长公共子序列对齐（跳过翅膀/角/尾巴/光环等额外部位），
            // 只允许名字（去掉种族前缀）与左右侧一致的位置配对。相比逐槽贪心，
            // 插入部位再多也只会整体平移，不会把脚趾配到脚背上；Mincho 这类少部位身体也不会整段丢失。
            Dictionary<int, int> map = new Dictionary<int, int>();
            if (body == null) return map;
            List<BodyPartRecord> all = body.AllParts;
            int n = NHT_SLOT_DEFS.Length;
            int m = all.Count;
            bool[] used = new bool[m];
            int[] slotOf = new int[n];
            for (int i = 0; i < n; i++) slotOf[i] = -1;
            if (m == 0) return map;

            string[] slotKey = new string[n];
            int[] slotSide = new int[n];
            for (int k2 = 0; k2 < n; k2++)
            {
                slotKey[k2] = PartKey(NHT_SLOT_DEFS[k2]);
                slotSide[k2] = k2 < NHT_SLOT_LABELS.Length ? SideOfLabel(NormPartLabel(NHT_SLOT_LABELS[k2])) : 0;
            }
            string[] partKey = new string[m];
            int[] partSide = new int[m];
            for (int p = 0; p < m; p++)
            {
                partKey[p] = all[p].def == null ? "" : PartKey(all[p].def.defName);
                partSide[p] = SideOfLabel(PartLabelOf(all[p]));
            }

            int[,] dp = new int[n + 1, m + 1];
            for (int i = 1; i <= n; i++)
            {
                for (int j = 1; j <= m; j++)
                {
                    int best = dp[i - 1, j] > dp[i, j - 1] ? dp[i - 1, j] : dp[i, j - 1];
                    if (slotKey[i - 1].Length > 0 && slotKey[i - 1] == partKey[j - 1]
                        && (slotSide[i - 1] == 0 || partSide[j - 1] == 0 || slotSide[i - 1] == partSide[j - 1])
                        && dp[i - 1, j - 1] + 1 > best)
                    {
                        best = dp[i - 1, j - 1] + 1;
                    }
                    dp[i, j] = best;
                }
            }
            {
                int i = n, j = m;
                while (i > 0 && j > 0)
                {
                    bool canMatch = slotKey[i - 1].Length > 0 && slotKey[i - 1] == partKey[j - 1]
                        && (slotSide[i - 1] == 0 || partSide[j - 1] == 0 || slotSide[i - 1] == partSide[j - 1]);
                    if (canMatch && dp[i, j] == dp[i - 1, j - 1] + 1)
                    {
                        slotOf[i - 1] = j - 1; used[j - 1] = true; i--; j--;
                    }
                    else if (dp[i - 1, j] >= dp[i, j - 1]) i--;
                    else j--;
                }
            }

            for (int k = 0; k < slotOf.Length; k++) if (slotOf[k] >= 0) map[k] = slotOf[k];
            int slot = NHT_SLOT_DEFS.Length;
            for (int p = 0; p < all.Count; p++)
            {
                if (used[p]) continue;
                map[slot] = p;
                slot++;
            }
            return map;
        }

        /* 身体 def 常带种族前缀（Mincho_Torso / Milira_Halo / RK_BodyPart_Tail），
           取最后一个下划线后的名字才能和 NHT 槽位的标准名对上。 */
        private static string PartKey(string defName)
        {
            if (string.IsNullOrEmpty(defName)) return "";
            int i = defName.LastIndexOf('_');
            string s = (i >= 0 && i + 1 < defName.Length) ? defName.Substring(i + 1) : defName;
            return s.ToLowerInvariant();
        }

        private static Dictionary<int, int> RemapDict(BodyPartIndexesRemap remap)
        {
            try
            {
                if (remap == null) return null;
                System.Reflection.FieldInfo f = typeof(BodyPartIndexesRemap).GetField("PartsRemap",
                    System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                if (f == null) return null;
                Dictionary<int, int> d = f.GetValue(remap) as Dictionary<int, int>;
                return (d != null && d.Count > 0) ? d : null;
            }
            catch (Exception) { return null; }
        }
    

        /* ---------- HAR hair (body addons) ----------
           Milira ships a single, empty HairDef and draws its hair as an AlienRace body addon.
           NiceHealthTab only knows vanilla HairDefs, so the doll shows no hair at all. While NHT
           draws the doll we point the pawn's HairDef at the addon texture that matches the pawn's
           chosen variant, then restore it — the map rendering is untouched. */

        /* 夹层绘制：NHT 每画一个部位都会调用 DollDrawer.DrawPart */
        [HarmonyPatch]
        public static void ResetHairDiag()
        {
            try { HairFix.ResetDiag(); } catch (Exception) { }
        }

        private static class HairFix
        {
            private static Type alienCompType;
            private static FieldInfo addonVariantsField, pawnField;
            private static bool looked, failed;
            private static Pawn curPawn;
            private static object curWidget;
            private static Rect curRect;
            /* 每个种族（HAR addon 列表）各存一份索引：原来全局只初始化一次，
               先画过别的种族就会串号，导致“后背层”被当成额外层画到最上面 */
            private class AddonMeta
            {
                public bool alignHead;
                public float layerOffset;
            }

            private class AddonSet
            {
                public int main = -1, bg = -1;
                public string mainPath, bgPath;
                public readonly List<int> extra = new List<int>();
                public readonly List<int> over = new List<int>();
                public readonly List<string> overPath = new List<string>();
                public readonly List<string> overNames = new List<string>();
                public readonly Dictionary<int, AddonMeta> meta = new Dictionary<int, AddonMeta>();
                public readonly List<string> extraPath = new List<string>();
                public readonly List<int> backExtra = new List<int>();
                public readonly List<string> backExtraPath = new List<string>();
                // t118：侧层（Yuran SideHair / hairB）——画在后脑层之上、前层之下
                public readonly List<int> side = new List<int>();
                public readonly List<string> sidePath = new List<string>();
                public readonly List<string> skipped = new List<string>();
            }
            private static readonly Dictionary<string, AddonSet> addonSets = new Dictionary<string, AddonSet>();
            private static AddonSet cur = new AddonSet();
            private static readonly List<string> missLogged = new List<string>();
            // ---- 部位去色 ----
            private static int colorHairLogged;
            private static FieldInfo dollNameField;
            private static bool dollFieldLooked;
            private static readonly List<string> drawnLogged = new List<string>();
            // ---- 跟随发色 ----
            private static Color hairTintSaved;
            private static bool hairTintActive;
            private static object hairTintPart;
            private static FieldInfo hairTintField;
            private static Texture2D hairTintOldTex;
            private static readonly Dictionary<string, Texture2D> hairTintTexCache = new Dictionary<string, Texture2D>();
            private static readonly List<string> hairTintLogged = new List<string>();
            private static readonly Dictionary<Texture2D, Texture2D> grayHairCache = new Dictionary<Texture2D, Texture2D>();

            // 编辑器开关导出的「发型不乘发色」种族（HairColorModeDef.tintOff），只建一次。
            private static Dictionary<string, bool> hairTintOffDefRaces;

            // Monolyn / Epona Unicorn 的发型贴图本身已带颜色，再乘一次发色会变脏；
            // 只对这些族跳过「发色相乘」，WantGrayHair/GrayOrFlat 的灰度图路径保持不变。
            internal static bool HairTintOffRace(string race)
            {
                if (string.IsNullOrEmpty(race)) return false;
                if (string.Equals(race, "Alien_Unicorn", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(race, "MNRace", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(race, "Monolyn", StringComparison.OrdinalIgnoreCase)) return true;
                if (hairTintOffDefRaces == null)
                {
                    Dictionary<string, bool> set = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
                    try
                    {
                        foreach (HairColorModeDef def in DefDatabase<HairColorModeDef>.AllDefs)
                        {
                            if (def == null || !def.tintOff || string.IsNullOrEmpty(def.race)) continue;
                            set[def.race.Trim()] = true;
                        }
                    }
                    catch (Exception) { }
                    hairTintOffDefRaces = set;
                }
                return hairTintOffDefRaces.ContainsKey(race);
            }


            private static bool WantGrayHair(Pawn pawn)
            {
                if (pawn == null || pawn.def == null) return false;
                CustomDollsSettings st = CustomDollsMod.Settings;
                if (st == null) return false;
                // 有效色彩 = 全局开关 AND 本种族/本人开关。以前只在“全局关色彩”时才走到
                // 后面的逐人判断，于是「个人/种族关色彩」时头发不换灰度图（Epona 的发型
                // 关色后仍显示彩图就是这个原因）。
                bool raceOff = HairTuning.ColorOff(pawn.def.defName);
                bool colorOn = st.desatColorsOn && !raceOff;
                int pid = pawn.thingIDNumber;
                if (pid >= 0 && !HairTuning.SyncPawn(pid))
                    colorOn = HairTuning.GetPawnFlag(st.pawnColor, pid, colorOn);
                return !colorOn;
            }

            private static Texture2D GrayHairTex(Texture2D src)
            {
                if (src == null) return src;
                Texture2D cached;
                if (grayHairCache.TryGetValue(src, out cached) && cached != null) return cached;
                try
                {
                    Color32[] px = null;
                    if (src.isReadable)
                    {
                        px = src.GetPixels32();
                    }
                    else
                    {
                        RenderTexture rt = RenderTexture.GetTemporary(src.width, src.height, 0, RenderTextureFormat.ARGB32);
                        RenderTexture prev = RenderTexture.active;
                        try
                        {
                            Graphics.Blit(src, rt);
                            RenderTexture.active = rt;
                            Texture2D readable = new Texture2D(src.width, src.height, TextureFormat.RGBA32, false);
                            readable.ReadPixels(new Rect(0, 0, src.width, src.height), 0, 0);
                            readable.Apply(false, false);
                            px = readable.GetPixels32();
                            UnityEngine.Object.Destroy(readable);
                        }
                        finally
                        {
                            RenderTexture.active = prev;
                            RenderTexture.ReleaseTemporary(rt);
                        }
                    }
                    if (px == null) return src;
                    for (int i = 0; i < px.Length; i++)
                    {
                        Color32 c = px[i];
                        byte lum = (byte)((c.r * 299 + c.g * 587 + c.b * 114) / 1000);
                        px[i] = new Color32(lum, lum, lum, c.a);
                    }
                    Texture2D g = new Texture2D(src.width, src.height, TextureFormat.RGBA32, false);
                    g.SetPixels32(px);
                    g.Apply(false, false);
                    g.filterMode = src.filterMode;
                    g.wrapMode = src.wrapMode;
                    grayHairCache[src] = g;
                    return g;
                }
                catch (Exception) { return src; }
            }

            /* 读贴图像素（不可读时经 RenderTexture 转存）；失败返回 null */
            /* t12-B：纯色平涂灰 —— t53 起停用（设置改为「非HAR发型阴影」，关=不插手交给原生绘制）。
               GrayHairTex 保留贴图明暗，作为唯一的灰化实现。 */

            /* 所有「头发/附加层应为灰」的绘制点统一走这里（t53 起不再有纯色平涂分支，始终保留贴图明暗） */
            private static Texture2D GrayOrFlat(Texture2D src)
            {
                return GrayHairTex(src);
            }

            public static void ResetDiag()
            {
                addonSets.Clear();
                fitLogged.Clear();
                insertLogged.Clear();
                hairTintLogged.Clear();
                hairMapWritten.Clear();
            }

            private static bool haloDiagLogged;
            private static bool haloActive;
            private static object haloPart;
            private static FieldInfo haloField;
            private static Texture2D haloOldTex;
            private static readonly Dictionary<string, Texture2D> haloRotCache = new Dictionary<string, Texture2D>();
            private static bool haloApplyLogged;
            // t113：AddonFollow 换上去的是「整张画布」贴图（Nyaron 耳朵 256×256、尾巴 128×128），
            // 而宿主 DollBodyPartDef.GetRect 用 width × 当前贴图像素尺寸 算盒子 —— 直接换图会把
            // 绘制框/命中框放大约 6 倍，鼠标悬在可见部位上时框并不在那里（表现为没有部位名）。
            // 这里把换上去的贴图裁到 alpha 包围盒，并按「静态贴图尺寸 / 裁后尺寸」折算 width/height，
            // 使盒子与静态贴图完全一致；裁完仍全透明的（尾巴 _south 是 355 字节空图）跳过换图。
            private static float haloOldW, haloOldH;
            private static bool haloSizeSaved;
            private static readonly Dictionary<int, Texture2D> addonCropCache = new Dictionary<int, Texture2D>();

            /* t110：AddonFollow 换上去的是裸贴图，HAR 原本靠 CutoutComplex 的 _m 遮罩决定
               「哪些像素吃发色」（遮罩红=染色权重，黑=保留原图，比如 Nyaron 耳朵的内耳、
               Nivarian 头发的蝴蝶结）。这里自己把遮罩乘进染色。
               另外尾巴这类 addon 只有 east/north 有图、south 是 355 字节空图，
               换到空图时退回同名方向图，否则部位直接消失。 */
            private static readonly Dictionary<int, Texture2D> addonMaskCache = new Dictionary<int, Texture2D>();
            private static readonly Dictionary<int, bool> addonMaskMiss = new Dictionary<int, bool>();
            private static readonly Dictionary<int, bool> addonPixelCache = new Dictionary<int, bool>();
            private static readonly Dictionary<string, Texture2D> addonDirCache = new Dictionary<string, Texture2D>();

            private static MethodBase TargetMethod()
            {
                Type w = typeof(HumanlikeDoll).Assembly.GetType("NiceHealthTab.DollWidget");
                return w == null ? null : AccessTools.Method(w, "DrawMainDoll");
            }


            private static Dictionary<string, HairFitDef> hairFits;
            private static HairFitDef hairFit;
            private static bool hairOverrideValid;

            /* t80：种族映射的「旧默认值」迁移每局每人只做一次，避免每帧判定 */
            private static readonly List<int> aliasCleanedPawns = new List<int>();

            private static bool LooksLikeLegacyTriple(float s, float x, float y, HairFitDef f)
            {
                // 画布兜底三元组
                if (Mathf.Abs(s - 0.78f) < 0.02f && Mathf.Abs(x) < 0.02f && Mathf.Abs(y + 0.21f) < 0.02f) return true;
                // 原版（vanilla*）三元组
                if (f != null
                    && Mathf.Abs(s - f.vanillaScale) < 0.02f
                    && Mathf.Abs(x - f.vanillaOffsetX) < 0.02f
                    && Mathf.Abs(y - f.vanillaOffsetY) < 0.02f) return true;
                return false;
            }
            private static float hairOverrideScale = 1f, hairOverrideOX = 0f, hairOverrideOY = 0f;

            private static float HairScale(float dflt)
            {
                if (hairOverrideValid) return hairOverrideScale;
                return hairFit == null ? dflt : hairFit.scale;
            }
            private static float HairOffX(float dflt)
            {
                if (hairOverrideValid) return hairOverrideOX;
                return hairFit == null ? dflt : hairFit.offsetX;
            }
            private static float HairOffY(float dflt)
            {
                if (hairOverrideValid) return hairOverrideOY;
                return hairFit == null ? dflt : hairFit.offsetY;
            }

            private static void LoadHairFits()
            {
                hairFits = new Dictionary<string, HairFitDef>();
                foreach (HairFitDef d in DefDatabase<HairFitDef>.AllDefs)
                    if (!hairFits.ContainsKey(d.race ?? "*")) hairFits[d.race ?? "*"] = d;
                // t70c：种族映射（RaceAliasDef）的目标种族若已有 HairFitDef，映射过来的种族直接共用
                try
                {
                    foreach (RaceAliasDef a in DefDatabase<RaceAliasDef>.AllDefs)
                    {
                        if (a == null || string.IsNullOrEmpty(a.from) || string.IsNullOrEmpty(a.to)) continue;
                        HairFitDef tf;
                        if (hairFits.TryGetValue(a.to, out tf) && tf != null && !hairFits.ContainsKey(a.from))
                            hairFits[a.from] = tf;
                    }
                }
                catch (Exception) { }
                dummyFitCache = null;   // DummyHarVanillaFit 的种族缓存跟着失效
            }

            public static void ResetFitCache()
            {
                hairFit = null;
                hairOverrideValid = false;
            }

            private static void UseFit(string race)
            {
                // t70b：种族映射（RaceAliasDef）后，发型缩放/偏移沿用目标种族的数据
                string rawRace = race;
                race = Dolls.AliasRace(race);
                bool aliasedRace = !string.IsNullOrEmpty(rawRace) && rawRace != race;
                if (hairFits == null) LoadHairFits();
                hairFit = null;
                if (!hairFits.TryGetValue(race ?? "*", out hairFit)) hairFits.TryGetValue("*", out hairFit);
                // 游戏内实时调整值覆盖 Def 里的参数（HAR 画布也生效）
                float os = 1f, oxx = 0f, oyy = 0f;
                hairOverrideValid = false;
                if (race != null)
                {
                    CustomDollsSettings st = CustomDollsMod.Settings;
                    bool canvasRace = false;
                    try
                    {
                        ThingDef rd = DefDatabase<ThingDef>.GetNamedSilentFail(race);
                        // t10-P8/t23-C2：Dummy-HAR（如 Mincho）与「有种族 FitDef 的非 HAR」（如 Ratkin）
                        // 都由 DrawVanillaHairColored 按画布单位绘制，权限/校验必须与真 HAR 同口径，
                        // 否则齿轮窗会按原版像素单位写值（1.172 / -23.805 这类脏值直接生效）。
                        canvasRace = rd != null && CanvasRace(rd);
                    }
                    catch (Exception) { }
                    bool globalAllowed = canvasRace
                        ? (st == null || st.harHairUseEditor)
                        : (st != null && st.vanillaHairUseEditor);
                    int pid = curPawn != null ? curPawn.thingIDNumber : -1;
                    bool pawnAllowed = globalAllowed;
                    if (st != null && pid >= 0 && !HairTuning.SyncPawn(pid))
                        pawnAllowed = HairTuning.GetPawnFlag(st.pawnCustom, pid, globalAllowed);
                    bool allowed = pawnAllowed;
                    if (allowed)
                    {
                        bool synced = pid >= 0 && HairTuning.SyncPawn(pid);
                        bool byPawn = !synced && pid >= 0 && HairTuning.TryGet("p" + pid, out os, out oxx, out oyy);
                        // 旧版游戏内滑条按像素保存过，读回来后会把头发甩到屏幕外。
                        // HAR 的合法范围是 ±1 画布单位、0.1–2.5 倍；超出就丢弃这条残留覆盖。
                        if (byPawn && canvasRace && !HairTuning.ValidHarValues(os, oxx, oyy))
                        {
                            HairTuning.Clear("p" + pid);
                            byPawn = false;
                            os = 1f; oxx = 0f; oyy = 0f;
                            if (Dolls.DebugOn) Log.Message("[NHT hair] dropped invalid pawn override p" + pid);
                        }
                        // t80：映射族群历史上被冻结成「默认三元组」的残留，每人每局只迁移一次；
                        // 之后按目标种族的值正常读写，不再反复扫描/清理。
                        if (aliasedRace && byPawn && pid >= 0 && !aliasCleanedPawns.Contains(pid))
                        {
                            aliasCleanedPawns.Add(pid);
                            if (LooksLikeLegacyTriple(os, oxx, oyy, hairFit))
                            {
                                HairTuning.Clear("p" + pid);
                                byPawn = false;
                                os = 1f; oxx = 0f; oyy = 0f;
                                if (Dolls.DebugOn) Log.Message("[NHT hair] migrated legacy override (alias) p" + pid + " race=" + rawRace);
                            }
                        }
                        hairOverrideValid = byPawn;
                        if (!hairOverrideValid) hairOverrideValid = HairTuning.TryGet(race, out os, out oxx, out oyy);
                        if (hairOverrideValid && canvasRace && !HairTuning.ValidHarValues(os, oxx, oyy))
                        {
                            HairTuning.Clear(race);
                            hairOverrideValid = false;
                            os = 1f; oxx = 0f; oyy = 0f;
                            if (Dolls.DebugOn) Log.Message("[NHT hair] dropped invalid race override " + race);
                        }
                        // 没开同步、又还没有自己的值时：把当前看到的值固定成本人值，
                        // 否则它会一直跟着种族值走（表现为“关了同步还是同步”）
                        if (!synced && !byPawn && pid >= 0)
                        {
                            float fs, fx0, fy0;
                            // t23-C2：画布种族固定的是 HairFitDef 三元组（HairScale/Off 在无覆盖时就是
                            // hairFit.scale/offsetX/offsetY），非画布种族仍固定 vanilla*（像素语义）
                            if (canvasRace) { fs = HairScale(0.78f); fx0 = HairOffX(0f); fy0 = HairOffY(-0.21f); }
                            else if (hairFit != null) { fs = hairFit.vanillaScale; fx0 = hairFit.vanillaOffsetX; fy0 = hairFit.vanillaOffsetY; }
                            else { fs = 1f; fx0 = 0f; fy0 = 0f; }
                            // t80：与种族值完全相同的「冻结」没有信息量，不写盘 —— 避免再造出一批
                            // 看起来像默认值、需要以后再清理的覆盖。
                            bool sameAsFit = canvasRace && hairFit != null
                                && Mathf.Abs(fs - hairFit.scale) < 0.001f
                                && Mathf.Abs(fx0 - hairFit.offsetX) < 0.001f
                                && Mathf.Abs(fy0 - hairFit.offsetY) < 0.001f;
                            if (!sameAsFit) HairTuning.Set("p" + pid, fs, fx0, fy0);
                        }
                    }
                }
                hairOverrideScale = os; hairOverrideOX = oxx; hairOverrideOY = oyy;
                if (Dolls.DebugOn && Dolls.LogOnce("fit:" + (rawRace ?? "-") + ":" + (hairOverrideValid ? "p" : "d")))
                {
                    Log.Message("[NHT fit] race=" + (rawRace ?? "-") + " alias=" + (race ?? "-")
                        + " fit=" + (hairFit == null ? "null" : (hairFit.scale + "/" + hairFit.offsetX + "/" + hairFit.offsetY))
                        + " override=" + hairOverrideValid + " os=" + os + "/" + oxx + "/" + oyy
                        + " canvas=" + CanvasRace(DefDatabase<ThingDef>.GetNamedSilentFail(rawRace)));
                }
            }

            private static void Lookup()
            {
                if (looked) return;
                looked = true;
                foreach (System.Reflection.Assembly a in AppDomain.CurrentDomain.GetAssemblies())
                {
                    try
                    {
                        foreach (Type t in a.GetTypes())
                        {
                            if (t.Name != "AlienComp") continue;
                            FieldInfo f = t.GetField("addonVariants", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                            if (f != null) { alienCompType = t; addonVariantsField = f; return; }
                        }
                    }
                    catch (Exception) { }
                }
            }

            private static object AlienSettings(ThingDef raceDef)
            {
                try
                {
                    if (raceDef == null) return null;
                    FieldInfo own = raceDef.GetType().GetField("alienRace", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (own != null) { object v0 = own.GetValue(raceDef); if (v0 != null) return v0; }
                    System.Collections.IList comps = AccessTools.Field(typeof(ThingDef), "comps") == null ? null
                        : AccessTools.Field(typeof(ThingDef), "comps").GetValue(raceDef) as System.Collections.IList;
                    if (comps == null) return null;
                    for (int i = 0; i < comps.Count; i++)
                    {
                        object cp = comps[i];
                        FieldInfo f = cp.GetType().GetField("alienRace", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                        if (f == null) continue;
                        object v = f.GetValue(cp);
                        if (v != null) return v;
                    }
                }
                catch (Exception) { }
                return null;
            }

            /* locate the hair addons (main + background) inside alienPartGenerator.bodyAddons */
            /* 设置里切换「画出所有发型层」后，必须清掉按种族缓存的附加件索引，否则旧结果一直生效 */
            public static void ResetCache()
            {
                try
                {
                    addonSets.Clear();
                    skipLogged.Clear();
                    aboveLogged = false;
                    hairMapWritten.Clear();
                    // 必须置空（不能只 Clear）：UseFit 只在 null 时重新加载 Def
                    hairFits = null;
                    hairFit = null;
                    hairOverrideValid = false;
                }
                catch (Exception) { }
            }

            public static bool RaceHasHairAddon(ThingDef raceDef)
            {
                if (raceDef == null) return false;
                try
                {
                    object ar = AlienSettings(raceDef);
                    if (ar == null) return false;
                    FieldInfo gsF = AccessTools.Field(ar.GetType(), "generalSettings");
                    object gs = gsF == null ? null : gsF.GetValue(ar);
                    if (gs == null) return false;
                    FieldInfo apgF = AccessTools.Field(gs.GetType(), "alienPartGenerator");
                    object apg = apgF == null ? null : apgF.GetValue(gs);
                    if (apg == null) return false;
                    FieldInfo baF = AccessTools.Field(apg.GetType(), "bodyAddons");
                    System.Collections.IList addons = baF == null ? null : baF.GetValue(apg) as System.Collections.IList;
                    if (addons == null) return false;
                    for (int i = 0; i < addons.Count; i++)
                    {
                        object ad = addons[i];
                        FieldInfo ptF = AccessTools.Field(ad.GetType(), "path");
                        string pt = ptF == null ? "" : (ptF.GetValue(ad) as string ?? "");
                        if (pt.StartsWith("Dummy/", StringComparison.OrdinalIgnoreCase)
                            || pt.IndexOf("/Dummy/", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                        if (pt.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) >= 0) return true;
                    }
                }
                catch (Exception) { }
                return false;
            }

            /* 把「这个种族有没有 HAR 头发」写给编辑器：Editor/hair-map.js */
            private static void WriteHairMap(ThingDef raceDef, AddonSet set)
            {
                try
                {
                    if (raceDef == null || set == null) return;
                    string key = raceDef.defName;
                    if (string.IsNullOrEmpty(key) || hairMapWritten.Contains(key)) return;
                    if (hairMapDir == null)
                    {
                        hairMapDir = "";
                        foreach (ModContentPack cp in LoadedModManager.RunningModsListForReading)
                        {
                            if (cp == null || cp.PackageId == null) continue;
                            if (cp.PackageId.IndexOf("nht.customdolls", StringComparison.OrdinalIgnoreCase) < 0) continue;
                            hairMapDir = cp.RootDir;
                            break;
                        }
                    }
                    if (string.IsNullOrEmpty(hairMapDir)) return;
                    bool addon = set.main >= 0 || set.bg >= 0 || set.extra.Count > 0 || set.backExtra.Count > 0;
                    string line = "window.__NHT_HAIRMAP=window.__NHT_HAIRMAP||{};"
                        + "window.__NHT_HAIRMAP[\"" + key + "\"]={addon:" + (addon ? "true" : "false")
                        + ",main:" + set.main + ",bg:" + set.bg
                        + ",extra:" + set.extra.Count + ",count:" + (set.main >= 0 ? 1 : 0) + "};\n";
                    // 写到 Editor/history/（默认锁定的本地目录），避免被推送到仓库
                    string dir = System.IO.Path.Combine(hairMapDir, "Editor", "history");
                    if (!System.IO.Directory.Exists(dir)) System.IO.Directory.CreateDirectory(dir);
                    System.IO.File.AppendAllText(System.IO.Path.Combine(dir, "hair-map.js"), line, new System.Text.UTF8Encoding(false));
                    hairMapWritten.Add(key);
                }
                catch (Exception) { }
            }

            /* ---------------- 自动校正：头发内容顶部 vs 头顶 ---------------- */
            private static readonly Dictionary<string, int> bboxTopCache = new Dictionary<string, int>();
            private static readonly List<string> autoFixLogged = new List<string>();

            private static int TexBboxTop(Texture2D t)
            {
                if (t == null) return -1;
                string key = t.name + "|" + t.width + "x" + t.height;
                int v;
                if (bboxTopCache.TryGetValue(key, out v)) return v;
                v = -1;
                try
                {
                    Color32[] px = null;
                    try { px = t.GetPixels32(); } catch (Exception) { px = null; }
                    if (px == null || px.Length != t.width * t.height)
                    {
                        // 贴图不可读：拷到临时 RenderTexture 再读回
                        Texture2D copy = null;
                        RenderTexture rt = null;
                        RenderTexture prev = RenderTexture.active;
                        try
                        {
                            rt = RenderTexture.GetTemporary(t.width, t.height, 0, RenderTextureFormat.ARGB32, RenderTextureReadWrite.Linear);
                            Graphics.Blit(t, rt);
                            RenderTexture.active = rt;
                            copy = new Texture2D(t.width, t.height, TextureFormat.RGBA32, false);
                            copy.ReadPixels(new Rect(0f, 0f, t.width, t.height), 0, 0);
                            copy.Apply();
                            px = copy.GetPixels32();
                        }
                        catch (Exception) { px = null; }
                        finally
                        {
                            RenderTexture.active = prev;
                            if (rt != null) RenderTexture.ReleaseTemporary(rt);
                            if (copy != null) UnityEngine.Object.Destroy(copy);
                        }
                    }
                    if (px != null && px.Length == t.width * t.height)
                    {
                        for (int y = t.height - 1; y >= 0 && v < 0; y--)
                        {
                            int row = y * t.width;
                            for (int x = 0; x < t.width; x++)
                            {
                                if (px[row + x].a > 8) { v = t.height - 1 - y; break; }
                            }
                        }
                    }
                }
                catch (Exception) { v = -1; }
                bboxTopCache[key] = v;
                return v;
            }

            private static bool HeadTopUnits(out float topUnits, out float headH)
            {
                topUnits = 0f; headH = 0f;
                try
                {
                    if (curWidget == null) return false;
                    PropertyInfo ctxP = curWidget.GetType().GetProperty("Ctx", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    object ctx = ctxP == null ? null : ctxP.GetValue(curWidget);
                    if (ctx == null) return false;
                    FieldInfo mainF = AccessTools.Field(ctx.GetType(), "MainDoll");
                    object doll = mainF == null ? null : mainF.GetValue(ctx);
                    if (doll == null) return false;
                    FieldInfo hpF = AccessTools.Field(doll.GetType(), "headPart");
                    string headName = hpF == null ? null : hpF.GetValue(doll) as string;
                    FieldInfo partsF = AccessTools.Field(doll.GetType(), "Parts");
                    System.Collections.IList parts = partsF == null ? null : partsF.GetValue(doll) as System.Collections.IList;
                    if (parts == null || string.IsNullOrEmpty(headName)) return false;
                    foreach (object pt in parts)
                    {
                        FieldInfo dF = AccessTools.Field(pt.GetType(), "defName");
                        string dn = dF == null ? null : dF.GetValue(pt) as string;
                        if (dn != headName) continue;
                        FieldInfo pf = AccessTools.Field(pt.GetType(), "position");
                        FieldInfo hf2 = AccessTools.Field(pt.GetType(), "height");
                        if (pf == null) return false;
                        Vector2 pos = (Vector2)pf.GetValue(pt);
                        headH = hf2 == null ? 0f : Math.Abs(Convert.ToSingle(hf2.GetValue(pt)));
                        topUnits = pos.y - headH / 2f;
                        return true;
                    }
                }
                catch (Exception) { }
                return false;
            }

            /* 返回需要额外下移/上移的像素（正=下移），并按种族缓存 */
            private static float AutoFixShift(string race, Texture2D tex, Rect[] pending, Rect dollRect, float k, Pawn pawn, out float scaleMul)
            {
                scaleMul = 1f;
                float rh = FitH(dollRect);   // t63：用拟合后的实际高度做比例基准（没有 UI 介入时等于矩形高）
                try
                {
                    CustomDollsSettings st = CustomDollsMod.Settings;
                    if (st == null || !st.autoFixHair || string.IsNullOrEmpty(race) || tex == null) return 0f;
                    if (st.hairAutoFix == null) st.hairAutoFix = new List<string>();
                    // 缓存按「种族#小人」分开：否则一次自动校正会套到同种族所有人身上（表现为互相影响）
                    int apid0 = pawn != null ? pawn.thingIDNumber : -1;
                    string akey = race + "#" + apid0;
                    // 手动调过的小人（有覆盖值）只在偏差很大（>25% 身高）时才校正
                    int apid = pawn != null ? pawn.thingIDNumber : -1;
                    bool manual = HairTuning.ManualPawn(apid);
                    for (int i = 0; i < st.hairAutoFix.Count; i++)
                    {
                        string[] p = (st.hairAutoFix[i] ?? "").Split('|');
                        if (p.Length >= 2 && p[0] == akey)
                        {
                            float f;
                            if (float.TryParse(p[1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out f))
                            {
                                if (p.Length >= 3)
                                {
                                    float sm;
                                    if (float.TryParse(p[2], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out sm))
                                        scaleMul = sm;
                                }
                                return f * rh;
                            }
                        }
                    }
                    if (pending == null || pending.Length == 0) return 0f;
                    Rect r = pending[0];
                    int top = TexBboxTop(tex);
                    if (top < 0) return 0f;
                    float headTop, headH;
                    if (!HeadTopUnits(out headTop, out headH)) return 0f;
                    float contentTop = r.y + ((float)top / tex.height) * r.height;
                    float headTopPx = dollRect.y + dollRect.height / 2f + headTop * k;
                    float dev = contentTop - headTopPx;
                    float thr = (manual ? 0.25f : 0.10f) * rh;
                    if (Math.Abs(dev) < thr) return 0f;
                    float shift = -(dev - Math.Sign(dev) * 0.05f * rh) * 0.5f;
                    bool vanillaRace = pawn != null && pawn.def != null && !RaceHasHairAddon(pawn.def);
                    if (vanillaRace) scaleMul = 1.05f;
                    if (Dolls.DebugOn)
                    {
                        Log.Message("[NHT hair auto] race=" + race + " tex=" + tex.width + "x" + tex.height
                            + " bboxTop=" + top + " dev=" + dev.ToString("F0") + " thr=" + thr.ToString("F0")
                            + " manual=" + manual + " shift=" + shift.ToString("F0"));
                    }
                    float frac = shift / rh;
                    st.hairAutoFix.Add(akey + "|" + frac.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)
                        + "|" + scaleMul.ToString("F4", System.Globalization.CultureInfo.InvariantCulture));
                    st.Write();
                    if (Dolls.DebugOn)
                    {
                        Log.Message("[NHT hair auto] race=" + race + " tex=" + tex.width + "x" + tex.height
                            + " bboxTop=" + top + " contentTop=" + contentTop.ToString("F0")
                            + " headTop=" + headTopPx.ToString("F0") + " dev=" + dev.ToString("F0")
                            + " shift=" + shift.ToString("F0"));
                    }
                    return shift;
                }
                catch (Exception) { return 0f; }
            }

            /* 读 HAR addon 的定位信息：alignWithHead + offsets.south.layerOffset */
            private static AddonMeta ReadAddonMeta(object ad)
            {
                AddonMeta m = new AddonMeta();
                try
                {
                    FieldInfo ah = AccessTools.Field(ad.GetType(), "alignWithHead");
                    if (ah != null) m.alignHead = Convert.ToBoolean(ah.GetValue(ad));
                    object offs = AccessTools.Field(ad.GetType(), "offsets") == null ? null : AccessTools.Field(ad.GetType(), "offsets").GetValue(ad);
                    if (offs != null)
                    {
                        object south = AccessTools.Field(offs.GetType(), "south") == null ? null : AccessTools.Field(offs.GetType(), "south").GetValue(offs);
                        if (south != null)
                        {
                            FieldInfo lo = AccessTools.Field(south.GetType(), "layerOffset");
                            if (lo != null) m.layerOffset = Convert.ToSingle(lo.GetValue(south));
                        }
                    }
                }
                catch (Exception) { }
                return m;
            }

            /* 当前娃娃头部中心（NHT 娃娃坐标单位，相对娃娃中心） */
            private static bool headDeltaValid;
            private static float headDeltaX, headDeltaY;

            private static bool HeadCenterDelta(out float dx, out float dy)
            {
                dx = 0f; dy = 0f;
                if (headDeltaValid) { dx = headDeltaX; dy = headDeltaY; return true; }
                if (HeadCenterDeltaRaw(out dx, out dy))
                {
                    headDeltaX = dx; headDeltaY = dy; headDeltaValid = true;
                    return true;
                }
                return false;
            }

            private static bool HeadCenterDeltaRaw(out float dx, out float dy)
            {
                dx = 0f; dy = 0f;
                try
                {
                    if (curWidget == null) return false;
                    PropertyInfo ctxP = curWidget.GetType().GetProperty("Ctx", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    object ctx = ctxP == null ? null : ctxP.GetValue(curWidget);
                    if (ctx == null) return false;
                    FieldInfo mainF = AccessTools.Field(ctx.GetType(), "MainDoll");
                    object doll = mainF == null ? null : mainF.GetValue(ctx);
                    if (doll == null) return false;
                    FieldInfo hpF = AccessTools.Field(doll.GetType(), "headPart");
                    string headName = hpF == null ? null : hpF.GetValue(doll) as string;
                    FieldInfo partsF = AccessTools.Field(doll.GetType(), "Parts");
                    System.Collections.IList parts = partsF == null ? null : partsF.GetValue(doll) as System.Collections.IList;
                    if (parts == null || string.IsNullOrEmpty(headName)) return false;
                    foreach (object pt in parts)
                    {
                        FieldInfo dF = AccessTools.Field(pt.GetType(), "defName");
                        string dn = dF == null ? null : dF.GetValue(pt) as string;
                        if (dn != headName) continue;
                        FieldInfo pf = AccessTools.Field(pt.GetType(), "position");
                        if (pf == null) return false;
                        Vector2 pos = (Vector2)pf.GetValue(pt);
                        dx = pos.x; dy = pos.y;
                        return true;
                    }
                }
                catch (Exception) { }
                return false;
            }

            private static string BodytypeName(object doll)
            {
                try
                {
                    object bt = ReadEnumLike(doll, "bodytype");
                    if (bt == null) return "";
                    string n = bt as string;
                    if (n != null) return n;
                    object dn = ReadEnumLike(bt, "defName");
                    if (dn is string) return (string)dn;
                    return bt.ToString() ?? "";
                }
                catch (Exception) { return ""; }
            }

            /* 默认娃娃的头部位置（优先 bodytype=*，其次 Female，最后按 defName） */
            private static readonly Dictionary<string, Vector2> refHeadCache = new Dictionary<string, Vector2>();

            private static bool RefHead(string race, out float rx, out float ry)
            {
                rx = 0f; ry = 0f;
                if (!string.IsNullOrEmpty(race))
                {
                    Vector2 cached;
                    if (refHeadCache.TryGetValue(race, out cached)) { rx = cached.x; ry = cached.y; return true; }
                }
                try
                {
                    if (string.IsNullOrEmpty(race)) return false;
                    Dictionary<string, List<HumanlikeDoll>> map = Dolls.ByRace();
                    List<HumanlikeDoll> list;
                    if (map == null || !map.TryGetValue(race, out list) || list == null || list.Count == 0) return false;
                    HumanlikeDoll pick = null;
                    int bestScore = int.MaxValue;
                    string bestDef = null;
                    for (int i = 0; i < list.Count; i++)
                    {
                        HumanlikeDoll d = list[i];
                        if (d == null) continue;
                        string bt = BodytypeName(d);
                        int score = (bt == "*" || bt.Length == 0) ? 0 : (bt == "Female" ? 1 : 2);
                        string dn = d.defName ?? "";
                        if (score < bestScore || (score == bestScore && string.CompareOrdinal(dn, bestDef ?? "") < 0))
                        {
                            bestScore = score; bestDef = dn; pick = d;
                        }
                    }
                    if (pick == null) return false;
                    object hp = ReadEnumLike(pick, "headPart");
                    string headName = hp as string;
                    if (string.IsNullOrEmpty(headName)) return false;
                    object partsObj = ReadEnumLike(pick, "parts");
                    System.Collections.IList parts = partsObj as System.Collections.IList;
                    if (parts == null) return false;
                    for (int i = 0; i < parts.Count; i++)
                    {
                        object p = parts[i];
                        if (p == null) continue;
                        object dn = ReadEnumLike(p, "defName");
                        if (!(dn is string) || (string)dn != headName) continue;
                        object pos = ReadEnumLike(p, "position");
                        if (pos is Vector2)
                        {
                            Vector2 v = (Vector2)pos; rx = v.x; ry = v.y;
                            if (!string.IsNullOrEmpty(race)) refHeadCache[race] = v;
                            return true;
                        }
                    }
                }
                catch (Exception) { }
                return false;
            }

            /* 只把真正的 HairB / MRHairB10 当后层；HairBangs / HairBase 这类前发不能误判 */
            private static bool PathHasHairB(string pt)
            {
                int i = 0;
                while (true)
                {
                    i = pt.IndexOf("HairB", i, StringComparison.OrdinalIgnoreCase);
                    if (i < 0) return false;
                    bool leftOk = i == 0 || pt[i - 1] == '/' || pt[i - 1] == '_' || pt[i - 1] == '\\';
                    int j = i + 5;
                    bool rightOk = j >= pt.Length || char.IsDigit(pt[j]) || pt[j] == '.' || pt[j] == '_' || pt[j] == '/' || pt[j] == '\\';
                    if (leftOk && rightOk) return true;
                    i += 5;
                }
            }

            /* t117：Yuran 这类把「后脑层」写成数值前加 A（YR_hairA5 / InHair/YR_hairA）。
               规则与 HairB 完全相同，否则 HairA 会被当成前层头发。 */
            private static bool PathHasHairA(string pt)
            {
                return PathHasHairLetter(pt, 'A');
            }

            private static bool PathHasHairLetter(string pt, char letter)
            {
                string tag = "Hair" + letter;
                int i = 0;
                while (true)
                {
                    i = pt.IndexOf(tag, i, StringComparison.OrdinalIgnoreCase);
                    if (i < 0) return false;
                    bool leftOk = i == 0 || pt[i - 1] == '/' || pt[i - 1] == '_' || pt[i - 1] == '\\';
                    int j = i + tag.Length;
                    bool rightOk = j >= pt.Length || char.IsDigit(pt[j]) || pt[j] == '.' || pt[j] == '_' || pt[j] == '/' || pt[j] == '\\';
                    if (leftOk && rightOk) return true;
                    i += tag.Length;
                }
            }

            private static void InitAddons(ThingDef raceDef)
            {
                string key = raceDef == null ? "?" : raceDef.defName;
                AddonSet cached;
                if (!Dolls.DebugOn && addonSets.TryGetValue(key, out cached)) { cur = cached; WriteHairMap(raceDef, cached); return; }
                cur = new AddonSet();
                addonSets[key] = cur;
                try
                {
                    object ar = AlienSettings(raceDef);
                    if (ar == null) return;
                    FieldInfo gsF = AccessTools.Field(ar.GetType(), "generalSettings");
                    object gs = gsF == null ? null : gsF.GetValue(ar);
                    if (gs == null) return;
                    FieldInfo apgF = AccessTools.Field(gs.GetType(), "alienPartGenerator");
                    object apg = apgF == null ? null : apgF.GetValue(gs);
                    if (apg == null) return;
                    FieldInfo baF = AccessTools.Field(apg.GetType(), "bodyAddons");
                    System.Collections.IList addons = baF == null ? null : baF.GetValue(apg) as System.Collections.IList;
                    if (addons == null) return;
                    for (int i = 0; i < addons.Count; i++)
                    {
                        object ad = addons[i];
                        FieldInfo nmF = AccessTools.Field(ad.GetType(), "name");
                        FieldInfo ptF = AccessTools.Field(ad.GetType(), "path");
                        string nm = nmF == null ? "" : (nmF.GetValue(ad) as string ?? "");
                        string pt = ptF == null ? "" : (ptF.GetValue(ad) as string ?? "");
                        if (pt.StartsWith("Dummy/", StringComparison.OrdinalIgnoreCase)
                            || pt.IndexOf("/Dummy/", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            cur.skipped.Add(nm + " -> " + pt + " (dummy)");
                            continue;
                        }
                        AddonMeta meta = ReadAddonMeta(ad);
                        bool isAhoge = pt.IndexOf("Ahoge", StringComparison.OrdinalIgnoreCase) >= 0;
                        if (pt.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) < 0 && !isAhoge) continue;
                        if (isAhoge)
                        {
                            // 呆毛/额发：单独一层，画在头发之上；addonB/addonC 是同一套贴图的重复目录，只收一次
                            string normAhoge = pt.Replace("/addonC/", "/addonB/");
                            string lowNm = nm.ToLowerInvariant();
                            bool dupAhoge = false;
                            for (int q = 0; q < cur.overPath.Count; q++)
                            {
                                if (string.Equals(cur.overPath[q].Replace("/addonC/", "/addonB/"), normAhoge, StringComparison.OrdinalIgnoreCase))
                                { dupAhoge = true; break; }
                                string n2 = cur.overNames[q];
                                if (n2 == lowNm)
                                { dupAhoge = true; break; }
                            }
                            if (!dupAhoge) { cur.over.Add(i); cur.overPath.Add(pt); cur.overNames.Add(lowNm); cur.meta[i] = meta; }
                            else { cur.skipped.Add(nm + " -> " + pt + " (duplicate ahoge)"); }
                            continue;
                        }
                        // 一次识别：HAR 的 layerOffset（<0 在后，>0 在前）
                        bool autoBack = meta.layerOffset < -0.001f;
                        bool autoFront = meta.layerOffset > 0.001f;
                        // 二次识别：命名/路径关键词（没有 layerOffset 的旧模组）
                        bool keyBack = nm.IndexOf("BG", StringComparison.OrdinalIgnoreCase) >= 0
                                 || nm.IndexOf("back", StringComparison.OrdinalIgnoreCase) >= 0
                                 || pt.IndexOf("HairBack", StringComparison.OrdinalIgnoreCase) >= 0
                                 || pt.IndexOf("Hair_Back", StringComparison.OrdinalIgnoreCase) >= 0
                                 || pt.IndexOf("Background", StringComparison.OrdinalIgnoreCase) >= 0
                                 || pt.IndexOf("/addonB/", StringComparison.OrdinalIgnoreCase) >= 0
                                 || pt.IndexOf("/addonC/", StringComparison.OrdinalIgnoreCase) >= 0
                                 || PathHasHairB(pt)
                                 || PathHasHairA(pt);
                        bool isBg = keyBack;
                        if (!isBg && nm.IndexOf("hair", StringComparison.OrdinalIgnoreCase) < 0
                            && pt.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) < 0) continue;
                        if (isBg)
                        {
                            // 后层一律在最底层画：第一个记成 bg；其它后层默认不画（可能又是另一套发型）
                            bool allLayersBg = (CustomDollsMod.Settings != null && CustomDollsMod.Settings.drawAllHairLayers);
                            bool thisA = PathHasHairA(pt);
                            bool thisB = PathHasHairB(pt);
                            bool bgIsA = cur.bg >= 0 && PathHasHairA(cur.bgPath);
                            if (!thisA && thisB && bgIsA)
                            {
                                // t118：已经有 A（后脑层）时，B（hairB / SideHair）作为侧层单独画，不再被丢弃
                                cur.side.Add(i); cur.sidePath.Add(pt);
                            }
                            else if (thisA && cur.bg >= 0 && PathHasHairB(cur.bgPath))
                            {
                                // 顺序反了：先把误当后层的 B 挪到侧层，A 才是后脑层
                                cur.side.Add(cur.bg); cur.sidePath.Add(cur.bgPath);
                                cur.bg = i; cur.bgPath = pt;
                            }
                            else if (cur.bg < 0) { cur.bg = i; cur.bgPath = pt; }
                            else if (string.Equals(pt.Replace("/addonC/", "/addonB/"), cur.bgPath.Replace("/addonC/", "/addonB/"), StringComparison.OrdinalIgnoreCase))
                            {
                                // addonB/addonC 是同一套后层贴图的重复目录：只画一次
                                cur.skipped.Add(nm + " -> " + pt + " (duplicate bg)");
                            }
                            else if (allLayersBg) { cur.backExtra.Add(i); cur.backExtraPath.Add(pt); }
                            else { cur.skipped.Add(nm + " -> " + pt); }
                        }
                        else
                        {
                            // milira highlight / BattleHighlight 是头部战斗高光，不是头发层，画出来会像第二根呆毛
                            if (nm.IndexOf("highlight", StringComparison.OrdinalIgnoreCase) >= 0
                                || pt.IndexOf("highlight", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                cur.skipped.Add(nm + " -> " + pt + " (highlight, not hair)");
                                continue;
                            }
                            // 呆毛 / 高光：永远只算「附加层」，不能当主发（否则真发会被当成多余层丢掉）
                            bool small = nm.IndexOf("ahoge", StringComparison.OrdinalIgnoreCase) >= 0
                                      || nm.IndexOf("highlight", StringComparison.OrdinalIgnoreCase) >= 0
                                      || pt.IndexOf("ahoge", StringComparison.OrdinalIgnoreCase) >= 0
                                      || pt.IndexOf("highlight", StringComparison.OrdinalIgnoreCase) >= 0;
                            bool allLayers = (CustomDollsMod.Settings != null && CustomDollsMod.Settings.drawAllHairLayers);
                            if (small)
                            {
                                if (allLayers || cur.extra.Count < 2) { cur.extra.Add(i); cur.extraPath.Add(pt); }
                                else { cur.skipped.Add(nm + " -> " + pt); }
                            }
                            else if (cur.main < 0)
                            {
                                // 第一层「正片头发」= 主发（前发 / 整头）
                                cur.main = i; cur.mainPath = pt; cur.meta[i] = meta;
                            }
                            else if (allLayers)
                            {
                                // 旧行为：其它发型也叠着画
                                cur.extra.Add(i); cur.extraPath.Add(pt); cur.meta[i] = meta; cur.meta[i] = meta;
                            }
                            else
                            {
                                cur.skipped.Add(nm + " -> " + pt);
                            }
                        }
                    }
                    StringBuilder dump = new StringBuilder("[NHT Custom Dolls] addon list:");
                    for (int i = 0; i < addons.Count; i++)
                    {
                        object ad2 = addons[i];
                        FieldInfo nm2 = AccessTools.Field(ad2.GetType(), "name");
                        FieldInfo pt2 = AccessTools.Field(ad2.GetType(), "path");
                        dump.Append("\n  [" + i + "] " + (nm2 == null ? "?" : (nm2.GetValue(ad2) as string))
                            + " -> " + (pt2 == null ? "?" : (pt2.GetValue(ad2) as string)));
                    }
                    // t38：debug 打开时 InitAddons 每帧重建 addon 表，这两条会被每帧刷一遍 —— 同种族只留第一条
                    // t43：同时写一份到 Config/NHTCD_Debug.log（Player.log 的限流行为不变）
                    if (Dolls.DebugOn)
                    {
                        Dolls.LogDebug("addons:" + key, dump.ToString());
                        Dolls.LogDebug("addons:" + key + "|sum", "[NHT Custom Dolls] hair addons(" + key + "): main=" + cur.main + " bg=" + cur.bg
                        + " extra=" + cur.extra.Count + " over=" + cur.over.Count + " backExtra=" + cur.backExtra.Count
                        + " paths=" + cur.mainPath + " / " + cur.bgPath
                        + " 主发=" + (cur.mainPath ?? "-")
                        + " 附加=" + string.Join(", ", cur.extraPath.ToArray())
                        + (cur.skipped.Count > 0 ? " 跳过=" + string.Join(", ", cur.skipped.ToArray()) : ""));
                    }
                }
                catch (Exception) { }
                WriteHairMap(raceDef, cur);
            }


            /* HAR 变体 0 = 没有附加件。这时小人若用的是原版/其它模组的发型，
               就按发型贴图自己在头部位置画一层，NHT 里也能看到。 */
            private static void DrawVanillaHair(Pawn pawn, Rect dollRect)
            {
                if (cur.main >= 0) return;   // 这个种族已经有 HAR 头发 addon，别再叠一层原版发型
                try
                {
                    HairDef hd = pawn.story == null ? null : pawn.story.hairDef;
                    if (hd == null || string.IsNullOrEmpty(hd.texPath)) return;
                    if (hd.defName != null && hd.defName.IndexOf("Null", StringComparison.OrdinalIgnoreCase) >= 0) return;
                    Texture2D tex = ContentFinder<Texture2D>.Get(hd.texPath + "_south", false);
                    if (tex == null) tex = ContentFinder<Texture2D>.Get(hd.texPath + "_north", false);
                    if (tex == null) tex = ContentFinder<Texture2D>.Get(hd.texPath, false);
                    if (tex == null)
                    {
                        if (!vanillaLogged)
                        {
                            vanillaLogged = true;
                            if (Dolls.DebugOn) Log.Warning("[NHT Custom Dolls] vanilla hair missing for " + (pawn.LabelShort ?? "?") + ": " + hd.texPath
                                + " (def=" + hd.defName + ")");
                        }
                        return;
                    }

                    float k = HairK(dollRect);
                    UseFit(pawn.def.defName);
                    float sc = (HairScale(0.78f));
                    // 原版发型贴图是"头部大小"（约 128~256px），按头部区域换算
                    float size = tex.width * 2f * sc * k;   // 128 贴图 ≈ 256 娃娃单位
                    float cx = dollRect.x + dollRect.width / 2f + (HairOffX(0)) * 1024f * k;
                    float oyV = HairOffY(-0.36f);
                    // 用户校准：Nivarian 的 LongStraightA 画布重心偏上，固定使用 -0.23 的纵向偏移
                    if (hd.defName == "NivarianHair_LongStraightA" && !hairOverrideValid) oyV = -0.23f;
                    float cy = dollRect.y + dollRect.height / 2f + oyV * 1024f * k;
                    Rect r = new Rect(cx - size / 2f, cy - size / 2f, size, size);
                    bool tint = CustomDollsMod.Settings != null && CustomDollsMod.Settings.tintVanillaHair
                        && !HairTuning.ColorOff(pawn.def.defName);
                    int pid = pawn.thingIDNumber;
                    if (tint && CustomDollsMod.Settings != null && pid >= 0 && !HairTuning.SyncPawn(pid))
                        tint = HairTuning.GetPawnFlag(CustomDollsMod.Settings.pawnColor, pid, true);
                    if (tint && HairTintOffRace(pawn.def.defName)) tint = false;
                    Color old = GUI.color;
                    GUI.color = tint ? pawn.story.HairColor : Color.white;
                    Texture2D vtex = WantGrayHair(pawn) ? GrayOrFlat(tex) : tex;
                    GUI.DrawTexture(r, vtex, ScaleMode.StretchToFill, true);
                    GUI.color = old;
                    if (!vanillaLogged)
                    {
                        vanillaLogged = true;
                        if (Dolls.DebugOn) Log.Message("[NHT Custom Dolls] hair: vanilla style " + hd.defName + " tex=" + hd.texPath);
                    }
                }
                catch (Exception) { }
            }

            private static bool vanillaLogged;

            private static readonly List<string> diagLogged = new List<string>();

            private static void Draw(object widget, Pawn pawn, Rect dollRect, int index, string path)
            {
                if (pawn != null && diagLogged.Count < 60)
                {
                    string key = pawn.LabelShort + "|" + index;
                    if (!diagLogged.Contains(key))
                    {
                        diagLogged.Add(key);
                        object c1 = null;
                        foreach (ThingComp c0 in pawn.AllComps) if (alienCompType != null && alienCompType.IsInstanceOfType(c0)) { c1 = c0; break; }
                        List<int> v1 = c1 == null ? null : addonVariantsField.GetValue(c1) as List<int>;
                        if (Dolls.DebugOn) Log.Message("[NHT hair diag] " + pawn.LabelShort + " race=" + pawn.def.defName
                            + " idx=" + index + " comp=" + (c1 != null) + " variants=" + (v1 == null ? -1 : v1.Count)
                            + (v1 != null && index >= 0 && index < v1.Count ? " v=" + v1[index] : "")
                            + " all=[" + (v1 == null ? "" : string.Join(",", v1.ConvertAll(x => x.ToString()).ToArray())) + "]"
                            + " path=" + (path ?? "null") + " hairDef=" + (pawn.story == null || pawn.story.hairDef == null ? "null" : pawn.story.hairDef.defName));
                    }
                }
                if (index < 0 || path == null || pawn == null) return;
                object comp = null;
                foreach (ThingComp c0 in pawn.AllComps) if (alienCompType.IsInstanceOfType(c0)) { comp = c0; break; }
                if (comp == null) return;
                List<int> variants = addonVariantsField.GetValue(comp) as List<int>;
                if (variants == null || index >= variants.Count) return;
                int variant = variants[index];
                if (variant < 0) return;              // 负数才是“没有”

                // HAR: 变体 0 用 path 本身（无数字），1..N 用 path+N
                string full = variant > 0 ? path + variant + "_south" : path + "_south";
                Texture2D tex = ContentFinder<Texture2D>.Get(full, false);
                if (tex == null)
                {
                    if (Dolls.DebugOn) Log.Warning("[NHT Custom Dolls] hair texture missing: " + full);
                    DrawVanillaHair(pawn, dollRect);
                    return;
                }

                float k = HairK(dollRect);
                // the addon textures are full-body squares: 512 tex px covers the 1024 tall doll.
                // HAIR_SCALE / HAIR_SHIFT_* compensate for HAR drawing these at 1.5 cells
                UseFit(pawn.def.defName);
                float HAIR_SCALE = HairScale(0.78f);
                float HAIR_SHIFT_Y = HairOffY(-0.21f);
                float HAIR_SHIFT_X = HairOffX(0f);
                float scale = 1024f / Math.Max(1, tex.width) * HAIR_SCALE;
                float w = tex.width * scale * k, h = tex.height * scale * k;
                float cx = dollRect.x + dollRect.width / 2f + HAIR_SHIFT_X * 1024f * k;
                float cy = dollRect.y + dollRect.height / 2f + HAIR_SHIFT_Y * 1024f * k;
                AddonMeta am;
                if (cur.meta != null && cur.meta.TryGetValue(index, out am) && am.alignHead)
                {
                    float hx0 = 0f, hy0 = 0f, rx0 = 0f, ry0 = 0f;
                    bool okHead = HeadCenterDelta(out hx0, out hy0);
                    bool okRef = okHead && RefHead(pawn.def.defName, out rx0, out ry0);
                    if (okRef)
                    {
                        // 相对默认娃娃的头部偏移：默认体型不变，其它体型/版本跟随真实头部
                        cx += (hx0 - rx0) * k;
                        cy += (hy0 - ry0) * k;
                    }
                }
                Rect r = new Rect(cx - w / 2f, cy - h / 2f, w, h);
                if (Dolls.DebugOn)
                    Dolls.LogDebug("hairgeom:" + pawn.def.defName + ":har:" + Math.Round(dollRect.width).ToString(),
                        "[NHT hair geom] race=" + pawn.def.defName + " src=har k=" + k.ToString("F4")
                        + " c=" + cx.ToString("F1") + "," + cy.ToString("F1")
                        + " size=" + w.ToString("F1") + "x" + h.ToString("F1")
                        + " outer=" + dollRect.width.ToString("F1") + "x" + dollRect.height.ToString("F1")
                        + " fit=" + curFitK.ToString("F4"));
                try
                {
                    Rect[] pend = new Rect[] { r };
                    float smul;
                    float fix = AutoFixShift(pawn.def.defName, tex, pend, dollRect, k, pawn, out smul);
                    if (fix != 0f) r.y += fix;
                }
                catch (Exception) { }
                Color old = GUI.color;
                bool harGlobalColor = CustomDollsMod.Settings == null || CustomDollsMod.Settings.harHairTint;
                harGlobalColor = harGlobalColor && !HairTuning.ColorOff(pawn.def.defName);
                int hpid = pawn.thingIDNumber;
                bool harColor = (CustomDollsMod.Settings != null && hpid >= 0 && !HairTuning.SyncPawn(hpid))
                    ? HairTuning.GetPawnFlag(CustomDollsMod.Settings.pawnColor, hpid, harGlobalColor)
                    : harGlobalColor;
                if (harColor && HairTintOffRace(pawn.def.defName)) harColor = false;
                GUI.color = harColor ? pawn.story.HairColor : Color.white;
                Texture2D htex = WantGrayHair(pawn) ? GrayOrFlat(tex) : tex;
                GUI.DrawTexture(r, htex, ScaleMode.StretchToFill, true);
                // t38：这条每帧每个发件都会走（t37 日志里 4926 条/档，约占全文 4 成），改走统一限流：
                // 同一 race + 贴图只留第一条；信息量保持（label / 贴图 / rect）。debug 关闭时 LogOnce 直接 false，不拼字符串。
                if (Dolls.DebugOn)
                {
                    // t43：统一入口 —— 文件通道不受 Player.log 200 条上限影响
                    Dolls.LogDebug("draw:" + pawn.def.defName + "|" + full,
                        "[NHT Custom Dolls] hair draw " + (pawn.LabelShort ?? "?") + " " + full
                        + " rect=" + Mathf.RoundToInt(w) + "x" + Mathf.RoundToInt(h));
                }
                GUI.color = old;
            }

            internal static bool drawnThisFrame;
            private static bool mainDrawn, extrasDrawn;   // 这一帧头发/前发层是否已画
            private static int lastLayer = int.MinValue;
            private static readonly List<string> insertLogged = new List<string>();
            private static readonly List<string> fitLogged = new List<string>();

            /* called from the DrawPart hook: draw the hair just before the first part that sits
               above the hair layer, so the authored layer actually orders hair against parts */

            /* 头发画完后，把层级高于头发的部位（光环等）补画一遍，保证它们在最上面 */
            // t63：部位自身的绘制层级（宿主类 DollBodyPartDef 的 public 字段 layer，int）。
            // 反射字段名用 DumpIl 实测确认过；取不到时返回 int.MinValue（保守处理：不跳过，照旧重画）。
            private static readonly Dictionary<Type, FieldInfo> partLayerFields = new Dictionary<Type, FieldInfo>();
            private static void RedrawAboveHair(object widget, Pawn pawn, Rect dollRect)
            {
                try
                {
                    if (IsXray(widget)) return;
                    if (widget == null) return;
                    PropertyInfo ctxP = widget.GetType().GetProperty("Ctx", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    object ctx = ctxP == null ? null : ctxP.GetValue(widget);
                    if (ctx == null) return;
                    FieldInfo mainF = AccessTools.Field(ctx.GetType(), "MainDoll");
                    object doll = mainF == null ? null : mainF.GetValue(ctx);
                    if (doll == null) return;
                    FieldInfo partsF = AccessTools.Field(doll.GetType(), "Parts");
                    System.Collections.IList parts = partsF == null ? null : partsF.GetValue(doll) as System.Collections.IList;
                    if (parts == null) return;
                    float k = HairK(dollRect);
                    float cx0 = dollRect.x + dollRect.width / 2f, cy0 = dollRect.y + dollRect.height / 2f;
                    int hairLayer = hairFit == null ? 25 : (int)hairFit.layer;
                    int drawn = 0;
                    // 收集「置顶重画 + 联动置顶」，按置顶层级升序画（越大越靠上）
                    Dictionary<string, int> topLevel = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    Dictionary<string, bool> topVanilla = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
                    if (hairFit != null)
                    {
                        if (hairFit.topParts != null)
                        {
                            for (int q = 0; q < hairFit.topParts.Count; q++)
                            {
                                TopPartRef tp = hairFit.topParts[q];
                                if (tp == null || string.IsNullOrEmpty(tp.part)) continue;
                                topLevel[tp.part] = tp.level;
                                topVanilla[tp.part] = tp.vanilla;
                            }
                        }
                        if (hairFit.aboveParts != null)
                        {
                            for (int q = 0; q < hairFit.aboveParts.Count; q++)
                            {
                                string ap = hairFit.aboveParts[q];
                                if (string.IsNullOrEmpty(ap) || topLevel.ContainsKey(ap)) continue;
                                topLevel[ap] = 29;
                                topVanilla[ap] = false;
                            }
                        }
                    }
                    bool tintOn = CustomDollsMod.Settings != null && CustomDollsMod.Settings.tintVanillaHair;
                    bool raceHasHarHair = pawn != null && pawn.def != null && RaceHasHairAddon(pawn.def);
                    List<KeyValuePair<int, object>> queue = new List<KeyValuePair<int, object>>();
                    foreach (object pt in parts)
                    {
                        if (pt == null) continue;
                        FieldInfo imf0 = AccessTools.Field(pt.GetType(), "imagePath");
                        string img0 = imf0 == null ? null : (imf0.GetValue(pt) as string);
                        if (string.IsNullOrEmpty(img0)) continue;
                        FieldInfo dnF = AccessTools.Field(pt.GetType(), "defName");
                        string defName0 = dnF == null ? null : (dnF.GetValue(pt) as string);
                        if (string.IsNullOrEmpty(defName0) || !topLevel.ContainsKey(defName0)) continue;
                        bool vanillaOnly;
                        topVanilla.TryGetValue(defName0, out vanillaOnly);
                        if (vanillaOnly && (!tintOn || raceHasHarHair)) continue;   // 联动置顶只在非 HAR 上色开启时生效
                        // t63b：**不做去重** —— 用户的置顶重画/联动是给非 HAR 上色用的：重画后头发会压住
                        // layer 高于发层的部位，所以必须先画头发、再把这类部位重画一遍。层级语义不能被改写。
                        // 双显改为「重画时套用当前颜色变体」（见下方 queue 绘制循环），两份像素一致即不再错位。
                        queue.Add(new KeyValuePair<int, object>(topLevel[defName0], pt));
                    }
                    queue.Sort(delegate (KeyValuePair<int, object> a, KeyValuePair<int, object> b) { return a.Key.CompareTo(b.Key); });
                    foreach (KeyValuePair<int, object> item in queue)
                    {
                        object pt = item.Value;
                        FieldInfo imf = AccessTools.Field(pt.GetType(), "imagePath");
                        string img = imf == null ? null : (imf.GetValue(pt) as string);
                        if (string.IsNullOrEmpty(img)) continue;
                        string defName = AccessTools.Field(pt.GetType(), "defName") == null ? null
                            : (AccessTools.Field(pt.GetType(), "defName").GetValue(pt) as string);
                        // 去色：这一格如果该画灰色，就改用 _NHTCD_Gray 那件的贴图/位置
                        object srcPt = pt;
                        try
                        {
                            string raceNow = pawn != null && pawn.def != null ? pawn.def.defName : null;
                            if (WantGrayNow(pawn, raceNow, DollNameOf(widget), defName, -1))
                            {
                                object grayPt = null;
                                foreach (object gp in parts)
                                {
                                    if (gp == null) continue;
                                    object gdn = AccessTools.Field(gp.GetType(), "defName") == null ? null
                                        : AccessTools.Field(gp.GetType(), "defName").GetValue(gp);
                                    if (gdn is string && (string)gdn == defName + GraySuffix) { grayPt = gp; break; }
                                }
                                // t10-P10：想要灰件却没有灰件时回退彩色（宁可颜色不对，也不能整块消失），
                                // 并留一条一次性日志，复测时能直接判定走了哪条回退。
                                if (grayPt == null)
                                {
                                    // t47-F1：每帧每部位路径，debug 关闭时不拼串
                                    if (Dolls.DebugOn)
                                        Dolls.LogDebug("above-nogray:" + raceNow + ":" + defName,
                                            "[NHT desat] fallback color (no gray part) race=" + raceNow + " part=" + defName);
                                }
                                else srcPt = grayPt;
                            }
                        }
                        catch (Exception) { }

                        FieldInfo pf = AccessTools.Field(srcPt.GetType(), "position");
                        Vector2 pos = pf != null && pf.GetValue(srcPt) is Vector2 ? (Vector2)pf.GetValue(srcPt) : Vector2.zero;
                        FieldInfo wf = AccessTools.Field(srcPt.GetType(), "width");
                        FieldInfo hf = AccessTools.Field(srcPt.GetType(), "height");
                        float w = wf == null ? 1f : Convert.ToSingle(wf.GetValue(srcPt));
                        float h = hf == null ? 1f : Convert.ToSingle(hf.GetValue(srcPt));

                        FieldInfo imf2 = AccessTools.Field(srcPt.GetType(), "imagePath");
                        string img2 = imf2 == null ? img : (imf2.GetValue(srcPt) as string);
                        if (string.IsNullOrEmpty(img2)) continue;
                        Texture2D t = ContentFinder<Texture2D>.Get(img2 + "_south", false) ?? ContentFinder<Texture2D>.Get(img2, false);
                        if (t == null) continue;
                        // t63：仍要进入重画的部位（自身层级低于发层）必须按「当前生效的颜色变体」画，
                        // 否则异种形态下会画出「基础外形 + 基础配色」的重影（变体只改运行时字段，def 仍是基础值）。
                        try
                        {
                            string raceV = pawn != null && pawn.def != null ? pawn.def.defName : null;
                            string bodyV = pawn != null && pawn.story != null && pawn.story.bodyType != null ? pawn.story.bodyType.defName : "";
                            bool wantGrayHere = !ReferenceEquals(srcPt, pt);
                            string vPath = null;
                            string vDef = null;
                            ColorVariantPart vHit = null;
                            if (!string.IsNullOrEmpty(defName))
                            {
                                vHit = FindColorVariant(defName, raceV, bodyV, wantGrayHere, out vPath, out vDef);
                                if (vHit == null && wantGrayHere) vHit = FindColorVariant(defName, raceV, bodyV, false, out vPath, out vDef);
                            }
                            if (vHit != null && !string.IsNullOrEmpty(vPath))
                            {
                                Texture2D vt = ContentFinder<Texture2D>.Get(vPath + "_south", false) ?? ContentFinder<Texture2D>.Get(vPath, false);
                                if (vt != null)
                                {
                                    t = vt;
                                    if (!float.IsNaN(vHit.x)) pos.x = vHit.x;
                                    if (!float.IsNaN(vHit.y)) pos.y = vHit.y;
                                    if (!float.IsNaN(vHit.width)) w = vHit.width;
                                    if (!float.IsNaN(vHit.height)) h = vHit.height;
                                    // 与 ApplyColorVariant 的尾巴右侧镜像保持一致；只在实际套用变体时做，避免改变旧行为
                                    if (IsTailPart(defName) && HarTailRight(pawn)) { pos.x = -pos.x; w = -Math.Abs(w); }
                                    if (Dolls.DebugOn && Dolls.LogOnce("above-variant:" + defName + ":" + vDef))
                                        Dolls.LogDebug("above-variant:" + defName + ":" + vDef,
                                            "[NHT hair] redraw above uses color variant race=" + raceV + " part=" + defName + " hit=" + vDef);
                                }
                            }
                        }
                        catch (Exception) { }
                        float sw = Math.Abs(w) * t.width * k, sh = Math.Abs(h) * t.height * k;
                        Rect r = new Rect(cx0 + pos.x * k - sw / 2f, cy0 + pos.y * k - sh / 2f, sw, sh);
                        bool flipX = w < 0f, flipY = h < 0f;
                        Matrix4x4 oldM = GUI.matrix;
                        if (flipX || flipY)
                        {
                            GUIUtility.ScaleAroundPivot(new Vector2(flipX ? -1f : 1f, flipY ? -1f : 1f),
                                                        new Vector2(r.center.x, r.center.y));
                        }
                        GUI.DrawTexture(r, t, ScaleMode.StretchToFill, true);
                        GUI.matrix = oldM;
                        drawn++;
                    }
                    if (!aboveLogged && drawn > 0)
                    {
                        aboveLogged = true;
                        if (Dolls.DebugOn) Log.Message("[NHT hair] redrew " + drawn + " part(s) above hair (layer > " + hairLayer + ")");
                    }
                }
                catch (Exception e)
                {
                    if (!aboveLogged) { aboveLogged = true; Log.Warning("[NHT hair] redraw failed: " + e.Message); }
                }
            }

            // t65：置顶部位只画一次。
            // RedrawAboveHair 的用途是把「会被我们的非 HAR 头发盖住」的部位在头发之后补画一遍；
            // 但宿主在常规阶段已经把同一件画过一次，两份像素重叠 —— 对带 alpha 的件（腮/提灯）会叠出「两层」。
            // 这里把置顶部位从常规阶段摘掉（Prefix 返回 false），只保留重画那一次：
            // 头发插入逻辑（本方法同帧照常执行）、层级语义、重画时机都不变，只是不再重复上色。
            // 判定与 RedrawAboveHair 的收集条件保持一致；X 光模式不摘（那一轮重画会整体 return）。
            private static bool DeferTopPart(object[] args)
            {
                try
                {
                    if (hairFit == null) return false;
                    if (IsXray(curWidget)) return false;
                    object part = PartDefOfArgs(args);
                    if (part == null) return false;
                    string name = DefNameOf(part);
                    if (string.IsNullOrEmpty(name)) return false;
                    FieldInfo imf0 = AccessTools.Field(part.GetType(), "imagePath");
                    string img0 = imf0 == null ? null : (imf0.GetValue(part) as string);
                    if (string.IsNullOrEmpty(img0)) return false;
                    bool found = false, vanillaOnly = false;
                    if (hairFit.topParts != null)
                    {
                        for (int q = 0; q < hairFit.topParts.Count; q++)
                        {
                            TopPartRef tp = hairFit.topParts[q];
                            if (tp == null || string.IsNullOrEmpty(tp.part)) continue;
                            if (!string.Equals(tp.part, name, StringComparison.OrdinalIgnoreCase)) continue;
                            found = true; vanillaOnly = tp.vanilla; break;
                        }
                    }
                    if (!found && hairFit.aboveParts != null)
                    {
                        for (int q = 0; q < hairFit.aboveParts.Count; q++)
                        {
                            if (!string.Equals(hairFit.aboveParts[q], name, StringComparison.OrdinalIgnoreCase)) continue;
                            found = true; break;
                        }
                    }
                    if (!found) return false;
                    // 与 RedrawAboveHair 一致：联动置顶只在「非 HAR + 上色开启」时才会被重画，
                    // 其余情况重画阶段会跳过它，这里也就不能摘（否则部位直接消失）。
                    bool tintOn = CustomDollsMod.Settings != null && CustomDollsMod.Settings.tintVanillaHair;
                    bool raceHasHarHair = curPawn != null && curPawn.def != null && RaceHasHairAddon(curPawn.def);
                    if (vanillaOnly && (!tintOn || raceHasHarHair)) return false;
                    if (Dolls.DebugOn && Dolls.LogOnce("defer:" + name))
                    {
                        string rn = curPawn != null && curPawn.def != null ? curPawn.def.defName : "?";
                        Dolls.LogDebug("defer:" + name, "[NHT hair] deferred top part race=" + rn + " part=" + name);
                    }
                    return true;
                }
                catch (Exception) { return false; }
            }

            private static bool aboveLogged;

            /* A 方案：要不要跳过 NHT 自己画的白发（由彩色层代替） */
            private static bool hairSkipLogged;
            private static Rect hairLastRect;
            private static Texture2D hairLastTex;
            private static bool hairPending;
            /* t23-B：齿轮开关日志改用 Dolls.LogOnce，避免每帧刷屏（原 hairGearLogged 一次性标记已移除） */
            /* Dummy-HAR（全 Dummy addon）种族：本帧是否已经在部件栈的发层位置画过
               —— 防止 PartPrefix 与 Postfix 各画一层（重影） */
            private static bool vanillaMidDrawn;
            /* t64 诊断：某个 doll 名下的所有部位定义只列一次 —— 用来确认「同一 bodyPartId 是否有第二份 Def」。 */
            private static readonly List<string> partsDumped = new List<string>();
            private static void DumpDollParts(string race)
            {
                if (!Dolls.DebugOn || string.IsNullOrEmpty(race) || partsDumped.Contains(race)) return;
                partsDumped.Add(race);
                try
                {
                    StringBuilder sb = new StringBuilder("[NHT parts] race=" + race);
                    int n = 0;
                    foreach (DollBodyPartDef d in DefDatabase<DollBodyPartDef>.AllDefs)
                    {
                        if (d == null || d.defName == null) continue;
                        if (d.defName.IndexOf(race, StringComparison.OrdinalIgnoreCase) < 0) continue;
                        n++;
                        object id = null, vis = null;
                        try
                        {
                            FieldInfo f = typeof(DollBodyPartDef).GetField("bodyPartId", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                            if (f != null) id = f.GetValue(d);
                        }
                        catch (Exception) { }
                        try
                        {
                            FieldInfo f = typeof(DollBodyPartDef).GetField("visibleByDefault", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                            if (f != null) vis = f.GetValue(d);
                        }
                        catch (Exception) { }
                        sb.Append("\n  ").Append(d.defName).Append(" id=").Append(id).Append(" vis=").Append(vis)
                          .Append(" img=").Append(d.imagePath);
                    }
                    sb.Append("\n  total=").Append(n);
                    Log.Message(sb.ToString());
                }
                catch (Exception) { }
            }

            /* t12-A：AddonFollow 部位（光环/呆毛/尾巴）本帧是否应为灰 —— 由 SkipPart 写入，
               绘制处（ApplyHalo / TryGrayAddonFollowStatic）读取；每格都会先重置，不会串到下一个部位 */
            private static bool addonFollowWantGray;
            /* t12-A3：不走 ApplyHalo 的 AddonFollow 部位把 def.tex 临时换成灰化贴图，PartPostfix 还原 */
            private static bool addonGrayActive;
            private static object addonGrayPart;
            private static FieldInfo addonGrayField;
            private static Texture2D addonGrayOld;
            /* 诊断日志去重（DebugOn 时每个 race/原因只打一次，避免刷爆 Player.log） */
            private static readonly List<string> nullHairLogged = new List<string>();
            private static readonly List<string> hairBackLogged = new List<string>();
            private static readonly List<string> hairGateLogged = new List<string>();
            private static readonly List<string> hairRectLogged = new List<string>();
            /* 灰贴图生成失败（退回原图 ⇒ 看起来仍是白色）的 race 去重 */
            private static readonly List<string> grayFailLogged = new List<string>();
            /* DummyHarVanillaFit 的种族级缓存（hairFits 重载时清空） */
            private static Dictionary<string, bool> dummyFitCache;

            private static bool VanillaTransform(string race, out float scale, out float ox, out float oy)
            {
                scale = 1f; ox = 0f; oy = 0f;
                CustomDollsSettings st = CustomDollsMod.Settings;
                if (st == null) return false;
                int pid = curPawn != null ? curPawn.thingIDNumber : -1;
                // 和 UseFit 用同一套权限：全局开关 + 未同步时的按小人「自定义坐标」开关
                bool allowed = st.vanillaHairUseEditor;
                if (pid >= 0 && !HairTuning.SyncPawn(pid))
                    allowed = HairTuning.GetPawnFlag(st.pawnCustom, pid, allowed);
                if (!allowed) return false;
                if (pid >= 0 && !HairTuning.SyncPawn(pid) && HairTuning.TryGet("p" + pid, out scale, out ox, out oy)) return true;
                if (HairTuning.TryGet(race, out scale, out ox, out oy)) return true;
                if (hairFits == null) LoadHairFits();
                HairFitDef f;
                if (hairFits == null || !hairFits.TryGetValue(race ?? "", out f) || f == null) return false;
                scale = f.vanillaScale; ox = f.vanillaOffsetX; oy = f.vanillaOffsetY;
                return true;
            }

            private static void ApplyVanillaRect(object[] args, Pawn pawn)
            {
                if (args == null || pawn == null || pawn.def == null) return;
                // t23-C3：按画布单位绘制的种族（真 HAR + 有 FitDef 的非 HAR）不能再把同一份数值
                // 当像素二次应用到宿主 Rect 上（会与画布偏移叠加成错误位置/甩飞）。
                // 无 FitDef 的非 HAR 种族保留原来的 px 通道（R6），那是它们唯一的坐标入口。
                if (RaceHasHairAddon(pawn.def) || HasRaceFit(pawn.def.defName)) return;
                float sc, ox, oy;
                if (!VanillaTransform(pawn.def.defName, out sc, out ox, out oy)) return;
                if (Mathf.Approximately(sc, 1f) && Mathf.Approximately(ox, 0f) && Mathf.Approximately(oy, 0f)) return;
                for (int i = 0; i < args.Length; i++)
                {
                    if (!(args[i] is Rect)) continue;
                    Rect r = (Rect)args[i];
                    float cx = r.center.x, cy = r.center.y;
                    Rect nr = new Rect(cx - r.width * sc / 2f, cy - r.height * sc / 2f, r.width * sc, r.height * sc);
                    nr.x += ox;
                    nr.y += oy;
                    args[i] = nr;
                    return;
                }
            }

            private static bool SkipVanillaHairNow(Pawn pawn)
            {
                try
                {
                    if (pawn == null || pawn.story == null || pawn.story.hairDef == null) return false;
                    CustomDollsSettings st = CustomDollsMod.Settings;
                    if (st == null) return false;
                    if (hairFits == null) LoadHairFits();
                    if (hairFits == null) return false;
                    HairFitDef raceFit;
                    // t75：种族映射（RaceAliasDef）先折算，后面的判定全部按目标种族取数据
                    bool hasRaceFit = hairFits.TryGetValue(Dolls.AliasRace(pawn.def.defName ?? ""), out raceFit)
                        && raceFit != null && !string.IsNullOrEmpty(raceFit.race) && raceFit.race != "*";
                    if (RaceHasHairAddon(pawn.def)) return false;      // HAR 头发由我们自己画（Dummy 的情况已在 HairDrawPrefix 提前跳过）
                    if (!st.tintVanillaHair || !st.desatColorsOn) return false;
                    bool gTint = !HairTuning.ColorOff(pawn.def.defName);
                    bool pTint = (pawn.thingIDNumber >= 0 && !HairTuning.SyncPawn(pawn.thingIDNumber))
                        ? HairTuning.GetPawnFlag(st.pawnColor, pawn.thingIDNumber, gTint) : gTint;
                    if (!pTint) return false;
                    return hasRaceFit;
                }
                catch (Exception) { return false; }
            }

            /* 每帧是否已经把 NHT 的白发改成发色（改了就不用再叠我们的彩色层） */
            private static bool hairRecolored;
            private static bool hairColorLogged;

            private static bool HairDrawPrefix(object[] __args)
            {
                try
                {
                    Pawn pawn = null;
                    if (__args != null)
                    {
                        for (int i = 0; i < __args.Length; i++)
                        {
                            if (__args[i] is Pawn) { pawn = (Pawn)__args[i]; break; }
                        }
                    }
                    if (pawn == null) pawn = curPawn;
                    if (pawn == null) return true;

                    // HAR 但 bodyAddon 全是 Dummy：NHT 的固定 headOverlay 会忽略编辑器坐标，
                    // 直接跳过它，统一由 NHT 自己按 HairFitDef 画（见 PartPrefix / Postfix）。
                    // 注意：HairDrawPrefix 会吃掉宿主 DrawHairClipped 并把头发画在「头部位」图层里，
                    // 而 Mincho 的耳朵/其它 3~4 层部位是在头之后绘制的，会盖住头发 —— 所以这里必须跳过。
                    if (DummyHarHairWithFit(pawn) || DummyHarVanillaFit(pawn)) return false;

                    // 非 HAR + 色彩显示：不让 NHT 用平色画头发，改由我们自己用“贴图 × 发色”画（保留贴图自带的阴影/高光）
                    try
                    {
                        bool globalTint = CustomDollsMod.Settings != null && CustomDollsMod.Settings.tintVanillaHair
                            && CustomDollsMod.Settings.desatColorsOn
                            && !HairTuning.ColorOff(pawn.def.defName);
                        int tpid = pawn.thingIDNumber;
                        bool tintNow = (CustomDollsMod.Settings != null && tpid >= 0 && !HairTuning.SyncPawn(tpid))
                            ? HairTuning.GetPawnFlag(CustomDollsMod.Settings.pawnColor, tpid, globalTint)
                            : globalTint;
                        if (!RaceHasHairAddon(pawn.def))
                        {
                            UseFit(pawn.def.defName);
                        }
                        bool vanillaDraw = !RaceHasHairAddon(pawn.def)
                            && hairFit != null && !string.IsNullOrEmpty(hairFit.race) && hairFit.race != "*";
                        if (vanillaDraw)
                        {
                            // t53：关闭「非HAR发型阴影」时，关色彩下完全不插手 —— 交回 NHT 原生 DrawHairClipped，
                            // 显示原版发型（用户选择「交给原生路径」，几何/明暗都由游戏决定）。
                            if (WantGrayHair(pawn) && CustomDollsMod.Settings != null
                                && !CustomDollsMod.Settings.nonHarHairShadow)
                                return true;
                            // t23-C3：这里原本先调 ApplyVanillaRect 把宿主 Rect 按像素改一遍，再记录/重画；
                            // 画布种族现在由 ApplyVanillaRect 提前 return，同帧只剩下面 2649 那次调用（对它们也是 no-op），
                            // 删除这次重复调用，避免「同帧两次 px 变换」的历史隐患。
                            for (int ci = 0; ci < __args.Length; ci++)
                            {
                                if (__args[ci] is Rect) hairLastRect = (Rect)__args[ci];
                                else if (__args[ci] is Texture2D) hairLastTex = (Texture2D)__args[ci];
                            }
                            if (hairLastTex != null)
                            {
                                if (IsXray(curWidget)) { return false; }
                                // 就地重画：层级与 NHT 原本调用位置一致，置顶重画/联动置顶仍然在后面
                                try
                                {
                                    float kk = HairK(curRect);
                                    Rect rr0 = hairLastRect;
                                    Rect[] pend2 = new Rect[] { rr0 };
                                    float smul2;
                                    float fix2 = AutoFixShift(pawn.def.defName, hairLastTex, pend2, curRect, kk, pawn, out smul2);
                                    if (fix2 != 0f) hairLastRect.y += fix2;
                                    if (smul2 != 1f && smul2 > 0f)
                                    {
                                        Rect rr = hairLastRect;
                                        float ccx = rr.center.x, ccy = rr.center.y;
                                        rr.width *= smul2; rr.height *= smul2;
                                        rr.x = ccx - rr.width / 2f; rr.y = ccy - rr.height / 2f;
                                        hairLastRect = rr;
                                    }
                                }
                                catch (Exception) { }
                                Color oldC = GUI.color;
                                GUI.color = tintNow ? pawn.story.HairColor : Color.white;
                                Texture2D ptex = WantGrayHair(pawn) ? GrayOrFlat(hairLastTex) : hairLastTex;
                                GUI.DrawTexture(hairLastRect, ptex, ScaleMode.StretchToFill, true);
                                GUI.color = oldC;
                                drawnThisFrame = true;
                                hairPending = true;
                                return false;
                            }
                        }
                    }
                    catch (Exception) { }

                    ApplyVanillaRect(__args, pawn);

                    // 变换与色彩开关无关：关色彩时也要能调整原版白发
                    if (!SkipVanillaHairNow(pawn)) return true;

                    // NHT 的 DrawHairClipped(..., Color color)：优先直接把颜色改成发色（形状/裁切完全交给 NHT）
                    if (__args != null)
                    {
                        for (int i = 0; i < __args.Length; i++)
                        {
                            if (!(__args[i] is Color)) continue;
                            Color old = (Color)__args[i];
                            Color hc = pawn.story.HairColor;
                            __args[i] = new Color(old.r * hc.r, old.g * hc.g, old.b * hc.b, old.a * hc.a);
                            hairRecolored = true;
                            if (!hairColorLogged)
                            {
                                hairColorLogged = true;
                                if (Dolls.DebugOn) Log.Message("[NHT hair] recolor white hair race=" + pawn.def.defName
                                    + " old=" + old.r.ToString("F2") + "," + old.g.ToString("F2") + "," + old.b.ToString("F2")
                                    + " new=" + pawn.story.HairColor.r.ToString("F2") + "," + pawn.story.HairColor.g.ToString("F2") + "," + pawn.story.HairColor.b.ToString("F2"));
                            }
                            return true;
                        }
                    }

                    // 没有颜色参数 → 跳过 NHT 的白发，由我们的彩色层代替
                    
                    if (!hairSkipLogged)
                    {
                        hairSkipLogged = true;
                        if (Dolls.DebugOn) Log.Message("[NHT hair] skip vanilla white hair race=" + pawn.def.defName);
                    }
                    return false;
                }
                catch (Exception) { return true; }
            }

            /* 右下角齿轮：打开实时调整窗口 */
            private static void DrawHairGear(Pawn pawn, Rect dollRect)
            {
                if (pawn == null || pawn.def == null || FitW(dollRect) < 60f || FitH(dollRect) < 60f)
                {
                    // t69：齿轮消失排查（每种原因只打一次）
                    if (Dolls.DebugOn && Dolls.LogOnce("gear:skip-fit:" + (pawn == null || pawn.def == null ? "null" : pawn.def.defName)))
                        Log.Message("[NHT gear] skip fit race=" + (pawn == null || pawn.def == null ? "null" : pawn.def.defName) + " fitW=" + FitW(dollRect).ToString("F1") + " fitH=" + FitH(dollRect).ToString("F1") + " rect=" + dollRect);
                    return;
                }
                if (Dolls.DebugOn && Dolls.LogOnce("gear:enter:" + pawn.def.defName))
                    Log.Message("[NHT gear] enter race=" + pawn.def.defName + " harness=" + IsHarHairRace(pawn.def));
                if (IsXray(curWidget))
                {
                    if (Dolls.DebugOn && Dolls.LogOnce("gear:skip-xray:" + pawn.def.defName))
                        Log.Message("[NHT gear] skip xray race=" + pawn.def.defName);
                    return;
                }
                try
                {
                    // t10-P8：Dummy-HAR 与真 HAR 同口径（滑块单位/量程/默认值都按 HAR 画布）
                    bool har = IsHarHairRace(pawn.def);
                    if (!har)
                    {
                        if (hairFits == null) LoadHairFits();
                        HairFitDef f0;
                        if (hairFits == null || !hairFits.TryGetValue(Dolls.AliasRace(pawn.def.defName ?? ""), out f0) || f0 == null)
                        {
                            if (Dolls.DebugOn && Dolls.LogOnce("gear:skip-nofit:" + pawn.def.defName))
                                Log.Message("[NHT gear] skip no hairFit race=" + pawn.def.defName);
                            return;
                        }
                        if (pawn.story == null || pawn.story.hairDef == null)
                        {
                            if (Dolls.DebugOn && Dolls.LogOnce("gear:skip-nohair:" + pawn.def.defName))
                                Log.Message("[NHT gear] skip no hairDef race=" + pawn.def.defName);
                            return;
                        }
                    }
                    float gsz = 20f;
                    float innerH = dollRect.height / 0.9f;
                    float bandH = innerH * 0.1f;
                    float bandY = dollRect.yMax;
                    // t87：镜像宿主自己的手/脚按钮行 —— 齿轮到右边距 == 图标行到左边距，纵向与图标行居中
                    float gy = bandY + 10f;   // t98：栏底 +10
                    float gx = dollRect.xMax - 6f - gsz;
                    Rect hostHands = new Rect(0f, 0f, 0f, 0f);
                    Rect hostFeet = new Rect(0f, 0f, 0f, 0f);
                    try
                    {
                        if (curWidget != null)
                        {
                            Rect band = new Rect(dollRect.x, bandY, dollRect.width, bandH);
                            object ctxObj = null;
                            FieldInfo fiCtx = curWidget.GetType().GetField("ctx",
                                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                            if (fiCtx != null) ctxObj = fiCtx.GetValue(curWidget);
                            object handD = null, feetD = null;
                            if (ctxObj != null)
                            {
                                FieldInfo fh = ctxObj.GetType().GetField("HandDoll",
                                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                                FieldInfo ff = ctxObj.GetType().GetField("FeetDoll",
                                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                                if (fh != null) handD = fh.GetValue(ctxObj);
                                if (ff != null) feetD = ff.GetValue(ctxObj);
                            }
                            MethodInfo mBR = curWidget.GetType().GetMethod("GetButtonRects",
                                BindingFlags.Static | BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                            if (mBR != null)
                            {
                                object[] aBR = new object[] { band, handD, feetD, null, null };
                                mBR.Invoke(mBR.IsStatic ? null : curWidget, aBR);
                                hostHands = (Rect)aBR[3];
                                hostFeet = (Rect)aBR[4];
                                // t89：按用户要求 —— 齿轮不再镜像，保持原位置，仅整体下移 5px（宿主矩形仅记日志）
                            }
                        }
                    }
                    catch (Exception) { }
                    Rect btn = new Rect(gx, gy, gsz, gsz);
                    // t88：记录镜像前的齿轮位置，作为小窗口的锚点
                    Rect legacyBtn = new Rect(dollRect.xMax - 6f - gsz, dollRect.yMax + 4f, gsz, gsz);
                    Bootstrap.HairGearLegacyLocal = legacyBtn;
                    try
                    {
                        Vector2 lsp = UI.GUIToScreenPoint(new Vector2(legacyBtn.x, legacyBtn.y));
                        Bootstrap.HairGearLegacyScreen = new Rect(lsp.x, lsp.y, legacyBtn.width, legacyBtn.height);
                    }
                    catch (Exception) { }
                    if (Dolls.DebugOn && Dolls.LogOnce("gear:rects:" + pawn.def.defName))
                        Log.Message("[NHT gear] host buttons hands=" + hostHands + " feet=" + hostFeet + " gear=" + btn + " dollRect=" + dollRect);
                    Bootstrap.HairGearRect = btn;
                    // t82：动态换算到屏幕 UI 坐标（不依赖任何面板 windowRect）
                    try
                    {
                        Vector2 gsp = UI.GUIToScreenPoint(new Vector2(btn.x, btn.y));
                        Vector2 off = Event.current.mousePosition - new Vector2(btn.x, btn.y);
                        Vector2 mpUI = UI.MousePositionOnUI;
                        Vector2 alt = new Vector2(mpUI.x - off.x, mpUI.y - off.y);
                        Bootstrap.HairGearScreenUI = new Rect(gsp.x, gsp.y, btn.width, btn.height);
                        if (Dolls.DebugOn && Dolls.LogOnce("gear:anchor:" + pawn.def.defName))
                            Log.Message("[NHT gear] anchor guiPoint=" + gsp + " mouseUI=" + mpUI + " altFromMouse=" + alt
                                + " local=" + btn + " uiScale=" + (UI.screenWidth > 0 ? (float)Screen.width / (float)UI.screenWidth : 0f));
                    }
                    catch (Exception) { }
                    if (Dolls.DebugOn && Dolls.LogOnce("gear:draw:" + pawn.def.defName))
                        Log.Message("[NHT gear] draw race=" + pawn.def.defName + " rect=" + btn + " dollRect=" + dollRect);
                    if (Event.current == null) return;
                    Texture2D icon = ContentFinder<Texture2D>.Get("HediffTab/Common/Settings", false)
                        ?? ContentFinder<Texture2D>.Get("Custom/Icons/Settings", false)
                        ?? ContentFinder<Texture2D>.Get("UI/Buttons/Options", false)
                        ?? TexButton.Info;
                    if (icon == null)
                    {
                        if (Dolls.DebugOn && Dolls.LogOnce("gear:skip-noicon:" + pawn.def.defName))
                            Log.Message("[NHT gear] skip no icon race=" + pawn.def.defName);
                        return;
                    }
                    bool hover = btn.Contains(Event.current.mousePosition);
                    // t84：打开态用强调橙（悬停更亮），常态淡白，尺寸/热区不变
                    bool gearOpen = false;
                    try
                    {
                        foreach (Window w0 in Find.WindowStack.Windows)
                        {
                            HairAdjustWindow hw0 = w0 as HairAdjustWindow;
                            if (hw0 != null && hw0.Race == pawn.def.defName) { gearOpen = true; break; }
                        }
                    }
                    catch (Exception) { }
                    Color oldC = GUI.color;
                    GUI.color = gearOpen
                        ? (hover ? new Color(1f, 0.74f, 0.30f, 1f) : new Color(1f, 0.62f, 0.14f, 0.95f))
                        : new Color(1f, 1f, 1f, hover ? 0.38f : 0.22f);
                    GUI.DrawTexture(btn, icon, ScaleMode.ScaleToFit, true);
                    GUI.color = oldC;
                    bool clicked = Event.current.type == EventType.MouseDown && Event.current.button == 0 && hover;
                    if (clicked && Bootstrap.gearCloseInGear && Bootstrap.gearCloseFrame == Time.frameCount)
                    {
                        // 这一下刚刚把窗口关掉（见 HairAdjustWindow.PostClose），本帧不能再开回来
                        Bootstrap.gearCloseInGear = false;
                        try { Event.current.Use(); } catch (Exception) { }
                        return;
                    }
                    if (clicked)
                    {
                        try { Event.current.Use(); } catch (Exception) { }
                        HairAdjustWindow open = null;
                        foreach (Window w in Find.WindowStack.Windows)
                        {
                            HairAdjustWindow hw = w as HairAdjustWindow;
                            if (hw != null && hw.Race == pawn.def.defName) { open = hw; break; }
                        }
                        if (open != null)
                        {
                            Bootstrap.gearCloseFrame = Time.frameCount;   // 主动关闭也标记本帧，避免同帧二次触发
                            Bootstrap.gearCloseInGear = false;
                            open.Close();
                            if (Dolls.LogOnce("gear:toggle:" + pawn.def.defName)) Log.Message("[NHT hair] gear toggle close race=" + pawn.def.defName);
                        }
                        else
                        {
                            // t86：同一帧里若刚从齿轮关掉窗口，本次绘制不得再开（面板可能被画两次）
                            if (Bootstrap.gearCloseFrame == Time.frameCount) { return; }
                            foreach (Window w in Find.WindowStack.Windows)
                            {
                                if (w is HairAdjustWindow) { w.Close(); break; }
                            }
                            Bootstrap.gearCloseFrame = Time.frameCount;
                            Bootstrap.gearCloseInGear = false;
                            Find.WindowStack.Add(new HairAdjustWindow(pawn.def.defName, har, pawn.thingIDNumber));
                            if (Dolls.LogOnce("gear:toggle:" + pawn.def.defName)) Log.Message("[NHT hair] gear toggle open race=" + pawn.def.defName + " har=" + har);
                        }
                    }
                }
                catch (Exception) { }
            }

            /* t75：把设置小窗口摆到齿轮右侧，窗口左下角与齿轮底边对齐，且不遮挡齿轮 */
            /* HAR 的 bodyAddon 全是 Dummy / 空图：没有真正的主发层可画 */
            private static bool DummyHarHair()
            {
                return cur != null && cur.main < 0 && cur.bg < 0;
            }

            private static bool DummyHarHairWithFit(Pawn pawn)
            {
                if (pawn == null || pawn.def == null || !DummyHarHair()) return false;
                if (!RaceHasHairAddon(pawn.def)) return false;
                if (hairFits == null) LoadHairFits();
                HairFitDef f;
                return hairFits != null && hairFits.TryGetValue(pawn.def.defName ?? "", out f)
                    && f != null && !string.IsNullOrEmpty(f.race) && f.race != "*";
            }

            /* HAR 种族但 bodyAddon 里没有真正的头发（全是 Dummy，cur.main=-1）+ 配了种族级 HairFit：
               这类种族既不该交给 NHT 的固定 headOverlay（坐标不跟编辑器），也不能让「色彩显示」之类的
               开关决定头发存不存在。头发由 NHT 自己按 HairFitDef.layer 画进部件栈（见 PartPrefix）。 */
            /* t10-P8：def 级判定（不依赖 cur 的 addon 状态，UseFit / 齿轮窗可以直接用）。
               条件 = 是 HAR 种族（有 AlienSettings）+ 没有真发 addon（全 Dummy）+ 配了种族级 HairFit。
               非 HAR 的原版发型种族 AlienSettings==null，仍然走原来的原版路径。 */
            private static bool DummyHarVanillaFit(ThingDef def)
            {
                if (def == null || string.IsNullOrEmpty(def.defName)) return false;
                // t76：映射过来的种族按目标种族判定（否则会掉回非 HAR 的原版路径）
                string alias = Dolls.AliasRace(def.defName);
                if (!string.IsNullOrEmpty(alias) && alias != def.defName)
                {
                    ThingDef at = DefDatabase<ThingDef>.GetNamedSilentFail(alias);
                    if (at != null && at != def) return DummyHarVanillaFit(at);
                }
                string race = def.defName;
                // 这个判定会被 UseFit/齿轮窗/PartPrefix 反复调用，种族级结果必须缓存
                // （AlienSettings 要反射 ThingDef.comps）。LoadHairFits() 里会清空缓存。
                if (dummyFitCache == null) dummyFitCache = new Dictionary<string, bool>();
                bool ok;
                if (dummyFitCache.TryGetValue(race, out ok)) return ok;

                ok = false;
                HairFitDef f = null;
                // 真 HAR（有非 Dummy 发 addon）不能走这条分支，否则会把现有发层画成两层
                if (!RaceHasHairAddon(def) && AlienSettings(def) != null)
                {
                    if (hairFits == null) LoadHairFits();
                    if (hairFits != null) hairFits.TryGetValue(race, out f);
                    ok = f != null && !string.IsNullOrEmpty(f.race) && f.race != "*";
                }
                dummyFitCache[race] = ok;
                if (ok && Dolls.LogOnce("dummyfit:" + race))
                {
                    Log.Message("[NHT hair] dummy-har fit race=" + race
                        + " layer=" + HairLayerNowFor(f) + " -> draw in part stack");
                }
                return ok;
            }

            /* 只有「当前小人正好是 Dummy 发 addon 状态」时才认，保证绘制路径与修复前一致 */
            private static bool DummyHarVanillaFit(Pawn pawn)
            {
                return pawn != null && pawn.def != null && DummyHarHair() && DummyHarVanillaFit(pawn.def);
            }

            /* t10-P8：凡是按 HAR 画布语义绘制的种族都算（真 HAR + Dummy-HAR），
               用于 UseFit 权限、ValidHarValues 校验、齿轮窗口单位这三处保持同口径。 */
            private static bool IsHarHairRace(ThingDef def)
            {
                if (def == null) return false;
                return RaceHasHairAddon(def) || DummyHarVanillaFit(def);
            }

            /* t23-C1：该种族是否有精确键的种族级 HairFitDef（排除 "*" 兜底）。
               有 FitDef 就说明头发由本模组按画布单位绘制，坐标参数只能是画布语义。 */
            internal static bool HasRaceFit(string race)
            {
                // t76：种族映射后按目标种族取 FitDef（否则 Destrier 永远被判成「没有种族级发型数据」）
                race = Dolls.AliasRace(race);
                if (string.IsNullOrEmpty(race)) return false;
                if (hairFits == null) LoadHairFits();
                HairFitDef f;
                return hairFits != null && hairFits.TryGetValue(race, out f)
                    && f != null && !string.IsNullOrEmpty(f.race) && f.race != "*";
            }

            /* t23-C1：所有「按画布单位绘制」的种族（真 HAR + Dummy-HAR + 有 FitDef 的非 HAR）。
               与 IsHarHairRace 的差别只有最后这一类；IsHarHairRace 仍用于颜色口径（harHairTint vs tintVanillaHair），
               CanvasRace 专管坐标单位（UseFit 权限、ValidHarValues 校验、齿轮窗口滑块/默认值/文案）。 */
            internal static bool CanvasRace(ThingDef def)
            {
                if (def == null) return false;
                // t76：映射过来的种族，坐标单位与权限按目标种族算
                string ar = Dolls.AliasRace(def.defName ?? "");
                if (!string.IsNullOrEmpty(ar) && ar != def.defName)
                {
                    ThingDef at = DefDatabase<ThingDef>.GetNamedSilentFail(ar);
                    if (at != null && at != def) return CanvasRace(at);
                }
                return RaceHasHairAddon(def) || HasRaceFit(def.defName);
            }

            /* 只用于上面的日志：不依赖全局 hairFit 缓存 */
            private static int HairLayerNowFor(HairFitDef f)
            {
                return f == null ? 15 : Mathf.RoundToInt(f.layer);
            }

            /* NHT 自己画的原版发型不带发色（整头白发），这里按发色补画一遍盖上去 */
            private static void DrawVanillaHairColored(Pawn pawn, Rect dollRect)
            {
                bool dummyHar = RaceHasHairAddon(pawn.def) && DummyHarHair();
                // Dummy-HAR 种族（如 Mincho）的头发只有这一条绘制入口，不能受「原版发型补画层」开关影响，
                // 否则关掉开关（或「色彩显示」把它写坏）就会整层消失。
                bool dummyHarFit = DummyHarVanillaFit(pawn);
                if (CustomDollsMod.Settings != null && !CustomDollsMod.Settings.enableHairTintOverlay
                    && !dummyHar && !dummyHarFit) return;
                try
                {
                    HairDef hd = pawn.story == null ? null : pawn.story.hairDef;
                    if (hd == null || string.IsNullOrEmpty(hd.texPath)) { LogNullHair(pawn, "no-hairDef-or-texPath"); return; }
                    if (hd.defName != null && hd.defName.IndexOf("Null", StringComparison.OrdinalIgnoreCase) >= 0) { LogNullHair(pawn, "defName~Null:" + hd.defName); return; }
                    Texture2D tex = ContentFinder<Texture2D>.Get(hd.texPath + "_south", false);
                    if (tex == null) tex = ContentFinder<Texture2D>.Get(hd.texPath, false);
                    if (tex == null) { LogNullHair(pawn, "texture-missing:" + hd.texPath); return; }

                    float k = HairK(dollRect);


                    // 用编辑器「HAR 头发」里导出的参数：缩放 = 头宽的倍数（1.0 = 和头一样宽），
                    // 偏移 = 以娃娃高度为单位（负数向上）；位置以头部部位为中心
                    UseFit(pawn.def.defName);
                    float sc = HairScale(1.15f);
                    float ox = HairOffX(0f);
                    float oy = HairOffY(0f);
                    // 用户校准：Nivarian 的 LongStraightA 画布重心偏上，固定使用 -0.23 的纵向偏移（不再自动锚定）
                    if (hd.defName == "NivarianHair_LongStraightA" && !hairOverrideValid) oy = -0.23f;

                    // 和 HAR 发型一样的公式：大小 = 1024 × 缩放，中心 = 娃娃中心 + 偏移
                    float cx = dollRect.x + dollRect.width / 2f + ox * 1024f * k;
                    float cy = dollRect.y + dollRect.height / 2f + oy * 1024f * k;
                    float size = 1024f * sc * k;
                    Rect r = new Rect(cx - size / 2f, cy - size / 2f, size, size);
                    if (Dolls.DebugOn)
                        Dolls.LogDebug("hairgeom:" + pawn.def.defName + ":dummy:" + Math.Round(dollRect.width).ToString(),
                            "[NHT hair geom] race=" + pawn.def.defName + " src=dummy k=" + k.ToString("F4")
                            + " c=" + cx.ToString("F1") + "," + cy.ToString("F1")
                            + " size=" + size.ToString("F1")
                            + " outer=" + dollRect.width.ToString("F1") + "x" + dollRect.height.ToString("F1")
                            + " fit=" + curFitK.ToString("F4"));
                    CustomDollsSettings stv = CustomDollsMod.Settings;
                    bool gv = stv != null && stv.tintVanillaHair && stv.desatColorsOn && !HairTuning.ColorOff(pawn.def.defName);
                    bool tv = (stv != null && pawn.thingIDNumber >= 0 && !HairTuning.SyncPawn(pawn.thingIDNumber))
                        ? HairTuning.GetPawnFlag(stv.pawnColor, pawn.thingIDNumber, gv) : gv;
                    if (tv && HairTintOffRace(pawn.def.defName)) tv = false;
                    // 灰度判定：WantGrayHair 在「全局色彩打开」时会一律返回 false（它只在全局关色彩时
                    // 才去看种族/本人旗标）。而「色彩显示」现在只写 per-race / per-pawn 状态，
                    // 所以对 Dummy-HAR 种族要额外并入这条判定，否则关色时头发会被画成纯白。
                    bool gray = WantGrayHair(pawn);
                    if (!gray && dummyHarFit)
                    {
                        bool raceOff = HairTuning.ColorOff(pawn.def.defName);
                        int gpid = pawn.thingIDNumber;
                        if (gpid >= 0 && !HairTuning.SyncPawn(gpid))
                            gray = !HairTuning.GetPawnFlag(stv == null ? null : stv.pawnColor, gpid, !raceOff);
                        else
                            gray = raceOff;
                    }
                    Color old = GUI.color;
                    // 灰度分支用灰贴图（自带去色），保持白色；否则沿用原来的「是否乘发色」逻辑。
                    GUI.color = gray ? Color.white : (tv ? pawn.story.HairColor : Color.white);
                    Texture2D ctex = gray ? GrayOrFlat(tex) : tex;
                    if (gray && ReferenceEquals(ctex, tex) && Dolls.DebugOn)
                    {
                        // 灰贴图生成失败（读像素异常）时会退回原图，看起来仍是白色：每个 race 记一次。
                        string gk = pawn.def.defName ?? "?";
                        if (!grayFailLogged.Contains(gk))
                        {
                            grayFailLogged.Add(gk);
                            Log.Warning("[NHT hair] gray texture failed race=" + gk + " tex=" + hd.texPath);
                        }
                    }
                    GUI.DrawTexture(r, ctex, ScaleMode.StretchToFill, true);
                    GUI.color = old;
                }
                catch (Exception) { }
            }

            /* t141：原版 HairDef 的后脑层。部分模组（Nivarian 等）给发型额外画了 *_back_south
               （与 *_south 同画布的后发层），RimWorld 和 NHT 都只读 _south，所以后发一直缺失。
               位置/缩放与正面发完全相同；这里在 HairFix.Prefix 里画（部件栈之前），让后发压在所有部位后面。 */
            private static void DrawVanillaHairBack(Pawn pawn, Rect dollRect)
            {
                try
                {
                    if (pawn == null || pawn.story == null) return;
                    HairDef hd = pawn.story.hairDef;
                    if (hd == null || string.IsNullOrEmpty(hd.texPath)) return;
                    if (hd.defName != null && hd.defName.IndexOf("Null", StringComparison.OrdinalIgnoreCase) >= 0) return;
                    // 与正面发同一个开关语义：原版发型补画没开时整层都不画
                    bool dummyHar = RaceHasHairAddon(pawn.def) && DummyHarHair();
                    bool dummyHarFit = DummyHarVanillaFit(pawn);
                    if (CustomDollsMod.Settings != null && !CustomDollsMod.Settings.enableHairTintOverlay
                        && !dummyHar && !dummyHarFit) return;
                    Texture2D tex = ContentFinder<Texture2D>.Get(hd.texPath + "_back_south", false);
                    if (tex == null) tex = ContentFinder<Texture2D>.Get(hd.texPath + "_back", false);
                    if (tex == null) return;

                    float k = HairK(dollRect);
                    UseFit(pawn.def.defName);
                    float sc = HairScale(1.15f);
                    float ox = HairOffX(0f);
                    float oy = HairOffY(0f);
                    // 用户校准：Nivarian 的 LongStraightA 画布重心偏上，固定使用 -0.23 的纵向偏移（不再自动锚定）
                    if (hd.defName == "NivarianHair_LongStraightA" && !hairOverrideValid) oy = -0.23f;
                    float cx = dollRect.x + dollRect.width / 2f + ox * 1024f * k;
                    float cy = dollRect.y + dollRect.height / 2f + oy * 1024f * k;
                    float size = 1024f * sc * k;
                    Rect r = new Rect(cx - size / 2f, cy - size / 2f, size, size);

                    CustomDollsSettings stv = CustomDollsMod.Settings;
                    bool gv = stv != null && stv.tintVanillaHair && stv.desatColorsOn && !HairTuning.ColorOff(pawn.def.defName);
                    bool tv = (stv != null && pawn.thingIDNumber >= 0 && !HairTuning.SyncPawn(pawn.thingIDNumber))
                        ? HairTuning.GetPawnFlag(stv.pawnColor, pawn.thingIDNumber, gv) : gv;
                    if (tv && HairTintOffRace(pawn.def.defName)) tv = false;
                    bool gray = WantGrayHair(pawn);
                    Color old = GUI.color;
                    GUI.color = gray ? Color.white : (tv ? pawn.story.HairColor : Color.white);
                    Texture2D ctex = gray ? GrayOrFlat(tex) : tex;
                    GUI.DrawTexture(r, ctex, ScaleMode.StretchToFill, true);
                    GUI.color = old;
                    if (Dolls.DebugOn)
                    {
                        string bk = "back:" + (pawn.def.defName ?? "?");
                        if (!hairBackLogged.Contains(bk))
                        {
                            hairBackLogged.Add(bk);
                            Dolls.LogDebug(bk, "[NHT hair back] race=" + pawn.def.defName + " tex=" + hd.texPath);
                        }
                    }
                }
                catch (Exception) { }
            }

            /* 静默不画路径的日志：DebugOn 时每个 race+原因只记一次（上次日志已触发消息上限） */
            private static void LogNullHair(Pawn pawn, string reason)
            {
                try
                {
                    if (!Dolls.DebugOn) return;
                    string race = pawn == null || pawn.def == null ? "?" : pawn.def.defName;
                    string key = race + "|" + reason;
                    if (nullHairLogged.Contains(key)) return;
                    nullHairLogged.Add(key);
                    Log.Warning("[NHT hair] skip draw race=" + race + " reason=" + reason);
                }
                catch (Exception) { }
            }

            /* NHT 的器官/骨骼视图：FilterMode != None 时不该画头发 */
            private static bool xrayLogged;

            private static object ReadEnumLike(object host, string nm)
            {
                if (host == null) return null;
                Type t = host.GetType();
                PropertyInfo pi = t.GetProperty(nm, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (pi != null) { try { return pi.GetValue(host); } catch (Exception) { } }
                FieldInfo fi = t.GetField(nm, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (fi != null) { try { return fi.GetValue(host); } catch (Exception) { } }
                return null;
            }

            /* t36：头发在器官/骨骼视图（Xray）下是否可见 = 全局设置 || 种族 FitDef 的 showInXray。
               Prefix（最上层补画）与 PartPrefix（层内插入）必须用同一个判定，
               否则会出现「一条链隐藏、另一条链照画」的不一致。 */
            private static bool HairVisibleInXray()
            {
                if (CustomDollsMod.Settings != null && CustomDollsMod.Settings.showHairInXray) return true;
                if (hairFits == null) LoadHairFits();
                // t50：按当前小人重新查表。原来只在 hairFit==null 时才 UseFit，
                // 换种族后的首帧会读到上一个种族的 showInXray（偶发仍显示/偶发误隐藏）。
                if (curPawn != null && curPawn.def != null) UseFit(curPawn.def.defName);
                return hairFit != null && hairFit.showInXray;
            }

            private static bool IsXray(object widget)
            {
                try
                {
                    if (widget == null) return false;
                    object mode = ReadEnumLike(widget, "CurrentFilterMode");
                    object ctx = ReadEnumLike(widget, "Ctx");
                    if (mode == null && ctx == null)
                    {
                        PropertyInfo cp = widget.GetType().GetProperty("Ctx", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                        if (cp != null) ctx = cp.GetValue(widget);
                    }
                    else if (ctx == null)
                    {
                        PropertyInfo cp = widget.GetType().GetProperty("Ctx", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                        if (cp != null) ctx = cp.GetValue(widget);
                    }
                    if (mode == null && ctx != null) mode = ReadEnumLike(ctx, "FilterMode");
                    if (mode == null) return false;
                    string name = mode.ToString();
                    bool on = !string.Equals(name, "None", StringComparison.OrdinalIgnoreCase);
                    if (on && !xrayLogged)
                    {
                        xrayLogged = true;
                        if (Dolls.DebugOn) Log.Message("[NHT hair] filter mode = " + name + " -> hair hidden");
                    }
                    return on;
                }
                catch (Exception) { }
                return false;
            }



            /* 取参数里的 layer（int 字段/属性） */
            private static int LayerOfArg(object a)
            {
                if (a == null) return -1;
                Type t = a.GetType();
                FieldInfo f = t.GetField("layer", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (f != null && f.FieldType == typeof(int)) { try { return (int)f.GetValue(a); } catch (Exception) { } }
                PropertyInfo p2 = t.GetProperty("layer", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (p2 != null && p2.PropertyType == typeof(int)) { try { return (int)p2.GetValue(a, null); } catch (Exception) { } }
                return -1;
            }

            /* 当前种族头发层级：来自补丁里导出的 HairFitDef.layer（不是写死的） */
            private static int HairLayerNow()
            {
                return hairFit == null ? 15 : Mathf.RoundToInt(hairFit.layer);
            }

            /* ---------------- 部位颜色（灰度图） ---------------- */

            private const string GraySuffix = "_NHTCD_Gray";
            private static readonly List<string> skipLogged = new List<string>();
            private static readonly Dictionary<string, bool> grayTwinCache = new Dictionary<string, bool>();
            private static readonly List<string> hairMapWritten = new List<string>();
            private static string hairMapDir;

            private static int PartIdOfArgs(object[] args)
            {
                if (args == null) return -1;
                for (int i = 0; i < args.Length; i++)
                {
                    object a = args[i];
                    if (a == null || a is string) continue;
                    Type t = a.GetType();
                    if (t.IsPrimitive) continue;
                    FieldInfo f = t.GetField("bodyPartId", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (f == null || f.FieldType != typeof(int)) continue;
                    try { return (int)f.GetValue(a); } catch (Exception) { }
                }
                return -1;
            }

            private static string DefNameOf(object o)
            {
                if (o == null) return null;
                Type t = o.GetType();
                FieldInfo f = t.GetField("defName", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (f != null && f.FieldType == typeof(string))
                {
                    try { return (string)f.GetValue(o); } catch (Exception) { }
                }
                PropertyInfo p = t.GetProperty("defName", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (p != null && p.PropertyType == typeof(string))
                {
                    try { return (string)p.GetValue(o, null); } catch (Exception) { }
                }
                return null;
            }

            private static object PartDefOfArgs(object[] args)
            {
                if (args == null) return null;
                for (int i = 0; i < args.Length; i++)
                {
                    object a = args[i];
                    if (a == null || a is string) continue;
                    Type t = a.GetType();
                    FieldInfo f = t.GetField("tex", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (f != null && f.FieldType == typeof(Texture2D)) return a;
                }
                return null;
            }

            /* 主娃娃实例（curWidget 上的 HumanlikeDoll 字段）；手/脚等附属娃娃是另一个实例 */
            private static HumanlikeDoll MainDollOf(object widget)
            {
                if (widget == null) return null;
                try
                {
                    if (!dollFieldLooked)
                    {
                        dollFieldLooked = true;
                        Type wt = widget.GetType();
                        while (wt != null && dollNameField == null)
                        {
                            foreach (FieldInfo f in wt.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly))
                            {
                                if (typeof(HumanlikeDoll).IsAssignableFrom(f.FieldType)) { dollNameField = f; break; }
                            }
                            wt = wt.BaseType;
                        }
                    }
                    if (dollNameField == null) return null;
                    return dollNameField.GetValue(widget) as HumanlikeDoll;
                }
                catch (Exception) { return null; }
            }

            /* 手/脚等附属娃娃也会走 DrawPart：它们的 rect 与主娃娃不同，
               不能在它们的部件栈里画主娃娃的头发（会错位/重影），只交给主娃娃那次。 */
            /* t62：宿主 DollRenderer.DrawDoll 会先 Doll.Fit(outer) 把娃娃按 min(宽比,高比)
               缩放并居中。改版 UI（如 [LFS] UI Rethemed）给出的矩形宽高比与 BoundingBox
               不同时，娃娃实际只占矩形的一部分，而头发仍按矩形宽度换算（k = width/512）
               就会偏大、偏移也偏大。这里复刻 Fit 的缩放比，供头发换算使用。 */
            private static FieldInfo fitBbField, fitScaleField;
            internal static float curFitK = -1f;
            internal static float curFitBbW = 0f, curFitBbH = 0f;
            private static readonly List<string> uiMismatchLogged = new List<string>();

            private static void ComputeFit(object widget, Rect outer)
            {
                try
                {
                    if (widget == null || outer.width <= 0f || outer.height <= 0f) return;
                    object ctx = null;
                    PropertyInfo ctxP = widget.GetType().GetProperty("Ctx", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (ctxP != null) ctx = ctxP.GetValue(widget);
                    if (ctx == null)
                    {
                        FieldInfo cf = AccessTools.Field(widget.GetType(), "ctx");
                        if (cf != null) ctx = cf.GetValue(widget);
                    }
                    if (ctx == null) return;
                    FieldInfo mainF = AccessTools.Field(ctx.GetType(), "MainDoll");
                    object doll = mainF == null ? null : mainF.GetValue(ctx);
                    if (doll == null) return;
                    if (fitBbField == null) fitBbField = AccessTools.Field(doll.GetType(), "BoundingBox");
                    if (fitScaleField == null) fitScaleField = AccessTools.Field(doll.GetType(), "scale");
                    if (fitBbField == null) return;
                    Rect bb = (Rect)fitBbField.GetValue(doll);
                    float ds = fitScaleField == null ? 1f : Convert.ToSingle(fitScaleField.GetValue(doll));
                    if (bb.width <= 0.01f || bb.height <= 0.01f || ds <= 0f) return;
                    float fit = Math.Min(outer.width / bb.width, outer.height / bb.height) * ds;
                    if (float.IsNaN(fit) || float.IsInfinity(fit) || fit <= 0f) return;
                    curFitK = fit;
                    curFitBbW = bb.width; curFitBbH = bb.height;
                    float fw = fit * bb.width;
                    /* t63：矩形宽高比与 BoundingBox 明显不符（>5%）⇒ 有 UI 模组改了布局。
                       打一行诊断，方便以后遇到别的 UI mod 时直接定位。 */
                    float arRect = outer.height > 0.01f ? outer.width / outer.height : 0f;
                    float arBb = bb.height > 0.01f ? bb.width / bb.height : 0f;
                    if (Dolls.DebugOn && curPawn != null && arBb > 0.01f
                        && Math.Abs(arRect / arBb - 1f) > 0.05f && !uiMismatchLogged.Contains(curPawn.def.defName))
                    {
                        uiMismatchLogged.Add(curPawn.def.defName);
                        try
                        {
                            Dolls.LogDebug("uimismatch:" + curPawn.def.defName,
                                "[NHT ui] rect aspect mismatch race=" + curPawn.def.defName
                                + " rect=" + outer.width.ToString("F1") + "x" + outer.height.ToString("F1")
                                + " aspect=" + arRect.ToString("F3")
                                + " bbAspect=" + arBb.ToString("F3") + " fit=" + fit.ToString("F4"));
                        }
                        catch (Exception) { }
                    }
                    if (Dolls.DebugOn && curPawn != null && !hairRectLogged.Contains(curPawn.def.defName))
                    {
                        hairRectLogged.Add(curPawn.def.defName);
                        try
                        {
                            Dolls.LogDebug("hairrect:" + curPawn.def.defName,
                                "[NHT hair rect] race=" + curPawn.def.defName
                                + " outer=" + outer.width.ToString("F1") + "x" + outer.height.ToString("F1")
                                + " bb=" + bb.width.ToString("F1") + "x" + bb.height.ToString("F1")
                                + " dollScale=" + ds.ToString("F3") + " fittedW=" + fw.ToString("F1")
                                + " fit=" + fit.ToString("F4"));
                        }
                        catch (Exception) { }
                    }
                }
                catch (Exception) { }
            }

            /* 头发比例：只跟随娃娃实际绘制尺寸（Doll.Fit 的缩放比），与面板外框宽度无关。
               0.9766 是原版 UI 下的校准系数：旧公式 k = 外框宽/512 = 0.4168，
               而 fit = 0.4267 ⇒ 0.4267 × 0.9766 = 0.4167，两者等价，
               所以在原版 UI 下这行不会改变任何观感。 */
            private static bool SameRectW(Rect r)
            {
                return curRect.width > 0.5f && Math.Abs(r.width - curRect.width) < 0.5f;
            }

            private static float HairK(Rect dollRect)
            {
                if (curFitK > 0f && SameRectW(dollRect)) return curFitK * 0.9766f;
                return dollRect.width / 512f;
            }

            /* 拟合后娃娃的实际高度 / 宽度（没有 UI 介入时等于矩形的高 / 宽） */
            private static float FitH(Rect dollRect)
            {
                if (curFitK > 0f && curFitBbH > 0f && SameRectW(dollRect)) return curFitK * curFitBbH;
                return dollRect.height;
            }

            private static float FitW(Rect dollRect)
            {
                if (curFitK > 0f && curFitBbW > 0f && SameRectW(dollRect)) return curFitK * curFitBbW;
                return dollRect.width;
            }

            private static bool IsOtherDollArgs(object[] args)
            {
                try
                {
                    if (args == null) return false;
                    HumanlikeDoll main = MainDollOf(curWidget);
                    if (main == null) return false;
                    for (int i = 0; i < args.Length; i++)
                    {
                        Doll d = args[i] as Doll;
                        if (d == null) continue;
                        if (!object.ReferenceEquals(d, main)) return true;
                    }
                }
                catch (Exception) { }
                return false;
            }

            private static string DollNameOf(object widget)
            {
                HumanlikeDoll d = MainDollOf(widget);
                return d == null ? null : d.defName;
            }

            /* 这一族里有没有生成好的灰色部位（没有就别跳过正常件，否则整件消失） */
            private static bool HasGrayTwin(object widget, string baseName)
            {
                if (widget == null || string.IsNullOrEmpty(baseName)) return false;
                bool found;
                if (grayTwinCache.TryGetValue(baseName, out found)) return found;
                found = false;
                bool sawDef = false;
                try
                {
                    object ctx = null;
                    PropertyInfo ctxP = widget.GetType().GetProperty("Ctx", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (ctxP != null) ctx = ctxP.GetValue(widget);
                    if (ctx != null)
                    {
                        object doll = null;
                        FieldInfo mainF = AccessTools.Field(ctx.GetType(), "MainDoll");
                        if (mainF != null) doll = mainF.GetValue(ctx);
                        if (doll != null)
                        {
                            FieldInfo partsF = AccessTools.Field(doll.GetType(), "Parts");
                            System.Collections.IList parts = partsF == null ? null : partsF.GetValue(doll) as System.Collections.IList;
                            if (parts != null)
                            {
                                for (int i = 0; i < parts.Count; i++)
                                {
                                    object gp = parts[i];
                                    if (gp == null) continue;
                                    object gdn = AccessTools.Field(gp.GetType(), "defName") == null ? null
                                        : AccessTools.Field(gp.GetType(), "defName").GetValue(gp);
                                    // 灰件定义在、但对应 PNG 没写进 Textures/ 时，不能算“有灰件”，
                                    // 否则正常件被跳过、灰件又没有贴图，部位会直接消失。
                                    FieldInfo gtf = AccessTools.Field(gp.GetType(), "tex");
                                    Texture2D gtex = gtf == null ? null : gtf.GetValue(gp) as Texture2D;
                                    if (gdn is string && (string)gdn == baseName + GraySuffix)
                                    {
                                        sawDef = true;
                                        if (gtex != null) { found = true; break; }
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception) { }
                // 贴图还没加载好时先不缓存“没有灰件”，否则之后不会再检查
                if (found || !sawDef) grayTwinCache[baseName] = found;
                return found;
            }

            /* 按小人「色彩显示」决定这一格是否用灰色贴图 */
            private static bool WantGrayNow(Pawn pawn, string race, string doll, string defName, int id)
            {
                try
                {
                    if (CustomDollsMod.Settings != null)
                    {
                        // 总开关关闭 / 该种族强制关闭色彩：所有有灰件的部位一律走灰度，
                        // 不再只限 DesatPartsDef 里登记过的部位。
                        bool raceOff = HairTuning.ColorOff(race);
                        if (!CustomDollsMod.Settings.desatColorsOn || raceOff)
                            return true;
                        if (pawn != null)
                        {
                            int pid = pawn.thingIDNumber;
                            if (pid >= 0 && !HairTuning.SyncPawn(pid))
                            {
                                bool cOn = HairTuning.GetPawnFlag(CustomDollsMod.Settings.pawnColor, pid, true);
                                if (!cOn) return true;
                                return false;
                            }
                        }
                    }
                }
                catch (Exception) { }
                return Desat.GrayNeeded(race, doll, defName, id);
            }

            /* true = 这一格不要画；正常件/灰件按设置二选一 */
            private static bool SkipPart(object[] args)
            {
                // t14-D3：先重置，保证任何早退（part 为空/名字为空）都不会让上一格的 wantGray 残留到本帧后续绘制
                addonFollowWantGray = false;
                object part = PartDefOfArgs(args);
                if (part == null) return false;
                string name = DefNameOf(part);
                if (string.IsNullOrEmpty(name)) return false;
                bool isGray = name.EndsWith(GraySuffix, StringComparison.OrdinalIgnoreCase);
                string baseName = isGray ? name.Substring(0, name.Length - GraySuffix.Length) : name;
                int id = PartIdOfArgs(args);
                string race = curPawn != null && curPawn.def != null ? curPawn.def.defName : null;
                string doll = DollNameOf(curWidget);
                // t12-A1：附加层（光环/呆毛/尾巴）也要跟随「色彩显示」。灰件（168×175 静态图）仍然永远跳过 ——
                // 用它替换 512×512 活体贴图会缩到 33%；这里只记下「这一格应为灰」，绘制处再把活体贴图
                // 运行时灰度化（ApplyHalo / TryGrayAddonFollowStatic）。
                if (AddonFollowPartCached(race, doll, baseName))
                {
                    addonFollowWantGray = WantGrayNow(curPawn, race, doll, baseName, id);
                    if (Dolls.LogOnce("addonfollow:" + race + ":" + baseName))
                        Log.Message("[NHT desat] addon follow race=" + race + " part=" + baseName
                            + " gray=" + addonFollowWantGray);
                    return isGray;
                }
                bool wantGray = WantGrayNow(curPawn, race, doll, baseName, id);
                // 没生成灰件 → 正常件照画，不能把它跳过（否则部位直接消失）。
                // 反过来，只要有灰件就允许切换：不再要求 DesatPartsDef 里登记过，
                // 这样「种族强制关色彩」和旧补丁（没有 DesatPartsDef）也能正常变灰。
                if (wantGray && !isGray && !HasGrayTwin(curWidget, baseName)) return false;
                if (CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug && !skipLogged.Contains(name))
                {
                    skipLogged.Add(name);
                    bool ctl = Desat.Controlled(race, doll, baseName, id);
                    bool master = CustomDollsMod.Settings == null || CustomDollsMod.Settings.desatColorsOn;
                    bool hasTwin = HasGrayTwin(curWidget, baseName);
                    bool partOn = Desat.PartOn(race, doll, baseName, id);
                    // t43：走统一入口（文件通道 + Player.log）
                    Dolls.LogDebug("desat:" + name, "[NHT desat skip] " + name + " race=" + race + " id=" + id + " gray=" + isGray
                        + " want=" + wantGray + " ctl=" + ctl + " masterOn=" + master + " hasTwin=" + hasTwin
                        + " partOn=" + partOn + " skip=" + (isGray != wantGray));
                }
                return isGray != wantGray;   // 需要灰却画正常件 / 不需要灰却画灰件 → 跳过
            }

            /* NHT 每画一个部位都会经过这里：按层级把头发插进去 */
            private static readonly Dictionary<object, Tuple<string, Texture2D, Vector2, float, float>> colorVariantSaved = new Dictionary<object, Tuple<string, Texture2D, Vector2, float, float>>();

            private static bool HasGene(Pawn pawn, string defName)
            {
                if (pawn == null || pawn.genes == null || string.IsNullOrEmpty(defName)) return false;
                List<Gene> list = pawn.genes.GenesListForReading;
                if (list == null) return false;
                for (int i = 0; i < list.Count; i++)
                {
                    Gene g = list[i];
                    // 互斥基因（例如 MoyoGlowOverride 的 Blue/Purple/Violet）会同时留在 GenesListForReading 里，
                    // 但只有一个是 Active；必须只看 Active，否则 NHT 会永远命中优先级最高的 Blue。
                    if (g != null && g.def != null && g.def.defName == defName && g.Active) return true;
                }
                return false;
            }

            /* 通用条件：race / bodyType / hediff / 异种 / 基因（全部满足）/ 排除基因 */
            private static bool ColorVariantMatches(ColorVariantDef v, Pawn pawn, string race, string body)
            {
                if (v == null || pawn == null) return false;
                if (!string.IsNullOrEmpty(v.race) && v.race != "*" && v.race != race) return false;
                if (!string.IsNullOrEmpty(v.bodyType) && v.bodyType != "*" && v.bodyType != body) return false;
                if (!string.IsNullOrEmpty(v.hediff))
                {
                    HediffDef hd = DefDatabase<HediffDef>.GetNamedSilentFail(v.hediff);
                    if (hd == null || pawn.health == null || !pawn.health.hediffSet.HasHediff(hd)) return false;
                }
                if (!string.IsNullOrEmpty(v.xenotype))
                {
                    if (pawn.genes == null || pawn.genes.Xenotype == null || pawn.genes.Xenotype.defName != v.xenotype) return false;
                }
                if (v.genes != null && v.genes.Count > 0)
                {
                    for (int i = 0; i < v.genes.Count; i++)
                        if (!HasGene(pawn, v.genes[i])) return false;
                }
                if (v.notGenes != null && v.notGenes.Count > 0)
                {
                    for (int i = 0; i < v.notGenes.Count; i++)
                        if (HasGene(pawn, v.notGenes[i])) return false;
                }
                return true;
            }

            /* ---------- 尾巴左右：HAR 每个 pawn 的 addonVariants ---------- */
            private static readonly Dictionary<string, int> tailAddonIndexCache = new Dictionary<string, int>();

            private static object RGet(object obj, string name)
            {
                if (obj == null) return null;
                try
                {
                    FieldInfo f = obj.GetType().GetField(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (f != null) return f.GetValue(obj);
                    PropertyInfo p = obj.GetType().GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    return p != null ? p.GetValue(obj, null) : null;
                }
                catch (Exception) { return null; }
            }

            private static int TailAddonIndex(Pawn pawn)
            {
                if (pawn == null || pawn.def == null) return -1;
                string key = pawn.def.defName;
                int cached;
                if (tailAddonIndexCache.TryGetValue(key, out cached)) return cached;
                int idx = -1;
                try
                {
                    object ar = RGet(pawn.def, "alienRace");
                    object gs = RGet(ar, "generalSettings");
                    object apg = RGet(gs, "alienPartGenerator");
                    IList list = RGet(apg, "bodyAddons") as IList;
                    if (list != null)
                    {
                        for (int i = 0; i < list.Count; i++)
                        {
                            object ba = list[i];
                            if (ba == null) continue;
                            string nm = RGet(ba, "name") as string;
                            string pth = RGet(ba, "path") as string;
                            string all = ((nm == null ? "" : nm) + " " + (pth == null ? "" : pth)).ToLowerInvariant();
                            if (all.Contains("tail") && !all.Contains("glow"))
                            {
                                idx = i;
                                break;
                            }
                        }
                    }
                }
                catch (Exception) { }
                tailAddonIndexCache[key] = idx;
                return idx;
            }

            private static bool HarTailRight(Pawn pawn)
            {
                try
                {
                    int idx = TailAddonIndex(pawn);
                    if (idx < 0) return false;
                    object comp = null;
                    List<ThingComp> comps = pawn.AllComps;
                    for (int i = 0; i < comps.Count; i++)
                    {
                        ThingComp c = comps[i];
                        if (c != null && c.GetType().Name == "AlienComp" && c.GetType().Namespace == "AlienRace") { comp = c; break; }
                    }
                    if (comp == null) return false;
                    IList variants = RGet(comp, "addonVariants") as IList;
                    if (variants == null || idx >= variants.Count) return false;
                    int v = Convert.ToInt32(variants[idx]);
                    return v % 2 == 1;   // Moyo: 0 = 左（MoyoTail），1 = 右（MoyoTail1）
                }
                catch (Exception) { return false; }
            }

            private static bool IsTailPart(string name)
            {
                return !string.IsNullOrEmpty(name) && name.IndexOf("tail", StringComparison.OrdinalIgnoreCase) >= 0;
            }

            /* t10-P10：按 wantGray 取颜色变体。灰路径缺失时调用方会用 false 再查一次，回退彩色 */
            private static ColorVariantPart FindColorVariant(string baseName, string race, string body, bool wantGray,
                out string usePath, out string hitDef)
            {
                ColorVariantPart hit = null;
                usePath = null; hitDef = null;
                int bestPriority = int.MinValue;
                foreach (ColorVariantDef v in DefDatabase<ColorVariantDef>.AllDefs)
                {
                    if (v == null) continue;
                    if (!ColorVariantMatches(v, curPawn, race, body)) continue;
                    for (int i = 0; i < (v.parts == null ? 0 : v.parts.Count); i++)
                    {
                        ColorVariantPart cp = v.parts[i];
                        if (cp == null || cp.part != baseName) continue;
                        string pth = wantGray ? cp.grayPath : cp.imagePath;
                        if (string.IsNullOrEmpty(pth)) continue;
                        if (v.priority > bestPriority)
                        {
                            hit = cp;
                            usePath = pth;
                            hitDef = v.defName;
                            bestPriority = v.priority;
                        }
                        break;   // 一个 Def 里同一部位只取第一条
                    }
                }
                return hit;
            }

            private static void ApplyColorVariant(object[] __args)
            {
                if (CustomDollsMod.Settings != null && !CustomDollsMod.Settings.enableColorVariants) return;
                try
                {
                    if (curPawn == null || curPawn.health == null || curPawn.story == null) return;
                    object part = PartDefOfArgs(__args);
                    if (part == null) return;
                    string name = DefNameOf(part);
                    if (string.IsNullOrEmpty(name)) return;
                    bool isGray = name.EndsWith(GraySuffix, StringComparison.OrdinalIgnoreCase);
                    string baseName = isGray ? name.Substring(0, name.Length - GraySuffix.Length) : name;
                    if (colorVariantSaved.ContainsKey(part)) return;   // 已经换过，等 postfix 恢复

                    string race = curPawn.def != null ? curPawn.def.defName : "";
                    string body = curPawn.story.bodyType != null ? curPawn.story.bodyType.defName : "";
                    string usePath = null;
                    string hitDef = null;
                    ColorVariantPart hit = FindColorVariant(baseName, race, body, isGray, out usePath, out hitDef);
                    bool grayFallback = false;
                    // t10-P10：灰变体路径缺失时回退彩色（否则 ApplyColorVariant 提前 return，
                    // 部位会保留 def 里的画布默认灰图 —— t8 症状 4 的「只剩基础灰尾」）
                    if (isGray && hit == null)
                    {
                        hit = FindColorVariant(baseName, race, body, false, out usePath, out hitDef);
                        grayFallback = hit != null;
                        if (grayFallback && Dolls.DebugOn)
                            Dolls.LogDebug("gray-fallback:" + race + ":" + baseName,
                                "[NHT desat] fallback color variant (no gray path) race=" + race
                                + " part=" + baseName + " hit=" + hitDef);
                    }
                    bool tailRight = IsTailPart(baseName) && HarTailRight(curPawn);
                    if (hit == null && !tailRight)
                    {
                        NHTCD_Diag.LogDraw(part as DollBodyPartDef, curPawn, baseName, isGray, hitDef, usePath, null, "", 0f, 0f, 0f, 0f, "no-hit");
                        return;
                    }

                    Texture2D tex = null;
                    if (hit != null)
                    {
                        tex = ContentFinder<Texture2D>.Get(usePath, false);
                        if (tex == null && isGray && !grayFallback)
                        {
                            // 灰贴图没加载出来：退回彩色变体，别让部位消失
                            hit = FindColorVariant(baseName, race, body, false, out usePath, out hitDef);
                            if (hit != null)
                            {
                                tex = ContentFinder<Texture2D>.Get(usePath, false);
                                grayFallback = tex != null;
                            }
                            if (grayFallback && Dolls.DebugOn)
                                Dolls.LogDebug("gray-tex-fallback:" + race + ":" + baseName,
                                    "[NHT desat] fallback color variant (gray tex null) race=" + race
                                    + " part=" + baseName + " hit=" + hitDef);
                        }
                        if (tex == null)
                        {
                            NHTCD_Diag.LogDraw(part as DollBodyPartDef, curPawn, baseName, isGray, hitDef, usePath, null, "", 0f, 0f, hit.width, hit.height, "tex-null");
                            return;
                        }
                    }
                    FieldInfo imgF = typeof(DollBodyPartDef).GetField("imagePath", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo texF = typeof(DollBodyPartDef).GetField("tex", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo posF = typeof(DollBodyPartDef).GetField("position", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo wF = typeof(DollBodyPartDef).GetField("width", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo hF = typeof(DollBodyPartDef).GetField("height", BindingFlags.Instance | BindingFlags.Public);
                    if (hit != null && (imgF == null || texF == null)) return;
                    if (posF == null || wF == null) return;
                    string oldPath = imgF != null ? (string)imgF.GetValue(part) : "";
                    Texture2D oldTex = texF != null ? (Texture2D)texF.GetValue(part) : null;
                    Vector2 oldPos = (Vector2)posF.GetValue(part);
                    float oldW = (float)wF.GetValue(part);
                    float oldH = hF != null ? (float)hF.GetValue(part) : 0f;
                    NHTCD_Diag.LogDraw(part as DollBodyPartDef, curPawn, baseName, isGray, hitDef, usePath, tex, oldPath, oldW, oldH,
                        hit != null && !float.IsNaN(hit.width) ? hit.width : oldW,
                        hit != null && !float.IsNaN(hit.height) ? hit.height : oldH,
                        tailRight ? "applied-tailRight" : "applied");
                    colorVariantSaved[part] = Tuple.Create(oldPath, oldTex, oldPos, oldW, oldH);
                    if (hit != null)
                    {
                        imgF.SetValue(part, usePath);
                        texF.SetValue(part, tex);
                        if (!float.IsNaN(hit.x) || !float.IsNaN(hit.y))
                        {
                            posF.SetValue(part, new Vector2(float.IsNaN(hit.x) ? oldPos.x : hit.x,
                                                           float.IsNaN(hit.y) ? oldPos.y : hit.y));
                        }
                        if (!float.IsNaN(hit.width)) wF.SetValue(part, hit.width);
                        if (hF != null && !float.IsNaN(hit.height)) hF.SetValue(part, hit.height);
                    }
                    if (tailRight)
                    {
                        // 尾巴南向的 variant 1 是 variant 0 的镜像：X 取反、Y 不变、width 取负
                        Vector2 cp = (Vector2)posF.GetValue(part);
                        posF.SetValue(part, new Vector2(-cp.x, cp.y));
                        float cw = (float)wF.GetValue(part);
                        wF.SetValue(part, -Math.Abs(cw));
                        // t52：把「这个部位本帧被镜像」记给护甲图标补丁（同一 bodyPartId 的彩件与灰件都要翻）
                        try
                        {
                            FieldInfo bpF = typeof(DollBodyPartDef).GetField("bodyPartId", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                            if (bpF != null) Dolls.ArmorMirrorBodyPart = Convert.ToInt32(bpF.GetValue(part));
                        }
                        catch (Exception) { }
                    }
                }
                catch (Exception) { }
            }

            /* t127：手/脚娃娃的按种族部位覆盖 —— 套用后由 Postfix 立刻还原（Def 是共享对象） */
            private static readonly Dictionary<object, Tuple<string, Texture2D, Vector2, float, float>> handOvSaved = new Dictionary<object, Tuple<string, Texture2D, Vector2, float, float>>();

            private static readonly List<string> handLogged = new List<string>();

            private static void HandLog(string kind, string msg)
            {
                // t123：手部绘制诊断只在 debug 开启时输出
                if (!Dolls.DebugOn) return;
                try
                {
                    if (handLogged.Count >= 12) return;
                    if (handLogged.Contains(kind + "|" + msg)) return;
                    handLogged.Add(kind + "|" + msg);
                    Log.Message("[NHT hand] " + kind + " " + msg);
                }
                catch (Exception) { }
            }

            private static void ApplyHandOverride(object[] args)
            {
                try
                {
                    if (curPawn == null || curPawn.def == null) return;
                    if (!Dolls.HasHandOverrides()) return;
                    object part = PartDefOfArgs(args);
                    if (part == null || handOvSaved.ContainsKey(part)) return;
                    string doll = DollNameOf(curWidget);
                    // 娃娃名在不同 NHT 版本里有 HandDoll / FeetDoll / HandsDoll 等写法，按关键字匹配更稳
                    if (string.IsNullOrEmpty(doll)) return;
                    if (doll.IndexOf("Hand", StringComparison.OrdinalIgnoreCase) < 0 &&
                        doll.IndexOf("Feet", StringComparison.OrdinalIgnoreCase) < 0 &&
                        doll.IndexOf("Foot", StringComparison.OrdinalIgnoreCase) < 0) return;
                    string name = DefNameOf(part);
                    if (string.IsNullOrEmpty(name)) return;
                    NhtHandPartOverride ov = Dolls.HandOverrideFor(curPawn.def.defName, doll, name);
                    if (ov == null)
                    {
                        if (Dolls.HasHandOverrideForRacePart(curPawn.def.defName, name))
                            HandLog("miss", curPawn.def.defName + " doll=" + doll + " part=" + name);
                        return;
                    }
                    HandLog("apply", curPawn.def.defName + " doll=" + doll + " part=" + name +
                        " x=" + ov.x + " y=" + ov.y + " w=" + ov.width + " h=" + ov.height);
                    FieldInfo imgF = typeof(DollBodyPartDef).GetField("imagePath", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo texF = typeof(DollBodyPartDef).GetField("tex", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo posF = typeof(DollBodyPartDef).GetField("position", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo wF = typeof(DollBodyPartDef).GetField("width", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo hF = typeof(DollBodyPartDef).GetField("height", BindingFlags.Instance | BindingFlags.Public);
                    if (posF == null || wF == null) return;
                    string oldPath = imgF == null ? null : (string)imgF.GetValue(part);
                    Texture2D oldTex = texF == null ? null : (Texture2D)texF.GetValue(part);
                    Vector2 oldPos = (Vector2)posF.GetValue(part);
                    float oldW = (float)wF.GetValue(part);
                    float oldH = hF == null ? 1f : (float)hF.GetValue(part);
                    handOvSaved[part] = Tuple.Create(oldPath, oldTex, oldPos, oldW, oldH);
                    if (!string.IsNullOrEmpty(ov.imagePath) && imgF != null)
                    {
                        Texture2D t = ContentFinder<Texture2D>.Get(ov.imagePath, false);
                        if (t != null)
                        {
                            imgF.SetValue(part, ov.imagePath);
                            if (texF != null) texF.SetValue(part, t);
                        }
                    }
                    posF.SetValue(part, new Vector2(float.IsNaN(ov.x) ? oldPos.x : ov.x,
                                                   float.IsNaN(ov.y) ? oldPos.y : ov.y));
                    if (!float.IsNaN(ov.width)) wF.SetValue(part, ov.width);
                    if (hF != null && !float.IsNaN(ov.height)) hF.SetValue(part, ov.height);
                }
                catch (Exception) { }
            }

            private static void RestoreHandOverride(object[] args)
            {
                try
                {
                    object part = PartDefOfArgs(args);
                    if (part == null || !handOvSaved.ContainsKey(part)) return;
                    Tuple<string, Texture2D, Vector2, float, float> old = handOvSaved[part];
                    handOvSaved.Remove(part);
                    FieldInfo imgF = typeof(DollBodyPartDef).GetField("imagePath", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo texF = typeof(DollBodyPartDef).GetField("tex", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo posF = typeof(DollBodyPartDef).GetField("position", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo wF = typeof(DollBodyPartDef).GetField("width", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo hF = typeof(DollBodyPartDef).GetField("height", BindingFlags.Instance | BindingFlags.Public);
                    if (imgF != null && old.Item1 != null) imgF.SetValue(part, old.Item1);
                    if (texF != null) texF.SetValue(part, old.Item2);
                    if (posF != null) posF.SetValue(part, old.Item3);
                    if (wF != null) wF.SetValue(part, old.Item4);
                    if (hF != null) hF.SetValue(part, old.Item5);
                }
                catch (Exception) { }
            }

            private static void RestoreColorVariant(object[] __args)
            {
                try
                {
                    object part = PartDefOfArgs(__args);
                    if (part == null || !colorVariantSaved.ContainsKey(part)) return;
                    Tuple<string, Texture2D, Vector2, float, float> old = colorVariantSaved[part];
                    colorVariantSaved.Remove(part);
                    FieldInfo imgF = typeof(DollBodyPartDef).GetField("imagePath", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo texF = typeof(DollBodyPartDef).GetField("tex", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo posF = typeof(DollBodyPartDef).GetField("position", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo wF = typeof(DollBodyPartDef).GetField("width", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo hF = typeof(DollBodyPartDef).GetField("height", BindingFlags.Instance | BindingFlags.Public);
                    if (imgF != null) imgF.SetValue(part, old.Item1);
                    if (texF != null) texF.SetValue(part, old.Item2);
                    if (posF != null) posF.SetValue(part, old.Item3);
                    if (wF != null) wF.SetValue(part, old.Item4);
                    if (hF != null) hF.SetValue(part, old.Item5);
                }
                catch (Exception) { }
            }

            private static bool IsHairTintPart(string race, string doll, string part)
            {
                if (string.IsNullOrEmpty(part)) return false;
                race = Dolls.AliasRace(race);   // t70b：跟随发色的部位数据也随种籍映射
                try
                {
                    foreach (HairTintDef d in DefDatabase<HairTintDef>.AllDefs)
                    {
                        if (d == null) continue;
                        bool raceOk = string.IsNullOrEmpty(d.race) || d.race == "*"
                            || string.Equals(d.race, race, StringComparison.OrdinalIgnoreCase);
                        if (!raceOk && !string.IsNullOrEmpty(race) && !string.IsNullOrEmpty(d.race))
                        {
                            // 编辑器里的 canvas 种族键可能是 Alien_Miho_Mech_Bulgasal，而 pawn 实际 defName 是 Alien_Miho
                            raceOk = race.StartsWith(d.race + "_", StringComparison.OrdinalIgnoreCase)
                                || d.race.StartsWith(race + "_", StringComparison.OrdinalIgnoreCase);
                        }
                        if (!raceOk) continue;
                        if (!string.IsNullOrEmpty(d.doll) && d.doll != "*" && !string.IsNullOrEmpty(doll) && !string.Equals(d.doll, doll, StringComparison.OrdinalIgnoreCase)) continue;
                        if (d.parts == null) continue;
                        for (int i = 0; i < d.parts.Count; i++)
                        {
                            string want = d.parts[i];
                            if (string.IsNullOrEmpty(want)) continue;
                            if (string.Equals(want, part, StringComparison.OrdinalIgnoreCase)) return true;
                            // Miho 的耳朵部位在补丁里是 ..._2，游戏里可能画成不带 _2 的 defName
                            if (part.StartsWith(want, StringComparison.OrdinalIgnoreCase)
                                || want.StartsWith(part, StringComparison.OrdinalIgnoreCase)) return true;
                        }
                    }
                }
                catch (Exception) { }
                return false;
            }

            private static FieldInfo TexFieldOf(object part)
            {
                if (part == null) return null;
                try
                {
                    Type t = part.GetType();
                    while (t != null)
                    {
                        FieldInfo f = t.GetField("tex", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly);
                        if (f != null && f.FieldType == typeof(Texture2D)) return f;
                        t = t.BaseType;
                    }
                }
                catch (Exception) { }
                return null;
            }

            private static Color[] SafePixels(Texture2D t)
            {
                if (t == null) return null;
                try
                {
                    Color[] p = t.GetPixels();
                    if (p != null && p.Length == t.width * t.height) return p;
                }
                catch (Exception) { }
                RenderTexture rt = null;
                Texture2D copy = null;
                RenderTexture prev = RenderTexture.active;
                try
                {
                    rt = RenderTexture.GetTemporary(t.width, t.height, 0, RenderTextureFormat.ARGB32, RenderTextureReadWrite.Linear);
                    Graphics.Blit(t, rt);
                    RenderTexture.active = rt;
                    copy = new Texture2D(t.width, t.height, TextureFormat.RGBA32, false);
                    copy.ReadPixels(new Rect(0f, 0f, t.width, t.height), 0, 0);
                    copy.Apply(false, false);
                    return copy.GetPixels();
                }
                catch (Exception) { return null; }
                finally
                {
                    RenderTexture.active = prev;
                    if (rt != null) RenderTexture.ReleaseTemporary(rt);
                    if (copy != null) UnityEngine.Object.Destroy(copy);
                }
            }

            private static Texture2D TintedTexture(Texture2D src, Color c)
            {
                return TintedTexture(src, c, null);
            }

            private static Texture2D TintedTexture(Texture2D src, Color c, Texture2D mask)
            {
                if (src == null) return null;
                string key = src.GetInstanceID() + "|" + c.r.ToString("F3") + "," + c.g.ToString("F3") + "," + c.b.ToString("F3") + "|" + (mask == null ? 0 : mask.GetInstanceID());
                Texture2D hit;
                if (hairTintTexCache.TryGetValue(key, out hit)) return hit;
                try
                {
                    Color[] px = SafePixels(src);
                    if (px == null) return null;
                    Color[] mp = mask == null ? null : SafePixels(mask);
                    for (int i = 0; i < px.Length; i++)
                    {
                        float w = 1f;
                        if (mp != null && mp.Length > 0)
                        {
                            int mw = mask.width, mh = mask.height;
                            int x = i % src.width, y = i / src.width;
                            int mx = mw == src.width ? x : (int)((long)x * mw / src.width);
                            int my = mh == src.height ? y : (int)((long)y * mh / src.height);
                            int mi = my * mw + mx;
                            if (mi >= 0 && mi < mp.Length) w = Mathf.Clamp01(mp[mi].r);
                        }
                        px[i].r *= Mathf.Lerp(1f, c.r, w);
                        px[i].g *= Mathf.Lerp(1f, c.g, w);
                        px[i].b *= Mathf.Lerp(1f, c.b, w);
                    }
                    Texture2D t = new Texture2D(src.width, src.height, TextureFormat.RGBA32, false);
                    t.SetPixels(px);
                    t.Apply(false, false);
                    t.wrapMode = src.wrapMode;
                    t.filterMode = src.filterMode;
                    hairTintTexCache[key] = t;
                    return t;
                }
                catch (Exception) { return null; }
            }

            private static object GetMember(object o, string name)
            {
                if (o == null) return null;
                try
                {
                    Type t = o.GetType();
                    FieldInfo f = t.GetField(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (f != null) return f.GetValue(o);
                    PropertyInfo p = t.GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (p != null && p.CanRead) return p.GetValue(o, null);
                }
                catch (Exception) { }
                return null;
            }

            private static object FindAlienComp(Pawn p)
            {
                if (p == null || p.AllComps == null) return null;
                for (int i = 0; i < p.AllComps.Count; i++)
                {
                    ThingComp c = p.AllComps[i];
                    if (c != null && c.GetType().Name == "AlienComp") return c;
                }
                return null;
            }

            private static Texture2D RotateTexture(Texture2D src, float deg)
            {
                if (src == null) return null;
                string key = src.GetInstanceID() + "|" + deg.ToString("F1");
                Texture2D hit;
                if (haloRotCache.TryGetValue(key, out hit)) return hit;
                try
                {
                    int w = src.width, h = src.height;
                    Color[] sp = SafePixels(src);
                    if (sp == null) return null;
                    Color[] dp = new Color[w * h];
                    float rad = deg * Mathf.Deg2Rad;
                    float co = Mathf.Cos(rad), si = Mathf.Sin(rad);
                    float cx = w / 2f, cy = h / 2f;
                    for (int y = 0; y < h; y++)
                        for (int x = 0; x < w; x++)
                        {
                            float dx = x - cx, dy = y - cy;
                            float sx = co * dx + si * dy + cx;
                            float sy = -si * dx + co * dy + cy;
                            int ix = (int)(sx + 0.5f), iy = (int)(sy + 0.5f);
                            if (ix >= 0 && ix < w && iy >= 0 && iy < h) dp[y * w + x] = sp[iy * w + ix];
                        }
                    Texture2D t = new Texture2D(w, h, TextureFormat.RGBA32, false);
                    t.SetPixels(dp); t.Apply(false, false);
                    t.wrapMode = src.wrapMode; t.filterMode = src.filterMode;
                    haloRotCache[key] = t;
                    return t;
                }
                catch (Exception) { return null; }
            }

            private static void LogOnceHalo(string msg)
            {
                // t43：一次性日志 —— Player.log 仍只打第一条（保持原行为），同时写一份到文件通道
                // t47-F2：文件通道必须用 LogDebugFile；若走 LogDebug 会再经 LogOnce→Log.Message，
                // 让首条在 Player.log 出现两次、且后续不同 msg 各多打一条。
                // t123：Player.log 侧同样只在 debug 下输出（文件通道仍按 debug 判断）
                if (!haloApplyLogged && Dolls.DebugOn)
                {
                    haloApplyLogged = true;
                    Log.Message("[NHTCD halo apply] " + msg);
                }
                if (Dolls.DebugOn) Dolls.LogDebugFile("halo:" + msg, "[NHTCD halo apply] " + msg);
            }

            private static List<string> ActiveAddonPathsOf(Pawn pawn)
            {
                if (pawn == null || alienCompType == null) return null;
                try
                {
                    foreach (ThingComp c in pawn.AllComps)
                    {
                        if (!alienCompType.IsInstanceOfType(c)) continue;
                        FieldInfo agf = AccessTools.Field(c.GetType(), "addonGraphics");
                        System.Collections.IList list = agf == null ? null : agf.GetValue(c) as System.Collections.IList;
                        if (list == null) return null;
                        List<string> paths = new List<string>();
                        for (int i = 0; i < list.Count; i++)
                        {
                            object a = list[i];
                            FieldInfo pf = a == null ? null : AccessTools.Field(a.GetType(), "path");
                            string ap = pf == null ? null : pf.GetValue(a) as string;
                            if (!string.IsNullOrEmpty(ap)) paths.Add(ap);
                        }
                        return paths;
                    }
                }
                catch (Exception) { }
                return null;
            }

            private static AddonFollowPart FindAddonFollow(string race, string doll, string part)
            {
                if (CustomDollsMod.Settings != null && !CustomDollsMod.Settings.enableAddonFollow) return null;
                race = Dolls.AliasRace(race);   // t70b：附加层跟随也随种籍映射
                try
                {
                    foreach (AddonFollowDef d in DefDatabase<AddonFollowDef>.AllDefs)
                    {
                        if (d == null || d.parts == null) continue;
                        bool raceOk = string.IsNullOrEmpty(d.race) || d.race == "*" || string.Equals(d.race, race, StringComparison.OrdinalIgnoreCase);
                        if (!raceOk && !string.IsNullOrEmpty(race) && !string.IsNullOrEmpty(d.race))
                            raceOk = race.StartsWith(d.race + "_", StringComparison.OrdinalIgnoreCase) || d.race.StartsWith(race + "_", StringComparison.OrdinalIgnoreCase);
                        if (!raceOk) continue;
                        if (!string.IsNullOrEmpty(d.doll) && d.doll != "*" && !string.IsNullOrEmpty(doll) && !string.Equals(d.doll, doll, StringComparison.OrdinalIgnoreCase)) continue;
                        for (int i = 0; i < d.parts.Count; i++)
                        {
                            AddonFollowPart fp = d.parts[i];
                            if (fp != null && !string.IsNullOrEmpty(fp.part) && string.Equals(fp.part, part, StringComparison.OrdinalIgnoreCase)) return fp;
                        }
                    }
                }
                catch (Exception) { }
                return null;
            }

            /* t10-P11：FindAddonFollow 的结果按 race|doll|part 缓存 —— SkipPart 每帧每部位都会调用，
               不能在里面遍历 DefDatabase。AddonFollow 的 Def 在启动后不再变化。 */
            private static readonly Dictionary<string, bool> addonFollowCache = new Dictionary<string, bool>();
            private static bool AddonFollowPartCached(string race, string doll, string part)
            {
                if (string.IsNullOrEmpty(part)) return false;
                if (CustomDollsMod.Settings != null && !CustomDollsMod.Settings.enableAddonFollow) return false;
                string key = (race ?? "") + "|" + (doll ?? "") + "|" + part;
                bool hit;
                if (addonFollowCache.TryGetValue(key, out hit)) return hit;
                hit = FindAddonFollow(race, doll, part) != null;
                addonFollowCache[key] = hit;
                return hit;
            }

            private static bool AlphaBBox(Texture2D t, out int bx, out int by, out int bw, out int bh)
            {
                bx = by = bw = bh = 0;
                Color[] px = SafePixels(t);
                if (px == null) return false;
                int x0 = t.width, y0 = t.height, x1 = -1, y1 = -1;
                for (int y = 0; y < t.height; y++)
                {
                    int row = y * t.width;
                    for (int x = 0; x < t.width; x++)
                    {
                        if (px[row + x].a <= 0.02f) continue;
                        if (x < x0) x0 = x;
                        if (x > x1) x1 = x;
                        if (y < y0) y0 = y;
                        if (y > y1) y1 = y;
                    }
                }
                if (x1 < 0 || y1 < 0) return false;
                bx = x0; by = y0; bw = x1 - x0 + 1; bh = y1 - y0 + 1;
                return true;
            }

            // t114：部位蒙版的路径来源（缓存 FieldInfo，避免每帧反射）
            private static FieldInfo imagePathField;
            private static string ImagePathOf(object partObj)
            {
                if (partObj == null) return "";
                try
                {
                    if (imagePathField == null)
                    {
                        FieldInfo f = partObj.GetType().GetField("imagePath", BindingFlags.Instance | BindingFlags.Public);
                        if (f == null) f = partObj.GetType().GetField("imagePath", BindingFlags.Instance | BindingFlags.NonPublic);
                        imagePathField = f;
                    }
                    return imagePathField == null ? "" : ((imagePathField.GetValue(partObj) as string) ?? "");
                }
                catch (Exception) { return ""; }
            }

            private static Texture2D AddonMaskOf(Texture2D src, string path)
            {
                if (src == null) return null;
                int id = src.GetInstanceID();
                Texture2D hit;
                if (addonMaskCache.TryGetValue(id, out hit)) return hit;
                if (addonMaskMiss.ContainsKey(id)) return null;
                try
                {
                    int sx, sy, sw, sh;
                    bool hasBox = AlphaBBox(src, out sx, out sy, out sw, out sh);
                    List<string> cands = new List<string>();
                    string nm = src.name == null ? "" : src.name;
                    if (nm.Length > 0) cands.Add(nm + "m");
                    if (!string.IsNullOrEmpty(path))
                    {
                        cands.Add(path + "_southm");
                        cands.Add(path + "_northm");
                        cands.Add(path + "_eastm");
                        cands.Add(path + "_westm");
                        cands.Add(path + "_m");
                    }
                    Texture2D loose = null;
                    for (int i = 0; i < cands.Count; i++)
                    {
                        if (string.IsNullOrEmpty(cands[i])) continue;
                        Texture2D m = ContentFinder<Texture2D>.Get(cands[i], false);
                        if (m == null) continue;
                        if (loose == null) loose = m;
                        if (!hasBox) { addonMaskCache[id] = m; return m; }
                        int mx, my, mw, mh;
                        if (!AlphaBBox(m, out mx, out my, out mw, out mh)) continue;
                        // 方向对不对看「遮罩的 alpha 包围盒是否和贴图一致」——Nyaron 耳朵的 _m 与本体逐像素对齐
                        if (Math.Abs(mx - sx) <= 2 && Math.Abs(my - sy) <= 2 && Math.Abs(mw - sw) <= 2 && Math.Abs(mh - sh) <= 2)
                        {
                            addonMaskCache[id] = m;
                            return m;
                        }
                    }
                    if (loose != null) { addonMaskCache[id] = loose; return loose; }
                }
                catch (Exception) { }
                addonMaskMiss[id] = true;
                return null;
            }

            private static bool HasVisiblePixels(Texture2D t)
            {
                if (t == null) return false;
                int id = t.GetInstanceID();
                bool hit;
                if (addonPixelCache.TryGetValue(id, out hit)) return hit;
                bool ok = false;
                try
                {
                    Color[] px = SafePixels(t);
                    if (px != null)
                    {
                        for (int i = 0; i < px.Length; i++)
                        {
                            if (px[i].a > 0.02f) { ok = true; break; }
                        }
                    }
                }
                catch (Exception) { }
                addonPixelCache[id] = ok;
                return ok;
            }

            private static Texture2D AddonDirectionFallback(string path)
            {
                if (string.IsNullOrEmpty(path)) return null;
                Texture2D hit;
                if (addonDirCache.TryGetValue(path, out hit)) return hit;
                Texture2D found = null;
                string[] dirs = new string[] { "_east", "_south", "_north", "_west" };
                for (int i = 0; i < dirs.Length && found == null; i++)
                {
                    try
                    {
                        Texture2D t = ContentFinder<Texture2D>.Get(path + dirs[i], false);
                        if (t != null && HasVisiblePixels(t)) found = t;
                    }
                    catch (Exception) { }
                }
                addonDirCache[path] = found;
                return found;
            }

            /* t113：把换上去的 addon 贴图裁到 alpha 包围盒——盒子尺寸随贴图尺寸走，
               裁完再按 width/height 折算，才能保住编辑时定的位置与命中框。 */
            private static Texture2D CropToAlphaBBox(Texture2D t, int bx, int by, int bw, int bh)
            {
                if (t == null || bw <= 0 || bh <= 0) return null;
                if (bx == 0 && by == 0 && bw == t.width && bh == t.height) return t;
                int key = t.GetInstanceID();
                Texture2D hit;
                if (addonCropCache.TryGetValue(key, out hit) && hit != null) return hit;
                try
                {
                    Color[] px = SafePixels(t);
                    if (px == null) return null;
                    Color[] dp = new Color[bw * bh];
                    for (int y = 0; y < bh; y++)
                        Array.Copy(px, (by + y) * t.width + bx, dp, y * bw, bw);
                    Texture2D nt = new Texture2D(bw, bh, TextureFormat.RGBA32, false);
                    nt.SetPixels(dp);
                    nt.Apply();
                    addonCropCache[key] = nt;
                    return nt;
                }
                catch (Exception) { return null; }
            }

            /* 光环：读小人 AlienComp.addonGraphics 里当前实际的光环贴图和颜色 */
            private static void ApplyHalo(object[] args)
            {
                haloActive = false;
                if (curPawn == null) return;
                object def = PartDefOfArgs(args);
                DollBodyPartDef dp = def as DollBodyPartDef;
                if (dp == null) return;
                string pn = dp.defName ?? "";
                string race = curPawn.def == null ? null : curPawn.def.defName;
                string doll = DollNameOf(curWidget);
                AddonFollowPart fp = FindAddonFollow(race, doll, pn);
                if (fp == null) return;
                string wantPath = fp.path;
                string wantAddon = fp.addon;
                float wantRot = fp.rot;
                // t72：HAR 的占位 addon（Blank）没有任何图案，套上去会把部位画成空白。
                // 遇到 Blank 直接放行，保留 def 自带的贴图（Epona 尾巴曾因此整条消失）。
                if (string.Equals(wantAddon, "Blank", StringComparison.OrdinalIgnoreCase)
                    || (!string.IsNullOrEmpty(wantPath) && wantPath.EndsWith("/Blank", StringComparison.OrdinalIgnoreCase)))
                {
                    LogOnceHalo("skip blank addon part=" + pn + " path=" + wantPath);
                    return;
                }
                try
                {
                    object comp = FindAlienComp(curPawn);
                    if (comp == null) return;
                    FieldInfo agf = AccessTools.Field(comp.GetType(), "addonGraphics");
                    System.Collections.IList list = agf == null ? null : agf.GetValue(comp) as System.Collections.IList;
                    if (list == null || list.Count == 0) return;
                    string path = null;
                    Color col = Color.white;
                    object graphic = null;
                    for (int i = 0; i < list.Count; i++)
                    {
                        object e = list[i];
                        if (e == null) continue;
                        string txt = e.ToString() ?? "";
                        bool hitTxt = false;
                        if (!string.IsNullOrEmpty(wantPath) && txt.IndexOf(wantPath, StringComparison.OrdinalIgnoreCase) >= 0) hitTxt = true;
                        if (!hitTxt && !string.IsNullOrEmpty(wantAddon) && txt.IndexOf(wantAddon, StringComparison.OrdinalIgnoreCase) >= 0) hitTxt = true;
                        if (!hitTxt) continue;
                        int ipos = txt.IndexOf("initPath=", StringComparison.OrdinalIgnoreCase);
                        if (ipos >= 0)
                        {
                            int istart = ipos + 9;
                            int iend = txt.IndexOf(',', istart);
                            if (iend < 0) iend = txt.Length;
                            path = txt.Substring(istart, iend - istart).Trim();
                        }
                        int cpos = txt.IndexOf("color=RGBA(", StringComparison.OrdinalIgnoreCase);
                        if (cpos >= 0)
                        {
                            int cstart = cpos + 11;
                            int cend = txt.IndexOf(')', cstart);
                            if (cend > cstart)
                            {
                                string[] ps = txt.Substring(cstart, cend - cstart).Split(',');
                                if (ps.Length >= 3)
                                {
                                    float cr = float.Parse(ps[0].Trim(), System.Globalization.CultureInfo.InvariantCulture);
                                    float cg = float.Parse(ps[1].Trim(), System.Globalization.CultureInfo.InvariantCulture);
                                    float cb = float.Parse(ps[2].Trim(), System.Globalization.CultureInfo.InvariantCulture);
                                    float ca = ps.Length > 3 ? float.Parse(ps[3].Trim(), System.Globalization.CultureInfo.InvariantCulture) : 1f;
                                    col = new Color(cr, cg, cb, ca);
                                }
                            }
                        }
                        graphic = e;
                        break;
                    }
                    if (graphic == null) { LogOnceHalo("no path; firstType=" + (list.Count > 0 && list[0] != null ? list[0].GetType().FullName : "?")); return; }
                    Texture2D src = null;
                    bool fromGraphic = false;
                    try
                    {
                        object mat = GetMember(graphic, "MatSingle");
                        if (mat == null) mat = GetMember(graphic, "mat");
                        Material m = mat as Material;
                        if (m != null) { src = m.mainTexture as Texture2D; if (src != null) fromGraphic = true; }
                        if (src == null)
                        {
                            object mats = GetMember(graphic, "mats");
                            System.Collections.IList ml = mats as System.Collections.IList;
                            if (ml != null && ml.Count > 0)
                            {
                                Material m0 = ml[0] as Material;
                                if (m0 != null) { src = m0.mainTexture as Texture2D; if (src != null) fromGraphic = true; }
                            }
                        }
                    }
                    catch (Exception) { }
                    if (src == null && !string.IsNullOrEmpty(path)) src = ContentFinder<Texture2D>.Get(path, false);
                    if (src == null) { LogOnceHalo("texture null: " + path + " graphic=" + (graphic != null)); return; }
                    bool dirFallback = false;
                    if (!HasVisiblePixels(src))
                    {
                        Texture2D alt = AddonDirectionFallback(path);
                        if (alt != null) { src = alt; dirFallback = true; }
                    }
                    Texture2D maskTex = AddonMaskOf(src, path);
                    Texture2D tinted = TintedTexture(src, col, maskTex);
                    if (tinted == null) tinted = src;
                    // t12-A2：光环跟随「色彩显示」—— 在 addon 染色之后、旋转之前把活体贴图灰度化。
                    // 只改像素、尺寸不变（512×512 仍是 512×512）⇒ rect/层级/旋转几何完全不变；
                    // 灰件（168×175 静态图）不参与，避免缩到 33%。
                    bool graySwap = addonFollowWantGray;
                    if (graySwap)
                    {
                        Texture2D g = GrayOrFlat(tinted);
                        if (g != null && g != tinted) tinted = g;
                        else graySwap = false;
                        if (Dolls.DebugOn)
                            Dolls.LogDebug("addongray:" + race + ":" + pn,
                                "[NHT desat] gray (addon follow) race=" + race + " part=" + pn);
                    }
                    Texture2D rot = RotateTexture(tinted, wantRot);
                    if (rot == null) { LogOnceHalo("rotate null: " + path + " src=" + src.width + "x" + src.height); return; }
                    FieldInfo tf = TexFieldOf(def);
                    if (tf == null) { LogOnceHalo("tex field null"); return; }
                    int abx, aby, abw, abh;
                    if (!AlphaBBox(rot, out abx, out aby, out abw, out abh))
                    {
                        // t113：换上去的方向是空图（Nyaron 尾巴 _south 只有 355 字节）——保持 def 自带贴图，
                        // 否则部位被画成空白，而且盒子按空图尺寸算，命中框也不对。
                        LogOnceHalo("skip blank swap part=" + pn + " path=" + path + " " + rot.width + "x" + rot.height);
                        return;
                    }
                    Texture2D swapTex = rot;
                    float wScale = 1f, hScale = 1f;
                    Texture2D defTex = tf.GetValue(def) as Texture2D;
                    if (defTex != null && (defTex.width != rot.width || defTex.height != rot.height))
                    {
                        Texture2D cropped = CropToAlphaBBox(rot, abx, aby, abw, abh);
                        if (cropped != null && cropped.width > 0 && cropped.height > 0)
                        {
                            swapTex = cropped;
                            wScale = (float)defTex.width / cropped.width;
                            hScale = (float)defTex.height / cropped.height;
                        }
                    }
                    LogOnceHalo("ok part=" + pn + " graySwapped=" + graySwap + " path=" + path + " fromGraphic=" + fromGraphic + " color=" + col.r.ToString("F2") + "," + col.g.ToString("F2") + "," + col.b.ToString("F2") + " rot=" + wantRot.ToString("F1") + " tinted=" + (tinted != src) + " mask=" + (maskTex != null) + " dirFallback=" + dirFallback + " " + rot.width + "x" + rot.height + " swap=" + swapTex.width + "x" + swapTex.height + " crop=" + (swapTex != rot) + " scale=" + wScale.ToString("F2") + "," + hScale.ToString("F2"));
                    haloOldTex = defTex;
                    haloPart = def; haloField = tf;
                    tf.SetValue(def, swapTex);
                    if (wScale != 1f || hScale != 1f)
                    {
                        FieldInfo wF = typeof(DollBodyPartDef).GetField("width", BindingFlags.Instance | BindingFlags.Public);
                        FieldInfo hF = typeof(DollBodyPartDef).GetField("height", BindingFlags.Instance | BindingFlags.Public);
                        if (wF != null && hF != null)
                        {
                            haloOldW = (float)wF.GetValue(def);
                            haloOldH = (float)hF.GetValue(def);
                            haloSizeSaved = true;
                            wF.SetValue(def, haloOldW * wScale);
                            hF.SetValue(def, haloOldH * hScale);
                        }
                    }
                    haloActive = true;
                }
                catch (Exception) { }
            }

            private static void HaloDiag(string race, string doll, string part)
            {
                try
                {
                    StringBuilder sb = new StringBuilder();
                    sb.Append("[NHTCD halo] race=" + race + " doll=" + doll + " part=" + part);
                    object comp = null;
                    if (curPawn != null && curPawn.AllComps != null)
                    {
                        for (int i = 0; i < curPawn.AllComps.Count; i++)
                        {
                            ThingComp c = curPawn.AllComps[i];
                            if (c != null && c.GetType().Name == "AlienComp") { comp = c; break; }
                        }
                    }
                    if (comp != null)
                    {
                        sb.Append("\n  comp=" + comp.GetType().FullName);
                        foreach (FieldInfo f in comp.GetType().GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic))
                        {
                            object v = null;
                            try { v = f.GetValue(comp); } catch (Exception) { continue; }
                            if (v is Color) sb.Append("\n  " + f.Name + "=" + ((Color)v).r.ToString("F2") + "," + ((Color)v).g.ToString("F2") + "," + ((Color)v).b.ToString("F2") + "," + ((Color)v).a.ToString("F2"));
                            else if (v is Color32) { Color32 c32 = (Color32)v; sb.Append("\n  " + f.Name + "=" + c32.r + "," + c32.g + "," + c32.b + "," + c32.a); }
                            else if (v is string) sb.Append("\n  " + f.Name + "=" + (string)v);
                            else if (v is System.Collections.IList) { System.Collections.IList l = (System.Collections.IList)v; sb.Append("\n  " + f.Name + "[" + l.Count + "]="); for (int k = 0; k < l.Count && k < 40; k++) sb.Append(l[k] + " "); }
                        }
                    }
                    object ar = AlienSettings(curPawn == null ? null : curPawn.def);
                    object gs = ar == null ? null : AccessTools.Field(ar.GetType(), "generalSettings") == null ? null : AccessTools.Field(ar.GetType(), "generalSettings").GetValue(ar);
                    object apg = gs == null ? null : AccessTools.Field(gs.GetType(), "alienPartGenerator") == null ? null : AccessTools.Field(gs.GetType(), "alienPartGenerator").GetValue(gs);
                    System.Collections.IList addons = apg == null || AccessTools.Field(apg.GetType(), "bodyAddons") == null ? null : AccessTools.Field(apg.GetType(), "bodyAddons").GetValue(apg) as System.Collections.IList;
                    if (addons != null)
                    {
                        sb.Append("\n  bodyAddons[" + addons.Count + "]");
                        for (int i = 0; i < addons.Count; i++)
                        {
                            object ad = addons[i];
                            if (ad == null) continue;
                            FieldInfo nf = AccessTools.Field(ad.GetType(), "name");
                            FieldInfo pf = AccessTools.Field(ad.GetType(), "path");
                            string nm = nf == null ? "" : (nf.GetValue(ad) as string ?? "");
                            string pt = pf == null ? "" : (pf.GetValue(ad) as string ?? "");
                            sb.Append("\n  #" + i + " name=" + nm + " path=" + pt);
                        }
                    }
                    Log.Message(sb.ToString());
                }
                catch (Exception e) { Log.Message("[NHTCD halo] diag failed: " + e.Message); }
            }

            /* 耳朵/尾巴等 colorChannel=hair 的部位：用小人当前发色做 tint。
               NHT 的 DrawPart 走 GUI.DrawTexture，GUI.color 会直接乘到贴图上。 */
            private static void ApplyHairTint(object[] args)
            {
                hairTintActive = false;
                if (curPawn == null || curPawn.story == null) return;
                try
                {
                    DollBodyPartDef dp = PartDefOfArgs(args) as DollBodyPartDef;
                    if (dp == null) return;
                    string race = curPawn.def == null ? null : curPawn.def.defName;
                    string doll = DollNameOf(curWidget);
                    string part = dp.defName;
                    bool match = IsHairTintPart(race, doll, part);
                    bool gray = WantGrayNow(curPawn, race, doll, part, 0);
                    if (!haloDiagLogged && part.IndexOf("u5149u73af", StringComparison.Ordinal) >= 0)
                    {
                        haloDiagLogged = true;
                        HaloDiag(race, doll, part);
                    }
                    // t10-P13：每帧每部位都会走到这里 —— 统一限流（同 race+部件只打一次 + 全局上限）
                    if (Dolls.DebugOn)
                    {
                        Color hc = curPawn.story.HairColor;
                        // t43：tint 是每帧最热的日志之一 —— 文件通道也走 key 去重，不按帧写
                        Dolls.LogDebug("tint:" + race + "|" + doll + "|" + part, "[NHTCD hair tint] race=" + race + " doll=" + doll + " part=" + part
                            + " match=" + match + " gray=" + gray
                            + " hair=" + hc.r.ToString("F2") + "," + hc.g.ToString("F2") + "," + hc.b.ToString("F2"));
                    }
                    if (!match || gray) return;
                    hairTintSaved = GUI.color;
                    Color hairNow = curPawn.story.HairColor;
                    GUI.color = hairNow;
                    object partObj = PartDefOfArgs(args);
                    if (partObj != null)
                    {
                        FieldInfo tf = TexFieldOf(partObj);
                        Texture2D oldTex = tf == null ? null : (tf.GetValue(partObj) as Texture2D);
                        if (oldTex != null)
                        {
                            // t114：部位蒙版 —— 同目录 <贴图名>_m.png 决定哪些像素参与染色（黑=不染）
                            Texture2D partMask = AddonMaskOf(oldTex, ImagePathOf(partObj));
                            Texture2D tinted = TintedTexture(oldTex, hairNow, partMask);
                            if (tinted != null)
                            {
                                hairTintPart = partObj;
                                hairTintField = tf;
                                hairTintOldTex = oldTex;
                                try { tf.SetValue(partObj, tinted); } catch (Exception) { hairTintPart = null; hairTintField = null; hairTintOldTex = null; }
                            }
                        }
                    }
                    hairTintActive = true;
                }
                catch (Exception) { }
            }

            /// <summary>
            /// t12-A3：不走 ApplyHalo 的 AddonFollow 部位（呆毛/尾巴等直接用 def.tex 绘制的部件）。
            /// 本帧若「应为灰」，就把 def.tex 临时换成运行时灰度化的活体贴图 —— 像素尺寸与 def 几何都不变，
            /// 所以 rect/旋转/层级/alpha 全部保持原样；灰件（NHTCD_Gray，168×175）永远不参与。
            /// PartPostfix 负责还原，避免污染 Def 数据库的共享 tex。
            /// </summary>
            private static void TryGrayAddonFollowStatic(object[] args)
            {
                addonGrayActive = false;
                if (haloActive || !addonFollowWantGray || curPawn == null) return;
                try
                {
                    object partObj = PartDefOfArgs(args);
                    if (partObj == null) return;
                    FieldInfo tf = TexFieldOf(partObj);
                    if (tf == null) return;
                    Texture2D oldTex = tf.GetValue(partObj) as Texture2D;
                    if (oldTex == null) return;
                    Texture2D gray = GrayOrFlat(oldTex);
                    if (gray == null || gray == oldTex) return;
                    tf.SetValue(partObj, gray);
                    addonGrayPart = partObj;
                    addonGrayField = tf;
                    addonGrayOld = oldTex;
                    addonGrayActive = true;
                    string rn = curPawn.def == null ? "?" : curPawn.def.defName;
                    if (Dolls.DebugOn)
                        Dolls.LogDebug("addongray-static:" + rn + ":" + DefNameOf(partObj),
                            "[NHT desat] gray (addon follow) race=" + rn + " part=" + DefNameOf(partObj) + " static");
                }
                catch (Exception) { addonGrayActive = false; }
            }

            private static void RecordDrawnPart(object[] __args)
            {
                try
                {
                    DollBodyPartDef p = PartDefOfArgs(__args) as DollBodyPartDef;
                    if (p == null) return;
                    Dolls.ArmorDrawn[p.defName] = new Vector3(p.position.x, p.position.y, p.width);
                }
                catch (Exception) { }
            }

            private static bool PartPrefix(object[] __args)
            {
                if (curPawn == null) return true;
                bool deferThis = false;
                try
                {
                    if (SkipPart(__args)) return false;
                    // t65：置顶部位（topParts/aboveParts）只保留「头发之后」那一次绘制，
                    // 常规阶段不再画一遍，避免同样的像素（尤其带 alpha 的腮/提灯）叠两层。
                    deferThis = DeferTopPart(__args);
                    ApplyColorVariant(__args);
                    ApplyHandOverride(__args);   // t127
                    ApplyHairTint(__args);
                    ApplyHalo(__args);
                    // t12-A3：光环以外的 AddonFollow 部位（呆毛/尾巴）按同一份 wantGray 换灰化贴图
                    TryGrayAddonFollowStatic(__args);
                    // t52b：抓「宿主真正用来画这个部位」的 position/width 快照，给护甲图标补丁用
                    RecordDrawnPart(__args);

                    int layer = -1;
                    if (__args != null)
                        for (int i = 0; i < __args.Length && layer < 0; i++) layer = LayerOfArg(__args[i]);
                    if (layer < 0) return !deferThis;

                    int hl = HairLayerNow();
                    bool cross = lastLayer == int.MinValue
                        ? (layer >= hl)
                        : ((lastLayer < hl && layer >= hl) || (lastLayer > hl && layer <= hl));
                    lastLayer = layer;
                    if (mainDrawn || !cross) return !deferThis;

                    // Dummy-HAR（bodyAddon 全 Dummy）种族：按 HairFitDef 把「原版发型贴图」画在这个发层位置
                    // （Mincho: layer16 = 头/眼之上、brain/heart 之下），否则会被后画的耳朵等部位盖住。
                    // 附属娃娃（手/脚）的 rect 不同，不在它们的部件栈里画。
                    bool midHair = DummyHarVanillaFit(curPawn) && !IsOtherDollArgs(__args);
                    if (midHair)
                    {
                        // t36：层内插入链自己也要过 Xray 门。Prefix 在 Xray 下通常会把 curPawn 置空，
                        // 让整个 PartPrefix 提前返回；但只要 Prefix 这一帧没跑到（宿主从别的入口画同一部件栈），
                        // curPawn 就会是上一帧留下的值，头发便漏画到器官/骨骼页上。
                        // 这里用与 Postfix 完全相同的判定兜底；隐藏时置 vanillaMidDrawn=true，
                        // 让 Postfix 知道「这条已处理、别再补画」，同时不动 curPawn（避免影响后续帧）。
                        if (IsXray(curWidget) && !HairVisibleInXray())
                        {
                            vanillaMidDrawn = true;
                            // t48-F1：debug 关闭时连 key 都不拼（每帧路径）
                            if (Dolls.DebugOn)
                                Dolls.LogDebug("xray-hide:" + curPawn.def.defName,
                                    "[NHT hair] hidden in xray race=" + curPawn.def.defName);
                        }
                        else
                        {
                            DrawVanillaHairColored(curPawn, curRect);
                            vanillaMidDrawn = true;
                            // 验收用：确认头发真的画在部件栈的 layer16 位置（而不是外面的最上层兜底）
                            if (Dolls.DebugOn && !hairGateLogged.Contains("layer:" + curPawn.def.defName))
                            {
                                hairGateLogged.Add("layer:" + curPawn.def.defName);
                                Log.Message("[NHT hair] draw@layer race=" + curPawn.def.defName + " layer=" + hl
                                    + " insertedAt=layer" + layer);
                            }
                        }
                    }
                    else
                    {
                        Draw(null, curPawn, curRect, cur.main, cur.mainPath);
                        for (int k = 0; k < cur.extra.Count; k++)
                            Draw(null, curPawn, curRect, cur.extra[k], cur.extraPath[k]);
                    }
                    mainDrawn = true; extrasDrawn = true;

                    // t10-P13：每帧每娃娃都会走到这里 —— 同种族只留第一条
                    if (Dolls.DebugOn)
                    {
                        Dolls.LogDebug("insert:" + curPawn.def.defName, "[NHT hair insert] race=" + curPawn.def.defName + " hairLayer=" + hl
                            + " insertedAt=layer" + layer + " (main=" + cur.main + ", extra=" + cur.extra.Count
                            + (midHair ? ", vanillaMid=true" : "") + ")");
                    }
                }
                catch (Exception) { }
                return !deferThis;
            }


            private static void PartPostfix(object[] __args)
            {
                if (hairTintActive)
                {
                    if (hairTintPart != null && hairTintField != null)
                    {
                        try { hairTintField.SetValue(hairTintPart, hairTintOldTex); } catch (Exception) { }
                    }
                    hairTintPart = null; hairTintField = null; hairTintOldTex = null;
                    GUI.color = hairTintSaved;
                    hairTintActive = false;
                }
                if (haloActive)
                {
                    if (haloPart != null && haloField != null) { try { haloField.SetValue(haloPart, haloOldTex); } catch (Exception) { } }
                    // t113：t113 换图时按静态贴图折算过 width/height，这里必须一起还原（Def 是共享对象）
                    if (haloSizeSaved && haloPart != null)
                    {
                        try
                        {
                            FieldInfo wF = typeof(DollBodyPartDef).GetField("width", BindingFlags.Instance | BindingFlags.Public);
                            FieldInfo hF = typeof(DollBodyPartDef).GetField("height", BindingFlags.Instance | BindingFlags.Public);
                            if (wF != null) wF.SetValue(haloPart, haloOldW);
                            if (hF != null) hF.SetValue(haloPart, haloOldH);
                        }
                        catch (Exception) { }
                        haloSizeSaved = false;
                    }
                    haloPart = null; haloField = null; haloOldTex = null;
                    haloActive = false;
                }
                // t12-A3：还原被临时灰度化的 AddonFollow 部位 def.tex（Def 是全局共享的，必须每帧还原）
                if (addonGrayActive)
                {
                    if (addonGrayPart != null && addonGrayField != null) { try { addonGrayField.SetValue(addonGrayPart, addonGrayOld); } catch (Exception) { } }
                    addonGrayPart = null; addonGrayField = null; addonGrayOld = null;
                    addonGrayActive = false;
                }
                RestoreColorVariant(__args);
                RestoreHandOverride(__args);   // t127
            }


            private static void Prefix(object __instance, Rect dollRect)
            {
                if (failed || __instance == null) return;
                try
                {
                    Lookup();
                    if (alienCompType == null || addonVariantsField == null) return;
                    if (pawnField == null) pawnField = AccessTools.Field(__instance.GetType(), "Pawn");
                    if (pawnField == null) { failed = true; return; }
                    Pawn pawn = (Pawn)pawnField.GetValue(__instance);
                    if (pawn == null || pawn.story == null) return;
                    curPawn = pawn; curWidget = __instance;
                    curRect = dollRect;
                    curFitK = -1f;
                    ComputeFit(__instance, dollRect);   // t62b：矩形不变，按 Doll.Fit 的实际缩放换算头发
                    drawnThisFrame = false; mainDrawn = false; extrasDrawn = false; lastLayer = int.MinValue; 
                    hairRecolored = false;
                    Dolls.ArmorMirrorBodyPart = -1;   // t52：每帧重置镜像部位记录
                    Dolls.ArmorDrawn.Clear();          // t52b：每帧重置「绘制时快照」
                    hairPending = false;
                    vanillaMidDrawn = false;
                    headDeltaValid = false;
                    bool xrayHide = false;
                    if (IsXray(__instance))
                    {
                        // 游戏内设置可全局打开；编辑器导出的 showInXray 可对单个种族打开
                        // t36：判定抽成 HairVisibleInXray()，与 PartPrefix 层内插入共用同一语义
                        if (!HairVisibleInXray()) { curPawn = null; xrayHide = true; }   // 器官/骨骼视图：默认不画头发
                    }
                    InitAddons(pawn.def); 
                    DumpDollParts(pawn.def.defName);   // t64 诊断
                    UseFit(pawn.def.defName);
                    // t10-P13：每帧都会打（t7: 1.5s 内 277 条）—— 同种族只留第一条，计入全局上限
                    if (Dolls.DebugOn)
                    {
                        Dolls.LogDebug("fit:" + pawn.def.defName, "[NHT hair fit] race=" + pawn.def.defName
                            + " fitRace=" + (hairFit == null ? "null" : hairFit.race)
                            + " scale=" + (HairScale(-1f)).ToString("F3")
                            + " offX=" + (HairOffX(0f)).ToString("F3")
                            + " offY=" + (HairOffY(0f)).ToString("F3")
                            + " front=" + (hairFit == null ? "null" : hairFit.front.ToString())
                            + " main=" + cur.main + " bg=" + cur.bg
                            + " extra=" + cur.extra.Count + " backExtra=" + cur.backExtra.Count);
                    }
                    if (xrayHide) return;                                   // 后层也不要画
                    Draw(__instance, pawn, curRect, cur.bg, cur.bgPath);      // 后层：先画，压在所有部位后面
                    // t141：原版 HairDef 的后脑层（*_back_south），和其它后层一样画在部件栈之前
                    if (cur.main < 0) DrawVanillaHairBack(pawn, curRect);
                    for (int s = 0; s < cur.side.Count; s++)
                        Draw(__instance, pawn, curRect, cur.side[s], cur.sidePath[s]);   // 侧层（Yuran SideHair）
                    for (int b = 0; b < cur.backExtra.Count; b++)
                        Draw(__instance, pawn, curRect, cur.backExtra[b], cur.backExtraPath[b]);
                    if (hairFit != null && !hairFit.front)
                        Draw(__instance, pawn, curRect, cur.main, cur.mainPath);   // 主层也放到背后
                }
                catch (Exception e)
                {
                    failed = true;
                    Log.Warning("[NHT Custom Dolls] hair prefix: " + e);
                }
            }

            private static void Postfix()
            {
                try
                {
                    bool selfHair = hairPending;
                    if (curPawn != null && !mainDrawn)
                    {
                        // 没找到插入点（例如头发层级高于所有部位）→ 兜底画在最上层
                        Draw(null, curPawn, curRect, cur.main, cur.mainPath);
                        for (int k = 0; k < cur.extra.Count; k++)
                            Draw(null, curPawn, curRect, cur.extra[k], cur.extraPath[k]);
                        mainDrawn = true; extrasDrawn = true;
                        if (Dolls.DebugOn)
                        {
                            Log.Warning("[NHT hair insert] 没找到插入点，兜底画在最上层：" + curPawn.def.defName
                                + " hairLayer=" + HairLayerNow());
                        }
                    }
                    else if (curPawn != null && !extrasDrawn)
                    {
                        for (int k = 0; k < cur.extra.Count; k++)
                            Draw(null, curPawn, curRect, cur.extra[k], cur.extraPath[k]);
                        extrasDrawn = true;
                    }

                    // t50：骨骼/器官视图下，顶层兜底也必须隐藏。
                    // 骨骼页只画 DollBone（layer 9/10/11），永远跨不过头发层，PartPrefix 的 midHair 分支
                    // 不会触发；不在这里挡的话 DrawVanillaHairColored 会按娃娃中心把头发画在骨架正中。
                    if (curPawn != null && IsXray(curWidget) && !HairVisibleInXray()) curPawn = null;

                    // 原版 HairDef 种族：按发色补画一层（开关打开时才画）。
                    // Mincho 这种 HAR 但 addon 全是 Dummy 的种族，NHT overlay 已被跳过，
                    // 这里必须画，否则头发会整个消失。
                    bool dummyHarNow = curPawn != null && RaceHasHairAddon(curPawn.def) && DummyHarHair();
                    // Dummy-HAR（全 Dummy addon）种族：头发存在与否不能挂在「色彩显示 / 原版发型补画层」开关上，
                    // 否则关掉色彩就会整层消失。正常情况下它已在 PartPrefix 的发层位置画过（vanillaMidDrawn），
                    // 只有没插进去时（例如部件栈里没有 layer>=16 的插入点）才在这里兜底画。
                    bool dummyHarFitNow = curPawn != null && DummyHarVanillaFit(curPawn);
                    if (curPawn != null && cur.main < 0 && !hairRecolored && !selfHair && !vanillaMidDrawn
                        && (dummyHarNow || dummyHarFitNow
                            || (CustomDollsMod.Settings != null && CustomDollsMod.Settings.tintVanillaHair
                                && CustomDollsMod.Settings.enableHairTintOverlay)))
                    {
                        if (Dolls.DebugOn && dummyHarFitNow && !hairGateLogged.Contains(curPawn.def.defName))
                        {
                            hairGateLogged.Add(curPawn.def.defName);
                            Log.Message("[NHT hair] fallback top draw race=" + curPawn.def.defName
                                + " (no part-stack insert)");
                        }
                        UseFit(curPawn.def.defName);
                        bool hasFit = hairFit != null && !string.IsNullOrEmpty(hairFit.race) && hairFit.race != "*";
                        if (hasFit)
                        {
                            if (Dolls.DebugOn && colorHairLogged < 6)
                            {
                                colorHairLogged++;
                                // t43：Player.log 仍只留前 6 条；文件通道按 race 去重、不受 6 条限制
                                Dolls.LogDebug("vanilla-colored:" + curPawn.def.defName,
                                    "[NHT hair] vanilla colored race=" + curPawn.def.defName + " fit=" + hairFit.race);
                            }
                            DrawVanillaHairColored(curPawn, curRect);
                        }
                    }

                    
                    // 呆毛/额发层（独立附加件，画在普通头发之上）
                    if (curPawn != null && cur.main >= 0)
                    {
                        UseFit(curPawn.def.defName);
                        List<string> activePaths = ActiveAddonPathsOf(curPawn);
                        for (int oi = 0; oi < cur.over.Count; oi++)
                        {
                            if (activePaths != null && activePaths.Count > 0 && !activePaths.Contains(cur.overPath[oi])) continue;
                            Draw(null, curPawn, curRect, cur.over[oi], cur.overPath[oi]);
                        }
                    }

                    if (curPawn != null && curWidget != null) RedrawAboveHair(curWidget, curPawn, curRect); 
                    
                    hairPending = false;
                    try { DrawHairGear(curPawn, curRect); } catch (Exception) { } 
                }
                catch (Exception) { }
                curPawn = null;
            }
        }
    }

    

/* 每个种族一份：HAR 附加件在 NHT 娃娃上的缩放与偏移（1.0 = 铺满整身） */

public class DesatPartRef
{
    /// <summary>部位 Def 的 defName（精确匹配用；旧数据可能没有）</summary>
    public string part;
    public int id;
    public string label;
}

class TopPartRef
{
    public string part;
    public int level = 1;
    /// <summary>true = 只在「非 HAR 发型按发色重绘」打开时才置顶</summary>
    public bool vanilla;
}

class DesatPartsDef : Def
{
    /// <summary>种族 defName（优先按它匹配）</summary>
    public string race = "*";
    /// <summary>NHT 娃娃名（兜底匹配）</summary>
    public string doll = "*";
    public List<DesatPartRef> parts = new List<DesatPartRef>();
}

/* t84：窗口视觉辅助 —— 圆角块/分隔线/分区标题/开关行，全部运行时生成，不依赖贴图资源 */
internal static class NhtUi
{
    public static readonly Color Accent = new Color(1f, 0.62f, 0.14f);
    public static readonly Color AccentSoft = new Color(1f, 0.62f, 0.14f, 0.14f);
    public static readonly Color RowHover = new Color(1f, 1f, 1f, 0.06f);
    public static readonly Color Divider = new Color(1f, 1f, 1f, 0.12f);
    public static readonly Color Dim = new Color(0.70f, 0.72f, 0.76f);

    private static Texture2D round;
    private static Texture2D Round
    {
        get
        {
            if (round == null) round = MakeRound(32, 10);
            return round;
        }
    }

    private static Texture2D MakeRound(int size, int radius)
    {
        Texture2D t = new Texture2D(size, size, TextureFormat.ARGB32, false);
        Color[] px = new Color[size * size];
        for (int y = 0; y < size; y++)
        {
            for (int x = 0; x < size; x++)
            {
                float dx = 0f, dy = 0f;
                if (x < radius) dx = radius - x - 0.5f;
                else if (x >= size - radius) dx = x - (size - radius) + 0.5f;
                if (y < radius) dy = radius - y - 0.5f;
                else if (y >= size - radius) dy = y - (size - radius) + 0.5f;
                float d = Mathf.Sqrt(dx * dx + dy * dy);
                px[y * size + x] = new Color(1f, 1f, 1f, Mathf.Clamp01(radius - d + 0.5f));
            }
        }
        t.SetPixels(px);
        t.Apply();
        t.wrapMode = TextureWrapMode.Clamp;
        return t;
    }

    public static void Fill(Rect r, Color c)
    {
        Color old = GUI.color;
        GUI.color = c;
        GUI.DrawTexture(r, Round, ScaleMode.StretchToFill, true, 0f, c, 10f, 0f);
        GUI.color = old;
    }

    public static void Header(Rect r)
    {
        Fill(r, AccentSoft);
        Widgets.DrawBoxSolid(new Rect(r.x + 8f, r.yMax - 1f, r.width - 16f, 1f), Divider);
    }

    public static void Section(Rect r, string key)
    {
        Text.Font = GameFont.Tiny;
        Text.Anchor = TextAnchor.MiddleLeft;
        Color old = GUI.color;
        GUI.color = Dim;
        Widgets.Label(new Rect(r.x + 2f, r.y, r.width - 4f, r.height), Translator.Translate(key).ToString());
        GUI.color = old;
        Text.Anchor = TextAnchor.UpperLeft;
        Text.Font = GameFont.Small;
    }

    public static bool Toggle(Rect r, string label, bool on)
    {
        if (Mouse.IsOver(r)) Widgets.DrawBoxSolid(r, RowHover);
        Rect cb = new Rect(r.x + 2f, r.y + (r.height - 22f) * 0.5f, 22f, 22f);
        // t107：Checkbox 自己会处理点击；再叠加整行 ButtonInvisible 会「点两下 = 没变」，
        // 所以这里只画不点，输入统一交给整行。
        Widgets.CheckboxDraw(cb.x, cb.y, on, false, 22f);
        Text.Anchor = TextAnchor.MiddleLeft;
        Widgets.Label(new Rect(cb.xMax + 6f, r.y, r.width - cb.width - 8f, r.height), label);
        Text.Anchor = TextAnchor.UpperLeft;
        if (Widgets.ButtonInvisible(r)) return !on;
        return on;
    }

    public static void Value(Rect r, string text)
    {
        Text.Anchor = TextAnchor.MiddleRight;
        Widgets.Label(r, text);
        Text.Anchor = TextAnchor.UpperLeft;
    }
}

public class HairAdjustWindow : Window
{
    private readonly string race;
    private readonly bool isHar;
    /* t23-C4：坐标单位（画布 vs 像素）与「是否 HAR」解耦：
       颜色口径继续用 isHar（harHairTint vs tintVanillaHair），滑块/默认值/文案走 canvasUnits。 */
    private bool canvasUnits;
    private readonly int pawnId;
    private bool RaceWide { get { return HairTuning.SyncPawn(pawnId); } }
    private float scale, ox, oy;
    private bool colorOnState;
    private HairWarnWindow warn;
    private float lastScale = -999f, lastOx = -999f, lastOy = -999f;

    public override Vector2 InitialSize
    {
        get { return new Vector2(288f, 234f); }
    }

    /* t63：滑块旁的 − / + 微调按钮，点一次走一个最小刻度 */
    private float NudgeBtn(Rect r, string label, float v, float step, float min, float max)
    {
        if (Widgets.ButtonText(r, label)) return Mathf.Clamp(v + step, min, max);
        return v;
    }

    public string Race { get { return race; } }

    public override void WindowUpdate()
    {
        base.WindowUpdate();
        try
        {
            if (Event.current == null || Event.current.type != EventType.MouseDown || Event.current.button != 0) return;
            Vector2 mp = Event.current.mousePosition;
            bool inWin = windowRect.Contains(mp);
            bool inWarn = warn != null && warn.windowRect.Contains(mp);
            if (!inWin && !inWarn)
            {
                    // 齿轮本身由 DrawHairGear 负责开/关；这里不能先 Close，否则同一帧 Draw 又会重新打开。
                    // t83：窗口回调里的 mousePosition 是窗口局部坐标，齿轮记录的是屏幕 UI 坐标，
                    // 必须用全局鼠标坐标比较，否则「点在齿轮上」永远判定不到 → 关掉又被同帧重开。
                    if (Bootstrap.GearUnderMouseUI()) return;   // t107：让 DrawHairGear 负责 toggle
                    Close();
                }
        }
        catch (Exception) { }
    }

    public override void PostClose()
    {
        base.PostClose();
        // t23-B：关闭若发生在「齿轮点击」这一帧，记下来，供 DrawHairGear 抑制同帧重开
        try
        {
            if (Event.current != null && Event.current.type == EventType.MouseDown
                && Event.current.button == 0
                && Bootstrap.GearUnderMouseUI())
            {
                Bootstrap.gearCloseFrame = Time.frameCount;
                Bootstrap.gearCloseInGear = true;
            }
        }
        catch (Exception) { }
        if (warn != null) { warn.Close(); warn = null; }
    }

    public override void PostOpen()
    {
        base.PostOpen();
        // t79：窗口跟在齿轮右侧，左下角与齿轮底边对齐，且不遮挡齿轮
        Rect gLocal = Bootstrap.HairGearRect;
        Rect g = Bootstrap.HairGearScreenUI;
        if (g.width <= 1f || g.height <= 1f) g = Bootstrap.GearInScreen(gLocal);   // 兜底：老路径
        if (g.width <= 1f || g.height <= 1f) return;
        float w = windowRect.width, h = windowRect.height;
        float x = g.xMax + 6f;
        float y = g.yMax - h;
        if (x + w > UI.screenWidth) x = g.xMin - 6f - w;   // 右侧放不下就翻到左侧
        if (x < 0f) x = 0f;
        if (y < 0f) y = 0f;
        if (y + h > UI.screenHeight) y = UI.screenHeight - h;
        windowRect = new Rect(x, y, w, h);
        if (Dolls.DebugOn) Log.Message("[NHT gear] window placed gearLocal=" + gLocal + " gearScreen=" + g + " -> " + windowRect + " screen=" + UI.screenWidth + "x" + UI.screenHeight);
    }

    private string Key { get { return RaceWide || pawnId < 0 ? race : ("p" + pawnId); } }

    public HairAdjustWindow(string race, bool isHar, int pawnId)
    {
        this.race = race;
        this.isHar = isHar;
        this.pawnId = pawnId;
        // t23-C4：由种族判据算单位，而不是沿用调用方传进来的 isHar
        try { canvasUnits = Bootstrap.CanvasRace(DefDatabase<ThingDef>.GetNamedSilentFail(race)); }
        catch (Exception) { canvasUnits = isHar; }
        forcePause = false;
        absorbInputAroundWindow = false;
        closeOnClickedOutside = true;
        closeOnCancel = true;
        doCloseX = false;
        draggable = true;
        LoadValues();
    }

    private HairFitDef FindFit()
    {
        // t79：种族映射过来的种族，参数取目标种族的 HairFitDef
        string target = Dolls.AliasRace(race);
        HairFitDef raw = null;
        foreach (HairFitDef f in DefDatabase<HairFitDef>.AllDefsListForReading)
        {
            if (f == null) continue;
            if (!string.IsNullOrEmpty(target) && string.Equals(f.race, target, StringComparison.OrdinalIgnoreCase)) return f;
            if (string.Equals(f.race, race, StringComparison.OrdinalIgnoreCase)) raw = f;
        }
        return raw;
    }

    private static Pawn PawnById(int id)
    {
        if (id < 0) return null;
        try
        {
            foreach (Pawn p in PawnsFinder.AllMapsWorldAndTemporary_Alive)
                if (p != null && p.thingIDNumber == id) return p;
        }
        catch (Exception) { }
        return null;
    }

    // 代码里对 NivarianHair_LongStraightA 的默认纵向偏移；窗口显示/重置都用它，
    // 保证「没拖过滑条」时显示 -0.23，拖过之后以保存的覆盖值为准（滑块不被锁死）。
    private float HairDefDefaultOy(float fallback)
    {
        try
        {
            Pawn p = PawnById(pawnId);
            if (p != null && p.story != null && p.story.hairDef != null
                && p.story.hairDef.defName == "NivarianHair_LongStraightA") return -0.23f;
        }
        catch (Exception) { }
        return fallback;
    }

    private void LoadValues()
    {
        float s0, x0, y0;
        bool got = HairTuning.TryGet(Key, out s0, out x0, out y0);
        // t23-C4：画布种族的旧 px 残留（|ox|>2 或 scale 越界）不读进滑块，直接清掉回落 Def 值，
        // 否则面板会显示 -23.8 而滑块量程只有 ±2（写入后立刻又被判非法）。
        if (got && canvasUnits && !HairTuning.ValidHarValues(s0, x0, y0))
        {
            HairTuning.Clear(Key);
            got = false;
            if (Dolls.DebugOn) Log.Message("[NHT hair] dropped invalid override " + Key);
        }
        if (!got && !RaceWide && pawnId >= 0)
        {
            got = HairTuning.TryGet(race, out s0, out x0, out y0);
            if (got && canvasUnits && !HairTuning.ValidHarValues(s0, x0, y0))
            {
                HairTuning.Clear(race);
                got = false;
                if (Dolls.DebugOn) Log.Message("[NHT hair] dropped invalid race override " + race);
            }
        }
        if (got) { scale = s0; ox = x0; oy = y0; }
        else
        {
            HairFitDef f = FindFit();
            if (canvasUnits)
            {
                scale = f == null ? 0.78f : f.scale;
                ox = f == null ? 0f : f.offsetX;
                oy = HairDefDefaultOy(f == null ? -0.21f : f.offsetY);
            }
            else
            {
                scale = f == null ? 1f : f.vanillaScale;
                ox = f == null ? 0f : f.vanillaOffsetX;
                oy = f == null ? 0f : f.vanillaOffsetY;
            }
        }
        lastScale = scale; lastOx = ox; lastOy = oy;
        // 设置小窗口每次换小人时同步「色彩显示」勾选状态，而不是只靠 OnGUI 里临时算
        try
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            bool raceOff = HairTuning.ColorOff(race);
            // t10-P9：勾选态与 DoWindowContents 同源 —— 同时反映全局总开关和本种族 ColorOff，
            // 否则全局关色时这里会显示「开」而实际画面全灰。
            bool globalColor = (st == null || st.desatColorsOn) && !raceOff;
            colorOnState = RaceWide
                ? globalColor
                : HairTuning.GetPawnFlag(st == null ? null : st.pawnColor, pawnId, globalColor);
        }
        catch (Exception) { }
    }

    private void ClearAutoFix()
    {
        try
        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st == null || st.hairAutoFix == null) return;
            for (int i = st.hairAutoFix.Count - 1; i >= 0; i--)
            {
                string[] p = (st.hairAutoFix[i] ?? "").Split('|');
                if (p.Length == 2 && (p[0] == race || p[0].StartsWith(race + "#"))) st.hairAutoFix.RemoveAt(i);
            }
            st.Write();
        }
        catch (Exception) { }
    }

    private void Flush()
    {
        if (Mathf.Abs(scale - lastScale) < 1e-4f && Mathf.Abs(ox - lastOx) < 1e-4f && Mathf.Abs(oy - lastOy) < 1e-4f) return;
        lastScale = scale; lastOx = ox; lastOy = oy;
        HairTuning.Set(Key, scale, ox, oy);
        Bootstrap.ResetFitCache();   // 让非 HAR 立即用新值重画
        if (pawnId >= 0) HairTuning.MarkManual(pawnId);
        ClearAutoFix();
    }

    public override void DoWindowContents(Rect inRect)
    {
        Text.Font = GameFont.Small;
        // t85：贴近原版 —— 标题行（左标题、右重置）+ 一条分隔线；不做分区、不精简内容
        Widgets.Label(new Rect(0f, 0f, inRect.width - 58f, 24f),
            Translator.Translate("NHTCD_WinTitle").ToString() + " · " + race);
        if (Widgets.ButtonText(new Rect(inRect.width - 58f, 2f, 52f, 20f), Translator.Translate("NHTCD_WinReset").ToString()))
        {
            HairFitDef rf = FindFit();
            if (RaceWide || pawnId < 0)
            {
                HairTuning.Clear(race);
            }
            else
            {
                // 本人模式：写成“默认值”本身，而不是清空——清空会回落到种族值（旧数据）
                float ds = canvasUnits ? (rf == null ? 0.78f : rf.scale) : (rf == null ? 1f : rf.vanillaScale);
                float dx = canvasUnits ? (rf == null ? 0f : rf.offsetX) : (rf == null ? 0f : rf.vanillaOffsetX);
                float dy = canvasUnits ? HairDefDefaultOy(rf == null ? -0.21f : rf.offsetY) : (rf == null ? 0f : rf.vanillaOffsetY);
                HairTuning.Set("p" + pawnId, ds, dx, dy);
            }
            if (pawnId >= 0) HairTuning.ClearManual(pawnId);
            ClearAutoFix();
            LoadValues();
            Dolls.Invalidate();
        }
        Widgets.DrawLineHorizontal(0f, 26f, inRect.width);
        float y = 32f;

        {
            CustomDollsSettings st0 = CustomDollsMod.Settings;
            bool globalMaster = st0 == null || (canvasUnits ? st0.harHairUseEditor : st0.vanillaHairUseEditor);
            bool master = RaceWide
                ? globalMaster
                : HairTuning.GetPawnFlag(st0 == null ? null : st0.pawnCustom, pawnId, globalMaster);
            bool nm = master;
            nm = NhtUi.Toggle(new Rect(0f, y, inRect.width, 22f), Translator.Translate("NHTCD_WinMaster").ToString(), nm);
            if (nm != master && st0 != null)
            {
                if (RaceWide)
                {
                    if (canvasUnits) st0.harHairUseEditor = nm;
                    else st0.vanillaHairUseEditor = nm;
                    st0.Write();
                }
                else HairTuning.SetPawnFlag(st0.pawnCustom, pawnId, nm);
                Dolls.Invalidate();
            }
            y += 26f;

            bool rn = RaceWide;
            rn = NhtUi.Toggle(new Rect(0f, y, inRect.width, 22f), Translator.Translate("NHTCD_WinSync").ToString(), rn);
            if (rn != RaceWide)
            {
                if (rn)
                {
                    if (pawnId >= 0) HairTuning.Clear("p" + pawnId);
                    CustomDollsSettings stS = CustomDollsMod.Settings;
                    if (stS != null && pawnId >= 0)
                    {
                        bool gm = canvasUnits ? stS.harHairUseEditor : stS.vanillaHairUseEditor;
                        bool cm = HairTuning.GetPawnFlag(stS.pawnCustom, pawnId, gm);
                        if (canvasUnits) stS.harHairUseEditor = cm; else stS.vanillaHairUseEditor = cm;
                        // 颜色口径仍用 isHar（HAR 用 harHairTint，非 HAR 用 tintVanillaHair）
                        bool gc = isHar ? stS.harHairTint : stS.tintVanillaHair;
                        bool cc = HairTuning.GetPawnFlag(stS.pawnColor, pawnId, gc);
                        // 旧版把「本人」的色彩状态写成了全局 desatColorsOn / tintVanillaHair：
                        // 会连带改掉所有种族所有小人的色彩显示，而且 Mincho 这类 Dummy-HAR 种族的
                        // 头发曾经就挂在 tintVanillaHair 门控上 → 关色彩时整层消失。
                        // 现在只把本人状态升级成「本种族」的 ColorOff，全局开关保持不变。
                        HairTuning.SetColorOff(race, !cc);   // 内部会 st.Write() 落盘
                    }
                    HairTuning.SetSyncPawn(pawnId, true);
                }
                else
                {
                    HairTuning.Set("p" + pawnId, scale, ox, oy);
                    HairTuning.SetSyncPawn(pawnId, false);
                }
                LoadValues();
            }
            y += 26f;
        }

        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            bool raceOff = HairTuning.ColorOff(race);
            // t10-P9：勾选态与 LoadValues 同源（全局总开关 && 本种族未强制关色），否则会显示「开」却全灰
            bool globalColor = (st == null || st.desatColorsOn) && !raceOff;
            bool colorOn = RaceWide
                ? globalColor
                : HairTuning.GetPawnFlag(st == null ? null : st.pawnColor, pawnId, globalColor);
            bool nc = colorOn;
            this.colorOnState = colorOn;
            nc = NhtUi.Toggle(new Rect(0f, y, inRect.width, 22f), Translator.Translate("NHTCD_WinColor").ToString(), nc);
            if (nc != colorOn && st != null)
            {
                this.colorOnState = nc;
                if (RaceWide)
                {
                    // 只改本种族的 ColorOff；不再覆盖全局 desatColorsOn / tintVanillaHair（旧版会因此
                    // 关掉 Mincho 等种族的整个发层）。SetColorOff 内部会 st.Write()。
                    HairTuning.SetColorOff(race, !nc);
                    // t10-P9 单向语义：打开色彩时把全局总开关一并点亮（旧版把它写成 false 后没有任何
                    // 窗口能写回来，用户只能去设置页救）；关闭时只写本种族 ColorOff，绝不用全局 false
                    // 去关别人的颜色。
                    if (nc && !st.desatColorsOn)
                    {
                        st.desatColorsOn = true;
                        st.Write();
                    }
                }
                else HairTuning.SetPawnFlag(st.pawnColor, pawnId, nc);
                Dolls.Invalidate();
            }
            y += 26f;
        }

        y += 6f;
        float sw = inRect.width - 144f;
        // t63：细调。滑块负责粗调，右侧 − / + 每点一次走一个最小刻度；
        // 画布单位步进 0.01，像素单位步进 1px。
        float stepS = 0.01f;
        float stepO = canvasUnits ? 0.01f : 1f;
        // t23-C4：画布单位用 HairFitDef 的合法区间（与 HairTuning.ValidHarValues 一致），
        // 像素单位保留旧量程，避免「写进去立刻被判非法」
        float scMin = canvasUnits ? 0.05f : 0.5f;
        float scMax = canvasUnits ? 3f : 1.8f;
        float ofMin = canvasUnits ? -2f : -80f;
        float ofMax = canvasUnits ? 2f : 80f;
        Widgets.Label(new Rect(0f, y, 52f, 20f), Translator.Translate("NHTCD_WinScale").ToString());
        Rect srect = new Rect(54f, y + 2f, sw, 18f);
        if (canvasUnits)
        {
            // 画布用对数刻度：0.36 大约在滑块 40% 的位置（线性刻度会紧贴最左边）
            float lr = Mathf.Log(scMax / scMin);
            float t = lr > 0.0001f ? Mathf.Log(Mathf.Clamp(scale, scMin, scMax) / scMin) / lr : 0f;
            float t2 = Widgets.HorizontalSlider(srect, t, 0f, 1f);
            if (Mathf.Abs(t2 - t) > 0.0001f) scale = scMin * Mathf.Pow(scMax / scMin, t2);
            scale = Mathf.Round(scale * 100f) / 100f;
        }
        else
        {
            scale = Widgets.HorizontalSlider(srect, scale, scMin, scMax);
            scale = Mathf.Round(scale * 100f) / 100f;
        }
        scale = NudgeBtn(new Rect(srect.xMax + 2f, y + 2f, 16f, 18f), "-", scale, -stepS, scMin, scMax);
        scale = NudgeBtn(new Rect(srect.xMax + 20f, y + 2f, 16f, 18f), "+", scale, stepS, scMin, scMax);
        NhtUi.Value(new Rect(inRect.width - 50f, y, 50f, 20f), scale.ToString("F2"));
        y += 26f;

        Widgets.Label(new Rect(0f, y, 52f, 20f), Translator.Translate("NHTCD_WinX").ToString());
        srect = new Rect(54f, y + 2f, sw, 18f);
        ox = Widgets.HorizontalSlider(srect, ox, ofMin, ofMax);
        ox = Mathf.Round(ox * 100f) / 100f;
        ox = NudgeBtn(new Rect(srect.xMax + 2f, y + 2f, 16f, 18f), "-", ox, -stepO, ofMin, ofMax);
        ox = NudgeBtn(new Rect(srect.xMax + 20f, y + 2f, 16f, 18f), "+", ox, stepO, ofMin, ofMax);
        NhtUi.Value(new Rect(inRect.width - 50f, y, 50f, 20f), canvasUnits ? ox.ToString("F2") : (ox.ToString("F0") + "px"));
        y += 26f;

        Widgets.Label(new Rect(0f, y, 52f, 20f), Translator.Translate("NHTCD_WinY").ToString());
        srect = new Rect(54f, y + 2f, sw, 18f);
        oy = Widgets.HorizontalSlider(srect, oy, ofMin, ofMax);
        oy = Mathf.Round(oy * 100f) / 100f;
        oy = NudgeBtn(new Rect(srect.xMax + 2f, y + 2f, 16f, 18f), "-", oy, -stepO, ofMin, ofMax);
        oy = NudgeBtn(new Rect(srect.xMax + 20f, y + 2f, 16f, 18f), "+", oy, stepO, ofMin, ofMax);
        NhtUi.Value(new Rect(inRect.width - 50f, y, 50f, 20f), canvasUnits ? oy.ToString("F2") : (oy.ToString("F0") + "px"));
        y += 26f;

        Flush();

        bool wantWarn = true;
        if (warn != null && warn.harMode != canvasUnits) { warn.Close(); warn = null; }
        if (wantWarn && warn == null)
        {
            warn = new HairWarnWindow();
            warn.harMode = canvasUnits;   // t23-C4：警告条按「画布单位」而不是「是否 HAR」切换高度/文案
            Find.WindowStack.Add(warn);
        }
        else if (!wantWarn && warn != null)
        {
            warn.Close();
            warn = null;
        }
        if (warn != null)
        {
            warn.windowRect = new Rect(windowRect.x, windowRect.yMax - 1f, windowRect.width, warn.WinHeight);
        }
    }
}

public class HairWarnWindow : Window
{
    public bool harMode;
    public float WinHeight { get { return harMode ? 92f : 140f; } }

    public override Vector2 InitialSize { get { return new Vector2(236f, WinHeight); } }

    protected override float Margin { get { return 0f; } }

    public HairWarnWindow()
    {
        forcePause = false;
        absorbInputAroundWindow = false;
        closeOnCancel = false;
        doCloseX = false;
        draggable = false;
        drawShadow = false;
    }

    public override void DoWindowContents(Rect inRect)
    {
        // 失去主窗口就自己关掉，避免“主窗口关了警告还在且关不掉”
        bool ownerAlive = false;
        foreach (Window w in Find.WindowStack.Windows) if (w is HairAdjustWindow) { ownerAlive = true; break; }
        if (!ownerAlive) { Close(); return; }

        Text.Font = GameFont.Tiny;
        GUI.color = new Color(1f, 0.85f, 0.55f);
        string syncLine = Translator.Translate("NHTCD_WarnSync1").ToString() + "\n" + Translator.Translate("NHTCD_WarnSync2").ToString();
        string moreLine = Translator.Translate("NHTCD_WarnMore").ToString();
        string txt = harMode
            ? syncLine + "\n" + moreLine
            : Translator.Translate("NHTCD_WarnCurrent").ToString() + "\n"
                + Translator.Translate("NHTCD_WarnNonHar").ToString() + "\n"
                + syncLine + "\n" + moreLine;
        Widgets.Label(new Rect(4f, 4f, inRect.width - 8f, inRect.height - 8f), txt);
        GUI.color = Color.white;
        Text.Font = GameFont.Small;
    }
}

class HairFitDef : Def
{
public string race = "*";
public float scale = 0.78f;
public float offsetX = 0f;
public float offsetY = -0.21f;
public bool front = true;
public float layer = 29f;
public bool showInXray = false;
public List<string> aboveParts = new List<string>();
    public List<TopPartRef> topParts = new List<TopPartRef>();
    /// <summary>非 HAR 发型在 NHT 原版几何上的微调（1 / 0 / 0 = 不改变）</summary>
    public float vanillaScale = 1f;
    public float vanillaOffsetX = 0f;
    public float vanillaOffsetY = 0f;
}

/// <summary>编辑器的「默认开色彩、发型不乘发色」开关：开启后该种族像 Monolyn / Epona Unicorn
/// 一样默认显示彩色（启动时从 colorOffRaces 移出一次），但发型贴图保留原色、不乘发色。</summary>
class HairColorModeDef : Def
{
    public string race = "";
    public bool defaultColorOn = true;
    public bool tintOff = true;
}

    /* ---------- hitbox offset ---------- */
    // Editor writes <x>/<y> as a fraction of the part's visual width/height.
    public class HitboxOffsetExtension : DefModExtension
    {
        public float x = 0f;
        public float y = 0f;
    }

    /*
     * t114：编辑器直出判定框（画布单位）。
     * 宿主 GetRect 的 width/height 是「位图尺寸的倍数」，x = |width| × 贴图像素宽、
     * y = |height| × 贴图像素高；编辑器里的 hbox 是 512 画布单位，两者基准不同，
     * 用 hitboxScale 乘来乘去会随 UI 缩放/贴图尺寸漂移。这里直接按画布单位写死
     * 宽度/高度和相对部位框中心的偏移，运行时只按 k = 屏上框宽 / 画布框宽 换算。
     */
    public class HitboxRectExtension : DefModExtension
    {
        public float w = 0f;
        public float h = 0f;
        public float dx = 0f;
        public float dy = 0f;
    }

    internal static class HitboxOffsetContext
    {
        private static readonly List<DollBodyPartDef> stack = new List<DollBodyPartDef>();

        public static DollBodyPartDef CurrentDef
        {
            get
            {
                if (CustomDollsMod.Settings != null && !CustomDollsMod.Settings.enableHitboxOffset) return null;
                if (stack.Count == 0) return null;
                return stack[stack.Count - 1];
            }
        }

        public static void Push(DollBodyPartDef p) { stack.Add(p); }
        public static void Pop() { if (stack.Count > 0) stack.RemoveAt(stack.Count - 1); }

        public static Vector2? Current
        {
            get
            {
                if (CustomDollsMod.Settings != null && !CustomDollsMod.Settings.enableHitboxOffset) return null;
                if (stack.Count == 0) return null;
                DollBodyPartDef p = stack[stack.Count - 1];
                if (p == null) return null;
                HitboxOffsetExtension e = p.GetModExtension<HitboxOffsetExtension>();
                if (e == null || (e.x == 0f && e.y == 0f)) return null;
                return new Vector2(e.x, e.y);
            }
        }
    }

    internal static class HitboxOffsetPatch
    {
        public static void Install(Harmony harmony)
        {
            Assembly asm = typeof(HumanlikeDoll).Assembly;
            MethodInfo prefix = typeof(HitboxOffsetPatch).GetMethod("Prefix", BindingFlags.Static | BindingFlags.NonPublic);
            MethodInfo postfix = typeof(HitboxOffsetPatch).GetMethod("Postfix", BindingFlags.Static | BindingFlags.NonPublic);
            string[] types = { "NiceHealthTab.DollDrawer", "NiceHealthTab.DollPartRenderer" };
            for (int i = 0; i < types.Length; i++)
            {
                Type t = asm.GetType(types[i]);
                if (t == null) continue;
                MethodInfo m = AccessTools.Method(t, "DrawPart");
                if (m == null) continue;
                harmony.Patch(m, new HarmonyMethod(prefix), new HarmonyMethod(postfix));
            }
            MethodInfo contracted = AccessTools.Method(typeof(GenUI), "ContractedBy", new Type[] { typeof(Rect), typeof(float), typeof(float) });
            if (contracted != null)
            {
                MethodInfo cp = typeof(HitboxOffsetPatch).GetMethod("ContractedPostfix", BindingFlags.Static | BindingFlags.NonPublic);
                harmony.Patch(contracted, null, new HarmonyMethod(cp));
            }
        }

        private static void Prefix(DollBodyPartDef __1) { HitboxOffsetContext.Push(__1); }
        private static void Postfix() { HitboxOffsetContext.Pop(); }

        private static FieldInfo defTexField, defWidthField, defHeightField;

        private static void EnsureDefFields()
        {
            if (defTexField != null) return;
            defTexField = typeof(DollBodyPartDef).GetField("tex", BindingFlags.Instance | BindingFlags.Public);
            defWidthField = typeof(DollBodyPartDef).GetField("width", BindingFlags.Instance | BindingFlags.Public);
            defHeightField = typeof(DollBodyPartDef).GetField("height", BindingFlags.Instance | BindingFlags.Public);
        }

        private static void ContractedPostfix(Rect rect, ref Rect __result)
        {
            DollBodyPartDef def = HitboxOffsetContext.CurrentDef;
            if (def == null) return;
            EnsureDefFields();
            HitboxRectExtension rectExt = def.GetModExtension<HitboxRectExtension>();
            if (rectExt != null && rectExt.w > 0f && rectExt.h > 0f && defTexField != null)
            {
                // t114：编辑器直出「画布单位」的判定框，只按屏上框宽/画布框宽的比值 k 换算。
                Texture2D tex = defTexField.GetValue(def) as Texture2D;
                float dw = defWidthField != null ? Mathf.Abs((float)defWidthField.GetValue(def)) : 1f;
                float dh = defHeightField != null ? Mathf.Abs((float)defHeightField.GetValue(def)) : 1f;
                float boxW = tex != null ? dw * tex.width : 0f;
                float boxH = tex != null ? dh * tex.height : 0f;
                float kx = boxW > 0f ? rect.width / boxW : 1f;
                float ky = boxH > 0f ? rect.height / boxH : 1f;
                float w = rectExt.w * kx, h = rectExt.h * ky;
                Vector2 c = rect.center;
                __result = new Rect(c.x + rectExt.dx * kx - w * 0.5f, c.y + rectExt.dy * ky - h * 0.5f, w, h);
                return;
            }
            Vector2? off = HitboxOffsetContext.Current;
            if (!off.HasValue) return;
            // 旧路径：偏移是「相对命中框宽/高的比例」（dx / hbox.w），__result 才是收缩后的命中框。
            float bw = __result.width != 0f ? __result.width : rect.width;
            float bh = __result.height != 0f ? __result.height : rect.height;
            __result.x += bw * off.Value.x;
            __result.y += bh * off.Value.y;
        }
    }

    /*
     * t40：护甲图标位置补丁。
     * t35 的 IL 实证（_analysis/coord-hitbox-armor-trace.md §2.3）：NHT 本版对 DollBodyPartDef.notifyPosition
     * 只有写、没有读 —— 护甲图标恒定画在「部位绘制矩形中心」，编辑器里拖出来的 nx/ny 完全被丢弃。
     * 这里在 DrawPart 返回后，把「本次调用刚入队的那条」ArmorCoverToDraw 记录的锚点按 notifyPosition 平移：
     *   offsetPx = notifyPosition * (rectDoll.width / doll.BoundingBox.width)
     * 其中 k 就是 Doll.Fit 的缩放比（BoundingBox → 屏幕），不能用本模组的 dollRect/512。
     * 失败/字段缺失一律静默回退（图标留在原位），绝不抛异常影响宿主绘制。
     */
    internal static class ArmorIconOffsetPatch
    {
        private static bool enabled;
        private static MethodInfo getSourcePixelSize;

        public static void Install(Harmony harmony)
        {
            Assembly asm = typeof(HumanlikeDoll).Assembly;
            Type tr = asm.GetType("NiceHealthTab.DollPartRenderer");
            Type td = asm.GetType("NiceHealthTab.DollDrawer");
            MethodInfo mr = tr == null ? null : AccessTools.Method(tr, "DrawPart");
            MethodInfo md = td == null ? null : AccessTools.Method(td, "DrawPart");

            // R6：若 NHT 将来自己在 DrawPart 里读 notifyPosition，再加偏移就会双重平移 —— 检测到就整体跳过。
            if (HostReadsNotify(mr) || HostReadsNotify(md))
            {
                Log.Message("[NHT armor] host already reads notifyPosition, icon offset patch skipped");
                return;
            }

            getSourcePixelSize = AccessTools.Method(typeof(DollBodyPartDef), "GetSourcePixelSize");
            enabled = true;
            if (mr != null)
            {
                harmony.Patch(mr,
                    new HarmonyMethod(typeof(ArmorIconOffsetPatch).GetMethod("PrefixRenderer", BindingFlags.Static | BindingFlags.NonPublic)),
                    new HarmonyMethod(typeof(ArmorIconOffsetPatch).GetMethod("PostfixRenderer", BindingFlags.Static | BindingFlags.NonPublic)));
            }
            if (md != null)
            {
                harmony.Patch(md,
                    new HarmonyMethod(typeof(ArmorIconOffsetPatch).GetMethod("PrefixDrawer", BindingFlags.Static | BindingFlags.NonPublic)),
                    new HarmonyMethod(typeof(ArmorIconOffsetPatch).GetMethod("PostfixDrawer", BindingFlags.Static | BindingFlags.NonPublic)));
            }
            if (mr == null && md == null) enabled = false;
            Log.Message("[NHT armor] icon offset patch " + (enabled ? "installed" : "skipped (no DrawPart)")
                + " renderer=" + (mr != null) + " drawer=" + (md != null));
        }

        // 两处 DrawPart 都是 static，签名不同 ⇒ 用位置注入（__0/__1/...）而不是形参名。
        // __state 携带「本次调用进来前的队列长度」，避免嵌套调用时互相覆盖（静态字段做不到）。
        private static void PrefixRenderer(DollRenderContext __0, out int __state)
        {
            __state = (__0 != null && __0.ArmorCoverToDraw != null) ? __0.ArmorCoverToDraw.Count : -1;
        }

        private static void PostfixRenderer(DollRenderContext __0, DollBodyPartDef __1, Doll __2, Rect __3, int __state)
        {
            if (__0 != null) Shift(__0.ArmorCoverToDraw, __state, __1, __2, __3);
        }

        private static void PrefixDrawer(out int __state)
        {
            __state = DollDrawer.ArmorCoverToDraw == null ? -1 : DollDrawer.ArmorCoverToDraw.Count;
        }

        private static void PostfixDrawer(DollBodyPartDef __1, Doll __3, Rect __4, int __state)
        {
            Shift(DollDrawer.ArmorCoverToDraw, __state, __1, __3, __4);
        }

        private static void Shift(List<ValueTuple<Vector2, int, float, BodyPartRecord>> list,
            int before, DollBodyPartDef part, Doll doll, Rect rectDoll)
        {
            try
            {
                if (!enabled || list == null || part == null || doll == null) return;
                if (CustomDollsMod.Settings != null && !CustomDollsMod.Settings.armorIconOffset) return;
                if (before < 0 || list.Count != before + 1) return;

                Vector2 n = part.notifyPosition;
                if (float.IsNaN(n.x) || float.IsNaN(n.y)) return;
                if (n.x == 0f && n.y == 0f) return;
                if (IsResolveDefault(part, n)) return;   // R1：PrepareBodyPart 用默认值填过 NaN，不能当作者偏移
                // t52c：灰色副本（_NHTCD_Gray）与彩件共用同一个 ArmorCover 槽位，宿主对彩件的 Postfix 已经
                // 写过最终位置；灰件再写一次会把它覆盖成自己的 expect（实测 gray 的 def 快照是 (0,0)）。
                // 所以「本帧彩件已处理」时直接跳过灰件。
                string graySuffixName = "_NHTCD_Gray";
                if (part.defName != null && part.defName.EndsWith(graySuffixName, StringComparison.OrdinalIgnoreCase))
                {
                    string baseDefName = part.defName.Substring(0, part.defName.Length - graySuffixName.Length);
                    if (Dolls.ArmorDrawn.ContainsKey(baseDefName)) return;
                }

                Rect bb = doll.BoundingBox;
                if (bb.width <= 0.01f || bb.height <= 0.01f) return;
                float kx = rectDoll.width / bb.width;
                float ky = rectDoll.height / bb.height;
                if (float.IsNaN(kx) || float.IsInfinity(kx) || kx <= 0f) return;
                if (float.IsNaN(ky) || float.IsInfinity(ky) || ky <= 0f) return;

                int i = list.Count - 1;
                ValueTuple<Vector2, int, float, BodyPartRecord> item = list[i];
                Vector2 anchor0 = item.Item1;
                // t51：宿主锚点 = rectDoll.center + (position - BoundingBox.center) * k，与贴图尺寸无关。
                // 这里直接写绝对位置（而不是累加），天然幂等 —— 同一枚图标即使被重复调用也不会叠加两次。
                Vector2 expect = new Vector2(
                    rectDoll.center.x + (part.position.x - bb.center.x) * kx,
                    rectDoll.center.y + (part.position.y - bb.center.y) * ky);
                Vector2 off = new Vector2(n.x * kx, n.y * ky);
                // t52b：锚点必须用「宿主真正画这个部位时」的 position —— PartPostfix 里读 def 可能已被
                // RestoreColorVariant 还原（实测镜像态 host anchor=372.1 而 def.position 已回到 -65 ⇒ 317.0）。
                Vector3 snap = new Vector3(part.position.x, part.position.y, part.width);
                float drawW = part.width;
                float drawH = part.height;
                if (part.defName != null && Dolls.ArmorDrawn.TryGetValue(part.defName, out snap))
                {
                    expect = new Vector2(
                        rectDoll.center.x + (snap.x - bb.center.x) * kx,
                        rectDoll.center.y + (snap.y - bb.center.y) * ky);
                    drawW = snap.z;
                }
                // t49：宿主用「负 width/height」表示镜像，DollRenderer.ScaleRect 只把 xMin/xMax 对调、
                // 矩形中心不变 ⇒ 锚点不跟着翻，作者写的 nx/ny 必须在这里取反，否则镜像后图标留在另一侧。
                // t52：快照里的 width 符号就是宿主绘制时的符号；仍保留 bodyPartId 记录作兜底。
                int ownId = PartBodyPartId(part);
                bool mirrorX = drawW < 0f
                    || (Dolls.ArmorMirrorBodyPart >= 0 && ownId == Dolls.ArmorMirrorBodyPart);
                if (mirrorX) off.x = -off.x;
                if (drawH < 0f) off.y = -off.y;
                item.Item1 = expect + off;
                list[i] = item;

                if (Dolls.DebugOn)
                {
                    Dolls.LogDebug("armor:" + part.defName + ":" + n.x.ToString("F1") + ":" + n.y.ToString("F1"), "[NHT armor] icon offset part=" + part.defName + " notify=(" + n.x.ToString("F2") + "," + n.y.ToString("F2")
                        + ") k=" + kx.ToString("F3") + " px=(" + off.x.ToString("F1") + "," + off.y.ToString("F1") + ")"
                        + " expect=(" + expect.x.ToString("F1") + "," + expect.y.ToString("F1") + ")"
                        + " base=(" + anchor0.x.ToString("F1") + "," + anchor0.y.ToString("F1") + ")"
                        + " final=(" + item.Item1.x.ToString("F1") + "," + item.Item1.y.ToString("F1") + ")"
                        + " pos=(" + part.position.x.ToString("F1") + "," + part.position.y.ToString("F1") + ")"
                        + " draw=(" + (snap.x).ToString("F1") + "," + (snap.y).ToString("F1") + "," + drawW.ToString("F2") + ")"
                        + " mirrorX=" + (mirrorX ? "1" : "0")
                        + " wh=(" + part.width.ToString("F2") + "," + part.height.ToString("F2") + ")"
                        + " dollRect=(" + rectDoll.x.ToString("F1") + "," + rectDoll.y.ToString("F1") + "," + rectDoll.width.ToString("F1") + "," + rectDoll.height.ToString("F1") + ")"
                        + " bb=" + bb.width.ToString("F1") + " count=" + list.Count);
                }
            }
            catch (Exception) { }
        }

        private static FieldInfo bodyPartIdField;

        private static int PartBodyPartId(DollBodyPartDef p)
        {
            try
            {
                if (bodyPartIdField == null)
                    bodyPartIdField = typeof(DollBodyPartDef).GetField("bodyPartId", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                return bodyPartIdField == null || p == null ? -1 : Convert.ToInt32(bodyPartIdField.GetValue(p));
            }
            catch (Exception) { return -1; }
        }

        // 判据：notifyPosition 恰好等于 ResolveNotifyPosition 的默认填充值 (±sz.x*0.7*|width|, 0) ⇒ 视为「作者没写」。
        // 不排除的话，所有没写 notifyPosition 的老部位都会整体被推偏（本补丁最大事故点）。
        private static bool IsResolveDefault(DollBodyPartDef p, Vector2 n)
        {
            try
            {
                if (getSourcePixelSize == null) return false;
                Vector2 sz = (Vector2)getSourcePixelSize.Invoke(p, null);
                if (sz.x <= 0f) return false;
                float dx = (p.width > 0f ? sz.x : -sz.x) * 0.7f * Mathf.Abs(p.width);
                return Mathf.Abs(n.x - dx) < 0.05f && Mathf.Abs(n.y) < 0.05f;
            }
            catch (Exception) { return false; }
        }

        // R6 版本探测：在方法 IL 里找 ldfld/ldflda DollBodyPartDef::notifyPosition。
        private static bool HostReadsNotify(MethodInfo m)
        {
            if (m == null) return false;
            try
            {
                MethodBody body = m.GetMethodBody();
                if (body == null) return false;
                byte[] il = body.GetILAsByteArray();
                if (il == null) return false;
                Module mod = m.Module;
                for (int i = 0; i + 4 < il.Length; i++)
                {
                    if (il[i] != 0x7B && il[i] != 0x7C) continue;   // ldfld / ldflda
                    try
                    {
                        FieldInfo f = mod.ResolveField(BitConverter.ToInt32(il, i + 1));
                        if (f != null && f.Name == "notifyPosition") return true;
                    }
                    catch (Exception) { }
                }
            }
            catch (Exception) { }
            return false;
        }
    }

    [StaticConstructorOnStartup]
    internal static class HitboxOffsetBootstrap
    {
        static HitboxOffsetBootstrap()
        {
            try
            {
                Harmony harmony = new Harmony("NHT_CustomDolls.HitboxOffset");
                HitboxOffsetPatch.Install(harmony);
                ArmorIconOffsetPatch.Install(harmony);
                Log.Message("[NHTCD hitbox] offset patch installed");
            }
            catch (Exception e)
            {
                Log.Warning("[NHTCD hitbox] install failed: " + e);
            }
        }
    }


    /// <summary>t70：把某个种族的娃娃映射到另一个种族（同一模组内共享画布/贴图）。</summary>

    /* t127：按「种族 + 娃娃（HandDoll/FeetDoll）+ 部位 defName」覆盖手/脚窗口的部位。
       手/脚两个娃娃的 Def 是全局共享对象，所以运行时只在绘制当下套用、Postfix 立刻还原。 */
    public class NhtHandPartOverride : Def
    {
        public string race;
        public string doll;
        public string part;
        public string imagePath;
        /* 只覆盖导出器写明了的字段：NaN = 保持 Def 原值（t127） */
        public float x = float.NaN;
        public float y = float.NaN;
        public float width = float.NaN;
        public float height = float.NaN;
    }

    public class RaceAliasDef : Def
    {
        public string from;
        public string to;
    }

    /// <summary>
    /// t95：种族标记。补丁文件里「守卫之外」永远注入的一条小 def，
    /// 记录本模组为哪些种族准备过补丁 —— 这样即使种族模组没装、守卫把整档跳过，
    /// 设置页仍然能列出该种族并显示「未激活」。
    /// </summary>
    public class RaceMarkerDef : Def
    {
        public string race;
    }
}
