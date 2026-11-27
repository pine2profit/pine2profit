import path from "path";
import { getArgs } from "../helpers/getArgs";
import getEntry from "../helpers/getEntry";
import { getConfig, setConfig } from "../config/params";
import { serve } from "../function/serve.function";
import { validate } from "../function/validate.function";
import type { DataIssue, DataSummary } from "../lib/services/validation/DataValidationService";

declare const __PACKAGE_VERSION__: string;

const MAX_ISSUES_SHOWN = 50;

const NO_DIR_TEXT = `
Example:

  npx pine2profit --help
  npx pine2profit <dir>
`.trimStart();

const formatIssue = (issue: DataIssue) => {
  const where = `${issue.file}${issue.line ? `:${issue.line}` : ""}${issue.at ? `  ${issue.at}` : ""}`;
  return `${issue.level.padEnd(8)} ${where}\n         ${issue.message}`;
};

export const main = async () => {
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

  // The data folder is checked on every start and a single error refuses to start: the agent
  // must never be left looking at a page that silently shows something wrong. Problems are
  // printed as they are found; the folder is read one file at a time.
  const check = validate(root);
  let shown = 0;
  let summary: DataSummary;
  for (;;) {
    const step = await check.next();
    if (step.done) {
      summary = step.value;
      break;
    }
    const issue = step.value as DataIssue;
    if (shown < MAX_ISSUES_SHOWN) {
      (issue.level === "error" ? console.error : console.warn)(formatIssue(issue));
    } else if (shown === MAX_ISSUES_SHOWN) {
      console.error("… more problems follow, only the first ones are shown");
    }
    shown += 1;
  }
  const dataDir = path.join(root, "data");
  const counts = `${summary.scripts} script${summary.scripts === 1 ? "" : "s"} in ${summary.chunks} index file${summary.chunks === 1 ? "" : "s"}${summary.warnings ? `, ${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}` : ""}`;
  if (summary.errors) {
    console.error(`\n${summary.errors} error${summary.errors === 1 ? "" : "s"} in ${dataDir}: ${values.check ? "the folder is not valid" : "refusing to start"}. Run with --help for the data contract.`);
    process.exit(1);
  }
  if (values.check) {
    // --check: the same validation as before every start, without starting the server
    console.log(`${dataDir}: no errors, ${counts}`);
    process.exit(0);
  }
  console.log(`data: ${counts}`);

  const { CC_WWWROOT_HOST, CC_WWWROOT_PORT } = getConfig();

  const unServer = serve(CC_WWWROOT_HOST, CC_WWWROOT_PORT, root, (error) => {
    if (error) {
      process.exit(1);
    }
    console.log(`Serving ${path.join(root, "data")} at http://localhost:${CC_WWWROOT_PORT}/`);
  });

  const beforeExit = () => {
    process.off("SIGINT", beforeExit);
    unServer();
    process.exit(0);
  };

  process.on("SIGINT", beforeExit);
};

main();
