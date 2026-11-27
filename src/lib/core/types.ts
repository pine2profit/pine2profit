const baseServices = {
    loggerService: Symbol("loggerService"),
};

const viewServices = {
    dataViewService: Symbol("dataViewService"),
};

const validationServices = {
    dataValidationService: Symbol("dataValidationService"),
};

export const TYPES = {
    ...baseServices,
    ...viewServices,
    ...validationServices,
}
