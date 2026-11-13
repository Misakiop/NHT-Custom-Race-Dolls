$game='C:\Program Files (x86)\Steam\steamapps\common\RimWorld'
$ws='C:\Program Files (x86)\Steam\steamapps\workshop\content\294100'
foreach($p in @("$game\UnityStubs.dll", "$game\Assembly-CSharp.dll", "$ws\3328729902\1.7\Assemblies\MilkyWay.dll", "$ws\1127530465\Dependencies\0Harmony.dll")){ try { [void][Reflection.Assembly]::LoadFrom($p) } catch {} }
$h=[Reflection.Assembly]::LoadFrom("$ws\3328729902\1.7\Assemblies\NiceHediffTab.dll")
Write-Output ("ASM: " + $h.FullName)
try { $ts=$h.GetTypes() } catch [Reflection.ReflectionTypeLoadException] { $ts=$_.Exception.Types | Where-Object {$_ -ne $null}; Write-Output ("LOADERR: " + ($_.Exception.LoaderExceptions[0].Message)) }
Write-Output ("TYPES: " + $ts.Count)
$ts | Where-Object { $_.Name -match 'Doll|Widget' } | ForEach-Object { Write-Output $_.FullName }
