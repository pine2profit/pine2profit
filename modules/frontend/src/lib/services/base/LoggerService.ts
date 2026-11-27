export interface ILogger {
  log(topic: string, ...args: unknown[]): void;
  debug(topic: string, ...args: unknown[]): void;
  info(topic: string, ...args: unknown[]): void;
  warn(topic: string, ...args: unknown[]): void;
}

const NOOP_LOGGER: ILogger = {
  log() { void 0; },
  debug() { void 0; },
  info() { void 0; },
  warn() { void 0; },
};

export class LoggerService implements ILogger {
  private _commonLogger: ILogger = NOOP_LOGGER;

  public log = (topic: string, ...args: unknown[]) => {
    this._commonLogger.log(topic, ...args);
  };

  public debug = (topic: string, ...args: unknown[]) => {
    this._commonLogger.debug(topic, ...args);
  };

  public info = (topic: string, ...args: unknown[]) => {
    this._commonLogger.info(topic, ...args);
  };

  public warn = (topic: string, ...args: unknown[]) => {
    this._commonLogger.warn(topic, ...args);
  };

  /** `ioc.loggerService.setLogger(console)` in the browser console turns the trace on. */
  public setLogger = (logger: ILogger) => {
    this._commonLogger = logger;
  };
}

export default LoggerService;
