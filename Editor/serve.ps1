# NHT 解剖编辑器本地服务（由 启动编辑器.bat 直接启动；关闭窗口即停止）
# 自己用 TcpListener 实现最小 HTTP 服务：不需要管理员权限，也不占用 http.sys。
param(
    [string]$RootPath = '',
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'

if (-not $RootPath -or -not (Test-Path -LiteralPath $RootPath)) {
    $RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$Root    = $RootPath
$ModRoot = Split-Path -Parent $Root
$Port    = 8765
$MaxPort = 8785

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
            'Connection: close' + $crlf + $crlf
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
}

function Send-Text($stream, [string]$status, [string]$text) {
    Send-Bytes $stream $status 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes($text))
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

$port = Get-FreePort $Port $MaxPort
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
            if ($query['sync'] -eq '1') {
                try { $null = & robocopy $ModRoot $dir /E /XD .git .vs bin obj /XF *.bak *.bak.* /NFL /NDL /NJH /NJS /NP 2>&1 } catch { }
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
            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $true; files = $list })
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
            Send-Json $stream '200 OK' ([pscustomobject]@{
                ok = $true; installed = $true; path = $git; version = $ver.text.Trim()
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
        elseif ($pathPart -eq '/__git' -or $pathPart -eq '/__gitpush' -or $pathPart -eq '/__gitpull') {
            $git = Get-GitExe
            $dir = $query['dir']
            $branch = $query['branch']
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
                $aheadR = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', ('origin/' + $branch + '..HEAD'))
                $behind = 0; $ahead = 0
                [int]::TryParse($behindR.text.Trim(), [ref]$behind) | Out-Null
                [int]::TryParse($aheadR.text.Trim(), [ref]$ahead) | Out-Null

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
                $name = $query['name']; if (-not $name) { $name = 'NHT Editor' }
                $email = $query['email']; if (-not $email) { $email = 'nht-editor@localhost' }
                # sync=1：先把当前模组目录的内容镜像到仓库目录（不删除仓库独有文件）
                $syncText = ''
                if ($query['sync'] -eq '1') {
                    try {
                        $rc = & robocopy $ModRoot $dir /E /XD .git .vs bin obj Editor\history Editor\assets /XF *.bak *.bak.* /NFL /NDL /NJH /NJS /NP 2>&1
                        $syncText = "已同步模组文件到仓库目录（robocopy 退出码 " + $LASTEXITCODE + "）`n"
                    } catch { $syncText = "同步模组文件失败：" + $_.Exception.Message + "`n" }
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

                # 先看远端有没有新提交：落后就要求先拉取，避免 non-fast-forward
                $null = Invoke-GitNet $git @('-C', $dir, 'fetch', 'origin', '--quiet') 8
                $behindR = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', ('HEAD..origin/' + $branch))
                $behind = 0
                [int]::TryParse($behindR.text.Trim(), [ref]$behind) | Out-Null
                if ($behind -gt 0) {
                    $aheadR = Invoke-Git $git @('-C', $dir, 'rev-list', '--count', ('origin/' + $branch + '..HEAD'))
                    $ahead = 0
                    [int]::TryParse($aheadR.text.Trim(), [ref]$ahead) | Out-Null
                    if ($ahead -eq 0) {
                        # 只是落后：直接快进，然后继续推送，用户不用手动点拉取
                        $ffR = Invoke-GitNet $git @('-C', $dir, 'pull', '--ff-only', 'origin', $branch) 20
                        if ($ffR.code -eq 0) {
                            $behind = 0
                        } else {
                            $text = ($syncText + $addR.text + $commitR.text + $ffR.text + "自动快进失败，请手动点「拉取远端」。")
                            Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; hint = 'pull-first'; behind = $behind; commitCode = $commitR.code; pushCode = -1; log = $text })
                            continue
                        }
                    } else {
                        $text = ($syncText + $addR.text + $commitR.text + "本地和远端都有新提交（本地领先 $ahead / 落后 $behind），已阻止推送。`n请先点「拉取远端」合并后再推送。")
                        Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; hint = 'diverged'; behind = $behind; ahead = $ahead; commitCode = $commitR.code; pushCode = -1; log = $text })
                        continue
                    }
                }

                # 请求的分支和当前本地分支不同 → 从当前 HEAD 建一个同名分支推上去，推完切回
                $curR = Invoke-Git $git @('-C', $dir, 'rev-parse', '--abbrev-ref', 'HEAD')
                $cur = $curR.text.Trim()
                $switchBack = $false
                $switchText = ''
                if ($cur -and $cur -ne $branch) {
                    $coR = Invoke-Git $git @('-C', $dir, 'checkout', '-B', $branch)
                    $switchText = $coR.text
                    if ($coR.code -ne 0) {
                        Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; hint = 'branch-switch'; commitCode = $commitR.code; pushCode = -1; log = ($syncText + $addR.text + $commitR.text + $switchText) })
                        continue
                    }
                    $switchBack = $true
                }

                $commitTxt = [string]$commitR.text
                if ($commitR.code -ne 0 -and ($commitTxt -match 'nothing to commit|no changes added|nothing added')) {
                    $text = ($syncText + $addR.text + $commitTxt + "选中的文件没有产生任何改动（可能路径不匹配或已被忽略）。")
                    Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $false; hint = 'nothing-staged'; commitCode = $commitR.code; pushCode = -1; log = $text })
                    continue
                }
                $pushR = Invoke-GitNet $git @('-C', $dir, 'push', '-u', 'origin', $branch) 25
                $text = ($syncText + $addR.text + $commitR.text + $switchText + $pushR.text)
                $ok = ($pushR.code -eq 0)

                if ($switchBack) {
                    $backR = Invoke-Git $git @('-C', $dir, 'checkout', $cur, '--quiet')
                    $text = $text + $backR.text
                }
                Send-Json $stream '200 OK' ([pscustomobject]@{ ok = $ok; commitCode = $commitR.code; pushCode = $pushR.code; log = $text })
                continue
            }

            if ($pathPart -eq '/__gitpull') {
                $fetchR = Invoke-GitNet $git @('-C', $dir, 'fetch', 'origin') 12
                $pullR = Invoke-GitNet $git @('-C', $dir, 'pull', '--ff-only', 'origin', $branch) 20
                $mode = 'ff'
                $log = $fetchR.text + $pullR.text
                if ($pullR.code -ne 0 -and ($pullR.text -match 'Not possible to fast-forward|diverging|diverged')) {
                    # 本地和远端分叉：先把本地提交变基到远端（保留双方提交，历史线性）
                    $reb = Invoke-GitNet $git @('-C', $dir, 'pull', '--rebase', '--autostash', 'origin', $branch) 25
                    $log = $log + "`n—— 检测到分叉，改用 rebase ——`n" + $reb.text
                    if ($reb.code -eq 0) {
                        $mode = 'rebase'
                        $pullR = $reb
                    } else {
                        $null = Invoke-Git $git @('-C', $dir, 'rebase', '--abort')
                        # rebase 冲突：退回合并提交
                        $mrg = Invoke-GitNet $git @('-C', $dir, 'pull', '--no-rebase', '--no-ff', '--no-edit', 'origin', $branch) 25
                        $log = $log + "`n—— rebase 未成功，改用 merge ——`n" + $mrg.text
                        if ($mrg.code -eq 0) { $mode = 'merge'; $pullR = $mrg }
                        else { $null = Invoke-Git $git @('-C', $dir, 'merge', '--abort'); $log = $log + "`n合并也失败，仓库保持原样（没有半途状态）。" }
                    }
                }
                Send-Json $stream '200 OK' ([pscustomobject]@{ ok = ($pullR.code -eq 0); mode = $mode; log = $log })
                continue
            }
        }
        elseif ($pathPart -eq '/__modzip' -and ($method -eq 'GET' -or $method -eq 'HEAD')) {
            # 把整个模组文件夹（不含 Editor）打包成 zip 交给浏览器下载
            $stage = $null; $zip = $null
            try {
                $tmp = [System.IO.Path]::GetTempPath()
                $stamp = [Guid]::NewGuid().ToString('N')
                $stage = Join-Path $tmp ('nhtstage-' + $stamp)
                $zip = Join-Path $tmp ('nhtmod-' + $stamp + '.zip')
                New-Item -ItemType Directory -Path $stage -Force | Out-Null
                $skip = @('Editor', '.git', '.vs', 'bin', 'obj')
                Get-ChildItem -LiteralPath $ModRoot -Force | Where-Object { $skip -notcontains $_.Name } | ForEach-Object {
                    Copy-Item -LiteralPath $_.FullName -Destination $stage -Recurse -Force
                }
                Get-ChildItem -LiteralPath $stage -Recurse -Force -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -eq '.bak' -or $_.Extension -eq '.tmp' -or $_.Extension -eq '.orig' } | Remove-Item -Force -ErrorAction SilentlyContinue
                foreach ($junk in @('Source\bin', 'Source\obj')) {
                    $jp = Join-Path $stage $junk
                    if (Test-Path -LiteralPath $jp) { Remove-Item -LiteralPath $jp -Recurse -Force -ErrorAction SilentlyContinue }
                }
                if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
                Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal -Force
                $bytes = [System.IO.File]::ReadAllBytes($zip)
                Send-Bytes $stream '200 OK' 'application/zip' $bytes
            }
            catch {
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
            if (-not $full.StartsWith($rootFull, 'OrdinalIgnoreCase')) {
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
