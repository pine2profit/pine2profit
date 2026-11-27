const baseServices = {
  loggerService: Symbol('loggerService'),
  chartService: Symbol('chartService'),
  linkService: Symbol('linkService'),
};

const helperServices = {
  markdownHelperService: Symbol('markdownHelperService'),
};

const viewServices = {
  indexViewService: Symbol('indexViewService'),
  messagesViewService: Symbol('messagesViewService'),
  candlesViewService: Symbol('candlesViewService'),
  pinescriptViewService: Symbol('pinescriptViewService'),
};

export const TYPES = {
  ...baseServices,
  ...helperServices,
  ...viewServices,
};

export default TYPES;
