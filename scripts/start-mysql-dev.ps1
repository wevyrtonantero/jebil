$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$mysqlPort = 3307
$mysqlConfig = Join-Path $repoRoot ".mysql-dev\my.ini"
$mysqlBinary = "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysqld.exe"
$stderrLog = Join-Path $repoRoot ".mysql-dev\logs\mysqld-console.err.log"
$stdoutLog = Join-Path $repoRoot ".mysql-dev\logs\mysqld-console.out.log"

function Test-PortListening {
  param([int]$Port)

  return [bool](Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -eq $Port } |
    Select-Object -First 1)
}

if (Test-PortListening -Port $mysqlPort) {
  Write-Host "MySQL dev already listening on port $mysqlPort."
  exit 0
}

if (-not (Test-Path $mysqlConfig)) {
  throw "MySQL dev config not found at '$mysqlConfig'."
}

if (-not (Test-Path $mysqlBinary)) {
  throw "mysqld.exe not found at '$mysqlBinary'."
}

$logDir = Split-Path -Parent $stderrLog
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

Start-Process -FilePath $mysqlBinary `
  -WindowStyle Hidden `
  -ArgumentList "--defaults-file=$mysqlConfig", "--console" `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 500

  if (Test-PortListening -Port $mysqlPort) {
    Write-Host "MySQL dev started on port $mysqlPort."
    exit 0
  }
}

$tail = ""
if (Test-Path $stderrLog) {
  $tail = Get-Content $stderrLog -Tail 20 | Out-String
}

throw "MySQL dev did not start on port $mysqlPort.`n$tail"
