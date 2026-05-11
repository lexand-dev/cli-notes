export type Logger = {
  info: (message: any, ...args: any[]) => void;
  warn: (message: any, ...args: any[]) => void;
  error: (message: any, ...args: any[]) => void;
  debug: (message: any, ...args: any[]) => void;
};

/**
 * Simple, zero-dependency logger that prints timestamped messages to the console.
 * - `debug` only prints when process.env.DEBUG is truthy.
 */
export function getLogger(name = "app"): Logger {
  const format = (level: string, msg: any) => {
    const ts = new Date().toISOString();
    if (msg instanceof Error) {
      return `[${ts}] [${level}] ${name} - ${msg.message}\n${msg.stack ?? ""}`;
    }
    if (typeof msg === "object") {
      try {
        return `[${ts}] [${level}] ${name} - ${JSON.stringify(msg)}`;
      } catch {
        return `[${ts}] [${level}] ${name} - [object]`;
      }
    }
    return `[${ts}] [${level}] ${name} - ${String(msg)}`;
  };

  return {
    info: (message: any, ...args: any[]) => console.log(format("INFO", message), ...args),
    warn: (message: any, ...args: any[]) => console.warn(format("WARN", message), ...args),
    error: (message: any, ...args: any[]) => console.error(format("ERROR", message), ...args),
    debug: (message: any, ...args: any[]) => {
      if (process.env.DEBUG) console.debug(format("DEBUG", message), ...args);
    },
  };
}
