import type { Page } from 'puppeteer';
import {
  ResolvedConfig,
  RouteSearchParams,
  RouteSearchResult,
  TripPlanPreference,
  TripPlanSection,
  Itinerary,
  Leg,
  WalkLeg,
  TransitLeg,
  TaxiLeg,
  WaitLeg,
  WaitForTaxiLeg,
  BikeLeg,
  ScooterLeg,
  LineWithAlternativesLeg,
} from '../types';
import { RouteSearchError } from '../errors';
import { buildHeaders } from '../utils/headers';
import { toScaled, fromScaled } from '../utils/coordinates';
import { sleep } from '../utils/polling';

const API_BASE = 'https://moovitapp.com/api';

/**
 * Route planning service
 */
export class RouteService {
  constructor(
    private config: ResolvedConfig,
    private page: Page
  ) {}

  /**
   * Search for routes between two locations
   */
  async search(params: RouteSearchParams): Promise<RouteSearchResult> {
    // Get the search token
    const token = await this.initiateSearch(params);

    // Poll for results
    const results = await this.pollResults(token);

    return results;
  }

  /**
   * Initiate a route search and get the token
   */
  private async initiateSearch(params: RouteSearchParams): Promise<string> {
    const time = params.departureTime || params.arrivalTime || new Date();
    const timeType = params.arrivalTime ? 1 : 2; // 1 = arrive by, 2 = depart at

    const routeTypes = params.routeTypes?.join(',') || '3,5,4,7,6,2,1,0';

    const queryParams = new URLSearchParams({
      tripPlanPref: String(params.preference || TripPlanPreference.BALANCED),
      time: String(time.getTime()),
      timeType: String(timeType),
      isCurrentTime: String(!params.departureTime && !params.arrivalTime),
      routeTypes,
      routeTransportOptions: '1,5',
      fromLocation_id: String(params.from.id),
      fromLocation_type: String(params.from.type),
      fromLocation_latitude: String(toScaled(params.from.coordinates.lat)),
      fromLocation_longitude: String(toScaled(params.from.coordinates.lon)),
      fromLocation_caption: params.from.caption,
      toLocation_id: String(params.to.id),
      toLocation_type: String(params.to.type),
      toLocation_latitude: String(toScaled(params.to.coordinates.lat)),
      toLocation_longitude: String(toScaled(params.to.coordinates.lon)),
      toLocation_caption: params.to.caption,
    });

    const url = `${API_BASE}/route/search?${queryParams.toString()}`;
    const headers = buildHeaders(this.config);

    const response = await this.page.evaluate(
      async (fetchUrl: string, fetchHeaders: Record<string, string>) => {
        const res = await fetch(fetchUrl, {
          headers: fetchHeaders,
          credentials: 'include',
        });

        if (!res.ok) {
          return { error: true, status: res.status };
        }

        return { error: false, data: await res.json() };
      },
      url,
      headers
    );

    if (response.error) {
      throw new RouteSearchError(`Route search failed with status ${(response as { status: number }).status}`);
    }

    const data = (response as { data: { token?: string } }).data;
    if (!data?.token) {
      throw new RouteSearchError('No token received from route search');
    }

    return data.token;
  }

  /**
   * Poll for route results
   */
  private async pollResults(token: string): Promise<RouteSearchResult> {
    let offset = 0;
    let allResults: unknown[] = [];
    let completed = false;

    const headers = buildHeaders(this.config);

    while (!completed) {
      const url = `${API_BASE}/route/result?token=${encodeURIComponent(token)}&offset=${offset}`;

      const response = await this.page.evaluate(
        async (fetchUrl: string, fetchHeaders: Record<string, string>) => {
          const res = await fetch(fetchUrl, {
            headers: fetchHeaders,
            credentials: 'include',
          });

          if (!res.ok) {
            return { error: true, status: res.status };
          }

          return { error: false, data: await res.json() };
        },
        url,
        headers
      );

      if (response.error) {
        throw new RouteSearchError(`Route result fetch failed with status ${(response as { status: number }).status}`);
      }

      const data = (response as { data: { results?: unknown[]; completed?: number } }).data;

      if (data.results) {
        allResults = allResults.concat(data.results);
      }

      completed = data.completed === 1;

      if (!completed) {
        offset += data.results?.length || 0;
        await sleep(500);
      }
    }

    // Parse the results
    return this.parseResults(allResults);
  }

  /**
   * Parse raw API results into structured format
   */
  private parseResults(rawResults: unknown[]): RouteSearchResult {
    const sections: TripPlanSection[] = [];
    const itineraries: Itinerary[] = [];

    for (const result of rawResults) {
      const r = result as { result?: { tripPlanSections?: { tripPlanSections?: unknown[] }; itinerary?: unknown } };

      // Extract sections
      if (r.result?.tripPlanSections?.tripPlanSections) {
        for (const section of r.result.tripPlanSections.tripPlanSections as unknown[]) {
          const s = section as { name?: string; sectionId?: number; maxItemsToDisplay?: number; sectionType?: number };
          sections.push({
            name: s.name || '',
            sectionId: s.sectionId || 0,
            maxItemsToDisplay: s.maxItemsToDisplay || 0,
            sectionType: s.sectionType || 0,
          });
        }
      }

      // Extract itineraries
      if (r.result?.itinerary) {
        const itin = this.parseItinerary(r.result.itinerary);
        if (itin) {
          itineraries.push(itin);
        }
      }
    }

    return {
      sections,
      itineraries,
      completed: true,
    };
  }

  /**
   * Parse a single itinerary
   */
  private parseItinerary(raw: unknown): Itinerary | null {
    const r = raw as {
      guid?: string;
      sectionId?: number;
      sectionName?: string;
      groupType?: number;
      legs?: unknown[];
    };

    if (!r.legs || r.legs.length === 0) {
      return null;
    }

    const legs = r.legs.map((leg) => this.parseLeg(leg)).filter((l): l is Leg => l !== null);

    if (legs.length === 0) {
      return null;
    }

    // Calculate total duration and walking distance
    let totalDuration = 0;
    let totalWalkingDistance = 0;
    let departureTime: Date | undefined;
    let arrivalTime: Date | undefined;

    for (const leg of legs) {
      if (leg.time) {
        if (!departureTime || leg.time.startTimeUtc < departureTime.getTime()) {
          departureTime = new Date(leg.time.startTimeUtc);
        }
        if (!arrivalTime || leg.time.endTimeUtc > arrivalTime.getTime()) {
          arrivalTime = new Date(leg.time.endTimeUtc);
        }
      }

      if (leg.type === 'walk') {
        totalWalkingDistance += leg.distanceInMeters;
      }
    }

    if (departureTime && arrivalTime) {
      totalDuration = Math.round((arrivalTime.getTime() - departureTime.getTime()) / 60000);
    }

    return {
      guid: r.guid || '',
      sectionId: r.sectionId || 0,
      sectionName: r.sectionName,
      groupType: r.groupType || 0,
      legs,
      totalDuration,
      totalWalkingDistance,
      departureTime: departureTime || new Date(),
      arrivalTime: arrivalTime || new Date(),
    };
  }

  /**
   * Parse a single leg
   */
  private parseLeg(raw: unknown): Leg | null {
    const r = raw as Record<string, unknown>;

    if (r.walkLeg) {
      return this.parseWalkLeg(r.walkLeg);
    }
    if (r.transitLeg) {
      return this.parseTransitLeg(r.transitLeg);
    }
    if (r.taxiLeg) {
      return this.parseTaxiLeg(r.taxiLeg);
    }
    if (r.waitLeg) {
      return this.parseWaitLeg(r.waitLeg);
    }
    if (r.waitToTaxiLeg) {
      return this.parseWaitForTaxiLeg(r.waitToTaxiLeg);
    }
    if (r.bikeLeg) {
      return this.parseBikeLeg(r.bikeLeg);
    }
    if (r.scooterLeg) {
      return this.parseScooterLeg(r.scooterLeg);
    }
    if (r.lineWithAlternativesLeg) {
      return this.parseLineWithAlternativesLeg(r.lineWithAlternativesLeg);
    }
    if (r.pathwayWalkLeg) {
      return this.parseWalkLeg(r.pathwayWalkLeg);
    }

    return null;
  }

  private parseWalkLeg(raw: unknown): WalkLeg {
    const r = raw as { time?: { startTimeUtc?: number; endTimeUtc?: number }; shape?: { distanceInMeters?: number; polyline?: string } };
    return {
      type: 'walk',
      time: {
        startTimeUtc: r.time?.startTimeUtc || 0,
        endTimeUtc: r.time?.endTimeUtc || 0,
      },
      distanceInMeters: r.shape?.distanceInMeters || 0,
      polyline: r.shape?.polyline,
    };
  }

  private parseTransitLeg(raw: unknown): TransitLeg {
    const r = raw as {
      time?: { startTimeUtc?: number; endTimeUtc?: number; isRealTime?: number };
      line?: { id?: number; shortName?: string; number?: string; agencyId?: number; agencyName?: string; color?: string; type?: number };
      origin?: { id?: number; caption?: string; latlon?: { latitude?: number; longitude?: number } };
      dest?: { id?: number; caption?: string; latlon?: { latitude?: number; longitude?: number } };
      numOfStopsInLeg?: number;
      shape?: { polyline?: string };
    };

    return {
      type: 'transit',
      time: {
        startTimeUtc: r.time?.startTimeUtc || 0,
        endTimeUtc: r.time?.endTimeUtc || 0,
        isRealTime: r.time?.isRealTime,
      },
      line: {
        id: r.line?.id || 0,
        shortName: r.line?.shortName,
        number: r.line?.number,
        agencyId: r.line?.agencyId,
        agencyName: r.line?.agencyName,
        color: r.line?.color,
        type: r.line?.type,
      },
      origin: {
        id: r.origin?.id || 0,
        name: r.origin?.caption || '',
        coordinates: {
          lat: fromScaled(r.origin?.latlon?.latitude || 0),
          lon: fromScaled(r.origin?.latlon?.longitude || 0),
        },
      },
      destination: {
        id: r.dest?.id || 0,
        name: r.dest?.caption || '',
        coordinates: {
          lat: fromScaled(r.dest?.latlon?.latitude || 0),
          lon: fromScaled(r.dest?.latlon?.longitude || 0),
        },
      },
      numStops: r.numOfStopsInLeg || 0,
      polyline: r.shape?.polyline,
    };
  }

  private parseTaxiLeg(raw: unknown): TaxiLeg {
    const r = raw as {
      time?: { startTimeUtc?: number; endTimeUtc?: number };
      taxiProviderName?: string;
      shape?: { distanceInMeters?: number; polyline?: string };
      journey?: {
        origin?: { caption?: string; latlon?: { latitude?: number; longitude?: number } };
        dest?: { caption?: string; latlon?: { latitude?: number; longitude?: number } };
      };
      deepLinks?: { androidDeepLink?: string; iosDeepLink?: string; webDeepLink?: string };
    };

    return {
      type: 'taxi',
      time: {
        startTimeUtc: r.time?.startTimeUtc || 0,
        endTimeUtc: r.time?.endTimeUtc || 0,
      },
      providerName: r.taxiProviderName || 'Taxi',
      distanceInMeters: r.shape?.distanceInMeters || 0,
      origin: {
        caption: r.journey?.origin?.caption || '',
        coordinates: {
          lat: fromScaled(r.journey?.origin?.latlon?.latitude || 0),
          lon: fromScaled(r.journey?.origin?.latlon?.longitude || 0),
        },
      },
      destination: {
        caption: r.journey?.dest?.caption || '',
        coordinates: {
          lat: fromScaled(r.journey?.dest?.latlon?.latitude || 0),
          lon: fromScaled(r.journey?.dest?.latlon?.longitude || 0),
        },
      },
      polyline: r.shape?.polyline,
      deepLinks: r.deepLinks ? {
        android: r.deepLinks.androidDeepLink,
        ios: r.deepLinks.iosDeepLink,
        web: r.deepLinks.webDeepLink,
      } : undefined,
    };
  }

  private parseWaitLeg(raw: unknown): WaitLeg {
    const r = raw as {
      time?: { startTimeUtc?: number; endTimeUtc?: number };
      waitAtLocation?: { caption?: string; latlon?: { latitude?: number; longitude?: number } };
    };

    const duration = r.time ? Math.round((r.time.endTimeUtc! - r.time.startTimeUtc!) / 60000) : 0;

    return {
      type: 'wait',
      time: {
        startTimeUtc: r.time?.startTimeUtc || 0,
        endTimeUtc: r.time?.endTimeUtc || 0,
      },
      waitDurationMinutes: duration,
      location: r.waitAtLocation ? {
        caption: r.waitAtLocation.caption || '',
        coordinates: {
          lat: fromScaled(r.waitAtLocation.latlon?.latitude || 0),
          lon: fromScaled(r.waitAtLocation.latlon?.longitude || 0),
        },
      } : undefined,
    };
  }

  private parseWaitForTaxiLeg(raw: unknown): WaitForTaxiLeg {
    const r = raw as {
      time?: { startTimeUtc?: number; endTimeUtc?: number };
      waitAtLocation?: { caption?: string; latlon?: { latitude?: number; longitude?: number } };
      approxWaitingSecFromOrdering?: number;
      taxiId?: number;
    };

    return {
      type: 'waitForTaxi',
      time: {
        startTimeUtc: r.time?.startTimeUtc || 0,
        endTimeUtc: r.time?.endTimeUtc || 0,
      },
      location: {
        caption: r.waitAtLocation?.caption || '',
        coordinates: {
          lat: fromScaled(r.waitAtLocation?.latlon?.latitude || 0),
          lon: fromScaled(r.waitAtLocation?.latlon?.longitude || 0),
        },
      },
      approxWaitingSeconds: r.approxWaitingSecFromOrdering || 0,
      taxiId: r.taxiId || 0,
    };
  }

  private parseBikeLeg(raw: unknown): BikeLeg {
    const r = raw as {
      time?: { startTimeUtc?: number; endTimeUtc?: number };
      shape?: { distanceInMeters?: number; polyline?: string };
    };

    return {
      type: 'bike',
      time: {
        startTimeUtc: r.time?.startTimeUtc || 0,
        endTimeUtc: r.time?.endTimeUtc || 0,
      },
      distanceInMeters: r.shape?.distanceInMeters || 0,
      polyline: r.shape?.polyline,
    };
  }

  private parseScooterLeg(raw: unknown): ScooterLeg {
    const r = raw as {
      time?: { startTimeUtc?: number; endTimeUtc?: number };
      providerName?: string;
      shape?: { distanceInMeters?: number; polyline?: string };
    };

    return {
      type: 'scooter',
      time: {
        startTimeUtc: r.time?.startTimeUtc || 0,
        endTimeUtc: r.time?.endTimeUtc || 0,
      },
      providerName: r.providerName || 'Scooter',
      distanceInMeters: r.shape?.distanceInMeters || 0,
      polyline: r.shape?.polyline,
    };
  }

  private parseLineWithAlternativesLeg(raw: unknown): LineWithAlternativesLeg {
    const r = raw as {
      time?: { startTimeUtc?: number; endTimeUtc?: number };
      lineWithAlternatives?: Array<{
        line?: { id?: number; shortName?: string; number?: string; agencyId?: number; agencyName?: string };
        origin?: { id?: number; caption?: string; latlon?: { latitude?: number; longitude?: number } };
        dest?: { id?: number; caption?: string; latlon?: { latitude?: number; longitude?: number } };
      }>;
      origin?: { id?: number; caption?: string; latlon?: { latitude?: number; longitude?: number } };
      dest?: { id?: number; caption?: string; latlon?: { latitude?: number; longitude?: number } };
    };

    const lines = (r.lineWithAlternatives || []).map((alt) => ({
      line: {
        id: alt.line?.id || 0,
        shortName: alt.line?.shortName,
        number: alt.line?.number,
        agencyId: alt.line?.agencyId,
        agencyName: alt.line?.agencyName,
      },
      origin: {
        id: alt.origin?.id || 0,
        name: alt.origin?.caption || '',
        coordinates: {
          lat: fromScaled(alt.origin?.latlon?.latitude || 0),
          lon: fromScaled(alt.origin?.latlon?.longitude || 0),
        },
      },
      destination: {
        id: alt.dest?.id || 0,
        name: alt.dest?.caption || '',
        coordinates: {
          lat: fromScaled(alt.dest?.latlon?.latitude || 0),
          lon: fromScaled(alt.dest?.latlon?.longitude || 0),
        },
      },
    }));

    return {
      type: 'lineWithAlternatives',
      time: {
        startTimeUtc: r.time?.startTimeUtc || 0,
        endTimeUtc: r.time?.endTimeUtc || 0,
      },
      lines,
      origin: {
        id: r.origin?.id || 0,
        name: r.origin?.caption || '',
        coordinates: {
          lat: fromScaled(r.origin?.latlon?.latitude || 0),
          lon: fromScaled(r.origin?.latlon?.longitude || 0),
        },
      },
      destination: {
        id: r.dest?.id || 0,
        name: r.dest?.caption || '',
        coordinates: {
          lat: fromScaled(r.dest?.latlon?.latitude || 0),
          lon: fromScaled(r.dest?.latlon?.longitude || 0),
        },
      },
    };
  }
}
