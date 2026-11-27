import { provide } from './di';
import { TYPES } from './types';

import LoggerService from '../services/base/LoggerService';
import ChartService from '../services/base/ChartService';
import LinkService from '../services/base/LinkService';

import MarkdownHelperService from '../services/helpers/MarkdownHelperService';

import IndexViewService from '../services/view/IndexViewService';
import MessagesViewService from '../services/view/MessagesViewService';
import CandlesViewService from '../services/view/CandlesViewService';
import PinescriptViewService from '../services/view/PinescriptViewService';

{
  provide(TYPES.loggerService, () => new LoggerService());
  provide(TYPES.chartService, () => new ChartService());
  provide(TYPES.linkService, () => new LinkService());
}

{
  provide(TYPES.markdownHelperService, () => new MarkdownHelperService());
}

{
  provide(TYPES.indexViewService, () => new IndexViewService());
  provide(TYPES.messagesViewService, () => new MessagesViewService());
  provide(TYPES.candlesViewService, () => new CandlesViewService());
  provide(TYPES.pinescriptViewService, () => new PinescriptViewService());
}
