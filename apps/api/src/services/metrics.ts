import type { SystemMetrics } from "@debuggingpi/shared";

const readFileContent = async (path: string): Promise<string> => {
	try {
		const file = Bun.file(path);
		return await file.text();
	} catch {
		return "";
	}
};

type CpuTimes = {
	readonly idle: number;
	readonly total: number;
};

let previousCpu: CpuTimes | undefined;

const parseCpuTimes = (statContent: string): CpuTimes | undefined => {
	const cpuLine = statContent.split("\n").find((line) => line.startsWith("cpu "));
	if (!cpuLine) return undefined;

	const parts = cpuLine.split(/\s+/).slice(1).map(Number);
	const idle = parts[3] ?? 0;
	const total = parts.reduce((sum, val) => sum + val, 0);
	return { idle, total };
};

const getCpuPercent = async (): Promise<number> => {
	const content = await readFileContent("/proc/stat");
	const current = parseCpuTimes(content);
	if (!current) return 0;

	if (!previousCpu) {
		previousCpu = current;
		return 0;
	}

	const idleDelta = current.idle - previousCpu.idle;
	const totalDelta = current.total - previousCpu.total;
	previousCpu = current;

	return totalDelta === 0 ? 0 : Math.round(((totalDelta - idleDelta) / totalDelta) * 100);
};

const getMemoryInfo = async (): Promise<{ usedMb: number; totalMb: number }> => {
	const content = await readFileContent("/proc/meminfo");
	const lines = content.split("\n");

	const totalLine = lines.find((l) => l.startsWith("MemTotal:"));
	const availLine = lines.find((l) => l.startsWith("MemAvailable:"));

	const totalKb = Number(totalLine?.match(/(\d+)/)?.[1] ?? 0);
	const availKb = Number(availLine?.match(/(\d+)/)?.[1] ?? 0);

	const totalMb = Math.round(totalKb / 1024);
	const usedMb = Math.round((totalKb - availKb) / 1024);

	return { usedMb, totalMb };
};

const getTemperature = async (): Promise<number> => {
	const content = await readFileContent("/sys/class/thermal/thermal_zone0/temp");
	const milliC = Number(content.trim());
	return Math.round((milliC / 1000) * 10) / 10;
};

const getUptime = async (): Promise<number> => {
	const content = await readFileContent("/proc/uptime");
	return Math.round(Number(content.split(" ")[0] ?? 0));
};

export const getSystemMetrics = async (): Promise<SystemMetrics> => {
	const [cpuPercent, memory, temperatureCelsius, uptimeSeconds] = await Promise.all([
		getCpuPercent(),
		getMemoryInfo(),
		getTemperature(),
		getUptime(),
	]);

	return {
		cpuPercent,
		memoryUsedMb: memory.usedMb,
		memoryTotalMb: memory.totalMb,
		temperatureCelsius,
		uptimeSeconds,
	};
};
