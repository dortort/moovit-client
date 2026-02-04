import { Coordinates } from './common';

/**
 * Line/stop pair for arrival queries
 */
export interface LineStopPair {
  lineId: number;
  stopId: number;
}

/**
 * Arrival query parameters
 */
export interface ArrivalParams {
  lineStopPairs: LineStopPair[];
}

/**
 * Single arrival info
 */
export interface Arrival {
  tripId: number;
  patternId?: number;
  /** Scheduled departure time */
  scheduledTime: Date;
  /** Real-time estimated departure time */
  realTimeEta: Date;
  /** Duration to arrival in seconds */
  durationSeconds: number;
  /** Vehicle location if available */
  vehicleLocation?: VehicleLocation;
  /** Is this the last arrival */
  isLast: boolean;
  /** Arrival certainty level */
  certainty: ArrivalCertainty;
  /** Traffic status */
  trafficStatus?: TrafficStatus;
  /** Stop index in pattern */
  stopIndex?: number;
  /** Total stops in pattern */
  totalStops?: number;
}

/**
 * Vehicle location
 */
export interface VehicleLocation {
  coordinates: Coordinates;
  vehicleId: string;
  sampleTime: Date;
  status: VehicleStatus;
  /** Progress info */
  progress?: {
    nextStopIndex: number;
    progressPercent: number;
  };
}

/**
 * Arrival certainty level
 */
export enum ArrivalCertainty {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

/**
 * Traffic status
 */
export enum TrafficStatus {
  NORMAL = 1,
  SLOW = 2,
  HEAVY = 3,
}

/**
 * Vehicle status
 */
export enum VehicleStatus {
  IN_SERVICE = 1,
  STOPPED = 2,
}

/**
 * Stop arrivals response
 */
export interface StopArrivals {
  stopId: number;
  lineId: number;
  arrivals: Arrival[];
  /** Next recommended polling interval in seconds */
  nextPollingIntervalSecs: number;
}

/**
 * Agency info response
 */
export interface AgencyInfo {
  id: number;
  name: string;
  url?: string;
  phone?: string;
  timezone?: string;
  logoImageId?: number;
}

/**
 * Agency order item
 */
export interface AgencyOrderItem {
  agencyId: number;
  order: number;
}
