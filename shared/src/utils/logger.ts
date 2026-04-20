import winston from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack, requestId, ...metadata }) => {
  let log = `${timestamp} [${level}] ${requestId ? `[${requestId}] ` : ''}${message}`;
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

export const createLogger = (serviceName: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    format: combine(
      timestamp(),
      errors({ stack: true }),
      json()
    ),
    transports: [
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' 
          ? combine(timestamp(), json())
          : combine(timestamp(), colorize(), consoleFormat)
      })
    ]
  });
};

export const logger = createLogger('shared');
