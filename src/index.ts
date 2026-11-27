import "./main/help";
import "./main/start";

export { getRouter, serve } from "./function/serve.function";
export { setLogger } from "./function/setup.function";
export { validate } from "./function/validate.function";

export { setConfig, getConfig } from "./config/params";

export { getPublicPath } from "./helpers/getPublicPath";

export { ioc as lib } from "./lib";

export type { ILogger } from "./interface/Logger.interface";
export type { Config } from "./config/params";
export type { DataIssue, DataReport, IssueLevel } from "./lib/services/validation/DataValidationService";
