import { Type, Field, Root } from 'protobufjs';
import { ProtobufError } from '../errors';
import { LocationSearchResult } from '../types';
import { fromScaled } from './coordinates';

// Create root namespace
const root = new Root();

// Coordinates type
const CoordinatesProto = new Type('Coordinates')
  .add(new Field('latitude', 1, 'int32'))
  .add(new Field('longitude', 2, 'int32'));
root.add(CoordinatesProto);

// Metro Info type
const MetroInfoProto = new Type('MetroInfo')
  .add(new Field('metroId', 1, 'int32'));
root.add(MetroInfoProto);

// Location Query (Request)
const LocationQueryProto = new Type('LocationQuery')
  .add(new Field('latitude', 1, 'double'))
  .add(new Field('longitude', 2, 'double'))
  .add(new Field('query', 3, 'string'));
root.add(LocationQueryProto);

// Location Result item
const LocationResultProto = new Type('LocationResult')
  .add(new Field('type', 1, 'int32'))
  .add(new Field('id', 2, 'int64'))
  .add(new Field('metro', 3, 'MetroInfo'))
  .add(new Field('name', 4, 'string'))
  .add(new Field('subtitle', 5, 'string'))
  .add(new Field('coordinates', 6, 'Coordinates'));
root.add(LocationResultProto);

// Location Response wrapper
const LocationResponseProto = new Type('LocationResponse')
  .add(new Field('results', 2, 'LocationResult', 'repeated'));
root.add(LocationResponseProto);

/**
 * Encode a location search query to protobuf format
 */
export function encodeLocationQuery(lat: number, lon: number, query: string): Uint8Array {
  try {
    const message = LocationQueryProto.create({
      latitude: lat,
      longitude: lon,
      query,
    });
    return LocationQueryProto.encode(message).finish();
  } catch (error) {
    throw new ProtobufError(`Failed to encode location query: ${(error as Error).message}`);
  }
}

/**
 * Decode location search results from protobuf format
 */
export function decodeLocationResults(buffer: Uint8Array): LocationSearchResult[] {
  try {
    const response = LocationResponseProto.decode(buffer) as {
      results?: Array<{
        type?: number;
        id?: number | Long;
        metro?: { metroId?: number };
        name?: string;
        subtitle?: string;
        coordinates?: { latitude?: number; longitude?: number };
      }>;
    };

    if (!response.results) {
      return [];
    }

    return response.results.map((r) => ({
      type: mapLocationType(r.type),
      id: typeof r.id === 'object' ? (r.id as { toNumber(): number }).toNumber() : Number(r.id) || 0,
      metroId: r.metro?.metroId,
      name: r.name || '',
      subtitle: r.subtitle,
      lat: fromScaled(r.coordinates?.latitude || 0),
      lon: fromScaled(r.coordinates?.longitude || 0),
    }));
  } catch (error) {
    throw new ProtobufError(`Failed to decode location results: ${(error as Error).message}`);
  }
}

/**
 * Map protobuf location type to our type
 */
function mapLocationType(type?: number): 'poi' | 'address' | 'stop' {
  switch (type) {
    case 2:
      return 'address';
    case 3:
      return 'poi';
    case 4:
      return 'stop';
    default:
      return 'poi';
  }
}

// Long type for 64-bit integers
interface Long {
  toNumber(): number;
}
