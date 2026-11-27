import { fileURLToPath } from "url";
import { realpathSync } from "fs";
import path from "path";

/** True when this bundle is the script node was started with (bin / `node build/index.mjs`), not an import. */
export const getEntry = (metaUrl: string) => {
  if (!process.argv[1]) {
    return false;
  }
  try {
    const metaPath = fileURLToPath(metaUrl);
    const realArgv = realpathSync(process.argv[1]);
    return path.resolve(realArgv) === path.resolve(metaPath);
  } catch {
    return false;
  }
};

export default getEntry;
