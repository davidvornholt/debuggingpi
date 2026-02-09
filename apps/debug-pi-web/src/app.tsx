import type { DebugPiConfig } from "@debuggingpi/shared/config-schema";
import type { LogEntry, SystemStatus } from "@debuggingpi/shared/types";
import { useEffect, useState } from "react";

export const App = (): JSX.Element => {
  const [config, setConfig] = useState<DebugPiConfig | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"status" | "config" | "logs">("status");

  useEffect(() => {
    // Fetch initial config
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setConfig(data.data);
        }
      })
      .catch(console.error);

    // Fetch status periodically
    const statusInterval = setInterval(() => {
      fetch("/api/status")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStatus(data.data);
          }
        })
        .catch(console.error);
    }, 2000);

    // Connect to log stream
    const eventSource = new EventSource("/api/logs");
    eventSource.onmessage = (event) => {
      const log = JSON.parse(event.data) as LogEntry;
      setLogs((prev) => [...prev.slice(-99), log]);
    };

    return () => {
      clearInterval(statusInterval);
      eventSource.close();
    };
  }, []);

  const handleSaveConfig = (): void => {
    if (!config) return;

    fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Configuration saved successfully");
        } else {
          alert(`Error: ${data.error}`);
        }
      })
      .catch((error) => alert(`Error: ${String(error)}`));
  };

  const handleReboot = (): void => {
    if (!confirm("Are you sure you want to reboot?")) return;

    fetch("/api/reboot", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Reboot initiated");
        } else {
          alert(`Error: ${data.error}`);
        }
      })
      .catch((error) => alert(`Error: ${String(error)}`));
  };

  const handleShutdown = (): void => {
    if (!confirm("Are you sure you want to shut down?")) return;

    fetch("/api/shutdown", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Shutdown initiated");
        } else {
          alert(`Error: ${data.error}`);
        }
      })
      .catch((error) => alert(`Error: ${String(error)}`));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Debug Pi</h1>
        <div className="header-actions">
          <button type="button" onClick={handleReboot} className="btn btn-warning">
            Reboot
          </button>
          <button type="button" onClick={handleShutdown} className="btn btn-danger">
            Shutdown
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          type="button"
          className={activeTab === "status" ? "tab active" : "tab"}
          onClick={() => setActiveTab("status")}
        >
          Status
        </button>
        <button
          type="button"
          className={activeTab === "config" ? "tab active" : "tab"}
          onClick={() => setActiveTab("config")}
        >
          Configuration
        </button>
        <button
          type="button"
          className={activeTab === "logs" ? "tab active" : "tab"}
          onClick={() => setActiveTab("logs")}
        >
          Logs
        </button>
      </nav>

      <main className="content">
        {activeTab === "status" && (
          <div className="panel">
            <h2>System Status</h2>
            {status ? (
              <div className="status-grid">
                <div className="status-item">
                  <span className="label">Uptime:</span>
                  <span>{Math.floor(status.uptime / 60)} minutes</span>
                </div>
                <div className="status-item">
                  <span className="label">Memory:</span>
                  <span>
                    {Math.floor(status.memoryUsed / 1024 / 1024)} MB /{" "}
                    {Math.floor(status.memoryTotal / 1024 / 1024)} MB
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Temperature:</span>
                  <span>{status.temperature ? `${status.temperature}°C` : "N/A"}</span>
                </div>
              </div>
            ) : (
              <p>Loading...</p>
            )}
          </div>
        )}

        {activeTab === "config" && config && (
          <div className="panel">
            <h2>Access Point Configuration</h2>
            <div className="form-group">
              <label>
                Enabled:
                <input
                  type="checkbox"
                  checked={config.accessPoint.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      accessPoint: { ...config.accessPoint, enabled: e.target.checked },
                    })
                  }
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                SSID:
                <input
                  type="text"
                  value={config.accessPoint.ssid}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      accessPoint: { ...config.accessPoint, ssid: e.target.value },
                    })
                  }
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                Passphrase:
                <input
                  type="password"
                  value={config.accessPoint.passphrase}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      accessPoint: { ...config.accessPoint, passphrase: e.target.value },
                    })
                  }
                />
              </label>
            </div>

            <h2>USB Tethering Configuration</h2>
            <div className="form-group">
              <label>
                Enabled:
                <input
                  type="checkbox"
                  checked={config.usbTethering.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      usbTethering: { ...config.usbTethering, enabled: e.target.checked },
                    })
                  }
                />
              </label>
            </div>

            <button type="button" onClick={handleSaveConfig} className="btn btn-primary">
              Save Configuration
            </button>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="panel">
            <h2>System Logs</h2>
            <div className="log-console">
              {logs.map((log) => (
                <div key={log.timestamp} className={`log-entry log-${log.priority}`}>
                  <span className="log-timestamp">{log.timestamp}</span>
                  <span className="log-unit">{log.unit || "system"}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
