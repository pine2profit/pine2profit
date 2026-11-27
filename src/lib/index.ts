import "./core/provide";

import { init, inject } from "./core/di";
import { TYPES } from "./core/types";
import LoggerService from "./services/base/LoggerService";
import DataViewService from "./services/view/DataViewService";

const baseServices = {
  loggerService: inject<LoggerService>(TYPES.loggerService),
};

const viewServices = {
  dataViewService: inject<DataViewService>(TYPES.dataViewService),
};

const ioc = {
  ...baseServices,
  ...viewServices,
};

init();

export { ioc };

export default ioc;
