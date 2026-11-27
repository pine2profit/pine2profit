import LoggerService from "../services/base/LoggerService";
import DataViewService from "../services/view/DataViewService";
import { provide } from "./di";
import { TYPES } from "./types";

{
  provide(TYPES.loggerService, () => new LoggerService());
}

{
  provide(TYPES.dataViewService, () => new DataViewService());
}
