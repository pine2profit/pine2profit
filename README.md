# pine2profit

Node server that serves the static dashboard from `modules/frontend` (Next.js, `output: "export"`)
together with its JSON API from one process. Same shape as `@backtest-kit/ui`: `di-kit` container,
`micro` + `router` + `finalhandler` for the API, `serve-handler` for the static files.

```bash
npm install
npm run build:modules   # builds modules/frontend (out/), copies it to build/modules/frontend/build, builds this package
npm run serve           # http://localhost:60050
```

```ts
import { serve, setLogger, setConfig } from "pine2profit";

setLogger(console);                   // optional
serve("0.0.0.0", 60050, process.cwd()); // returns a dispose function that closes the server
```

Environment: `CC_WWWROOT_HOST` (default `0.0.0.0`), `CC_WWWROOT_PORT` (default `60050`),
`CC_WWWROOT_PATH` (override of the static root, default `build/modules/frontend/build` inside the package).

Layout:

```
src/index.ts                       public API: serve, getRouter, setLogger, setConfig, getConfig, getPublicPath, lib
src/config/params.ts               env + setConfig overrides
src/config/router.ts               /api/v1/* sub-routers, then serve-handler catch-all
src/function/serve.function.ts     http.Server lifecycle (singleshot)
src/helpers/getPublicPath.ts       static root resolved against the installed package
src/lib/                           di-kit container: core/{di,types,provide}.ts, services/, index.ts
src/routes/health.ts               GET /api/v1/health/health_check
scripts/copy.mjs                   modules/<name>/out|build -> build/modules/<name>/build
scripts/serve.mjs                  dev runner
```

Adding an API: a service under `src/lib/services/<group>/`, a symbol in `src/lib/core/types.ts`,
`provide()` in `src/lib/core/provide.ts`, `inject()` in `src/lib/index.ts`, a `router` file under `src/routes/`
mounted in `src/config/router.ts` before the catch-all.
