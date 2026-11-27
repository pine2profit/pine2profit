import { BehaviorSubject } from "functools-kit";

/** Project root passed to serve(); data files are served from <root>/data. */
export const serveSubject = new BehaviorSubject<string>();
