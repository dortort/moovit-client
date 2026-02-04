import { Coordinates } from './common';

/**
 * Coordinate-based location input
 */
export interface CoordinateInput {
  type: 'coordinates';
  lat: number;
  lon: number;
}

/**
 * Known location alias input
 */
export interface AliasInput {
  type: 'alias';
  name: string;
}

/**
 * Stop ID input
 */
export interface StopIdInput {
  type: 'stopId';
  id: number;
}

/**
 * Text search input
 */
export interface TextInput {
  type: 'text';
  query: string;
  /** Optional latitude to bias search results */
  nearLat?: number;
  /** Optional longitude to bias search results */
  nearLon?: number;
}

/**
 * Discriminated union of all location input types
 */
export type LocationInput = CoordinateInput | AliasInput | StopIdInput | TextInput;

/**
 * Result from location search
 */
export interface LocationSearchResult {
  type: 'poi' | 'address' | 'stop';
  id: number;
  metroId?: number;
  name: string;
  subtitle?: string;
  lat: number;
  lon: number;
}

/**
 * Known location definition
 */
export interface KnownLocation {
  /** Unique identifier (kebab-case) */
  id: string;
  /** Display name */
  name: string;
  /** Coordinates */
  coordinates: Coordinates;
  /** Optional aliases */
  aliases?: string[];
  /** Optional category */
  category?: 'train-station' | 'bus-station' | 'airport' | 'landmark' | 'city-center';
}
