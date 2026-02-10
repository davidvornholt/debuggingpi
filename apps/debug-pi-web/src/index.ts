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

const postJson = (path: string, body: object): Promise<Response> =>
  fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const updateStatus = (response: StatusResponse): void => {
  text(qs("#ap-state"), response.status.ap.running ? "Running" : "Stopped");
  text(qs("#usb-state"), response.status.usb.active ? "Active" : "Idle");
  text(qs("#status-updated"), new Date(response.status.updatedAt).toLocaleString());

  const dot = qs("#status-dot");
  if (dot) {
    dot.setAttribute("style", `background: ${response.status.ap.running ? "#4bb543" : "#d1c3b0"}`);
  }

  text(qs("#status-text"), "Online");
};

const loadStatus = (): void => {
  fetch("/api/status")
    .then((res) => res.json())
    .then((data: StatusResponse) => updateStatus(data))
    .catch(() => text(qs("#status-text"), "Offline"));
};

const loadConfig = (): void => {
  fetch("/api/config")
    .then((res) => res.json())
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

const connectLogs = (): void => {
  const output = qs<HTMLPreElement>("#log-output");
  if (!output) {
    return;
  }

  const source = new EventSource("/api/logs");
  source.onmessage = (event) => {
    output.textContent = `${output.textContent}\n${event.data}`.trim();
    output.scrollTop = output.scrollHeight;
  };

  source.onerror = () => {
    output.textContent = "Log stream disconnected.";
  };
};

const bindForm = (): void => {
  const form = qs<HTMLFormElement>("#config-form");
  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
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

    fetch("/api/config", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data: ConfigUpdateResponse) => {
        text(
          qs("#config-status"),
          data.applied ? "Config applied." : "Config saved, daemon offline.",
        );
      })
      .catch(() => text(qs("#config-status"), "Failed to save config."));
  });
};

const bindActions = (): void => {
  const reboot = qs<HTMLButtonElement>("#reboot");
  const shutdown = qs<HTMLButtonElement>("#shutdown");

  reboot?.addEventListener("click", () => {
    postJson("/api/system/reboot", {})
      .then(() => text(qs("#config-status"), "Rebooting..."))
      .catch(() => text(qs("#config-status"), "Failed to reboot."));
  });

  shutdown?.addEventListener("click", () => {
    postJson("/api/system/shutdown", {})
      .then(() => text(qs("#config-status"), "Shutting down..."))
      .catch(() => text(qs("#config-status"), "Failed to shutdown."));
  });

  qs("#clear-logs")?.addEventListener("click", () => {
    const output = qs<HTMLPreElement>("#log-output");
    if (output) {
      output.textContent = "";
    }
  });
};

loadStatus();
loadConfig();
connectLogs();
bindForm();
bindActions();

setInterval(loadStatus, 5000);
