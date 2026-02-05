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
    return {
      /**
       * Search for routes between two locations
       */
      search: async (params: {
        from: LocationInput;
        to: LocationInput;
        departureTime?: Date;
        arrivalTime?: Date;
        routeTypes?: number[];
        preference?: number;
      }): Promise<RouteSearchResult> => {
        this.ensureInitialized();
        const from = await this.locationResolver.resolve(params.from);
        const to = await this.locationResolver.resolve(params.to);
        return this.routeService.search({ ...params, from, to });
      },
    };
  }

  /**
   * Lines and arrivals API
   */
  get lines() {
    return {
      /**
       * Get real-time arrivals for multiple line/stop pairs
       */
      getArrivals: async (pairs: LineStopPair[]): Promise<StopArrivals[]> => {
        this.ensureInitialized();
        return this.linesService.getArrivals(pairs);
      },

      /**
       * Get real-time arrival for a single line at a stop
       */
      getLineArrival: async (lineId: number, stopId: number): Promise<StopArrivals | null> => {
        this.ensureInitialized();
        return this.linesService.getLineArrival(lineId, stopId);
      },

      /**
       * Get all transit agencies
       */
      getAgencies: async (): Promise<AgencyInfo[]> => {
        this.ensureInitialized();
        return this.linesService.getAgencies();
      },
    };
  }

  /**
   * Locations API
   */
  get locations() {
    return {
      /**
       * Resolve a location input to a Location object
       */
      resolve: async (input: LocationInput): Promise<Location> => {
        this.ensureInitialized();
        return this.locationResolver.resolve(input);
      },

      /**
       * Search for locations by text query
       */
      search: async (
        query: string,
        nearLat?: number,
        nearLon?: number
      ): Promise<LocationSearchResult[]> => {
        this.ensureInitialized();
        return this.locationResolver.searchLocations(query, nearLat, nearLon);
      },
    };
  }

  /**
   * Alerts API
   */
  get alerts() {
    return {
      /**
       * Get all active alerts
       */
      getAlerts: async (): Promise<Alert[]> => {
        this.ensureInitialized();
        return this.alertsService.getAlerts();
      },

      /**
       * Get metro-level alerts
       */
      getMetroAlerts: async (): Promise<Alert[]> => {
        this.ensureInitialized();
        return this.alertsService.getMetroAlerts();
      },

      /**
       * Get detailed information for a specific alert
       */
      getAlertDetails: async (alertId: number, language?: string): Promise<AlertDetails | null> => {
        this.ensureInitialized();
        return this.alertsService.getAlertDetails(alertId, language);
      },
    };
  }

  /**
   * Images API
   */
  get images() {
    return {
      /**
       * Get images by their IDs
       */
      getImages: async (ids: number[]): Promise<TransitImage[]> => {
        this.ensureInitialized();
        return this.imagesService.getImages(ids);
      },

      /**
       * Get a single image by ID
       */
      getImage: async (id: number): Promise<TransitImage | null> => {
        this.ensureInitialized();
        return this.imagesService.getImage(id);
      },

      /**
       * Clear the image cache
       */
      clearCache: (): void => {
        this.imagesService.clearCache();
      },
    };
  }
}
