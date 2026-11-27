export { getRouter, serve } from "./function/serve.function";
export { setLogger } from "./function/setup.function";

export { setConfig, getConfig } from "./config/params";

export { getPublicPath } from "./helpers/getPublicPath";

export { ioc as lib } from "./lib";

export type { ILogger } from "./interface/Logger.interface";
export type { Config } from "./config/params";
