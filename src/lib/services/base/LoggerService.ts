import { ILogger } from "../../../interface/Logger.interface";

const NOOP_LOGGER: ILogger = {
  log() {
    void 0;
  },
  debug() {
    void 0;
  },
  info() {
    void 0;
  },
  warn() {
    void 0;
  },
};

/** A failing custom logger is reported once per call on stderr and never escapes into the caller. */
const guard = (fn: () => void) => {
  try {
    fn();
  } catch (error) {
    console.error("pine2profit logger failed:", error);
  }
};

export class LoggerService implements ILogger {
  private _commonLogger: ILogger = NOOP_LOGGER;

  public log = (topic: string, ...args: any[]) => {
    guard(() => this._commonLogger.log(topic, ...args));
  };

  public debug = (topic: string, ...args: any[]) => {
    guard(() => this._commonLogger.debug(topic, ...args));
  };

  public info = (topic: string, ...args: any[]) => {
    guard(() => this._commonLogger.info(topic, ...args));
  };

  public warn = (topic: string, ...args: any[]) => {
    guard(() => this._commonLogger.warn(topic, ...args));
  };

  public setLogger = (logger: ILogger) => {
    this._commonLogger = logger;
  };
}

export default LoggerService;
