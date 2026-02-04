import type { Page } from 'puppeteer';
import {
  Location,
  LocationType,
  LocationInput,
  LocationSearchResult,
  ResolvedConfig,
  CoordinateInput,
  AliasInput,
  StopIdInput,
  TextInput,
} from '../types';
import { LocationNotFoundError, UnknownAliasError } from '../errors';
import { LocationRegistry, defaultRegistry } from '../data/known-locations';
import { encodeLocationQuery, decodeLocationResults } from '../utils/protobuf';
import { buildProtobufHeaders } from '../utils/headers';
import { toScaled } from '../utils/coordinates';

/**
 * Location resolver that handles all input types
 */
export class LocationResolver {
  private registry: LocationRegistry;

  constructor(
    private config: ResolvedConfig,
    private page: Page,
    registry?: LocationRegistry
  ) {
    this.registry = registry || defaultRegistry;
  }

  /**
   * Resolve any location input to a Location object
   */
  async resolve(input: LocationInput): Promise<Location> {
    switch (input.type) {
      case 'coordinates':
        return this.resolveCoordinates(input);
      case 'alias':
        return this.resolveAlias(input);
      case 'stopId':
        return this.resolveStopId(input);
      case 'text':
        return this.resolveText(input);
      default:
        throw new Error(`Unknown location input type`);
    }
  }

  /**
   * Search for locations by text query
   * Returns array of results for autocomplete functionality
   */
  async searchLocations(
    query: string,
    nearLat?: number,
    nearLon?: number
  ): Promise<LocationSearchResult[]> {
    const lat = nearLat ?? this.config.defaultLat;
    const lon = nearLon ?? this.config.defaultLon;

    // Encode the query as protobuf
    const encoded = encodeLocationQuery(lat, lon, query);
    const base64 = Buffer.from(encoded).toString('base64');

    const headers = buildProtobufHeaders(this.config);

    // Execute request through page context
    const responseBytes = await this.page.evaluate(
      async (queryB64: string, fetchHeaders: Record<string, string>) => {
        const response = await fetch('https://moovitapp.com/api/location', {
          method: 'POST',
          headers: {
            ...fetchHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: queryB64 }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Location search failed: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        return Array.from(new Uint8Array(buffer));
      },
      base64,
      headers
    );

    return decodeLocationResults(new Uint8Array(responseBytes));
  }

  /**
   * Register a user alias for a known location
   */
  registerAlias(alias: string, locationId: string): void {
    this.registry.registerAlias(alias, locationId);
  }

  /**
   * Register a custom known location
   */
  registerLocation(
    id: string,
    name: string,
    lat: number,
    lon: number,
    aliases?: string[]
  ): void {
    this.registry.register({
      id,
      name,
      coordinates: { lat, lon },
      aliases,
    });
  }

  /**
   * List all known locations
   */
  listKnownLocations() {
    return this.registry.list();
  }

  /**
   * Get the underlying registry
   */
  getRegistry(): LocationRegistry {
    return this.registry;
  }

  /**
   * Resolve coordinate input
   */
  private resolveCoordinates(input: CoordinateInput): Location {
    return {
      id: 0,
      type: LocationType.COORDINATE,
      coordinates: { lat: input.lat, lon: input.lon },
      caption: `${input.lat.toFixed(6)}, ${input.lon.toFixed(6)}`,
    };
  }

  /**
   * Resolve alias input
   */
  private resolveAlias(input: AliasInput): Location {
    const known = this.registry.get(input.name);

    if (!known) {
      throw new UnknownAliasError(input.name);
    }

    return {
      id: 0,
      type: LocationType.COORDINATE,
      coordinates: known.coordinates,
      caption: known.name,
    };
  }

  /**
   * Resolve stop ID input (experimental)
   */
  private resolveStopId(input: StopIdInput): Location {
    // For stop IDs, we use type=4 which tells the API it's a stop
    return {
      id: input.id,
      type: LocationType.STOP,
      coordinates: { lat: 0, lon: 0 }, // Coordinates filled by API
      caption: `Stop ${input.id}`,
    };
  }

  /**
   * Resolve text search input
   */
  private async resolveText(input: TextInput): Promise<Location> {
    const results = await this.searchLocations(
      input.query,
      input.nearLat,
      input.nearLon
    );

    if (results.length === 0) {
      throw new LocationNotFoundError(input.query);
    }

    const best = results[0];

    return {
      id: best.id,
      type: best.type === 'stop' ? LocationType.STOP : LocationType.COORDINATE,
      coordinates: { lat: best.lat, lon: best.lon },
      caption: best.name,
    };
  }
}

/**
 * Build location parameters for API requests
 */
export function buildLocationParams(
  location: Location,
  prefix: 'fromLocation' | 'toLocation'
): Record<string, string> {
  return {
    [`${prefix}_id`]: String(location.id),
    [`${prefix}_type`]: String(location.type),
    [`${prefix}_latitude`]: String(toScaled(location.coordinates.lat)),
    [`${prefix}_longitude`]: String(toScaled(location.coordinates.lon)),
    [`${prefix}_caption`]: encodeURIComponent(location.caption),
  };
}
