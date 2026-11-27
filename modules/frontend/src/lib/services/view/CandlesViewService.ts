import { memoize } from 'functools-kit';
import { inject } from '../../core/di';
import { TYPES } from '../../core/types';
import LoggerService from '../base/LoggerService';
import { withBase } from '../../base';
import { fetchJson } from '../../../utils/fetchJson';
import type { CandlesFile } from '../../types';

/** data/<id>_candles.json: bars for the chart, the rule's trades, the P&L line. Cached per id (about 2 MB each). */
export class CandlesViewService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public getCandles = memoize(
    ([id]) => id,
    async (id: string): Promise<CandlesFile | null> => {
      this.loggerService.log('candlesViewService getCandles', { id });
      try {
        return await fetchJson<CandlesFile>(withBase(`/data/${encodeURIComponent(id)}_candles.json`));
      } catch (error) {
        this.getCandles.clear(id);
        throw error;
      }
    },
  );
}

export default CandlesViewService;
