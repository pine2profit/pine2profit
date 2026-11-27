import "./core/provide";

import { init, inject } from "./core/di";
import { TYPES } from "./core/types";
import LoggerService from "./services/base/LoggerService";

const baseServices = {
  loggerService: inject<LoggerService>(TYPES.loggerService),
};

const ioc = {
  ...baseServices,
};

init();

export { ioc };

export default ioc;
