import micro from "micro";
import Router from "router";
import finalhandler from "finalhandler";
import serveHandler from "serve-handler";

import health from "../routes/health";

import { getConfig } from "./params";

import getPublicPath from "../helpers/getPublicPath";

const router = Router({
  params: true,
});

router.all("/api/v1/health/*", (req, res) => {
  return health(req, res, finalhandler(req, res));
});

// Next.js static export (modules/frontend, output: "export", trailingSlash: true):
// /runs/<slug>/ -> runs/<slug>/index.html, 404.html is picked up by serve-handler.
router.get("/*", (req, res) => {
  const { CC_WWWROOT_PATH } = getConfig();
  return serveHandler(req, res, {
    public: CC_WWWROOT_PATH || getPublicPath(),
    headers: [
      {
        source: "**/*.jsonl",
        headers: [
          { key: "Content-Type", value: "application/x-ndjson; charset=utf-8" },
        ],
      },
    ],
  });
});

export default micro.serve(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");

  return router(req, res, finalhandler(req, res));
});
