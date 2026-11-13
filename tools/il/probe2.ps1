$game='C:\Program Files (x86)\Steam\steamapps\common\RimWorld'
$ws='C:\Program Files (x86)\Steam\steamapps\workshop\content\294100'
$list=@("$game\UnityStubs.dll", "$game\Assembly-CSharp.dll", "$ws\3328729902\1.7\Assemblies\MilkyWay.dll", "$ws\1127530465\Dependencies\0Harmony.dll")
foreach($p in $list){ try { $a=[Reflection.Assembly]::LoadFrom($p); Write-Output ("OK " + $a.GetName().Name) } catch { Write-Output ("FAIL " + $p + " :: " + $_.Exception.Message) } }
try { $h=[Reflection.Assembly]::LoadFrom("$ws\3328729902\1.7\Assemblies\NiceHediffTab.dll"); Write-Output ("OK " + $h.GetName().Name); $h.GetType('NiceHealthTab.DollWidget') | ForEach-Object { Write-Output $_.FullName } } catch { Write-Output ("HOSTFAIL " + $_.Exception.ToString()) }
