using System;
using System.Text;
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

    // 编辑器生成的按 Hediff 切换贴图：颜色变体
    public class ColorVariantDef : Def
    {
        public string race = "*";
        public string bodyType = "*";
        public string hediff = "";
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

    // ------------------------------------------------------------------ settings
    public class CustomDollsSettings : ModSettings
    {
        // key = "race|gender|bodytype" (any part may be "*"), value = HumanlikeDoll defName
        public Dictionary<string, string> rules = new Dictionary<string, string>();
        // 骨骼 / 器官视图里是否显示 HAR 头发（默认关闭）
        public bool showHairInXray = false;
        // 调试模式：输出启动信息、诊断日志、缺图警告等（默认关闭）
        public bool debug = false;
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
        // 按种族强制关闭「色彩显示」（默认 Monolyn 关）
        public List<string> colorOffRaces = new List<string>();
        public bool colorDefaultsSeeded;
        // 关掉坐标的种族：key = race defName
        public List<string> vanillaHairOff = new List<string>();
        // 游戏内实时调整过的值： "race|scale|offX|offY"（覆盖编辑器导出的值）
        public List<string> hairOverrides = new List<string>();
        // 单独关掉颜色的部位：key = "doll#bodyPartId"
        public List<string> desatOff = new List<string>();
        // 形态别名后缀：例如 _YR_Bote → 复用去后缀的形态（Mincho RJW 附加形态共用主形态画布）
        public List<string> bodyAliasSuffixes = new List<string> { "_YR_Bote" };

        public override void ExposeData()
        {
            Scribe_Collections.Look(ref rules, "rules", LookMode.Value, LookMode.Value);
            Scribe_Values.Look(ref showHairInXray, "showHairInXray", false);
            Scribe_Values.Look(ref debug, "debug", false);
            Scribe_Values.Look(ref drawAllHairLayers, "drawAllHairLayers", false);
            Scribe_Values.Look(ref desatColorsOn, "desatColorsOn", true);
            Scribe_Values.Look(ref tintVanillaHair, "tintVanillaHair", true);
            Scribe_Values.Look(ref vanillaHairUseEditor, "vanillaHairUseEditor", false);
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
            Scribe_Values.Look(ref colorDefaultsSeeded, "colorDefaultsSeeded", false);
            if (Scribe.mode == LoadSaveMode.PostLoadInit)
            {
                if (colorOffRaces == null) colorOffRaces = new List<string>();
                if (!colorDefaultsSeeded)
                {
                    if (!colorOffRaces.Contains("MNRace")) colorOffRaces.Add("MNRace");
                    colorDefaultsSeeded = true;
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
        }
    }

    public class CustomDollsMod : Verse.Mod
    {
        public static CustomDollsSettings Settings;

        public CustomDollsMod(ModContentPack content) : base(content)
        {
            Settings = GetSettings<CustomDollsSettings>();
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
            if (!string.IsNullOrEmpty(race) && byRace != null && byRace.TryGetValue(race, out e) && Hit(e, part, id)) return true;
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

        /// <summary>调试模式：只影响日志，不影响任何绘制行为</summary>
        public static bool DebugOn
        {
            get { return CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug; }
        }

        public static void Invalidate()
        {
            all = null;
            byRace = null;
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

        public static List<HumanlikeDoll> ForRace(string race)
        {
            Ensure();
            List<HumanlikeDoll> list;
            if (race != null && byRace.TryGetValue(race, out list)) return list;
            return null;
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
        public static HumanlikeDoll Pick(Pawn pawn)
        {
            if (pawn == null || pawn.def == null) return null;
            string race = pawn.def.defName;
            List<HumanlikeDoll> list = ForRace(race);
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

        static Bootstrap()
        {
            try
            {
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
                                if (partHooks <= 5)
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
                }
                else
                {
                    Log.Warning("[NHT Custom Dolls] hair hook target missing: widget=" + (widgetType != null)
                        + " method=" + (drawMain != null) + " class=" + (hairFix != null));
                }

                Dictionary<string, List<HumanlikeDoll>> map = Dolls.ByRace();
                if (Dolls.DebugOn) Log.Message("[NHT Custom Dolls] hooks: " + patched + ", races with dolls: " + (map == null ? 0 : map.Count));
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

        // legacy view: the doll registry key is the race defName
        private static bool GetXenotypePrefix(Pawn pawn, ref string __result)
        {
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


        private static bool HasRemapEntries(BodyPartIndexesRemap remap)
        {
            try
            {
                System.Reflection.FieldInfo f = typeof(BodyPartIndexesRemap).GetField("PartsRemap",
                    System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                if (f == null) return false;
                System.Collections.IDictionary d = f.GetValue(remap) as System.Collections.IDictionary;
                return d != null && d.Count > 0;
            }
            catch (Exception) { return false; }
        }

        private static bool HasParts(BodyPartIndexesRemap remap)
        {
            try { return remap != null && remap.parts != null && remap.parts.Count > 0; }
            catch (Exception) { return false; }
        }

        private static string LabelOf(BodyPartRecord rec)
        {
            try
            {
                if (rec == null || rec.def == null) return "";
                string l = rec.customLabel;
                if (!string.IsNullOrEmpty(l)) return l.Trim().ToLowerInvariant();
                return (rec.def.label ?? "").Trim().ToLowerInvariant();
            }
            catch (Exception) { return ""; }
        }

        private static bool HasPair(List<string> pairs, int humanIndex)
        {
            for (int i = 0; i < pairs.Count; i++)
            {
                int comma = pairs[i].IndexOf(',');
                if (comma <= 0) continue;
                int v;
                if (int.TryParse(pairs[i].Substring(0, comma).Trim(), out v) && v == humanIndex) return true;
            }
            return false;
        }

        // races with their own BodyDef: map human body part names onto the race's parts
        private static readonly List<string> bodyOrderLogged = new List<string>();

        private static void SolvePostfix(Pawn pawn, ref BodyPartIndexesRemap __result)
        {
            try
            {
                if (pawn == null || pawn.def == null || pawn.def.race == null) return;
                if (Dolls.ForRace(pawn.def.defName) == null) return;

                BodyDef body = pawn.def.race.body;
                if (body == null || body.defName == "Human") return;

                // NHT keeps the real mapping in its settings dictionary; the renderer however
                // works off the pair list, which the settings UI leaves empty. Publish the pairs
                // from NHT's own numbers (never rebuild them by hand) and only fill the spare
                // slots when the dictionary has none.
                Dictionary<int, int> existing = RemapDict(__result);
                if (existing == null)
                {
                    // NHT 没给这张身体建对照表（Ratkin / Wolfein 这种）：现场构建并写回
                    existing = BuildRemap(body);
                    if (existing.Count == 0) return;
                    try
                    {
                        System.Reflection.FieldInfo rf = typeof(BodyPartIndexesRemap).GetField("PartsRemap",
                            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                        if (rf != null) rf.SetValue(__result, existing);
                    }
                    catch (Exception) { }
                }

                // 一次性诊断：游戏里 AllParts 的真实下标顺序（编辑器对照表就用它校准）
                if (!bodyOrderLogged.Contains(body.defName))
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

        /* 没有现成对照表时，按 def 名把身体部位对到 NHT 槽位；多余部位排到 64+ */
        private static Dictionary<int, int> BuildRemap(BodyDef body)
        {
            Dictionary<int, int> map = new Dictionary<int, int>();
            if (body == null) return map;
            List<BodyPartRecord> all = body.AllParts;
            bool[] used = new bool[all.Count];
            int slot = 0;
            for (int k = 0; k < NHT_SLOT_DEFS.Length; k++)
            {
                string want = NHT_SLOT_DEFS[k];
                for (int p = 0; p < all.Count; p++)
                {
                    if (used[p] || all[p].def == null) continue;
                    if (!string.Equals(all[p].def.defName, want, StringComparison.OrdinalIgnoreCase)) continue;
                    used[p] = true;
                    map[slot] = p;
                    break;
                }
                slot++;
            }
            for (int p = 0; p < all.Count; p++)
            {
                if (used[p]) continue;
                map[slot] = p;
                slot++;
            }
            return map;
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
                public readonly Dictionary<int, AddonMeta> meta = new Dictionary<int, AddonMeta>();
                public readonly List<string> extraPath = new List<string>();
                public readonly List<int> backExtra = new List<int>();
                public readonly List<string> backExtraPath = new List<string>();
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

            private static MethodBase TargetMethod()
            {
                Type w = typeof(HumanlikeDoll).Assembly.GetType("NiceHealthTab.DollWidget");
                return w == null ? null : AccessTools.Method(w, "DrawMainDoll");
            }


            private static Dictionary<string, HairFitDef> hairFits;
            private static HairFitDef hairFit;
            private static bool hairOverrideValid;
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
            }

            public static void ResetFitCache()
            {
                hairFit = null;
                hairOverrideValid = false;
            }

            private static void UseFit(string race)
            {
                if (hairFits == null) LoadHairFits();
                hairFit = null;
                if (!hairFits.TryGetValue(race ?? "*", out hairFit)) hairFits.TryGetValue("*", out hairFit);
                // 游戏内实时调整值覆盖 Def 里的参数（HAR 画布也生效）
                float os = 1f, oxx = 0f, oyy = 0f;
                hairOverrideValid = false;
                if (race != null)
                {
                    CustomDollsSettings st = CustomDollsMod.Settings;
                    bool isHarRace = false;
                    try
                    {
                        ThingDef rd = DefDatabase<ThingDef>.GetNamedSilentFail(race);
                        isHarRace = rd != null && RaceHasHairAddon(rd);
                    }
                    catch (Exception) { }
                    bool globalAllowed = isHarRace
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
                        hairOverrideValid = byPawn;
                        if (!hairOverrideValid) hairOverrideValid = HairTuning.TryGet(race, out os, out oxx, out oyy);
                        // 没开同步、又还没有自己的值时：把当前看到的值固定成本人值，
                        // 否则它会一直跟着种族值走（表现为“关了同步还是同步”）
                        if (!synced && !byPawn && pid >= 0)
                        {
                            float fs, fx0, fy0;
                            if (isHarRace) { fs = HairScale(0.78f); fx0 = HairOffX(0f); fy0 = HairOffY(-0.21f); }
                            else if (hairFit != null) { fs = hairFit.vanillaScale; fx0 = hairFit.vanillaOffsetX; fy0 = hairFit.vanillaOffsetY; }
                            else { fs = 1f; fx0 = 0f; fy0 = 0f; }
                            HairTuning.Set("p" + pid, fs, fx0, fy0);
                        }
                    }
                }
                hairOverrideScale = os; hairOverrideOX = oxx; hairOverrideOY = oyy;
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
                                return f * dollRect.height;
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
                    float thr = (manual ? 0.25f : 0.10f) * dollRect.height;
                    if (Math.Abs(dev) < thr) return 0f;
                    float shift = -(dev - Math.Sign(dev) * 0.05f * dollRect.height) * 0.5f;
                    bool vanillaRace = pawn != null && pawn.def != null && !RaceHasHairAddon(pawn.def);
                    if (vanillaRace) scaleMul = 1.05f;
                    if (Dolls.DebugOn && autoFixLogged.Count < 20)
                    {
                        autoFixLogged.Add(race);
                        Log.Message("[NHT hair auto] race=" + race + " tex=" + tex.width + "x" + tex.height
                            + " bboxTop=" + top + " dev=" + dev.ToString("F0") + " thr=" + thr.ToString("F0")
                            + " manual=" + manual + " shift=" + shift.ToString("F0"));
                    }
                    float frac = shift / dollRect.height;
                    st.hairAutoFix.Add(akey + "|" + frac.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)
                        + "|" + scaleMul.ToString("F4", System.Globalization.CultureInfo.InvariantCulture));
                    st.Write();
                    if (Dolls.DebugOn && !autoFixLogged.Contains(race))
                    {
                        autoFixLogged.Add(race);
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

            private static void InitAddons(ThingDef raceDef)
            {
                string key = raceDef == null ? "?" : raceDef.defName;
                AddonSet cached;
                if (addonSets.TryGetValue(key, out cached)) { cur = cached; WriteHairMap(raceDef, cached); return; }
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
                        AddonMeta meta = ReadAddonMeta(ad);
                        bool isAhoge = pt.IndexOf("Ahoge", StringComparison.OrdinalIgnoreCase) >= 0;
                        if (pt.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) < 0 && !isAhoge) continue;
                        if (isAhoge)
                        {
                            // 呆毛/额发：单独一层，画在头发之上
                            cur.over.Add(i); cur.overPath.Add(pt); cur.meta[i] = meta;
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
                                 || PathHasHairB(pt);
                        bool isBg = keyBack;
                        if (!isBg && nm.IndexOf("hair", StringComparison.OrdinalIgnoreCase) < 0
                            && pt.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) < 0) continue;
                        if (isBg)
                        {
                            // 后层一律在最底层画：第一个记成 bg；其它后层默认不画（可能又是另一套发型）
                            bool allLayersBg = (CustomDollsMod.Settings != null && CustomDollsMod.Settings.drawAllHairLayers);
                            if (cur.bg < 0) { cur.bg = i; cur.bgPath = pt; }
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
                    if (Dolls.DebugOn) Log.Message(dump.ToString());
                    if (Dolls.DebugOn) Log.Message("[NHT Custom Dolls] hair addons(" + key + "): main=" + cur.main + " bg=" + cur.bg
                        + " extra=" + cur.extra.Count + " over=" + cur.over.Count + " backExtra=" + cur.backExtra.Count
                        + " paths=" + cur.mainPath + " / " + cur.bgPath
                        + " 主发=" + (cur.mainPath ?? "-")
                        + " 附加=" + string.Join(", ", cur.extraPath.ToArray())
                        + (cur.skipped.Count > 0 ? " 跳过=" + string.Join(", ", cur.skipped.ToArray()) : ""));
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

                    float k = dollRect.width / 512f;
                    UseFit(pawn.def.defName);
                    float sc = (HairScale(0.78f));
                    // 原版发型贴图是"头部大小"（约 128~256px），按头部区域换算
                    float size = tex.width * 2f * sc * k;   // 128 贴图 ≈ 256 娃娃单位
                    float cx = dollRect.x + dollRect.width / 2f + (HairOffX(0)) * 1024f * k;
                    float cy = dollRect.y + dollRect.height / 2f + (HairOffY(-0.36f)) * 1024f * k;
                    Rect r = new Rect(cx - size / 2f, cy - size / 2f, size, size);
                    Color old = GUI.color;
                    GUI.color = pawn.story.HairColor;
                    GUI.DrawTexture(r, tex, ScaleMode.StretchToFill, true);
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
                    if (missLogged.Count < 30 && !missLogged.Contains(full))
                    {
                        missLogged.Add(full);
                        if (Dolls.DebugOn) Log.Warning("[NHT Custom Dolls] hair texture missing: " + full);
                    }
                    DrawVanillaHair(pawn, dollRect);
                    return;
                }

                float k = dollRect.width / 512f;
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
                GUI.color = harColor ? pawn.story.HairColor : Color.white;
                GUI.DrawTexture(r, tex, ScaleMode.StretchToFill, true);
                if (drawnLogged.Count < 40 && !drawnLogged.Contains(full))
                {
                    drawnLogged.Add(full);
                    if (Dolls.DebugOn) Log.Message("[NHT Custom Dolls] hair draw " + (pawn.LabelShort ?? "?") + " " + full + " rect=" + Mathf.RoundToInt(w) + "x" + Mathf.RoundToInt(h));
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
                    float k = dollRect.width / 512f;
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
                                if (grayPt == null) continue;   // 没有灰件就别画彩色
                                srcPt = grayPt;
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

            private static bool aboveLogged;

            /* A 方案：要不要跳过 NHT 自己画的白发（由彩色层代替） */
            private static bool hairSkipLogged;
            private static Rect hairLastRect;
            private static Texture2D hairLastTex;
            private static bool hairPending;
            private static bool hairGearLogged;

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
                if (RaceHasHairAddon(pawn.def)) return;
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
                    if (st == null || !st.tintVanillaHair) return false;
                    if (RaceHasHairAddon(pawn.def)) return false;      // HAR 头发由我们自己画
                    if (hairFits == null) LoadHairFits();
                    if (hairFits == null) return false;
                    HairFitDef f;
                    if (!hairFits.TryGetValue(pawn.def.defName ?? "", out f) || f == null) return false;
                    return !string.IsNullOrEmpty(f.race) && f.race != "*";
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

                    // 非 HAR + 色彩显示：不让 NHT 用平色画头发，改由我们自己用“贴图 × 发色”画（保留贴图自带的阴影/高光）
                    try
                    {
                        bool globalTint = CustomDollsMod.Settings != null && CustomDollsMod.Settings.tintVanillaHair
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
                            ApplyVanillaRect(__args, pawn);   // 先按小窗口参数改矩形，再记录/重画
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
                                    float kk = curRect.width / 512f;
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
                                GUI.DrawTexture(hairLastRect, hairLastTex, ScaleMode.StretchToFill, true);
                                GUI.color = oldC;
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
                if (pawn == null || pawn.def == null || dollRect.width < 120f || dollRect.height < 120f) return;
                if (IsXray(curWidget)) return;
                try
                {
                    bool har = RaceHasHairAddon(pawn.def);
                    if (!har)
                    {
                        if (hairFits == null) LoadHairFits();
                        HairFitDef f0;
                        if (hairFits == null || !hairFits.TryGetValue(pawn.def.defName ?? "", out f0) || f0 == null) return;
                        if (pawn.story == null || pawn.story.hairDef == null) return;
                    }
                    float gsz = 20f;
                    Rect btn = new Rect(dollRect.xMax - 20f - gsz + 12f, dollRect.yMax - 20f - gsz + 58f, gsz, gsz);
                    Bootstrap.HairGearRect = btn;
                    if (Event.current == null) return;
                    Texture2D icon = ContentFinder<Texture2D>.Get("Custom/Icons/Settings", false)
                        ?? ContentFinder<Texture2D>.Get("UI/Buttons/Options", false)
                        ?? TexButton.Info;
                    if (icon == null) return;
                    bool hover = btn.Contains(Event.current.mousePosition);
                    Color oldC = GUI.color;
                    GUI.color = new Color(1f, 1f, 1f, hover ? 0.25f : 0.10f);
                    GUI.DrawTexture(btn, icon, ScaleMode.ScaleToFit, true);
                    GUI.color = oldC;
                    bool clicked = Event.current.type == EventType.MouseDown && Event.current.button == 0 && hover;
if (clicked)
                    {
                        try { Event.current.Use(); } catch (Exception) { }
                        HairAdjustWindow open = null;
                        foreach (Window w in Find.WindowStack.Windows)
                        {
                            HairAdjustWindow hw = w as HairAdjustWindow;
                            if (hw != null && hw.Race == pawn.def.defName) { open = hw; break; }
                        }
                        if (open != null) open.Close();
                        else
                        {
                            foreach (Window w in Find.WindowStack.Windows)
                            {
                                if (w is HairAdjustWindow) { w.Close(); break; }
                            }
                            Find.WindowStack.Add(new HairAdjustWindow(pawn.def.defName, har, pawn.thingIDNumber));
                        }
                        if (!hairGearLogged)
                        {
                            hairGearLogged = true;
                            if (Dolls.DebugOn) Log.Message("[NHT hair] gear opened race=" + pawn.def.defName + " har=" + har);
                        }
                    }
                }
                catch (Exception) { }
            }

            internal static void FallbackDraw()
            {
                if (!drawnThisFrame && curPawn != null)
                {
                    if (cur.main >= 0) Draw(null, curPawn, curRect, cur.main, cur.mainPath);
                    // 只有“为某个种族单独配过参数”的画布才补画原版发型（race 不是通配符），
                    // 否则原版人类也会被重画一遍
                    else if (curPawn != null)
                    {
                        // 先按“当前这个小人”的种族取参数：不加这一句会沿用上一个 HAR 小人的参数，
                        // 导致 RatKin 的头发要先去开别人的面板才显示
                        UseFit(curPawn.def.defName);
                        if (hairFit != null && !string.IsNullOrEmpty(hairFit.race) && hairFit.race != "*"
                            && CustomDollsMod.Settings != null && CustomDollsMod.Settings.tintVanillaHair)
                            DrawVanillaHairColored(curPawn, curRect);
                    }
                }
                drawnThisFrame = false;
            }

            /* NHT 自己画的原版发型不带发色（整头白发），这里按发色补画一遍盖上去 */
            private static void DrawVanillaHairColored(Pawn pawn, Rect dollRect)
            {
                try
                {
                    HairDef hd = pawn.story == null ? null : pawn.story.hairDef;
                    if (hd == null || string.IsNullOrEmpty(hd.texPath)) return;
                    if (hd.defName != null && hd.defName.IndexOf("Null", StringComparison.OrdinalIgnoreCase) >= 0) return;
                    Texture2D tex = ContentFinder<Texture2D>.Get(hd.texPath + "_south", false);
                    if (tex == null) tex = ContentFinder<Texture2D>.Get(hd.texPath, false);
                    if (tex == null) return;

                    float k = dollRect.width / 512f;
                    // 用娃娃的头部部位定位（和 NHT 自己画头发的位置一致）
                    float hx = 0f, hy = 0f, hw = 0f;
                    try
                    {
                        if (curWidget != null)
                        {
                            PropertyInfo ctxP = curWidget.GetType().GetProperty("Ctx", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                            object ctx = ctxP == null ? null : ctxP.GetValue(curWidget);
                            FieldInfo mainF = ctx == null ? null : AccessTools.Field(ctx.GetType(), "MainDoll");
                            object doll = mainF == null ? null : mainF.GetValue(ctx);
                            if (doll != null)
                            {
                                FieldInfo hpF = AccessTools.Field(doll.GetType(), "headPart");
                                string headName = hpF == null ? null : hpF.GetValue(doll) as string;
                                FieldInfo partsF = AccessTools.Field(doll.GetType(), "Parts");
                                System.Collections.IList parts = partsF == null ? null : partsF.GetValue(doll) as System.Collections.IList;
                                if (parts != null && !string.IsNullOrEmpty(headName))
                                {
                                    foreach (object pt in parts)
                                    {
                                        FieldInfo dF = AccessTools.Field(pt.GetType(), "defName");
                                        string dn = dF == null ? null : dF.GetValue(pt) as string;
                                        if (dn != headName) continue;
                                        FieldInfo pf = AccessTools.Field(pt.GetType(), "position");
                                        FieldInfo wf = AccessTools.Field(pt.GetType(), "width");
                                        Vector2 pos = pf == null ? Vector2.zero : (Vector2)pf.GetValue(pt);
                                        float wv = wf == null ? 1f : Convert.ToSingle(wf.GetValue(pt));
                                        hx = pos.x; hy = pos.y; hw = Math.Abs(wv);
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception) { }

                    // 用编辑器「HAR 头发」里导出的参数：缩放 = 头宽的倍数（1.0 = 和头一样宽），
                    // 偏移 = 以娃娃高度为单位（负数向上）；位置以头部部位为中心
                    UseFit(pawn.def.defName);
                    float sc = HairScale(1.15f);
                    float ox = HairOffX(0f);
                    float oy = HairOffY(0f);

                    // 和 HAR 发型一样的公式：大小 = 1024 × 缩放，中心 = 娃娃中心 + 偏移
                    float cx = dollRect.x + dollRect.width / 2f + ox * 1024f * k;
                    float cy = dollRect.y + dollRect.height / 2f + oy * 1024f * k;
                    float size = 1024f * sc * k;
                    Rect r = new Rect(cx - size / 2f, cy - size / 2f, size, size);
                    Color old = GUI.color;
                    GUI.color = pawn.story.HairColor;
                    GUI.DrawTexture(r, tex, ScaleMode.StretchToFill, true);
                    GUI.color = old;
                }
                catch (Exception) { }
            }

            private static bool InitedFit()
            {
                if (hairFits == null) LoadHairFits();
                if (hairFit == null && curPawn != null) UseFit(curPawn.def.defName);
                return true;
            }

            private static int LayerOf(object partObj)
            {
                if (partObj == null) return -1;
                FieldInfo f = partObj.GetType().GetField("layer", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (f == null || f.FieldType != typeof(int)) return -1;
                try { return (int)f.GetValue(partObj); } catch (Exception) { return -1; }
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

            private static string DollNameOf(object widget)
            {
                if (widget == null) return null;
                try
                {
                    if (!dollFieldLooked)
                    {
                        dollFieldLooked = true;
                        foreach (FieldInfo f in widget.GetType().GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic))
                        {
                            if (typeof(HumanlikeDoll).IsAssignableFrom(f.FieldType)) { dollNameField = f; break; }
                        }
                    }
                    if (dollNameField == null) return null;
                    HumanlikeDoll d = dollNameField.GetValue(widget) as HumanlikeDoll;
                    return d == null ? null : d.defName;
                }
                catch (Exception) { return null; }
            }

            /* 这一族里有没有生成好的灰色部位（没有就别跳过正常件，否则整件消失） */
            private static bool HasGrayTwin(object widget, string baseName)
            {
                if (widget == null || string.IsNullOrEmpty(baseName)) return false;
                bool found;
                if (grayTwinCache.TryGetValue(baseName, out found)) return found;
                found = false;
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
                                    if (gdn is string && (string)gdn == baseName + GraySuffix) { found = true; break; }
                                }
                            }
                        }
                    }
                }
                catch (Exception) { }
                grayTwinCache[baseName] = found;
                return found;
            }

            /* 按小人「色彩显示」决定这一格是否用灰色贴图 */
            private static bool WantGrayNow(Pawn pawn, string race, string doll, string defName, int id)
            {
                try
                {
                    if (pawn != null && CustomDollsMod.Settings != null)
                    {
                        int pid = pawn.thingIDNumber;
                        if (pid >= 0 && !HairTuning.SyncPawn(pid))
                        {
                            bool gDef = CustomDollsMod.Settings.desatColorsOn;
                            bool cOn = HairTuning.GetPawnFlag(CustomDollsMod.Settings.pawnColor, pid, gDef);
                            if (!cOn) return Desat.Controlled(race, doll, defName, id);
                            return false;
                        }
                    }
                }
                catch (Exception) { }
                return Desat.GrayNeeded(race, doll, defName, id);
            }

            /* true = 这一格不要画；正常件/灰件按设置二选一 */
            private static bool SkipPart(object[] args)
            {
                object part = PartDefOfArgs(args);
                if (part == null) return false;
                string name = DefNameOf(part);
                if (string.IsNullOrEmpty(name)) return false;
                bool isGray = name.EndsWith(GraySuffix, StringComparison.OrdinalIgnoreCase);
                string baseName = isGray ? name.Substring(0, name.Length - GraySuffix.Length) : name;
                int id = PartIdOfArgs(args);
                string race = curPawn != null && curPawn.def != null ? curPawn.def.defName : null;
                string doll = DollNameOf(curWidget);
                bool wantGray = WantGrayNow(curPawn, race, doll, baseName, id);
                // 没生成灰件 → 正常件照画，不能把它跳过（否则部位直接消失）
                if (wantGray && !isGray && !HasGrayTwin(curWidget, baseName)) return false;
                if (CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug
                    && skipLogged.Count < 120 && !skipLogged.Contains(name))
                {
                    skipLogged.Add(name);
                    bool ctl = Desat.Controlled(race, doll, baseName, id);
                    bool master = CustomDollsMod.Settings == null || CustomDollsMod.Settings.desatColorsOn;
                    Log.Message("[NHT desat skip] " + name + " race=" + race + " id=" + id + " gray=" + isGray
                        + " want=" + wantGray + " ctl=" + ctl + " masterOn=" + master + " skip=" + (isGray != wantGray));
                }
                return isGray != wantGray;   // 需要灰却画正常件 / 不需要灰却画灰件 → 跳过
            }

            /* NHT 每画一个部位都会经过这里：按层级把头发插进去 */
            private static readonly Dictionary<object, Tuple<string, Texture2D, Vector2, float, float>> colorVariantSaved = new Dictionary<object, Tuple<string, Texture2D, Vector2, float, float>>();

            private static void ApplyColorVariant(object[] __args)
            {
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
                    ColorVariantPart hit = null;
                    string usePath = null;
                    foreach (ColorVariantDef v in DefDatabase<ColorVariantDef>.AllDefs)
                    {
                        if (v == null || string.IsNullOrEmpty(v.hediff)) continue;
                        if (!string.IsNullOrEmpty(v.race) && v.race != "*" && v.race != race) continue;
                        if (!string.IsNullOrEmpty(v.bodyType) && v.bodyType != "*" && v.bodyType != body) continue;
                        HediffDef hd = DefDatabase<HediffDef>.GetNamedSilentFail(v.hediff);
                        if (hd == null || !curPawn.health.hediffSet.HasHediff(hd)) continue;
                        for (int i = 0; i < (v.parts == null ? 0 : v.parts.Count); i++)
                        {
                            ColorVariantPart cp = v.parts[i];
                            if (cp == null || cp.part != baseName) continue;
                            string pth = isGray ? cp.grayPath : cp.imagePath;
                            if (!string.IsNullOrEmpty(pth)) { hit = cp; usePath = pth; break; }
                        }
                        if (hit != null) break;
                    }
                    if (hit == null || string.IsNullOrEmpty(usePath)) return;

                    Texture2D tex = ContentFinder<Texture2D>.Get(usePath, false);
                    if (tex == null) return;
                    FieldInfo imgF = typeof(DollBodyPartDef).GetField("imagePath", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo texF = typeof(DollBodyPartDef).GetField("tex", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo posF = typeof(DollBodyPartDef).GetField("position", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo wF = typeof(DollBodyPartDef).GetField("width", BindingFlags.Instance | BindingFlags.Public);
                    FieldInfo hF = typeof(DollBodyPartDef).GetField("height", BindingFlags.Instance | BindingFlags.Public);
                    if (imgF == null || texF == null) return;
                    string oldPath = (string)imgF.GetValue(part);
                    Texture2D oldTex = (Texture2D)texF.GetValue(part);
                    Vector2 oldPos = posF != null ? (Vector2)posF.GetValue(part) : Vector2.zero;
                    float oldW = wF != null ? (float)wF.GetValue(part) : 0f;
                    float oldH = hF != null ? (float)hF.GetValue(part) : 0f;
                    colorVariantSaved[part] = Tuple.Create(oldPath, oldTex, oldPos, oldW, oldH);
                    imgF.SetValue(part, usePath);
                    texF.SetValue(part, tex);
                    if (posF != null && (!float.IsNaN(hit.x) || !float.IsNaN(hit.y)))
                    {
                        posF.SetValue(part, new Vector2(float.IsNaN(hit.x) ? oldPos.x : hit.x,
                                                       float.IsNaN(hit.y) ? oldPos.y : hit.y));
                    }
                    if (wF != null && !float.IsNaN(hit.width)) wF.SetValue(part, hit.width);
                    if (hF != null && !float.IsNaN(hit.height)) hF.SetValue(part, hit.height);
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

            private static bool PartPrefix(object[] __args)
            {
                if (curPawn == null) return true;
                try
                {
                    if (SkipPart(__args)) return false;
                    ApplyColorVariant(__args);
                    int layer = -1;
                    if (__args != null)
                        for (int i = 0; i < __args.Length && layer < 0; i++) layer = LayerOfArg(__args[i]);
                    if (layer < 0) return true;

                    int hl = HairLayerNow();
                    bool cross = lastLayer == int.MinValue
                        ? (layer >= hl)
                        : ((lastLayer < hl && layer >= hl) || (lastLayer > hl && layer <= hl));
                    lastLayer = layer;
                    if (mainDrawn || !cross) return true;

                    Draw(null, curPawn, curRect, cur.main, cur.mainPath);
                    for (int k = 0; k < cur.extra.Count; k++)
                        Draw(null, curPawn, curRect, cur.extra[k], cur.extraPath[k]);
                    mainDrawn = true; extrasDrawn = true;
                    string key = curPawn.def.defName + "/" + hl;
                    if (!insertLogged.Contains(key))
                    {
                        insertLogged.Add(key);
                        Log.Message("[NHT hair insert] race=" + curPawn.def.defName + " hairLayer=" + hl
                            + " insertedAt=layer" + layer + " (main=" + cur.main + ", extra=" + cur.extra.Count + ")");
                    }
                }
                catch (Exception) { }
                return true;
            }


            private static void PartPostfix(object[] __args)
            {
                RestoreColorVariant(__args);
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
                    curPawn = pawn; curRect = dollRect; curWidget = __instance;
                    drawnThisFrame = false; mainDrawn = false; extrasDrawn = false; lastLayer = int.MinValue; 
                    hairRecolored = false;
                    hairPending = false;
                    headDeltaValid = false;
                    bool xrayHide = false;
                    if (IsXray(__instance))
                    {
                        if (hairFits == null) LoadHairFits();
                        if (hairFit == null) UseFit(pawn.def.defName);
                        // 游戏内设置可全局打开；编辑器导出的 showInXray 可对单个种族打开
                        bool showIt = (CustomDollsMod.Settings != null && CustomDollsMod.Settings.showHairInXray)
                            || (hairFit != null && hairFit.showInXray);
                        if (!showIt) { curPawn = null; xrayHide = true; }   // 器官/骨骼视图：默认不画头发
                    }
                    InitAddons(pawn.def); 
                    if (!fitLogged.Contains(pawn.def.defName))
                    {
                        fitLogged.Add(pawn.def.defName);
                        UseFit(pawn.def.defName);
                        Log.Message("[NHT hair fit] race=" + pawn.def.defName
                            + " fitRace=" + (hairFit == null ? "null" : hairFit.race)
                            + " scale=" + (HairScale(-1f)).ToString("F3")
                            + " offX=" + (HairOffX(0f)).ToString("F3")
                            + " offY=" + (HairOffY(0f)).ToString("F3")
                            + " front=" + (hairFit == null ? "null" : hairFit.front.ToString())
                            + " main=" + cur.main + " bg=" + cur.bg
                            + " extra=" + cur.extra.Count + " backExtra=" + cur.backExtra.Count);
                    }
                    if (xrayHide) return;                                   // 后层也不要画
                    Draw(__instance, pawn, dollRect, cur.bg, cur.bgPath);      // 后层：先画，压在所有部位后面
                    for (int b = 0; b < cur.backExtra.Count; b++)
                        Draw(__instance, pawn, dollRect, cur.backExtra[b], cur.backExtraPath[b]);
                    if (hairFit != null && !hairFit.front)
                        Draw(__instance, pawn, dollRect, cur.main, cur.mainPath);   // 主层也放到背后
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
                        if (insertLogged.Count < 40)
                        {
                            string k2 = "fallback/" + curPawn.def.defName;
                            if (!insertLogged.Contains(k2))
                            {
                                insertLogged.Add(k2);
                                Log.Warning("[NHT hair insert] 没找到插入点，兜底画在最上层：" + curPawn.def.defName
                                    + " hairLayer=" + HairLayerNow());
                            }
                        }
                    }
                    else if (curPawn != null && !extrasDrawn)
                    {
                        for (int k = 0; k < cur.extra.Count; k++)
                            Draw(null, curPawn, curRect, cur.extra[k], cur.extraPath[k]);
                        extrasDrawn = true;
                    }

                    // 原版 HairDef 种族：按发色补画一层（开关打开时才画）
                    if (curPawn != null && cur.main < 0 && !hairRecolored && !selfHair
                        && CustomDollsMod.Settings != null && CustomDollsMod.Settings.tintVanillaHair)
                    {
                        UseFit(curPawn.def.defName);
                        bool hasFit = hairFit != null && !string.IsNullOrEmpty(hairFit.race) && hairFit.race != "*";
                        if (hasFit)
                        {
                            if (Dolls.DebugOn && colorHairLogged < 6)
                            {
                                colorHairLogged++;
                                Log.Message("[NHT hair] vanilla colored race=" + curPawn.def.defName + " fit=" + hairFit.race);
                            }
                            DrawVanillaHairColored(curPawn, curRect);
                        }
                    }

                    
                    // 呆毛/额发层（独立附加件，画在普通头发之上）
                    if (curPawn != null && cur.main >= 0)
                    {
                        UseFit(curPawn.def.defName);
                        for (int oi = 0; oi < cur.over.Count; oi++)
                            Draw(null, curPawn, curRect, cur.over[oi], cur.overPath[oi]);
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

public class HairAdjustWindow : Window
{
    private readonly string race;
    private readonly bool isHar;
    private readonly int pawnId;
    private bool RaceWide { get { return HairTuning.SyncPawn(pawnId); } }
    private float scale, ox, oy;
    private bool colorOnState;
    private HairWarnWindow warn;
    private float lastScale = -999f, lastOx = -999f, lastOy = -999f;

    public override Vector2 InitialSize
    {
        get { return new Vector2(236f, 196f); }
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
                if (Bootstrap.HairGearRect.Contains(mp)) Event.current.Use();
                Close();
            }
        }
        catch (Exception) { }
    }

    public override void PostClose()
    {
        base.PostClose();
        if (warn != null) { warn.Close(); warn = null; }
    }

    public override void PostOpen()
    {
        base.PostOpen();
        Rect g = Bootstrap.HairGearRect;
        if (g.width > 0f)
        {
            windowRect = new Rect(g.xMax, g.y, windowRect.width, windowRect.height);
        }
    }

    private string Key { get { return RaceWide || pawnId < 0 ? race : ("p" + pawnId); } }

    public HairAdjustWindow(string race, bool isHar, int pawnId)
    {
        this.race = race;
        this.isHar = isHar;
        this.pawnId = pawnId;
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
        foreach (HairFitDef f in DefDatabase<HairFitDef>.AllDefsListForReading)
        {
            if (f != null && string.Equals(f.race, race, StringComparison.OrdinalIgnoreCase)) return f;
        }
        return null;
    }

    private void LoadValues()
    {
        float s0, x0, y0;
        bool got = HairTuning.TryGet(Key, out s0, out x0, out y0);
        if (!got && !RaceWide && pawnId >= 0) got = HairTuning.TryGet(race, out s0, out x0, out y0);
        if (got) { scale = s0; ox = x0; oy = y0; }
        else
        {
            HairFitDef f = FindFit();
            if (isHar)
            {
                scale = f == null ? 0.78f : f.scale;
                ox = f == null ? 0f : f.offsetX;
                oy = f == null ? -0.21f : f.offsetY;
            }
            else
            {
                scale = f == null ? 1f : f.vanillaScale;
                ox = f == null ? 0f : f.vanillaOffsetX;
                oy = f == null ? 0f : f.vanillaOffsetY;
            }
        }
        lastScale = scale; lastOx = ox; lastOy = oy;
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
        Widgets.Label(new Rect(0f, 0f, inRect.width - 46f, 20f), Translator.Translate("NHTCD_WinTitle").ToString() + " · " + race);
        if (Widgets.ButtonText(new Rect(inRect.width - 46f, 0f, 46f, 20f), Translator.Translate("NHTCD_WinReset").ToString()))
        {
            HairFitDef rf = FindFit();
            if (RaceWide || pawnId < 0)
            {
                HairTuning.Clear(race);
            }
            else
            {
                // 本人模式：写成“默认值”本身，而不是清空——清空会回落到种族值（旧数据）
                float ds = isHar ? (rf == null ? 0.78f : rf.scale) : (rf == null ? 1f : rf.vanillaScale);
                float dx = isHar ? (rf == null ? 0f : rf.offsetX) : (rf == null ? 0f : rf.vanillaOffsetX);
                float dy = isHar ? (rf == null ? -0.21f : rf.offsetY) : (rf == null ? 0f : rf.vanillaOffsetY);
                HairTuning.Set("p" + pawnId, ds, dx, dy);
            }
            if (pawnId >= 0) HairTuning.ClearManual(pawnId);
            ClearAutoFix();
            LoadValues();
            Dolls.Invalidate();
        }
        float y = 22f;

        {
            CustomDollsSettings st0 = CustomDollsMod.Settings;
            bool globalMaster = st0 == null || (isHar ? st0.harHairUseEditor : st0.vanillaHairUseEditor);
            bool master = RaceWide
                ? globalMaster
                : HairTuning.GetPawnFlag(st0 == null ? null : st0.pawnCustom, pawnId, globalMaster);
            bool nm = master;
            Widgets.CheckboxLabeled(new Rect(0f, y, inRect.width, 20f), Translator.Translate("NHTCD_WinMaster").ToString(), ref nm);
            if (nm != master && st0 != null)
            {
                if (RaceWide)
                {
                    if (isHar) st0.harHairUseEditor = nm;
                    else st0.vanillaHairUseEditor = nm;
                    st0.Write();
                }
                else HairTuning.SetPawnFlag(st0.pawnCustom, pawnId, nm);
                Dolls.Invalidate();
            }
            y += 21f;

            bool rn = RaceWide;
            Widgets.CheckboxLabeled(new Rect(0f, y, inRect.width, 20f), Translator.Translate("NHTCD_WinSync").ToString(), ref rn);
            if (rn != RaceWide)
            {
                if (rn)
                {
                    if (pawnId >= 0) HairTuning.Clear("p" + pawnId);
                    CustomDollsSettings stS = CustomDollsMod.Settings;
                    if (stS != null && pawnId >= 0)
                    {
                        bool gm = isHar ? stS.harHairUseEditor : stS.vanillaHairUseEditor;
                        bool cm = HairTuning.GetPawnFlag(stS.pawnCustom, pawnId, gm);
                        if (isHar) stS.harHairUseEditor = cm; else stS.vanillaHairUseEditor = cm;
                        bool gc = isHar ? stS.harHairTint : stS.tintVanillaHair;
                        bool cc = HairTuning.GetPawnFlag(stS.pawnColor, pawnId, gc);
                        stS.desatColorsOn = cc;
                        if (isHar) stS.harHairTint = cc; else stS.tintVanillaHair = cc;
                        stS.Write();
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
            y += 23f;
        }

        {
            CustomDollsSettings st = CustomDollsMod.Settings;
            bool raceOff = HairTuning.ColorOff(race);
            bool globalColor = st == null || ((isHar ? st.harHairTint : st.tintVanillaHair) && !raceOff);
            bool colorOn = RaceWide
                ? globalColor
                : HairTuning.GetPawnFlag(st == null ? null : st.pawnColor, pawnId, globalColor);
            bool nc = colorOn;
            this.colorOnState = colorOn;
            Widgets.CheckboxLabeled(new Rect(0f, y, inRect.width, 20f), Translator.Translate("NHTCD_WinColor").ToString(), ref nc);
            if (nc != colorOn && st != null)
            {
                this.colorOnState = nc;
                if (RaceWide)
                {
                    HairTuning.SetColorOff(race, !nc);
                    st.desatColorsOn = nc;
                    if (isHar) st.harHairTint = nc; else st.tintVanillaHair = nc;
                    st.Write();
                }
                else HairTuning.SetPawnFlag(st.pawnColor, pawnId, nc);
                Dolls.Invalidate();
            }
            y += 22f;
        }

        float sw = inRect.width - 106f;
        float scMin = isHar ? 0.1f : 0.5f;
        float scMax = isHar ? 2.5f : 1.8f;
        float ofMin = isHar ? -1f : -80f;
        float ofMax = isHar ? 1f : 80f;
        Widgets.Label(new Rect(0f, y, 60f, 20f), Translator.Translate("NHTCD_WinScale").ToString());
        if (isHar)
        {
            // HAR 用对数刻度：0.36 大约在滑块 40% 的位置（线性刻度会紧贴最左边）
            float lr = Mathf.Log(scMax / scMin);
            float t = lr > 0.0001f ? Mathf.Log(Mathf.Clamp(scale, scMin, scMax) / scMin) / lr : 0f;
            float t2 = Widgets.HorizontalSlider(new Rect(62f, y + 2f, sw, 18f), t, 0f, 1f);
            if (Mathf.Abs(t2 - t) > 0.0001f) scale = scMin * Mathf.Pow(scMax / scMin, t2);
        }
        else
        {
            scale = Widgets.HorizontalSlider(new Rect(62f, y + 2f, sw, 18f), scale, scMin, scMax);
        }
        Widgets.Label(new Rect(inRect.width - 48f, y, 48f, 20f), scale.ToString("F2"));
        y += 22f;

        Widgets.Label(new Rect(0f, y, 60f, 20f), Translator.Translate("NHTCD_WinX").ToString());
        ox = Widgets.HorizontalSlider(new Rect(62f, y + 2f, sw, 18f), ox, ofMin, ofMax);
        Widgets.Label(new Rect(inRect.width - 48f, y, 48f, 20f), isHar ? ox.ToString("F2") : (ox.ToString("F0") + "px"));
        y += 22f;

        Widgets.Label(new Rect(0f, y, 60f, 20f), Translator.Translate("NHTCD_WinY").ToString());
        oy = Widgets.HorizontalSlider(new Rect(62f, y + 2f, sw, 18f), oy, ofMin, ofMax);
        Widgets.Label(new Rect(inRect.width - 48f, y, 48f, 20f), isHar ? oy.ToString("F2") : (oy.ToString("F0") + "px"));
        y += 26f;

        Flush();

        bool wantWarn = true;
        if (warn != null && warn.harMode != isHar) { warn.Close(); warn = null; }
        if (wantWarn && warn == null)
        {
            warn = new HairWarnWindow();
            warn.harMode = isHar;
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

}
