import { createRequire } from "module";
import { join, dirname } from "path";

const require = createRequire(import.meta.url);

/**
 * Static root of the dashboard: <package>/build/modules/frontend/build.
 * Resolved against the installed package (self-reference via package.json "exports"),
 * so it works from any cwd. Override with CC_WWWROOT_PATH or setConfig().
 */
export function getPublicPath() {
    const modulePath = require.resolve("pine2profit");
    const basePath = dirname(modulePath);
    return join(basePath, "./modules/frontend/build");
}

export default getPublicPath;
