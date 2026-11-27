import "./core/provide";

import { init, inject } from "./core/di";
import { TYPES } from "./core/types";
import LoggerService from "./services/base/LoggerService";
import DataViewService from "./services/view/DataViewService";
import DataValidationService from "./services/validation/DataValidationService";

const baseServices = {
  loggerService: inject<LoggerService>(TYPES.loggerService),
};

const viewServices = {
  dataViewService: inject<DataViewService>(TYPES.dataViewService),
};

const validationServices = {
  dataValidationService: inject<DataValidationService>(TYPES.dataValidationService),
};

const ioc = {
  ...baseServices,
  ...viewServices,
  ...validationServices,
};

init();

export { ioc };

export default ioc;
