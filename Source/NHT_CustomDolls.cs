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
    // ------------------------------------------------------------------ settings
    public class CustomDollsSettings : ModSettings
    {
        // key = "race|gender|bodytype" (any part may be "*"), value = HumanlikeDoll defName
        public Dictionary<string, string> rules = new Dictionary<string, string>();
        // 骨骼 / 器官视图里是否显示 HAR 头发（默认关闭）
        public bool showHairInXray = false;
        // 调试模式：输出启动信息、诊断日志、缺图警告等（默认关闭）
        public bool debug = false;

        public override void ExposeData()
        {
            Scribe_Collections.Look(ref rules, "rules", LookMode.Value, LookMode.Value);
            Scribe_Values.Look(ref showHairInXray, "showHairInXray", false);
            Scribe_Values.Look(ref debug, "debug", false);
            if (Scribe.mode == LoadSaveMode.PostLoadInit && rules == null)
            {
                rules = new Dictionary<string, string>();
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
            string body = BodyOf(pawn);

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
                                harmony.Patch(mi, new HarmonyMethod(hairFix.GetMethod("PartPrefix", BindingFlags.Static | BindingFlags.NonPublic)), null, null, null);
                                partHooks++;
                            }
                            catch (Exception) { }
                        }
                    }
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

        // replace the doll NHT picked for this pawn (race keyed, with gender/bodytype fallback)
        private static void GetMainDollPostfix(Pawn pawn, ref HumanlikeDoll __result)
        {
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
            private static FieldInfo addonVariantsField, texPathField, pawnField, ctxField, dollField, rectField;
            private static bool looked, failed, inited;
            private static Pawn curPawn;
            private static object curWidget;
            private static Rect curRect;
            /* 每个种族（HAR addon 列表）各存一份索引：原来全局只初始化一次，
               先画过别的种族就会串号，导致“后背层”被当成额外层画到最上面 */
            private class AddonSet
            {
                public int main = -1, bg = -1;
                public string mainPath, bgPath;
                public readonly List<int> extra = new List<int>();
                public readonly List<string> extraPath = new List<string>();
                public readonly List<int> backExtra = new List<int>();
                public readonly List<string> backExtraPath = new List<string>();
            }
            private static readonly Dictionary<string, AddonSet> addonSets = new Dictionary<string, AddonSet>();
            private static AddonSet cur = new AddonSet();
            private static readonly List<string> missLogged = new List<string>();
            private static readonly List<string> drawnLogged = new List<string>();

            private static MethodBase TargetMethod()
            {
                Type w = typeof(HumanlikeDoll).Assembly.GetType("NiceHealthTab.DollWidget");
                return w == null ? null : AccessTools.Method(w, "DrawMainDoll");
            }


            private static Dictionary<string, HairFitDef> hairFits;
            private static HairFitDef hairFit;

            private static void LoadHairFits()
            {
                hairFits = new Dictionary<string, HairFitDef>();
                foreach (HairFitDef d in DefDatabase<HairFitDef>.AllDefs)
                    if (!hairFits.ContainsKey(d.race ?? "*")) hairFits[d.race ?? "*"] = d;
            }

            private static void UseFit(string race)
            {
                if (hairFits == null) LoadHairFits();
                hairFit = null;
                if (hairFits.TryGetValue(race ?? "*", out hairFit)) return;
                hairFits.TryGetValue("*", out hairFit);
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
            private static void InitAddons(ThingDef raceDef)
            {
                string key = raceDef == null ? "?" : raceDef.defName;
                AddonSet cached;
                if (addonSets.TryGetValue(key, out cached)) { cur = cached; return; }
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
                        if (pt.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) < 0) continue;
                        bool isBg = nm.IndexOf("BG", StringComparison.OrdinalIgnoreCase) >= 0
                                 || nm.IndexOf("back", StringComparison.OrdinalIgnoreCase) >= 0
                                 || pt.IndexOf("HairBack", StringComparison.OrdinalIgnoreCase) >= 0
                                 || pt.IndexOf("Hair_Back", StringComparison.OrdinalIgnoreCase) >= 0
                                 || pt.IndexOf("Background", StringComparison.OrdinalIgnoreCase) >= 0;
                        if (!isBg && nm.IndexOf("hair", StringComparison.OrdinalIgnoreCase) < 0
                            && pt.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) < 0) continue;
                        if (isBg)
                        {
                            // 后层一律在最底层画：第一个记成 bg，多余的进 backExtra
                            if (cur.bg < 0) { cur.bg = i; cur.bgPath = pt; }
                            else { cur.backExtra.Add(i); cur.backExtraPath.Add(pt); }
                        }
                        else if (cur.main < 0) { cur.main = i; cur.mainPath = pt; }
                        else if (nm.IndexOf("ahoge", StringComparison.OrdinalIgnoreCase) >= 0
                              || nm.IndexOf("highlight", StringComparison.OrdinalIgnoreCase) >= 0
                              || nm.IndexOf("hair", StringComparison.OrdinalIgnoreCase) >= 0
                              || pt.IndexOf("Hair", StringComparison.OrdinalIgnoreCase) >= 0)
                        { cur.extra.Add(i); cur.extraPath.Add(pt); }
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
                        + " extra=" + cur.extra.Count + " backExtra=" + cur.backExtra.Count
                        + " paths=" + cur.mainPath + " / " + cur.bgPath);
                }
                catch (Exception) { }
            }


            /* HAR 变体 0 = 没有附加件。这时小人若用的是原版/其它模组的发型，
               就按发型贴图自己在头部位置画一层，NHT 里也能看到。 */
            private static void DrawVanillaHair(Pawn pawn, Rect dollRect)
            {
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
                    float sc = (hairFit == null ? 0.78f : hairFit.scale);
                    // 原版发型贴图是"头部大小"（约 128~256px），按头部区域换算
                    float size = tex.width * 2f * sc * k;   // 128 贴图 ≈ 256 娃娃单位
                    float cx = dollRect.x + dollRect.width / 2f + (hairFit == null ? 0 : hairFit.offsetX) * 1024f * k;
                    float cy = dollRect.y + dollRect.height / 2f + (hairFit == null ? -0.36f : hairFit.offsetY) * 1024f * k;
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
            private static bool rectLogged;

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
                float HAIR_SCALE = hairFit == null ? 0.78f : hairFit.scale;
                float HAIR_SHIFT_Y = hairFit == null ? -0.21f : hairFit.offsetY;
                float HAIR_SHIFT_X = hairFit == null ? 0f : hairFit.offsetX;
                float scale = 1024f / Math.Max(1, tex.width) * HAIR_SCALE;
                float w = tex.width * scale * k, h = tex.height * scale * k;
                float cx = dollRect.x + dollRect.width / 2f + HAIR_SHIFT_X * 1024f * k;
                float cy = dollRect.y + dollRect.height / 2f + HAIR_SHIFT_Y * 1024f * k;
                Rect r = new Rect(cx - w / 2f, cy - h / 2f, w, h);
                Color old = GUI.color;
                GUI.color = pawn.story.HairColor;
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
                    foreach (object pt in parts)
                    {
                        FieldInfo lf = AccessTools.Field(pt.GetType(), "layer");
                        int layer = lf == null ? 0 : Convert.ToInt32(lf.GetValue(pt));
                        // 只按「置顶重画」开关（HairFitDef.aboveParts）决定，与层级无关
                        FieldInfo imf = AccessTools.Field(pt.GetType(), "imagePath");
                        string img = imf == null ? null : (imf.GetValue(pt) as string);
                        if (string.IsNullOrEmpty(img)) continue;
                        // 只重画装饰性部位：身体部位重画会把 NHT 画的疤痕/伤口一起盖掉
                        // 只重画编辑器里明确标了「画在头发之上」的部位
                        string defName = AccessTools.Field(pt.GetType(), "defName") == null ? null
                            : (AccessTools.Field(pt.GetType(), "defName").GetValue(pt) as string);
                        // 只重画编辑器里明确标了「置顶重画 / 画在头发之上」的部位
                        if (hairFit == null || hairFit.aboveParts == null || defName == null
                            || !hairFit.aboveParts.Contains(defName)) continue;
                        FieldInfo pf = AccessTools.Field(pt.GetType(), "position");
                        Vector2 pos = pf != null && pf.GetValue(pt) is Vector2 ? (Vector2)pf.GetValue(pt) : Vector2.zero;
                        FieldInfo wf = AccessTools.Field(pt.GetType(), "width");
                        FieldInfo hf = AccessTools.Field(pt.GetType(), "height");
                        float w = wf == null ? 1f : Convert.ToSingle(wf.GetValue(pt));
                        float h = hf == null ? 1f : Convert.ToSingle(hf.GetValue(pt));

                        Texture2D t = ContentFinder<Texture2D>.Get(img + "_south", false) ?? ContentFinder<Texture2D>.Get(img, false);
                        if (t == null) continue;
                        float sw = Math.Abs(w) * t.width * k, sh = Math.Abs(h) * t.height * k;
                        Rect r = new Rect(cx0 + pos.x * k - sw / 2f, cy0 + pos.y * k - sh / 2f, sw, sh);
                        bool flipX = w < 0f, flipY = h < 0f;
                        Matrix4x4 oldM = GUI.matrix;
                        if (flipX || flipY)
                        {
                            // width/height 为负 = 镜像（左右耳就是这样区分的）
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
                        if (hairFit != null && !string.IsNullOrEmpty(hairFit.race) && hairFit.race != "*")
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
                    bool got = false;
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
                                        got = true;
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception) { }

                    // 用编辑器「HAR 头发」里导出的参数：缩放 = 头宽的倍数（1.0 = 和头一样宽），
                    // 偏移 = 以娃娃高度为单位（负数向上）；位置以头部部位为中心
                    UseFit(pawn.def.defName);
                    float sc = hairFit == null ? 1.15f : hairFit.scale;
                    float ox = hairFit == null ? 0f : hairFit.offsetX;
                    float oy = hairFit == null ? 0f : hairFit.offsetY;

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

            /* NHT 每画一个部位都会经过这里：按层级把头发插进去 */
            private static void PartPrefix(object[] __args)
            {
                if (curPawn == null) return;
                try
                {
                    int layer = -1;
                    if (__args != null)
                        for (int i = 0; i < __args.Length && layer < 0; i++) layer = LayerOfArg(__args[i]);
                    if (layer < 0) return;

                    int hl = HairLayerNow();
                    bool cross = lastLayer == int.MinValue
                        ? (layer >= hl)
                        : ((lastLayer < hl && layer >= hl) || (lastLayer > hl && layer <= hl));
                    lastLayer = layer;
                    if (mainDrawn || !cross) return;

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
                            + " scale=" + (hairFit == null ? -1f : hairFit.scale).ToString("F3")
                            + " offX=" + (hairFit == null ? 0f : hairFit.offsetX).ToString("F3")
                            + " offY=" + (hairFit == null ? 0f : hairFit.offsetY).ToString("F3")
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

                    if (curPawn != null && curWidget != null) RedrawAboveHair(curWidget, curPawn, curRect);
                }
                catch (Exception) { }
                curPawn = null;
            }
        }
    }

    

/* 每个种族一份：HAR 附加件在 NHT 娃娃上的缩放与偏移（1.0 = 铺满整身） */

public class HairFitDef : Def
{
public string race = "*";
public float scale = 0.78f;
public float offsetX = 0f;
public float offsetY = -0.21f;
public bool front = true;
public float layer = 29f;
public bool showInXray = false;
public List<string> aboveParts = new List<string>();
}

}
