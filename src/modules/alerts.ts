import type { Page } from 'puppeteer';
import { ResolvedConfig, Alert, AlertDetails, AlertSeverity, AlertEffect, AlertCause } from '../types';
import { ApiError } from '../errors';
import { buildHeaders } from '../utils/headers';

const API_BASE = 'https://moovitapp.com/api';

/**
 * Alerts service for service disruptions and announcements
 */
export class AlertsService {
  constructor(
    private config: ResolvedConfig,
    private page: Page
  ) {}

  /**
   * Get all active alerts for the current metro
   */
  async getAlerts(): Promise<Alert[]> {
    const url = `${API_BASE}/alert`;
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
      throw new ApiError((response as { status: number }).status, '/alert');
    }

    return this.parseAlertsResponse((response as { data: unknown }).data);
  }

  /**
   * Get metro-level alerts
   */
  async getMetroAlerts(): Promise<Alert[]> {
    const url = `${API_BASE}/alert/metro`;
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
      throw new ApiError((response as { status: number }).status, '/alert/metro');
    }

    return this.parseAlertsResponse((response as { data: unknown }).data);
  }

  /**
   * Get detailed information for a specific alert
   */
  async getAlertDetails(alertId: number, language?: string): Promise<AlertDetails | null> {
    const lang = language || this.config.language.toLowerCase();
    const url = `${API_BASE}/alert/getAlertDetails/${alertId}/${lang}`;
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
      const status = (response as { status: number }).status;
      if (status === 404) {
        return null;
      }
      throw new ApiError(status, `/alert/getAlertDetails/${alertId}`);
    }

    return this.parseAlertDetails((response as { data: unknown }).data);
  }

  private parseAlertsResponse(data: unknown): Alert[] {
    const wrapped = data as { data?: unknown[] };
    const alerts = wrapped.data || (Array.isArray(data) ? data : []);
    return alerts.map((item) => this.parseAlert(item));
  }

  private parseAlert(item: unknown): Alert {
    const r = item as {
      id?: number;
      title?: string;
      description?: string;
      url?: string;
      severity?: number;
      effect?: number;
      cause?: number;
      startTime?: number;
      endTime?: number;
      affectedEntities?: Array<{ type?: string; id?: number; name?: string }>;
    };

    return {
      id: r.id || 0,
      title: r.title || '',
      description: r.description,
      url: r.url,
      severity: (r.severity || AlertSeverity.INFO) as AlertSeverity,
      effect: (r.effect || AlertEffect.UNKNOWN) as AlertEffect,
      cause: r.cause as AlertCause | undefined,
      startTime: r.startTime ? new Date(r.startTime) : undefined,
      endTime: r.endTime ? new Date(r.endTime) : undefined,
      affectedEntities: r.affectedEntities?.map((e) => ({
        type: (e.type || 'route') as 'route' | 'stop' | 'agency',
        id: e.id || 0,
        name: e.name,
      })),
    };
  }

  private parseAlertDetails(data: unknown): AlertDetails {
    const base = this.parseAlert(data);
    const r = data as {
      fullDescription?: string;
      activePeriods?: Array<{ start?: number; end?: number }>;
    };

    return {
      ...base,
      fullDescription: r.fullDescription,
      activePeriods: r.activePeriods?.map((p) => ({
        start: new Date(p.start || 0),
        end: new Date(p.end || 0),
      })),
    };
  }
}
