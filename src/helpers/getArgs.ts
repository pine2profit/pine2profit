import { singleshot } from "functools-kit";
import { parseArgs } from "util";

export const getArgs = singleshot(() => {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      port: {
        type: "string",
        default: "",
      },
      host: {
        type: "string",
        default: "",
      },
      check: {
        type: "boolean",
        default: false,
      },
      help: {
        type: "boolean",
        default: false,
      },
      version: {
        type: "boolean",
        default: false,
      },
    },
    strict: false,
    allowPositionals: true,
  });
  return {
    values,
    positionals,
  };
});

export default getArgs;
