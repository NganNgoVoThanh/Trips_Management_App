# Trip Management System - Windows Auto-Startup Setup
# =====================================================
# This script creates a Windows Task Scheduler task to auto-start the app on system boot

Write-Host ""
Write-Host "========================================"
Write-Host "  Trip Management System"
Write-Host "  Windows Auto-Startup Setup"
Write-Host "========================================"
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click on PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Get current directory
$currentDir = $PSScriptRoot
$batchFile = Join-Path $currentDir "start-production.bat"

# Check if batch file exists
if (-not (Test-Path $batchFile)) {
    Write-Host "ERROR: start-production.bat not found" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory" -ForegroundColor Yellow
    pause
    exit 1
}

# Task Scheduler parameters
$taskName = "Trip Management System - Auto Start"
$taskDescription = "Automatically starts Trip Management System on Windows startup"
$taskAction = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batchFile`""
$taskTrigger = New-ScheduledTaskTrigger -AtStartup
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task already exists. Updating..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the scheduled task
try {
    Register-ScheduledTask -TaskName $taskName `
                          -Description $taskDescription `
                          -Action $taskAction `
                          -Trigger $taskTrigger `
                          -Principal $taskPrincipal `
                          -Settings $taskSettings `
                          -Force | Out-Null

    Write-Host ""
    Write-Host "========================================"
    Write-Host "SUCCESS: Auto-startup configured!"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "The application will now start automatically on system boot."
    Write-Host ""
    Write-Host "To manage the task:"
    Write-Host "- Open Task Scheduler (taskschd.msc)"
    Write-Host "- Look for: '$taskName'"
    Write-Host ""
    Write-Host "To remove auto-startup, run:"
    Write-Host "  schtasks /delete /tn `"$taskName`" /f"
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create scheduled task" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

pause
