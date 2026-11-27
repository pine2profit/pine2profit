const baseServices = {
    loggerService: Symbol("loggerService"),
};

const viewServices = {
    dataViewService: Symbol("dataViewService"),
};

export const TYPES = {
    ...baseServices,
    ...viewServices,
}
