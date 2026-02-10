export {};

type DaemonStatus = {
  readonly ap: { readonly running: boolean };
  readonly usb: { readonly active: boolean };
  readonly updatedAt: string;
};

type StatusResponse = {
  readonly type: "status";
  readonly status: DaemonStatus;
};

type Config = {
  readonly ap: {
    readonly ssid: string;
    readonly passphrase: string;
    readonly country: string;
    readonly subnet: string;
    readonly dhcpRange: { readonly start: string; readonly end: string };
  };
  readonly usb: {
    readonly enabled: boolean;
    readonly address: string;
  };
};

type ConfigUpdateResponse = {
  readonly config: Config;
  readonly applied: boolean;
  readonly daemon: unknown;
};

const MAX_LOG_LINES = 400;

const isIpv4 = (value: string): boolean => {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^[0-9]+$/.test(part)) {
      return false;
    }
    const number = Number(part);
    return number >= 0 && number <= 255 && Number.isInteger(number);
  });
};

const isCidr = (value: string): boolean => {
  const [address, mask] = value.split("/");
  if (!address || mask === undefined) {
    return false;
  }

  const maskValue = Number(mask);
  return isIpv4(address) && Number.isInteger(maskValue) && maskValue >= 0 && maskValue <= 32;
};

const qs = <T extends Element>(selector: string): T | null => document.querySelector(selector);

const text = (el: Element | null, value: string): void => {
  if (el) {
    el.textContent = value;
  }
};

const setValue = (selector: string, value: string): void => {
  const input = qs<HTMLInputElement>(selector);
  if (input) {
    input.value = value;
  }
};

const setChecked = (selector: string, checked: boolean): void => {
  const input = qs<HTMLInputElement>(selector);
  if (input) {
    input.checked = checked;
  }
};

const postJson = async (path: string, body: object): Promise<Response> => {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`,
    );
  }

  return response;
};

const updateStatus = (response: StatusResponse): void => {
  text(qs("#ap-state"), response.status.ap.running ? "Running" : "Stopped");
  text(qs("#usb-state"), response.status.usb.active ? "Active" : "Idle");
  text(qs("#status-updated"), new Date(response.status.updatedAt).toLocaleString());

  const dot = qs("#status-dot");
  if (dot) {
    dot.classList.toggle("status-dot--running", response.status.ap.running);
    dot.classList.toggle("status-dot--stopped", !response.status.ap.running);
  }

  text(qs("#status-text"), "Online");
};

const loadStatus = (): void => {
  fetch("/api/status")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Status request failed (${res.status})`);
      }
      return res.json();
    })
    .then((data: StatusResponse) => updateStatus(data))
    .catch(() => text(qs("#status-text"), "Offline"));
};

const loadConfig = (): void => {
  fetch("/api/config")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Config request failed (${res.status})`);
      }
      return res.json();
    })
    .then((config: Config) => {
      setValue("#ap-ssid", config.ap.ssid);
      setValue("#ap-passphrase", config.ap.passphrase);
      setValue("#ap-country", config.ap.country);
      setValue("#ap-subnet", config.ap.subnet);
      setValue("#ap-dhcp-start", config.ap.dhcpRange.start);
      setValue("#ap-dhcp-end", config.ap.dhcpRange.end);
      setChecked("#usb-enabled", config.usb.enabled);
      setValue("#usb-address", config.usb.address);
    })
    .catch(() => text(qs("#config-status"), "Failed to load config."));
};

const connectLogs = (): (() => void) => {
  const output = qs<HTMLPreElement>(".log-output");
  if (!output) {
    return () => undefined;
  }

  const source = new EventSource("/api/logs");
  source.onmessage = (event) => {
    const next = `${output.textContent}\n${event.data}`.trim();
    const lines = next.length > 0 ? next.split("\n") : [];
    const trimmed = lines.length > MAX_LOG_LINES ? lines.slice(-MAX_LOG_LINES) : lines;
    output.textContent = trimmed.join("\n");
    output.scrollTop = output.scrollHeight;
  };

  source.onerror = () => {
    const lastLine = output.textContent.split("\n").at(-1);
    if (lastLine !== "Log stream disconnected.") {
      output.textContent = `${output.textContent}\nLog stream disconnected.`.trim();
    }
  };

  source.onopen = () => {
    const lines = output.textContent.split("\n");
    if (lines.at(-1) === "Log stream disconnected.") {
      output.textContent = lines.slice(0, -1).join("\n");
    }
  };

  return () => source.close();
};

const bindForm = (): (() => void) => {
  const form = qs<HTMLFormElement>("#config-form");
  if (!form) {
    return () => undefined;
  }

  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();

    const payload = {
      ap: {
        ssid: qs<HTMLInputElement>("#ap-ssid")?.value ?? "",
        passphrase: qs<HTMLInputElement>("#ap-passphrase")?.value ?? "",
        country: qs<HTMLInputElement>("#ap-country")?.value ?? "",
        subnet: qs<HTMLInputElement>("#ap-subnet")?.value ?? "",
        dhcpRange: {
          start: qs<HTMLInputElement>("#ap-dhcp-start")?.value ?? "",
          end: qs<HTMLInputElement>("#ap-dhcp-end")?.value ?? "",
        },
      },
      usb: {
        enabled: qs<HTMLInputElement>("#usb-enabled")?.checked ?? false,
        address: qs<HTMLInputElement>("#usb-address")?.value ?? "",
      },
    };

    if (payload.ap.ssid.length === 0 || payload.ap.ssid.length > 32) {
      text(qs("#config-status"), "SSID must be 1-32 characters.");
      return;
    }

    if (payload.ap.passphrase.length < 8 || payload.ap.passphrase.length > 63) {
      text(qs("#config-status"), "Passphrase must be 8-63 characters.");
      return;
    }

    if (!isCidr(payload.ap.subnet)) {
      text(qs("#config-status"), "Subnet must be a valid CIDR (e.g., 192.168.1.1/24).");
      return;
    }

    if (!isIpv4(payload.ap.dhcpRange.start) || !isIpv4(payload.ap.dhcpRange.end)) {
      text(qs("#config-status"), "DHCP start/end must be valid IPv4 addresses.");
      return;
    }

    if (!isCidr(payload.usb.address)) {
      text(qs("#config-status"), "USB address must be a valid CIDR (e.g., 10.55.0.1/24).");
      return;
    }

    fetch("/api/config", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((body) => {
            throw new Error(`Config update failed (${res.status}): ${body}`);
          });
        }
        return res.json();
      })
      .then((data: ConfigUpdateResponse) => {
        text(
          qs("#config-status"),
          data.applied ? "Config applied." : "Config saved, daemon offline.",
        );
      })
      .catch(() => text(qs("#config-status"), "Failed to save config."));
  };

  form.addEventListener("submit", handleSubmit);
  return () => form.removeEventListener("submit", handleSubmit);
};

const bindActions = (): (() => void) => {
  const reboot = qs<HTMLButtonElement>("#reboot");
  const shutdown = qs<HTMLButtonElement>("#shutdown");
  const clear = qs<HTMLButtonElement>("#clear-logs");

  const handleReboot = (): void => {
    if (!window.confirm("Reboot Debugging Pi now?")) {
      return;
    }
    postJson("/api/system/reboot", {})
      .then(() => text(qs("#config-status"), "Rebooting..."))
      .catch(() => text(qs("#config-status"), "Failed to reboot."));
  };

  const handleShutdown = (): void => {
    if (!window.confirm("Shut down Debugging Pi now?")) {
      return;
    }
    postJson("/api/system/shutdown", {})
      .then(() => text(qs("#config-status"), "Shutting down..."))
      .catch(() => text(qs("#config-status"), "Failed to shutdown."));
  };

  const handleClear = (): void => {
    const output = qs<HTMLPreElement>(".log-output");
    if (output) {
      output.textContent = "";
    }
  };

  reboot?.addEventListener("click", handleReboot);
  shutdown?.addEventListener("click", handleShutdown);
  clear?.addEventListener("click", handleClear);

  return () => {
    reboot?.removeEventListener("click", handleReboot);
    shutdown?.removeEventListener("click", handleShutdown);
    clear?.removeEventListener("click", handleClear);
  };
};

const init = (): (() => void) => {
  loadStatus();
  loadConfig();
  const cleanupLogs = connectLogs();
  const cleanupForm = bindForm();
  const cleanupActions = bindActions();
  const statusIntervalId = window.setInterval(loadStatus, 5000);

  return () => {
    cleanupLogs();
    cleanupForm();
    cleanupActions();
    window.clearInterval(statusIntervalId);
  };
};

window.addEventListener("DOMContentLoaded", () => {
  const windowWithCleanup = window as Window & { __debugPiCleanup?: () => void };
  windowWithCleanup.__debugPiCleanup = init();
});
