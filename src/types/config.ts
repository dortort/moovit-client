import type { LaunchOptions } from 'puppeteer';

/**
 * Moovit client configuration
 */
export interface MoovitClientConfig {
  /**
   * Metro area ID for the region to query.
   * Default: 1 (Israel)
   *
   * Moovit supports 112+ countries and 3,500+ cities.
   * Examples:
   *   - 1: Israel
   *   - 2: New York, USA
   *   - 3: London, UK
   *   - etc.
   */
  metroId?: number;

  /** Language code for responses. Default: 'EN' */
  language?: string;

  /** User identifier. Auto-generated if not provided */
  userKey?: string;

  /** Customer ID. Default: '4908' */
  customerId?: string;

  /** Puppeteer launch options */
  puppeteerOptions?: LaunchOptions;

  /** WAF token refresh interval in ms. Default: 300000 (5 min) */
  tokenRefreshInterval?: number;

  /** Default latitude for location search bias */
  defaultLat?: number;

  /** Default longitude for location search bias */
  defaultLon?: number;

  /** Enable debug logging. Default: false */
  debug?: boolean;
}

/**
 * Internal resolved configuration
 */
export interface ResolvedConfig {
  metroId: number;
  language: string;
  userKey: string;
  customerId: string;
  puppeteerOptions: LaunchOptions;
  tokenRefreshInterval: number;
  defaultLat: number;
  defaultLon: number;
  debug: boolean;
}

/**
 * API headers configuration
 */
export interface ApiHeaders {
  moovit_app_type: string;
  moovit_client_version: string;
  moovit_customer_id: string;
  moovit_metro_id: string;
  moovit_phone_type: string;
  moovit_user_key: string;
  moovit_gtfs_language: string;
  accept: string;
  [key: string]: string;
}
