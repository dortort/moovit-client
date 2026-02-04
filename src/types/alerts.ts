/**
 * Service alert
 */
export interface Alert {
  id: number;
  title: string;
  description?: string;
  url?: string;
  severity: AlertSeverity;
  effect: AlertEffect;
  cause?: AlertCause;
  /** Start time of the alert */
  startTime?: Date;
  /** End time of the alert */
  endTime?: Date;
  /** Affected entities */
  affectedEntities?: AffectedEntity[];
}

/**
 * Alert severity level
 */
export enum AlertSeverity {
  INFO = 1,
  WARNING = 2,
  SEVERE = 3,
}

/**
 * Alert effect
 */
export enum AlertEffect {
  NO_SERVICE = 1,
  REDUCED_SERVICE = 2,
  SIGNIFICANT_DELAYS = 3,
  DETOUR = 4,
  ADDITIONAL_SERVICE = 5,
  MODIFIED_SERVICE = 6,
  OTHER = 7,
  UNKNOWN = 8,
  STOP_MOVED = 9,
}

/**
 * Alert cause
 */
export enum AlertCause {
  UNKNOWN = 1,
  OTHER = 2,
  TECHNICAL_PROBLEM = 3,
  STRIKE = 4,
  DEMONSTRATION = 5,
  ACCIDENT = 6,
  HOLIDAY = 7,
  WEATHER = 8,
  MAINTENANCE = 9,
  CONSTRUCTION = 10,
  POLICE_ACTIVITY = 11,
  MEDICAL_EMERGENCY = 12,
}

/**
 * Affected entity
 */
export interface AffectedEntity {
  type: 'route' | 'stop' | 'agency';
  id: number;
  name?: string;
}

/**
 * Alert details response
 */
export interface AlertDetails extends Alert {
  fullDescription?: string;
  activePeriods?: Array<{
    start: Date;
    end: Date;
  }>;
}
