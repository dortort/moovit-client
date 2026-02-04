import { buildHeaders, buildProtobufHeaders, generateUserKey, API_VERSION } from '../../src/utils/headers';
import { ResolvedConfig } from '../../src/types';

describe('Headers Utils', () => {
  const mockConfig: ResolvedConfig = {
    metroId: 54,
    customerId: 'c_web',
    userKey: 'ABC123',
    language: 'en',
    defaultLat: 32.0853,
    defaultLon: 34.7818,
    puppeteerOptions: {},
    tokenRefreshInterval: 300000,
    debug: false,
  };

  describe('buildHeaders', () => {
    it('should build standard API headers', () => {
      const headers = buildHeaders(mockConfig);

      expect(headers).toEqual({
        moovit_app_type: 'WEB_TRIP_PLANNER',
        moovit_client_version: API_VERSION,
        moovit_customer_id: 'c_web',
        moovit_metro_id: '54',
        moovit_phone_type: '2',
        moovit_user_key: 'ABC123',
        moovit_gtfs_language: 'en',
        accept: 'application/json',
      });
    });

    it('should convert metroId to string', () => {
      const config = { ...mockConfig, metroId: 123 };
      const headers = buildHeaders(config);

      expect(headers.moovit_metro_id).toBe('123');
      expect(typeof headers.moovit_metro_id).toBe('string');
    });

    it('should use provided language', () => {
      const config = { ...mockConfig, language: 'he' };
      const headers = buildHeaders(config);

      expect(headers.moovit_gtfs_language).toBe('he');
    });

    it('should use provided customerId', () => {
      const config = { ...mockConfig, customerId: 'custom_id' };
      const headers = buildHeaders(config);

      expect(headers.moovit_customer_id).toBe('custom_id');
    });

    it('should use provided userKey', () => {
      const config = { ...mockConfig, userKey: 'DEF456' };
      const headers = buildHeaders(config);

      expect(headers.moovit_user_key).toBe('DEF456');
    });

    it('should always set app type to WEB_TRIP_PLANNER', () => {
      const headers = buildHeaders(mockConfig);

      expect(headers.moovit_app_type).toBe('WEB_TRIP_PLANNER');
    });

    it('should always set phone type to 2', () => {
      const headers = buildHeaders(mockConfig);

      expect(headers.moovit_phone_type).toBe('2');
    });

    it('should set accept header to application/json', () => {
      const headers = buildHeaders(mockConfig);

      expect(headers.accept).toBe('application/json');
    });

    it('should include all required headers', () => {
      const headers = buildHeaders(mockConfig);
      const requiredKeys = [
        'moovit_app_type',
        'moovit_client_version',
        'moovit_customer_id',
        'moovit_metro_id',
        'moovit_phone_type',
        'moovit_user_key',
        'moovit_gtfs_language',
        'accept',
      ];

      requiredKeys.forEach((key) => {
        expect(headers).toHaveProperty(key);
      });
    });
  });

  describe('buildProtobufHeaders', () => {
    it('should extend standard headers with protobuf-specific ones', () => {
      const headers = buildProtobufHeaders(mockConfig);

      expect(headers).toEqual({
        moovit_app_type: 'WEB_TRIP_PLANNER',
        moovit_client_version: API_VERSION,
        moovit_customer_id: 'c_web',
        moovit_metro_id: '54',
        moovit_phone_type: '2',
        moovit_user_key: 'ABC123',
        moovit_gtfs_language: 'en',
        accept: 'application/x-protobuf',
        'protobuf-version': 'V3',
        'content-type': 'application/json',
      });
    });

    it('should override accept header to application/x-protobuf', () => {
      const headers = buildProtobufHeaders(mockConfig);

      expect(headers.accept).toBe('application/x-protobuf');
    });

    it('should add protobuf-version header', () => {
      const headers = buildProtobufHeaders(mockConfig);

      expect(headers['protobuf-version']).toBe('V3');
    });

    it('should add content-type header', () => {
      const headers = buildProtobufHeaders(mockConfig);

      expect(headers['content-type']).toBe('application/json');
    });

    it('should include all standard headers plus protobuf headers', () => {
      const standardHeaders = buildHeaders(mockConfig);
      const protobufHeaders = buildProtobufHeaders(mockConfig);

      // All standard keys should be present
      Object.keys(standardHeaders).forEach((key) => {
        if (key !== 'accept') {
          // accept is overridden
          expect(protobufHeaders).toHaveProperty(key);
        }
      });

      // Plus additional protobuf headers
      expect(protobufHeaders).toHaveProperty('protobuf-version');
      expect(protobufHeaders).toHaveProperty('content-type');
    });

    it('should work with different metro IDs', () => {
      const config = { ...mockConfig, metroId: 1 };
      const headers = buildProtobufHeaders(config);

      expect(headers.moovit_metro_id).toBe('1');
      expect(headers.accept).toBe('application/x-protobuf');
    });
  });

  describe('generateUserKey', () => {
    it('should generate 6-character key', () => {
      const key = generateUserKey();

      expect(key).toHaveLength(6);
    });

    it('should contain only valid characters', () => {
      const key = generateUserKey();
      const validChars = /^[ABCDEF0-9]+$/;

      expect(key).toMatch(validChars);
    });

    it('should generate different keys on multiple calls', () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        keys.add(generateUserKey());
      }

      // Should generate many unique keys (allow some collisions due to randomness)
      expect(keys.size).toBeGreaterThan(90);
    });

    it('should only use uppercase hex characters', () => {
      const key = generateUserKey();

      for (const char of key) {
        expect('ABCDEF0123456789').toContain(char);
      }
    });

    it('should not contain lowercase letters', () => {
      const key = generateUserKey();

      expect(key).not.toMatch(/[a-z]/);
    });

    it('should not contain special characters', () => {
      const key = generateUserKey();

      expect(key).not.toMatch(/[^A-F0-9]/);
    });
  });

  describe('API_VERSION constant', () => {
    it('should have expected format', () => {
      expect(API_VERSION).toMatch(/^\d+\.\d+\.\d+\/V\d+$/);
    });

    it('should be defined', () => {
      expect(API_VERSION).toBeDefined();
      expect(typeof API_VERSION).toBe('string');
    });

    it('should have current value', () => {
      // Test current known version
      expect(API_VERSION).toBe('5.151.2/V567');
    });
  });
});
