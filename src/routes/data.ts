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

    const file = await ioc.dataViewService.stat(filePath);

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

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", file.size);
    // the agent rewrites these files between runs; never let the browser keep a stale copy
    res.setHeader("Cache-Control", "no-store");

    ioc.loggerService.log("/data ok", {
      request: { filePath },
      result: { path: file.path, mime: mimeType, size: file.size },
    });

    return await micro.send(res, 200, ioc.dataViewService.createReadStream(file.path));
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
