import LoggerService from "../services/base/LoggerService";
import DataViewService from "../services/view/DataViewService";
import DataValidationService from "../services/validation/DataValidationService";
import { provide } from "./di";
import { TYPES } from "./types";

{
  provide(TYPES.loggerService, () => new LoggerService());
}

{
  provide(TYPES.dataViewService, () => new DataViewService());
}

{
  provide(TYPES.dataValidationService, () => new DataValidationService());
}
