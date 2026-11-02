# 停止 NHT 编辑器本地服务（结束所有跑 serve.ps1 的 PowerShell 进程）
$ErrorActionPreference = 'SilentlyContinue'
$me = $PID
$killed = 0
Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" |
    Where-Object { $_.ProcessId -ne $me -and $_.CommandLine -and $_.CommandLine -like '*serve.ps1*' } |
    ForEach-Object {
        try { Stop-Process -Id $_.ProcessId -Force; $killed++ } catch { }
    }
if ($killed -gt 0) { Write-Host "  已停止 $killed 个服务进程" } else { Write-Host "  没有正在运行的服务" }
