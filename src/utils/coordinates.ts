import { Coordinates, ScaledCoordinates } from '../types';

/**
 * Scale factor for converting between real and API coordinates
 */
export const COORDINATE_SCALE = 1_000_000;

/**
 * Convert real coordinates to scaled API format
 */
export function toScaledCoordinates(coords: Coordinates): ScaledCoordinates {
  return {
    latitude: Math.round(coords.lat * COORDINATE_SCALE),
    longitude: Math.round(coords.lon * COORDINATE_SCALE),
  };
}

/**
 * Convert scaled API coordinates to real format
 */
export function fromScaledCoordinates(scaled: ScaledCoordinates): Coordinates {
  return {
    lat: scaled.latitude / COORDINATE_SCALE,
    lon: scaled.longitude / COORDINATE_SCALE,
  };
}

/**
 * Convert a single coordinate value to scaled format
 */
export function toScaled(value: number): number {
  return Math.round(value * COORDINATE_SCALE);
}

/**
 * Convert a single scaled coordinate value to real format
 */
export function fromScaled(value: number): number {
  return value / COORDINATE_SCALE;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Validate coordinates are within valid ranges
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    typeof coords.lat === 'number' &&
    typeof coords.lon === 'number' &&
    !isNaN(coords.lat) &&
    !isNaN(coords.lon) &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lon >= -180 &&
    coords.lon <= 180
  );
}
