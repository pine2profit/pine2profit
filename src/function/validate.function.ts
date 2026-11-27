import ioc from "../lib";
import type { DataIssue, DataSummary } from "../lib/services/validation/DataValidationService";

const METHOD_NAME_VALIDATE = "validate.validate";

/**
 * Checks <root>/data against the contract. Yields each problem as soon as it is found; the
 * generator's return value is the summary. Consume it with `for await`, or step with next()
 * when the summary is needed:
 *   const it = validate(root); let r; while (!(r = await it.next()).done) report(r.value); const summary = r.value;
 */
export function validate(root: string): AsyncGenerator<DataIssue, DataSummary> {
  ioc.loggerService.log(METHOD_NAME_VALIDATE, { root });
  return ioc.dataValidationService.validate(root);
}
