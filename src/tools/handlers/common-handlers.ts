export { executeAutomationRequest, createSubActionDispatcher, executeBatchConsoleCommands } from './automation-request-dispatch.js';
export type { SubActionDispatcher } from './automation-request-dispatch.js';
export { ensureArgsPresent, validateSecurityPatterns, validateArgsSecurity, requireAction, requireNonEmptyString, requireAssetName, validateExpectedParams, validateRequiredParams } from './handler-argument-validation.js';
export { getTimeoutMs } from './handler-timeout.js';
export { normalizePathFields } from './ue-path-normalization.js';
export { promoteScalarResultFields } from './scalar-result-promotion.js';
export { normalizeLocation, normalizeRotation } from './transform-normalization.js';
