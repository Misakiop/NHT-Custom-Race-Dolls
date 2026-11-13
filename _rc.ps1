$ModRoot='C:\Misaki\Game\RimCrow\mods\NHT_CustomDollTest'
$dir='C:\Misaki\Work\github\NHT_CustomDolls'
$sw=[Diagnostics.Stopwatch]::StartNew()
$out = & robocopy $ModRoot $dir /E /MT:8 /XD .git .vs bin obj "Editor\NHT-Anatomy-Editor.exe.WebView2" "Editor\history" "Editor\_backup" "Editor\assets" "_backup" "_analysis" /XF nht-project.js *.bak *.bak.* /NFL /NDL /NJH /NJS /NP 2>&1
$sw.Stop()
Write-Output ("ms=" + $sw.ElapsedMilliseconds + " rc=" + $LASTEXITCODE)
$out | Select-Object -Last 5
