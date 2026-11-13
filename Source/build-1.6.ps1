param([string]$OutDir = '')
# Build NHT_CustomDolls.dll for RimWorld 1.6 (Mono / .NET Framework 4.x).
$ErrorActionPreference = 'Stop'

$mod = Split-Path -Parent $PSScriptRoot
$rw  = "C:\Misaki\Game\RimWorld\RimWorld1.6"
$mg  = Join-Path $rw "RimWorldWin64_Data\Managed"
$nht = Join-Path $rw "Mods\_Link_3328729902\1.6\Assemblies"
$harmony = Join-Path $rw "Mods\2009463077\Current\Assemblies\0Harmony.dll"
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

# 1.6 build -> mod\1.6\Assemblies (LoadFolders.xml picks this folder on 1.6; the 1.7
# build lives in mod\1.7\Assemblies and is produced by build.ps1).
$out = if ($OutDir) { $OutDir } else { Join-Path $mod "1.6\Assemblies" }
New-Item -ItemType Directory -Force -Path $out | Out-Null

$refs = @(
  (Join-Path $mg "mscorlib.dll"),
  (Join-Path $mg "System.dll"),
  (Join-Path $mg "System.Core.dll"),
  (Join-Path $mg "System.Xml.dll"),
  (Join-Path $mg "netstandard.dll"),
  (Join-Path $mg "Assembly-CSharp.dll"),
  (Join-Path $mg "UnityEngine.CoreModule.dll"),
  (Join-Path $mg "UnityEngine.IMGUIModule.dll"),
  (Join-Path $mg "UnityEngine.TextRenderingModule.dll"),
  (Join-Path $mg "UnityEngine.UIModule.dll"),
  (Join-Path $mg "UnityEngine.ImageConversionModule.dll"),
  (Join-Path $mg "UnityEngine.InputLegacyModule.dll"),
  (Join-Path $nht "NiceHediffTab.dll"),
  (Join-Path $nht "MilkyWay.dll"),
  $harmony
)

$srcs = Get-ChildItem (Join-Path $mod "Source") -Filter *.cs | ForEach-Object { $_.FullName }
$srcs = $srcs | Where-Object { $_ -notmatch 'ShaderLoadGuard' }

$a = @('/nologo', '/noconfig', '/nostdlib+', '/target:library', '/langversion:5', '/optimize+', '/define:NHT_16', "/out:$out\NHT_CustomDolls.dll")
foreach ($r in $refs) { $a += "/r:$r" }
$a += $srcs
& $csc @a 2>&1 | Where-Object { $_ -notmatch 'CS1685' }
if ($LASTEXITCODE -ne 0) { throw "compile failed ($LASTEXITCODE)" }
Write-Host "built: $((Get-Item "$out\NHT_CustomDolls.dll").Length) bytes"
