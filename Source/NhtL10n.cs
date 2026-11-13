using System;
using System.Collections.Generic;
using Verse;

namespace NHT_CustomDolls
{
    /// <summary>
    /// 补丁里导出的部位名是中文（尾巴 / 左耳 / 左腮 …），它们存在
    /// DesatPartsDef.parts 的列表项里，DefInjected 无法覆盖列表项，
    /// 所以英文界面下在这里做一次查表翻译。中文界面原样返回。
    /// </summary>
    internal static class NhtL10n
    {
        private static readonly Dictionary<string, string> Map =
            new Dictionary<string, string>(StringComparer.Ordinal)
        {
            { "尾巴", "Tail" },
            { "尾巴尖", "Tail tip" },
            { "左耳", "Left ear" },
            { "右耳", "Right ear" },
            { "耳朵", "Ear" },
            { "左角", "Left horn" },
            { "右角", "Right horn" },
            { "角", "Horn" },
            { "灵角", "Spirit horn" },
            { "左触角", "Left antenna" },
            { "右触角", "Right antenna" },
            { "左触角·反光", "Left antenna (glow)" },
            { "右触角·反光", "Right antenna (glow)" },
            { "左天线", "Left antenna" },
            { "右天线", "Right antenna" },
            { "左腮", "Left gill" },
            { "右腮", "Right gill" },
            { "腮", "Gill" },
            { "左翼", "Left wing" },
            { "右翼", "Right wing" },
            { "翅膀", "Wing" },
            { "光环", "Halo" },
            { "呆毛", "Ahoge" },
            { "提灯", "Lantern" },
            { "前发", "Front hair" },
            { "后发", "Back hair" },
            { "躯干", "Torso" },
            { "头", "Head" },
            { "手", "Hand" },
            { "脚", "Foot" },
        };

        private static string cachedLang;
        private static bool useChinese = true;

        private static void Refresh()
        {
            string folder = "";
            try
            {
                if (LanguageDatabase.activeLanguage != null)
                    folder = LanguageDatabase.activeLanguage.folderName ?? "";
            }
            catch (Exception) { }
            if (folder == cachedLang) return;
            cachedLang = folder;
            useChinese = folder.IndexOf("Chinese", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        internal static string Tr(string s)
        {
            if (string.IsNullOrEmpty(s)) return s;
            Refresh();
            if (useChinese) return s;
            string v;
            return Map.TryGetValue(s, out v) ? v : s;
        }
    }
}
