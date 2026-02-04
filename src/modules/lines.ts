import type { Page } from 'puppeteer';
import {
  ResolvedConfig,
  LineStopPair,
  StopArrivals,
  Arrival,
  ArrivalCertainty,
  TrafficStatus,
  VehicleStatus,
  AgencyInfo,
  AgencyOrderItem,
} from '../types';
import { ApiError } from '../errors';
import { buildHeaders } from '../utils/headers';
import { fromScaled } from '../utils/coordinates';

const API_BASE = 'https://moovitapp.com/api';

/**
 * Lines and arrivals service
 */
export class LinesService {
  constructor(
    private config: ResolvedConfig,
    private page: Page
  ) {}

  /**
   * Get real-time arrivals for multiple line/stop pairs
   */
  async getArrivals(lineStopPairs: LineStopPair[]): Promise<StopArrivals[]> {
    const url = `${API_BASE}/lines/linesarrival`;
    const headers = {
      ...buildHeaders(this.config),
      'content-type': 'application/json',
    };

    const body = {
      params: {
        lineStopPairs,
      },
    };

    const response = await this.page.evaluate(
      async (fetchUrl: string, fetchHeaders: Record<string, string>, fetchBody: unknown) => {
        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify(fetchBody),
          credentials: 'include',
        });

        if (!res.ok) {
          return { error: true, status: res.status };
        }

        return { error: false, data: await res.json() };
      },
      url,
      headers,
      body
    );

    if (response.error) {
      throw new ApiError((response as { status: number }).status, '/lines/linesarrival');
    }

    return this.parseArrivalsResponse((response as { data: unknown }).data);
  }

  /**
   * Get real-time arrivals for a single line at a stop
   */
  async getLineArrival(lineId: number, stopId: number): Promise<StopArrivals | null> {
    const url = `${API_BASE}/lines/linearrival`;
    const headers = {
      ...buildHeaders(this.config),
      'content-type': 'application/json',
    };

    const body = {
      stopId,
      lineIds: JSON.stringify({ ids: [lineId] }),
    };

    const response = await this.page.evaluate(
      async (fetchUrl: string, fetchHeaders: Record<string, string>, fetchBody: unknown) => {
        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify(fetchBody),
          credentials: 'include',
        });

        if (!res.ok) {
          return { error: true, status: res.status };
        }

        return { error: false, data: await res.json() };
      },
      url,
      headers,
      body
    );

    if (response.error) {
      throw new ApiError((response as { status: number }).status, '/lines/linearrival');
    }

    const results = this.parseSingleArrivalResponse((response as { data: unknown }).data);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all agencies for the current metro
   */
  async getAgencies(): Promise<AgencyInfo[]> {
    const url = `${API_BASE}/lines/agency`;
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
      throw new ApiError((response as { status: number }).status, '/lines/agency');
    }

    return this.parseAgenciesResponse((response as { data: unknown }).data);
  }

  /**
   * Get agency display order
   */
  async getAgencyOrder(): Promise<AgencyOrderItem[]> {
    const url = `${API_BASE}/lines/agency_order`;
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
      throw new ApiError((response as { status: number }).status, '/lines/agency_order');
    }

    return this.parseAgencyOrderResponse((response as { data: unknown }).data);
  }

  /**
   * Parse arrivals response from linesarrival endpoint
   */
  private parseArrivalsResponse(data: unknown): StopArrivals[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => {
      const r = item as {
        stopId?: number;
        lineArrivals?: {
          lineId?: number;
          arrivals?: unknown[];
        };
        nextPollingIntervalSecs?: number;
      };

      return {
        stopId: r.stopId || 0,
        lineId: r.lineArrivals?.lineId || 0,
        arrivals: this.parseArrivals(r.lineArrivals?.arrivals || []),
        nextPollingIntervalSecs: r.nextPollingIntervalSecs || 30,
      };
    });
  }

  /**
   * Parse arrivals response from linearrival endpoint
   */
  private parseSingleArrivalResponse(data: unknown): StopArrivals[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => {
      const r = item as {
        stopId?: number;
        lineId?: number;
        arrivals?: unknown[];
        nextPollingIntervalSecs?: number;
      };

      return {
        stopId: r.stopId || 0,
        lineId: r.lineId || 0,
        arrivals: this.parseArrivals(r.arrivals || []),
        nextPollingIntervalSecs: r.nextPollingIntervalSecs || 30,
      };
    });
  }

  /**
   * Parse individual arrivals
   */
  private parseArrivals(data: unknown[]): Arrival[] {
    return data.map((item) => {
      const r = item as {
        tripId?: number;
        patternId?: number;
        staticEtdUTC?: number;
        rtEtdUTC?: number;
        durationInSeconds?: number;
        isLastArrival?: number;
        arrivalCertainty?: number;
        trafficStatus?: number;
        stopIndex?: number;
        patternStopsSize?: number;
        vehicleLocation?: {
          latlon?: { latitude?: number; longitude?: number };
          vehicleId?: string;
          vehicleSampleTimeUtc?: number;
          vehicleStatus?: number;
          progress?: { nextStopIndex?: number; progress?: number };
        };
      };

      return {
        tripId: r.tripId || 0,
        patternId: r.patternId,
        scheduledTime: new Date(r.staticEtdUTC || 0),
        realTimeEta: new Date(r.rtEtdUTC || r.staticEtdUTC || 0),
        durationSeconds: r.durationInSeconds || 0,
        isLast: r.isLastArrival === 1,
        certainty: (r.arrivalCertainty || 1) as ArrivalCertainty,
        trafficStatus: r.trafficStatus as TrafficStatus | undefined,
        stopIndex: r.stopIndex,
        totalStops: r.patternStopsSize,
        vehicleLocation: r.vehicleLocation ? {
          coordinates: {
            lat: fromScaled(r.vehicleLocation.latlon?.latitude || 0),
            lon: fromScaled(r.vehicleLocation.latlon?.longitude || 0),
          },
          vehicleId: r.vehicleLocation.vehicleId || '',
          sampleTime: new Date(r.vehicleLocation.vehicleSampleTimeUtc || 0),
          status: (r.vehicleLocation.vehicleStatus || 1) as VehicleStatus,
          progress: r.vehicleLocation.progress ? {
            nextStopIndex: r.vehicleLocation.progress.nextStopIndex || 0,
            progressPercent: r.vehicleLocation.progress.progress || 0,
          } : undefined,
        } : undefined,
      };
    });
  }

  /**
   * Parse agencies response
   */
  private parseAgenciesResponse(data: unknown): AgencyInfo[] {
    if (!Array.isArray(data)) {
      // Handle wrapped response
      const wrapped = data as { agencies?: unknown[] };
      if (wrapped.agencies) {
        data = wrapped.agencies;
      } else {
        return [];
      }
    }

    return (data as unknown[]).map((item) => {
      const r = item as {
        id?: number;
        name?: string;
        url?: string;
        phone?: string;
        timezone?: string;
        logoImageId?: number;
      };

      return {
        id: r.id || 0,
        name: r.name || '',
        url: r.url,
        phone: r.phone,
        timezone: r.timezone,
        logoImageId: r.logoImageId,
      };
    });
  }

  /**
   * Parse agency order response
   */
  private parseAgencyOrderResponse(data: unknown): AgencyOrderItem[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item, index) => {
      const r = item as { agencyId?: number; order?: number };
      return {
        agencyId: r.agencyId || 0,
        order: r.order ?? index,
      };
    });
  }
}
