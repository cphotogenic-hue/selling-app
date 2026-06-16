$appPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $ip) {
  $ip = "YOUR-COMPUTER-IP"
}

Write-Host ""
Write-Host "Phone app is starting."
Write-Host ""
Write-Host "On your phone, use the same Wi-Fi as this computer."
Write-Host "Then open:"
Write-Host "http://$ip`:4174"
Write-Host ""
Write-Host "Leave this window open while using the phone app."
Write-Host ""

Set-Location $appPath
py phone_ai_server.py
