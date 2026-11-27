import micro from "micro";
import Router from "router";
import finalhandler from "finalhandler";
import serveHandler from "serve-handler";

import data from "../routes/data";

import { getConfig } from "./params";

import getPublicPath from "../helpers/getPublicPath";

const router = Router({
  params: true,
});

// The agent's files: GET /data/<file> -> <root>/data/<file>. The same relative
// paths the site requests on GitHub Pages, so nothing differs between the two.
router.all("/data/*", (req, res) => {
  return data(req, res, finalhandler(req, res));
});

// Next.js static export (modules/frontend, output: "export", trailingSlash: true):
// /run/?id=x -> run/index.html, 404.html is picked up by serve-handler.
router.get("/*", (req, res) => {
  const { CC_WWWROOT_PATH } = getConfig();
  return serveHandler(req, res, {
    public: CC_WWWROOT_PATH || getPublicPath(),
  });
});

export default micro.serve(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");

  return router(req, res, finalhandler(req, res));
});
