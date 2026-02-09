export type SystemStatus = {
  readonly uptime: number;
  readonly loadAverage: readonly [number, number, number];
  readonly memoryUsed: number;
  readonly memoryTotal: number;
  readonly diskUsed: number;
  readonly diskTotal: number;
  readonly temperature: number | null;
  readonly interfaces: ReadonlyArray<NetworkInterface>;
};

export type NetworkInterface = {
  readonly name: string;
  readonly type: "wifi" | "ethernet" | "usb" | "other";
  readonly ipAddress: string | null;
  readonly macAddress: string | null;
  readonly isUp: boolean;
};

export type ServiceStatus = {
  readonly name: string;
  readonly active: boolean;
  readonly enabled: boolean;
  readonly description: string;
};

export type LogEntry = {
  readonly timestamp: string;
  readonly priority: "emerg" | "alert" | "crit" | "err" | "warning" | "notice" | "info" | "debug";
  readonly unit: string | null;
  readonly message: string;
};

export type ApiResponse<T> =
  | {
      readonly success: true;
      readonly data: T;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export type DaemonRequest =
  | {
      readonly type: "apply-ap-config";
      readonly config: unknown;
    }
  | {
      readonly type: "apply-usb-config";
      readonly config: unknown;
    }
  | {
      readonly type: "get-logs";
      readonly lines: number;
    }
  | {
      readonly type: "reboot";
    }
  | {
      readonly type: "shutdown";
    };

export type DaemonResponse =
  | {
      readonly success: true;
      readonly data: unknown;
    }
  | {
      readonly success: false;
      readonly error: string;
    };
