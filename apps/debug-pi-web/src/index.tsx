import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { DebugPiConfig, SystemStatus } from "@debug-pi/shared";
import "./styles.css";

const App = () => {
  const [config, setConfig] = useState<DebugPiConfig | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load config and status
  useEffect(() => {
    const loadData = async () => {
      try {
        const [configRes, statusRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/status"),
        ]);

        if (!configRes.ok || !statusRes.ok) {
          throw new Error("Failed to load data");
        }

        const configData = await configRes.json();
        const statusData = await statusRes.json();

        setConfig(configData);
        setStatus(statusData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    loadData();

    // Refresh status every 5 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // Ignore errors during polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Connect to log stream
  useEffect(() => {
    const eventSource = new EventSource("/api/logs/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.logs) {
          setLogs(data.logs.split("\n").slice(-50));
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleConfigUpdate = async (updates: Partial<DebugPiConfig>) => {
    try {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error("Failed to update config");
      }

      const updated = await res.json();
      setConfig(updated);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleReboot = async () => {
    if (confirm("Are you sure you want to reboot?")) {
      try {
        await fetch("/api/reboot", { method: "POST" });
        alert("System is rebooting...");
      } catch (err) {
        alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  };

  const handleShutdown = async () => {
    if (confirm("Are you sure you want to shut down?")) {
      try {
        await fetch("/api/shutdown", { method: "POST" });
        alert("System is shutting down...");
      } catch (err) {
        alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app">
      <header>
        <h1>🐛 Debug Pi</h1>
        <p>Raspberry Pi Debugging Platform</p>
      </header>

      <div className="container">
        {/* Status Panel */}
        <section className="panel">
          <h2>System Status</h2>
          {status && (
            <div className="status-grid">
              <div className="status-item">
                <span className="label">Hostname:</span>
                <span className="value">{status.hostname}</span>
              </div>
              <div className="status-item">
                <span className="label">Uptime:</span>
                <span className="value">{Math.floor(status.uptime / 60)} minutes</span>
              </div>
              <div className="status-item">
                <span className="label">CPU Load:</span>
                <span className="value">{status.cpuLoad.join(", ")}</span>
              </div>
              <div className="status-item">
                <span className="label">Memory:</span>
                <span className="value">
                  {Math.floor((status.memoryUsage.used / status.memoryUsage.total) * 100)}%
                </span>
              </div>
              <div className="status-item">
                <span className="label">Services:</span>
                <span className="value">
                  hostapd: {status.services.hostapd} | dnsmasq: {status.services.dnsmasq}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* AP Configuration */}
        <section className="panel">
          <h2>Access Point Configuration</h2>
          {config && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleConfigUpdate({
                  ap: {
                    ssid: formData.get("ssid") as string,
                    passphrase: formData.get("passphrase") as string,
                    channel: Number.parseInt(formData.get("channel") as string),
                    regulatoryDomain: formData.get("regulatoryDomain") as string,
                    hidden: formData.get("hidden") === "on",
                  },
                });
              }}
            >
              <div className="form-group">
                <label htmlFor="ssid">SSID:</label>
                <input
                  type="text"
                  id="ssid"
                  name="ssid"
                  defaultValue={config.ap.ssid}
                  required
                  maxLength={32}
                />
              </div>
              <div className="form-group">
                <label htmlFor="passphrase">Passphrase:</label>
                <input
                  type="password"
                  id="passphrase"
                  name="passphrase"
                  defaultValue={config.ap.passphrase}
                  required
                  minLength={8}
                  maxLength={63}
                />
              </div>
              <div className="form-group">
                <label htmlFor="channel">Channel:</label>
                <input
                  type="number"
                  id="channel"
                  name="channel"
                  defaultValue={config.ap.channel}
                  min={1}
                  max={13}
                />
              </div>
              <div className="form-group">
                <label htmlFor="regulatoryDomain">Regulatory Domain:</label>
                <input
                  type="text"
                  id="regulatoryDomain"
                  name="regulatoryDomain"
                  defaultValue={config.ap.regulatoryDomain}
                  maxLength={2}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="hidden">
                  <input type="checkbox" id="hidden" name="hidden" defaultChecked={config.ap.hidden} />
                  Hidden Network
                </label>
              </div>
              <button type="submit">Update AP Config</button>
            </form>
          )}
        </section>

        {/* USB Tether Configuration */}
        <section className="panel">
          <h2>USB Tethering</h2>
          {config && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleConfigUpdate({
                  usbTether: {
                    enabled: formData.get("enabled") === "on",
                    interface: formData.get("interface") as string,
                    address: formData.get("address") as string,
                    netmask: formData.get("netmask") as string,
                    dhcpRangeStart: formData.get("dhcpRangeStart") as string,
                    dhcpRangeEnd: formData.get("dhcpRangeEnd") as string,
                  },
                });
              }}
            >
              <div className="form-group">
                <label htmlFor="enabled">
                  <input
                    type="checkbox"
                    id="enabled"
                    name="enabled"
                    defaultChecked={config.usbTether.enabled}
                  />
                  Enable USB Tethering
                </label>
              </div>
              <div className="form-group">
                <label htmlFor="address">Address:</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  defaultValue={config.usbTether.address}
                />
              </div>
              <div className="form-group">
                <label htmlFor="dhcpRangeStart">DHCP Range Start:</label>
                <input
                  type="text"
                  id="dhcpRangeStart"
                  name="dhcpRangeStart"
                  defaultValue={config.usbTether.dhcpRangeStart}
                />
              </div>
              <div className="form-group">
                <label htmlFor="dhcpRangeEnd">DHCP Range End:</label>
                <input
                  type="text"
                  id="dhcpRangeEnd"
                  name="dhcpRangeEnd"
                  defaultValue={config.usbTether.dhcpRangeEnd}
                />
              </div>
              <input type="hidden" name="interface" value={config.usbTether.interface} />
              <input type="hidden" name="netmask" value={config.usbTether.netmask} />
              <button type="submit">Update USB Config</button>
            </form>
          )}
        </section>

        {/* Log Console */}
        <section className="panel log-panel">
          <h2>System Logs</h2>
          <div className="log-console">
            {logs.map((log, i) => (
              <div key={i} className="log-line">
                {log}
              </div>
            ))}
          </div>
        </section>

        {/* System Controls */}
        <section className="panel">
          <h2>System Controls</h2>
          <div className="button-group">
            <button onClick={handleReboot} className="btn-warning">
              Reboot System
            </button>
            <button onClick={handleShutdown} className="btn-danger">
              Shutdown System
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

// Mount the app
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
