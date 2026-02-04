import { RouteService } from '../../src/modules/route';
import { ResolvedConfig } from '../../src/types';
import type { Page } from 'puppeteer';

describe('Route Module', () => {
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
  let routeService: RouteService;

  beforeEach(() => {
    mockPage = {
      evaluate: jest.fn(),
    } as any;

    routeService = new RouteService(mockConfig, mockPage);
  });

  describe('parseWalkLeg', () => {
    it('should parse walk leg correctly', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000600000,
        },
        shape: {
          distanceInMeters: 450,
          polyline: 'encoded_polyline_data',
        },
      };

      const result = (routeService as any).parseWalkLeg(raw);

      expect(result).toEqual({
        type: 'walk',
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000600000,
        },
        distanceInMeters: 450,
        polyline: 'encoded_polyline_data',
      });
    });

    it('should handle missing optional fields', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000600000,
        },
      };

      const result = (routeService as any).parseWalkLeg(raw);

      expect(result).toMatchObject({
        type: 'walk',
        distanceInMeters: 0,
      });
      expect(result.polyline).toBeUndefined();
    });

    it('should default missing time values to 0', () => {
      const raw = {};

      const result = (routeService as any).parseWalkLeg(raw);

      expect(result.time).toEqual({
        startTimeUtc: 0,
        endTimeUtc: 0,
      });
    });
  });

  describe('parseTransitLeg', () => {
    it('should parse transit leg with all fields', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640001200000,
          isRealTime: 1,
        },
        line: {
          id: 123,
          shortName: '5',
          number: '5',
          agencyId: 10,
          agencyName: 'Dan',
          color: 'FF0000',
          type: 3,
        },
        origin: {
          id: 1001,
          caption: 'Central Station',
          latlon: {
            latitude: 32085300,
            longitude: 34781800,
          },
        },
        dest: {
          id: 1002,
          caption: 'University',
          latlon: {
            latitude: 32113000,
            longitude: 34804500,
          },
        },
        numOfStopsInLeg: 8,
        shape: {
          polyline: 'transit_polyline',
        },
      };

      const result = (routeService as any).parseTransitLeg(raw);

      expect(result).toEqual({
        type: 'transit',
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640001200000,
          isRealTime: 1,
        },
        line: {
          id: 123,
          shortName: '5',
          number: '5',
          agencyId: 10,
          agencyName: 'Dan',
          color: 'FF0000',
          type: 3,
        },
        origin: {
          id: 1001,
          name: 'Central Station',
          coordinates: {
            lat: 32.0853,
            lon: 34.7818,
          },
        },
        destination: {
          id: 1002,
          name: 'University',
          coordinates: {
            lat: 32.113,
            lon: 34.8045,
          },
        },
        numStops: 8,
        polyline: 'transit_polyline',
      });
    });

    it('should convert scaled coordinates correctly', () => {
      const raw = {
        origin: {
          latlon: {
            latitude: 1000000,
            longitude: 2000000,
          },
        },
        dest: {
          latlon: {
            latitude: 3000000,
            longitude: 4000000,
          },
        },
      };

      const result = (routeService as any).parseTransitLeg(raw);

      expect(result.origin.coordinates).toEqual({ lat: 1.0, lon: 2.0 });
      expect(result.destination.coordinates).toEqual({ lat: 3.0, lon: 4.0 });
    });

    it('should handle negative coordinates', () => {
      const raw = {
        origin: {
          latlon: {
            latitude: -32085300,
            longitude: -34781800,
          },
        },
        dest: {
          latlon: {
            latitude: -31768300,
            longitude: -35213700,
          },
        },
      };

      const result = (routeService as any).parseTransitLeg(raw);

      expect(result.origin.coordinates).toEqual({ lat: -32.0853, lon: -34.7818 });
      expect(result.destination.coordinates).toEqual({ lat: -31.7683, lon: -35.2137 });
    });

    it('should default missing fields', () => {
      const raw = {};

      const result = (routeService as any).parseTransitLeg(raw);

      expect(result).toMatchObject({
        type: 'transit',
        line: { id: 0 },
        origin: { id: 0, name: '' },
        destination: { id: 0, name: '' },
        numStops: 0,
      });
    });
  });

  describe('parseTaxiLeg', () => {
    it('should parse taxi leg with all fields', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000900000,
        },
        taxiProviderName: 'Gett',
        shape: {
          distanceInMeters: 3200,
          polyline: 'taxi_polyline',
        },
        journey: {
          origin: {
            caption: 'Start Point',
            latlon: {
              latitude: 32085300,
              longitude: 34781800,
            },
          },
          dest: {
            caption: 'End Point',
            latlon: {
              latitude: 32113000,
              longitude: 34804500,
            },
          },
        },
        deepLinks: {
          androidDeepLink: 'gett://android',
          iosDeepLink: 'gett://ios',
          webDeepLink: 'https://gett.com',
        },
      };

      const result = (routeService as any).parseTaxiLeg(raw);

      expect(result).toEqual({
        type: 'taxi',
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000900000,
        },
        providerName: 'Gett',
        distanceInMeters: 3200,
        origin: {
          caption: 'Start Point',
          coordinates: { lat: 32.0853, lon: 34.7818 },
        },
        destination: {
          caption: 'End Point',
          coordinates: { lat: 32.113, lon: 34.8045 },
        },
        polyline: 'taxi_polyline',
        deepLinks: {
          android: 'gett://android',
          ios: 'gett://ios',
          web: 'https://gett.com',
        },
      });
    });

    it('should default provider name to Taxi', () => {
      const raw = {};

      const result = (routeService as any).parseTaxiLeg(raw);

      expect(result.providerName).toBe('Taxi');
    });

    it('should handle missing deep links', () => {
      const raw = {
        taxiProviderName: 'Gett',
      };

      const result = (routeService as any).parseTaxiLeg(raw);

      expect(result.deepLinks).toBeUndefined();
    });
  });

  describe('parseWaitLeg', () => {
    it('should parse wait leg and calculate duration', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000300000, // 5 minutes
        },
        waitAtLocation: {
          caption: 'Bus Stop 123',
          latlon: {
            latitude: 32085300,
            longitude: 34781800,
          },
        },
      };

      const result = (routeService as any).parseWaitLeg(raw);

      expect(result).toEqual({
        type: 'wait',
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000300000,
        },
        waitDurationMinutes: 5,
        location: {
          caption: 'Bus Stop 123',
          coordinates: { lat: 32.0853, lon: 34.7818 },
        },
      });
    });

    it('should handle missing location', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000600000,
        },
      };

      const result = (routeService as any).parseWaitLeg(raw);

      expect(result.location).toBeUndefined();
      expect(result.waitDurationMinutes).toBe(10);
    });

    it('should round duration to minutes', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000330000, // 5.5 minutes
        },
      };

      const result = (routeService as any).parseWaitLeg(raw);

      expect(result.waitDurationMinutes).toBe(6); // Rounded
    });
  });

  describe('parseBikeLeg', () => {
    it('should parse bike leg correctly', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000900000,
        },
        shape: {
          distanceInMeters: 1500,
          polyline: 'bike_polyline',
        },
      };

      const result = (routeService as any).parseBikeLeg(raw);

      expect(result).toEqual({
        type: 'bike',
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000900000,
        },
        distanceInMeters: 1500,
        polyline: 'bike_polyline',
      });
    });

    it('should handle missing shape', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000900000,
        },
      };

      const result = (routeService as any).parseBikeLeg(raw);

      expect(result.distanceInMeters).toBe(0);
      expect(result.polyline).toBeUndefined();
    });
  });

  describe('parseScooterLeg', () => {
    it('should parse scooter leg correctly', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000600000,
        },
        providerName: 'Lime',
        shape: {
          distanceInMeters: 800,
          polyline: 'scooter_polyline',
        },
      };

      const result = (routeService as any).parseScooterLeg(raw);

      expect(result).toEqual({
        type: 'scooter',
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000600000,
        },
        providerName: 'Lime',
        distanceInMeters: 800,
        polyline: 'scooter_polyline',
      });
    });

    it('should default provider name to Scooter', () => {
      const raw = {};

      const result = (routeService as any).parseScooterLeg(raw);

      expect(result.providerName).toBe('Scooter');
    });
  });

  describe('parseWaitForTaxiLeg', () => {
    it('should parse wait for taxi leg', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000300000,
        },
        waitAtLocation: {
          caption: 'Pickup Point',
          latlon: {
            latitude: 32085300,
            longitude: 34781800,
          },
        },
        approxWaitingSecFromOrdering: 180,
        taxiId: 555,
      };

      const result = (routeService as any).parseWaitForTaxiLeg(raw);

      expect(result).toEqual({
        type: 'waitForTaxi',
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640000300000,
        },
        location: {
          caption: 'Pickup Point',
          coordinates: { lat: 32.0853, lon: 34.7818 },
        },
        approxWaitingSeconds: 180,
        taxiId: 555,
      });
    });

    it('should default missing values', () => {
      const raw = {
        waitAtLocation: {
          caption: 'Test',
          latlon: {},
        },
      };

      const result = (routeService as any).parseWaitForTaxiLeg(raw);

      expect(result.approxWaitingSeconds).toBe(0);
      expect(result.taxiId).toBe(0);
    });
  });

  describe('parseLineWithAlternativesLeg', () => {
    it('should parse line with alternatives', () => {
      const raw = {
        time: {
          startTimeUtc: 1640000000000,
          endTimeUtc: 1640001200000,
        },
        lineWithAlternatives: [
          {
            line: {
              id: 101,
              shortName: '5',
              number: '5',
              agencyId: 10,
              agencyName: 'Dan',
            },
            origin: {
              id: 1001,
              caption: 'Stop A',
              latlon: { latitude: 32085300, longitude: 34781800 },
            },
            dest: {
              id: 1002,
              caption: 'Stop B',
              latlon: { latitude: 32113000, longitude: 34804500 },
            },
          },
          {
            line: {
              id: 102,
              shortName: '18',
              number: '18',
              agencyId: 10,
              agencyName: 'Dan',
            },
            origin: {
              id: 1001,
              caption: 'Stop A',
              latlon: { latitude: 32085300, longitude: 34781800 },
            },
            dest: {
              id: 1002,
              caption: 'Stop B',
              latlon: { latitude: 32113000, longitude: 34804500 },
            },
          },
        ],
        origin: {
          id: 1001,
          caption: 'Stop A',
          latlon: { latitude: 32085300, longitude: 34781800 },
        },
        dest: {
          id: 1002,
          caption: 'Stop B',
          latlon: { latitude: 32113000, longitude: 34804500 },
        },
      };

      const result = (routeService as any).parseLineWithAlternativesLeg(raw);

      expect(result.type).toBe('lineWithAlternatives');
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].line.shortName).toBe('5');
      expect(result.lines[1].line.shortName).toBe('18');
      expect(result.origin.name).toBe('Stop A');
      expect(result.destination.name).toBe('Stop B');
    });

    it('should handle empty alternatives array', () => {
      const raw = {
        lineWithAlternatives: [],
        origin: {
          id: 1001,
          caption: 'Stop A',
          latlon: {},
        },
        dest: {
          id: 1002,
          caption: 'Stop B',
          latlon: {},
        },
      };

      const result = (routeService as any).parseLineWithAlternativesLeg(raw);

      expect(result.lines).toHaveLength(0);
    });
  });

  describe('parseLeg', () => {
    it('should route to correct parser based on leg type', () => {
      const walkLeg = { walkLeg: { time: {} } };
      const transitLeg = { transitLeg: { time: {} } };
      const taxiLeg = { taxiLeg: { time: {} } };
      const bikeLeg = { bikeLeg: { time: {} } };
      const scooterLeg = { scooterLeg: { time: {} } };
      const waitLeg = { waitLeg: { time: {} } };
      const pathwayLeg = { pathwayWalkLeg: { time: {} } };

      expect((routeService as any).parseLeg(walkLeg).type).toBe('walk');
      expect((routeService as any).parseLeg(transitLeg).type).toBe('transit');
      expect((routeService as any).parseLeg(taxiLeg).type).toBe('taxi');
      expect((routeService as any).parseLeg(bikeLeg).type).toBe('bike');
      expect((routeService as any).parseLeg(scooterLeg).type).toBe('scooter');
      expect((routeService as any).parseLeg(waitLeg).type).toBe('wait');
      expect((routeService as any).parseLeg(pathwayLeg).type).toBe('walk');
    });

    it('should return null for unknown leg types', () => {
      const unknownLeg = { unknownLeg: {} };

      const result = (routeService as any).parseLeg(unknownLeg);

      expect(result).toBeNull();
    });
  });

  describe('parseItinerary', () => {
    it('should parse itinerary with multiple legs', () => {
      const raw = {
        guid: 'test-guid-123',
        sectionId: 1,
        sectionName: 'Recommended',
        groupType: 0,
        legs: [
          {
            walkLeg: {
              time: { startTimeUtc: 1640000000000, endTimeUtc: 1640000300000 },
              shape: { distanceInMeters: 200 },
            },
          },
          {
            transitLeg: {
              time: { startTimeUtc: 1640000300000, endTimeUtc: 1640001500000 },
              line: { id: 5, shortName: '5' },
              origin: { id: 1001, caption: 'A', latlon: {} },
              dest: { id: 1002, caption: 'B', latlon: {} },
            },
          },
          {
            walkLeg: {
              time: { startTimeUtc: 1640001500000, endTimeUtc: 1640001800000 },
              shape: { distanceInMeters: 150 },
            },
          },
        ],
      };

      const result = (routeService as any).parseItinerary(raw);

      expect(result).toMatchObject({
        guid: 'test-guid-123',
        sectionId: 1,
        sectionName: 'Recommended',
        groupType: 0,
      });
      expect(result.legs).toHaveLength(3);
      expect(result.legs[0].type).toBe('walk');
      expect(result.legs[1].type).toBe('transit');
      expect(result.legs[2].type).toBe('walk');
    });

    it('should calculate total walking distance', () => {
      const raw = {
        legs: [
          { walkLeg: { time: {}, shape: { distanceInMeters: 200 } } },
          { transitLeg: { time: {}, line: {}, origin: {}, dest: {} } },
          { walkLeg: { time: {}, shape: { distanceInMeters: 150 } } },
        ],
      };

      const result = (routeService as any).parseItinerary(raw);

      expect(result.totalWalkingDistance).toBe(350);
    });

    it('should calculate total duration in minutes', () => {
      const raw = {
        legs: [
          {
            walkLeg: {
              time: { startTimeUtc: 1640000000000, endTimeUtc: 1640000300000 },
            },
          },
          {
            transitLeg: {
              time: { startTimeUtc: 1640000300000, endTimeUtc: 1640001800000 },
              line: {},
              origin: {},
              dest: {},
            },
          },
        ],
      };

      const result = (routeService as any).parseItinerary(raw);

      // Total: 30 minutes (0 to 1800000ms)
      expect(result.totalDuration).toBe(30);
    });

    it('should return null for empty legs', () => {
      const raw = { legs: [] };

      const result = (routeService as any).parseItinerary(raw);

      expect(result).toBeNull();
    });

    it('should filter out null legs', () => {
      const raw = {
        legs: [
          { walkLeg: { time: {} } },
          { unknownLeg: {} }, // Will parse to null
          { walkLeg: { time: {} } },
        ],
      };

      const result = (routeService as any).parseItinerary(raw);

      expect(result.legs).toHaveLength(2);
    });
  });

  describe('parseResults', () => {
    it('should extract sections and itineraries', () => {
      const rawResults = [
        {
          result: {
            tripPlanSections: {
              tripPlanSections: [
                {
                  name: 'Recommended',
                  sectionId: 1,
                  maxItemsToDisplay: 5,
                  sectionType: 0,
                },
              ],
            },
            itinerary: {
              guid: 'itin-1',
              legs: [{ walkLeg: { time: {} } }],
            },
          },
        },
      ];

      const result = (routeService as any).parseResults(rawResults);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0]).toMatchObject({
        name: 'Recommended',
        sectionId: 1,
      });
      expect(result.itineraries).toHaveLength(1);
      expect(result.itineraries[0].guid).toBe('itin-1');
      expect(result.completed).toBe(true);
    });

    it('should handle multiple results', () => {
      const rawResults = [
        {
          result: {
            itinerary: {
              guid: 'itin-1',
              legs: [{ walkLeg: { time: {} } }],
            },
          },
        },
        {
          result: {
            itinerary: {
              guid: 'itin-2',
              legs: [{ walkLeg: { time: {} } }],
            },
          },
        },
      ];

      const result = (routeService as any).parseResults(rawResults);

      expect(result.itineraries).toHaveLength(2);
    });

    it('should skip null itineraries', () => {
      const rawResults = [
        {
          result: {
            itinerary: { legs: [] }, // Will parse to null
          },
        },
      ];

      const result = (routeService as any).parseResults(rawResults);

      expect(result.itineraries).toHaveLength(0);
    });
  });
});
