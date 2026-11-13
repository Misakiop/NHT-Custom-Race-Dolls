using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Text;
using HarmonyLib;
using UnityEngine;
using Verse;
using NiceHealthTab;

namespace NHT_CustomDolls
{
    /* 诊断输出：把游戏里实际生效的 Moyo 部位、变体、绘制参数全部打到 Player.log。
       目的不是猜，而是看清：
       - DollBodyPartDef 实际 defName / imagePath / width / height / tex 是否存在
       - HumanlikeDoll.Parts 里实际引用了哪些部位
       - ColorVariantDef 的 part 是否和实际 defName 对得上
       - 绘制时 ApplyColorVariant 命中了哪个变体、替换成哪个贴图、宽高被改成多少
    */
    [StaticConstructorOnStartup]
    public static class NHTCD_Diag
    {
        private static readonly FieldInfo FDefName = AccessTools.Field(typeof(DollBodyPartDef), "defName");
        private static readonly FieldInfo FDollName = AccessTools.Field(typeof(DollBodyPartDef), "dollName");
        private static readonly FieldInfo FImagePath = AccessTools.Field(typeof(DollBodyPartDef), "imagePath");
        private static readonly FieldInfo FPosition = AccessTools.Field(typeof(DollBodyPartDef), "position");
        private static readonly FieldInfo FWidth = AccessTools.Field(typeof(DollBodyPartDef), "width");
        private static readonly FieldInfo FHeight = AccessTools.Field(typeof(DollBodyPartDef), "height");
        private static readonly FieldInfo FLayer = AccessTools.Field(typeof(DollBodyPartDef), "layer");
        private static readonly FieldInfo FBodyPartId = AccessTools.Field(typeof(DollBodyPartDef), "bodyPartId");
        private static readonly FieldInfo FVisible = AccessTools.Field(typeof(DollBodyPartDef), "visibleByDefault");
        private static readonly FieldInfo FTex = AccessTools.Field(typeof(DollBodyPartDef), "tex");
        private static readonly FieldInfo FHitbox = AccessTools.Field(typeof(DollBodyPartDef), "hitboxScale");

        static NHTCD_Diag()
        {
            // t123：debug 关闭时不再于启动阶段输出整份 def/部位参数 dump（此前每局固定 100+ 行）。
            if (!Dolls.DebugOn) return;
            try { Dump(); }
            catch (Exception e) { Log.Error("[NHTCD-DIAG] dump failed: " + e); }
        }

        private static object G(object o, FieldInfo f)
        {
            if (o == null || f == null) return null;
            try { return f.GetValue(o); } catch (Exception) { return null; }
        }

        private static string S(object o)
        {
            if (o == null) return "";
            try { return Convert.ToString(o); } catch (Exception) { return ""; }
        }

        private static string PartLine(DollBodyPartDef d)
        {
            if (d == null) return "";
            object pos = G(d, FPosition);
            string posS = "";
            try { posS = pos == null ? "" : pos.ToString(); } catch (Exception) { }
            Texture2D tex = G(d, FTex) as Texture2D;
            return string.Concat(
                "defName=", S(G(d, FDefName)),
                " doll=", S(G(d, FDollName)),
                " img=", S(G(d, FImagePath)),
                " w=", S(G(d, FWidth)),
                " h=", S(G(d, FHeight)),
                " pos=", posS,
                " layer=", S(G(d, FLayer)),
                " bid=", S(G(d, FBodyPartId)),
                " vis=", S(G(d, FVisible)),
                " hb=", S(G(d, FHitbox)),
                " tex=", tex == null ? "NULL" : (tex.width + "x" + tex.height));
        }

        private static bool IsMoyo(string s)
        {
            return !string.IsNullOrEmpty(s) && s.IndexOf("Moyo", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        public static void Dump()
        {
            Log.Message("[NHTCD-DIAG] ===== DUMP BEGIN =====");
            int n = 0;
            foreach (DollBodyPartDef d in DefDatabase<DollBodyPartDef>.AllDefsListForReading)
            {
                if (d == null) continue;
                string dn = S(G(d, FDefName));
                string doll = S(G(d, FDollName));
                if (!IsMoyo(dn) && !IsMoyo(doll)) continue;
                Log.Message("[NHTCD-DIAG] DEF " + PartLine(d));
                n++;
            }
            Log.Message("[NHTCD-DIAG] body parts=" + n);

            foreach (HumanlikeDoll doll in DefDatabase<HumanlikeDoll>.AllDefsListForReading)
            {
                if (doll == null) continue;
                string dn = S(G(doll, AccessTools.Field(typeof(HumanlikeDoll), "defName")));
                if (!IsMoyo(dn)) continue;
                object partsObj = G(doll, AccessTools.Field(typeof(HumanlikeDoll), "Parts"));
                IList parts = partsObj as IList;
                Log.Message("[NHTCD-DIAG] DOLL " + dn + " parts=" + (parts == null ? "NULL" : parts.Count.ToString()));
                if (parts != null)
                {
                    for (int i = 0; i < parts.Count; i++)
                    {
                        DollBodyPartDef pd = parts[i] as DollBodyPartDef;
                        if (pd != null) Log.Message("[NHTCD-DIAG]   PART[" + i + "] " + PartLine(pd));
                    }
                }
            }

            foreach (ColorVariantDef v in DefDatabase<ColorVariantDef>.AllDefsListForReading)
            {
                if (v == null) continue;
                if (!IsMoyo(v.race) && !IsMoyo(v.defName)) continue;
                Log.Message("[NHTCD-DIAG] VARIANT " + v.defName + " race=" + v.race + " body=" + v.bodyType
                    + " genes=" + Join(v.genes) + " notGenes=" + Join(v.notGenes)
                    + " xeno=" + v.xenotype + " hediff=" + v.hediff + " pri=" + v.priority
                    + " parts=" + (v.parts == null ? 0 : v.parts.Count));
                if (v.parts == null) continue;
                for (int i = 0; i < v.parts.Count; i++)
                {
                    ColorVariantPart p = v.parts[i];
                    if (p == null) continue;
                    Log.Message("[NHTCD-DIAG]   VPART part=" + p.part + " img=" + p.imagePath
                        + " gray=" + p.grayPath + " x=" + p.x + " y=" + p.y + " w=" + p.width + " h=" + p.height);
                }
            }

            foreach (DesatPartsDef d in DefDatabase<DesatPartsDef>.AllDefsListForReading)
            {
                if (d == null) continue;
                if (!IsMoyo(d.race) && !IsMoyo(d.defName)) continue;
                Log.Message("[NHTCD-DIAG] DESAT " + d.defName + " race=" + d.race + " doll=" + d.doll
                    + " parts=" + (d.parts == null ? 0 : d.parts.Count));
                if (d.parts == null) continue;
                for (int i = 0; i < d.parts.Count; i++)
                {
                    DesatPartRef p = d.parts[i];
                    if (p == null) continue;
                    Log.Message("[NHTCD-DIAG]   DPART part=" + p.part + " id=" + p.id + " label=" + p.label);
                }
            }
            Log.Message("[NHTCD-DIAG] ===== DUMP END =====");
        }

        private static string Join(List<string> list)
        {
            if (list == null || list.Count == 0) return "";
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < list.Count; i++)
            {
                if (i > 0) sb.Append(",");
                sb.Append(list[i]);
            }
            return sb.ToString();
        }

        public static void LogDraw(DollBodyPartDef part, Pawn pawn, string baseName, bool isGray,
            string hitDef, string usePath, Texture2D tex, string oldPath, float oldW, float oldH,
            float newW, float newH, string why)
        {
            if (CustomDollsMod.Settings == null || !CustomDollsMod.Settings.debug) return;
            // t10-P13：ApplyColorVariant 每个部位每帧都会调用 —— 同 (部位|原因|灰) 只打一条，
            // 并计入统一限流上限（否则 t7 那种 1.5 秒就把 Player.log 额度烧光）
            if (!Dolls.LogOnce("diag:" + baseName + "|" + why + "|" + isGray)) return;
            try
            {
                string genes = "";
                if (pawn != null && pawn.genes != null)
                {
                    List<Gene> list = pawn.genes.GenesListForReading;
                    if (list != null)
                    {
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < list.Count; i++)
                        {
                            Gene g = list[i];
                            if (g == null || g.def == null) continue;
                            if (g.def.defName == null || g.def.defName.IndexOf("Moyo", StringComparison.OrdinalIgnoreCase) < 0) continue;
                            if (sb.Length > 0) sb.Append(",");
                            sb.Append(g.def.defName);
                        }
                        genes = sb.ToString();
                    }
                }
                Log.Message("[NHTCD-DIAG] DRAW part=" + (part == null ? "NULL" : S(G(part, FDefName)))
                    + " base=" + baseName + " gray=" + isGray
                    + " race=" + (pawn != null && pawn.def != null ? pawn.def.defName : "")
                    + " body=" + (pawn != null && pawn.story != null && pawn.story.bodyType != null ? pawn.story.bodyType.defName : "")
                    + " genes=" + genes
                    + " hit=" + hitDef + " use=" + usePath
                    + " tex=" + (tex == null ? "NULL" : (tex.width + "x" + tex.height))
                    + " oldImg=" + oldPath + " oldW=" + oldW + " oldH=" + oldH
                    + " newW=" + newW + " newH=" + newH
                    + " why=" + why);
            }
            catch (Exception e) { Log.Error("[NHTCD-DIAG] LogDraw failed: " + e); }
        }
    }
}
