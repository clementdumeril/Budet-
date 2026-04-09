param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectDir
)

$ErrorActionPreference = "Stop"

$projectPattern = [Regex]::Escape($ProjectDir)
$matchedProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match $projectPattern -and
    (
        $_.CommandLine -match "uvicorn backend\.main:app" -or
        $_.CommandLine -match "npm\.cmd run dev" -or
        $_.CommandLine -match "\bvite\b"
    )
}

foreach ($process in $matchedProcesses) {
    try {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
    } catch {
        Write-Warning "Impossible d'arreter le processus $($process.ProcessId): $($_.Exception.Message)"
    }
}
