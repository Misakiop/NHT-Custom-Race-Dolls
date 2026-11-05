using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace NhtEditorHost
{
    public static class CleanupService
    {
        public class Cand
        {
            public string Key;
            public string Rel;
            public long Size;
        }

        static string Tex(string modRoot) { return Path.Combine(modRoot, "Textures"); }
        static string Custom(string modRoot) { return Path.Combine(Tex(modRoot), "Custom"); }
        static string Hist(string modRoot) { return Path.Combine(modRoot, "Editor", "history"); }

        static string Esc(string s)
        {
            var sb = new StringBuilder();
            foreach (char c in s ?? "")
            {
                if (c == '\\' || c == '"') sb.Append('\\').Append(c);
                else if (c < ' ') sb.Append(' ');
                else sb.Append(c);
            }
            return sb.ToString();
        }

        static string Sha256(string path)
        {
            using (var sha = SHA256.Create())
            using (var fs = File.OpenRead(path))
            {
                var hash = sha.ComputeHash(fs);
                var sb = new StringBuilder();
                foreach (var b in hash) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
        }

        public static HashSet<string> Refs(string modRoot)
        {
            var refs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                string cv = Path.Combine(modRoot, "Editor", "canvases");
                if (Directory.Exists(cv))
                {
                    foreach (var f in Directory.GetFiles(cv, "*.json", SearchOption.AllDirectories))
                    {
                        if (Path.GetFileName(f).Equals("index.json", StringComparison.OrdinalIgnoreCase)) continue;
                        string t = File.ReadAllText(f, Encoding.UTF8);
                        if (t.IndexOf("\"parts\"", StringComparison.Ordinal) < 0) continue;
                        foreach (Match m in Regex.Matches(t, "Custom/[^\"\\\\\\s]+")) refs.Add(m.Value);
                    }
                }
            }
            catch { }
            try
            {
                string pt = Path.Combine(modRoot, "Patches");
                if (Directory.Exists(pt))
                {
                    foreach (var f in Directory.GetFiles(pt, "*.xml"))
                    {
                        string t = File.ReadAllText(f, Encoding.UTF8);
                        foreach (Match m in Regex.Matches(t, "<imagePath>(Custom/[^<]+)</imagePath>")) refs.Add(m.Groups[1].Value);
                    }
                }
            }
            catch { }
            return refs;
        }

        public static List<Cand> Scan(string modRoot, bool includeGray, bool keepUncat)
        {
            var refs = Refs(modRoot);
            var list = new List<Cand>();
            string root = Custom(modRoot);
            if (!Directory.Exists(root)) return list;
            foreach (var f in Directory.GetFiles(root, "*.png", SearchOption.AllDirectories))
            {
                string rel = f.Substring(root.Length + 1).Replace('\\', '/');
                string key = "Custom/" + rel.Substring(0, rel.Length - 4);
                if (key.StartsWith("Custom/Icons/")) continue;
                if (key.StartsWith("Custom/Rot/") && refs.Contains(key)) continue;
                if (!includeGray && key.StartsWith("Custom/NHTCD_Gray/")) continue;
                if (keepUncat && key.StartsWith("Custom/未分类/")) continue;
                if (refs.Contains(key)) continue;
                list.Add(new Cand { Key = key, Rel = rel, Size = new FileInfo(f).Length });
            }
            return list;
        }

        public static string ScanJson(string modRoot, bool includeGray, bool keepUncat)
        {
            var list = Scan(modRoot, includeGray, keepUncat);
            long bytes = 0;
            foreach (var c in list) bytes += c.Size;
            var sb = new StringBuilder();
            sb.Append("{\"ok\":true,\"count\":").Append(list.Count).Append(",\"bytes\":").Append(bytes).Append(",\"files\":[");
            for (int i = 0; i < list.Count && i < 50; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append("{\"key\":\"").Append(Esc(list[i].Key)).Append("\",\"size\":").Append(list[i].Size).Append('}');
            }
            sb.Append("]}");
            return sb.ToString();
        }

        static void WriteManifest(string modRoot, string dir, List<Cand> allFiles, List<Cand> candidates, string mode)
        {
            var sb = new StringBuilder();
            foreach (var c in allFiles)
                sb.Append(c.Key).Append('\t').Append(c.Size).Append('\t').Append(Sha256(Path.Combine(Tex(modRoot), "Custom", c.Rel))).Append('\t').Append(c.Rel).Append('\n');
            File.WriteAllText(Path.Combine(dir, "manifest.tsv"), sb.ToString(), new UTF8Encoding(false));
            var js = new StringBuilder();
            js.Append("{\"time\":\"").Append(DateTime.Now.ToString("o")).Append("\",\"mode\":\"").Append(mode).Append("\",\"files\":[");
            for (int i = 0; i < allFiles.Count; i++)
            {
                if (i > 0) js.Append(',');
                js.Append("{\"path\":\"").Append(Esc(allFiles[i].Key)).Append("\",\"size\":").Append(allFiles[i].Size).Append('}');
            }
            js.Append("]}");
            File.WriteAllText(Path.Combine(dir, "manifest.json"), js.ToString(), new UTF8Encoding(false));
        }

        public static string ApplyJson(string modRoot, bool includeGray, bool keepUncat)
        {
            var files = Scan(modRoot, includeGray, keepUncat);
            long bytes = 0;
            foreach (var c in files) bytes += c.Size;

            string hist = Hist(modRoot);
            if (!Directory.Exists(hist)) Directory.CreateDirectory(hist);
            bool first = Directory.GetDirectories(hist, "cleanup-*").Length == 0;
            string mode = first ? "full" : "delta";
            string dir = Path.Combine(hist, "cleanup-" + DateTime.Now.ToString("yyyyMMdd-HHmmss"));
            string filesDir = Path.Combine(dir, "files");
            Directory.CreateDirectory(filesDir);

            var all = new List<Cand>();
            foreach (var f in Directory.GetFiles(Custom(modRoot), "*.png", SearchOption.AllDirectories))
            {
                string rel = f.Substring(Custom(modRoot).Length + 1).Replace('\\', '/');
                all.Add(new Cand { Key = "Custom/" + rel.Substring(0, rel.Length - 4), Rel = rel, Size = new FileInfo(f).Length });
            }
            WriteManifest(modRoot, dir, all, files, mode);

            if (mode == "full")
            {
                foreach (var f in Directory.GetFiles(Custom(modRoot), "*", SearchOption.AllDirectories))
                {
                    string rel = f.Substring(Custom(modRoot).Length + 1);
                    string dst = Path.Combine(filesDir, "Custom", rel);
                    Directory.CreateDirectory(Path.GetDirectoryName(dst));
                    File.Copy(f, dst, true);
                }
            }
            else
            {
                foreach (var c in files)
                {
                    string src = Path.Combine(Tex(modRoot), "Custom", c.Rel);
                    if (!File.Exists(src)) continue;
                    string dst = Path.Combine(filesDir, "Custom", c.Rel);
                    Directory.CreateDirectory(Path.GetDirectoryName(dst));
                    File.Copy(src, dst, true);
                }
            }

            int deleted = 0;
            foreach (var c in files)
            {
                string fp = Path.Combine(Tex(modRoot), "Custom", c.Rel);
                if (File.Exists(fp)) { File.Delete(fp); deleted++; }
            }

            // rotate to 3
            var dirs = new List<string>(Directory.GetDirectories(hist, "cleanup-*"));
            dirs.Sort();
            while (dirs.Count > 3) { try { Directory.Delete(dirs[0], true); } catch { } dirs.RemoveAt(0); }

            return "{\"ok\":true,\"deleted\":" + deleted + ",\"bytes\":" + bytes + ",\"backup\":\"" + Esc(Path.GetFileName(dir)) + "\",\"mode\":\"" + mode + "\"}";
        }

        public static string ListJson(string modRoot)
        {
            var sb = new StringBuilder("{\"ok\":true,\"backups\":[");
            string hist = Hist(modRoot);
            if (Directory.Exists(hist))
            {
                var dirs = new List<string>(Directory.GetDirectories(hist, "cleanup-*"));
                dirs.Sort();
                dirs.Reverse();
                bool firstOut = true;
                foreach (var d in dirs)
                {
                    string mf = Path.Combine(d, "manifest.tsv");
                    int count = 0; long bytes = 0;
                    string mode = "?";
                    if (File.Exists(mf))
                    {
                        foreach (var line in File.ReadAllLines(mf))
                        {
                            if (line.Length == 0) continue;
                            var p = line.Split('\t');
                            count++;
                            if (p.Length > 1) { long v; long.TryParse(p[1], out v); bytes += v; }
                        }
                    }
                    string mj = Path.Combine(d, "manifest.json");
                    if (File.Exists(mj))
                    {
                        var mm = Regex.Match(File.ReadAllText(mj), "\"mode\":\"(\\w+)\"");
                        if (mm.Success) mode = mm.Groups[1].Value;
                    }
                    if (!firstOut) sb.Append(',');
                    firstOut = false;
                    sb.Append("{\"name\":\"").Append(Esc(Path.GetFileName(d))).Append("\",\"count\":").Append(count).Append(",\"bytes\":").Append(bytes).Append(",\"mode\":\"").Append(mode).Append("\"}");
                }
            }
            sb.Append("]}");
            return sb.ToString();
        }

        public static string DiffJson(string modRoot, string name)
        {
            var sb = new StringBuilder("{\"ok\":true,\"changes\":[");
            if (name != null && Regex.IsMatch(name, "^cleanup-[0-9]{8}-[0-9]{6}$"))
            {
                string mf = Path.Combine(Hist(modRoot), name, "manifest.tsv");
                bool first = true;
                if (File.Exists(mf))
                {
                    foreach (var line in File.ReadAllLines(mf))
                    {
                        if (line.Length == 0) continue;
                        var p = line.Split('\t');
                        if (p.Length < 2) continue;
                        long size; long.TryParse(p[1], out size);
                        string fp = Path.Combine(Tex(modRoot), p[0].Replace('/', '\\') + ".png");
                        string status = File.Exists(fp) ? "same" : "missing";
                        long cur = 0;
                        if (File.Exists(fp))
                        {
                            cur = new FileInfo(fp).Length;
                            if (cur != size) status = "changed";
                        }
                        if (status == "same") continue;
                        if (!first) sb.Append(',');
                        first = false;
                        sb.Append("{\"path\":\"").Append(Esc(p[0])).Append("\",\"status\":\"").Append(status).Append("\",\"size\":").Append(size).Append(",\"curSize\":").Append(cur).Append('}');
                    }
                }
            }
            sb.Append("]}");
            return sb.ToString();
        }

        public static int Restore(string modRoot, string name, string[] paths)
        {
            int n = 0;
            if (name == null || !Regex.IsMatch(name, "^cleanup-[0-9]{8}-[0-9]{6}$")) return 0;
            string filesDir = Path.Combine(Hist(modRoot), name, "files");
            if (!Directory.Exists(filesDir)) return 0;
            foreach (var key in paths)
            {
                if (key == null || !key.StartsWith("Custom/")) continue;
                string rel = key.Substring(7);
                string src = Path.Combine(filesDir, "Custom", rel + ".png");
                if (!File.Exists(src)) continue;
                string dst = Path.Combine(Tex(modRoot), "Custom", rel + ".png");
                Directory.CreateDirectory(Path.GetDirectoryName(dst));
                File.Copy(src, dst, true);
                n++;
            }
            return n;
        }
    }
}
