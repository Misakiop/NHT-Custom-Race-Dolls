$ErrorActionPreference='Stop'
$game='C:\Program Files (x86)\Steam\steamapps\common\RimWorld'
$ws='C:\Program Files (x86)\Steam\steamapps\workshop\content\294100'
$dirs=@($game, "$ws\3328729902\1.7\Assemblies", "$ws\1127530465\Dependencies", 'C:\Misaki\Game\RimCrow\mods\NHT_CustomDolls\Assemblies')
$onResolve = [ResolveEventHandler]{
  param($sender,$e)
  $n = (New-Object Reflection.AssemblyName($e.Name)).Name + '.dll'
  foreach($d in $dirs){ $p = Join-Path $d $n; if(Test-Path $p){ return [Reflection.Assembly]::LoadFrom($p) } }
  return $null
}
[AppDomain]::CurrentDomain.add_AssemblyResolve($onResolve)
$asmPath="$ws\3328729902\1.7\Assemblies\NiceHediffTab.dll"
$asm=[Reflection.Assembly]::Load([IO.File]::ReadAllBytes($asmPath))
try { $types=$asm.GetTypes() } catch [Reflection.ReflectionTypeLoadException] { $types=$_.Exception.Types | Where-Object {$_ -ne $null} }
$types | Where-Object { $_.Name -match 'Doll' } | ForEach-Object { $_.FullName }
