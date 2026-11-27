import { memoize } from 'functools-kit';
import { inject } from '../../core/di';
import { TYPES } from '../../core/types';
import LoggerService from '../base/LoggerService';
import { withBase } from '../../base';
import { fetchJson } from '../../../utils/fetchJson';
import type { MessagesFile } from '../../types';

/** data/<id>_messages.json; null when the agent has not written it. Cached per id for the session. */
export class MessagesViewService {
  private readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public getMessages = memoize(
    ([id]) => id,
    async (id: string): Promise<MessagesFile | null> => {
      this.loggerService.log('messagesViewService getMessages', { id });
      try {
        return await fetchJson<MessagesFile>(withBase(`/data/${encodeURIComponent(id)}_messages.json`));
      } catch (error) {
        this.getMessages.clear(id);
        throw error;
      }
    },
  );
}

export default MessagesViewService;
