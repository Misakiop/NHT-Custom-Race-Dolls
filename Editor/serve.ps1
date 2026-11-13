# NHT 解剖编辑器本地服务（由 启动编辑器.bat 直接启动；关闭窗口即停止）
# 自己用 TcpListener 实现最小 HTTP 服务：不需要管理员权限，也不占用 http.sys。
param(
    [string]$RootPath = '',
    [switch]$NoBrowser,
    [int]$Port = 0
)
$ErrorActionPreference = 'Stop'

if (-not $RootPath -or -not (Test-Path -LiteralPath $RootPath)) {
    $RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$Root    = $RootPath
$ModRoot = Split-Path -Parent $Root
# 兼容两种启动方式：-RootPath 指向 Editor（exe 默认），或直接指向模组根目录
if (-not (Test-Path -LiteralPath (Join-Path $ModRoot 'About')) -and (Test-Path -LiteralPath (Join-Path $Root 'About'))) { $ModRoot = $Root }
$PortStart = 8765
$MaxPort   = 8785


# 由 NHT-Anatomy-Editor.exe 启动时，父进程退出后自动结束本服务

# （Windows 不会因为父进程退出就杀子进程，这里用后台 job 监控父 PID）

try {

    $parentPid = (Get-CimInstance Win32_Process -Filter ("ProcessId=" + $PID) -ErrorAction SilentlyContinue).ParentProcessId

    if ($parentPid -and $parentPid -ne $PID) {

        Start-Job -ScriptBlock {

            param($serverPid, $parentPid)

            while (Get-Process -Id $parentPid -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 2 }

            Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue

        } -ArgumentList $PID, $parentPid | Out-Null

    }

} catch { }


function Get-FreePort([int]$start, [int]$end) {
    for ($p = $start; $p -le $end; $p++) {
        try {
            $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $p)
            $l.Start(); $l.Stop(); return $p
        } catch { }
    }
    throw 'no free port in range'
}

$Mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.webp' = 'image/webp'
    '.svg'  = 'image/svg+xml'
    '.xml'  = 'application/xml; charset=utf-8'
    '.txt'  = 'text/plain; charset=utf-8'
    '.ico'  = 'image/x-icon'
}


function Get-GitExe {
    $c = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    foreach ($p in @('C:\Program Files\Git\cmd\git.exe', 'C:\Program Files (x86)\Git\cmd\git.exe')) {
        if (Test-Path -LiteralPath $p) { return $p }
    }
    return $null
}


function Invoke-Git([string]$Git, [string[]]$GitArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $prevOut = [Console]::OutputEncoding
    $prevPS = $OutputEncoding
    try {
        # git 输出是 UTF-8；PowerShell 默认按系统代码页(GBK)解码会把中文和引号弄坏
        try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
        try { $OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
        $text = (& $Git @GitArgs 2>&1 | Out-String)
        $code = $LASTEXITCODE
        return [pscustomobject]@{ code = $code; text = $text }
    }
    catch {
        return [pscustomobject]@{ code = 1; text = $_.Exception.Message }
    }
    finally {
        try { [Console]::OutputEncoding = $prevOut } catch { }
        try { $OutputEncoding = $prevPS } catch { }
        $ErrorActionPreference = $prev
    }
}


function Invoke-GitNet([string]$Git, [string[]]$GitArgs, [int]$TimeoutSec = 12) {
    # 网络类命令（fetch/push/pull/ls-remote）：超时就杀掉，避免整个本地服务被卡住
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $prevOut = [Console]::OutputEncoding
    try {
        try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
        $outFile = Join-Path ([System.IO.Path]::GetTempPath()) ('nht-git-' + [guid]::NewGuid().ToString('N') + '.txt')
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $Git
        $psi.Arguments = ($GitArgs | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join ' '
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true
        $psi.EnvironmentVariables['GIT_TERMINAL_PROMPT'] = '0'
        $psi.EnvironmentVariables['GCM_INTERACTIVE'] = 'never'
        $p = [System.Diagnostics.Process]::Start($psi)
        $so = $p.StandardOutput.ReadToEndAsync()
        $se = $p.StandardError.ReadToEndAsync()
        $done = $p.WaitForExit($TimeoutSec * 1000)
        if (-not $done) {
            try { $p.Kill() } catch { }
            try { [System.IO.File]::Delete($outFile) } catch { }
            return [pscustomobject]@{ code = 124; text = ('网络超时（' + $TimeoutSec + ' 秒）：连不上远端仓库，请检查网络 / 代理后再试。') }
        }
        $text = ($so.Result + $se.Result)
        $code = $p.ExitCode
        try { [System.IO.File]::Delete($outFile) } catch { }
        return [pscustomobject]@{ code = $code; text = $text }
    }
    catch {
        return [pscustomobject]@{ code = 1; text = $_.Exception.Message }
    }
    finally {
        try { [Console]::OutputEncoding = $prevOut } catch { }
        $ErrorActionPreference = $prev
    }
}

function Send-Json($stream, [string]$status, $obj) {
    $txt = ConvertTo-Json -InputObject $obj -Depth 6 -Compress
    Send-Text $stream $status $txt
}

function Send-Bytes($stream, [string]$status, [string]$ctype, [byte[]]$body) {
    $crlf = [string][char]13 + [string][char]10
    $head = 'HTTP/1.1 ' + $status + $crlf +
            'Content-Type: ' + $ctype + $crlf +
            'Content-Length: ' + $body.Length + $crlf +
            'Cache-Control: no-store' + $crlf +
            'Clear-Site-Data: "cache"' + $crlf +
            'Connection: close' + $crlf + $crlf
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
}

function Send-Text($stream, [string]$status, [string]$text) {
    Send-Bytes $stream $status 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes($text))
}


# ---------------- Custom 清理 / 备份 / 还原 ----------------
function Get-CustomRefs {
    $refs = New-Object 'System.Collections.Generic.HashSet[string]'
    $cvRoot = Join-Path $ModRoot 'Editor\canvases'
    if (Test-Path -LiteralPath $cvRoot) {
        Get-ChildItem -LiteralPath $cvRoot -Recurse -File -Filter '*.json' -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                if ($_.Name -ieq 'index.json') { return }
                $t = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
                if ($t.IndexOf('"parts"') -lt 0) { return }
                foreach ($m in [regex]::Matches($t, 'Custom/[^"\\\s]+')) { [void]$refs.Add($m.Value) }
            } catch { }
        }
    }
    $ptRoot = Join-Path $ModRoot 'Patches'
    if (Test-Path -LiteralPath $ptRoot) {
        Get-ChildItem -LiteralPath $ptRoot -File -Filter '*.xml' -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $t = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
                foreach ($m in [regex]::Matches($t, '<imagePath>(Custom/[^<]+)</imagePath>')) { [void]$refs.Add($m.Groups[1].Value) }
            } catch { }
        }
    }
    return $refs
}

function Get-CleanupCandidates([bool]$includeGray, [bool]$keepUncat) {
    $refs = Get-CustomRefs
    $croot = Join-Path (Join-Path $ModRoot 'Textures') 'Custom'
    $out = @()
    if (-not (Test-Path -LiteralPath $croot)) { return $out }
    Get-ChildItem -LiteralPath $croot -Recurse -File -Filter '*.png' -ErrorAction SilentlyContinue | ForEach-Object {
        $rel = $_.FullName.Substring($croot.Length + 1) -replace '\\', '/'
        $key = 'Custom/' + ($rel -replace '\.png$', '')
        if ($key -match '^Custom/Icons/') { return }   # UI 图标固定保留
        if ($key -match '^Custom/Rot/' -and $refs.Contains($key)) { return }
        if (-not $includeGray -and $key -match '^Custom/NHTCD_Gray/') { return }
        if ($keepUncat -and $key -match '^Custom/未分类/') { return }
        if ($refs.Contains($key)) { return }
        $out += [pscustomobject]@{ key = $key; rel = $rel; size = $_.Length }
    }
    return $out
}

function Backup-CleanupFiles($files, [string]$mode) {
    $hist = Join-Path $ModRoot 'Editor\history'
    if (-not (Test-Path -LiteralPath $hist)) { New-Item -ItemType Directory -Path $hist -Force | Out-Null }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $dir = Join-Path $hist ('cleanup-' + $stamp)
    $filesDir = Join-Path $dir 'files'
    New-Item -ItemType Directory -Path $filesDir -Force | Out-Null
    $croot = Join-Path (Join-Path $ModRoot 'Textures') 'Custom'

    # 完整快照（每次备份独立、数据完整）
    $snapshot = @()
    if (Test-Path -LiteralPath $croot) {
        Get-ChildItem -LiteralPath $croot -Recurse -File -Filter '*.png' -ErrorAction SilentlyContinue | ForEach-Object {
            $rel = $_.FullName.Substring($croot.Length + 1) -replace '\\', '/'
            $snapshot += [pscustomobject]@{
                path = 'Custom/' + ($rel -replace '\.png$', '')
                size = $_.Length
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
                mtime = $_.LastWriteTimeUtc.ToString('o')
            }
        }
    }

    if ($mode -eq 'full') {
        Copy-Item -LiteralPath (Join-Path $croot '*') -Destination (Join-Path $filesDir 'Custom') -Recurse -Force -ErrorAction SilentlyContinue
    }
    foreach ($f in $files) {
        $src = Join-Path (Join-Path $ModRoot 'Textures') (('Custom/' + $f.rel) -replace '/', '\')
        if (-not (Test-Path -LiteralPath $src)) { continue }
        $dst = Join-Path $filesDir (('Custom/' + $f.rel) -replace '/', '\')
        $dstDir = Split-Path -Parent $dst
        if (-not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
        Copy-Item -LiteralPath $src -Destination $dst -Force
    }
    # 同时备份 index.json，方便回滚索引
    $idxSrc = Join-Path (Join-Path $ModRoot 'Editor\canvases') 'index.json'
    if (Test-Path -LiteralPath $idxSrc) { Copy-Item -LiteralPath $idxSrc -Destination (Join-Path $dir 'index.json') -Force }

    $manifest = [pscustomobject]@{ time = (Get-Date).ToString('o'); mode = $mode; files = $snapshot }
    [System.IO.File]::WriteAllText((Join-Path $dir 'manifest.json'), ($manifest | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
    $all = @(Get-ChildItem -LiteralPath $hist -Directory -Filter 'cleanup-*' -ErrorAction SilentlyContinue | Sort-Object Name)
    while ($all.Count -gt 3) {
        Remove-Item -LiteralPath $all[0].FullName -Recurse -Force -ErrorAction SilentlyContinue
        $all = @($all | Select-Object -Skip 1)
    }
    return (Split-Path -Leaf $dir)
}

function Get-CleanupBackups {
    $hist = Join-Path $ModRoot 'Editor\history'
    $out = @()
    if (Test-Path -LiteralPath $hist) {
        Get-ChildItem -LiteralPath $hist -Directory -Filter 'cleanup-*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
            $mf = Join-Path $_.FullName 'manifest.json'
            $count = 0; $bytes = 0; $mode = '?'; $time = $_.Name
            if (Test-Path -LiteralPath $mf) {
                try {
                    $m = [System.IO.File]::ReadAllText($mf, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
                    $count = @($m.files).Count; $mode = $m.mode; $time = $m.time
                    foreach ($f in @($m.files)) { $bytes += [int64]$f.size }
                } catch { }
            }
            $out += [pscustomobject]@{ name = $_.Name; time = $time; mode = $mode; count = $count; bytes = $bytes }
        }
    }
    return $out
}

function Restore-CleanupBackup([string]$name) {
    if ($name -notmatch '^cleanup-[0-9]{8}-[0-9]{6}$') { return -1 }
    $dir = Join-Path (Join-Path $ModRoot 'Editor\history') $name
    $filesDir = Join-Path $dir 'files'
    if (-not (Test-Path -LiteralPath $filesDir)) { return -1 }
    $texRoot = Join-Path $ModRoot 'Textures'
    $n = 0
    Get-ChildItem -LiteralPath $filesDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        $rel = $_.FullName.Substring($filesDir.Length + 1)
        $dst = Join-Path $texRoot $rel
        $dstDir = Split-Path -Parent $dst
        if (-not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
        Copy-Item -LiteralPath $_.FullName -Destination $dst -Force
        $n++
    }
    return $n
}

function Get-PngSize([string]$path) {
    try {
        $b = [System.IO.File]::ReadAllBytes($path)
        if ($b.Length -lt 24 -or $b[0] -ne 137 -or $b[1] -ne 80) { return $null }
        $w = ([int]$b[16] -shl 24) -bor ([int]$b[17] -shl 16) -bor ([int]$b[18] -shl 8) -bor [int]$b[19]
        $h = ([int]$b[20] -shl 24) -bor ([int]$b[21] -shl 16) -bor ([int]$b[22] -shl 8) -bor [int]$b[23]
        return @{ w = $w; h = $h }
    } catch { return $null }
}

# 同步 index.json 的 customAssets：删掉已清理的条目；补回还原的条目；磁盘已有文件去掉内嵌 base64
function Sync-CustomIndex($deletedKeys, $restoredKeys) {
    try {
        $idxPath = Join-Path (Join-Path $ModRoot 'Editor\canvases') 'index.json'
        if (-not (Test-Path -LiteralPath $idxPath)) { return }
        $raw = [System.IO.File]::ReadAllText($idxPath, [System.Text.Encoding]::UTF8)
        $j = $raw | ConvertFrom-Json
        if (-not $j.customAssets) { $j | Add-Member -NotePropertyName customAssets -NotePropertyValue @() -Force }
        $del = @{}
        foreach ($k in @($deletedKeys)) { if ($k) { $del[$k] = 1 } }
        $out = @()
        foreach ($a in @($j.customAssets)) {
            if (-not $a.p) { continue }
            if ($del.ContainsKey($a.p)) { continue }
            $rel = ($a.p -replace '/', '\') + '.png'
            $fp = Join-Path (Join-Path $ModRoot 'Textures') $rel
            if ($a.data -and (Test-Path -LiteralPath $fp)) {
                $a.PSObject.Properties.Remove('data')
            }
            $out += $a
        }
        foreach ($k in @($restoredKeys)) {
            if (-not $k) { continue }
            $exists = $false
            foreach ($a in $out) { if ($a.p -eq $k) { $exists = $true; break } }
            if ($exists) { continue }
            $rel = ($k -replace '/', '\') + '.png'
            $fp = Join-Path (Join-Path $ModRoot 'Textures') $rel
            $sz = Get-PngSize $fp
            $n = ($k -split '/')[-1]
            $out += [pscustomobject]@{ p = $k; n = $n; w = $(if ($sz) { $sz.w } else { 0 }); h = $(if ($sz) { $sz.h } else { 0 }) }
        }
        $j.customAssets = @($out)
        [System.IO.File]::WriteAllText($idxPath, ($j | ConvertTo-Json -Depth 10), (New-Object System.Text.UTF8Encoding($false)))
    } catch { }
}

function Read-Request($stream) {
    $buf = New-Object byte[] 8192
    $ms = New-Object System.IO.MemoryStream
    $headerEnd = -1
    while ($headerEnd -lt 0) {
        $n = $stream.Read($buf, 0, $buf.Length)
        if ($n -le 0) { return $null }
        $ms.Write($buf, 0, $n)
        $arr = $ms.ToArray()
        for ($i = 0; $i -lt $arr.Length - 3; $i++) {
            if ($arr[$i] -eq 13 -and $arr[$i+1] -eq 10 -and $arr[$i+2] -eq 13 -and $arr[$i+3] -eq 10) { $headerEnd = $i + 4; break }
        }
        if ($ms.Length -gt 1048576) { return $null }
    }
    $all = $ms.ToArray()
    $headText = [System.Text.Encoding]::UTF8.GetString($all, 0, $headerEnd)
    $lines = $headText -split [string][char]13 + [string][char]10
    $first = $lines[0]
    $headers = @{}
    for ($i = 1; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '^([^:]+):\s*(.*)$') { $headers[$matches[1].ToLower()] = $matches[2] }
    }
    $len = 0
    if ($headers.ContainsKey('content-length')) {
        try { $len = [int]$headers['content-length'] } catch { $len = 0 }
    }
    $body = New-Object System.IO.MemoryStream
    $already = $all.Length - $headerEnd
    if ($already -gt 0) { $body.Write($all, $headerEnd, $already) }
    while ($body.Length -lt $len) {
        $want = $len - $body.Length
        if ($want -gt $buf.Length) { $want = $buf.Length }
        $n = $stream.Read($buf, 0, $want)
        if ($n -le 0) { break }
        $body.Write($buf, 0, $n)
    }
    return @{ line = $first; headers = $headers; body = $body.ToArray() }
}

function Save-File([string]$path, [byte[]]$bytes) {
    $dir = Split-Path -Parent $path
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllBytes($path, $bytes)
}

# 补丁备份：写入前把旧 XML 复制到 Editor/history/Patches/<种族>/，每个种族只留最新 3 份
function Backup-Patch([string]$name) {
    $src = Join-Path (Join-Path $ModRoot 'Patches') $name
    if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { return }
    $base = 'other'
    if ($name -match '^(nht-[^.]+)') { $base = $Matches[1] }
    $dir = Join-Path (Join-Path $Root 'history\Patches') $base
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmssfff'
    try { Copy-Item -LiteralPath $src -Destination (Join-Path $dir ($name + '.' + $stamp + '.bak')) -Force } catch { }
    $all = @(Get-ChildItem -LiteralPath $dir -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    if ($all.Count -gt 3) {
        $all | Select-Object -Skip 3 | ForEach-Object { try { Remove-Item -LiteralPath $_.FullName -Force } catch { } }
    }
}

if ($Port -gt 0) { $port = $Port } else { $port = Get-FreePort $PortStart $MaxPort }
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
$url = 'http://127.0.0.1:' + $port + '/anatomy-editor.html'

Write-Host ''
Write-Host '  NHT 解剖编辑器已启动' -ForegroundColor Green
Write-Host ('  ' + $url) -ForegroundColor Cyan
Write-Host ''
Write-Host ('  页面目录   : ' + $Root)
Write-Host ('  项目文件   : ' + (Join-Path $Root 'nht-project.js'))
Write-Host ('  模组补丁   : ' + (Join-Path $ModRoot 'Patches'))
Write-Host ''
Write-Host '  关闭本窗口即停止服务。'
Write-Host ''
if (-not $NoBrowser) { Start-Process $url }

while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    try {
        $stream = $client.GetStream()
        $req = Read-Request $stream
        if ($null -eq $req) { $client.Close(); continue }

        $parts = $req.line -split ' '
        $method = $parts[0]
        $target = '/'
        if ($parts.Length -gt 1) { $target = $parts[1] }

        $q = ''
        $pathPart = $target
        $qi = $target.IndexOf('?')
        if ($qi -ge 0) { $q = $target.Substring($qi + 1); $pathPart = $target.Substring(0, $qi) }
        $pathPart = [System.Uri]::UnescapeDataString($pathPart)

        $query = @{}
        foreach ($kv in ($q -split '&')) {
            if (-not $kv) { continue }
            $p = $kv -split '=', 2
            $k = [System.Uri]::UnescapeDataString($p[0])
            $v = ''
            if ($p.Length -gt 1) { $v = [System.Uri]::UnescapeDataString($p[1]) }
            $query[$k] = $v
        }

        if ($pathPart -eq '/__tex' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $key = "$($query['key'])".Trim()
            $fp = ''
            if ($key -and $key -notmatch '\.\.' -and $key -match '^Custom/') {
                try {
                    $rel = ($key -replace '/', '\') + '.png'
                    $fp = Join-Path (Join-Path $ModRoot 'Textures') $rel
                } catch { }
            }
            if ($fp -and (Test-Path -LiteralPath $fp)) {
                $bytes = [System.IO.File]::ReadAllBytes($fp)
                Send-Bytes $stream '200 OK' 'image/png' $bytes
            } else {
                Send-Text $stream '404 Not Found' 'no'
            }
            continue
        }
        if ($pathPart -eq '/__patch-exists' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $name = "$($query['name'])".Trim()
            $yes = $false
            if ($name -match '^[A-Za-z0-9_.\-]+\.xml$') {
                $fp = Join-Path (Join-Path $ModRoot 'Patches') $name
                $yes = Test-Path -LiteralPath $fp -PathType Leaf
            }
            if ($yes) { Send-Text $stream '200 OK' 'yes' } else { Send-Text $stream '200 OK' 'no' }
        }
        if ($pathPart -eq '/__tex-exists' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $key = $query['key']
            $yes = $false
            if ($key -and $key -notmatch '\.\.') {
                $rel = ($key -replace '/', '\') + '.png'
                $fp = Join-Path (Join-Path $ModRoot 'Textures') $rel
                $yes = Test-Path -LiteralPath $fp -PathType Leaf
            }
            if ($yes) { Send-Text $stream '200 OK' 'yes' } else { Send-Text $stream '200 OK' 'no' }
        }
        if ($pathPart -eq '/__cleanup-diff' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $name = "$($query['name'])".Trim()
            $dir = Join-Path (Join-Path $ModRoot 'Editor\history') $name
            $mf = Join-Path $dir 'manifest.json'
            $changes = @()
            if ((Test-Path -LiteralPath $mf) -and $name -match '^cleanup-[0-9]{8}-[0-9]{6}$') {
                $m = [System.IO.File]::ReadAllText($mf, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
                $croot = Join-Path (Join-Path $ModRoot 'Textures') 'Custom'
                foreach ($f in @($m.files)) {
                    $rel = ($f.path -replace '^Custom/', '') -replace '/', '\'
                    $fp = Join-Path $croot ($rel + '.png')
                    $status = 'same'
                    if (-not (Test-Path -LiteralPath $fp)) { $status = 'missing' }
                    else {
                        $sz = (Get-Item -LiteralPath $fp).Length
                        if ([int64]$sz -ne [int64]$f.size) { $status = 'changed' }
                    }
                    if ($status -ne 'same') {
                        $curSize = 0
                        if (Test-Path -LiteralPath $fp) { $curSize = (Get-Item -LiteralPath $fp).Length }
                        $changes += [pscustomobject]@{ path = $f.path; status = $status; size = $f.size; curSize = $curSize }
                    }
                }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; name = $name; changes = $changes })
        }
        elseif ($pathPart -eq '/__cleanup-backup-tex' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $name = "$($query['name'])".Trim()
            $key = "$($query['key'])".Trim()
            $fp = ''
            if ($name -match '^cleanup-[0-9]{8}-[0-9]{6}$' -and $key -match '^Custom/') {
                $rel = ($key -replace '/', '\') + '.png'
                $fp = Join-Path (Join-Path (Join-Path (Join-Path $ModRoot 'Editor\history') $name) 'files') $rel
            }
            if ($fp -and (Test-Path -LiteralPath $fp)) { Send-Bytes $stream '200 OK' 'image/png' ([System.IO.File]::ReadAllBytes($fp)) }
            else { Send-Text $stream '404 Not Found' 'no' }
        }
        elseif ($pathPart -eq '/__cleanup-restore-selected' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $name = "$($query['name'])".Trim()
            $paths = "$($query['paths'])".Split('|') | Where-Object { $_ -match '^Custom/' }
            $n = 0
            $restoredKeys = @()
            if ($name -match '^cleanup-[0-9]{8}-[0-9]{6}$') {
                $filesDir = Join-Path (Join-Path (Join-Path $ModRoot 'Editor\history') $name) 'files'
                foreach ($k in $paths) {
                    $rel = ($k -replace '^Custom/', '') -replace '/', '\'
                    $src = Join-Path (Join-Path $filesDir 'Custom') ($rel + '.png')
                    if (-not (Test-Path -LiteralPath $src)) { continue }
                    $dst = Join-Path (Join-Path (Join-Path $ModRoot 'Textures') 'Custom') ($rel + '.png')
                    $dd = Split-Path -Parent $dst
                    if (-not (Test-Path -LiteralPath $dd)) { New-Item -ItemType Directory -Path $dd -Force | Out-Null }
                    Copy-Item -LiteralPath $src -Destination $dst -Force
                    $restoredKeys += $k
                    $n++
                }
            }
            Sync-CustomIndex @() $restoredKeys
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; restored = $n })
        }
        if ($pathPart -eq '/__cleanup-scan' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $incGray = "$($query['includeGray'])" -ne '0'
            $keepUncat = "$($query['keepUncat'])" -ne '0'
            $files = @(Get-CleanupCandidates $incGray $keepUncat)
            $bytes = 0; foreach ($f in $files) { $bytes += $f.size }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; count = $files.Count; bytes = $bytes; files = @($files | Select-Object -First 50) })
        }
        elseif ($pathPart -eq '/__cleanup-apply' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $incGray = "$($query['includeGray'])" -ne '0'
            $keepUncat = "$($query['keepUncat'])" -ne '0'
            $files = @(Get-CleanupCandidates $incGray $keepUncat)
            $bytes = 0; foreach ($f in $files) { $bytes += $f.size }
            $hist = Join-Path $ModRoot 'Editor\history'
            $isFirst = -not (Test-Path -LiteralPath $hist) -or -not (@(Get-ChildItem -LiteralPath $hist -Directory -Filter 'cleanup-*' -ErrorAction SilentlyContinue).Count)
            $mode = if ($isFirst) { 'full' } else { 'delta' }
            $backup = Backup-CleanupFiles $files $mode
            $del = 0
            $deletedKeys = @()
            foreach ($f in $files) {
                $fp = Join-Path (Join-Path $ModRoot 'Textures') (('Custom/' + $f.rel) -replace '/', '\')
                if (Test-Path -LiteralPath $fp) {
                    Remove-Item -LiteralPath $fp -Force -ErrorAction SilentlyContinue
                    $deletedKeys += $f.key
                    $del++
                }
            }
            Sync-CustomIndex $deletedKeys @()
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; deleted = $del; bytes = $bytes; backup = $backup; mode = $mode })
        }
        elseif ($pathPart -eq '/__cleanup-list' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; backups = @(Get-CleanupBackups) })
        }
        elseif ($pathPart -eq '/__cleanup-restore' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $name = "$($query['name'])".Trim()
            $n = Restore-CleanupBackup $name
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = ($n -ge 0); restored = $n })
        }
        elseif ($pathPart -eq '/__customdirs' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $croot = Join-Path (Join-Path $ModRoot 'Textures') 'Custom'
            $dirs = @()
            try {
                if (Test-Path -LiteralPath $croot) {
                    $dirs = @(Get-ChildItem -LiteralPath $croot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notin @('NHTCD_Gray', 'Icons', 'Rot') } | Sort-Object Name | Select-Object -ExpandProperty Name)
                }
            } catch { }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; dirs = $dirs })
        }
        elseif ($pathPart -eq '/__customrename' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $oldN = "$($query['old'])".Trim()
            $newN = "$($query['new'])".Trim()
            $ok = $false; $msg = ''
            if (-not $oldN -or -not $newN -or $oldN -match '\.\.' -or $newN -match '\.\.' -or $oldN -match '[\\/]' -or $newN -match '[\\/]') { $msg = 'bad name' }
            else {
                try {
                    $croot = Join-Path (Join-Path $ModRoot 'Textures') 'Custom'
                    $src = Join-Path $croot $oldN
                    $dst = Join-Path $croot $newN
                    if (-not (Test-Path -LiteralPath $src)) { $msg = 'source missing' }
                    elseif (Test-Path -LiteralPath $dst) { $msg = 'target exists' }
                    else {
                        Move-Item -LiteralPath $src -Destination $dst -Force
                        # 同步改写引用：画布 / 索引 / 补丁
                        $files = @()
                        $cvRoot = Join-Path $ModRoot 'Editor\canvases'
                        if (Test-Path -LiteralPath $cvRoot) { $files += @(Get-ChildItem -LiteralPath $cvRoot -Recurse -File -Include *.json -ErrorAction SilentlyContinue) }
                        $ptRoot = Join-Path $ModRoot 'Patches'
                        if (Test-Path -LiteralPath $ptRoot) { $files += @(Get-ChildItem -LiteralPath $ptRoot -File -Include *.xml -ErrorAction SilentlyContinue) }
                        foreach ($f in $files) {
                            try {
                                $t = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
                                $t2 = $t.Replace('Custom/' + $oldN + '/', 'Custom/' + $newN + '/')
                                $t2 = $t2.Replace('Custom/NHTCD_Gray/' + $oldN + '/', 'Custom/NHTCD_Gray/' + $newN + '/')
                                if ($t2 -ne $t) { [System.IO.File]::WriteAllText($f.FullName, $t2, (New-Object System.Text.UTF8Encoding($false))) }
                            } catch { }
                        }
                        $ok = $true
                    }
                } catch { $msg = $_.Exception.Message }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $ok; error = $msg })
        }
        elseif ($pathPart -eq '/__customdelete' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $name = "$($query['name'])".Trim()
            $ok = $false; $msg = ''
            if (-not $name -or $name -match '\.\.' -or $name -match '[\\/]') { $msg = 'bad name' }
            else {
                try {
                    $croot = Join-Path (Join-Path $ModRoot 'Textures') 'Custom'
                    $dir = Join-Path $croot $name
                    if (-not (Test-Path -LiteralPath $dir)) { $msg = 'missing' }
                    else { Remove-Item -LiteralPath $dir -Recurse -Force; $ok = $true }
                } catch { $msg = $_.Exception.Message }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $ok; error = $msg })
        }
        elseif ($pathPart -eq '/__custommkdir' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $name = "$($query['name'])".Trim()
            $ok = $false; $msg = ''
            if (-not $name -or $name -match '\.\.' -or $name -match '[\\/]') { $msg = 'bad name' }
            else {
                try {
                    foreach ($sub in @('Custom', 'Custom\NHTCD_Gray')) {
                        $d = Join-Path (Join-Path $ModRoot 'Textures') $sub
                        $d = Join-Path $d $name
                        if (-not (Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
                    }
                    $ok = $true
                } catch { $msg = $_.Exception.Message }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $ok; error = $msg })
        }
        elseif ($pathPart -eq '/__customdelfile' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $key = "$($query['key'])".Trim()
            $ok = $false; $msg = ''
            if (-not $key -or $key -notmatch '^Custom/' -or $key -match '\.\.') { $msg = 'bad key' }
            else {
                try {
                    $rel = ($key -replace '/', '\') + '.png'
                    $fp = Join-Path (Join-Path $ModRoot 'Textures') $rel
                    if (Test-Path -LiteralPath $fp) { Remove-Item -LiteralPath $fp -Force; $ok = $true }
                    else { $msg = 'missing' }
                } catch { $msg = $_.Exception.Message }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $ok; error = $msg })
        }
        elseif ($pathPart -eq '/__custommove' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $key = "$($query['key'])".Trim()
            $cat = "$($query['cat'])".Trim()
            $newKey = ''; $ok = $false; $msg = ''
            if (-not $key -or $key -notmatch '^Custom/' -or $key -match '\.\.' -or -not $cat -or $cat -match '\.\.' -or $cat -match '[\\/]') { $msg = 'bad args' }
            else {
                try {
                    $croot = Join-Path (Join-Path $ModRoot 'Textures') 'Custom'
                    $src = Join-Path (Join-Path $ModRoot 'Textures') (($key -replace '/', '\') + '.png')
                    $name = [System.IO.Path]::GetFileName($src)
                    $dstDir = Join-Path $croot $cat
                    if (-not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
                    $dst = Join-Path $dstDir $name
                    if (-not (Test-Path -LiteralPath $src)) { $msg = 'source missing' }
                    else {
                        Move-Item -LiteralPath $src -Destination $dst -Force
                        $newKey = 'Custom/' + $cat + '/' + $name.Substring(0, $name.Length - 4)
                        # 改写引用
                        $files = @()
                        $cvRoot = Join-Path $ModRoot 'Editor\canvases'
                        if (Test-Path -LiteralPath $cvRoot) { $files += @(Get-ChildItem -LiteralPath $cvRoot -Recurse -File -Include *.json -ErrorAction SilentlyContinue) }
                        $ptRoot = Join-Path $ModRoot 'Patches'
                        if (Test-Path -LiteralPath $ptRoot) { $files += @(Get-ChildItem -LiteralPath $ptRoot -File -Include *.xml -ErrorAction SilentlyContinue) }
                        foreach ($f in $files) {
                            try {
                                $t = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
                                $t2 = $t.Replace($key, $newKey).Replace(($key + '.png'), ($newKey + '.png'))
                                if ($t2 -ne $t) { [System.IO.File]::WriteAllText($f.FullName, $t2, (New-Object System.Text.UTF8Encoding($false))) }
                            } catch { }
                        }
                        $ok = $true
                    }
                } catch { $msg = $_.Exception.Message }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $ok; key = $newKey; error = $msg })
        }
        elseif ($pathPart -eq '/__gray' -and ($method -eq 'GET' -or $method -eq 'POST')) {
            $action = "$($query['action'])".Trim().ToLower()
            $race = "$($query['race'])".Trim()
            $name = "$($query['name'])".Trim()
            $ok = $false; $msg = ''; $saved = ''; $backups = @()
            if (-not $race -or $race -notmatch '^[A-Za-z0-9_.-]+$') { $msg = 'bad race' }
            else {
                try {
                    $gray = Join-Path (Join-Path (Join-Path $ModRoot 'Textures') 'Custom\NHTCD_Gray') $race
                    $hist = Join-Path (Join-Path (Join-Path $Root 'history') 'Gray') $race
                    if ($action -eq 'backup') {
                        if (-not (Test-Path -LiteralPath $gray)) { $msg = 'gray folder missing' }
                        else {
                            if (-not (Test-Path -LiteralPath $hist)) { New-Item -ItemType Directory -Path $hist -Force | Out-Null }
                            $saved = Get-Date -Format 'yyyyMMdd-HHmmssfff'
                            Copy-Item -LiteralPath $gray -Destination (Join-Path $hist $saved) -Recurse -Force
                            $all = @(Get-ChildItem -LiteralPath $hist -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
                            if ($all.Count -gt 2) { $all | Select-Object -Skip 2 | ForEach-Object { try { Remove-Item -LiteralPath $_.FullName -Recurse -Force } catch { } } }
                            $ok = $true
                        }
                    }
                    elseif ($action -eq 'list') {
                        if (Test-Path -LiteralPath $hist) {
                            $backups = @(Get-ChildItem -LiteralPath $hist -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -ExpandProperty Name)
                        }
                        $ok = $true
                    }
                    elseif ($action -eq 'restore') {
                        if (-not $name -or $name -match '\.\.' -or $name -match '[\\/]') { $msg = 'bad name' }
                        else {
                            $src = Join-Path $hist $name
                            if (-not (Test-Path -LiteralPath $src)) { $msg = 'backup missing' }
                            else {
                                if (Test-Path -LiteralPath $gray) { Remove-Item -LiteralPath $gray -Recurse -Force }
                                New-Item -ItemType Directory -Path (Split-Path -Parent $gray) -Force | Out-Null
                                Copy-Item -LiteralPath $src -Destination $gray -Recurse -Force
                                $ok = $true
                            }
                        }
                    }
                    elseif ($action -eq 'delete') {
                        if (Test-Path -LiteralPath $gray) { Remove-Item -LiteralPath $gray -Recurse -Force }
                        # 递归清掉 Textures/Custom/NHTCD_Gray 下因此变空的目录
                        $rootGray = Join-Path (Join-Path $ModRoot 'Textures') 'Custom\NHTCD_Gray'
                        if (Test-Path -LiteralPath $rootGray) {
                            $dirs = @(Get-ChildItem -LiteralPath $rootGray -Directory -Recurse -ErrorAction SilentlyContinue | Sort-Object FullName -Descending)
                            foreach ($d in $dirs) {
                                if (-not (Get-ChildItem -LiteralPath $d.FullName -Force -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $d.FullName -Force -ErrorAction SilentlyContinue }
                            }
                        }
                        $ok = $true
                    }
                    else { $msg = 'bad action' }
                } catch { $msg = $_.Exception.Message }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $ok; error = $msg; name = $saved; backups = $backups })
        }
        elseif ($pathPart -eq '/__texindex' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $list = @()
            $texRoot = Join-Path $ModRoot 'Textures'
            if (Test-Path -LiteralPath $texRoot) {
                $list = @(Get-ChildItem -LiteralPath $texRoot -Recurse -File -Filter '*.png' -ErrorAction SilentlyContinue |
                    ForEach-Object {
                        $rel = $_.FullName.Substring($texRoot.Length + 1)
                        $rel = $rel -replace '\\', '/'
                        $rel -replace '\.png$', ''
                    })
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; keys = $list })
            continue
        }
        elseif ($pathPart -eq '/__assetindex' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $list = @()
            $assetRoot = Join-Path $Root 'assets'
            if (Test-Path -LiteralPath $assetRoot) {
                $list = @(Get-ChildItem -LiteralPath $assetRoot -Recurse -File -Filter '*.png' -ErrorAction SilentlyContinue |
                    ForEach-Object { $_.FullName.Substring($assetRoot.Length + 1) -replace '\\', '/' })
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; files = $list })
            continue
        }
        elseif ($pathPart -eq '/__canvas-list' -and $method -eq 'GET') {
            $cvRoot = Join-Path $ModRoot 'Editor\canvases'
            $list = @()
            if (Test-Path -LiteralPath $cvRoot) {
                Get-ChildItem -LiteralPath $cvRoot -Recurse -File -Filter '*.json' | ForEach-Object {
                    $rel = $_.FullName.Substring($cvRoot.Length + 1) -replace '\\', '/'
                    $list += [pscustomobject]@{ rel = $rel; size = $_.Length; mtime = $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss') }
                }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; files = $list })
            continue
        }
        elseif ($pathPart -eq '/__canvas-get' -and $method -eq 'GET') {
            $rel = ($query['rel'] -replace '\\', '/').TrimStart('/')
            if (-not $rel -or $rel -match '\.\.') { Send-Json $stream '200 OK' @{ ok = $false; error = 'bad rel' }; continue }
            $file = Join-Path (Join-Path $ModRoot 'Editor\canvases') ($rel -replace '/', '\')
            if (-not (Test-Path -LiteralPath $file)) { Send-Json $stream '200 OK' @{ ok = $false; error = 'not found' }; continue }
            $text = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; rel = $rel; text = $text })
            continue
        }
        elseif ($pathPart -eq '/__canvas-put' -and $method -eq 'POST') {
            $rel = ($query['rel'] -replace '\\', '/').TrimStart('/')
            if (-not $rel -or $rel -match '\.\.') { Send-Json $stream '200 OK' @{ ok = $false; error = 'bad rel' }; continue }
            $file = Join-Path (Join-Path $ModRoot 'Editor\canvases') ($rel -replace '/', '\')
            $dir2 = Split-Path -Parent $file
            if (-not (Test-Path -LiteralPath $dir2)) { New-Item -ItemType Directory -Force -Path $dir2 | Out-Null }
            $body = ''
            if ($req.body) { $body = [System.Text.Encoding]::UTF8.GetString($req.body) }
            [System.IO.File]::WriteAllText($file, [string]$body, (New-Object System.Text.UTF8Encoding($false)))
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; rel = $rel; bytes = ([string]$body).Length })
            continue
        }
        elseif ($pathPart -eq '/__canvas-del' -and $method -eq 'POST') {
            $rel = ($query['rel'] -replace '\\', '/').TrimStart('/')
            if (-not $rel -or $rel -match '\.\.') { Send-Json $stream '200 OK' @{ ok = $false; error = 'bad rel' }; continue }
            $file = Join-Path (Join-Path $ModRoot 'Editor\canvases') ($rel -replace '/', '\')
            if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; rel = $rel })
            continue
        }
        elseif ($pathPart -eq '/__gitcanvases' -and $method -eq 'GET') {
            $git = Get-GitExe
            $dir = $query['dir']
            if (-not $dir -or -not (Test-Path -LiteralPath $dir)) { Send-Json $stream '200 OK' @{ ok = $false; error = 'repo not found' }; continue }
            if (-not $git) { Send-Json $stream '200 OK' @{ ok = $false; error = 'git.exe not found' }; continue }
            $sep = [string][char]31
            $fmt = '--pretty=format:%H' + $sep + '%ad' + $sep + '%s'
            $log = Invoke-Git $git @('-C', $dir, 'log', '-n', '3', $fmt, '--date=format:%Y-%m-%d %H:%M', '--', 'Editor/canvases')
            $commits = @()
            foreach ($line in ($log.text -split "`n")) {
                $line = $line.Trim()
                if (-not $line) { continue }
                $parts = $line -split [regex]::Escape($sep)
                if ($parts.Length -lt 3) { continue }
                $rev = $parts[0]
                $files = @()
                $ls = Invoke-Git $git @('-C', $dir, '-c', 'core.quotepath=false', 'ls-tree', '-r', '--name-only', $rev, '--', 'Editor/canvases')
                foreach ($f in ($ls.text -split "`n")) {
                    $f = $f.Trim().Trim('"')
                    if (-not $f -or $f -notmatch '\.json$') { continue }
                    $relInRepo = $f
                    $rel = $f.Substring('Editor/canvases/'.Length)
                    $show = Invoke-Git $git @('-C', $dir, 'show', ($rev + ':' + $relInRepo))
                    if ($show.code -ne 0) { continue }
                    $files += [pscustomobject]@{ rel = $rel; text = $show.text }
                }
                $commits += [pscustomobject]@{ rev = $rev; date = $parts[1]; subject = $parts[2]; files = $files }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; commits = $commits })
            continue
        }
        elseif ($pathPart -eq '/__gitchanges') {
            $git = Get-GitExe
            $dir = $query['dir']
            if (-not $git) { Send-Json $stream '200 OK' @{ ok = $false; error = 'git.exe not found' }; continue }
            if (-not $dir -or -not (Test-Path -LiteralPath $dir)) { Send-Json $stream '200 OK' @{ ok = $false; error = ('repo dir not found: ' + $dir) }; continue }
            # sync=1：先把模组当前文件同步进仓库目录，再读 git status。
            # 只同步会被推送的内容（跳过素材库 / 历史快照 / WebView2 缓存等默认锁定的目录），
            # 否则弹窗会因为复制几百 MB 素材而超时。
            $syncText = ''
            if ($query['sync'] -eq '1') {
                $sameDir = ([IO.Path]::GetFullPath($dir).TrimEnd('\') -ieq [IO.Path]::GetFullPath($ModRoot).TrimEnd('\'))
                if ($sameDir) { $syncText = '仓库就是模组目录，无需同步' }
                else { try {
                    $rd = & robocopy $ModRoot $dir /E /MT:8 /R:1 /W:1 /XD .git .vs bin obj "Editor\NHT-Anatomy-Editor.exe.WebView2" "Editor\history" "Editor\_backup" "Editor\assets" "Editor\canvases\.backup" "_backup" "_analysis" ".dsh-images" /XF nht-project.js hair-map.js *.bak *.bak.* /NFL /NDL /NJH /NJS /NP 2>&1
                    $syncText = "已同步模组文件（robocopy 退出码 " + $LASTEXITCODE + "）"
                } catch { $syncText = "同步失败：" + $_.Exception.Message } }
            }
            # 已提交但还没推送的提交：推送窗口里不逐条列，但会随本次推送一起上传
            $curBrR = Invoke-Git $git @('-C', $dir, 'rev-parse', '--abbrev-ref', 'HEAD')
            $curBr = "$($curBrR.text)".Trim()
            $aheadN = 0
            $aheadLog = @()
            if ($curBr -and $curBr -ne 'HEAD') {
                $cntR = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', 'HEAD', '--not', '--remotes')
                [int]::TryParse("$($cntR.text)".Trim(), [ref]$aheadN) | Out-Null
                if ($cntR.code -ne 0) {
                    $cntR2 = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', ('origin/' + $curBr + '..HEAD'))
                    [int]::TryParse("$($cntR2.text)".Trim(), [ref]$aheadN) | Out-Null
                }
                if ($aheadN -gt 0) {
                    $lgR = Invoke-Git $git @('-C', $dir, '-c', 'core.quotepath=false', 'log', '--pretty=format:%h %s', '-n', '8', 'HEAD', '--not', '--remotes')
                    foreach ($ln in ("$($lgR.text)" -split "`n")) {
                        if ($ln.Trim()) { $aheadLog += $ln.Trim() }
                    }
                }
            }
            $st = Invoke-Git $git @('-C', $dir, '-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-uall')
            $list = @()
            foreach ($line in ($st.text -split "`n")) {
                $line = $line.TrimEnd("`r")
                if (-not $line.Trim()) { continue }
                if ($line.Length -lt 4) { continue }
                $code = $line.Substring(0, 2).Trim()
                $rest = $line.Substring(2).Trim()
                if ($rest -match ' -> ') { $rest = ($rest -split ' -> ')[-1] }
                $rest = $rest.Trim('"')
                if ($rest -match '\\[0-7]{3}') {
                    # 极端情况下仍有八进制转义：用 git 自己还原
                    $fixed = Invoke-Git $git @('-C', $dir, 'rev-parse', '--sq-quote', $rest)
                    if ($fixed.code -eq 0 -and $fixed.text.Trim()) { $rest = $rest }
                }
                $list += [pscustomobject]@{ path = $rest; status = $code }
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; files = $list; ahead = $aheadN; aheadCommits = $aheadLog; syncText = $syncText })
            continue
        }
        elseif ($pathPart -eq '/__gitremote' -and $method -eq 'GET') {
            $git = Get-GitExe
            $dir = $query['dir']
            if (-not $git -or -not $dir -or -not (Test-Path -LiteralPath $dir)) { Send-Json $stream '200 OK' @{ ok = $false; error = 'bad dir/git' }; continue }
            $url = Invoke-Git $git @('-C', $dir, 'remote', 'get-url', 'origin')
            $br = Invoke-Git $git @('-C', $dir, 'rev-parse', '--abbrev-ref', 'HEAD')
            $brName = ''
            if ($br.code -eq 0 -and $br.text.Trim() -and $br.text.Trim() -notmatch 'fatal|error') { $brName = $br.text.Trim() }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = ($url.code -eq 0); url = $url.text.Trim(); branch = $brName })
            continue
        }
        elseif ($pathPart -eq '/__gitsetremote' -and $method -eq 'POST') {
            $git = Get-GitExe
            $dir = $query['dir']
            $url = $query['url']
            if (-not $git -or -not $dir -or -not (Test-Path -LiteralPath $dir)) { Send-Json $stream '200 OK' @{ ok = $false; error = 'bad dir/git' }; continue }
            if (-not $url -or $url -notmatch '^(https?://|git@|ssh://)') { Send-Json $stream '200 OK' @{ ok = $false; error = 'only https/ssh url allowed' }; continue }
            $set = Invoke-Git $git @('-C', $dir, 'remote', 'set-url', 'origin', $url)
            if ($set.code -ne 0) {
                # origin 不存在时直接添加
                $set = Invoke-Git $git @('-C', $dir, 'remote', 'add', 'origin', $url)
            }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = ($set.code -eq 0); log = $set.text })
            continue
        }
        elseif ($pathPart -eq '/__gitinfo') {
            $git = Get-GitExe
            if (-not $git) { Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; installed = $false }) ; continue }
            $ver = Invoke-Git $git @('--version')
            $un = Invoke-Git $git @('config', '--global', 'user.name')
            $ue = Invoke-Git $git @('config', '--global', 'user.email')
            Send-Json $stream '200 OK' ([pscustomobject]@{
                ok = $true; installed = $true; path = $git; version = $ver.text.Trim()
                userName = $un.text.Trim(); userEmail = $ue.text.Trim()
            })
            continue
        }
        elseif ($pathPart -eq '/__pickdir') {
            $picked = ''
            try {
                $shell = New-Object -ComObject Shell.Application
                $folder = $shell.BrowseForFolder(0, '选择 Git 仓库目录', 0x0001, 0)
                if ($folder) { $picked = $folder.Self.Path }
            }
            catch { }
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = [bool]$picked; path = $picked })
            continue
        }
        elseif ($pathPart -eq '/__self' -and $method -eq 'GET') {
            $name = Split-Path -Leaf $ModRoot
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; name = $name; dir = $ModRoot; root = $Root })
            continue
        }
        elseif ($pathPart -eq '/__about' -and $method -eq 'GET') {
            $f = Join-Path $ModRoot 'About\About.xml'
            if (Test-Path -LiteralPath $f) {
                try {
                    $txt = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
                    Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; path = $f; text = $txt })
                } catch {
                    Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; error = $_.Exception.Message })
                }
            } else {
                Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; error = 'About.xml not found' })
            }
            continue
        }
        elseif ($pathPart -eq '/__git' -or $pathPart -eq '/__gitpush' -or $pathPart -eq '/__gitpull') {
            $git = Get-GitExe
            $dir = $query['dir']
            $branch = "$($query['branch'])".Trim().Trim('"')
            if (-not $branch) { $branch = 'main' }
            if (-not $git) { Send-Json $stream '200 OK' @{ ok = $false; error = 'git.exe not found' }; continue }
            if (-not $dir -or -not (Test-Path -LiteralPath $dir)) { Send-Json $stream '200 OK' @{ ok = $false; error = ('repo dir not found: ' + $dir) }; continue }

            if ($pathPart -eq '/__git') {
                $cur = Invoke-Git $git @('-C', $dir, 'rev-parse', '--abbrev-ref', 'HEAD')
                if ($cur.code -eq 0 -and $cur.text.Trim()) { $branch = $cur.text.Trim() }
                $didFetch = $false
                $fetchNote = ''
                $fetching = $false
                if ($query['fetch'] -eq '1') {
                    # 后台启动 fetch：立即返回，避免单线程服务被网络卡住
                    $lockFile = Join-Path ([System.IO.Path]::GetTempPath()) ('nht-fetch-' + ([string]$dir).GetHashCode() + '.lock')
                    $busy = $false
                    if (Test-Path -LiteralPath $lockFile) {
                        try {
                            $age = ((Get-Date) - (Get-Item -LiteralPath $lockFile).LastWriteTime).TotalSeconds
                            if ($age -lt 45) { $busy = $true }
                        } catch { }
                    }
                    if (-not $busy) {
                        try {
                            Set-Content -LiteralPath $lockFile -Value ([string](Get-Date)) -Encoding UTF8
                            $psi = New-Object System.Diagnostics.ProcessStartInfo
                            $psi.FileName = $git
                            $psi.Arguments = ('-C "' + $dir + '" fetch origin --quiet')
                            $psi.UseShellExecute = $false
                            $psi.CreateNoWindow = $true
                            $psi.EnvironmentVariables['GIT_TERMINAL_PROMPT'] = '0'
                            [System.Diagnostics.Process]::Start($psi) | Out-Null
                            $fetching = $true
                            $fetchNote = '正在后台检测远端…'
                        } catch { $fetchNote = ('后台检测启动失败：' + $_.Exception.Message) }
                    } else {
                        $fetching = $true
                        $fetchNote = '上一次检测还没结束…'
                    }
                    $didFetch = $false
                }
                $behindR = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', ('HEAD..origin/' + $branch))
                # 未推送 = 不在任何远端分支里的提交（推到别的分支也算已推送）
                $aheadR = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', 'HEAD', '--not', '--remotes')
                $behind = 0; $ahead = 0
                [int]::TryParse("$($behindR.text)".Trim(), [ref]$behind) | Out-Null
                [int]::TryParse("$($aheadR.text)".Trim(), [ref]$ahead) | Out-Null
                if ($aheadR.code -ne 0) {
                    $aheadR2 = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', ('origin/' + $branch + '..HEAD'))
                    [int]::TryParse("$($aheadR2.text)".Trim(), [ref]$ahead) | Out-Null
                }

                # 未提交的改动（供客户端排除默认锁定后计数）
                $dirtyR = Invoke-Git $git @('-C', $dir, '-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-uall')
                $dirty = @()
                foreach ($dl in ($dirtyR.text -split "`n")) {
                    $dl = $dl.TrimEnd("`r")
                    if (-not $dl.Trim() -or $dl.Length -lt 4) { continue }
                    $dp = $dl.Substring(2).Trim()
                    if ($dp -match ' -> ') { $dp = ($dp -split ' -> ')[-1] }
                    $dp = $dp.Trim('"')
                    if ($dp) { $dirty += $dp }
                }

                $sep = [string][char]31
                $fmt = '--pretty=format:%h' + $sep + '%ad' + $sep + '%s' + $sep + '%an'
                $dateFmt = '--date=format:%Y-%m-%d %H:%M'
                $logRef = 'origin/' + $branch
                $verify = Invoke-Git $git @('-C', $dir, 'rev-parse', '--verify', '--quiet', $logRef)
                if ($verify.code -ne 0) { $logRef = 'HEAD' }
                $logR = Invoke-Git $git @('-C', $dir, 'log', '-n', '12', $fmt, $dateFmt, $logRef)
                $commits = @()
                foreach ($line in ($logR.text -split "`n")) {
                    $line = $line.Trim()
                    if (-not $line) { continue }
                    $parts = $line -split [regex]::Escape($sep)
                    if ($parts.Length -ge 4) {
                        $commits += [pscustomobject]@{ hash = $parts[0]; date = $parts[1]; subject = $parts[2]; author = $parts[3] }
                    }
                }
                Send-Json $stream '200 OK' ([pscustomobject]@{
                    ok = $true; branch = $branch; behind = $behind; ahead = $ahead; commits = $commits; dirty = $dirty;
                    fetched = $didFetch; fetching = $fetching; fetchNote = $fetchNote
                })
                continue
            }

            if ($pathPart -eq '/__gitpush') {
                $msg = $query['message']
                if (-not $msg) { $msg = 'Update from NHT editor' }
                $name = $query['name']
                $email = $query['email']
                if (-not $name) { $name = (Invoke-Git $git @('config', '--global', 'user.name')).text.Trim() }
                if (-not $email) { $email = (Invoke-Git $git @('config', '--global', 'user.email')).text.Trim() }
                if (-not $name) { $name = 'NHT Editor' }
                if (-not $email) { $email = 'nht-editor@localhost' }
                # sync=1：先把当前模组目录的内容镜像到仓库目录（不删除仓库独有文件）
                $syncText = ''
                if ($query['sync'] -eq '1') {
                    $sameDir2 = ([IO.Path]::GetFullPath($dir).TrimEnd('\') -ieq [IO.Path]::GetFullPath($ModRoot).TrimEnd('\'))
                    if ($sameDir2) { $syncText = '仓库就是模组目录，无需同步' }
                    else { try {
                        $rc = & robocopy $ModRoot $dir /E /MT:8 /R:1 /W:1 /XD .git .vs bin obj "Editor\NHT-Anatomy-Editor.exe.WebView2" "Editor\history" "Editor\_backup" "Editor\assets" "Editor\canvases\.backup" "_backup" "_analysis" ".dsh-images" /XF nht-project.js hair-map.js *.bak *.bak.* /NFL /NDL /NJH /NJS /NP 2>&1
                        $syncText = "已同步模组文件到仓库目录（robocopy 退出码 " + $LASTEXITCODE + "）`n"
                    } catch { $syncText = "同步模组文件失败：" + $_.Exception.Message + "`n" } }
                }

                # 支持只暂存选中的文件（files = 换行分隔的相对路径）
                $only = $query['files']
                $addText = ''
                if ($null -ne $only -and $only.Trim()) {
                    $paths = @($only -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
                    $chunk = @()
                    foreach ($p in $paths) {
                        $chunk += $p
                        if ($chunk.Count -ge 80) {
                            $r0 = Invoke-Git $git (@('-C', $dir, 'add', '-A', '--') + $chunk)
                            $addText += $r0.text
                            $chunk = @()
                        }
                    }
                    if ($chunk.Count -gt 0) {
                        $r0 = Invoke-Git $git (@('-C', $dir, 'add', '-A', '--') + $chunk)
                        $addText += $r0.text
                    }
                    $addR = [pscustomobject]@{ code = 0; text = ($addText + "已选择 " + $paths.Count + " 个文件`n") }
                } else {
                    $addR = Invoke-Git $git @('-C', $dir, 'add', '-A')
                }
                $bodyTxt = $query['body']
                if ($bodyTxt -and $bodyTxt.Trim()) {
                    $commitR = Invoke-Git $git @('-C', $dir, '-c', ('user.name=' + $name), '-c', ('user.email=' + $email), 'commit', '-m', $msg, '-m', $bodyTxt)
                } else {
                    $commitR = Invoke-Git $git @('-C', $dir, '-c', ('user.name=' + $name), '-c', ('user.email=' + $email), 'commit', '-m', $msg)
                }

                # ---- 目标分支 = 设置里的 branch；当前分支只决定推送方式 ----
                $curR = Invoke-Git $git @('-C', $dir, 'rev-parse', '--abbrev-ref', 'HEAD')
                $cur = $curR.text.Trim()
                $sameBranch = [bool]($cur -and $cur -eq $branch)
                $switchText = ''
                if (-not $sameBranch -and $cur) {
                    $switchText = ("推送到分支：" + $branch + "（本地当前是 " + $cur + "，用 HEAD:" + $branch + " 推送）`n")
                }

                $null = Invoke-GitNet $git @('-C', $dir, 'fetch', 'origin', '--quiet') 8
                $hasRemoteR = Invoke-Git $git @('-C', $dir, 'rev-parse', '--verify', '--quiet', ('origin/' + $branch))
                $hasRemote = ($hasRemoteR.code -eq 0)

                if ($sameBranch) {
                    $behindR = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', ('HEAD..origin/' + $branch))
                    $behind = 0
                    [int]::TryParse($behindR.text.Trim(), [ref]$behind) | Out-Null
                    if ($behind -gt 0) {
                        $aheadR = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', ('origin/' + $branch + '..HEAD'))
                        $ahead = 0
                        [int]::TryParse($aheadR.text.Trim(), [ref]$ahead) | Out-Null
                        if ($ahead -eq 0) {
                            $ffR = Invoke-GitNet $git @('-C', $dir, 'pull', '--ff-only', 'origin', $branch) 20
                            if ($ffR.code -eq 0) { $behind = 0 }
                            else {
                                $text = ($syncText + $addR.text + $commitR.text + $ffR.text + "自动快进失败，请点「拉取远端」。")
                                Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; hint = 'pull-first'; behind = $behind; commitCode = $commitR.code; pushCode = -1; log = $text })
                                continue
                            }
                        } else {
                            $text = ($syncText + $addR.text + $commitR.text + "本地和远端都有新提交（本地领先 $ahead / 落后 $behind），已阻止推送。`n请先点「拉取远端」合并后再推送。")
                            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; hint = 'diverged'; behind = $behind; ahead = $ahead; commitCode = $commitR.code; pushCode = -1; log = $text })
                            continue
                        }
                    }
                }

                if ($sameBranch) {
                    $pushR = Invoke-GitNet $git @('-C', $dir, 'push', '-u', 'origin', $branch) 25
                } else {
                    # 推到别的分支时不改本地分支的上游，否则下次状态会盯着那个分支
                    $pushR = Invoke-GitNet $git @('-C', $dir, 'push', 'origin', ('HEAD:' + $branch)) 25
                }
                $text = ($syncText + $addR.text + $commitR.text + $switchText + $pushR.text)
                $ok = ($pushR.code -eq 0)
                if (-not $ok -and ($pushR.text -match 'non-fast-forward|fetch first|rejected')) {
                    $text = $text + ("`n分支「" + $branch + "」上有本地没有的提交，git 拒绝了覆盖。`n把设置里的分支改成当前分支（" + $cur + "）再推送，或先切到该分支拉取。")
                    Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; hint = 'target-diverged'; branch = $branch; commitCode = $commitR.code; pushCode = $pushR.code; log = $text })
                    continue
                }

                Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $ok; commitCode = $commitR.code; pushCode = $pushR.code; log = $text })
                continue
            }

            if ($pathPart -eq '/__gitpull') {
              try {
                $pullLog = ''
                $mode = 'ff'
                $stashed = $false
                $stashNote = ''
                $pullR = $null
                # 以当前分支为准：设置里的分支可能是空的 / 拼错的，空分支会拼出 'origin/' 这种坏 ref
                $curPullR = Invoke-Git $git @('-C', $dir, 'rev-parse', '--abbrev-ref', 'HEAD')
                $curPull = "$($curPullR.text)".Trim()
                if ($curPull -and $curPull -ne 'HEAD') { $branch = $curPull }
                if (-not $branch) { $branch = 'main' }
                $fetchR = Invoke-GitNet $git @('-C', $dir, 'fetch', 'origin') 12
                # 远端没有这个分支时退回 origin/HEAD 指向的分支，避免直接报错
                $chkRef = Invoke-Git $git @('-C', $dir, 'rev-parse', '--verify', '--quiet', ('origin/' + $branch))
                if ($chkRef.code -ne 0) {
                    $headRefR = Invoke-Git $git @('-C', $dir, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD')
                    $headBranch = ($("$($headRefR.text)".Trim()) -replace '^origin/', '')
                    if ($headBranch) {
                        $branch = $headBranch
                        $pullLog = "远端没有当前分支，改用 origin/$branch。`n"
                    } else {
                        $pullLog = "远端没有分支「$branch」。`n"
                    }
                }
                # 工作区有未提交改动时 git 会拒绝 pull/merge → 先自动 stash，完事再恢复
                $stashed = $false
                $stashNote = ''
                $dirtyChk = Invoke-Git $git @('-C', $dir, 'status', '--porcelain')
                if ($("$($dirtyChk.text)".Trim())) {
                    $stR = Invoke-GitNet $git @('-C', $dir, 'stash', 'push', '-m', 'nht-pull-autostash') 25
                    if ($stR.code -eq 0) { $stashed = $true; $stashNote = "已暂存本地未提交改动，拉取后恢复。`n" }
                    else { $stashNote = "本地改动暂存失败：" + [string]$stR.text + "`n" }
                }
                $pullR = Invoke-GitNet $git @('-C', $dir, 'pull', '--ff-only', 'origin', $branch) 20
                $mode = 'ff'
                if (-not $pullLog) { $pullLog = '' }
                $pullLog = [string]$pullLog + [string]$fetchR.text + [string]$pullR.text
                if (-not $branch) { $branch = 'main' }
                if ($pullR.code -ne 0 -and ($pullR.text -match 'Not possible to fast-forward|diverging|diverged')) {
                    # 分叉：先「以本地为准」合并（单人/多机时远端多半是旧的同一批编辑器文件）
                    $mrg = Invoke-GitNet $git @('-C', $dir, 'merge', '--no-ff', '--no-edit', '-X', 'ours', ('origin/' + $branch)) 25
                    $pullLog = [string]$pullLog + "`n—— 检测到分叉，改用「以本地为准」合并 ——`n" + [string]$mrg.text
                    if ($mrg.code -eq 0) {
                        $mode = 'merge-ours'
                        $pullR = $mrg
                    } else {
                        $null = Invoke-Git $git @('-C', $dir, 'merge', '--abort')
                        $mrg2 = Invoke-GitNet $git @('-C', $dir, 'merge', '--no-ff', '--no-edit', ('origin/' + $branch)) 25
                        $pullLog = [string]$pullLog + "`n—— 普通合并 ——`n" + [string]$mrg2.text
                        if ($mrg2.code -eq 0) { $mode = 'merge'; $pullR = $mrg2 }
                        else {
                            $null = Invoke-Git $git @('-C', $dir, 'merge', '--abort')
                            $pullLog = $pullLog + "`n合并失败，仓库已恢复到拉取前的状态。"
                        }
                    }
                }
                if ($stashed) {
                    $popR = Invoke-GitNet $git @('-C', $dir, 'stash', 'pop') 25
                    $stashNote = [string]$stashNote + $(if ($popR.code -eq 0) { "本地改动已恢复。`n" } else { "恢复本地改动失败（改动还在 stash 里）：`n" + [string]$popR.text })
                }
                $pullLog = [string]$stashNote + [string]$pullLog
                Send-Json $stream '200 OK' ([pscustomobject]@{ ok = ($pullR.code -eq 0); mode = $mode; log = $pullLog })
              } catch {
                $errText = "拉取出错：" + $_.Exception.Message
                try {
                    $errFile = Join-Path ([System.IO.Path]::GetTempPath()) 'nht-pull-error.txt'
                    [System.IO.File]::WriteAllText($errFile, ($errText + "`n" + $_.ScriptStackTrace), (New-Object System.Text.UTF8Encoding($false)))
                } catch { }
                Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; mode = 'error'; log = $errText })
              }
              continue
            }
        }
        elseif ($pathPart -eq '/__modzip' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            # 导出「纯模组」：按磁盘现状原样打包模组文件，保持目录结构；
            # 只排除开发内容（Editor / Source / tools / _backup / _analysis / history / .git …）
            $stage = $null; $zip = $null
            try {
                $tmp = [System.IO.Path]::GetTempPath()
                $stamp = [Guid]::NewGuid().ToString('N')
                $stage = Join-Path $tmp ('nhtstage-' + $stamp)
                $zip = Join-Path $tmp ('nhtmod-' + $stamp + '.zip')
                New-Item -ItemType Directory -Path $stage -Force | Out-Null

                $skipDirs = @('Editor','Source','tools','_backup','_analysis','history','.git','.github','.vs','.idea','obj','bin','packages','node_modules','.codegraph','.dsh-images','.agent-teams','.dsh-project-memory')
                if (-not (Test-Path -LiteralPath (Join-Path $ModRoot 'About'))) { throw ('不像是模组根目录：' + $ModRoot) }

                function Copy-ModFile([string]$full, [string]$rel) {
                    if ($rel -match '^\.git(ignore|attributes|modules|keep)$') { return }
                    if ($rel -match '\.(bak|bak[0-9]+|premap|tmp|orig|psd|xcf|kra|log)$' -or $rel -like '*.old-*') { return }
                    if ($rel -match '(^|\\)nht-project[^\\]*\.js$' -or $rel -match '(^|\\)_probe') { return }
                    $segs = $rel -split '\\'
                    if (($segs -contains 'Patches') -and ($full -notmatch '\.xml$')) { return }
                    if (($segs -contains 'Assemblies') -and ($full -notmatch '\.dll$')) { return }
                    $target = Join-Path $stage $rel
                    $tdir = Split-Path $target -Parent
                    if (-not (Test-Path -LiteralPath $tdir)) { New-Item -ItemType Directory -Path $tdir -Force | Out-Null }
                    Copy-Item -LiteralPath $full -Destination $target -Force
                }

                Get-ChildItem -LiteralPath $ModRoot -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    if ($_.PSIsContainer) {
                        if ($skipDirs -contains $_.Name) { return }
                        Get-ChildItem -LiteralPath $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
                            Copy-ModFile $_.FullName ($_.FullName.Substring($ModRoot.Length).TrimStart('\'))
                        }
                    } else {
                        Copy-ModFile $_.FullName $_.Name
                    }
                }

                # 用编辑器里保存的 About.xml 覆盖模组目录里的那份（仅在传了 about 参数时）
                $aboutTxt = $query['about']
                if ($aboutTxt -and $aboutTxt.Trim()) {
                    $aboutDir = Join-Path $stage 'About'
                    if (-not (Test-Path -LiteralPath $aboutDir)) { New-Item -ItemType Directory -Path $aboutDir -Force | Out-Null }
                    [System.IO.File]::WriteAllText((Join-Path $aboutDir 'About.xml'), $aboutTxt, (New-Object System.Text.UTF8Encoding($false)))
                }
                if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
                Add-Type -AssemblyName System.IO.Compression
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                $z = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
                try {
                    Get-ChildItem -LiteralPath $stage -Recurse -File -Force | ForEach-Object {
                        $rel = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
                        $en = $z.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
                        $es = $en.Open()
                        $fs = [System.IO.File]::OpenRead($_.FullName)
                        try { $fs.CopyTo($es) } finally { $fs.Close(); $es.Close() }
                    }
                } finally { $z.Dispose() }
                $bytes = [System.IO.File]::ReadAllBytes($zip)
                Send-Bytes $stream '200 OK' 'application/zip' $bytes
            }
            catch {
                try { [System.IO.File]::AppendAllText((Join-Path ([System.IO.Path]::GetTempPath()) 'nhtzip-err.txt'), ($_.Exception.ToString() + "`n---`n")) } catch { }
                Send-Text $stream '500 Internal Server Error' ('zip failed: ' + $_.Exception.Message)
            }
            finally {
                if ($stage -and (Test-Path -LiteralPath $stage)) { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue }
                if ($zip -and (Test-Path -LiteralPath $zip)) { Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue }
            }
        }
        elseif ($pathPart -eq '/__history' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $hist = Join-Path $Root 'history'
            $rows = @()
            if (Test-Path -LiteralPath $hist) {
                $rows = @(Get-ChildItem -LiteralPath $hist -Filter 'nht-project-*.js' | Sort-Object Name -Descending | Select-Object -First 5 | ForEach-Object {
                    [pscustomobject]@{ name = $_.Name; time = $_.LastWriteTime.ToString('MM-dd HH:mm:ss'); size = $_.Length }
                })
            }
            Send-Text $stream '200 OK' (ConvertTo-Json -InputObject $rows -Compress -Depth 4)
        }
        elseif ($pathPart -eq '/__history-file' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            $name = $query['name']
            if ($name -and $name -match '^nht-project-[0-9]{8}-[0-9]{9}\.js$') {
                $f = Join-Path (Join-Path $Root 'history') $name
                if (Test-Path -LiteralPath $f -PathType Leaf) {
                    $bytes = [System.IO.File]::ReadAllBytes($f)
                    Send-Bytes $stream '200 OK' 'application/javascript; charset=utf-8' $bytes
                } else { Send-Text $stream '404 Not Found' 'no such version' }
            } else { Send-Text $stream '400 Bad Request' 'bad name' }
        }
        elseif ($pathPart -eq '/__save' -and $method -eq 'POST') {
            $to = $query['to']
            $ok = $false
            $msg = ''
            if ($to -eq 'project') {
                $proj = Join-Path $Root 'nht-project.js'
                if (Test-Path -LiteralPath $proj) {
                    try { Copy-Item -LiteralPath $proj -Destination (Join-Path $Root 'nht-project.bak.js') -Force } catch { }
                }
                Save-File $proj $req.body
                # 历史快照：保留最近 5 份，超出删最旧
                try {
                    $hist = Join-Path $Root 'history'
                    if (-not (Test-Path -LiteralPath $hist)) { New-Item -ItemType Directory -Path $hist -Force | Out-Null }
                    $stamp = Get-Date -Format 'yyyyMMdd-HHmmssfff'
                    Save-File (Join-Path $hist ('nht-project-' + $stamp + '.js')) $req.body
                    $all = @(Get-ChildItem -LiteralPath $hist -Filter 'nht-project-*.js' | Sort-Object Name -Descending)
                    if ($all.Count -gt 5) {
                        $all | Select-Object -Skip 5 | ForEach-Object { try { Remove-Item -LiteralPath $_.FullName -Force } catch { } }
                    }
                } catch { }
                $ok = $true
                $msg = 'nht-project.js'
            }
            elseif ($to -eq 'patch') {
                $name = $query['name']
                if ($name -match '^[A-Za-z0-9_.\-]+\.xml$') {
                    Backup-Patch $name
                    Save-File (Join-Path (Join-Path $ModRoot 'Patches') $name) $req.body
                    $ok = $true
                    $msg = 'Patches\' + $name
                } else { $msg = 'bad name' }
            }
            elseif ($to -eq 'texture') {
                $key = $query['key']
                if ($key -and $key -notmatch '\.\.' ) {
                    $txt = [System.Text.Encoding]::UTF8.GetString($req.body)
                    $b64 = $txt
                    $ci = $txt.IndexOf('base64,')
                    if ($ci -ge 0) { $b64 = $txt.Substring($ci + 7) }
                    $bytes = [Convert]::FromBase64String($b64)
                    $rel = ($key -replace '/', '\') + '.png'
                    Save-File (Join-Path (Join-Path $ModRoot 'Textures') $rel) $bytes
                    $ok = $true
                    $msg = 'Textures\' + $rel
                } else { $msg = 'bad key' }
            }
            elseif ($to -eq 'asset') {
                $key = $query['key']
                if ($key -and $key -notmatch '\.\.') {
                    $txt = [System.Text.Encoding]::UTF8.GetString($req.body)
                    $b64 = $txt
                    $ci = $txt.IndexOf('base64,')
                    if ($ci -ge 0) { $b64 = $txt.Substring($ci + 7) }
                    $bytes = [Convert]::FromBase64String($b64)
                    $rel = ($key -replace '/', '\') + '.png'
                    Save-File (Join-Path (Join-Path $Root 'assets') $rel) $bytes
                    $ok = $true
                    $msg = 'assets\' + $rel
                } else { $msg = 'bad key' }
            }
            else { $msg = 'unknown target' }

            if ($ok) { Send-Text $stream '200 OK' ('OK ' + $msg) }
            else { Send-Text $stream '400 Bad Request' ('FAIL ' + $msg) }
        }
        elseif ($method -eq 'GET' -or $method -eq 'HEAD') {
            if ($pathPart -eq '/') { $pathPart = '/anatomy-editor.html' }
            $rel = $pathPart.TrimStart('/') -replace '/', '\'
            $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
            $rootFull = [System.IO.Path]::GetFullPath($Root)
            if ($rel -match '(^|\\)\.git(\\|$)' -or -not $full.StartsWith($rootFull, 'OrdinalIgnoreCase')) {
                Send-Text $stream '403 Forbidden' 'forbidden'
            }
            elseif (Test-Path -LiteralPath $full -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($full).ToLower()
                $ctype = 'application/octet-stream'
                if ($Mime.ContainsKey($ext)) { $ctype = $Mime[$ext] }
                $bytes = [System.IO.File]::ReadAllBytes($full)
                Send-Bytes $stream '200 OK' $ctype $bytes
            }
            else { Send-Text $stream '404 Not Found' ('404 ' + $rel) }
        }
        else { Send-Text $stream '405 Method Not Allowed' 'method not allowed' }
    }
    catch {
        try { Send-Text $stream '500 Internal Server Error' $_.Exception.Message } catch { }
    }
    finally {
        try { $client.Close() } catch { }
    }
}