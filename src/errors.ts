export class MoovitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoovitError';
    Object.setPrototypeOf(this, MoovitError.prototype);
  }
}

export class AuthenticationError extends MoovitError {
  constructor(message = 'Failed to acquire WAF token') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class TokenExpiredError extends MoovitError {
  constructor(message = 'WAF token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class LocationNotFoundError extends MoovitError {
  constructor(query: string) {
    super(`No locations found for "${query}"`);
    this.name = 'LocationNotFoundError';
    Object.setPrototypeOf(this, LocationNotFoundError.prototype);
  }
}

export class UnknownAliasError extends MoovitError {
  constructor(alias: string) {
    super(`Unknown location alias: "${alias}"`);
    this.name = 'UnknownAliasError';
    Object.setPrototypeOf(this, UnknownAliasError.prototype);
  }
}

export class RouteSearchError extends MoovitError {
  constructor(message: string) {
    super(message);
    this.name = 'RouteSearchError';
    Object.setPrototypeOf(this, RouteSearchError.prototype);
  }
}

export class ApiError extends MoovitError {
  public readonly statusCode: number;
  public readonly endpoint: string;

  constructor(statusCode: number, endpoint: string, message?: string) {
    super(message || `API error ${statusCode} at ${endpoint}`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(endpoint: string, retryAfter?: number) {
    super(429, endpoint, `Rate limit exceeded at ${endpoint}`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ProtobufError extends MoovitError {
  constructor(message: string) {
    super(message);
    this.name = 'ProtobufError';
    Object.setPrototypeOf(this, ProtobufError.prototype);
  }
}
