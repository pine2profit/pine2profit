declare function parseInt(value: unknown): number;

const GLOBAL_CONFIG = {
  CC_WWWROOT_PATH: "",
  CC_WWWROOT_HOST: "",
  CC_WWWROOT_PORT: 0,
};

export const DEFAULT_CONFIG = Object.freeze({ ...GLOBAL_CONFIG });

export type Config = typeof GLOBAL_CONFIG;

export const getConfig = () => {
  const config = {
    CC_WWWROOT_PATH: process.env.CC_WWWROOT_PATH || "",
    CC_WWWROOT_HOST: process.env.CC_WWWROOT_HOST || "0.0.0.0",
    CC_WWWROOT_PORT: parseInt(process.env.CC_WWWROOT_PORT) || 60050,
  };
  if (GLOBAL_CONFIG.CC_WWWROOT_PATH) {
    config.CC_WWWROOT_PATH = GLOBAL_CONFIG.CC_WWWROOT_PATH;
  }
  if (GLOBAL_CONFIG.CC_WWWROOT_HOST) {
    config.CC_WWWROOT_HOST = GLOBAL_CONFIG.CC_WWWROOT_HOST;
  }
  if (GLOBAL_CONFIG.CC_WWWROOT_PORT) {
    config.CC_WWWROOT_PORT = GLOBAL_CONFIG.CC_WWWROOT_PORT;
  }
  return config;
};

export const setConfig = (config: Partial<Config>) => {
  Object.assign(GLOBAL_CONFIG, config);
};
