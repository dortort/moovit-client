/**
 * Scaled coordinate value (real value * 1,000,000)
 */
export type ScaledCoordinate = number;

/**
 * Geographic coordinates
 */
export interface Coordinates {
  /** Latitude in degrees */
  lat: number;
  /** Longitude in degrees */
  lon: number;
}

/**
 * Scaled coordinates as used by Moovit API
 */
export interface ScaledCoordinates {
  latitude: ScaledCoordinate;
  longitude: ScaledCoordinate;
}

/**
 * Location type enumeration
 */
export enum LocationType {
  UNKNOWN = 0,
  STOP = 4,
  COORDINATE = 6,
}

/**
 * A resolved location ready for API use
 */
export interface Location {
  id: number;
  type: LocationType;
  coordinates: Coordinates;
  caption: string;
}

/**
 * Time information from API
 */
export interface TimeInfo {
  startTimeUtc: number;
  endTimeUtc: number;
  isRealTime?: number;
}

/**
 * Transit line basic info
 */
export interface Line {
  id: number;
  shortName?: string;
  number?: string;
  agencyId?: number;
  agencyName?: string;
  color?: string;
  type?: number;
}

/**
 * Transit agency info
 */
export interface Agency {
  id: number;
  name: string;
  url?: string;
  phone?: string;
  logoImageId?: number;
}
