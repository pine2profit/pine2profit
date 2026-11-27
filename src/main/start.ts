import path from "path";
import { getArgs } from "../helpers/getArgs";
import getEntry from "../helpers/getEntry";
import { getConfig, setConfig } from "../config/params";
import { serve } from "../function/serve.function";

declare const __PACKAGE_VERSION__: string;

declare function parseInt(value: unknown): number;

const HELP_TEXT = `
pine2profit ${__PACKAGE_VERSION__}

Serves the dashboard from this package and the agent's files from <dir>/data.

Usage:
  pine2profit [dir] [--port 60050] [--host 0.0.0.0]

  dir       folder that contains data/ (default: current directory)
  --port    HTTP port (default: CC_WWWROOT_PORT or 60050)
  --host    bind address (default: CC_WWWROOT_HOST or 0.0.0.0)

The site requests data/index_1.jsonl, index_2.jsonl, ... and data/<id>_messages.json,
<id>_candles.json, <id>_pinescript.json with plain GET, exactly as on GitHub Pages.
`.trimStart();

export const main = () => {
  if (!getEntry(import.meta.url)) {
    return;
  }

  const { values, positionals } = getArgs();

  if (values.help) {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
  }

  if (values.version) {
    process.stdout.write(`${__PACKAGE_VERSION__}\n`);
    process.exit(0);
  }

  const [dir = process.cwd()] = positionals;
  const root = path.resolve(String(dir));

  setConfig({ CC_DATA_PATH: root });
  if (values.port) {
    setConfig({ CC_WWWROOT_PORT: parseInt(values.port) });
  }
  if (values.host) {
    setConfig({ CC_WWWROOT_HOST: String(values.host) });
  }

  const { CC_WWWROOT_HOST, CC_WWWROOT_PORT } = getConfig();

  const unServer = serve(CC_WWWROOT_HOST, CC_WWWROOT_PORT, root, (error) => {
    if (error) {
      process.exit(1);
    }
    console.log(`Serving ${path.join(root, "data")} at http://localhost:${CC_WWWROOT_PORT}/data/`);
  });

  const beforeExit = () => {
    process.off("SIGINT", beforeExit);
    unServer();
    process.exit(0);
  };

  process.on("SIGINT", beforeExit);
};

main();
