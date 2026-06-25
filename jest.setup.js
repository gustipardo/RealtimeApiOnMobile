// Jest setup: define RN globals that don't exist in a node env. The
// real RN runtime injects these at build time. We default them to the
// values that match a test (DEV=true is the safe default — production
// paths that depend on `__DEV__ === false` are explicitly opted into).
global.__DEV__ = true;
