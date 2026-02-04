import { Coordinates, TimeInfo, Line, Location } from './common';

/**
 * Route search parameters
 */
export interface RouteSearchParams {
  from: Location;
  to: Location;
  /** Departure time (default: now) */
  departureTime?: Date;
  /** Arrival time (alternative to departureTime) */
  arrivalTime?: Date;
  /** Route types to include */
  routeTypes?: RouteType[];
  /** Trip planning preference */
  preference?: TripPlanPreference;
}

/**
 * Route type enumeration
 */
export enum RouteType {
  BUS = 0,
  LIGHT_RAIL = 1,
  TRAIN = 2,
  WALKING = 3,
  BIKING = 4,
  TAXI = 5,
  FERRY = 6,
  SCOOTER = 7,
}

/**
 * Trip planning preference
 */
export enum TripPlanPreference {
  FASTEST = 1,
  BALANCED = 2,
  LEAST_WALKING = 3,
  LEAST_TRANSFERS = 4,
}

/**
 * Route search token
 */
export interface RouteToken {
  token: string;
}

/**
 * Route search result
 */
export interface RouteSearchResult {
  itineraries: Itinerary[];
  sections: TripPlanSection[];
  completed: boolean;
}

/**
 * Trip plan section for categorizing routes
 */
export interface TripPlanSection {
  name: string;
  sectionId: number;
  maxItemsToDisplay: number;
  sectionType: number;
}

/**
 * Complete itinerary from origin to destination
 */
export interface Itinerary {
  guid: string;
  sectionId: number;
  sectionName?: string;
  groupType: number;
  legs: Leg[];
  /** Total duration in minutes */
  totalDuration: number;
  /** Total walking distance in meters */
  totalWalkingDistance: number;
  /** Departure time */
  departureTime: Date;
  /** Arrival time */
  arrivalTime: Date;
}

/**
 * Leg base type
 */
export interface LegBase {
  time: TimeInfo;
}

/**
 * Walking leg
 */
export interface WalkLeg extends LegBase {
  type: 'walk';
  distanceInMeters: number;
  polyline?: string;
  instructions?: WalkInstruction[];
}

/**
 * Walk instruction
 */
export interface WalkInstruction {
  instruction: string;
  distanceInMeters: number;
}

/**
 * Transit leg
 */
export interface TransitLeg extends LegBase {
  type: 'transit';
  line: Line;
  origin: StopInfo;
  destination: StopInfo;
  numStops: number;
  polyline?: string;
  intermediateStops?: StopInfo[];
}

/**
 * Stop information
 */
export interface StopInfo {
  id: number;
  name: string;
  coordinates: Coordinates;
}

/**
 * Taxi leg
 */
export interface TaxiLeg extends LegBase {
  type: 'taxi';
  providerName: string;
  distanceInMeters: number;
  estimatedCost?: string;
  deepLinks?: {
    android?: string;
    ios?: string;
    web?: string;
  };
  origin: { caption: string; coordinates: Coordinates };
  destination: { caption: string; coordinates: Coordinates };
  polyline?: string;
}

/**
 * Wait leg
 */
export interface WaitLeg extends LegBase {
  type: 'wait';
  location?: { caption: string; coordinates: Coordinates };
  waitDurationMinutes: number;
}

/**
 * Wait for taxi leg
 */
export interface WaitForTaxiLeg extends LegBase {
  type: 'waitForTaxi';
  location: { caption: string; coordinates: Coordinates };
  approxWaitingSeconds: number;
  taxiId: number;
}

/**
 * Bike leg
 */
export interface BikeLeg extends LegBase {
  type: 'bike';
  distanceInMeters: number;
  polyline?: string;
}

/**
 * Scooter leg
 */
export interface ScooterLeg extends LegBase {
  type: 'scooter';
  providerName: string;
  distanceInMeters: number;
  polyline?: string;
}

/**
 * Line with alternatives leg
 */
export interface LineWithAlternativesLeg extends LegBase {
  type: 'lineWithAlternatives';
  lines: Array<{
    line: Line;
    origin: StopInfo;
    destination: StopInfo;
  }>;
  origin: StopInfo;
  destination: StopInfo;
}

/**
 * Union of all leg types
 */
export type Leg =
  | WalkLeg
  | TransitLeg
  | TaxiLeg
  | WaitLeg
  | WaitForTaxiLeg
  | BikeLeg
  | ScooterLeg
  | LineWithAlternativesLeg;
