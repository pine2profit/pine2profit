import http from "http";
import { singleshot } from "functools-kit";

import { getConfig } from "../config/params";

import { serveSubject } from "../config/emitters";

import router from "../config/router";
import ioc from "../lib";

type CallbackFn = (error?: Error) => void;

const METHOD_NAME_SERVE = "serve.serve";
const METHOD_NAME_GET_ROUTER = "serve.getRouter";

const MAX_CONNECTIONS = 1_000;
const SOCKET_TIMEOUT = 60 * 10 * 1000;

const serveInternal = singleshot(
  (host = getConfig().CC_WWWROOT_HOST, port = getConfig().CC_WWWROOT_PORT, callback?: CallbackFn) => {
    const server = new http.Server(router);

    server.listen(port, host).addListener("listening", () => {
      console.log(`Listening on http://${host}:${port}`);
      callback && callback();
    });

    server.addListener("error", (err) => {
      console.error("Server error:", err);
      // The server never came up: reset the singleshot, otherwise a retry of serve()
      // would hand back this dead instance and nobody would try the port again.
      if (!server.listening) {
        serveInternal.clear();
      }
      callback && callback(err);
    });

    server.maxConnections = MAX_CONNECTIONS;
    server.setTimeout(SOCKET_TIMEOUT);

    return () => {
      server.close();
      serveInternal.clear();
    };
  },
);

/**
 * Starts the server. `cwd` is the project root whose data/ folder is served: the argument wins,
 * then the CC_DATA_PATH environment variable, then process.cwd().
 */
export function serve(host?: string, port?: number, cwd?: string, callback?: CallbackFn) {
  const root = cwd || getConfig().CC_DATA_PATH || process.cwd();
  ioc.loggerService.log(METHOD_NAME_SERVE, {
    host,
    port,
    root,
  });
  serveSubject.next(root);
  return serveInternal(host, port, callback);
}

export function getRouter() {
  ioc.loggerService.log(METHOD_NAME_GET_ROUTER);
  return router;
}
