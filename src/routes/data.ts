import micro from "micro";
import Router from "router";
import mime from "mime-types";
import { errorData, getErrorMessage } from "functools-kit";
import { extname } from "path";

import { ioc } from "../lib";

const router = Router({
  params: true,
});

const DEFAULT_MIME = "application/octet-stream";

const MIME_OVERRIDES: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
};

interface DataParams {
  filePath: string;
}

router.get("/data/:filePath(*)", async (req, res) => {
  try {
    const { filePath } = <DataParams>req.params;

    const file = await ioc.dataViewService.open(filePath);

    if (!file) {
      ioc.loggerService.log("/data not found", {
        request: { filePath },
      });
      return await micro.send(res, 404, {
        status: "error",
        error: `file not found filePath=${filePath}`,
      });
    }

    const ext = extname(file.path).toLowerCase();
    const mimeType = MIME_OVERRIDES[ext] ?? (mime.lookup(file.path) || DEFAULT_MIME);

    // A read error (the agent deleted or truncated the file mid-stream) must not become an
    // uncaught exception: answer 500 while the headers are still ours, otherwise cut the connection
    // so the browser sees a failed request instead of a short body.
    file.stream.on("error", (error) => {
      ioc.loggerService.log("/data stream error", {
        request: { filePath },
        error: errorData(error),
      });
      if (res.headersSent) {
        res.destroy(error);
        return;
      }
      micro.send(res, 500, {
        status: "error",
        error: getErrorMessage(error),
      });
    });
    res.on("close", () => {
      file.stream.destroy();
    });

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", file.size);
    // the agent rewrites these files between runs; never let the browser keep a stale copy
    res.setHeader("Cache-Control", "no-store");

    ioc.loggerService.log("/data ok", {
      request: { filePath },
      result: { path: file.path, mime: mimeType, size: file.size },
    });

    return await micro.send(res, 200, file.stream);
  } catch (error) {
    ioc.loggerService.log("/data error", {
      error: errorData(error),
    });
    return await micro.send(res, 500, {
      status: "error",
      error: getErrorMessage(error),
    });
  }
});

export default router;
