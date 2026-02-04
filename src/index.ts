// Main client
export { MoovitClient } from './client';

// Types
export * from './types';

// Errors
export * from './errors';

// Utilities (for advanced usage)
export { toScaledCoordinates, fromScaledCoordinates, toScaled, fromScaled, calculateDistance, isValidCoordinates } from './utils/coordinates';
export { buildHeaders, buildProtobufHeaders, generateUserKey, API_VERSION } from './utils/headers';

// Re-export service types
export type { TransitImage } from './modules/images';
