$appPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $appPath

if (-not $env:GOOGLE_API_KEY -and -not $env:GEMINI_API_KEY) {
  Write-Host "Set GOOGLE_API_KEY first for Google AI image analysis:"
  Write-Host '$env:GOOGLE_API_KEY="your_google_ai_key"'
  exit 1
}

npm start
