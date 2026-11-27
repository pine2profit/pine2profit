import { BehaviorSubject } from "functools-kit";

/** Project root passed to serve(); API services read runs/ and friends relative to it. */
export const serveSubject = new BehaviorSubject<string>();
