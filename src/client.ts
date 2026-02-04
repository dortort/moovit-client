import {
  MoovitClientConfig,
  ResolvedConfig,
  LocationInput,
  RouteSearchResult,
  LineStopPair,
  StopArrivals,
  Alert,
  AlertDetails,
  AgencyInfo,
  LocationSearchResult,
  Location,
} from './types';
import { AuthManager, resolveConfig } from './modules/auth';
import { LocationResolver } from './modules/location';
import { RouteService } from './modules/route';
import { LinesService } from './modules/lines';
import { AlertsService } from './modules/alerts';
import { ImagesService, TransitImage } from './modules/images';

/**
 * Main Moovit client class
 */
export class MoovitClient {
  private config: ResolvedConfig;
  private authManager: AuthManager;
  private locationResolver!: LocationResolver;
  private routeService!: RouteService;
  private linesService!: LinesService;
  private alertsService!: AlertsService;
  private imagesService!: ImagesService;
  private isInitialized = false;

  constructor(config: MoovitClientConfig = {}) {
    this.config = resolveConfig(config);
    this.authManager = new AuthManager(this.config);
  }

  /**
   * Initialize the client (acquires WAF token)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.authManager.initialize();
    const page = this.authManager.getPage();

    this.locationResolver = new LocationResolver(this.config, page);
    this.routeService = new RouteService(this.config, page);
    this.linesService = new LinesService(this.config, page);
    this.alertsService = new AlertsService(this.config, page);
    this.imagesService = new ImagesService(this.config, page);

    this.isInitialized = true;
  }

  /**
   * Close the client and release resources
   */
  async close(): Promise<void> {
    await this.authManager.close();
    this.isInitialized = false;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
  }

  /**
   * Routes API
   */
  get routes() {
    const self = this;
    return {
      /**
       * Search for routes between two locations
       */
      async search(params: {
        from: LocationInput;
        to: LocationInput;
        departureTime?: Date;
        arrivalTime?: Date;
        routeTypes?: number[];
        preference?: number;
      }): Promise<RouteSearchResult> {
        self.ensureInitialized();
        const from = await self.locationResolver.resolve(params.from);
        const to = await self.locationResolver.resolve(params.to);
        return self.routeService.search({ ...params, from, to });
      },
    };
  }

  /**
   * Lines and arrivals API
   */
  get lines() {
    const self = this;
    return {
      /**
       * Get real-time arrivals for multiple line/stop pairs
       */
      async getArrivals(pairs: LineStopPair[]): Promise<StopArrivals[]> {
        self.ensureInitialized();
        return self.linesService.getArrivals(pairs);
      },

      /**
       * Get real-time arrival for a single line at a stop
       */
      async getLineArrival(lineId: number, stopId: number): Promise<StopArrivals | null> {
        self.ensureInitialized();
        return self.linesService.getLineArrival(lineId, stopId);
      },

      /**
       * Get all transit agencies
       */
      async getAgencies(): Promise<AgencyInfo[]> {
        self.ensureInitialized();
        return self.linesService.getAgencies();
      },
    };
  }

  /**
   * Locations API
   */
  get locations() {
    const self = this;
    return {
      /**
       * Resolve a location input to a Location object
       */
      async resolve(input: LocationInput): Promise<Location> {
        self.ensureInitialized();
        return self.locationResolver.resolve(input);
      },

      /**
       * Search for locations by text query
       */
      async search(
        query: string,
        nearLat?: number,
        nearLon?: number
      ): Promise<LocationSearchResult[]> {
        self.ensureInitialized();
        return self.locationResolver.searchLocations(query, nearLat, nearLon);
      },
    };
  }

  /**
   * Alerts API
   */
  get alerts() {
    const self = this;
    return {
      /**
       * Get all active alerts
       */
      async getAlerts(): Promise<Alert[]> {
        self.ensureInitialized();
        return self.alertsService.getAlerts();
      },

      /**
       * Get metro-level alerts
       */
      async getMetroAlerts(): Promise<Alert[]> {
        self.ensureInitialized();
        return self.alertsService.getMetroAlerts();
      },

      /**
       * Get detailed information for a specific alert
       */
      async getAlertDetails(alertId: number, language?: string): Promise<AlertDetails | null> {
        self.ensureInitialized();
        return self.alertsService.getAlertDetails(alertId, language);
      },
    };
  }

  /**
   * Images API
   */
  get images() {
    const self = this;
    return {
      /**
       * Get images by their IDs
       */
      async getImages(ids: number[]): Promise<TransitImage[]> {
        self.ensureInitialized();
        return self.imagesService.getImages(ids);
      },

      /**
       * Get a single image by ID
       */
      async getImage(id: number): Promise<TransitImage | null> {
        self.ensureInitialized();
        return self.imagesService.getImage(id);
      },

      /**
       * Clear the image cache
       */
      clearCache(): void {
        self.imagesService.clearCache();
      },
    };
  }
}
