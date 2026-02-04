/**
 * Coordinate-based location input
 */
export interface CoordinateInput {
  type: 'coordinates';
  lat: number;
  lon: number;
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
export type LocationInput = CoordinateInput | StopIdInput | TextInput;

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
