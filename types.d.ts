import http from 'http';
import { ReadStream } from 'fs';

type CallbackFn = (error?: Error) => void;
/**
 * Starts the server. `cwd` is the project root whose data/ folder is served: the argument wins,
 * then the CC_DATA_PATH environment variable, then process.cwd().
 */
declare function serve(host?: string, port?: number, cwd?: string, callback?: CallbackFn): () => void;
declare function getRouter(): http.RequestListener;

interface ILogger {
    log(topic: string, ...args: any[]): void;
    debug(topic: string, ...args: any[]): void;
    info(topic: string, ...args: any[]): void;
    warn(topic: string, ...args: any[]): void;
}

declare const setLogger: (logger: ILogger) => void;

type IssueLevel = "error" | "warning";
interface DataIssue {
    level: IssueLevel;
    /** relative to the project root: data/index_1.jsonl */
    file: string;
    /** 1-based line of a .jsonl file */
    line?: number;
    /** location inside a JSON document: messages[2].md */
    at?: string;
    message: string;
}
/** The return value of the validate() generator, available once every issue has been yielded. */
interface DataSummary {
    root: string;
    scripts: number;
    chunks: number;
    errors: number;
    warnings: number;
}
/**
 * Validates <root>/data against the contract and yields every problem the moment it is found:
 * the index files are read line by line, the files of each script one script at a time, so memory
 * holds one document at once whatever the size of the folder. The generator's return value is
 * the summary (counts) once everything has been yielded.
 */
declare class DataValidationService {
    private readonly loggerService;
    validate: (this: DataValidationService, root: string) => AsyncGenerator<DataIssue, DataSummary>;
    private readJson;
    /** Yields issues, and the set of trade ids as the last item when the file is usable. */
    private checkCandles;
    private checkMessages;
}

/**
 * Checks <root>/data against the contract. Yields each problem as soon as it is found; the
 * generator's return value is the summary. Consume it with `for await`, or step with next()
 * when the summary is needed:
 *   const it = validate(root); let r; while (!(r = await it.next()).done) report(r.value); const summary = r.value;
 */
declare function validate(root: string): AsyncGenerator<DataIssue, DataSummary>;

declare const GLOBAL_CONFIG: {
    CC_WWWROOT_PATH: string;
    CC_WWWROOT_HOST: string;
    CC_WWWROOT_PORT: number;
    CC_DATA_PATH: string;
};
type Config = typeof GLOBAL_CONFIG;
declare const getConfig: () => {
    CC_WWWROOT_PATH: string;
    CC_WWWROOT_HOST: string;
    CC_WWWROOT_PORT: number;
    CC_DATA_PATH: string;
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
    log: (topic: string, ...args: any[]) => void;
    debug: (topic: string, ...args: any[]) => void;
    info: (topic: string, ...args: any[]) => void;
    warn: (topic: string, ...args: any[]) => void;
    setLogger: (logger: ILogger) => void;
}

interface DataFile {
    path: string;
    /** size of the file that `stream` reads, taken from the same open handle */
    size: number;
    stream: ReadStream;
}
declare class DataViewService {
    private readonly loggerService;
    /** <root>/data; serve() resolves root once (its cwd argument, else CC_DATA_PATH, else process.cwd()). */
    getRoot: () => string;
    /**
     * Absolute path of a file inside the data root, or null when the request points
     * outside of it: checked on the lexical path and again on the real path, so a
     * symlink inside data/ cannot lead out either.
     */
    resolve: (relPath: string) => Promise<string | null>;
    /**
     * Opens a file for streaming. The handle is opened first and the size read from it, so the
     * Content-Length matches the bytes the stream will deliver even if the agent replaces the
     * file (rename) meanwhile; the stream closes the handle when it ends or fails.
     */
    open: (relPath: string) => Promise<DataFile | null>;
}

declare const ioc: {
    dataValidationService: DataValidationService;
    dataViewService: DataViewService;
    loggerService: LoggerService;
};

export { type Config, type DataIssue, type DataSummary, type ILogger, type IssueLevel, getConfig, getPublicPath, getRouter, ioc as lib, serve, setConfig, setLogger, validate };
