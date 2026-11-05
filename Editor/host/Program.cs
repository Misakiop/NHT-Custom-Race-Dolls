using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace NhtEditorHost
{
    static class Program
    {
        static Process server;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string exeDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            string editorDir = exeDir;   // exe 与 serve.ps1 同在 Editor/
            string serve = Path.Combine(editorDir, "serve.ps1");
            string url = "http://127.0.0.1:8765/anatomy-editor.html";

            if (!PortOpen())
            {
                if (!File.Exists(serve))
                {
                    MessageBox.Show("找不到 serve.ps1：" + serve, "NHT 编辑器", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                var psi = new ProcessStartInfo("powershell.exe",
                    "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + serve + "\" -NoBrowser")
                {
                    WorkingDirectory = editorDir,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                };
                server = Process.Start(psi);
                for (int i = 0; i < 120 && !PortOpen(); i++) Thread.Sleep(250);
            }

            if (!PortOpen())
            {
                MessageBox.Show("本地编辑器服务没有启动成功。\r\n可以手动运行 Editor\\启动编辑器.bat 查看错误。", "NHT 编辑器", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            var form = new Form
            {
                Text = "NHT Anatomy Editor",
                StartPosition = FormStartPosition.CenterScreen,
                AutoScaleMode = AutoScaleMode.Dpi,
                Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath),
                ClientSize = new Size(1500, 950),
                MinimumSize = new Size(980, 640),
                BackColor = Color.FromArgb(13, 16, 17),
            };
            var web = new WebView2 { Dock = DockStyle.Fill };
            form.Controls.Add(web);

            form.Shown += async (s, e) =>
            {
                try
                {
                    await web.EnsureCoreWebView2Async(null);
                    string modRoot = Path.GetFullPath(Path.Combine(editorDir, ".."));
                    var hostApi = new NhtHostApi(modRoot, msg => { try { web.CoreWebView2.PostWebMessageAsString(msg); } catch { } });
                    web.CoreWebView2.AddHostObjectToScript("nht", hostApi);
                    web.CoreWebView2.SetVirtualHostNameToFolderMapping("mod.local", modRoot, CoreWebView2HostResourceAccessKind.Allow);
                    try { web.CoreWebView2.SetVirtualHostNameToFolderMapping("history.local", Path.Combine(modRoot, "Editor", "history"), CoreWebView2HostResourceAccessKind.Allow); } catch { }
                    hostApi.StartWatch();
                    web.CoreWebView2.Settings.AreDevToolsEnabled = true;
                    web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                    web.CoreWebView2.Settings.IsStatusBarEnabled = false;
                    web.CoreWebView2.WebMessageReceived += (s2, e2) =>
                    {
                        try
                        {
                            if (e2.TryGetWebMessageAsString() == "restart") Restart();
                        }
                        catch { }
                    };
                    web.Source = new Uri(url);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("WebView2 初始化失败：" + ex.Message +
                        "\r\n请安装 Microsoft Edge WebView2 运行时。", "NHT 编辑器", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    form.Close();
                }
            };

            form.FormClosed += (s, e) => KillServer();
            Application.Run(form);
        }

        static bool PortOpen()
        {
            try
            {
                using (var c = new TcpClient())
                {
                    var ar = c.BeginConnect("127.0.0.1", 8765, null, null);
                    if (!ar.AsyncWaitHandle.WaitOne(300)) return false;
                    c.EndConnect(ar);
                    return true;
                }
            }
            catch { return false; }
        }

        static void Restart()
        {
            try
            {
                KillServer();
                for (int i = 0; i < 40 && PortOpen(); i++) Thread.Sleep(100);
                Process.Start(new ProcessStartInfo(Application.ExecutablePath) { UseShellExecute = true });
            }
            catch { }
            Environment.Exit(0);
        }

        static void KillServer()
        {
            try
            {
                if (server != null && !server.HasExited)
                {
                    Process.Start(new ProcessStartInfo("taskkill", "/PID " + server.Id + " /T /F")
                    { UseShellExecute = false, CreateNoWindow = true });
                }
            }
            catch { }
        }
    }
}
