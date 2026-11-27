import fs from "fs";
import { realpath, stat } from "fs/promises";
import path from "path";

import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import { TYPES } from "../../core/types";
import { getConfig } from "../../../config/params";
import { serveSubject } from "../../../config/emitters";

const DATA_DIR = "data";

export interface DataFile {
  path: string;
  size: number;
}

const isInside = (root: string, target: string) =>
  target === root || target.startsWith(root + path.sep);

/** Drops empty, "." and ".." segments so a request can never climb above the root. */
const normalizeSegments = (relPath: string) =>
  relPath.split(/[\\/]+/).filter((segment) => segment && segment !== "." && segment !== "..");

export class DataViewService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  /** <root>/data, where root is CC_DATA_PATH or the cwd passed to serve(). */
  public getRoot = () => {
    const { CC_DATA_PATH } = getConfig();
    const base = CC_DATA_PATH || serveSubject.data || process.cwd();
    return path.resolve(base, DATA_DIR);
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

  public stat = async (relPath: string): Promise<DataFile | null> => {
    this.loggerService.log("dataViewService stat", { relPath });
    const filePath = await this.resolve(relPath);
    if (!filePath) {
      return null;
    }
    try {
      const fileStat = await stat(filePath);
      return fileStat.isFile() ? { path: filePath, size: fileStat.size } : null;
    } catch {
      return null;
    }
  };

  public createReadStream = (filePath: string) => {
    this.loggerService.log("dataViewService createReadStream", { filePath });
    return fs.createReadStream(filePath);
  };
}

export default DataViewService;
