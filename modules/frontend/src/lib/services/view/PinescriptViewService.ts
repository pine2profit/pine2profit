import { memoize } from 'functools-kit';
import { inject } from '../../core/di';
import { TYPES } from '../../core/types';
import LoggerService from '../base/LoggerService';
import { withBase } from '../../base';
import { fetchJson } from '../../../utils/fetchJson';
import type { PinescriptFile } from '../../types';

/** data/<id>_pinescript.json; null (404) means there is no code panel for this script. */
export class PinescriptViewService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public getPinescript = memoize(
    ([id]) => id,
    async (id: string): Promise<PinescriptFile | null> => {
      this.loggerService.log('pinescriptViewService getPinescript', { id });
      try {
        return await fetchJson<PinescriptFile>(withBase(`/data/${encodeURIComponent(id)}_pinescript.json`));
      } catch (error) {
        this.getPinescript.clear(id);
        throw error;
      }
    },
  );
}

export default PinescriptViewService;
