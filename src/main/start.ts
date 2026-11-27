import path from "path";
import { getArgs } from "../helpers/getArgs";
import getEntry from "../helpers/getEntry";
import { getConfig, setConfig } from "../config/params";
import { serve } from "../function/serve.function";
import { validate } from "../function/validate.function";
import type { DataIssue } from "../lib/services/validation/DataValidationService";

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

  // The data folder is checked on every start and a single error refuses to start:
  // the agent must never be left looking at a page that silently shows something wrong.
  const report = await validate(root);
  const shown = report.issues.slice(0, MAX_ISSUES_SHOWN);
  for (const issue of shown) {
    (issue.level === "error" ? console.error : console.warn)(formatIssue(issue));
  }
  if (report.issues.length > shown.length) {
    console.error(`… and ${report.issues.length - shown.length} more`);
  }
  if (report.errors) {
    console.error(`\n${report.errors} error${report.errors === 1 ? "" : "s"} in ${path.join(root, "data")}: refusing to start. Run with --help for the data contract.`);
    process.exit(1);
  }
  console.log(`data: ${report.scripts} script${report.scripts === 1 ? "" : "s"} in ${report.chunks} index file${report.chunks === 1 ? "" : "s"}${report.warnings ? `, ${report.warnings} warning${report.warnings === 1 ? "" : "s"}` : ""}`);

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
