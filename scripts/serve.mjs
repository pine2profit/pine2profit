import { serve, setLogger } from "../build/index.mjs";

if (process.env.CC_VERBOSE) {
  setLogger(console);
}

// host / port / static root: CC_WWWROOT_HOST, CC_WWWROOT_PORT (60050), CC_WWWROOT_PATH
serve();
