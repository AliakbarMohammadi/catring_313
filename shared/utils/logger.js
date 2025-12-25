/**
 * Simple logger utility
 */

export const createLogger = (serviceName) => {
  const log = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: serviceName,
      message,
      ...meta
    };
    
    console.log(`[${timestamp}] [${level.toUpperCase()}] [${serviceName}] ${message}`, 
      Object.keys(meta).length > 0 ? meta : '');
  };

  return {
    info: (message, meta) => log('info', message, meta),
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    debug: (message, meta) => log('debug', message, meta)
  };
};

export default createLogger;