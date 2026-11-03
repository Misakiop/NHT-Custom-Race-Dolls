# 修复「Hediff_Level has null part after loading.」
# 原因：某些模组的背景故事用 forcedHediffs 强塞了一个「需要身体部位」的 Hediff_Level
#       （例如 RemoteRepairerImplant 必须装在 Brain），强塞时没有 part，
#       存档里就留下 part = null 的 hediff，每次读档都报这个错。
# 做法：把这个坏掉的 hediff 从存档里删掉（它本来就不生效），并自动备份。
param([string]$SavePath = '')

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-SaveFiles {
    $roots = New-Object System.Collections.Generic.List[string]
    $roots.Add((Join-Path $env:UserProfile 'AppData\LocalLow\Ludeon Studios\RimWorld by Ludeon Studios\Saves'))
    $profiles = 'C:\Misaki\Game\RimCrow\data\profiles'
    if (Test-Path $profiles) {
        Get-ChildItem $profiles -Directory -ErrorAction SilentlyContinue |
            ForEach-Object { $roots.Add((Join-Path $_.FullName 'Saves')) }
    }
    $files = New-Object System.Collections.Generic.List[string]
    foreach ($r in $roots) {
        if (-not (Test-Path $r)) { continue }
        Get-ChildItem $r -Filter *.rws -File -ErrorAction SilentlyContinue |
            ForEach-Object { $files.Add($_.FullName) }
    }
    return $files
}

# 从 $start（指向 <li 的 '<'）开始，找到与它配对的 </li> 之后的位置
function Find-LiEnd([string]$text, [int]$start) {
    $depth = 0
    $i = $start
    while ($i -lt $text.Length) {
        $open = $text.IndexOf('<li', $i)
        $close = $text.IndexOf('</li>', $i)
        if ($close -lt 0) { return -1 }
        if ($open -ge 0 -and $open -lt $close) {
            $gt = $text.IndexOf('>', $open)
            $selfClose = $false
            if ($gt -gt 0) {
                $slice = $text.Substring($open, $gt - $open)
                if ($slice.TrimEnd().EndsWith('/')) { $selfClose = $true }
            }
            if (-not $selfClose) { $depth++ }
            $i = $gt + 1
        } else {
            $depth--
            $i = $close + 5
            if ($depth -eq 0) { return $i }
        }
    }
    return -1
}

function Fix-Save([string]$path) {
    $raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $removed = 0
    $names = New-Object System.Collections.Generic.List[string]
    $pos = 0
    while ($true) {
        $idx = $raw.IndexOf('<li Class="Hediff_Level">', $pos)
        if ($idx -lt 0) { break }
        $end = Find-LiEnd $raw $idx
        if ($end -lt 0) { break }
        $block = $raw.Substring($idx, $end - $idx)
        $defM = [regex]::Match($block, '<def>([^<]+)</def>')
        $hasPart = $block -match '<part>'
        if ($defM.Success -and -not $hasPart) {
            $names.Add($defM.Groups[1].Value)
            $raw = $raw.Substring(0, $idx) + $raw.Substring($end)
            $removed++
            $pos = $idx
        } else {
            $pos = $end
        }
    }
    if ($removed -gt 0) {
        $bak = $path + '.bak-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
        Copy-Item $path $bak -Force
        [System.IO.File]::WriteAllText($path, $raw, $utf8)
        Write-Host ("已修复：" + [System.IO.Path]::GetFileName($path) + "（删除 " + $removed + " 个空部位 hediff：" + ($names -join ', ') + "）")
        Write-Host ("  备份：" + $bak)
    } else {
        Write-Host ("无需修改：" + [System.IO.Path]::GetFileName($path))
    }
}

if ($SavePath) {
    Fix-Save (Resolve-Path $SavePath).Path
} else {
    $files = Get-SaveFiles
    if (-not $files -or $files.Count -eq 0) {
        Write-Host '没有找到存档（.rws）。可以把存档文件拖到这个 bat 上。'
    } else {
        foreach ($f in $files) { Fix-Save $f }
    }
}
Write-Host ''
Read-Host '按回车关闭'
