import { Effect } from "effect";
import { DaemonRequest, DaemonRequestSchema, SystemStatus } from "@debug-pi/shared";
import * as net from "node:net";
import * as fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const SOCKET_PATH = "/var/run/debug-pi-daemon.sock";

// Execute shell command
const execCommand = (cmd: string): Effect.Effect<string, Error> =>
  Effect.tryPromise({
    try: async () => {
      const { stdout } = await execAsync(cmd);
      return stdout.trim();
    },
    catch: (error) => new Error(`Command failed: ${String(error)}`),
  });

// Get service status
const getServiceStatus = (service: string): Effect.Effect<"active" | "inactive" | "failed" | "unknown", Error> =>
  Effect.gen(function* () {
    try {
      const output = yield* execCommand(`systemctl is-active ${service}`);
      if (output === "active") return "active";
      if (output === "inactive") return "inactive";
      if (output === "failed") return "failed";
      return "unknown";
    } catch {
      return "unknown";
    }
  });

// Handle daemon requests
const handleRequest = (request: DaemonRequest): Effect.Effect<unknown, Error> =>
  Effect.gen(function* () {
    switch (request.type) {
      case "get-status": {
        const uptime = yield* execCommand("cat /proc/uptime | cut -d' ' -f1");
        const memInfo = yield* execCommand("free -b | grep Mem");
        const memParts = memInfo.split(/\s+/);
        const loadAvg = yield* execCommand("cat /proc/loadavg");
        const loadParts = loadAvg.split(" ");

        const hostapdStatus = yield* getServiceStatus("hostapd");
        const dnsmasqStatus = yield* getServiceStatus("dnsmasq");
        const serverStatus = yield* getServiceStatus("debug-pi-server");

        const status: SystemStatus = {
          hostname: yield* execCommand("hostname"),
          uptime: Number.parseFloat(uptime),
          memoryUsage: {
            total: Number.parseInt(memParts[1]),
            used: Number.parseInt(memParts[2]),
            free: Number.parseInt(memParts[3]),
          },
          cpuLoad: [
            Number.parseFloat(loadParts[0]),
            Number.parseFloat(loadParts[1]),
            Number.parseFloat(loadParts[2]),
          ],
          services: {
            hostapd: hostapdStatus,
            dnsmasq: dnsmasqStatus,
            debugPiServer: serverStatus,
          },
          network: {
            ap: {
              interface: "wlan0",
              connected: 0,
            },
            usb: {
              interface: "usb0",
              connected: false,
            },
          },
        };

        return status;
      }

      case "get-logs": {
        const service = request.service || "";
        const lines = request.lines || 100;
        const cmd = service
          ? `journalctl -u ${service} -n ${lines} --no-pager`
          : `journalctl -n ${lines} --no-pager`;

        const output = yield* execCommand(cmd);
        return output.split("\n");
      }

      case "restart-ap": {
        // Generate hostapd config and restart
        yield* execCommand("systemctl restart hostapd");
        return { success: true };
      }

      case "restart-dhcp": {
        // Generate dnsmasq config and restart
        yield* execCommand("systemctl restart dnsmasq");
        return { success: true };
      }

      case "configure-usb-tether": {
        // Configure USB tether
        if (request.config.enabled) {
          yield* execCommand("systemctl enable debug-pi-usb-tether");
          yield* execCommand("systemctl start debug-pi-usb-tether");
        } else {
          yield* execCommand("systemctl stop debug-pi-usb-tether");
          yield* execCommand("systemctl disable debug-pi-usb-tether");
        }
        return { success: true };
      }

      case "reboot": {
        yield* execCommand("systemctl reboot");
        return { success: true };
      }

      case "shutdown": {
        yield* execCommand("systemctl poweroff");
        return { success: true };
      }

      default: {
        return yield* Effect.fail(new Error("Unknown request type"));
      }
    }
  });

// Handle client connection
const handleClient = (socket: net.Socket): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    let data = "";

    yield* Effect.async<void, Error>((resume) => {
      socket.on("data", (chunk) => {
        data += chunk.toString();
      });

      socket.on("end", () => {
        resume(Effect.succeed(undefined));
      });

      socket.on("error", (error) => {
        resume(Effect.fail(new Error(`Socket error: ${error.message}`)));
      });
    });

    try {
      const parsed = JSON.parse(data);
      const request = DaemonRequestSchema.parse(parsed);
      const result = yield* handleRequest(request);

      socket.write(JSON.stringify({ data: result }));
    } catch (error) {
      socket.write(JSON.stringify({ error: String(error) }));
    }

    socket.end();
  });

// Main daemon program
const program = Effect.gen(function* () {
  console.log("Starting Debug Pi Daemon...");

  // Remove existing socket if it exists
  try {
    yield* Effect.tryPromise({
      try: () => fs.unlink(SOCKET_PATH),
      catch: () => new Error("Socket already exists"),
    });
  } catch {
    // Ignore if socket doesn't exist
  }

  const server = net.createServer();

  yield* Effect.async<void, never>((resume) => {
    server.on("connection", (socket) => {
      Effect.runPromise(handleClient(socket)).catch((error) => {
        console.error("Client handler error:", error);
      });
    });

    server.listen(SOCKET_PATH, () => {
      console.log(`Daemon listening on ${SOCKET_PATH}`);
      // Set socket permissions so server can connect
      fs.chmod(SOCKET_PATH, 0o666).catch(console.error);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
      resume(Effect.fail(error));
    });
  });
});

// Run the daemon
Effect.runPromise(program).catch((error) => {
  console.error("Daemon failed:", error);
  process.exit(1);
});
