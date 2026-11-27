// Copies every module's static output into build/modules/<name>/build,
// where getPublicPath() expects it. Next.js (output: "export") writes to out/,
// Vite/CRA write to build/ — the first one that exists wins.
import { readdirSync, existsSync, mkdirSync, cpSync } from "fs";
import { join } from "path";

import { sync as rimraf } from "rimraf";
import touch from "touch";

const OUTPUT_DIRS = ["out", "build"];

const createCopy = (prefix = "modules") => {
  for (const entry of readdirSync(`./${prefix}`, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const moduleName = entry.name;
    const source = OUTPUT_DIRS
      .map((dir) => join(prefix, moduleName, dir))
      .find((dir) => existsSync(dir));
    const target = join("build", prefix, moduleName, "build");
    mkdirSync(target, { recursive: true });
    if (!source) {
      console.warn(`${prefix}/${moduleName}: no ${OUTPUT_DIRS.join("/")} output found, skipped`);
      continue;
    }
    cpSync(source, target, { recursive: true });
    console.log(`${source} -> ${target}`);
  }
};

rimraf("build/modules");
touch("./build/.gitkeep");

createCopy("modules");
