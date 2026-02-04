# Moovit JS Client Library - Implementation Plan (v1.1)

## Context

### Original Request
Develop a complete JavaScript/TypeScript client library for Moovit with the ability to:
1. Query line information
2. Request routing options from one point to another
3. Support multiple location input formats: full text, stop names, IDs, or geo coordinates

### Research Findings

**Existing Codebase:**
- Working Puppeteer-based API test (`moovit-api-test.js`) demonstrating WAF token acquisition and endpoint usage
- Comprehensive API documentation (1300+ lines) covering all endpoints
- Shell scripts validating 15 endpoints with example payloads

**API Characteristics:**
- Base URL: `https://moovitapp.com/api`
- Version: `5.151.2/V567`
- AWS WAF protection requiring browser automation for token acquisition
- Mixed protocol: JSON for most endpoints, Protobuf for search/location/stops
- Coordinates use 1,000,000x multiplier (32.228394 becomes 32228394)
- Route planning is asynchronous (search returns token, poll for results)

**Verified Working Endpoints:**
| Endpoint | Method | Format | Purpose |
|----------|--------|--------|---------|
| `/api/alert` | GET | JSON | Service alerts |
| `/api/image` | GET | JSON | Transit images |
| `/api/route/search` | GET | JSON | Initiate route planning |
| `/api/route/result` | GET | JSON | Get route results |
| `/api/lines/linesarrival` | POST | JSON | Real-time arrivals (multiple) |
| `/api/lines/linearrival` | POST | JSON | Real-time arrivals (single line) |
| `/api/lines/agency_order` | GET | JSON | Agency ordering |
| `/api/lines/agency` | GET | JSON | Agency details |
| `/api/nearby/stops` | GET | Protobuf | Nearby transit stops |
| `/api/location` | POST | Protobuf | Location search/autocomplete |
| `/api/lines/search` | POST | Protobuf | Line search |

---

## Work Objectives

### Core Objective
Create a production-ready TypeScript client library for the Moovit API that abstracts away complexity (WAF tokens, coordinate conversion, polling) and provides a clean, type-safe interface for transit data.

### Deliverables
1. **TypeScript client library** with full type definitions
2. **Puppeteer-based authentication module** for WAF token management
3. **Known locations system** with built-in Israeli transit hubs + user aliases
4. **Location resolver** supporting coordinates, aliases, and stop IDs
5. **Route planning module** with automatic polling
6. **Lines/arrivals module** for real-time transit data (arrivals + agency info)
7. **Unit tests** for all public APIs
8. **Example scripts** demonstrating usage

### Definition of Done
- [ ] All public methods have TypeScript types
- [ ] WAF token is automatically acquired and refreshed
- [ ] Location inputs work with: coordinates, known aliases, stop IDs (experimental)
- [ ] Text search throws `UnsupportedInV1Error` with helpful message
- [ ] Route planning returns structured itineraries
- [ ] Real-time arrivals can be queried by line/stop
- [ ] Agency data can be retrieved
- [ ] All JSON endpoints working
- [ ] Tests cover happy paths and error cases
- [ ] README with usage examples and v1 limitations documented

---

## Must Have / Must NOT Have

### MUST Have
- TypeScript with strict mode
- Auto WAF token acquisition via Puppeteer
- Coordinate conversion helpers (human-readable <-> API format)
- **Known Locations System:**
  - ~30 built-in Israeli transit hubs (major stations, airports, interchanges)
  - User-registered aliases via `registerLocation(alias, coords)` method
- **Discriminated union LocationInput type** with explicit `type` field
- **Graceful degradation** for unsupported location types (clear errors)
- Route search with automatic result polling
- Real-time arrival queries
- Agency information queries
- Proper error handling with typed errors
- Configurable metro ID and language

### MUST NOT Have
- Browser/frontend bundle (Node.js only for v1)
- Protobuf encoding/decoding (deferred to v2)
- Full text search for locations (requires protobuf)
- Line routes, schedules, or stop lists (requires protobuf)
- Rate limiting logic (defer to user)
- Caching layer (defer to user)
- Webpack/bundler configuration

---

## Location Input Strategy (CRITICAL)

### v1 Supported Location Types

| Type | Support Level | How It Works |
|------|---------------|--------------|
| `coordinates` | FULL | Direct conversion, no API call |
| `alias` | FULL | Lookup in known locations registry |
| `stopId` | EXPERIMENTAL | Uses `location_type=4` in route search |
| `text` | NOT SUPPORTED | Throws `UnsupportedInV1Error` |

### LocationInput Type Definition

```typescript
type LocationInput =
  | { type: 'coordinates'; lat: number; lon: number }
  | { type: 'alias'; name: string }
  | { type: 'stopId'; id: number }        // experimental, uses type=4
  | { type: 'text'; query: string };      // throws UnsupportedInV1Error
```

### Resolution Strategy

```
LocationInput received
       |
       v
[Check type field]
       |
       +---> 'coordinates' --> Convert to API format --> Return Location
       |
       +---> 'alias' --> Lookup in knownLocations registry
       |                       |
       |                 Found? --> Return Location
       |                       |
       |                 Not Found? --> Throw LocationNotFoundError
       |
       +---> 'stopId' --> Create Location with type=4 (STOP)
       |                  (Route search uses location_type=4 directly)
       |                  ** EXPERIMENTAL: May not work for all endpoints **
       |
       +---> 'text' --> Throw UnsupportedInV1Error with message:
                        "Text search requires protobuf (v2). Use coordinates
                         or register location as alias: client.locations.register()"
```

---

## Line Information Scope (v1)

### What IS Included
- **Real-time arrivals** (`/api/lines/linesarrival`, `/api/lines/linearrival`)
- **Agency information** (`/api/lines/agency`, `/api/lines/agency_order`)
- **Line metadata** from route results (id, shortName, agencyId, color, type)

### What IS NOT Included (Requires Protobuf - v2+)
- Line routes (path/geometry)
- Line schedules (timetables)
- Line stop lists (all stops on a line)
- Line search by name

---

## Project Structure

```
moovit-client/
├── src/
│   ├── index.ts                    # Main exports
│   ├── client.ts                   # MoovitClient class
│   ├── types/
│   │   ├── index.ts                # Re-exports
│   │   ├── common.ts               # Shared types (Coordinates, Location)
│   │   ├── config.ts               # Client configuration types
│   │   ├── route.ts                # Route planning types
│   │   ├── lines.ts                # Lines and arrivals types
│   │   ├── location.ts             # Location input types
│   │   └── alerts.ts               # Alert types
│   ├── modules/
│   │   ├── auth.ts                 # WAF token acquisition (Puppeteer)
│   │   ├── route.ts                # Route planning methods
│   │   ├── lines.ts                # Lines/arrivals methods
│   │   ├── location.ts             # Location resolution
│   │   ├── alerts.ts               # Service alerts
│   │   └── images.ts               # Transit images
│   ├── data/
│   │   └── known-locations.ts      # Built-in Israeli transit hubs
│   ├── utils/
│   │   ├── coordinates.ts          # Coordinate conversion
│   │   ├── headers.ts              # Header construction
│   │   ├── http.ts                 # HTTP client wrapper
│   │   └── polling.ts              # Polling utilities
│   └── errors.ts                   # Custom error classes
├── tests/
│   ├── unit/
│   │   ├── coordinates.test.ts
│   │   ├── location.test.ts
│   │   ├── known-locations.test.ts
│   │   └── route.test.ts
│   └── integration/
│       └── client.test.ts
├── examples/
│   ├── route-planning.ts
│   ├── arrivals.ts
│   └── known-locations.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## Task Flow

```
[1. Project Setup]
       |
       v
[2. Types Definition] ──────────────────────┐
       |                                     |
       v                                     |
[3. Utils (coordinates, headers, http)] ────┤
       |                                     |
       v                                     |
[4. Known Locations Data] ──────────────────┤
       |                                     |
       v                                     |
[5. Auth Module (Puppeteer)]                 |
       |                                     |
       v                                     |
[6. Location Module + Registry] <───────────┤
       |                                     |
       v                                     |
[7. Route Module] <─────────────────────────┤
       |                                     |
       v                                     |
[8. Lines Module (Arrivals + Agency)]        |
       |                                     |
       v                                     |
[9. Alerts & Images Modules]                 |
       |                                     |
       v                                     |
[10. Main Client Class] <───────────────────┘
       |
       v
[11. Tests]
       |
       v
[12. Examples & Documentation]
```

---

## Detailed TODOs

### Phase 1: Project Foundation

#### TODO 1.1: Initialize TypeScript Project
**File:** `package.json`, `tsconfig.json`

**Actions:**
- Update `package.json` with TypeScript, build scripts, test scripts
- Add dependencies: `typescript`, `puppeteer`
- Add dev dependencies: `@types/node`, `jest`, `ts-jest`, `@types/jest`
- Create `tsconfig.json` with strict mode, ES2020 target, Node16 module

**Acceptance Criteria:**
- `npm run build` compiles TypeScript to `dist/` without errors
- `npm test` runs Jest tests
- `npm run typecheck` validates types with zero errors

---

#### TODO 1.2: Create Error Classes
**File:** `src/errors.ts`

**Actions:**
- `MoovitError` - base error class
- `AuthenticationError` - WAF token failures
- `RateLimitError` - 429 responses
- `ApiError` - API-specific errors with code/message
- `LocationNotFoundError` - location resolution failures (alias not found)
- `UnsupportedInV1Error` - feature requires protobuf (text search, line search)
- `TimeoutError` - polling/request timeouts

**Acceptance Criteria:**
- Each error has `name`, `message`, `cause` properties
- Errors are instanceof-checkable
- `UnsupportedInV1Error` includes helpful message about alternatives

---

### Phase 2: Type Definitions

#### TODO 2.1: Common Types
**File:** `src/types/common.ts`

**Types to define:**
```typescript
interface Coordinates {
  lat: number;  // Human-readable (e.g., 31.789130)
  lon: number;
}

interface ApiCoordinates {
  latitude: number;   // API format (e.g., 31789130)
  longitude: number;
}

interface Location {
  id: number;
  type: LocationType;
  coordinates: Coordinates;
  caption: string;
}

enum LocationType {
  UNKNOWN = 0,
  STOP = 4,
  COORDINATE = 6
}
```

**Acceptance Criteria:**
- Types compile without errors
- JSDoc comments on all exported types

---

#### TODO 2.2: Location Input Types (CRITICAL)
**File:** `src/types/location.ts`

**Types to define:**
```typescript
/**
 * Discriminated union for location inputs.
 * Use explicit `type` field to specify how location should be resolved.
 */
type LocationInput =
  | CoordinatesInput
  | AliasInput
  | StopIdInput
  | TextInput;

interface CoordinatesInput {
  type: 'coordinates';
  lat: number;
  lon: number;
}

interface AliasInput {
  type: 'alias';
  /** Name of registered location (built-in or user-defined) */
  name: string;
}

interface StopIdInput {
  type: 'stopId';
  /** Moovit stop ID - EXPERIMENTAL, uses location_type=4 */
  id: number;
}

interface TextInput {
  type: 'text';
  /** Free text query - NOT SUPPORTED in v1, throws UnsupportedInV1Error */
  query: string;
}

/** Helper type guards */
function isCoordinatesInput(input: LocationInput): input is CoordinatesInput;
function isAliasInput(input: LocationInput): input is AliasInput;
function isStopIdInput(input: LocationInput): input is StopIdInput;
function isTextInput(input: LocationInput): input is TextInput;
```

**Acceptance Criteria:**
- Discriminated union compiles correctly
- Type guards work with TypeScript's type narrowing
- JSDoc clearly documents v1 support levels

---

#### TODO 2.3: Configuration Types
**File:** `src/types/config.ts`

**Types to define:**
```typescript
interface MoovitClientConfig {
  metroId?: number;          // Default: 1 (Israel)
  language?: string;         // Default: 'EN'
  userKey?: string;          // Auto-generated if not provided
  puppeteerOptions?: object; // Puppeteer launch options
  tokenRefreshInterval?: number; // ms, default: 300000 (5 min)
}
```

**Acceptance Criteria:**
- All config options have sensible defaults documented

---

#### TODO 2.4: Route Types
**File:** `src/types/route.ts`

**Types to define:**
```typescript
interface RouteSearchOptions {
  from: LocationInput;
  to: LocationInput;
  time?: Date;
  timeType?: 'departure' | 'arrival';
  routeTypes?: RouteType[];
}

interface RouteResult {
  itineraries: Itinerary[];
  sections: RouteSection[];
}

interface Itinerary {
  guid: string;
  totalDuration: number;      // minutes
  legs: Leg[];
}

type Leg = WalkLeg | TransitLeg | TaxiLeg | WaitLeg | BikeLeg;

interface WalkLeg {
  type: 'walk';
  duration: number;
  distance: number;
  from: Location;
  to: Location;
}

interface TransitLeg {
  type: 'transit';
  line: LineInfo;
  from: Location;
  to: Location;
  departureTime: Date;
  arrivalTime: Date;
  stops: number;
  isRealTime: boolean;
}

/** Line information available from route results (not full line data) */
interface LineInfo {
  id: number;
  shortName: string;
  longName?: string;
  agencyId: number;
  agencyName: string;
  color?: string;
  type: RouteType;
}
```

**Acceptance Criteria:**
- Types match API response structure
- Union types enable type-safe leg handling
- `LineInfo` clearly scoped to route-result data only

---

#### TODO 2.5: Lines Types
**File:** `src/types/lines.ts`

**Types to define:**
```typescript
interface LineArrival {
  lineId: number;
  stopId: number;
  arrivals: Arrival[];
  nextPollingInterval: number;  // seconds
}

interface Arrival {
  tripId: number;
  scheduledTime: Date;
  realTimeEta?: Date;
  duration: number;           // seconds to arrival
  certainty: ArrivalCertainty;
  vehicleLocation?: VehicleLocation;
}

interface VehicleLocation {
  coordinates: Coordinates;
  vehicleId: string;
  lastUpdate: Date;
  status: VehicleStatus;
}

interface Agency {
  id: number;
  name: string;
  url?: string;
  phone?: string;
}

interface AgencyOrder {
  agencyId: number;
  order: number;
}
```

**Acceptance Criteria:**
- Time fields converted to Date objects
- Coordinates in human-readable format

---

### Phase 3: Utilities

#### TODO 3.1: Coordinate Utilities
**File:** `src/utils/coordinates.ts`

**Functions:**
```typescript
function toApiCoordinate(value: number): number;
function fromApiCoordinate(value: number): number;
function toApiCoordinates(coords: Coordinates): ApiCoordinates;
function fromApiCoordinates(apiCoords: ApiCoordinates): Coordinates;
```

**Acceptance Criteria:**
- Handles edge cases (negative coords, precision)
- Reversible: `fromApi(toApi(x)) === x` within floating point tolerance

---

#### TODO 3.2: Header Builder
**File:** `src/utils/headers.ts`

**Functions:**
```typescript
function buildHeaders(config: {
  wafToken?: string;
  metroId: number;
  language: string;
  userKey: string;
  accept?: string;
  contentType?: string;
}): Record<string, string>;
```

**Required headers:**
- `moovit_app_type: WEB_TRIP_PLANNER`
- `moovit_client_version: 5.151.2/V567`
- `moovit_customer_id: 4908`
- `moovit_metro_id: {metroId}`
- `moovit_phone_type: 2`
- `moovit_user_key: {userKey}`
- `moovit_gtfs_language: {language}`
- `x-aws-waf-token: {wafToken}` (if provided)

**Acceptance Criteria:**
- All required headers present
- Optional headers conditionally added

---

#### TODO 3.3: HTTP Client Wrapper
**File:** `src/utils/http.ts`

**Functions:**
```typescript
class HttpClient {
  constructor(baseUrl: string);

  get<T>(path: string, params?: object, headers?: object): Promise<T>;
  post<T>(path: string, body: object, headers?: object): Promise<T>;

  private handleResponse(response: Response): Promise<any>;
  private handleError(error: any): never;
}
```

**Acceptance Criteria:**
- Uses native `fetch` (Node 18+)
- Parses JSON responses
- Throws typed errors for HTTP errors
- Handles rate limiting (429) with `RateLimitError`

---

#### TODO 3.4: Polling Utility
**File:** `src/utils/polling.ts`

**Functions:**
```typescript
interface PollOptions {
  maxAttempts?: number;       // Default: 10
  interval?: number;          // Default: 1000ms
  timeout?: number;           // Default: 30000ms
}

function poll<T>(
  fn: () => Promise<{ data: T; completed: boolean }>,
  options?: PollOptions
): Promise<T>;
```

**Acceptance Criteria:**
- Respects max attempts
- Throws `TimeoutError` on timeout
- Accumulates results across polls

---

### Phase 4: Known Locations System (NEW)

#### TODO 4.1: Built-in Known Locations
**File:** `src/data/known-locations.ts`

**Data structure:**
```typescript
interface KnownLocation {
  aliases: string[];           // Multiple names for same location
  coordinates: Coordinates;
  description?: string;
}

const BUILT_IN_LOCATIONS: Record<string, KnownLocation> = {
  // Major Train Stations
  'tel-aviv-central': {
    aliases: ['tel aviv central', 'tel aviv savidor', 'savidor'],
    coordinates: { lat: 32.1034, lon: 34.7915 },
    description: 'Tel Aviv Central Railway Station (Savidor)'
  },
  'haifa-central': {
    aliases: ['haifa central', 'haifa merkaz'],
    coordinates: { lat: 32.7936, lon: 34.9896 },
    description: 'Haifa Central Railway Station'
  },
  'jerusalem-central': {
    aliases: ['jerusalem central', 'jerusalem cbs'],
    coordinates: { lat: 31.7889, lon: 35.2033 },
    description: 'Jerusalem Central Bus Station'
  },
  // ... ~30 more major hubs

  // Airports
  'ben-gurion': {
    aliases: ['ben gurion', 'tlv', 'tla'],
    coordinates: { lat: 32.0055, lon: 34.8854 },
    description: 'Ben Gurion International Airport'
  },

  // Major Interchanges
  'arlozorov': {
    aliases: ['arlozorov', 'tel aviv arlozorov'],
    coordinates: { lat: 32.0909, lon: 34.7858 },
    description: 'Arlozorov Terminal (Bus & Train)'
  },
  // ... etc
};
```

**Locations to include (~30):**
- Major train stations (Tel Aviv, Haifa, Jerusalem, Beer Sheva, etc.)
- Central bus stations (all major cities)
- Airports (Ben Gurion, Eilat, Haifa)
- Major interchanges (Arlozorov, Golda Center, etc.)
- Universities (Hebrew U, Tel Aviv U, Technion, etc.)

**Acceptance Criteria:**
- At least 30 built-in locations
- Each location has at least 2 aliases
- Coordinates verified against actual locations
- Lowercase normalization for lookup

---

#### TODO 4.2: Location Registry
**File:** `src/data/known-locations.ts` (continued)

**Class:**
```typescript
class LocationRegistry {
  private userLocations: Map<string, KnownLocation> = new Map();

  /**
   * Register a user-defined location alias
   */
  register(alias: string, coordinates: Coordinates, description?: string): void;

  /**
   * Register multiple aliases for same coordinates
   */
  registerMultiple(aliases: string[], coordinates: Coordinates, description?: string): void;

  /**
   * Resolve alias to coordinates. Checks user locations first, then built-in.
   * @throws LocationNotFoundError if alias not found
   */
  resolve(alias: string): Coordinates;

  /**
   * Check if alias exists (user or built-in)
   */
  exists(alias: string): boolean;

  /**
   * List all available aliases (user + built-in)
   */
  listAliases(): string[];

  /**
   * Clear all user-defined locations
   */
  clearUserLocations(): void;

  private normalize(alias: string): string;
}
```

**Acceptance Criteria:**
- User locations override built-in (same alias)
- Case-insensitive lookup
- `resolve()` throws `LocationNotFoundError` with helpful message listing similar aliases
- `listAliases()` returns sorted combined list

---

### Phase 5: Authentication Module

#### TODO 5.1: WAF Token Manager
**File:** `src/modules/auth.ts`

**Class:**
```typescript
class WafTokenManager {
  private token: string | null = null;
  private expiry: Date | null = null;
  private browser: Browser | null = null;

  constructor(options?: {
    puppeteerOptions?: PuppeteerLaunchOptions;
    refreshInterval?: number;
  });

  async getToken(): Promise<string>;
  async refreshToken(): Promise<string>;
  async close(): Promise<void>;

  private async acquireToken(): Promise<string>;
}
```

**Implementation notes:**
- Launch headless browser
- Navigate to `https://moovitapp.com/tripplan/israel-1/poi/en`
- Wait for `networkidle2`
- Extract `aws-waf-token` cookie
- Cache token with expiry (default 5 minutes)
- Auto-refresh before expiry

**Acceptance Criteria:**
- Token acquired successfully within 30 seconds
- Token cached and reused
- Browser closed on `close()`
- Handles browser crash/restart

---

### Phase 6: Location Module

#### TODO 6.1: Location Resolver
**File:** `src/modules/location.ts`

**Class:**
```typescript
class LocationResolver {
  private registry: LocationRegistry;

  constructor(private config: Config) {
    this.registry = new LocationRegistry();
  }

  /**
   * Resolve any LocationInput to a Location object
   */
  async resolve(input: LocationInput): Promise<Location>;

  /**
   * Register a user-defined location alias
   */
  register(alias: string, coordinates: Coordinates, description?: string): void;

  /**
   * Register multiple aliases for same location
   */
  registerMultiple(aliases: string[], coordinates: Coordinates, description?: string): void;

  /**
   * List all available location aliases
   */
  listKnownLocations(): string[];

  private resolveCoordinates(input: CoordinatesInput): Location;
  private resolveAlias(input: AliasInput): Location;
  private resolveStopId(input: StopIdInput): Location;
  private resolveText(input: TextInput): never;  // Always throws
}
```

**Resolution implementation:**
```typescript
async resolve(input: LocationInput): Promise<Location> {
  switch (input.type) {
    case 'coordinates':
      return this.resolveCoordinates(input);

    case 'alias':
      return this.resolveAlias(input);

    case 'stopId':
      return this.resolveStopId(input);

    case 'text':
      throw new UnsupportedInV1Error(
        `Text search "${input.query}" requires protobuf (planned for v2). ` +
        `Alternatives:\n` +
        `  1. Use coordinates: { type: 'coordinates', lat: ..., lon: ... }\n` +
        `  2. Register as alias: client.locations.register('${input.query}', { lat: ..., lon: ... })\n` +
        `  3. Check built-in locations: client.locations.listKnownLocations()`
      );
  }
}
```

**Acceptance Criteria:**
- Coordinates resolve instantly (no network)
- Aliases resolve via registry lookup
- StopId creates Location with `type=4` for route search
- Text search throws `UnsupportedInV1Error` with actionable message
- Type inference works correctly

---

### Phase 7: Route Module

#### TODO 7.1: Route Planner
**File:** `src/modules/route.ts`

**Class:**
```typescript
class RoutePlanner {
  constructor(
    private http: HttpClient,
    private config: Config,
    private locationResolver: LocationResolver
  );

  async search(options: RouteSearchOptions): Promise<RouteResult>;

  private buildSearchParams(from: Location, to: Location, options: RouteSearchOptions): URLSearchParams;
  private parseResults(results: any[]): RouteResult;
  private parseLeg(leg: any): Leg;
}
```

**Implementation:**
1. Resolve `from` and `to` locations via LocationResolver
2. Build search URL with params
   - For StopId inputs: use `location_type=4` (STOP) directly
3. Call `/api/route/search` to get token
4. Poll `/api/route/result` until `completed: 1` or max attempts
5. Parse and return structured results

**StopId handling:**
```typescript
private buildSearchParams(from: Location, to: Location, options: RouteSearchOptions): URLSearchParams {
  const params = new URLSearchParams();

  // Use location_type based on how location was resolved
  params.set('from_latitude', toApiCoordinate(from.coordinates.lat));
  params.set('from_longitude', toApiCoordinate(from.coordinates.lon));
  params.set('from_location_type', String(from.type));  // 4 for STOP, 6 for COORDINATE

  // ... same for 'to'
}
```

**Acceptance Criteria:**
- Works with coordinates input
- Works with alias input
- Works with stopId input (experimental)
- Text input rejected before API call
- Returns typed itineraries
- Parses all leg types (walk, transit, taxi, bike, wait)

---

### Phase 8: Lines Module

#### TODO 8.1: Lines & Arrivals
**File:** `src/modules/lines.ts`

**Class:**
```typescript
class LinesService {
  constructor(private http: HttpClient, private config: Config);

  /**
   * Get real-time arrivals for multiple line/stop pairs
   */
  async getArrivals(requests: LineStopPair[]): Promise<LineArrival[]>;

  /**
   * Get real-time arrivals for a single line at a stop
   */
  async getLineArrival(lineId: number, stopId: number): Promise<LineArrival>;

  /**
   * Get all transit agencies for the metro
   */
  async getAgencies(): Promise<Agency[]>;

  /**
   * Get agency display ordering
   */
  async getAgencyOrder(): Promise<AgencyOrder[]>;
}

interface LineStopPair {
  lineId: number;
  stopId: number;
}
```

**Scope clarification (in JSDoc):**
```typescript
/**
 * LinesService provides real-time arrivals and agency information.
 *
 * v1 Scope:
 * - Real-time arrivals (when is the next bus/train?)
 * - Agency information (who operates this line?)
 *
 * NOT in v1 (requires protobuf - planned for v2):
 * - Line routes/paths (what streets does the line follow?)
 * - Line schedules (full timetables)
 * - Line stop lists (all stops on a line)
 * - Line search by name
 */
```

**Acceptance Criteria:**
- Batch arrivals work (multiple lines/stops)
- Single line arrival works
- Agency list returns all agencies
- Times converted to Date objects
- Coordinates converted to human-readable

---

### Phase 9: Additional Modules

#### TODO 9.1: Alerts Module
**File:** `src/modules/alerts.ts`

**Class:**
```typescript
class AlertsService {
  constructor(private http: HttpClient, private config: Config);

  async getAlerts(): Promise<Alert[]>;
  async getMetroAlerts(): Promise<Alert[]>;
  async getAlertDetails(alertId: number, lang?: string): Promise<AlertDetails>;
}
```

**Acceptance Criteria:**
- Returns typed alerts
- Language parameter defaults to config

---

#### TODO 9.2: Images Module
**File:** `src/modules/images.ts`

**Class:**
```typescript
class ImagesService {
  constructor(private http: HttpClient, private config: Config);

  async getImages(ids: number[]): Promise<TransitImage[]>;
}

interface TransitImage {
  id: number;
  data: Buffer;       // Decoded from base64
  mimeType: string;
}
```

**Acceptance Criteria:**
- Base64 decoded to Buffer
- Returns array matching input IDs

---

### Phase 10: Main Client

#### TODO 10.1: MoovitClient Class
**File:** `src/client.ts`

**Class:**
```typescript
class MoovitClient {
  readonly routes: RoutePlanner;
  readonly lines: LinesService;
  readonly alerts: AlertsService;
  readonly images: ImagesService;
  readonly locations: LocationResolver;

  constructor(config?: MoovitClientConfig);

  async initialize(): Promise<void>;
  async close(): Promise<void>;

  // Convenience methods
  async searchRoutes(from: LocationInput, to: LocationInput, options?: RouteOptions): Promise<RouteResult>;
  async getArrivals(lineId: number, stopId: number): Promise<LineArrival>;
}
```

**Acceptance Criteria:**
- All modules accessible
- `initialize()` acquires WAF token within 30 seconds
- `close()` cleans up browser
- Convenience methods delegate to modules
- `locations.register()` available for user aliases

---

#### TODO 10.2: Main Exports
**File:** `src/index.ts`

**Exports:**
```typescript
export { MoovitClient } from './client';
export * from './types';
export { MoovitError, AuthenticationError, UnsupportedInV1Error, ... } from './errors';
```

**Acceptance Criteria:**
- Clean public API
- Types importable

---

### Phase 11: Testing

#### TODO 11.1: Unit Tests - Coordinates
**File:** `tests/unit/coordinates.test.ts`

**Test cases:**
- Convert positive coordinates
- Convert negative coordinates
- Round-trip conversion
- Edge cases (0, max values)

---

#### TODO 11.2: Unit Tests - Known Locations
**File:** `tests/unit/known-locations.test.ts`

**Test cases:**
- Resolve built-in alias
- Resolve user-registered alias
- User alias overrides built-in
- Case-insensitive lookup
- Throw on unknown alias
- List all aliases

---

#### TODO 11.3: Unit Tests - Location Resolver
**File:** `tests/unit/location.test.ts`

**Test cases:**
- Resolve coordinates input
- Resolve alias input
- Resolve stopId input
- Throw UnsupportedInV1Error for text input
- Error message includes helpful alternatives

---

#### TODO 11.4: Unit Tests - Route Parsing
**File:** `tests/unit/route.test.ts`

**Test cases:**
- Parse walk leg
- Parse transit leg
- Parse taxi leg
- Parse mixed itinerary
- Handle missing fields gracefully

---

#### TODO 11.5: Integration Tests
**File:** `tests/integration/client.test.ts`

**Test cases (with real API):**
- Initialize client (acquires token)
- Search routes using coordinates
- Search routes using built-in alias (Tel Aviv -> Jerusalem)
- Search routes using registered alias
- Get arrivals for known line/stop
- Close client properly

**Note:** Integration tests require network access and may be slow.

---

### Phase 12: Documentation

#### TODO 12.1: Example Scripts
**Files:** `examples/*.ts`

**Scripts:**
1. `route-planning.ts` - Search routes using different location inputs
2. `arrivals.ts` - Get real-time arrivals
3. `known-locations.ts` - Using built-in and custom location aliases

---

#### TODO 12.2: README Documentation
**File:** `README.md`

**Sections:**
- Installation
- Quick Start
- API Reference
- Configuration Options
- **Location Input Formats (with v1 support matrix)**
- **Known Locations System**
- Error Handling
- Examples
- **v1 Limitations (clear list of what's NOT supported)**
- **v2 Roadmap (what's coming)**

---

## Commit Strategy

| Commit | Scope | Message |
|--------|-------|---------|
| 1 | Setup | feat: initialize TypeScript project with dependencies |
| 2 | Types | feat: add type definitions with discriminated LocationInput |
| 3 | Utils | feat: add coordinate, header, and HTTP utilities |
| 4 | Locations | feat: add known locations registry with 30+ Israeli hubs |
| 5 | Auth | feat: add Puppeteer-based WAF token manager |
| 6 | Location | feat: add location resolver with graceful v1 degradation |
| 7 | Routes | feat: add route planning with stopId support |
| 8 | Lines | feat: add arrivals and agency services |
| 9 | Extras | feat: add alerts and images services |
| 10 | Client | feat: add main MoovitClient class |
| 11 | Tests | test: add unit and integration tests |
| 12 | Docs | docs: add README with v1 limitations and v2 roadmap |

---

## Success Criteria

### Functional (Measurable)
- [ ] Client initializes and acquires WAF token within 30 seconds
- [ ] Route search works with `{ type: 'coordinates', lat, lon }` input
- [ ] Route search works with `{ type: 'alias', name: 'tel-aviv-central' }` input
- [ ] Route search works with `{ type: 'stopId', id: 12345 }` input (experimental)
- [ ] `{ type: 'text', query: '...' }` throws `UnsupportedInV1Error` with helpful message
- [ ] User can register custom aliases via `client.locations.register()`
- [ ] `client.locations.listKnownLocations()` returns 30+ built-in locations
- [ ] Real-time arrivals return structured data with Date objects
- [ ] Agency list returns all agencies for metro

### Quality (Measurable)
- [ ] TypeScript strict mode passes with zero errors
- [ ] Unit tests pass (>80% coverage on core modules)
- [ ] Integration tests pass with real API
- [ ] No `any` types in public API

### Documentation (Measurable)
- [ ] README includes v1 support matrix table
- [ ] README includes v2 roadmap section
- [ ] JSDoc on all public methods
- [ ] Working example scripts (3 examples minimum)

---

## v1 Limitations (Explicit)

| Feature | v1 Status | Reason | Workaround |
|---------|-----------|--------|------------|
| Text location search | NOT SUPPORTED | Requires protobuf | Use coordinates or register alias |
| Stop name lookup | NOT SUPPORTED | Requires protobuf | Use stopId or coordinates |
| Line search by name | NOT SUPPORTED | Requires protobuf | Use lineId from arrivals |
| Line routes/paths | NOT SUPPORTED | Requires protobuf | None |
| Line schedules | NOT SUPPORTED | Requires protobuf | None |
| Line stop lists | NOT SUPPORTED | Requires protobuf | None |
| Browser bundle | NOT SUPPORTED | Requires bundler | Node.js only |
| Caching | NOT INCLUDED | Out of scope | User implements |
| Rate limiting | NOT INCLUDED | Out of scope | User implements |

---

## v2 Migration Path (Protobuf)

### What v2 Will Add
1. **Protobuf encoding** - Simple, well-understood
2. **Protobuf decoding** - Complex, requires reverse engineering
3. **Full text location search** - `/api/location` endpoint
4. **Line search** - `/api/lines/search` endpoint
5. **Nearby stops** - `/api/nearby/stops` endpoint

### Migration Strategy
1. Add `protobufjs` dependency
2. Create `.proto` files from API analysis
3. Add `ProtobufEncoder` and `ProtobufDecoder` utilities
4. Extend `LocationResolver` to use `/api/location` for text search
5. Add `LinesService.search()` method
6. Add `NearbyService` for stops discovery

### Breaking Changes Expected
- `LocationInput` type may add new supported types
- `UnsupportedInV1Error` will be removed for supported features
- New methods added to existing services

---

**Plan Created:** 2026-02-04
**Plan Revised:** 2026-02-04 (v1.1 - addressed Critic/Architect feedback)
**Estimated Effort:** 3-4 days for v1
