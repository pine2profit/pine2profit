import http from 'http';

type CallbackFn = (error?: Error) => void;
declare function serve(host?: string, port?: number, cwd?: string, callback?: CallbackFn): () => void;
declare function getRouter(): http.RequestListener;

interface ILogger {
    log(topic: string, ...args: any[]): void;
    debug(topic: string, ...args: any[]): void;
    info(topic: string, ...args: any[]): void;
    warn(topic: string, ...args: any[]): void;
}

declare const setLogger: (logger: ILogger) => void;

declare const GLOBAL_CONFIG: {
    CC_WWWROOT_PATH: string;
    CC_WWWROOT_HOST: string;
    CC_WWWROOT_PORT: number;
};
type Config = typeof GLOBAL_CONFIG;
declare const getConfig: () => {
    CC_WWWROOT_PATH: string;
    CC_WWWROOT_HOST: string;
    CC_WWWROOT_PORT: number;
};
declare const setConfig: (config: Partial<Config>) => void;

/**
 * Static root of the dashboard: <package>/build/modules/frontend/build.
 * Resolved against the installed package (self-reference via package.json "exports"),
 * so it works from any cwd. Override with CC_WWWROOT_PATH or setConfig().
 */
declare function getPublicPath(): string;

declare class LoggerService implements ILogger {
    private _commonLogger;
    log: (topic: string, ...args: any[]) => Promise<void>;
    debug: (topic: string, ...args: any[]) => Promise<void>;
    info: (topic: string, ...args: any[]) => Promise<void>;
    warn: (topic: string, ...args: any[]) => Promise<void>;
    setLogger: (logger: ILogger) => void;
}

declare const ioc: {
    loggerService: LoggerService;
};

export { type Config, type ILogger, getConfig, getPublicPath, getRouter, ioc as lib, serve, setConfig, setLogger };
