param(
    [string]$TaskName = "FinanceHubDailyReport",
    [string]$Time = "07:30"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "..\..")
$publishScript = Join-Path $rootDir "tools\windows\publish-report.bat"

if (-not (Test-Path $publishScript)) {
    Write-Error "Script introuvable: $publishScript"
    exit 1
}

$triggerTime = [datetime]::ParseExact($Time, "HH:mm", $null)
$taskCommand = 'cmd.exe /c ""{0}""' -f $publishScript

schtasks /Create /SC DAILY /TN $TaskName /TR $taskCommand /ST $triggerTime.ToString("HH:mm") /F | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Error "Echec de creation de la tache planifiee."
    exit $LASTEXITCODE
}

Write-Host "Tache creee: $TaskName a $($triggerTime.ToString("HH:mm"))"
