import { appendFile, mkdir } from "fs/promises";
import path from "path";

const LOG_PATH =
  process.env.ENJOYRECORD_LOG_PATH ||
  path.join(process.cwd(), "data", "enjoyrecord.log");

const writeLog = async (
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>
) => {
  try {
    const entry = {
      time: new Date().toISOString(),
      level,
      message,
      ...(meta ? { meta } : {}),
    };
    const line = `${JSON.stringify(entry)}\n`;
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, line, "utf8");
  } catch {
    // Swallow logging errors to avoid affecting API responses.
  }
};

export const logInfo = (message: string, meta?: Record<string, unknown>) =>
  writeLog("info", message, meta);

export const logWarn = (message: string, meta?: Record<string, unknown>) =>
  writeLog("warn", message, meta);

export const logError = (message: string, meta?: Record<string, unknown>) =>
  writeLog("error", message, meta);
