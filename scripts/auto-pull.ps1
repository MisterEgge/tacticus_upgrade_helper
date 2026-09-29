param(
    [string]$RepoPath = (Split-Path -Parent $PSScriptRoot),
    [string]$GitPath = 'git.exe'
)

$ErrorActionPreference = 'Stop'
$logDir = Join-Path $env:LOCALAPPDATA 'TacticusUpgradeHelper'
$logFile = Join-Path $logDir 'auto-pull.log'

function Write-UpdateLog([string]$Message) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Add-Content -Path $logFile -Value ("{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
}

try {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoPath '.git'))) {
        throw "No Git checkout at $RepoPath"
    }

    $branch = (& $GitPath -C $RepoPath symbolic-ref --quiet --short HEAD 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Could not read the current branch: $branch" }
    if ($branch -ne 'main') { return } # Never merge main into a work branch.

    $before = (& $GitPath -C $RepoPath rev-parse HEAD 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Could not read local commit: $before" }

    # Git preserves unrelated edits and refuses a pull that would overwrite them.
    # Schannel uses the Windows certificate store; certificate verification stays enabled.
    $result = (& $GitPath -c http.sslBackend=schannel -C $RepoPath pull --ff-only origin main 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Git pull failed: $result" }

    $after = (& $GitPath -C $RepoPath rev-parse HEAD 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Pull finished but could not read the new commit: $after" }
    if ($before -ne $after) { Write-UpdateLog "Updated main $before -> $after" }
}
catch {
    Write-UpdateLog $_.Exception.Message
    exit 1
}
