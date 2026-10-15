# FitFlow monitoring

The monitoring stack observes the FitFlow API, MongoDB connectivity, and the Windows host:

- Prometheus scrapes application and host metrics every 15 seconds and evaluates alert rules.
- Grafana loads the provisioned **FitFlow Overview** dashboard and Prometheus datasource.
- `windows_exporter` supplies Windows CPU, memory, disk, and network metrics.
- Prometheus and Grafana bind to `127.0.0.1` in the native Windows setup.

## Start on Windows

Prerequisites: Node.js dependencies installed, a working server `.env`, and the API running on port 5000. The Prometheus binary and Grafana archive are already included under `monitoring`.

From the repository root, start the API in one terminal:

```powershell
Set-Location server
npm start
```

In a second PowerShell terminal, start monitoring:

```powershell
Set-Location ..
powershell -ExecutionPolicy Bypass -File .\monitoring\Start-Monitoring.ps1
```

The script validates the Prometheus config, synchronizes the ignored Prometheus credentials file with `METRICS_TOKEN` from `server\.env` without printing the token, extracts the bundled Grafana archive on first run, and starts both services.

- Grafana: <http://127.0.0.1:3000>
- Prometheus: <http://127.0.0.1:9090>
- Prometheus targets: <http://127.0.0.1:9090/targets>

Grafana's initial local login is `admin` / `admin`; change the password when prompted. The dashboard is provisioned in the **FitFlow** folder. Prometheus and Grafana data, logs, runtime PID files, and the metrics token are ignored by Git.

Stop only the monitoring processes started by the script:

```powershell
powershell -ExecutionPolicy Bypass -File .\monitoring\Stop-Monitoring.ps1
```

## Enable Windows host metrics

Install the official `windows_exporter` MSI from the [windows_exporter releases](https://github.com/prometheus-community/windows_exporter/releases) on the machine running the API/Prometheus. Its MSI supports the `LISTEN_ADDR` and `LISTEN_PORT` properties; bind it to `127.0.0.1:9182` because this setup scrapes it locally and host metrics should not be exposed to the network. The default collectors include CPU, memory, logical disks, network, OS, and system metrics.

Example elevated installation command after downloading the official MSI:

```powershell
Start-Process msiexec.exe -Verb RunAs -Wait -ArgumentList '/i "C:\path\to\windows_exporter-amd64.msi" /qn /norestart LISTEN_ADDR=127.0.0.1 LISTEN_PORT=9182'
Get-Service windows_exporter
```

The scrape job is already enabled at `localhost:9182` for native Prometheus and `host.docker.internal:9182` for the Docker-oriented config. After starting the exporter, confirm the `windows` target is **UP** at `/targets`; host panels and CPU/disk alerts populate after the next scrape. The dashboard's application and database panels do not require the Windows exporter.

## Docker-based Prometheus

`prometheus.yml` is the container-oriented config: it scrapes the host API and Windows exporter using `host.docker.internal`. Mount `monitoring/prometheus` as `/etc/prometheus` so the rule and credential-file paths resolve, and pass that config to Prometheus. Keep the host Grafana provisioning mount at `monitoring/grafana/provisioning`; set `PROMETHEUS_URL=http://prometheus:9090` and `DASHBOARDS_PATH` to the mounted dashboard directory in Grafana's environment. In this mode, a host exporter bound to `127.0.0.1` is intentionally not reachable from a container; use the native Windows Prometheus setup or bind the exporter to a host interface reachable from Docker and restrict port `9182` with the Windows firewall.

## Metrics and alerts

The authenticated API `/metrics` endpoint exposes HTTP request rate, status, latency, in-flight requests, Node.js process/heap/event-loop metrics, MongoDB connection state and ping latency, database error categories, and failed logins. Prometheus authenticates with the ignored `monitoring/prometheus/secrets/metrics_token` file, maintained by the native start script.

Configured alert rules cover API scrape failure, MongoDB health, 5xx rate, p95 request latency, Windows exporter availability, high CPU, and low logical-disk space. Prometheus evaluates and displays these alerts; sending notifications requires configuring an Alertmanager and contact point.
