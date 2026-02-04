import { ResolvedConfig, ApiHeaders } from '../types';

/**
 * API version string
 */
export const API_VERSION = '5.151.2/V567';

/**
 * Build standard API headers from config
 */
export function buildHeaders(config: ResolvedConfig): ApiHeaders {
  return {
    moovit_app_type: 'WEB_TRIP_PLANNER',
    moovit_client_version: API_VERSION,
    moovit_customer_id: config.customerId,
    moovit_metro_id: String(config.metroId),
    moovit_phone_type: '2',
    moovit_user_key: config.userKey,
    moovit_gtfs_language: config.language,
    accept: 'application/json',
  };
}

/**
 * Build headers for protobuf endpoints
 */
export function buildProtobufHeaders(config: ResolvedConfig): ApiHeaders {
  return {
    ...buildHeaders(config),
    accept: 'application/x-protobuf',
    'protobuf-version': 'V3',
    'content-type': 'application/json',
  };
}

/**
 * Generate a random user key
 */
export function generateUserKey(): string {
  const chars = 'ABCDEF0123456789';
  let key = '';
  for (let i = 0; i < 6; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}
