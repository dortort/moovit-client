# moovit-client

[![npm version](https://img.shields.io/npm/v/moovit-client.svg)](https://www.npmjs.com/package/moovit-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/moovit-client.svg)](https://nodejs.org)

TypeScript client library for the Moovit public transit API. Provides route planning, real-time arrivals, location search, and service alerts for 112+ countries and 3,500+ cities.

> **Note:** This is an unofficial library. Please comply with Moovit's Terms of Service.

## Features

- **Route Planning** - Multi-modal routes (bus, train, taxi, bike, scooter)
- **Real-time Arrivals** - Live ETAs with vehicle tracking
- **Location Search** - Text search with autocomplete
- **Service Alerts** - Disruption notifications
- **Multi-country Support** - 112+ countries via `metroId`

## Installation

```bash
npm install moovit-client
```

## Requirements

- Node.js 18+
- Chromium (installed automatically by Puppeteer)

## Quick Start

```typescript
import { MoovitClient } from 'moovit-client';

async function main() {
  const client = new MoovitClient({ metroId: 1 }); // 1 = Israel
  await client.initialize();

  try {
    // Search routes using text search
    const routes = await client.routes.search({
      from: { type: 'text', query: 'Tel Aviv Central Bus Station' },
      to: { type: 'text', query: 'Jerusalem Central Station' },
    });

    console.log(`Found ${routes.itineraries.length} routes`);

    for (const itinerary of routes.itineraries) {
      console.log(`- ${itinerary.totalDuration} min, ${itinerary.legs.length} legs`);
    }
  } finally {
    await client.close();
  }
}

main();
```

## Location Input Types

The library supports three ways to specify locations:

```typescript
// 1. Coordinates (direct lat/lon)
{ type: 'coordinates', lat: 32.0853, lon: 34.7818 }

// 2. Stop ID
{ type: 'stopId', id: 72956 }

// 3. Text search (uses Moovit's location API)
{ type: 'text', query: 'Dizengoff Center' }
```

## API Reference

### Routes

```typescript
const result = await client.routes.search({
  from: { type: 'text', query: 'Tel Aviv' },
  to: { type: 'coordinates', lat: 31.7683, lon: 35.2137 },
  departureTime: new Date(),  // optional
});

for (const itinerary of result.itineraries) {
  console.log(`Duration: ${itinerary.totalDuration} minutes`);
  for (const leg of itinerary.legs) {
    if (leg.type === 'transit') {
      console.log(`  Take ${leg.line.shortName} to ${leg.destination.name}`);
    }
  }
}
```

### Real-time Arrivals

```typescript
const arrivals = await client.lines.getArrivals([
  { lineId: 6623410, stopId: 72956 },
]);

for (const stop of arrivals) {
  for (const arrival of stop.arrivals) {
    const etaMinutes = Math.round((arrival.realTimeEta.getTime() - Date.now()) / 60000);
    console.log(`Line ${stop.lineId} arrives in ${etaMinutes} minutes`);
  }
}

// Get agencies
const agencies = await client.lines.getAgencies();
```

### Location Search

```typescript
// Search locations by text (autocomplete)
const results = await client.locations.search('Dizengoff');

for (const result of results) {
  console.log(`${result.name} (${result.type}) at ${result.lat}, ${result.lon}`);
}
```

### Alerts

```typescript
const alerts = await client.alerts.getAlerts();
const details = await client.alerts.getAlertDetails(alertId, 'en');
```

### Images

```typescript
const images = await client.images.getImages([13560, 291729]);
// Returns base64-encoded images with mime types
```

## Configuration

```typescript
interface MoovitClientConfig {
  metroId?: number;              // Metro area ID (default: 1 = Israel)
  language?: string;             // Language code (default: 'EN')
  userKey?: string;              // User identifier (auto-generated)
  tokenRefreshInterval?: number; // Token refresh in ms (default: 300000)
  puppeteerOptions?: object;     // Puppeteer launch options
  debug?: boolean;               // Enable debug logging (default: false)
}
```

## Error Handling

```typescript
import {
  MoovitError,
  AuthenticationError,
  TokenExpiredError,
  LocationNotFoundError,
  RouteSearchError,
  ApiError,
  RateLimitError,
} from 'moovit-client';

try {
  await client.routes.search({ from, to });
} catch (error) {
  if (error instanceof LocationNotFoundError) {
    console.log('Location not found:', error.message);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  }
}
```

## How It Works

This library uses Puppeteer to acquire AWS WAF tokens from moovitapp.com, which are required for API access. The browser runs in headless mode and tokens are automatically refreshed.

## License

MIT

## Disclaimer

This is an unofficial library and is not affiliated with Moovit. Use responsibly and in accordance with Moovit's Terms of Service.
