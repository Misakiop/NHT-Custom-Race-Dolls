param([string]$OutDir = '')
﻿#!/usr/bin/env pwsh
# Build NHT_CustomDolls.dll (Harmony + mod settings) against RimWorld 1.7 / NHT.
$ErrorActionPreference = 'Stop'

$mod      = Split-Path -Parent $PSScriptRoot   # 模组根目录（文件夹改名也不影响）
if (-not (Test-Path (Join-Path $mod "About"))) { $mod = "C:\Misaki\Game\RimCrow\mods\NHT_CustomDolls" }
$rw       = "C:\Program Files (x86)\Steam\steamapps\common\RimWorld"
$ws       = "C:\Program Files (x86)\Steam\steamapps\workshop\content\294100"
$nht      = Join-Path $ws "3328729902\1.7\Assemblies\NiceHediffTab.dll"
$harmony  = Join-Path $ws "1127530465\Dependencies\0Harmony.dll"
$milky    = Join-Path $ws "3328729902\1.7\Assemblies\MilkyWay.dll"
$net      = "C:\Program Files\dotnet\shared\Microsoft.NETCore.App\10.0.10"
$csc      = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

$out = if ($OutDir) { $OutDir } else { Join-Path $mod "Assemblies" }
New-Item -ItemType Directory -Force -Path $out | Out-Null

$refs = @(
  (Join-Path $rw "Assembly-CSharp.dll"),
  $milky,
  (Join-Path $rw "UnityStubs.dll"),
  $harmony,
  $nht,
  (Join-Path $net "System.Runtime.dll"),
  (Join-Path $net "System.Collections.dll"),
  (Join-Path $net "System.Private.CoreLib.dll")
)

$srcs = Get-ChildItem (Join-Path $mod "Source") -Filter *.cs | ForEach-Object { $_.FullName }

$args = @('/nologo', '/nostdlib+', '/target:library', '/langversion:5', '/optimize+',
          "/out:$out\NHT_CustomDolls.dll")
foreach ($r in $refs) { $args += "/r:$r" }
$args += $srcs

& $csc @args 2>&1 | Where-Object { $_ -notmatch 'CS1685' }
if ($LASTEXITCODE -ne 0) { throw "compile failed ($LASTEXITCODE)" }
Write-Host "built: $((Get-Item "$out\NHT_CustomDolls.dll").Length) bytes"

