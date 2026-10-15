$ErrorActionPreference = 'Stop'

$monitoringRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $monitoringRoot
$prometheusRoot = Join-Path $monitoringRoot 'prometheus'
$prometheusTools = Join-Path $prometheusRoot 'tools\prometheus-3.15.0.windows-amd64\prometheus-3.15.0.windows-amd64'
$grafanaTools = Join-Path $monitoringRoot 'grafana\tools'
$grafanaArchive = Join-Path $grafanaTools 'grafana_13.2.4_38252365904_windows_amd64.tar.gz'
$grafanaHome = Join-Path $grafanaTools 'grafana-13.2.4'
$runRoot = Join-Path $monitoringRoot 'run'
$logRoot = Join-Path $monitoringRoot 'logs'
$metricsSecret = Join-Path $prometheusRoot 'secrets\metrics_token'
$serverEnv = Join-Path $repoRoot 'server\.env'

foreach ($directory in @($runRoot, $logRoot, (Join-Path $prometheusRoot 'data'))) {
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

if (-not (Test-Path $serverEnv)) {
  throw 'server\.env is missing. Configure the server environment before starting monitoring.'
}

$metricsLine = Get-Content $serverEnv | Where-Object { $_ -match '^\s*METRICS_TOKEN\s*=' } | Select-Object -First 1
if (-not $metricsLine) {
  throw 'METRICS_TOKEN is missing from server\.env.'
}
$metricsToken = ($metricsLine -replace '^\s*METRICS_TOKEN\s*=', '').Trim()
if ($metricsToken.Length -ge 2 -and $metricsToken.StartsWith('"') -and $metricsToken.EndsWith('"')) {
  $metricsToken = $metricsToken.Substring(1, $metricsToken.Length - 2)
} elseif ($metricsToken.Length -ge 2 -and $metricsToken.StartsWith("'") -and $metricsToken.EndsWith("'")) {
  $metricsToken = $metricsToken.Substring(1, $metricsToken.Length - 2)
}
if ($metricsToken.Length -lt 32 -or $metricsToken -eq 'REPLACE_ME') {
  throw 'METRICS_TOKEN must be at least 32 characters and configured in server\.env.'
}

try {
  Invoke-RestMethod -Uri 'http://127.0.0.1:5000/health/ready' -TimeoutSec 3 | Out-Null
  $metricsResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:5000/metrics' `
    -Headers @{ Authorization = "Bearer $metricsToken" } -TimeoutSec 3
  if ($metricsResponse.StatusCode -ne 200) { throw 'The metrics endpoint did not return HTTP 200.' }
} catch {
  throw 'FitFlow API is not ready on port 5000 with the METRICS_TOKEN from server\.env. Start/restart the API, then retry monitoring.'
}

$secretDirectory = Split-Path -Parent $metricsSecret
New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
$existingToken = if (Test-Path $metricsSecret) { (Get-Content -Raw $metricsSecret).Trim() } else { '' }
if ($existingToken -cne $metricsToken) {
  [System.IO.File]::WriteAllText($metricsSecret, $metricsToken, [System.Text.Encoding]::ASCII)
}
Remove-Variable metricsToken, existingToken

$prometheusExe = Join-Path $prometheusTools 'prometheus.exe'
$promtoolExe = Join-Path $prometheusTools 'promtool.exe'
$prometheusConfig = Join-Path $prometheusRoot 'prometheus.native.yml'
if (-not (Test-Path $prometheusExe)) { throw "Prometheus executable not found: $prometheusExe" }
if (-not (Test-Path $promtoolExe)) { throw "promtool executable not found: $promtoolExe" }
if (-not (Test-Path $prometheusConfig)) { throw "Prometheus config not found: $prometheusConfig" }

& $promtoolExe check config $prometheusConfig
if ($LASTEXITCODE -ne 0) { throw 'Prometheus configuration validation failed.' }

if (-not (Test-Path (Join-Path $grafanaHome 'bin\grafana.exe'))) {
  if (-not (Test-Path $grafanaArchive)) { throw "Grafana archive not found: $grafanaArchive" }
  & tar -xzf $grafanaArchive -C $grafanaTools
  if ($LASTEXITCODE -ne 0) { throw 'Could not extract the bundled Grafana archive.' }
}
$grafanaExe = Join-Path $grafanaHome 'bin\grafana.exe'
if (-not (Test-Path $grafanaExe)) { throw "Grafana executable not found: $grafanaExe" }

$prometheusData = Join-Path $prometheusRoot 'data'
$grafanaProvisioning = Join-Path $monitoringRoot 'grafana\provisioning'
$grafanaData = Join-Path $monitoringRoot 'grafana\data'
$grafanaLogs = Join-Path $monitoringRoot 'grafana\logs'
$grafanaPlugins = Join-Path $monitoringRoot 'grafana\plugins'
foreach ($directory in @($grafanaData, $grafanaLogs, $grafanaPlugins)) {
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

function Test-Endpoint([string]$Uri) {
  try {
    Invoke-RestMethod -Uri $Uri -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Start-MonitoringProcess(
  [string]$Name,
  [string]$Executable,
  [string[]]$Arguments,
  [string]$WorkingDirectory
) {
  $pidFile = Join-Path $runRoot "$Name.pid"
  if (Test-Path $pidFile) {
    $savedPid = 0
    if ([int]::TryParse((Get-Content -Raw $pidFile).Trim(), [ref]$savedPid)) {
      $savedProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $savedPid" -ErrorAction SilentlyContinue
      if ($savedProcess -and $savedProcess.ExecutablePath -and
          [string]::Equals([System.IO.Path]::GetFullPath($savedProcess.ExecutablePath), [System.IO.Path]::GetFullPath($Executable), [System.StringComparison]::OrdinalIgnoreCase)) {
        return $savedPid
      }
    }
    Remove-Item $pidFile -Force
  }

  $stdout = Join-Path $logRoot "$Name.out.log"
  $stderr = Join-Path $logRoot "$Name.err.log"
  $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  Set-Content -Path $pidFile -Value $process.Id -NoNewline
  return $process.Id
}

$prometheusReady = Test-Endpoint 'http://127.0.0.1:9090/-/ready'
if (-not $prometheusReady) {
  $prometheusArgs = @(
    "--config.file=`"$prometheusConfig`"",
    "--storage.tsdb.path=`"$prometheusData`"",
    '--web.listen-address=127.0.0.1:9090'
  )
  Start-MonitoringProcess 'prometheus' $prometheusExe $prometheusArgs $prometheusRoot | Out-Null
  for ($attempt = 0; $attempt -lt 30 -and -not $prometheusReady; $attempt++) {
    Start-Sleep -Seconds 1
    $prometheusReady = Test-Endpoint 'http://127.0.0.1:9090/-/ready'
  }
  if (-not $prometheusReady) { throw "Prometheus failed to start; see $logRoot\prometheus.err.log" }
}

$savedEnvironment = @{}
$environment = @{
  PROMETHEUS_URL = 'http://127.0.0.1:9090'
  DASHBOARDS_PATH = (Join-Path $monitoringRoot 'grafana\provisioning\dashboards')
  GF_PATHS_HOME = $grafanaHome
  GF_PATHS_DATA = $grafanaData
  GF_PATHS_LOGS = $grafanaLogs
  GF_PATHS_PLUGINS = $grafanaPlugins
  GF_PATHS_PROVISIONING = $grafanaProvisioning
  GF_SERVER_HTTP_ADDR = '127.0.0.1'
  GF_SERVER_HTTP_PORT = '3000'
  GF_ANALYTICS_REPORTING_ENABLED = 'false'
  GF_ANALYTICS_CHECK_FOR_UPDATES = 'false'
  GF_ANALYTICS_CHECK_FOR_PLUGIN_UPDATES = 'false'
  GF_PLUGINS_PREINSTALL_DISABLED = 'true'
}
foreach ($key in $environment.Keys) {
  $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
  [Environment]::SetEnvironmentVariable($key, $environment[$key], 'Process')
}

try {
  $grafanaReady = Test-Endpoint 'http://127.0.0.1:3000/api/health'
  if (-not $grafanaReady) {
    Start-MonitoringProcess 'grafana' $grafanaExe @('server') $grafanaHome | Out-Null
    for ($attempt = 0; $attempt -lt 45 -and -not $grafanaReady; $attempt++) {
      Start-Sleep -Seconds 1
      $grafanaReady = Test-Endpoint 'http://127.0.0.1:3000/api/health'
    }
    if (-not $grafanaReady) { throw "Grafana failed to start; see $logRoot\grafana.err.log" }
  }
} finally {
  foreach ($key in $savedEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process')
  }
}

Write-Output 'FitFlow monitoring is ready.'
Write-Output 'Grafana:    http://127.0.0.1:3000'
Write-Output 'Prometheus: http://127.0.0.1:9090'
if (-not (Test-Endpoint 'http://127.0.0.1:9182/metrics')) {
  Write-Warning 'Windows system metrics are not available yet. Install windows_exporter as described in monitoring\README.md.'
}
