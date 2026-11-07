using System;
using System.Collections.Generic;
using System.IO.Compression;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace NhtEditorHost
{
    [ComVisible(true)]
    [ClassInterface(ClassInterfaceType.AutoDual)]
    public class NhtHostApi
    {
        private readonly string modRoot;
        private readonly Action<string> notify;
        private FileSystemWatcher texWatch, cvWatch, patchWatch;
        private System.Windows.Forms.Timer debounce;

        public NhtHostApi(string modRoot, Action<string> notify)
        {
            this.modRoot = modRoot;
            this.notify = notify;
            debounce = new System.Windows.Forms.Timer { Interval = 400 };
            debounce.Tick += (s, e) => { debounce.Stop(); try { notify("files-changed"); } catch { } };
        }

        private string TexRoot { get { return Path.Combine(modRoot, "Textures"); } }

        private bool SafeKey(string key)
        {
            if (string.IsNullOrEmpty(key)) return false;
            if (key.Contains("..")) return false;
            return key.Replace('\\', '/').StartsWith("Custom/");
        }

        private string JsonEscape(string s)
        {
            if (s == null) return "";
            var sb = new StringBuilder();
            foreach (char c in s)
            {
                if (c == '\\' || c == '"') sb.Append('\\').Append(c);
                else if (c < ' ') sb.Append(' ');
                else sb.Append(c);
            }
            return sb.ToString();
        }

        public string CustomDirs()
        {
            var list = new List<string>();
            try
            {
                string root = Path.Combine(TexRoot, "Custom");
                if (Directory.Exists(root))
                {
                    foreach (var d in Directory.GetDirectories(root))
                    {
                        string n = Path.GetFileName(d);
                        if (n == "NHTCD_Gray" || n == "Icons" || n == "Rot") continue;
                        list.Add("\"" + JsonEscape(n) + "\"");
                    }
                }
            }
            catch { }
            return "[" + string.Join(",", list) + "]";
        }

        public string ListTextures()
        {
            var list = new List<string>();
            try
            {
                string root = Path.Combine(TexRoot, "Custom");
                if (Directory.Exists(root))
                {
                    foreach (var f in Directory.GetFiles(root, "*.png", SearchOption.AllDirectories))
                    {
                        string rel = f.Substring(root.Length + 1).Replace('\\', '/');
                        rel = rel.Substring(0, rel.Length - 4);
                        list.Add("\"Custom/" + JsonEscape(rel) + "\"");
                    }
                }
            }
            catch { }
            return "[" + string.Join(",", list) + "]";
        }

        public string ReadTexture(string key)
        {
            try
            {
                if (!SafeKey(key)) return "";
                string fp = Path.Combine(TexRoot, key.Replace('/', '\\') + ".png");
                if (!File.Exists(fp)) return "";
                return Convert.ToBase64String(File.ReadAllBytes(fp));
            }
            catch { return ""; }
        }

        public bool WriteTexture(string key, string base64)
        {
            try
            {
                if (!SafeKey(key) || string.IsNullOrEmpty(base64)) return false;
                string fp = Path.Combine(TexRoot, key.Replace('/', '\\') + ".png");
                string dir = Path.GetDirectoryName(fp);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.WriteAllBytes(fp, Convert.FromBase64String(base64));
                return true;
            }
            catch { return false; }
        }

        public bool SaveCanvas(string doll, string name, string json)
        {
            try
            {
                if (string.IsNullOrEmpty(doll) || string.IsNullOrEmpty(name)) return false;
                if (doll.Contains("..") || name.Contains("..")) return false;
                string dir = Path.Combine(modRoot, "Editor", "canvases", doll);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.WriteAllText(Path.Combine(dir, name), json, new UTF8Encoding(false));
                return true;
            }
            catch { return false; }
        }

        public bool SaveAsset(string key, string base64)
        {
            try
            {
                if (string.IsNullOrEmpty(key) || key.Contains("..") || string.IsNullOrEmpty(base64)) return false;
                string fp = Path.Combine(modRoot, "Editor", "assets", key.Replace('/', '\\') + ".png");
                string dir = Path.GetDirectoryName(fp);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.WriteAllBytes(fp, Convert.FromBase64String(base64));
                return true;
            }
            catch { return false; }
        }

        public bool SavePatch(string name, string xml)
        {
            try
            {
                if (string.IsNullOrEmpty(name) || !name.EndsWith(".xml") || name.Contains("..")) return false;
                string dir = Path.Combine(modRoot, "Patches");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                string target = Path.Combine(dir, name);
                if (File.Exists(target))
                {
                    string baseName = Path.GetFileNameWithoutExtension(name);
                    string hdir = Path.Combine(modRoot, "Editor", "history", "Patches", baseName);
                    Directory.CreateDirectory(hdir);
                    string stamp = DateTime.Now.ToString("yyyyMMdd-HHmmssfff");
                    File.Copy(target, Path.Combine(hdir, name + "." + stamp + ".bak"), true);
                    var olds = new List<FileInfo>(new DirectoryInfo(hdir).GetFiles());
                    olds.Sort((a, b) => b.LastWriteTime.CompareTo(a.LastWriteTime));
                    for (int i = 3; i < olds.Count; i++) { try { olds[i].Delete(); } catch { } }
                }
                File.WriteAllText(target, xml ?? "", new UTF8Encoding(false));
                return true;
            }
            catch { return false; }
        }

        public bool SaveProject(string body)
        {
            try
            {
                string dir = Path.Combine(modRoot, "Editor");
                if (!Directory.Exists(dir)) return false;
                File.WriteAllText(Path.Combine(dir, "nht-project.js"), body ?? "", new UTF8Encoding(false));
                return true;
            }
            catch { return false; }
        }

        public string ListCanvases()
        {
            var list = new List<string>();
            try
            {
                string root = Path.Combine(modRoot, "Editor", "canvases");
                if (Directory.Exists(root))
                {
                    foreach (var f in Directory.GetFiles(root, "*.json", SearchOption.AllDirectories))
                    {
                        string rel = f.Substring(root.Length + 1).Replace('\\', '/');
                        if (rel.StartsWith(".backup/")) continue;
                        list.Add("\"" + JsonEscape(rel) + "\"");
                    }
                }
            }
            catch { }
            return "[" + string.Join(",", list) + "]";
        }

        public string ReadCanvas(string rel)
        {
            try
            {
                if (string.IsNullOrEmpty(rel) || rel.Contains("..")) return "";
                string fp = Path.Combine(modRoot, "Editor", "canvases", rel.Replace('/', '\\'));
                if (!File.Exists(fp)) return "";
                return File.ReadAllText(fp, Encoding.UTF8);
            }
            catch { return ""; }
        }

        public bool SaveCanvasRel(string rel, string text)
        {
            try
            {
                if (string.IsNullOrEmpty(rel) || rel.Contains("..") || !rel.EndsWith(".json")) return false;
                string fp = Path.Combine(modRoot, "Editor", "canvases", rel.Replace('/', '\\'));
                string dir = Path.GetDirectoryName(fp);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.WriteAllText(fp, text ?? "", new UTF8Encoding(false));
                return true;
            }
            catch { return false; }
        }

        public bool DeleteCanvas(string rel)
        {
            try
            {
                if (string.IsNullOrEmpty(rel) || rel.Contains("..")) return false;
                string fp = Path.Combine(modRoot, "Editor", "canvases", rel.Replace('/', '\\'));
                if (File.Exists(fp)) File.Delete(fp);
                return true;
            }
            catch { return false; }
        }

        public string MakeModZip(string aboutXml)
        {
            string tmp = Path.Combine(Path.GetTempPath(), "nhtmod-" + Guid.NewGuid().ToString("N") + ".zip");
            try
            {
                string[] official = { "About", "Assemblies", "Defs", "Languages", "Patches", "Textures", "Sounds" };
                using (var z = ZipFile.Open(tmp, ZipArchiveMode.Create))
                {
                    foreach (var dirName in official)
                    {
                        string od = Path.Combine(modRoot, dirName);
                        if (!Directory.Exists(od)) continue;
                        foreach (var f in Directory.GetFiles(od, "*", SearchOption.AllDirectories))
                        {
                            string rel = f.Substring(modRoot.Length + 1).Replace('\\', '/');
                            if (!string.IsNullOrEmpty(aboutXml) && rel.Equals("About/About.xml", StringComparison.OrdinalIgnoreCase)) continue;
                            string ext = Path.GetExtension(f).ToLowerInvariant();
                            if (dirName == "Patches" && ext != ".xml") continue;
                            if (dirName == "Assemblies" && ext != ".dll") continue;
                            string nm = Path.GetFileName(f).ToLowerInvariant();
                            if (nm.Contains(".bak") || nm.EndsWith(".tmp") || nm.EndsWith(".orig") || nm.EndsWith(".premap") || nm.EndsWith(".psd") || nm.EndsWith(".xcf") || nm.EndsWith(".kra") || nm.Contains(".old-")) continue;
                            z.CreateEntryFromFile(f, rel, CompressionLevel.Optimal);
                        }
                    }
                    if (!string.IsNullOrEmpty(aboutXml))
                    {
                        var entry = z.CreateEntry("About/About.xml");
                        using (var st = entry.Open())
                        {
                            var b = new UTF8Encoding(false).GetBytes(aboutXml);
                            st.Write(b, 0, b.Length);
                        }
                    }
                }
                string b64 = Convert.ToBase64String(File.ReadAllBytes(tmp));
                try { File.Delete(tmp); } catch { }
                return b64;
            }
            catch
            {
                try { if (File.Exists(tmp)) File.Delete(tmp); } catch { }
                return "";
            }
        }

        public string CleanupScan(bool includeGray, bool keepUncat)
        {
            return CleanupService.ScanJson(modRoot, includeGray, keepUncat);
        }

        public string CleanupApply(bool includeGray, bool keepUncat)
        {
            return CleanupService.ApplyJson(modRoot, includeGray, keepUncat);
        }

        public string CleanupList()
        {
            return CleanupService.ListJson(modRoot);
        }

        public string CleanupDiff(string name)
        {
            return CleanupService.DiffJson(modRoot, name);
        }

        public int CleanupRestoreSelected(string name, string pathsPipe)
        {
            var arr = string.IsNullOrEmpty(pathsPipe) ? new string[0] : pathsPipe.Split('|');
            return CleanupService.Restore(modRoot, name, arr);
        }

        public bool PatchExists(string name)
        {
            try
            {
                if (string.IsNullOrEmpty(name) || name.Contains("..") || !name.EndsWith(".xml")) return false;
                return File.Exists(Path.Combine(modRoot, "Patches", name));
            }
            catch { return false; }
        }

        public string ReadBaseline()
        {
            try
            {
                string fp = Path.Combine(modRoot, "Editor", "canvas-baseline.json");
                return File.Exists(fp) ? File.ReadAllText(fp, Encoding.UTF8) : "";
            }
            catch { return ""; }
        }

        public bool SaveBaseline(string json)
        {
            try
            {
                string fp = Path.Combine(modRoot, "Editor", "canvas-baseline.json");
                File.WriteAllText(fp, json ?? "", new UTF8Encoding(false));
                return true;
            }
            catch { return false; }
        }

        public string ModRoot() { return modRoot; }

        public void StartWatch()
        {
            try
            {
                texWatch = new FileSystemWatcher(Path.Combine(TexRoot, "Custom")) { IncludeSubdirectories = true, EnableRaisingEvents = true };
                texWatch.Created += OnFs; texWatch.Deleted += OnFs; texWatch.Changed += OnFs; texWatch.Renamed += OnFs;
            }
            catch { }
            try
            {
                cvWatch = new FileSystemWatcher(Path.Combine(modRoot, "Editor", "canvases")) { IncludeSubdirectories = true, EnableRaisingEvents = true };
                cvWatch.Created += OnFs; cvWatch.Deleted += OnFs; cvWatch.Changed += OnFs; cvWatch.Renamed += OnFs;
            }
            catch { }
            try
            {
                patchWatch = new FileSystemWatcher(Path.Combine(modRoot, "Patches")) { IncludeSubdirectories = true, EnableRaisingEvents = true };
                patchWatch.Created += OnFs; patchWatch.Deleted += OnFs; patchWatch.Changed += OnFs;
            }
            catch { }
        }

        private void OnFs(object sender, FileSystemEventArgs e)
        {
            try { debounce.Stop(); debounce.Start(); } catch { }
        }
    }
}
