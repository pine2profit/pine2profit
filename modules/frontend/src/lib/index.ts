import './core/provide';

import { init, inject } from './core/di';
import { TYPES } from './core/types';

import LoggerService from './services/base/LoggerService';
import ChartService from './services/base/ChartService';
import LinkService from './services/base/LinkService';

import MarkdownHelperService from './services/helpers/MarkdownHelperService';

import IndexViewService from './services/view/IndexViewService';
import MessagesViewService from './services/view/MessagesViewService';
import CandlesViewService from './services/view/CandlesViewService';
import PinescriptViewService from './services/view/PinescriptViewService';

const baseServices = {
  loggerService: inject<LoggerService>(TYPES.loggerService),
  chartService: inject<ChartService>(TYPES.chartService),
  linkService: inject<LinkService>(TYPES.linkService),
};

const helperServices = {
  markdownHelperService: inject<MarkdownHelperService>(TYPES.markdownHelperService),
};

const viewServices = {
  indexViewService: inject<IndexViewService>(TYPES.indexViewService),
  messagesViewService: inject<MessagesViewService>(TYPES.messagesViewService),
  candlesViewService: inject<CandlesViewService>(TYPES.candlesViewService),
  pinescriptViewService: inject<PinescriptViewService>(TYPES.pinescriptViewService),
};

export const ioc = {
  ...baseServices,
  ...helperServices,
  ...viewServices,
};

init();

if (typeof window !== 'undefined') {
  Object.assign(window, { ioc });
}

export default ioc;
