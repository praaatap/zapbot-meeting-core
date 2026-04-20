import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@echomeet/shared';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};

export const requestLogger = morgan((tokens, req, res) => {
  const requestId = req.headers['x-request-id'];
  const logData = {
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    contentLength: tokens.res(req, res, 'content-length'),
    responseTime: tokens['response-time'](req, res),
    requestId,
  };

  logger.info(`HTTP ${logData.method} ${logData.url}`, logData);
  return null; // Morgan doesn't need to print to stdout directly since we use winston
});
