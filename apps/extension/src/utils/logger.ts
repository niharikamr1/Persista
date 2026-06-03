const PREFIX = "[AICC]";

export const logger = {
  info: (...args: unknown[]) => console.info(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, "WARN", ...args),
  error: (...args: unknown[]) => console.error(PREFIX, "ERROR", ...args),
  debug: (...args: unknown[]) => console.debug(PREFIX, "DEBUG", ...args),
};
