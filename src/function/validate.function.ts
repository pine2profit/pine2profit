import ioc from "../lib";
import type { DataReport } from "../lib/services/validation/DataValidationService";

const METHOD_NAME_VALIDATE = "validate.validate";

/** Checks <root>/data against the contract and returns every problem found. */
export function validate(root: string): Promise<DataReport> {
  ioc.loggerService.log(METHOD_NAME_VALIDATE, { root });
  return ioc.dataValidationService.validate(root);
}
