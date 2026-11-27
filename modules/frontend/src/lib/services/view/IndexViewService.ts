import { BehaviorSubject, singleshot } from 'functools-kit';
import { inject } from '../../core/di';
import { TYPES } from '../../core/types';
import LoggerService from '../base/LoggerService';
import { withBase } from '../../base';
import { decodeLine } from '../../decodeLine';
import type { IndexLine, IndexRow } from '../../types';

/** rows are pushed to subscribers after this many new lines, so a big chunk paints before it finishes */
const EMIT_EVERY = 500;

const chunkUrl = (n: number) => withBase(`/data/index_${n}.jsonl`);

/**
 * The list: data/index_1.jsonl, index_2.jsonl, … read one after another until the first non-OK response.
 * Every line is one script; a later line with the same id replaces the earlier one, so the agent can
 * append updates to the last chunk without rewriting old ones. Subscribers get the whole set each time.
 */
export class IndexViewService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  private readonly rows = new Map<string, IndexRow>();

  public readonly rowsSubject = new BehaviorSubject<IndexRow[]>([]);
  public readonly doneSubject = new BehaviorSubject<boolean>(false);

  public rowById = (id: string): IndexRow | null => {
    this.loggerService.log('indexViewService rowById', { id });
    return this.rows.get(id) ?? null;
  };

  public getRows = (): IndexRow[] => [...this.rows.values()];

  public load = singleshot(async () => {
    this.loggerService.log('indexViewService load');
    try {
      for (let n = 1; ; n += 1) {
        const res = await fetch(chunkUrl(n));
        if (!res.ok) {
          this.loggerService.log('indexViewService load end', { chunk: n, status: res.status });
          break;
        }
        await this.readChunk(res);
        await this.rowsSubject.next(this.getRows());
      }
    } finally {
      await this.doneSubject.next(true);
    }
  });

  private readChunk = async (res: Response) => {
    let pending = 0;
    const push = (line: string) => {
      const l = line.trim();
      if (!l) return;
      try {
        const row = decodeLine(JSON.parse(l) as IndexLine);
        this.rows.set(row.id, row);
        pending += 1;
      } catch (error) {
        this.loggerService.warn('indexViewService readChunk bad line', { line: l.slice(0, 120), error });
      }
    };
    const reader = res.body?.getReader();
    if (!reader) {
      (await res.text()).split('\n').forEach(push);
      return;
    }
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n');
      buf = parts.pop() ?? '';
      parts.forEach(push);
      if (pending >= EMIT_EVERY) {
        pending = 0;
        await this.rowsSubject.next(this.getRows());
      }
    }
    push(buf);
  };
}

export default IndexViewService;
