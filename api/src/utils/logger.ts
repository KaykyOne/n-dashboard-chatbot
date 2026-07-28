import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "debug",
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

const createLogger = (bindings: Record<string, unknown>) => logger.child(bindings);

export { createLogger, logger };
