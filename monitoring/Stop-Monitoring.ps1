$ErrorActionPreference = 'Stop'
$runRoot = Join-Path $PSScriptRoot 'run'
$processes = @(
  @{ Name = 'grafana'; Executable = Join-Path $PSScriptRoot 'grafana\tools\grafana-13.2.4\bin\grafana.exe' },
  @{ Name = 'prometheus'; Executable = Join-Path $PSScriptRoot 'prometheus\tools\prometheus-3.15.0.windows-amd64\prometheus-3.15.0.windows-amd64\prometheus.exe' }
)

foreach ($entry in $processes) {
  $pidFile = Join-Path $runRoot "$($entry.Name).pid"
  if (-not (Test-Path $pidFile)) { continue }

  $processId = 0
  if ([int]::TryParse((Get-Content -Raw $pidFile).Trim(), [ref]$processId)) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    if ($process -and $process.ExecutablePath -and
        [string]::Equals([System.IO.Path]::GetFullPath($process.ExecutablePath), [System.IO.Path]::GetFullPath($entry.Executable), [System.StringComparison]::OrdinalIgnoreCase)) {
      Stop-Process -Id $processId
      Write-Output "Stopped $($entry.Name)."
    }
  }
  Remove-Item $pidFile -Force
}
