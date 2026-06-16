$appPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $appPath "public")
py -m http.server 4174
