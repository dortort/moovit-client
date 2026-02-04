import { LocationResolver, buildLocationParams } from '../../src/modules/location';
import {
  CoordinateInput,
  StopIdInput,
  TextInput,
  LocationType,
  ResolvedConfig,
  Location,
} from '../../src/types';
import { LocationNotFoundError } from '../../src/errors';
import type { Page } from 'puppeteer';

describe('Location Module', () => {
  const mockConfig: ResolvedConfig = {
    metroId: 54,
    customerId: 'c_web',
    userKey: 'ABC123',
    language: 'en',
    defaultLat: 32.0853,
    defaultLon: 34.7818,
    puppeteerOptions: {},
    tokenRefreshInterval: 300000,
    debug: false,
  };

  let mockPage: jest.Mocked<Page>;
  let resolver: LocationResolver;

  beforeEach(() => {
    mockPage = {
      evaluate: jest.fn(),
    } as any;

    resolver = new LocationResolver(mockConfig, mockPage);
  });

  describe('LocationResolver - resolve()', () => {
    describe('CoordinateInput', () => {
      it('should resolve coordinate input directly', async () => {
        const input: CoordinateInput = {
          type: 'coordinates',
          lat: 32.0853,
          lon: 34.7818,
        };

        const result = await resolver.resolve(input);

        expect(result).toEqual({
          id: 0,
          type: LocationType.COORDINATE,
          coordinates: { lat: 32.0853, lon: 34.7818 },
          caption: '32.085300, 34.781800',
        });
      });

      it('should format caption with 6 decimal places', async () => {
        const input: CoordinateInput = {
          type: 'coordinates',
          lat: 32.1,
          lon: 34.2,
        };

        const result = await resolver.resolve(input);

        expect(result.caption).toBe('32.100000, 34.200000');
      });

      it('should handle negative coordinates', async () => {
        const input: CoordinateInput = {
          type: 'coordinates',
          lat: -32.0853,
          lon: -34.7818,
        };

        const result = await resolver.resolve(input);

        expect(result).toMatchObject({
          coordinates: { lat: -32.0853, lon: -34.7818 },
          caption: '-32.085300, -34.781800',
        });
      });

      it('should handle zero coordinates', async () => {
        const input: CoordinateInput = {
          type: 'coordinates',
          lat: 0,
          lon: 0,
        };

        const result = await resolver.resolve(input);

        expect(result).toMatchObject({
          coordinates: { lat: 0, lon: 0 },
          caption: '0.000000, 0.000000',
        });
      });

      it('should set type to COORDINATE', async () => {
        const input: CoordinateInput = {
          type: 'coordinates',
          lat: 32.0853,
          lon: 34.7818,
        };

        const result = await resolver.resolve(input);

        expect(result.type).toBe(LocationType.COORDINATE);
      });

      it('should set id to 0', async () => {
        const input: CoordinateInput = {
          type: 'coordinates',
          lat: 32.0853,
          lon: 34.7818,
        };

        const result = await resolver.resolve(input);

        expect(result.id).toBe(0);
      });
    });

    describe('StopIdInput', () => {
      it('should resolve stop ID input directly', async () => {
        const input: StopIdInput = {
          type: 'stopId',
          id: 12345,
        };

        const result = await resolver.resolve(input);

        expect(result).toEqual({
          id: 12345,
          type: LocationType.STOP,
          coordinates: { lat: 0, lon: 0 },
          caption: 'Stop 12345',
        });
      });

      it('should format caption with stop ID', async () => {
        const input: StopIdInput = {
          type: 'stopId',
          id: 999,
        };

        const result = await resolver.resolve(input);

        expect(result.caption).toBe('Stop 999');
      });

      it('should set type to STOP', async () => {
        const input: StopIdInput = {
          type: 'stopId',
          id: 12345,
        };

        const result = await resolver.resolve(input);

        expect(result.type).toBe(LocationType.STOP);
      });

      it('should handle large stop IDs', async () => {
        const input: StopIdInput = {
          type: 'stopId',
          id: 9999999,
        };

        const result = await resolver.resolve(input);

        expect(result.id).toBe(9999999);
        expect(result.caption).toBe('Stop 9999999');
      });
    });

    describe('TextInput', () => {
      it('should search and return first result', async () => {
        const input: TextInput = {
          type: 'text',
          query: 'Tel Aviv',
        };

        mockPage.evaluate.mockResolvedValue([
          1, 2, 3, // Mock protobuf bytes
        ]);

        // Mock the decode to return a result
        const searchResults = [
          {
            type: 'poi' as const,
            id: 123,
            metroId: 54,
            name: 'Tel Aviv Central Bus Station',
            subtitle: 'Bus Station',
            lat: 32.0853,
            lon: 34.7818,
          },
        ];

        jest.spyOn(resolver as any, 'searchLocations').mockResolvedValue(searchResults);

        const result = await resolver.resolve(input);

        expect(result).toEqual({
          id: 123,
          type: LocationType.COORDINATE,
          coordinates: { lat: 32.0853, lon: 34.7818 },
          caption: 'Tel Aviv Central Bus Station',
        });
      });

      it('should map stop type correctly', async () => {
        const input: TextInput = {
          type: 'text',
          query: 'Bus Stop',
        };

        const searchResults = [
          {
            type: 'stop' as const,
            id: 456,
            name: 'Bus Stop 456',
            lat: 32.0,
            lon: 34.7,
          },
        ];

        jest.spyOn(resolver as any, 'searchLocations').mockResolvedValue(searchResults);

        const result = await resolver.resolve(input);

        expect(result.type).toBe(LocationType.STOP);
      });

      it('should throw LocationNotFoundError when no results', async () => {
        const input: TextInput = {
          type: 'text',
          query: 'Nonexistent Place',
        };

        jest.spyOn(resolver as any, 'searchLocations').mockResolvedValue([]);

        await expect(resolver.resolve(input)).rejects.toThrow(LocationNotFoundError);
      });

      it('should pass near coordinates to search', async () => {
        const input: TextInput = {
          type: 'text',
          query: 'Restaurant',
          nearLat: 31.7683,
          nearLon: 35.2137,
        };

        const searchSpy = jest.spyOn(resolver as any, 'searchLocations').mockResolvedValue([
          {
            type: 'poi' as const,
            id: 789,
            name: 'Restaurant',
            lat: 31.77,
            lon: 35.22,
          },
        ]);

        await resolver.resolve(input);

        expect(searchSpy).toHaveBeenCalledWith('Restaurant', 31.7683, 35.2137);
      });

      it('should use default coordinates when near not specified', async () => {
        const input: TextInput = {
          type: 'text',
          query: 'Restaurant',
        };

        const searchSpy = jest.spyOn(resolver as any, 'searchLocations').mockResolvedValue([
          {
            type: 'poi' as const,
            id: 789,
            name: 'Restaurant',
            lat: 32.08,
            lon: 34.78,
          },
        ]);

        await resolver.resolve(input);

        expect(searchSpy).toHaveBeenCalledWith('Restaurant', undefined, undefined);
      });
    });

    describe('Unknown input type', () => {
      it('should throw error for unknown type', async () => {
        const input = {
          type: 'unknown',
        } as any;

        await expect(resolver.resolve(input)).rejects.toThrow('Unknown location input type');
      });
    });
  });

  describe('LocationResolver - searchLocations()', () => {
    it('should call page.evaluate with correct parameters', async () => {
      // Mock with valid protobuf response (empty results)
      const emptyResponse = new Uint8Array([]);
      mockPage.evaluate.mockResolvedValue(Array.from(emptyResponse));

      await resolver.searchLocations('Test Query', 32.0, 34.7);

      expect(mockPage.evaluate).toHaveBeenCalledTimes(1);
      const call = mockPage.evaluate.mock.calls[0];
      expect(call[0]).toBeInstanceOf(Function);
      expect(call[1]).toBeTruthy(); // base64 encoded query
      expect(call[2]).toMatchObject({
        moovit_metro_id: '54',
        accept: 'application/x-protobuf',
      });
    });

    it('should use default coordinates when not provided', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      await resolver.searchLocations('Query');

      // Verify evaluate was called
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Network error'));

      await expect(resolver.searchLocations('Query')).rejects.toThrow('Network error');
    });
  });

  describe('buildLocationParams()', () => {
    it('should build location parameters with correct prefix', () => {
      const location: Location = {
        id: 123,
        type: LocationType.STOP,
        coordinates: { lat: 32.0853, lon: 34.7818 },
        caption: 'Test Station',
      };

      const params = buildLocationParams(location, 'fromLocation');

      expect(params).toEqual({
        fromLocation_id: '123',
        fromLocation_type: '4',
        fromLocation_latitude: '32085300',
        fromLocation_longitude: '34781800',
        fromLocation_caption: 'Test%20Station',
      });
    });

    it('should use toLocation prefix', () => {
      const location: Location = {
        id: 456,
        type: LocationType.COORDINATE,
        coordinates: { lat: 31.7683, lon: 35.2137 },
        caption: 'Jerusalem',
      };

      const params = buildLocationParams(location, 'toLocation');

      expect(params).toHaveProperty('toLocation_id', '456');
      expect(params).toHaveProperty('toLocation_type', '6');
      expect(params).toHaveProperty('toLocation_latitude', '31768300');
      expect(params).toHaveProperty('toLocation_longitude', '35213700');
      expect(params).toHaveProperty('toLocation_caption', 'Jerusalem');
    });

    it('should scale coordinates correctly', () => {
      const location: Location = {
        id: 0,
        type: LocationType.COORDINATE,
        coordinates: { lat: 1.123456, lon: 2.654321 },
        caption: 'Test',
      };

      const params = buildLocationParams(location, 'fromLocation');

      expect(params.fromLocation_latitude).toBe('1123456');
      expect(params.fromLocation_longitude).toBe('2654321');
    });

    it('should encode caption with special characters', () => {
      const location: Location = {
        id: 0,
        type: LocationType.COORDINATE,
        coordinates: { lat: 32.0, lon: 34.7 },
        caption: 'Tel Aviv & Jerusalem',
      };

      const params = buildLocationParams(location, 'fromLocation');

      expect(params.fromLocation_caption).toBe('Tel%20Aviv%20%26%20Jerusalem');
    });

    it('should handle negative coordinates', () => {
      const location: Location = {
        id: 0,
        type: LocationType.COORDINATE,
        coordinates: { lat: -32.0853, lon: -34.7818 },
        caption: 'South',
      };

      const params = buildLocationParams(location, 'fromLocation');

      expect(params.fromLocation_latitude).toBe('-32085300');
      expect(params.fromLocation_longitude).toBe('-34781800');
    });

    it('should convert all numbers to strings', () => {
      const location: Location = {
        id: 999,
        type: LocationType.STOP,
        coordinates: { lat: 0, lon: 0 },
        caption: 'Stop',
      };

      const params = buildLocationParams(location, 'fromLocation');

      Object.values(params).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    it('should handle LocationType enum values', () => {
      const stopLocation: Location = {
        id: 1,
        type: LocationType.STOP,
        coordinates: { lat: 0, lon: 0 },
        caption: 'Stop',
      };

      const coordLocation: Location = {
        id: 0,
        type: LocationType.COORDINATE,
        coordinates: { lat: 0, lon: 0 },
        caption: 'Coord',
      };

      const stopParams = buildLocationParams(stopLocation, 'fromLocation');
      const coordParams = buildLocationParams(coordLocation, 'fromLocation');

      expect(stopParams.fromLocation_type).toBe('4');
      expect(coordParams.fromLocation_type).toBe('6');
    });
  });

  describe('Input validation types', () => {
    it('should accept valid CoordinateInput', async () => {
      const input: CoordinateInput = {
        type: 'coordinates',
        lat: 32.0853,
        lon: 34.7818,
      };

      const result = await resolver.resolve(input);
      expect(result).toBeDefined();
    });

    it('should accept valid StopIdInput', async () => {
      const input: StopIdInput = {
        type: 'stopId',
        id: 123,
      };

      const result = await resolver.resolve(input);
      expect(result).toBeDefined();
    });

    it('should accept valid TextInput', async () => {
      const input: TextInput = {
        type: 'text',
        query: 'Test',
      };

      jest.spyOn(resolver as any, 'searchLocations').mockResolvedValue([
        {
          type: 'poi',
          id: 1,
          name: 'Test',
          lat: 32,
          lon: 34,
        },
      ]);

      const result = await resolver.resolve(input);
      expect(result).toBeDefined();
    });
  });
});
