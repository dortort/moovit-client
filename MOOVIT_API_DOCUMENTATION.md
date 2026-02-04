# Moovit API Documentation

> **Comprehensive API documentation for the Moovit backend API**
>
> Version: 5.151.2/V567
> Last Updated: February 2026

---

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication & Headers](#authentication--headers)
- [Testing with cURL](#testing-with-curl)
- [Endpoints](#endpoints)
  - [Route Planning](#route-planning)
  - [Lines & Transit](#lines--transit)
  - [Nearby & Stops](#nearby--stops)
  - [Alerts](#alerts)
  - [Location Search](#location-search)
  - [Images](#images)
  - [Share](#share)
  - [Debug](#debug)
- [Data Types](#data-types)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

The Moovit API provides access to public transit information, route planning, real-time arrivals, and location search functionality. The API uses a combination of REST endpoints with JSON and Protocol Buffers (protobuf) data formats.

### Key Features

- Multi-modal route planning (transit, walking, biking, taxi)
- Real-time transit arrivals and vehicle locations
- Transit line and stop information
- Location search and geocoding
- Service alerts and disruptions
- Shared mobility integration (scooters, bikes)

---

## Base URL

```
https://moovitapp.com/api
```

All endpoints are relative to this base URL.

---

## Authentication & Headers

### Required Headers

All API requests must include the following headers:

| Header | Value | Description |
|--------|-------|-------------|
| `moovit_app_type` | `WEB_TRIP_PLANNER` | Application type identifier |
| `moovit_client_version` | `5.151.2/V567` | Client version string |
| `moovit_customer_id` | `4908` | Customer identifier |
| `moovit_metro_id` | `1` | Metro area ID (1 = Israel) |
| `moovit_phone_type` | `2` | Phone type identifier |
| `moovit_user_key` | String | User identifier (e.g., `F36627`) |
| `moovit_gtfs_language` | `EN` | Language code (EN, HE, etc.) |
| `x-aws-waf-token` | String | AWS WAF token (required for direct API access) |

### Optional Headers

| Header | Value | Description |
|--------|-------|-------------|
| `protobuf-version` | `V3` | Required for protobuf endpoints |
| `accept` | `application/json` or `application/x-protobuf` | Response format |

### AWS WAF Token

The API is protected by AWS WAF. Direct API access requires a valid `x-aws-waf-token` obtained by completing the browser JavaScript challenge. This token is time-limited and must be refreshed periodically.

**Note:** The WAF token is automatically generated when accessing the API through a browser. For programmatic access, you'll need to implement the AWS WAF challenge flow or use browser automation.

---

## Testing with cURL

### Authentication Method

The API uses AWS WAF protection. To authenticate with cURL, you need to pass the session cookies from a browser session:

1. Open https://moovitapp.com/tripplan in your browser
2. Open DevTools → Application → Cookies
3. Copy all cookies, especially `aws-waf-token`

### Working cURL Examples

The following examples have been tested and verified working.

#### Get Service Alerts

```bash
curl -s "https://moovitapp.com/api/alert" \
  -H "accept: application/json" \
  -H "moovit_app_type: WEB_TRIP_PLANNER" \
  -H "moovit_client_version: 5.151.2/V567" \
  -H "moovit_customer_id: 4908" \
  -H "moovit_metro_id: 1" \
  -H "moovit_phone_type: 2" \
  -H "moovit_user_key: F36627" \
  -H "moovit_gtfs_language: EN" \
  -H "Cookie: aws-waf-token=YOUR_TOKEN; mv_metro=1; mv_lang=en" \
  -H "Referer: https://moovitapp.com/tripplan/"

# Response: {"data":[]}
```

#### Get Transit Images

```bash
curl -s "https://moovitapp.com/api/image?ids=13560,291729" \
  -H "accept: application/json" \
  -H "moovit_app_type: WEB_TRIP_PLANNER" \
  -H "moovit_client_version: 5.151.2/V567" \
  -H "moovit_customer_id: 4908" \
  -H "moovit_metro_id: 1" \
  -H "moovit_phone_type: 2" \
  -H "moovit_user_key: F36627" \
  -H "moovit_gtfs_language: EN" \
  -H "Cookie: aws-waf-token=YOUR_TOKEN"

# Response: [{"entity":{"image":{"imageId":13560,"imageData":"iVBORw0KGgo...","imageType":1}}}]
```

#### Search Routes (Jerusalem → Tel Aviv)

```bash
# Step 1: Get routing token
curl -s "https://moovitapp.com/api/route/search?tripPlanPref=2&time=$(date +%s)000&timeType=2&isCurrentTime=true&routeTypes=3,5,4,7,6,2,1,0&routeTransportOptions=1,5&fromLocation_id=0&fromLocation_type=6&fromLocation_latitude=31789130&fromLocation_longitude=35203210&fromLocation_caption=Jerusalem&toLocation_id=0&toLocation_type=6&toLocation_latitude=32075369&toLocation_longitude=34775131&toLocation_caption=TelAviv" \
  -H "accept: application/json" \
  -H "moovit_app_type: WEB_TRIP_PLANNER" \
  -H "moovit_client_version: 5.151.2/V567" \
  -H "moovit_customer_id: 4908" \
  -H "moovit_metro_id: 1" \
  -H "moovit_phone_type: 2" \
  -H "moovit_user_key: F36627" \
  -H "moovit_gtfs_language: EN" \
  -H "Cookie: aws-waf-token=YOUR_TOKEN"

# Response: {"token":"1770209050880,0c13331e-feda-4355-9d5c-5a13c2f60a1b"}

# Step 2: Get route results
curl -s "https://moovitapp.com/api/route/result?token=YOUR_TOKEN_FROM_STEP1&offset=0" \
  -H "accept: application/json" \
  -H "moovit_app_type: WEB_TRIP_PLANNER" \
  -H "moovit_client_version: 5.151.2/V567" \
  -H "moovit_customer_id: 4908" \
  -H "moovit_metro_id: 1" \
  -H "moovit_phone_type: 2" \
  -H "moovit_user_key: F36627" \
  -H "moovit_gtfs_language: EN" \
  -H "Cookie: aws-waf-token=YOUR_TOKEN"

# Response includes: tripPlanSections, itineraries with legs (transit, taxi, walking, biking)
```

#### Get Real-Time Line Arrivals

```bash
curl -s -X POST "https://moovitapp.com/api/lines/linesarrival" \
  -H "accept: application/json" \
  -H "content-type: application/json" \
  -H "moovit_app_type: WEB_TRIP_PLANNER" \
  -H "moovit_client_version: 5.151.2/V567" \
  -H "moovit_customer_id: 4908" \
  -H "moovit_metro_id: 1" \
  -H "moovit_phone_type: 2" \
  -H "moovit_user_key: F36627" \
  -H "moovit_gtfs_language: EN" \
  -H "Cookie: aws-waf-token=YOUR_TOKEN" \
  -d '{"params":{"lineStopPairs":[{"lineId":6623410,"stopId":72956}]}}'

# Response: [{"stopId":72956,"epochDay":20488,"lineArrivals":{"lineId":6623410,"arrivals":[...]},"nextPollingIntervalSecs":20}]
```

### Endpoint Status (Verified)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/alert` | GET | ✅ Working |
| `/api/image` | GET | ✅ Working |
| `/api/route/search` | GET | ✅ Working |
| `/api/route/result` | GET | ✅ Working |
| `/api/lines/linesarrival` | POST | ✅ Working |
| `/api/lines/linearrival` | POST | ✅ Working |
| `/api/nearby/stops` | GET | ⚠️ Requires browser (protobuf) |
| `/api/location` | POST | ⚠️ Requires browser (protobuf) |
| `/api/lines/search` | POST | ⚠️ Requires browser (protobuf) |

**Note:** Protobuf endpoints (marked ⚠️) require the full browser WAF challenge and cannot be accessed with just cookies from cURL. Use browser-based `fetch()` for these endpoints.

---

## Endpoints

### Route Planning

#### 1. Search for Routes

**Endpoint:** `GET /api/route/search`

Initiates a route planning search between two locations. Returns a token for polling results.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tripPlanPref` | integer | Yes | Trip planning preference (2 = balanced) |
| `time` | long | Yes | Unix timestamp in milliseconds |
| `timeType` | integer | Yes | Time type (2 = departure) |
| `isCurrentTime` | boolean | Yes | Whether using current time |
| `routeTypes` | string | Yes | Comma-separated route types (e.g., `3,5,4,7,6,2,1,0`) |
| `routeTransportOptions` | string | Yes | Transport options (e.g., `1,5`) |
| `fromLocation_id` | integer | Yes | Origin location ID (0 for coordinates) |
| `fromLocation_type` | integer | Yes | Origin type (6 = coordinate, 4 = stop) |
| `fromLocation_latitude` | integer | Yes | Origin latitude × 1,000,000 |
| `fromLocation_longitude` | integer | Yes | Origin longitude × 1,000,000 |
| `fromLocation_caption` | string | Yes | URL-encoded origin name |
| `toLocation_id` | integer | Yes | Destination location ID |
| `toLocation_type` | integer | Yes | Destination type |
| `toLocation_latitude` | integer | Yes | Destination latitude × 1,000,000 |
| `toLocation_longitude` | integer | Yes | Destination longitude × 1,000,000 |
| `toLocation_caption` | string | Yes | URL-encoded destination name |

**Example Request:**

```http
GET /api/route/search?tripPlanPref=2&time=1770206919097&timeType=2&isCurrentTime=true&routeTypes=3,5,4,7,6,2,1,0&routeTransportOptions=1,5&fromLocation_id=0&fromLocation_type=6&fromLocation_latitude=32228394&fromLocation_longitude=35246259&fromLocation_caption=Yaffa%20Street%2030,%20jerusalem&toLocation_id=0&toLocation_type=6&toLocation_latitude=32075487&toLocation_longitude=34775489&toLocation_caption=Dizengoff%20Center
```

**Response:**

```json
{
  "token": "1770206919266,8176e233-1a58-412e-9c7e-aa904dbf2624"
}
```

**Response Format:** `application/x-protobuf`

---

#### 2. Get Route Results

**Endpoint:** `GET /api/route/result`

Retrieves route planning results using the token from the search endpoint.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Token from `/route/search` |
| `offset` | integer | Yes | Pagination offset (start with 0) |

**Example Request:**

```http
GET /api/route/result?token=1770206919266,8176e233-1a58-412e-9c7e-aa904dbf2624&offset=0
```

**Response:**

```json
{
  "results": [
    {
      "result": {
        "tripPlanSections": {
          "tripPlanSections": [
            {
              "name": "Suggested Routes",
              "sectionId": 1,
              "maxItemsToDisplay": 2,
              "sectionType": 16
            },
            {
              "name": "Taxi & Ride Hailing",
              "sectionId": 1561,
              "maxItemsToDisplay": 1,
              "sectionType": 1
            }
          ]
        }
      }
    },
    {
      "result": {
        "itinerary": {
          "guid": "202602043C741EF912FD4CBD94B90C3F7E517C50:0",
          "sectionId": 1561,
          "groupType": 4,
          "legs": [
            {
              "waitToTaxiLeg": {
                "time": {
                  "startTimeUtc": 1770206919000,
                  "endTimeUtc": 1770207159000,
                  "isRealTime": 0
                },
                "waitAtLocation": {
                  "caption": "Yaffa Street 30, jerusalem",
                  "latlon": {
                    "latitude": 32228394,
                    "longitude": 35246259
                  }
                },
                "approxWaitingSecFromOrdering": 240,
                "taxiId": 11
              }
            },
            {
              "taxiLeg": {
                "time": {
                  "startTimeUtc": 1770207159000,
                  "endTimeUtc": 1770212051000
                },
                "journey": {
                  "origin": {
                    "caption": "Yaffa Street 30, jerusalem",
                    "latlon": {
                      "latitude": 32228394,
                      "longitude": 35246259
                    }
                  },
                  "dest": {
                    "caption": "Dizengoff Center",
                    "latlon": {
                      "latitude": 32075487,
                      "longitude": 34775489
                    }
                  }
                },
                "shape": {
                  "distanceInMeters": 64577.23564752191,
                  "polyline": "mrucEc`cvEaEbDqAdA..."
                },
                "taxiProviderName": "GetTaxi",
                "deepLinks": {
                  "androidDeepLink": "https://...",
                  "iosDeepLink": "https://..."
                }
              }
            }
          ]
        }
      }
    }
  ],
  "completed": 0
}
```

**Response Format:** `application/json`

**Notes:**
- Poll this endpoint with increasing `offset` values to get all results
- `completed: 0` means more results may be available
- Results include transit routes, walking routes, taxi options, and bike routes

---

### Lines & Transit

#### 3. Search Lines

**Endpoint:** `POST /api/lines/search`

Search for transit lines by name or number.

**Request Body:**

```json
{
  "query": "base64_encoded_protobuf_data"
}
```

**Headers Required:**
- `Content-Type: application/json`
- `Accept: application/x-protobuf`
- `protobuf-version: V3`

**Response:** Protocol Buffers format containing line search results

---

#### 4. Get Line Arrivals

**Endpoint:** `POST /api/lines/linearrival`

Get real-time arrivals for a specific line at a stop.

**Request Body:**

```json
{
  "stopId": 46034316,
  "lineIds": "{\"ids\":[7286381]}"
}
```

**Response:**

```json
[
  {
    "stopId": 46034316,
    "lineId": 7286381,
    "arrivals": [
      {
        "tripId": 3713592875,
        "staticEtdUTC": 1770207479000,
        "rtEtdUTC": 1770207503850,
        "durationInSeconds": 1225,
        "vehicleLocation": {
          "latlon": {
            "latitude": 32103446,
            "longitude": 35189738
          },
          "vehicleId": "29775_2026-02-04T14:00:00+02:00_74768502",
          "vehicleSampleTimeUtc": 1770206887000,
          "vehicleStatus": 1
        },
        "arrivalCertainty": 1
      }
    ]
  }
]
```

**Response Format:** `application/json`

---

#### 5. Get Multiple Line Arrivals

**Endpoint:** `POST /api/lines/linesarrival`

Get real-time arrivals for multiple line/stop pairs in a single request.

**Request Body:**

```json
{
  "params": {
    "lineStopPairs": [
      {
        "lineId": 6623410,
        "stopId": 72956
      },
      {
        "lineId": 6007876,
        "stopId": 73017
      },
      {
        "lineId": 6007820,
        "stopId": 73017
      }
    ]
  }
}
```

**Response:**

```json
[
  {
    "stopId": 72956,
    "epochDay": 20488,
    "lineArrivals": {
      "lineId": 6623410,
      "arrivals": [
        {
          "patternId": 15761671,
          "tripId": 3713592875,
          "staticEtdUTC": 1770207479000,
          "rtEtdUTC": 1770207503850,
          "isLastArrival": 0,
          "durationInSeconds": 1225,
          "vehicleLocation": {
            "latlon": {
              "latitude": 32103446,
              "longitude": 35189738
            },
            "progress": {
              "nextStopIndex": 8,
              "progress": 56
            },
            "vehicleId": "29775_2026-02-04T14:00:00+02:00_74768502",
            "vehicleSampleTimeUtc": 1770206887000,
            "vehicleStatus": 1,
            "locationSource": 1
          },
          "stopIndex": 18,
          "patternStopsSize": 36,
          "arrivalCertainty": 1,
          "trafficStatus": 1
        }
      ]
    },
    "nextPollingIntervalSecs": 20
  }
]
```

**Response Format:** `application/json`

**Fields:**
- `staticEtdUTC`: Scheduled departure time (Unix timestamp in ms)
- `rtEtdUTC`: Real-time estimated departure time (Unix timestamp in ms)
- `durationInSeconds`: Trip duration in seconds
- `arrivalCertainty`: 1 = high certainty, 2 = medium certainty
- `trafficStatus`: 1 = normal, 2 = slow, 3 = heavy traffic
- `vehicleStatus`: 1 = in service, 2 = stopped
- `nextPollingIntervalSecs`: Recommended polling interval

---

#### 6. Get Agency Order

**Endpoint:** `GET /api/lines/agency_order`

Get the ordering of transit agencies for display purposes.

**Response:** JSON array of agency information

---

#### 7. Get Agency Details

**Endpoint:** `GET /api/lines/agency`

Get detailed information about transit agencies.

**Response:** JSON with agency details

---

#### 8. Get Grouped Trips

**Endpoint:** `POST /api/lines/grouptrips`

Get grouped trips for a line (useful for schedule display).

**Request Body:**

```json
{
  "query": "base64_encoded_protobuf_data"
}
```

**Response:** Protocol Buffers format

---

### Nearby & Stops

#### 9. Get Nearby Stops

**Endpoint:** `GET /api/nearby/stops`

Get transit stops in a tile area.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tilesLatLngs` | string | Yes | Tile coordinates (e.g., `3520,3178`) |
| `revision` | long | Yes | Revision timestamp |
| `metroId` | integer | Yes | Metro area ID |

**Example Request:**

```http
GET /api/nearby/stops?tilesLatLngs=3517,3169&revision=1770106762961&metroId=1
```

**Headers Required:**
- `Accept: application/x-protobuf`
- `protobuf-version: V3`

**Response:** Protocol Buffers format containing stop information

**Tile Coordinate System:**
- The API uses a tile-based coordinate system
- Tiles are calculated from latitude/longitude
- Multiple tiles can be requested in a single call (comma-separated)

---

#### 10. Get Micro-Mobility Options

**Endpoint:** `GET /api/nearby/microMobility`

Get micro-mobility options (scooters, bikes) in a tile area.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metroId` | integer | Yes | Metro area ID |
| `tilesLatLngs` | string | Yes | Tile coordinates |
| `customerKey` | string | Yes | Customer key (e.g., `moovit`) |

**Example Request:**

```http
GET /api/nearby/microMobility?metroId=1&tilesLatLngs=3517,3169&customerKey=moovit
```

**Response:** JSON with available scooters and bikes

---

#### 11. Get Stop Additional Data

**Endpoint:** `GET /api/nearby/stopsAdditionalData`

Get additional data for specific stops (lines, departures, etc.).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stopsIds` | string | Yes | Comma-separated stop IDs |
| `metroId` | integer | Yes | Metro area ID |
| `getLineDepartures` | boolean | No | Include line departures |

**Example Request:**

```http
GET /api/nearby/stopsAdditionalData?stopsIds=72956,73017,289862597&metroId=1&getLineDepartures=true
```

**Response:** JSON with stop details

---

### Alerts

#### 12. Get Service Alerts

**Endpoint:** `GET /api/alert`

Get active service alerts for the metro area.

**Response:**

```json
{
  "data": []
}
```

**Response Format:** `application/json`

Returns an array of active alerts. Empty array when no alerts.

---

#### 13. Get Alert Entities

**Endpoint:** `GET /api/alert/entities`

Get alert entities (affected stops, lines, etc.).

**Response:** JSON with alert entity mappings

---

#### 14. Get Metro Alerts

**Endpoint:** `GET /api/alert/metro`

Get metro-level service alerts.

**Response:** JSON with metro-wide alerts

---

#### 15. Get Alert Details

**Endpoint:** `GET /api/alert/getAlertDetails/{alertId}/{lang}`

Get detailed information for a specific alert.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `alertId` | integer | Yes | Alert identifier |
| `lang` | string | Yes | Language code (e.g., `en`, `he`) |

**Example Request:**

```http
GET /api/alert/getAlertDetails/137156680/en
```

**Response:** JSON with alert details including title, description, affected routes, and time range

---

### Location Search

#### 16. Search Locations

**Endpoint:** `POST /api/location`

Search for locations, addresses, and POIs (autocomplete).

**Request Body:**

```json
{
  "query": "base64_encoded_protobuf_data"
}
```

**Headers Required:**
- `Content-Type: application/json`
- `Accept: application/x-protobuf`
- `protobuf-version: V3`

**Response:** Protocol Buffers format with location suggestions

**Notes:**
- Used for autocomplete in search boxes
- Returns POIs, addresses, transit stops, and landmarks
- The query is encoded as base64 protobuf data

---

### Images

#### 17. Get Images

**Endpoint:** `GET /api/image`

Get images for transit lines, agencies, and other entities.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | string | Yes | Comma-separated image IDs |

**Example Request:**

```http
GET /api/image?ids=13560,291729,13796
```

**Response:**

```json
[
  {
    "id": 13560,
    "imageData": "base64_encoded_image_data",
    "mimeType": "image/png"
  },
  {
    "id": 291729,
    "imageData": "base64_encoded_image_data",
    "mimeType": "image/png"
  }
]
```

**Response Format:** `application/json`

**Notes:**
- Images are returned as base64-encoded data
- Common image types: line icons, agency logos, POI images

---

### Share

#### 18. Share Itinerary

**Endpoint:** `POST /api/share/itinerary`

Share a route/itinerary and get a shareable link.

**Request Body:**

```json
{
  "itinerary": {
    "guid": "202602043C741EF912FD4CBD94B90C3F7E517C50:0",
    "legs": [...],
    "from": {...},
    "to": {...}
  }
}
```

**Response:**

```json
{
  "shareUrl": "https://moovitapp.com/share/...",
  "shareId": "abc123"
}
```

**Response Format:** `application/json`

**Notes:**
- Request body can be large (20-30KB) as it includes full itinerary data
- Returns a short URL for sharing via social media, SMS, etc.

---

### Debug

#### 19. Client Debug Logs

**Endpoint:** `POST /api/debug/dump`

Client-side debug logging endpoint.

**Request Body:**

```json
{
  "logs": [
    {
      "when": "2026-02-04T12:08:40.000Z",
      "message": "Log message"
    }
  ],
  "times": {}
}
```

**Response:** 200 OK

**Notes:**
- Used by the Moovit web client for error reporting
- Not typically used by third-party integrations

---

## Data Types

### Location Types

| Value | Type | Description |
|-------|------|-------------|
| 0 | Unknown | Unknown location type |
| 4 | Stop | Transit stop/station |
| 6 | Coordinate | Latitude/longitude coordinate or POI |

### Route Types

| Value | Type | Description |
|-------|------|-------------|
| 0 | Bus | Bus routes |
| 1 | Light Rail | Light rail/tram |
| 2 | Train | Heavy rail/train |
| 3 | Walking | Walking routes |
| 4 | Biking | Bicycle routes |
| 5 | Taxi | Taxi/ride-hailing |
| 6 | Ferry | Ferry routes |
| 7 | Scooter | E-scooter/micro-mobility |

### Time Types

| Value | Type | Description |
|-------|------|-------------|
| 1 | Arrival | Arrive by time |
| 2 | Departure | Depart at time |

### Arrival Certainty

| Value | Level | Description |
|-------|-------|-------------|
| 1 | High | High confidence in ETA |
| 2 | Medium | Medium confidence in ETA |
| 3 | Low | Low confidence (schedule-based) |

### Traffic Status

| Value | Status | Description |
|-------|--------|-------------|
| 1 | Normal | Normal traffic conditions |
| 2 | Slow | Slow traffic |
| 3 | Heavy | Heavy traffic/delays |

### Coordinates

Coordinates in the API are represented as integers:

```
API Value = Real Value × 1,000,000
```

**Example:**
- Real latitude: `32.228394`
- API latitude: `32228394`

To convert:
```javascript
// To API format
const apiLat = Math.round(realLat * 1000000);

// From API format
const realLat = apiLat / 1000000;
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing or invalid WAF token |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Endpoint or resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Errors

1. **WAF Token Expired**
   - Status: 401
   - Solution: Refresh the WAF token

2. **Invalid Metro ID**
   - Status: 400
   - Solution: Use a valid metro ID (1 for Israel)

3. **Invalid Coordinates**
   - Status: 400
   - Solution: Ensure coordinates are multiplied by 1,000,000

4. **Rate Limiting**
   - Status: 429
   - Solution: Implement exponential backoff

---

## Examples

### Example 1: Complete Route Planning Flow

```javascript
// Step 1: Search for routes
const searchParams = new URLSearchParams({
  tripPlanPref: '2',
  time: Date.now().toString(),
  timeType: '2',
  isCurrentTime: 'true',
  routeTypes: '3,5,4,7,6,2,1,0',
  routeTransportOptions: '1,5',
  fromLocation_id: '0',
  fromLocation_type: '6',
  fromLocation_latitude: '32228394',
  fromLocation_longitude: '35246259',
  fromLocation_caption: encodeURIComponent('Jerusalem Central Bus Station'),
  toLocation_id: '0',
  toLocation_type: '6',
  toLocation_latitude: '32075487',
  toLocation_longitude: '34775489',
  toLocation_caption: encodeURIComponent('Dizengoff Center')
});

const searchResponse = await fetch(
  `https://moovitapp.com/api/route/search?${searchParams}`,
  {
    headers: {
      'moovit_app_type': 'WEB_TRIP_PLANNER',
      'moovit_client_version': '5.151.2/V567',
      'moovit_customer_id': '4908',
      'moovit_metro_id': '1',
      'moovit_phone_type': '2',
      'moovit_user_key': 'YOUR_USER_KEY',
      'moovit_gtfs_language': 'EN',
      'x-aws-waf-token': 'YOUR_WAF_TOKEN',
      'accept': 'application/x-protobuf',
      'protobuf-version': 'V3'
    }
  }
);

// Response: { "token": "1770206919266,8176e233-1a58-412e-9c7e-aa904dbf2624" }

// Step 2: Poll for results
const { token } = await searchResponse.json();

let offset = 0;
let allResults = [];
let completed = false;

while (!completed) {
  const resultResponse = await fetch(
    `https://moovitapp.com/api/route/result?token=${token}&offset=${offset}`,
    {
      headers: {
        'moovit_app_type': 'WEB_TRIP_PLANNER',
        'moovit_client_version': '5.151.2/V567',
        'moovit_customer_id': '4908',
        'moovit_metro_id': '1',
        'moovit_phone_type': '2',
        'moovit_user_key': 'YOUR_USER_KEY',
        'moovit_gtfs_language': 'EN',
        'x-aws-waf-token': 'YOUR_WAF_TOKEN',
        'accept': 'application/json'
      }
    }
  );

  const data = await resultResponse.json();
  allResults = allResults.concat(data.results);
  completed = data.completed === 1;
  offset += data.results.length;

  // Wait before next poll if not completed
  if (!completed) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

console.log('All routes:', allResults);
```

---

### Example 2: Get Real-Time Arrivals

```javascript
// Get arrivals for multiple line/stop pairs
const response = await fetch(
  'https://moovitapp.com/api/lines/linesarrival',
  {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      'moovit_app_type': 'WEB_TRIP_PLANNER',
      'moovit_client_version': '5.151.2/V567',
      'moovit_customer_id': '4908',
      'moovit_metro_id': '1',
      'moovit_phone_type': '2',
      'moovit_user_key': 'YOUR_USER_KEY',
      'moovit_gtfs_language': 'EN',
      'x-aws-waf-token': 'YOUR_WAF_TOKEN'
    },
    body: JSON.stringify({
      params: {
        lineStopPairs: [
          { lineId: 6623410, stopId: 72956 },
          { lineId: 6007876, stopId: 73017 }
        ]
      }
    })
  }
);

const arrivals = await response.json();

arrivals.forEach(stop => {
  console.log(`Stop ${stop.stopId}:`);
  stop.lineArrivals.arrivals.forEach(arrival => {
    const etaMinutes = Math.round(
      (arrival.rtEtdUTC - Date.now()) / 60000
    );
    console.log(`  Line ${stop.lineArrivals.lineId}: ${etaMinutes} minutes`);

    if (arrival.vehicleLocation) {
      console.log(`    Vehicle at: ${arrival.vehicleLocation.latlon.latitude / 1000000}, ${arrival.vehicleLocation.latlon.longitude / 1000000}`);
    }
  });
});
```

---

### Example 3: Get Nearby Stops

```javascript
// Calculate tile coordinates from lat/lng
function latLngToTile(lat, lng) {
  const tileX = Math.floor((lng + 180) * 100);
  const tileY = Math.floor((lat + 90) * 100);
  return `${tileY},${tileX}`;
}

const lat = 31.7683;
const lng = 35.2137;
const tile = latLngToTile(lat, lng);

const response = await fetch(
  `https://moovitapp.com/api/nearby/stops?tilesLatLngs=${tile}&revision=${Date.now()}&metroId=1`,
  {
    headers: {
      'accept': 'application/x-protobuf',
      'moovit_app_type': 'WEB_TRIP_PLANNER',
      'moovit_client_version': '5.151.2/V567',
      'moovit_customer_id': '4908',
      'moovit_metro_id': '1',
      'moovit_phone_type': '2',
      'moovit_user_key': 'YOUR_USER_KEY',
      'moovit_gtfs_language': 'EN',
      'protobuf-version': 'V3',
      'x-aws-waf-token': 'YOUR_WAF_TOKEN'
    }
  }
);

// Response is in protobuf format - requires protobuf decoder
```

---

### Example 4: Convert Coordinates

```javascript
// Helper functions for coordinate conversion
function toApiCoordinate(realValue) {
  return Math.round(realValue * 1000000);
}

function fromApiCoordinate(apiValue) {
  return apiValue / 1000000;
}

// Example usage
const jerusalem = {
  lat: 31.7683,
  lng: 35.2137
};

const apiCoordinates = {
  latitude: toApiCoordinate(jerusalem.lat),   // 31768300
  longitude: toApiCoordinate(jerusalem.lng)   // 35213700
};

// Convert back
const realCoordinates = {
  lat: fromApiCoordinate(apiCoordinates.latitude),
  lng: fromApiCoordinate(apiCoordinates.longitude)
};
```

---

### Example 5: Polling with Exponential Backoff

```javascript
async function pollArrivalWithBackoff(lineId, stopId, maxAttempts = 5) {
  let attempt = 0;
  let delay = 1000; // Start with 1 second

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(
        'https://moovitapp.com/api/lines/linesarrival',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
            'moovit_app_type': 'WEB_TRIP_PLANNER',
            'moovit_client_version': '5.151.2/V567',
            'moovit_customer_id': '4908',
            'moovit_metro_id': '1',
            'moovit_phone_type': '2',
            'moovit_user_key': 'YOUR_USER_KEY',
            'moovit_gtfs_language': 'EN',
            'x-aws-waf-token': 'YOUR_WAF_TOKEN'
          },
          body: JSON.stringify({
            params: {
              lineStopPairs: [{ lineId, stopId }]
            }
          })
        }
      );

      if (response.status === 429) {
        // Rate limited - wait and retry
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        attempt++;
        continue;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching arrivals:', error);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
      attempt++;
    }
  }

  throw new Error('Max retry attempts reached');
}

// Usage
const arrivals = await pollArrivalWithBackoff(6623410, 72956);
```

---

## Additional Notes

### Metro IDs

Metro IDs are extracted from Moovit URLs: `moovitapp.com/index/en/public_transit-{city}-{metroId}`

Common metro area IDs:
- `1` - Israel (Tel Aviv, Jerusalem, Haifa, etc.)
- `662` - Paris, France
- `3483` - Lyon, France
- `1562` - Marseille, France
- `924` - Bordeaux, France
- `1024` - Toulouse, France
- `3260` - Nice, France
- `121` - New York - New Jersey, USA
- `2122` - London, UK

### Language Codes

Supported language codes:
- `EN` - English
- `HE` - Hebrew
- `AR` - Arabic
- `FR` - French
- `ES` - Spanish
- And many more...

### Rate Limiting

The API implements rate limiting. Best practices:
- Implement exponential backoff
- Cache results when appropriate
- Use polling intervals suggested by the API (e.g., `nextPollingIntervalSecs`)
- Avoid unnecessary duplicate requests

### Protobuf Endpoints

Some endpoints use Protocol Buffers for request/response:
- `/api/location` - Location search
- `/api/nearby/stops` - Nearby stops
- `/api/lines/search` - Line search
- `/api/lines/grouptrips` - Grouped trips

You'll need:
- Protobuf schema definitions (`.proto` files)
- Protobuf encoder/decoder library
- The `protobuf-version: V3` header

### Real-Time Data

Real-time features:
- Vehicle locations updated every 10-30 seconds
- Arrival predictions based on GPS tracking
- Traffic status updates
- Service alerts

Polling recommendations:
- Arrivals: Every 20-30 seconds (use `nextPollingIntervalSecs`)
- Vehicle locations: Every 15-30 seconds
- Alerts: Every 5 minutes

---

## License & Terms

This documentation is for educational and development purposes. Use of the Moovit API must comply with Moovit's Terms of Service. This is unofficial documentation created through analysis of network traffic.

For official API access, contact Moovit directly at: https://moovit.com/

---

**Last Updated:** February 4, 2026
**API Version:** 5.151.2/V567
**Documentation Version:** 1.0.0
