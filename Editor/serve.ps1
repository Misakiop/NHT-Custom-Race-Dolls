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
