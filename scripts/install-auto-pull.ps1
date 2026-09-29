param(
    [ValidateRange(1, 1440)]
    [int]$IntervalMinutes = 2
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$pullScript = Join-Path $PSScriptRoot 'auto-pull.ps1'
$git = (Get-Command git.exe -ErrorAction Stop).Source
$taskName = 'Tacticus Upgrade Helper - Auto Pull Main'

if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) {
    throw "Run this script from the scripts folder in your local Git checkout: $repo"
}

# Repeat at the requested interval each day. Interactive logon uses the signed-in user's
# existing Git credentials without a stored Windows password.
$actionArgs = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -RepoPath "{1}" -GitPath "{2}"' -f $pullScript, $repo, $git
$action = New-ScheduledTaskAction -Execute (Join-Path $PSHOME 'powershell.exe') -Argument $actionArgs -WorkingDirectory $repo
$daily = New-ScheduledTaskTrigger -Daily -At 00:00
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes($IntervalMinutes) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 1)
$daily.Repetition = $repeat.Repetition
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $daily -Principal $principal -Settings $settings -Force | Out-Null

# Run once immediately so the current checkout catches up and errors are visible.
& $pullScript -RepoPath $repo -GitPath $git
if ($LASTEXITCODE -ne 0) {
    Write-Warning "The task was installed, but this pull failed. See $env:LOCALAPPDATA\TacticusUpgradeHelper\auto-pull.log"
}
Write-Host "Auto-pull installed. Windows checks main every $IntervalMinutes minutes while this PC is on."
Write-Host "Only local main is updated. Git keeps local edits and refuses conflicts."
Write-Host "Pause: Disable-ScheduledTask -TaskName `"$taskName`""
Write-Host "Resume: Enable-ScheduledTask -TaskName `"$taskName`""
Write-Host "To remove: Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false"
