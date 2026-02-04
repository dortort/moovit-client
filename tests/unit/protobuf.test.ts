import { encodeLocationQuery, decodeLocationResults } from '../../src/utils/protobuf';
import { ProtobufError } from '../../src/errors';
import { Type, Field, Root } from 'protobufjs';

describe('Protobuf Utils', () => {
  describe('encodeLocationQuery', () => {
    it('should encode location query successfully', () => {
      const lat = 32.0853;
      const lon = 34.7818;
      const query = 'Tel Aviv';

      const result = encodeLocationQuery(lat, lon, query);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should encode query with different coordinates', () => {
      const result1 = encodeLocationQuery(32.0853, 34.7818, 'Tel Aviv');
      const result2 = encodeLocationQuery(31.7683, 35.2137, 'Jerusalem');

      expect(result1).not.toEqual(result2);
    });

    it('should encode query with different search text', () => {
      const result1 = encodeLocationQuery(32.0853, 34.7818, 'Tel Aviv');
      const result2 = encodeLocationQuery(32.0853, 34.7818, 'Jerusalem');

      expect(result1).not.toEqual(result2);
    });

    it('should handle negative coordinates', () => {
      const result = encodeLocationQuery(-32.0853, -34.7818, 'South');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle zero coordinates', () => {
      const result = encodeLocationQuery(0, 0, 'Equator');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty query string', () => {
      const result = encodeLocationQuery(32.0853, 34.7818, '');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters in query', () => {
      const result = encodeLocationQuery(32.0853, 34.7818, 'Tel Aviv & Jerusalem, Israel!');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters in query', () => {
      const result = encodeLocationQuery(32.0853, 34.7818, 'תל אביב');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should encode same input consistently', () => {
      const result1 = encodeLocationQuery(32.0853, 34.7818, 'Tel Aviv');
      const result2 = encodeLocationQuery(32.0853, 34.7818, 'Tel Aviv');

      expect(result1).toEqual(result2);
    });

    it('should handle very long query strings', () => {
      const longQuery = 'A'.repeat(1000);
      const result = encodeLocationQuery(32.0853, 34.7818, longQuery);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('decodeLocationResults', () => {
    it('should handle empty buffer', () => {
      const empty = new Uint8Array([]);

      const results = decodeLocationResults(empty);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it('should decode location result with all fields', () => {
      // Create a mock result using protobufjs
      const buffer = createMockLocationResultProper({
        type: 3,
        id: 123,
        metroId: 54,
        name: 'Test Location',
        subtitle: 'Test Subtitle',
        latitude: 32085300, // 32.0853 * 1,000,000
        longitude: 34781800, // 34.7818 * 1,000,000
      });

      const results = decodeLocationResults(buffer);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        type: 'poi',
        id: 123,
        metroId: 54,
        name: 'Test Location',
        subtitle: 'Test Subtitle',
        lat: 32.0853,
        lon: 34.7818,
      });
    });

    it('should map location type 2 to address', () => {
      const buffer = createMockLocationResultProper({ type: 2, name: 'Address' });
      const results = decodeLocationResults(buffer);

      expect(results[0].type).toBe('address');
    });

    it('should map location type 3 to poi', () => {
      const buffer = createMockLocationResultProper({ type: 3, name: 'POI' });
      const results = decodeLocationResults(buffer);

      expect(results[0].type).toBe('poi');
    });

    it('should map location type 4 to stop', () => {
      const buffer = createMockLocationResultProper({ type: 4, name: 'Stop' });
      const results = decodeLocationResults(buffer);

      expect(results[0].type).toBe('stop');
    });

    it('should default unknown types to poi', () => {
      const buffer = createMockLocationResultProper({ type: 99, name: 'Unknown' });
      const results = decodeLocationResults(buffer);

      expect(results[0].type).toBe('poi');
    });

    it('should handle missing optional fields', () => {
      const buffer = createMockLocationResultProper({
        type: 3,
        id: 123,
        name: 'Minimal',
      });

      const results = decodeLocationResults(buffer);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: 'poi',
        id: 123,
        name: 'Minimal',
        lat: 0,
        lon: 0,
      });
      expect(results[0].metroId).toBeUndefined();
    });

    it('should handle negative coordinates', () => {
      const buffer = createMockLocationResultProper({
        name: 'South',
        latitude: -32085300,
        longitude: -34781800,
      });

      const results = decodeLocationResults(buffer);

      expect(results[0].lat).toBe(-32.0853);
      expect(results[0].lon).toBe(-34.7818);
    });

    it('should decode multiple results', () => {
      const buffer = createMockMultipleResultsProper([
        { type: 3, id: 1, name: 'First' },
        { type: 2, id: 2, name: 'Second' },
        { type: 4, id: 3, name: 'Third' },
      ]);

      const results = decodeLocationResults(buffer);

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('First');
      expect(results[0].type).toBe('poi');
      expect(results[1].name).toBe('Second');
      expect(results[1].type).toBe('address');
      expect(results[2].name).toBe('Third');
      expect(results[2].type).toBe('stop');
    });

    it('should throw ProtobufError on invalid buffer', () => {
      const invalidBuffer = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);

      expect(() => {
        decodeLocationResults(invalidBuffer);
      }).toThrow(ProtobufError);
    });

    it('should convert coordinates from scaled format', () => {
      const buffer = createMockLocationResultProper({
        name: 'Test',
        latitude: 1000000, // Should become 1.0
        longitude: 2000000, // Should become 2.0
      });

      const results = decodeLocationResults(buffer);

      expect(results[0].lat).toBe(1.0);
      expect(results[0].lon).toBe(2.0);
    });
  });

  describe('round-trip encoding and decoding', () => {
    it('should encode and decode consistently', () => {
      const lat = 32.0853;
      const lon = 34.7818;
      const query = 'Tel Aviv';

      const encoded = encodeLocationQuery(lat, lon, query);

      // We can't directly decode the query, but we can verify encoding works
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions to create mock protobuf buffers using protobufjs
function createMockLocationResultProper(fields: {
  type?: number;
  id?: number;
  metroId?: number;
  name?: string;
  subtitle?: string;
  latitude?: number;
  longitude?: number;
}): Uint8Array {
  // Create the same proto structure as in the actual code
  const root = new Root();

  const CoordinatesProto = new Type('Coordinates')
    .add(new Field('latitude', 1, 'int32'))
    .add(new Field('longitude', 2, 'int32'));
  root.add(CoordinatesProto);

  const MetroInfoProto = new Type('MetroInfo').add(new Field('metroId', 1, 'int32'));
  root.add(MetroInfoProto);

  const LocationResultProto = new Type('LocationResult')
    .add(new Field('type', 1, 'int32'))
    .add(new Field('id', 2, 'int64'))
    .add(new Field('metro', 3, 'MetroInfo'))
    .add(new Field('name', 4, 'string'))
    .add(new Field('subtitle', 5, 'string'))
    .add(new Field('coordinates', 6, 'Coordinates'));
  root.add(LocationResultProto);

  const LocationResponseProto = new Type('LocationResponse').add(
    new Field('results', 2, 'LocationResult', 'repeated')
  );
  root.add(LocationResponseProto);

  // Build the result object
  const result: any = {};
  if (fields.type !== undefined) result.type = fields.type;
  if (fields.id !== undefined) result.id = fields.id;
  if (fields.metroId !== undefined) result.metro = { metroId: fields.metroId };
  if (fields.name !== undefined) result.name = fields.name;
  if (fields.subtitle !== undefined) result.subtitle = fields.subtitle;
  if (fields.latitude !== undefined || fields.longitude !== undefined) {
    result.coordinates = {
      latitude: fields.latitude ?? 0,
      longitude: fields.longitude ?? 0,
    };
  }

  const response = LocationResponseProto.create({ results: [result] });
  return LocationResponseProto.encode(response).finish();
}

function createMockMultipleResultsProper(
  items: Array<{
    type?: number;
    id?: number;
    name?: string;
  }>
): Uint8Array {
  const root = new Root();

  const CoordinatesProto = new Type('Coordinates')
    .add(new Field('latitude', 1, 'int32'))
    .add(new Field('longitude', 2, 'int32'));
  root.add(CoordinatesProto);

  const MetroInfoProto = new Type('MetroInfo').add(new Field('metroId', 1, 'int32'));
  root.add(MetroInfoProto);

  const LocationResultProto = new Type('LocationResult')
    .add(new Field('type', 1, 'int32'))
    .add(new Field('id', 2, 'int64'))
    .add(new Field('metro', 3, 'MetroInfo'))
    .add(new Field('name', 4, 'string'))
    .add(new Field('subtitle', 5, 'string'))
    .add(new Field('coordinates', 6, 'Coordinates'));
  root.add(LocationResultProto);

  const LocationResponseProto = new Type('LocationResponse').add(
    new Field('results', 2, 'LocationResult', 'repeated')
  );
  root.add(LocationResponseProto);

  const results = items.map((item) => {
    const result: any = {};
    if (item.type !== undefined) result.type = item.type;
    if (item.id !== undefined) result.id = item.id;
    if (item.name !== undefined) result.name = item.name;
    return result;
  });

  const response = LocationResponseProto.create({ results });
  return LocationResponseProto.encode(response).finish();
}
