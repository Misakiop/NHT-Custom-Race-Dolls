using System;
using System.Reflection;
using HarmonyLib;
using RimWorld;
using UnityEngine;
using Verse;

namespace NHT_CustomDolls
{
    /* t120：加载期 shader 守卫
     *
     * 现象：启动时 ThingDef.PostLoad -> GraphicData.Init -> ShaderTypeDef.get_Shader，
     * 上游 Nice Health Tab 在这个 getter 上挂了前缀（Assets.ShaderFromAssetBundle），
     * 会把它的 Assets 静态构造提前拉起来；静态构造里 PrepareBodyPart() 去 ContentFinder.Get
     * 拿贴图，而此刻 mod 贴图还没挂载，于是刷出一大串
     * "Could not load Texture2D ... for def 'TextBook'"，且失败的 null 可能被缓存。
     *
     * 做法：只在「长事件（加载期）」窗口内接管 ShaderTypeDef.get_Shader，
     * 按原版逐字节等价的方式算结果（同一个 ShaderDatabase.LoadShader(ShaderTypeDef) 重载、
     * 写同一个 shaderInt 缓存字段），从而跳过包括 NH 在内的其它前缀。
     * 非加载期一律 return true，完全不影响运行期行为。
     *
     * 为什么要在 Mod 构造里装：Bootstrap 是 [StaticConstructorOnStartup]，跑在 def 加载之后，
     * 来不及拦 PostLoad。Mod 的构造在 def 加载之前，是唯一早于 PostLoad 的可靠时机。
     */
    internal static class ShaderLoadGuard
    {
        private static bool installed;
        private static int guarded;
        // 注意：不能写 AccessTools.FieldRef<ShaderTypeDef, Shader>——它是 ref 返回的委托类型，
        // 老 csc（/langversion:5）会报 CS0648「该语言不支持的类型」。这里直接反射字段，
        // 只在加载期调用几百次，代价可以忽略。
        private static readonly FieldInfo ShaderIntField = AccessTools.Field(typeof(ShaderTypeDef), "shaderInt");

        private static Shader ShaderIntOf(ShaderTypeDef def)
        {
            if (def == null || ShaderIntField == null) return null;
            return ShaderIntField.GetValue(def) as Shader;
        }

        public static void Install()
        {
            if (installed) return;
            installed = true;
            try
            {
                MethodInfo gs = AccessTools.Method(typeof(ShaderTypeDef), "get_Shader");
                if (gs == null)
                {
                    Log.Warning("[NHT shader] ShaderTypeDef.get_Shader not found; load-time shader guard skipped.");
                    return;
                }
                new Harmony("atian.nht.customdolls.shaderguard").Patch(
                    gs,
                    new HarmonyMethod(typeof(ShaderLoadGuard).GetMethod("Prefix", BindingFlags.Static | BindingFlags.NonPublic)),
                    null, null, null);
                Log.Message("[NHT shader] load-time guard installed (ShaderTypeDef.get_Shader)");
            }
            catch (Exception e)
            {
                Log.Warning("[NHT shader] guard install failed: " + e.GetType().Name + ": " + e.Message);
            }
        }

        // currentEvent / executingToExecuteWhenFinished 是 internal，C# 直接引用编译不过（CS0117），走反射。
        private static readonly FieldInfo CurrentEventField =
            AccessTools.Field(typeof(LongEventHandler), "currentEvent");
        private static readonly FieldInfo ExecutingFinishedField =
            AccessTools.Field(typeof(LongEventHandler), "executingToExecuteWhenFinished");

        /* 是否处于加载期（长事件收尾/执行中）。这里正是 ThingDef.PostLoad 跑的时机。 */
        private static bool LoadingPhase()
        {
            try
            {
                if (CurrentEventField != null && CurrentEventField.GetValue(null) != null) return true;
                if (ExecutingFinishedField != null && (bool)ExecutingFinishedField.GetValue(null)) return true;
                return LongEventHandler.AnyEventNowOrWaiting;
            }
            catch { return false; }
        }

        private static bool Prefix(ShaderTypeDef __instance, ref Shader __result)
        {
            if (__instance == null || !LoadingPhase()) return true;
            try
            {
                Shader cached = ShaderIntOf(__instance);
                if (cached != null) { __result = cached; return false; }
                Shader s = ShaderDatabase.LoadShader(__instance);
                if (ShaderIntField != null) ShaderIntField.SetValue(__instance, s);
                __result = s;
                guarded++;
                if (guarded == 1)
                {
                    Log.Message("[NHT shader] skipped mod shader patch during load (first def: " + __instance.defName + ")");
                }
                return false;
            }
            catch
            {
                return true;   // 任何异常都退回原版路径，绝不阻断加载
            }
        }
    }
}
