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

        public static void Draw(Rect inRect)
        {
            try
            {
                Dictionary<string, List<HumanlikeDoll>> map = Dolls.ByRace();
                string head = Translator.Translate("NHTCD_Header", map == null ? 0 : map.Count).ToString();
                Widgets.Label(new Rect(inRect.x, inRect.y, inRect.width, 44f), head);

                // ---- 显示设置 ----
                Rect optRect = new Rect(inRect.x, inRect.y + 46f, inRect.width, 26f);
                bool show = CustomDollsMod.Settings != null && CustomDollsMod.Settings.showHairInXray;
                Widgets.CheckboxLabeled(optRect, Translator.Translate("NHTCD_ShowHairInXray").ToString(), ref show);
                if (CustomDollsMod.Settings != null && show != CustomDollsMod.Settings.showHairInXray)
                {
                    CustomDollsMod.Settings.showHairInXray = show;
                    CustomDollsMod.Settings.Write();
                }

                Rect dbgRect = new Rect(inRect.x, inRect.y + 70f, inRect.width, 26f);
                bool dbg = CustomDollsMod.Settings != null && CustomDollsMod.Settings.debug;
                Widgets.CheckboxLabeled(dbgRect, Translator.Translate("NHTCD_Debug").ToString(), ref dbg);
                if (CustomDollsMod.Settings != null && dbg != CustomDollsMod.Settings.debug)
                {
                    CustomDollsMod.Settings.debug = dbg;
                    CustomDollsMod.Settings.Write();
                }

                // 默认策略说明（写死在设置页里，方便一眼看到）
                Rect hintRect = new Rect(inRect.x, inRect.y + 98f, inRect.width, 22f);
                GUI.color = new Color(0.72f, 0.78f, 0.8f);
                Widgets.Label(hintRect, Translator.Translate("NHTCD_DefaultHint").ToString());
                GUI.color = Color.white;

                Rect listRect = new Rect(inRect.x, inRect.y + 126f, inRect.width, inRect.height - 126f);
                if (map == null || map.Count == 0)
                {
                    Widgets.Label(listRect, Translator.Translate("NHTCD_NoDolls").ToString());
                    return;
                }

                List<string> races = new List<string>(map.Keys);
                races.Sort(delegate (string a, string b) { return string.Compare(a, b, StringComparison.OrdinalIgnoreCase); });

                float rowH = 30f;
                float contentH = races.Count * (rowH + 6f) + 10f;
                Rect view = new Rect(0f, 0f, listRect.width - 20f, Mathf.Max(contentH, listRect.height));
                Widgets.BeginScrollView(listRect, ref scroll, view);

                float y = 0f;
                for (int i = 0; i < races.Count; i++)
                {
                    string race = races[i];
                    List<HumanlikeDoll> dolls = map[race];
                    Rect row = new Rect(0f, y, view.width, rowH);

                    Widgets.Label(new Rect(row.x, row.y + 5f, 140f, 24f), race);

                    DrawPick(new Rect(row.x + 142f, row.y, 140f, 26f), race, "*", "*", Translator.Translate("NHTCD_Default").ToString(), dolls);
                    DrawPick(new Rect(row.x + 288f, row.y, 110f, 26f), race, "Male", "*", Translator.Translate("NHTCD_Male").ToString(), dolls);
                    DrawPick(new Rect(row.x + 404f, row.y, 110f, 26f), race, "Female", "*", Translator.Translate("NHTCD_Female").ToString(), dolls);
                    if (Widgets.ButtonText(new Rect(row.x + 520f, row.y, 90f, 26f), Translator.Translate("NHTCD_Body").ToString()))
                    {
                        OpenBodyMenu(race, dolls);
                    }
                    y += rowH + 6f;
                }

                Widgets.EndScrollView();
            }
            catch (Exception e)
            {
                Log.ErrorOnce("[NHT Custom Dolls] settings window failed: " + e, 0x4E434433);
            }
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
