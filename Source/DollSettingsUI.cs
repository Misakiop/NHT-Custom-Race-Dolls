using System;
using System.Collections.Generic;
using RimWorld;
using UnityEngine;
using Verse;
using NiceHealthTab;

namespace NHT_CustomDolls
{
    /// <summary>
    /// Settings page (t95 redesign).
    /// Layout: card rows on a scroll view, section headers with a subtitle,
    /// and a "Races" list where every race shows whether its ThingDef is actually loaded.
    /// </summary>
    public static class DollSettingsUI
    {
        // 上一帧设置页实际画到的底部（用于滚动范围兜底）
        private static float lastContentBottom;
        private static Vector2 scroll;
        private static Vector2 desatScroll;
        private static Vector2 vcoordScroll;
        private static Vector2 colorOffScroll;

        private static bool hairCoordOpen;
        private static bool vcoordOpen;
        private static bool desatOpen;
        private static bool colorOffOpen;

        // 种族与娃娃：默认折叠；搜索词与展开状态只保留在本次游戏会话内。
        private static bool racesOpen;
        private static string raceSearch = "";

        /* ---------------- palette ---------------- */

        private static readonly Color Accent = new Color(0.98f, 0.80f, 0.42f);
        private static readonly Color MutedCol = new Color(0.64f, 0.70f, 0.76f);
        private static readonly Color CardBg = new Color(1f, 1f, 1f, 0.045f);
        private static readonly Color TitleCol = new Color(0.90f, 0.94f, 0.98f);
        private static readonly Color OkCol = new Color(0.52f, 0.88f, 0.56f);
        private static readonly Color OffCol = new Color(0.86f, 0.52f, 0.46f);

        private const float X = 4f;          // left margin inside the scroll view
        private const float Pad = 8f;        // inner padding of a card
        private const float Gap = 6f;        // vertical gap between cards
        private const float RowH = 26f;
        private const float RaceCardH = 66f;

        // t122: the built-in RJW patches only do anything when this addon is enabled, so the
        // settings rows show whether it is active and stay read-only when it is not.
        private const string RjwAddonPackageId = "zoc2k.nicehealthtab.rjwgenitalia";

        private static string T(string key)
        {
            return Translator.Translate(key).ToString();
        }

        private static float W(Rect view)
        {
            return view.width - 12f;
        }

        private static void Fill(Rect r, Color c)
        {
            Color old = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(r, BaseContent.WhiteTex);
            GUI.color = old;
        }

        private static void Card(Rect r)
        {
            Fill(r, CardBg);
        }

        private static void Muted(Rect r, string text)
        {
            Color old = GUI.color;
            GUI.color = MutedCol;
            Widgets.Label(r, text);
            GUI.color = old;
        }

        /* ---------------- sections ---------------- */

        private static void Section(Rect view, ref float y, string titleKey, string subKey)
        {
            float w = W(view);
            Fill(new Rect(X + 4f, y + 3f, 3f, 18f), Accent);
            Text.Font = GameFont.Medium;
            Color old = GUI.color;
            GUI.color = TitleCol;
            string title = T(titleKey);
            float th = Text.CalcHeight(title, w - 12f);
            Widgets.Label(new Rect(X + 12f, y, w - 12f, th), title);
            GUI.color = old;
            Text.Font = GameFont.Small;
            y += th + 4f;
            if (!string.IsNullOrEmpty(subKey))
            {
                string sub = T(subKey);
                float h = Text.CalcHeight(sub, w - 12f);
                Muted(new Rect(X + 12f, y, w - 12f, h), sub);
                y += h + 2f;
            }
            Widgets.DrawLineHorizontal(X, y + 3f, w);
            y += 10f;
        }

        private static void Note(Rect view, ref float y, string key)
        {
            string s = T(key);
            float w = W(view);
            float h = Text.CalcHeight(s, w - 2f * Pad);
            Muted(new Rect(X + Pad, y, w - 2f * Pad, h), s);
            y += h + 4f;
        }

        /* ---------------- rows ---------------- */

        private static bool ToggleRow(Rect view, ref float y, string key, bool value, Action<bool> setter)
        {
            string label = T(key);
            float w = W(view);
            float textW = w - 2f * Pad - 26f;
            float h = Mathf.Max(RowH, Text.CalcHeight(label, textW) + 8f);
            Rect r = new Rect(X, y, w, h);
            Card(r);
            bool v = value;
            Widgets.Checkbox(new Vector2(r.x + Pad, r.y + (h - 24f) * 0.5f), ref v);
            Widgets.Label(new Rect(r.x + Pad + 26f, r.y + 4f, textW, h - 8f), label);
            if (v != value && setter != null) setter(v);
            y += h + Gap;
            return v;
        }

        // t122: a ToggleRow variant for the built-in patches: it also renders whether the mod the
        // patch belongs to is enabled, and keeps the switch read-only (greyed) when it is not.
        private static bool ToggleRowGated(Rect view, ref float y, string key, bool value, Action<bool> setter,
            bool modPresent, string presentKey, string absentKey)
        {
            string label = T(key);
            float w = W(view);
            float textW = w - 2f * Pad - 26f;
            float h = Mathf.Max(RowH, Text.CalcHeight(label, textW) + 8f);
            Rect r = new Rect(X, y, w, h);
            Card(r);
            bool v = value;
            Vector2 cb = new Vector2(r.x + Pad, r.y + (h - 24f) * 0.5f);
            if (modPresent)
            {
                Widgets.Checkbox(cb, ref v);
                Widgets.Label(new Rect(r.x + Pad + 26f, r.y + 4f, textW, h - 8f), label);
                if (v != value && setter != null) setter(v);
            }
            else
            {
                Color old = GUI.color;
                GUI.color = new Color(1f, 1f, 1f, 0.45f);
                Widgets.CheckboxDraw(cb.x, cb.y, value, true, 24f);
                Widgets.Label(new Rect(r.x + Pad + 26f, r.y + 4f, textW, h - 8f), label);
                GUI.color = old;
            }
            y += h + 2f;

            string s = T(modPresent ? presentKey : absentKey);
            float sh = Text.CalcHeight(s, w - 2f * Pad);
            Color c0 = GUI.color;
            GUI.color = modPresent ? OkCol : OffCol;
            Widgets.Label(new Rect(X + Pad, y, w - 2f * Pad, sh), "\u25cf " + s);
            GUI.color = c0;
            y += sh + Gap;
            return modPresent && value;
        }

        private static bool ModActive(string packageId)
        {
            if (string.IsNullOrEmpty(packageId))
            {
                return false;
            }
            try
            {
                List<ModContentPack> mods = LoadedModManager.RunningModsListForReading;
                for (int i = 0; i < mods.Count; i++)
                {
                    if (mods[i] != null && string.Equals(mods[i].PackageId, packageId, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
            }
            catch (Exception)
            {
            }
            try
            {
                return ModsConfig.IsActive(packageId);
            }
            catch (Exception)
            {
                return false;
            }
        }

        private static bool ExpandRow(Rect view, ref float y, string key, bool open)
        {
            float w = W(view);
            Rect r = new Rect(X, y, w, RowH);
            Card(r);
            if (Widgets.ButtonText(new Rect(r.x + 2f, r.y + 1f, w - 4f, RowH - 2f), (open ? "\u25be  " : "\u25b8  ") + T(key)))
                open = !open;
            y += RowH + Gap;
            return open;
        }

        private static bool ActionRow(Rect view, ref float y, string key)
        {
            float w = W(view);
            Rect r = new Rect(X, y, w, RowH);
            Card(r);
            bool hit = Widgets.ButtonText(new Rect(r.x + 2f, r.y + 1f, w - 4f, RowH - 2f), T(key));
            y += RowH + Gap;
            return hit;
        }

        private static bool SmallButton(Rect r, string label, string tip)
        {
            bool hit = Widgets.ButtonText(r, label);
            if (!string.IsNullOrEmpty(tip)) TooltipHandler.TipRegion(r, tip);
            return hit;
        }

        private static void ListBox(Rect view, ref float y, float h)
        {
            Rect box = new Rect(X, y, W(view), h);
            Widgets.DrawMenuSection(box);
            y += h + Gap;
        }

        /* ---------------- race status ---------------- */

        private static bool RaceLoaded(string race)
        {
            if (string.IsNullOrEmpty(race)) return false;
            try { return DefDatabase<ThingDef>.GetNamedSilentFail(race) != null; }
            catch (Exception) { return false; }
        }

        private static List<string> RaceList(Dictionary<string, List<HumanlikeDoll>> map)
        {
            List<string> list = new List<string>();
            try
            {
                List<RaceMarkerDef> markers = DefDatabase<RaceMarkerDef>.AllDefsListForReading;
                for (int i = 0; i < markers.Count; i++)
                {
                    RaceMarkerDef m = markers[i];
                    if (m == null || string.IsNullOrEmpty(m.race)) continue;
                    if (!list.Contains(m.race)) list.Add(m.race);
                }
            }
            catch (Exception) { }
            if (map != null)
            {
                foreach (string k in map.Keys)
                {
                    if (string.IsNullOrEmpty(k)) continue;
                    if (Dolls.IsBaseXenotype(k)) continue;   // t102：Kid 等基础体型的 xenotype 不是种族
                    if (!list.Contains(k)) list.Add(k);
                }
            }
            list.Sort(delegate (string a, string b) { return string.Compare(a, b, StringComparison.OrdinalIgnoreCase); });
            return list;
        }

        private static void Badge(Rect r, bool on)
        {
            Fill(r, on ? new Color(0.20f, 0.40f, 0.24f) : new Color(0.38f, 0.24f, 0.22f));
            Color old = GUI.color;
            GUI.color = on ? OkCol : OffCol;
            TextAnchor anchor = Text.Anchor;
            Text.Anchor = TextAnchor.MiddleCenter;
            Widgets.Label(r, T(on ? "NHTCD_Active" : "NHTCD_Inactive"));
            Text.Anchor = anchor;
            GUI.color = old;
        }

        private static string PickLabel(string race, string gender, string body, string label)
        {
            string cur = Dolls.GetRule(race, gender, body);
            string val = string.IsNullOrEmpty(cur) ? T("NHTCD_Auto") : Short(cur);
            string s = label + " \u00b7 " + val;
            return s.Length <= 16 ? s : s.Substring(0, 15) + "\u2026";
        }

        private static string FullPick(string race, string gender, string body, string label)
        {
            string cur = Dolls.GetRule(race, gender, body);
            return label + ": " + (string.IsNullOrEmpty(cur) ? T("NHTCD_Auto") : cur);
        }

        private static void RaceRow(Rect view, ref float y, string race, List<HumanlikeDoll> dolls)
        {
            bool loaded = RaceLoaded(race);
            float w = W(view);
            Rect r = new Rect(X, y, w, RaceCardH);
            Card(r);

            Color old = GUI.color;
            GUI.color = loaded ? TitleCol : MutedCol;
            Widgets.Label(new Rect(r.x + Pad, r.y + 5f, w - 2f * Pad - 84f, 22f), race);
            GUI.color = old;

            Badge(new Rect(r.x + w - 78f, r.y + 6f, 70f, 20f), loaded);

            float bx = r.x + Pad;
            float bw = (w - 2f * Pad - 3f * Gap) / 4f;
            float by = r.y + 32f;

            if (!loaded)
            {
                Muted(new Rect(bx, by + 4f, w - 2f * Pad, 22f), T("NHTCD_InactiveHint"));
                y += RaceCardH + Gap;
                return;
            }

            if (SmallButton(new Rect(bx, by, bw, RowH - 2f), PickLabel(race, "*", "*", T("NHTCD_Default")), FullPick(race, "*", "*", T("NHTCD_Default"))))
                OpenPick(race, "*", "*", T("NHTCD_Default"), dolls);
            bx += bw + Gap;
            if (SmallButton(new Rect(bx, by, bw, RowH - 2f), PickLabel(race, "Male", "*", T("NHTCD_Male")), FullPick(race, "Male", "*", T("NHTCD_Male"))))
                OpenPick(race, "Male", "*", T("NHTCD_Male"), dolls);
            bx += bw + Gap;
            if (SmallButton(new Rect(bx, by, bw, RowH - 2f), PickLabel(race, "Female", "*", T("NHTCD_Female")), FullPick(race, "Female", "*", T("NHTCD_Female"))))
                OpenPick(race, "Female", "*", T("NHTCD_Female"), dolls);
            bx += bw + Gap;
            if (SmallButton(new Rect(bx, by, bw, RowH - 2f), T("NHTCD_Body"), T("NHTCD_BodyHint")))
                OpenBodyMenu(race, dolls);

            y += RaceCardH + Gap;
        }

        /* ---------------- races fold ---------------- */

        /// <summary>标题行 + 右侧「已激活 N / M」计数，点击整行折叠/展开。</summary>
        private static bool FoldHeader(Rect view, ref float y, string titleKey, string subKey, bool open, int active, int total)
        {
            float w = W(view);
            string title = T(titleKey);
            Text.Font = GameFont.Medium;
            float th = Text.CalcHeight(title, w - 190f);
            Text.Font = GameFont.Small;
            float h = Mathf.Max(24f, th) + 6f;
            Rect r = new Rect(X, y, w, h);
            Card(r);
            Fill(new Rect(r.x + 4f, r.y + 3f, 3f, h - 6f), Accent);

            if (Widgets.ButtonInvisible(r))
                open = !open;

            Text.Font = GameFont.Medium;
            Color old = GUI.color;
            GUI.color = TitleCol;
            Widgets.Label(new Rect(r.x + 12f, r.y + 3f, w - 190f, th), (open ? "\u25be  " : "\u25b8  ") + title);
            GUI.color = old;
            Text.Font = GameFont.Small;

            string cnt = string.Format(T("NHTCD_RacesCount"), active, total);
            float cw = Mathf.Min(170f, Text.CalcSize(cnt).x + 18f);
            Rect cr = new Rect(r.x + w - cw - 8f, r.y + (h - 22f) * 0.5f, cw, 22f);
            Fill(cr, active > 0 ? new Color(0.20f, 0.40f, 0.24f) : new Color(0.38f, 0.24f, 0.22f));
            GUI.color = active > 0 ? OkCol : OffCol;
            TextAnchor a = Text.Anchor;
            Text.Anchor = TextAnchor.MiddleCenter;
            Widgets.Label(cr, cnt);
            Text.Anchor = a;
            GUI.color = old;

            y += h + Gap;
            if (open && !string.IsNullOrEmpty(subKey))
            {
                string sub = T(subKey);
                float sh = Text.CalcHeight(sub, w - 12f);
                Muted(new Rect(X + 12f, y, w - 12f, sh), sub);
                y += sh + 2f;
            }
            return open;
        }

        private static void RaceSearchRow(Rect view, ref float y)
        {
            float w = W(view);
            Rect r = new Rect(X, y, w, RowH);
            Card(r);
            Rect tf = new Rect(r.x + 8f, r.y + 2f, w - 8f - 40f, RowH - 4f);
            GUI.SetNextControlName("NHTCD_RaceSearch");
            string next = Widgets.TextField(tf, raceSearch ?? "");
            if (next != raceSearch) raceSearch = next;
            if (string.IsNullOrEmpty(raceSearch))
            {
                Color old = GUI.color;
                GUI.color = MutedCol;
                Widgets.Label(new Rect(tf.x + 4f, tf.y + 2f, tf.width - 8f, tf.height - 4f), T("NHTCD_RacesSearchHint"));
                GUI.color = old;
            }
            if (Widgets.ButtonText(new Rect(r.x + w - 34f, r.y + 2f, 26f, RowH - 4f), "\u00d7"))
                raceSearch = "";
            if (Event.current != null && Event.current.type == EventType.KeyDown
                && Event.current.keyCode == KeyCode.Escape
                && GUI.GetNameOfFocusedControl() == "NHTCD_RaceSearch")
            {
                raceSearch = "";
                GUI.FocusControl(null);
                Event.current.Use();
            }
            y += RowH + Gap;
        }

        private static bool RaceMatches(string race, string query, List<HumanlikeDoll> dolls)
        {
            if (string.IsNullOrEmpty(query)) return true;
            if (race.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0) return true;
            if (dolls != null)
            {
                for (int i = 0; i < dolls.Count; i++)
                {
                    HumanlikeDoll d = dolls[i];
                    if (d != null && !string.IsNullOrEmpty(d.defName)
                        && d.defName.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0) return true;
                }
            }
            CustomDollsSettings st = CustomDollsMod.Settings;
            if (st != null && st.rules != null)
            {
                string prefix = race + "|";
                foreach (KeyValuePair<string, string> kv in st.rules)
                {
                    if (string.IsNullOrEmpty(kv.Key) || !kv.Key.StartsWith(prefix, StringComparison.Ordinal)) continue;
                    if (!string.IsNullOrEmpty(kv.Value)
                        && kv.Value.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0) return true;
                }
            }
            return false;
        }

        /// <summary>搜索结果 + 已激活优先的显示顺序（不改变原始列表）。</summary>
        private static List<string> BuildRaceDisplay(List<string> races, Dictionary<string, List<HumanlikeDoll>> map)
        {
            string q = (raceSearch ?? "").Trim();
            List<string> shown = new List<string>();
            for (int i = 0; i < races.Count; i++)
            {
                string rc = races[i];
                List<HumanlikeDoll> dolls = (map != null && map.ContainsKey(rc)) ? map[rc] : null;
                if (RaceMatches(rc, q, dolls)) shown.Add(rc);
            }
            shown.Sort(delegate (string a, string b)
            {
                bool la = RaceLoaded(a), lb = RaceLoaded(b);
                if (la != lb) return la ? -1 : 1;
                return string.Compare(a, b, StringComparison.OrdinalIgnoreCase);
            });
            return shown;
        }

        /* ---------------- main ---------------- */

        public static void Draw(Rect inRect)
        {
            try
            {
                CustomDollsSettings st = CustomDollsMod.Settings;
                Dictionary<string, List<HumanlikeDoll>> map = null;
                try { map = Dolls.ByRace(); }
                catch (Exception) { map = null; }

                List<string> races = RaceList(map);
                int loadedCount = 0;
                for (int i = 0; i < races.Count; i++) if (RaceLoaded(races[i])) loadedCount++;

                List<string> raceShown = BuildRaceDisplay(races, map);
                int raceRows = racesOpen ? raceShown.Count : 0;
                float est = 760f + raceRows * (RaceCardH + Gap)
                    + (racesOpen ? RowH + Gap + 44f : 0f) // search row + fold subtitle
                    + (hairCoordOpen ? 210f : 0f) + (vcoordOpen ? 200f : 0f)
                    + (desatOpen ? 250f : 0f) + (colorOffOpen ? 240f : 0f)
                    + 350f; // built-in patches: title + sub + 2 toggles + 2 wrapped hints, plus slack
                // 用上一帧实际画到的底部兜底：分区展开/新增开关后，手算 est 容易偏小，
                // 导致滚动条到底了但下面还有内容（内容被裁剪）。
                est = Mathf.Max(est, lastContentBottom + 40f);
                Rect view = new Rect(0f, 0f, inRect.width - 20f, est);
                Widgets.BeginScrollView(inRect, ref scroll, view);

                float y = 4f;

                string header = string.Format(T("NHTCD_Header"), loadedCount, races.Count);
                float hh = Text.CalcHeight(header, W(view) - 2f * Pad);
                Card(new Rect(X, y, W(view), hh + 2f * Pad));
                Muted(new Rect(X + Pad, y + Pad, W(view) - 2f * Pad, hh), header);
                y += hh + 2f * Pad + Gap + 4f;

                // ---- races & dolls (first: this is what people come here for) ----
                racesOpen = FoldHeader(view, ref y, "NHTCD_SecAssign", "NHTCD_SecAssignSub", racesOpen, loadedCount, races.Count);
                if (racesOpen)
                {
                    RaceSearchRow(view, ref y);
                    if (races.Count == 0)
                    {
                        Note(view, ref y, "NHTCD_NoDolls");
                    }
                    else if (raceShown.Count == 0)
                    {
                        Note(view, ref y, "NHTCD_RacesNoMatch");
                    }
                    else
                    {
                        for (int i = 0; i < raceShown.Count; i++)
                        {
                            List<HumanlikeDoll> dolls = (map != null && map.ContainsKey(raceShown[i])) ? map[raceShown[i]] : null;
                            RaceRow(view, ref y, raceShown[i], dolls);
                        }
                    }
                }
                y += 6f;

                // ---- hair ----
                Section(view, ref y, "NHTCD_SecHair", "NHTCD_SecHairSub");
                ToggleRow(view, ref y, "NHTCD_TintVanillaHair", st == null || st.tintVanillaHair, delegate (bool v)
                {
                    if (st != null) { st.tintVanillaHair = v; st.Write(); Dolls.Invalidate(); }
                });
                ToggleRow(view, ref y, "NHTCD_HarHairTint", st == null || st.harHairTint, delegate (bool v)
                {
                    if (st != null) { st.harHairTint = v; st.Write(); Dolls.Invalidate(); }
                });
                ToggleRow(view, ref y, "NHTCD_EnableHairOverlay", st == null || st.enableHairTintOverlay, delegate (bool v)
                {
                    if (st != null) { st.enableHairTintOverlay = v; st.Write(); Dolls.Invalidate(); }
                });
                ToggleRow(view, ref y, "NHTCD_ShowHairInXray", st != null && st.showHairInXray, delegate (bool v)
                {
                    if (st != null) { st.showHairInXray = v; st.Write(); }
                });
                ToggleRow(view, ref y, "NHTCD_DrawAllHairLayers", st != null && st.drawAllHairLayers, delegate (bool v)
                {
                    if (st != null) { st.drawAllHairLayers = v; st.Write(); Bootstrap.ResetHairState(); Dolls.Invalidate(); }
                });
                ToggleRow(view, ref y, "NHTCD_NonHarHairShadow", st == null || st.nonHarHairShadow, delegate (bool v)
                {
                    if (st != null) { st.nonHarHairShadow = v; st.Write(); Dolls.Invalidate(); }
                });

                bool hcoords = st == null || st.harHairUseEditor;
                hairCoordOpen = ExpandRow(view, ref y, "NHTCD_HairCoords", hairCoordOpen);
                if (hairCoordOpen)
                {
                    Note(view, ref y, "NHTCD_HarHairCoordsHint");
                    bool nc = ToggleRow(view, ref y, "NHTCD_HarHairCoords", hcoords, delegate (bool v)
                    {
                        if (st != null) { st.harHairUseEditor = v; st.Write(); Dolls.Invalidate(); }
                    });
                    bool vcoords = st != null && st.vanillaHairUseEditor;
                    bool nv = ToggleRow(view, ref y, "NHTCD_VanillaCoords", vcoords, delegate (bool v)
                    {
                        if (st != null) { st.vanillaHairUseEditor = v; st.Write(); Dolls.Invalidate(); }
                    });
                    if (nv)
                    {
                        vcoordOpen = ExpandRow(view, ref y, "NHTCD_DetectedVanillaRaces", vcoordOpen);
                        if (vcoordOpen)
                        {
                            List<string> vRaces = VanillaHairRaceList();
                            if (vRaces.Count == 0)
                            {
                                Note(view, ref y, "NHTCD_None");
                            }
                            else
                            {
                                float h = Mathf.Min(200f, Mathf.Max(60f, 12f + vRaces.Count * 26f));
                                Rect box = new Rect(X, y, W(view), h);
                                Widgets.DrawMenuSection(box);
                                Rect area = new Rect(box.x + Pad, box.y + 6f, box.width - 2f * Pad, box.height - 12f);
                                Rect vView = new Rect(0f, 0f, area.width - 20f, Mathf.Max(vRaces.Count * 26f, area.height - 4f));
                                Widgets.BeginScrollView(area, ref vcoordScroll, vView);
                                float yy = 0f;
                                for (int i = 0; i < vRaces.Count; i++)
                                {
                                    string rc = vRaces[i];
                                    bool on = !HairTuning.VanillaRaceOff(rc);
                                    bool nn = on;
                                    Widgets.CheckboxLabeled(new Rect(4f, yy, vView.width - 8f, 24f), rc, ref nn);
                                    if (nn != on) HairTuning.SetVanillaRaceOff(rc, !nn);
                                    yy += 26f;
                                }
                                Widgets.EndScrollView();
                                y += h + Gap;
                            }
                        }
                    }
                    ToggleRow(view, ref y, "NHTCD_AutoFixHair", st == null || st.autoFixHair, delegate (bool v)
                    {
                        if (st != null) { st.autoFixHair = v; st.Write(); Dolls.Invalidate(); }
                    });
                    if (ActionRow(view, ref y, "NHTCD_RecheckHair")) Bootstrap.ClearHairAutoFix();
                }
                y += 6f;

                // ---- colors ----
                Section(view, ref y, "NHTCD_SecColor", "NHTCD_SecColorSub");
                bool colorsOn = st == null || st.desatColorsOn;
                ToggleRow(view, ref y, "NHTCD_DesatColors", colorsOn, delegate (bool v)
                {
                    if (st != null) { st.desatColorsOn = v; st.Write(); Dolls.Invalidate(); }
                });
                if (colorsOn)
                {
                    int offN = CountDesatOff();
                    if (offN > 0) Note(view, ref y, "NHTCD_DesatCustomUsed");
                    desatOpen = ExpandRow(view, ref y, "NHTCD_DesatCustom", desatOpen);
                    if (desatOpen)
                    {
                        float h = Mathf.Min(220f, Mathf.Max(90f, DesatListHeight()));
                        Rect box = new Rect(X, y, W(view), h);
                        Widgets.DrawMenuSection(box);
                        DrawDesatList(new Rect(box.x + Pad, box.y + 6f, box.width - 2f * Pad, box.height - 12f));
                        y += h + Gap;
                    }
                }
                ToggleRow(view, ref y, "NHTCD_EnableColorVariants", st == null || st.enableColorVariants, delegate (bool v)
                {
                    if (st != null) { st.enableColorVariants = v; st.Write(); Dolls.Invalidate(); }
                });
                colorOffOpen = ExpandRow(view, ref y, "NHTCD_ColorOffRaces", colorOffOpen);
                if (colorOffOpen)
                {
                    List<string> colorRaces = new List<string>(races);
                    if (st != null && st.colorOffRaces != null)
                    {
                        for (int i = 0; i < st.colorOffRaces.Count; i++)
                        {
                            string rc = st.colorOffRaces[i];
                            if (!string.IsNullOrEmpty(rc) && !colorRaces.Contains(rc)) colorRaces.Add(rc);
                        }
                    }
                    colorRaces.Sort(delegate (string a, string b) { return string.Compare(a, b, StringComparison.OrdinalIgnoreCase); });
                    float h = Mathf.Min(220f, Mathf.Max(70f, 30f + colorRaces.Count * 26f));
                    Rect box = new Rect(X, y, W(view), h);
                    Widgets.DrawMenuSection(box);
                    Rect area = new Rect(box.x + Pad, box.y + 6f, box.width - 2f * Pad, box.height - 12f);
                    Rect cView = new Rect(0f, 0f, area.width - 20f, Mathf.Max(colorRaces.Count * 26f, area.height - 4f));
                    Widgets.BeginScrollView(area, ref colorOffScroll, cView);
                    float yy = 0f;
                    for (int i = 0; i < colorRaces.Count; i++)
                    {
                        string rc = colorRaces[i];
                        bool on = !HairTuning.ColorOff(rc);
                        bool nn = on;
                        Widgets.CheckboxLabeled(new Rect(4f, yy, cView.width - 8f, 24f), rc, ref nn);
                        if (nn != on) HairTuning.SetColorOff(rc, !nn);
                        yy += 26f;
                    }
                    Widgets.EndScrollView();
                    y += h + Gap;
                }
                y += 6f;

                // ---- addons ----
                Section(view, ref y, "NHTCD_SecAddons", "NHTCD_SecAddonsSub");
                ToggleRow(view, ref y, "NHTCD_EnableAddonFollow", st == null || st.enableAddonFollow, delegate (bool v)
                {
                    if (st != null) { st.enableAddonFollow = v; st.Write(); Dolls.Invalidate(); }
                });
                ToggleRow(view, ref y, "NHTCD_EnableHitboxOffset", st == null || st.enableHitboxOffset, delegate (bool v)
                {
                    if (st != null) { st.enableHitboxOffset = v; st.Write(); Dolls.Invalidate(); }
                });
                Note(view, ref y, "NHTCD_AddonsHint");
                y += 6f;

                // ---- debug ----
                Section(view, ref y, "NHTCD_SecDebug", "NHTCD_SecDebugSub");
                ToggleRow(view, ref y, "NHTCD_Debug", st != null && st.debug, delegate (bool v)
                {
                    if (st != null) { st.debug = v; st.Write(); }
                });
                if (ActionRow(view, ref y, "NHTCD_ResetHairDiag")) Bootstrap.ResetHairDiag();
                y += 6f;

                // ---- built-in patches ----
                Section(view, ref y, "NHTCD_SecBuiltinPatches", "NHTCD_SecBuiltinPatchesSub");
                bool rjwAddon = ModActive(RjwAddonPackageId);
                ToggleRowGated(view, ref y, "NHTCD_RjwLayoutAdapt", st != null && st.rjwLayoutAdapt, delegate (bool v)
                {
                    if (st != null) { st.rjwLayoutAdapt = v; st.Write(); }
                }, rjwAddon, "NHTCD_RjwAddonPresent", "NHTCD_RjwAddonAbsent");
                Note(view, ref y, "NHTCD_RjwLayoutAdaptHint");
                ToggleRowGated(view, ref y, "NHTCD_RjwHairOverChest", st != null && st.rjwHairOverChest, delegate (bool v)
                {
                    if (st != null) { st.rjwHairOverChest = v; st.Write(); }
                }, rjwAddon, "NHTCD_RjwAddonPresent", "NHTCD_RjwAddonAbsent");
                Note(view, ref y, "NHTCD_RjwHairOverChestHint");

                lastContentBottom = y + 8f;
                Widgets.EndScrollView();
            }
            catch (Exception e)
            {
                Log.ErrorOnce("[NHT Custom Dolls] settings window failed: " + e, 0x4E434433);
            }
        }

        /* ---------------- desat list ---------------- */

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
            if (Widgets.ButtonText(new Rect(area.x, area.y, 120f, 24f), Translator.Translate("NHTCD_DesatReset").ToString()))
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
                string group = NhtL10n.Tr(!string.IsNullOrEmpty(d.label) ? d.label : d.defName);   // t113
                if (group != lastGroup)
                {
                    lastGroup = group;
                    Color old = GUI.color;
                    GUI.color = MutedCol;
                    Widgets.Label(new Rect(0f, y, view.width, 22f), group);
                    GUI.color = old;
                    y += 22f;
                }
                for (int k = 0; k < d.parts.Count; k++)
                {
                    DesatPartRef pr = d.parts[k];
                    if (pr == null) continue;
                    string race = d.race == "*" ? null : d.race;
                    string doll = d.doll == "*" ? null : d.doll;
                    bool on = Desat.PartOn(race, doll, pr.part, pr.id);
                    string txt = (string.IsNullOrEmpty(pr.label) ? ("#" + pr.id) : NhtL10n.Tr(pr.label)) + "  (#" + pr.id + ")";   // t113
                    bool next = on;
                    Widgets.CheckboxLabeled(new Rect(12f, y, view.width - 12f, 24f), txt, ref next);
                    if (next != on) Desat.SetPartOn(race, doll, pr.part, pr.id, next);
                    y += 24f;
                }
                y += 6f;
            }
            Widgets.EndScrollView();
        }

        /* ---------------- helpers for picks ---------------- */

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

        private static void OpenPick(string race, string gender, string body, string label, List<HumanlikeDoll> dolls)
        {
            List<FloatMenuOption> opts = new List<FloatMenuOption>();
            opts.Add(new FloatMenuOption(label + " = " + Translator.Translate("NHTCD_Auto").ToString()
                + " (" + Translator.Translate("NHTCD_UseRacePatch").ToString() + ")",
                delegate { Dolls.SetRule(race, gender, body, null); }));
            AddDollOptions(opts, dolls, delegate (string defName) { Dolls.SetRule(race, gender, body, defName); });
            Find.WindowStack.Add(new FloatMenu(opts));
        }

        /// <summary>Menu: this race's patch dolls first, then the base NHT bodies.</summary>
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
            string baseTag = Translator.Translate("NHTCD_BaseDolls").ToString();
            for (int i = 0; i < vanilla.Count; i++)
            {
                HumanlikeDoll d = vanilla[i];
                if (d == null) continue;
                string defName = d.defName;
                opts.Add(new FloatMenuOption("[" + baseTag + "] " + defName + Suffix(d) + " " + Translator.Translate("NHTCD_BaseTag").ToString(),
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
                        + " (" + Translator.Translate("NHTCD_UseRacePatch").ToString() + ")",
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
