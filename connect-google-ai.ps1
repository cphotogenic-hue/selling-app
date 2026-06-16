$appPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $appPath

$key = Read-Host "Paste your Google AI key"
if (-not $key) {
  Write-Host "No key entered."
  exit 1
}

$env:GOOGLE_API_KEY = $key
Write-Host ""
Write-Host "Starting phone app with Google AI connected."
Write-Host "Leave this window open."
Write-Host ""

$connections = Get-NetTCPConnection -LocalPort 4174 -ErrorAction SilentlyContinue
foreach ($connection in $connections) {
  if ($connection.OwningProcess) {
    Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 1

.\start-phone.ps1
