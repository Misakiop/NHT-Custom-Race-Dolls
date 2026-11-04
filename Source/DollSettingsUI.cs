using System;
using System.Collections.Generic;
using RimWorld;
using UnityEngine;
using Verse;
using NiceHealthTab;

namespace NHT_CustomDolls
{
    /// <summary>
    /// Settings page: which doll renders a race, per gender / body type.
    /// One block per race that has a HumanlikeDoll whose xenotype equals that race defName.
    /// </summary>
    public static class DollSettingsUI
    {
        private static Vector2 scroll;
        private static Vector2 desatScroll;
        private static bool desatOpen;
        private static Vector2 vcoordScroll;
        private static bool vcoordOpen;

        private static bool colorHelpOpen;

        private static void H(Rect inRect, float y, string title)
        {
            Text.Font = GameFont.Medium;
            GUI.color = new Color(1f, 0.88f, 0.62f);
            Widgets.Label(new Rect(inRect.x, y, inRect.width, 26f), title);
            GUI.color = Color.white;
            Text.Font = GameFont.Small;
            Widgets.DrawLineHorizontal(inRect.x, y + 27f, inRect.width);
        }

        private static bool Toggle(Rect r, string label, bool value)
        {
            bool v = value;
            Widgets.CheckboxLabeled(r, label, ref v);
            return v;
        }

        private static void Note(Rect r, string text, float height)
        {
            Color old = GUI.color;
            GUI.color = new Color(0.66f, 0.72f, 0.76f);
            Widgets.Label(new Rect(r.x, r.y, r.width, height), text);
            GUI.color = old;
        }

        private static void Warn(Rect r, string text)
        {
            Color old = GUI.color;
            GUI.color = new Color(1f, 0.8f, 0.45f);
            Widgets.Label(r, text);
            GUI.color = old;
        }

        public static void Draw(Rect inRect)
        {
            try
            {
                Dictionary<string, List<HumanlikeDoll>> map = Dolls.ByRace();
                List<string> races = new List<string>();
                if (map != null)
                {
                    races.AddRange(map.Keys);
                    races.Sort(delegate (string a, string b) { return string.Compare(a, b, StringComparison.OrdinalIgnoreCase); });
                }

                float viewH = 900f + races.Count * 36f;
                Rect outRect = new Rect(inRect.x, inRect.y, inRect.width, inRect.height);
                Rect view = new Rect(0f, 0f, inRect.width - 20f, viewH);
                Widgets.BeginScrollView(outRect, ref scroll, view);

                float y = 2f;
                GUI.color = new Color(0.85f, 0.9f, 0.95f);
                Widgets.Label(new Rect(4f, y, view.width - 8f, 24f),
                    string.Format(Translator.Translate("NHTCD_Header").ToString(), map == null ? 0 : map.Count));
                GUI.color = Color.white;
                y += 30f;

                // ---- 显示 ----
                H(view, y, Translator.Translate("NHTCD_SecDisplay").ToString()); y += 36f;
                bool show = CustomDollsMod.Settings != null && CustomDollsMod.Settings.showHairInXray;
                bool ns = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_ShowHairInXray").ToString(), show);
                if (CustomDollsMod.Settings != null && ns != show) { CustomDollsMod.Settings.showHairInXray = ns; CustomDollsMod.Settings.Write(); }
                y += 26f;
                bool allLayers = CustomDollsMod.Settings != null && CustomDollsMod.Settings.drawAllHairLayers;
                bool na = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_DrawAllHairLayers").ToString(), allLayers);
                if (CustomDollsMod.Settings != null && na != allLayers) { CustomDollsMod.Settings.drawAllHairLayers = na; CustomDollsMod.Settings.Write(); Bootstrap.ResetHairState(); Dolls.Invalidate(); }
                y += 34f;

                // ---- 颜色 ----
                H(view, y, Translator.Translate("NHTCD_SecColor").ToString()); y += 36f;
                bool colorsOn = CustomDollsMod.Settings == null || CustomDollsMod.Settings.desatColorsOn;
                bool nc = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_DesatColors").ToString(), colorsOn);
                if (CustomDollsMod.Settings != null && nc != colorsOn) { CustomDollsMod.Settings.desatColorsOn = nc; CustomDollsMod.Settings.Write(); Dolls.Invalidate(); }
                y += 26f;
                if (nc)
                {
                    if (Widgets.ButtonText(new Rect(12f, y, 96f, 22f), (desatOpen ? "▾ " : "▸ ") + Translator.Translate("NHTCD_DesatCustom").ToString()))
                        desatOpen = !desatOpen;
                    int offN = CountDesatOff();
                    if (offN > 0) Warn(new Rect(112f, y + 2f, view.width - 116f, 22f), Translator.Translate("NHTCD_DesatCustomUsed").ToString());
                    y += 26f;
                    if (desatOpen)
                    {
                        float h = Mathf.Min(200f, Mathf.Max(90f, DesatListHeight()));
                        Rect box = new Rect(4f, y, view.width - 8f, h);
                        Widgets.DrawMenuSection(box);
                        DrawDesatList(new Rect(box.x + 10f, box.y + 6f, box.width - 20f, box.height - 12f));
                        y += h + 6f;
                    }
                }
                bool tint = CustomDollsMod.Settings == null || CustomDollsMod.Settings.tintVanillaHair;
                bool nt = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_TintVanillaHair").ToString(), tint);
                if (CustomDollsMod.Settings != null && nt != tint) { CustomDollsMod.Settings.tintVanillaHair = nt; CustomDollsMod.Settings.Write(); Dolls.Invalidate(); }
                y += 26f;
                bool hartint = CustomDollsMod.Settings == null || CustomDollsMod.Settings.harHairTint;
                bool nh = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_HarHairTint").ToString(), hartint);
                if (CustomDollsMod.Settings != null && nh != hartint) { CustomDollsMod.Settings.harHairTint = nh; CustomDollsMod.Settings.Write(); Dolls.Invalidate(); }
                y += 28f;
                if (Widgets.ButtonText(new Rect(12f, y, 96f, 22f), (colorHelpOpen ? "▾ " : "▸ ") + Translator.Translate("NHTCD_ColorHelp").ToString()))
                    colorHelpOpen = !colorHelpOpen;
                y += 26f;
                if (colorHelpOpen)
                {
                    Note(new Rect(12f, y, view.width - 20f, 22f),
                        string.Format(Translator.Translate("NHTCD_DetectedVanillaRaces").ToString(), VanillaHairRaces()), 22f);
                    y += 22f;
                    Note(new Rect(12f, y, view.width - 20f, 44f), Translator.Translate("NHTCD_TintVanillaHint").ToString(), 44f);
                    y += 48f;
                }
                y += 4f;

                // ---- 坐标 ----
                H(view, y, Translator.Translate("NHTCD_SecCoord").ToString()); y += 36f;
                bool vcoords = CustomDollsMod.Settings != null && CustomDollsMod.Settings.vanillaHairUseEditor;
                bool nv = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_VanillaCoords").ToString(), vcoords);
                if (CustomDollsMod.Settings != null && nv != vcoords) { CustomDollsMod.Settings.vanillaHairUseEditor = nv; CustomDollsMod.Settings.Write(); Dolls.Invalidate(); }
                y += 26f;
                if (nv)
                {
                    if (Widgets.ButtonText(new Rect(12f, y, 96f, 22f), (vcoordOpen ? "▾ " : "▸ ") + Translator.Translate("NHTCD_DesatCustom").ToString()))
                        vcoordOpen = !vcoordOpen;
                    int offN2 = CustomDollsMod.Settings == null || CustomDollsMod.Settings.vanillaHairOff == null ? 0 : CustomDollsMod.Settings.vanillaHairOff.Count;
                    if (offN2 > 0) Warn(new Rect(112f, y + 2f, view.width - 116f, 22f), Translator.Translate("NHTCD_DesatCustomUsed").ToString());
                    y += 26f;
                    if (vcoordOpen)
                    {
                        List<string> vRaces = VanillaHairRaceList();
                        float h = Mathf.Min(180f, Mathf.Max(70f, 30f + vRaces.Count * 24f));
                        Rect box = new Rect(4f, y, view.width - 8f, h);
                        Widgets.DrawMenuSection(box);
                        Rect area = new Rect(box.x + 10f, box.y + 6f, box.width - 20f, box.height - 12f);
                        Rect vView = new Rect(0f, 0f, area.width - 20f, Mathf.Max(vRaces.Count * 24f, area.height - 4f));
                        Widgets.BeginScrollView(area, ref vcoordScroll, vView);
                        float yy = 0f;
                        for (int i = 0; i < vRaces.Count; i++)
                        {
                            string rc = vRaces[i];
                            bool on = !HairTuning.VanillaRaceOff(rc);
                            bool nn = Toggle(new Rect(8f, yy, vView.width - 8f, 24f), rc, on);
                            if (nn != on) HairTuning.SetVanillaRaceOff(rc, !nn);
                            yy += 24f;
                        }
                        Widgets.EndScrollView();
                        y += h + 6f;
                    }
                }
                bool afix = CustomDollsMod.Settings == null || CustomDollsMod.Settings.autoFixHair;
                bool naf = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_AutoFixHair").ToString(), afix);
                if (CustomDollsMod.Settings != null && naf != afix) { CustomDollsMod.Settings.autoFixHair = naf; CustomDollsMod.Settings.Write(); Dolls.Invalidate(); }
                y += 26f;
                if (Widgets.ButtonText(new Rect(12f, y, 160f, 22f), Translator.Translate("NHTCD_RecheckHair").ToString()))
                {
                    Bootstrap.ClearHairAutoFix();
                }
                y += 26f;
                bool hcoords = CustomDollsMod.Settings == null || CustomDollsMod.Settings.harHairUseEditor;
                bool nhc = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_HarHairCoords").ToString(), hcoords);
                if (CustomDollsMod.Settings != null && nhc != hcoords) { CustomDollsMod.Settings.harHairUseEditor = nhc; CustomDollsMod.Settings.Write(); Dolls.Invalidate(); }
                y += 34f;

                // ---- 调试 ----
                H(view, y, Translator.Translate("NHTCD_SecDebug").ToString()); y += 36f;
                bool dbg = CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug;
                bool nd = Toggle(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_Debug").ToString(), dbg);
                if (CustomDollsMod.Settings != null && nd != dbg) { CustomDollsMod.Settings.debug = nd; CustomDollsMod.Settings.Write(); }
                y += 34f;

                // ---- 种族与娃娃 ----
                H(view, y, Translator.Translate("NHTCD_SecAssign").ToString()); y += 36f;
                if (races.Count == 0)
                {
                    Note(new Rect(8f, y, view.width - 12f, 24f), Translator.Translate("NHTCD_NoDolls").ToString(), 24f);
                    y += 26f;
                }
                else
                {
                    for (int i = 0; i < races.Count; i++)
                    {
                        string race = races[i];
                        List<HumanlikeDoll> dolls = map[race];
                        GUI.color = new Color(0.82f, 0.88f, 0.92f);
                        Widgets.Label(new Rect(8f, y + 5f, 136f, 24f), race);
                        GUI.color = Color.white;
                        DrawPick(new Rect(140f, y, 136f, 26f), race, "*", "*", Translator.Translate("NHTCD_Default").ToString(), dolls);
                        DrawPick(new Rect(282f, y, 106f, 26f), race, "Male", "*", Translator.Translate("NHTCD_Male").ToString(), dolls);
                        DrawPick(new Rect(394f, y, 106f, 26f), race, "Female", "*", Translator.Translate("NHTCD_Female").ToString(), dolls);
                        if (Widgets.ButtonText(new Rect(506f, y, 86f, 26f), Translator.Translate("NHTCD_Body").ToString()))
                            OpenBodyMenu(race, dolls);
                        y += 32f;
                    }
                }

                Widgets.EndScrollView();
            }
            catch (Exception e)
            {
                Log.ErrorOnce("[NHT Custom Dolls] settings window failed: " + e, 0x4E434433);
            }
        }

        /* ---------------- 部位颜色（去色）---------------- */

        private static int CountDesatOff()
        {
            return CustomDollsMod.Settings != null && CustomDollsMod.Settings.desatOff != null
                ? CustomDollsMod.Settings.desatOff.Count : 0;
        }

        private static List<DesatPartsDef> DesatDefs()
        {
            List<DesatPartsDef> list = new List<DesatPartsDef>();
            foreach (DesatPartsDef d in DefDatabase<DesatPartsDef>.AllDefsListForReading)
            {
                if (d != null && d.parts != null && d.parts.Count > 0) list.Add(d);
            }
            list.Sort(delegate (DesatPartsDef a, DesatPartsDef b)
            {
                return string.Compare(a.defName, b.defName, StringComparison.OrdinalIgnoreCase);
            });
            return list;
        }

        private static float DesatListHeight()
        {
            float h = 0f;
            List<DesatPartsDef> defs = DesatDefs();
            for (int i = 0; i < defs.Count; i++) h += 22f + defs[i].parts.Count * 24f + 6f;
            return h + 34f;
        }

        private static void DrawDesatList(Rect area)
        {
            List<DesatPartsDef> defs = DesatDefs();
            if (defs.Count == 0)
            {
                Widgets.Label(area, Translator.Translate("NHTCD_DesatNoParts").ToString());
                return;
            }
            if (Widgets.ButtonText(new Rect(area.x, area.y, 110f, 24f), Translator.Translate("NHTCD_DesatReset").ToString()))
            {
                for (int i = 0; i < defs.Count; i++)
                {
                    DesatPartsDef d = defs[i];
                    for (int k = 0; k < d.parts.Count; k++)
                    {
                        DesatPartRef pr = d.parts[k];
                        if (pr == null) continue;
                        Desat.SetPartOn(d.race == "*" ? null : d.race, d.doll == "*" ? null : d.doll, pr.part, pr.id, true);
                    }
                }
            }

            Rect box = new Rect(area.x, area.y + 30f, area.width, Mathf.Max(60f, area.height - 30f));
            Rect view = new Rect(0f, 0f, area.width - 20f, Mathf.Max(DesatListHeight(), area.height - 30f));
            Widgets.BeginScrollView(box, ref desatScroll, view);
            float y = 0f;
            string lastGroup = null;
            for (int i = 0; i < defs.Count; i++)
            {
                DesatPartsDef d = defs[i];
                string group = !string.IsNullOrEmpty(d.label) ? d.label : d.defName;
                if (group != lastGroup)
                {
                    lastGroup = group;
                    GUI.color = new Color(0.75f, 0.82f, 0.85f);
                    Widgets.Label(new Rect(0f, y, view.width, 22f), group);
                    GUI.color = Color.white;
                    y += 22f;
                }
                for (int k = 0; k < d.parts.Count; k++)
                {
                    DesatPartRef pr = d.parts[k];
                    if (pr == null) continue;
                    string race = d.race == "*" ? null : d.race;
                    string doll = d.doll == "*" ? null : d.doll;
                    bool on = Desat.PartOn(race, doll, pr.part, pr.id);
                    string txt = (string.IsNullOrEmpty(pr.label) ? ("#" + pr.id) : pr.label) + "  (#" + pr.id + ")";
                    bool next = on;
                    Widgets.CheckboxLabeled(new Rect(12f, y, view.width - 12f, 24f), txt, ref next);
                    if (next != on) Desat.SetPartOn(race, doll, pr.part, pr.id, next);
                    y += 24f;
                }
                y += 6f;
            }
            Widgets.EndScrollView();
        }

        private static List<string> VanillaHairRaceList()
        {
            List<string> names = new List<string>();
            try
            {
                Dictionary<string, List<HumanlikeDoll>> map = Dolls.ByRace();
                if (map != null)
                {
                    List<string> keys = new List<string>(map.Keys);
                    keys.Sort(delegate (string a, string b) { return string.Compare(a, b, StringComparison.OrdinalIgnoreCase); });
                    for (int i = 0; i < keys.Count; i++)
                    {
                        ThingDef def = DefDatabase<ThingDef>.GetNamedSilentFail(keys[i]);
                        if (def == null) continue;
                        if (!Bootstrap.RaceHasHarHair(def)) names.Add(keys[i]);
                    }
                }
            }
            catch (Exception) { }
            return names;
        }

        private static string VanillaHairRaces()
        {
            List<string> names = VanillaHairRaceList();
            return names.Count == 0 ? Translator.Translate("NHTCD_None").ToString() : string.Join("、", names.ToArray());
        }

        private static void DrawPick(Rect r, string race, string gender, string body, string label, List<HumanlikeDoll> dolls)
        {
            string cur = Dolls.GetRule(race, gender, body);
            string text = label + ": " + (string.IsNullOrEmpty(cur) ? Translator.Translate("NHTCD_Auto").ToString() : Short(cur));
            if (!Widgets.ButtonText(r, text)) return;

            List<FloatMenuOption> opts = new List<FloatMenuOption>();
            opts.Add(new FloatMenuOption(label + " = " + Translator.Translate("NHTCD_Auto").ToString()
                + "（" + Translator.Translate("NHTCD_UseRacePatch").ToString() + "）",
                delegate { Dolls.SetRule(race, gender, body, null); }));
            AddDollOptions(opts, dolls, delegate (string defName) { Dolls.SetRule(race, gender, body, defName); });
            Find.WindowStack.Add(new FloatMenu(opts));
        }


        /// <summary>菜单项：先列该种族的补丁娃娃，再列基础 NHT 的体型娃娃</summary>
        private static void AddDollOptions(List<FloatMenuOption> opts, List<HumanlikeDoll> dolls, Action<string> pick)
        {
            if (dolls != null)
            {
                for (int i = 0; i < dolls.Count; i++)
                {
                    HumanlikeDoll d = dolls[i];
                    if (d == null) continue;
                    string defName = d.defName;
                    opts.Add(new FloatMenuOption(defName + Suffix(d), delegate { pick(defName); }));
                }
            }
            List<HumanlikeDoll> vanilla = Dolls.Vanilla();
            if (vanilla == null || vanilla.Count == 0) return;
            opts.Add(new FloatMenuOption("—— " + Translator.Translate("NHTCD_BaseDolls").ToString() + " ——", null));
            for (int i = 0; i < vanilla.Count; i++)
            {
                HumanlikeDoll d = vanilla[i];
                if (d == null) continue;
                string defName = d.defName;
                opts.Add(new FloatMenuOption(defName + Suffix(d) + " " + Translator.Translate("NHTCD_BaseTag").ToString(),
                    delegate { pick(defName); }));
            }
        }

        private static void OpenBodyMenu(string race, List<HumanlikeDoll> dolls)
        {
            List<FloatMenuOption> opts = new List<FloatMenuOption>();
            List<BodyTypeDef> bodies = DefDatabase<BodyTypeDef>.AllDefsListForReading;
            for (int i = 0; i < bodies.Count; i++)
            {
                BodyTypeDef b = bodies[i];
                string body = b.defName;
                string cur = Dolls.GetRule(race, "*", body);
                string label = b.defName + " = " + (string.IsNullOrEmpty(cur) ? Translator.Translate("NHTCD_Auto").ToString() : Short(cur));
                opts.Add(new FloatMenuOption(label, delegate
                {
                    List<FloatMenuOption> inner = new List<FloatMenuOption>();
                    inner.Add(new FloatMenuOption(Translator.Translate("NHTCD_Auto").ToString()
                        + "（" + Translator.Translate("NHTCD_UseRacePatch").ToString() + "）",
                        delegate { Dolls.SetRule(race, "*", body, null); }));
                    AddDollOptions(inner, dolls, delegate (string defName) { Dolls.SetRule(race, "*", body, defName); });
                    Find.WindowStack.Add(new FloatMenu(inner));
                }));
            }
            Find.WindowStack.Add(new FloatMenu(opts));
        }

        private static string Short(string defName)
        {
            if (string.IsNullOrEmpty(defName)) return Translator.Translate("NHTCD_Auto").ToString();
            return defName.Length <= 18 ? defName : defName.Substring(0, 17) + ".";
        }

        private static string Suffix(HumanlikeDoll d)
        {
            string g = string.IsNullOrEmpty(d.gender) ? "*" : d.gender;
            string b = string.IsNullOrEmpty(d.bodytype) ? "*" : d.bodytype;
            if (g == "*" && b == "*") return "";
            return " (" + g + "/" + b + ")";
        }
    }
}
