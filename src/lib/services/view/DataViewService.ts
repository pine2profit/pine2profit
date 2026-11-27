import type { ReadStream } from "fs";
import { open, realpath } from "fs/promises";
import path from "path";

import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import { TYPES } from "../../core/types";
import { serveSubject } from "../../../config/emitters";

const DATA_DIR = "data";

export interface DataFile {
  path: string;
  /** size of the file that `stream` reads, taken from the same open handle */
  size: number;
  stream: ReadStream;
}

const isInside = (root: string, target: string) =>
  target === root || target.startsWith(root + path.sep);

/** Drops empty, "." and ".." segments so a request can never climb above the root. */
const normalizeSegments = (relPath: string) =>
  relPath.split(/[\\/]+/).filter((segment) => segment && segment !== "." && segment !== "..");

export class DataViewService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  /** <root>/data; serve() resolves root once (its cwd argument, else CC_DATA_PATH, else process.cwd()). */
  public getRoot = () => {
    return path.resolve(serveSubject.data || process.cwd(), DATA_DIR);
  };

  /**
   * Absolute path of a file inside the data root, or null when the request points
   * outside of it: checked on the lexical path and again on the real path, so a
   * symlink inside data/ cannot lead out either.
   */
  public resolve = async (relPath: string): Promise<string | null> => {
    this.loggerService.log("dataViewService resolve", { relPath });
    const root = this.getRoot();
    const absPath = path.resolve(root, ...normalizeSegments(relPath));
    if (!isInside(root, absPath)) {
      return null;
    }
    try {
      const realRoot = await realpath(root);
      const realPath = await realpath(absPath);
      return isInside(realRoot, realPath) ? realPath : null;
    } catch {
      return null;
    }
  };

  /**
   * Opens a file for streaming. The handle is opened first and the size read from it, so the
   * Content-Length matches the bytes the stream will deliver even if the agent replaces the
   * file (rename) meanwhile; the stream closes the handle when it ends or fails.
   */
  public open = async (relPath: string): Promise<DataFile | null> => {
    this.loggerService.log("dataViewService open", { relPath });
    const filePath = await this.resolve(relPath);
    if (!filePath) {
      return null;
    }
    let handle: Awaited<ReturnType<typeof open>>;
    try {
      handle = await open(filePath, "r");
    } catch {
      return null;
    }
    const fileStat = await handle.stat();
    if (!fileStat.isFile()) {
      await handle.close();
      return null;
    }
    return { path: filePath, size: fileStat.size, stream: handle.createReadStream() };
  };
}

export default DataViewService;
