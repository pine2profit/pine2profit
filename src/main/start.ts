import path from "path";
import { getArgs } from "../helpers/getArgs";
import getEntry from "../helpers/getEntry";
import { getConfig, setConfig } from "../config/params";
import { serve } from "../function/serve.function";

declare const __PACKAGE_VERSION__: string;

const NO_DIR_TEXT = `
Example:

  npx pine2profit --help
  npx pine2profit <dir>
`.trimStart();

export const main = () => {
  if (!getEntry(import.meta.url)) {
    return;
  }

  const { values, positionals } = getArgs();

  if (values.help) {
    return;
  }

  if (values.version) {
    process.stdout.write(`${__PACKAGE_VERSION__}\n`);
    process.exit(0);
  }

  const [dir = null] = positionals;

  if (!dir) {
    process.stdout.write(`pine2profit ${__PACKAGE_VERSION__}\n`);
    process.stdout.write("\n");
    process.stdout.write(`The folder that contains data/ is required. Run with --help to see how to build it.\n`);
    process.stdout.write("\n");
    process.stdout.write(NO_DIR_TEXT);
    process.exit(1);
  }

  const root = path.resolve(String(dir));

  setConfig({ CC_DATA_PATH: root });
  if (values.port) {
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error(`--port must be an integer between 1 and 65535, got "${values.port}"`);
      process.exit(1);
    }
    setConfig({ CC_WWWROOT_PORT: port });
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
