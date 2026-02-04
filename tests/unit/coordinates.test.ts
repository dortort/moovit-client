import {
  toScaledCoordinates,
  fromScaledCoordinates,
  toScaled,
  fromScaled,
  calculateDistance,
  isValidCoordinates,
  COORDINATE_SCALE,
} from '../../src/utils/coordinates';
import { Coordinates, ScaledCoordinates } from '../../src/types';

describe('Coordinates Utils', () => {
  describe('toScaled', () => {
    it('should convert positive values correctly', () => {
      expect(toScaled(32.0853)).toBe(32085300);
      expect(toScaled(34.7818)).toBe(34781800);
    });

    it('should convert negative values correctly', () => {
      expect(toScaled(-32.0853)).toBe(-32085300);
      expect(toScaled(-34.7818)).toBe(-34781800);
    });

    it('should handle zero', () => {
      expect(toScaled(0)).toBe(0);
    });

    it('should round properly', () => {
      expect(toScaled(1.123456)).toBe(1123456);
      expect(toScaled(1.1234564)).toBe(1123456);
      expect(toScaled(1.1234565)).toBe(1123457);
    });

    it('should handle high precision decimals', () => {
      expect(toScaled(32.085312345678)).toBe(32085312);
      expect(toScaled(-34.781876543210)).toBe(-34781877);
    });

    it('should handle very small values', () => {
      expect(toScaled(0.000001)).toBe(1);
      expect(toScaled(0.0000001)).toBe(0);
    });

    it('should handle whole numbers', () => {
      expect(toScaled(32)).toBe(32000000);
      expect(toScaled(-34)).toBe(-34000000);
    });
  });

  describe('fromScaled', () => {
    it('should convert scaled values to real coordinates', () => {
      expect(fromScaled(32085300)).toBe(32.0853);
      expect(fromScaled(34781800)).toBe(34.7818);
    });

    it('should handle negative scaled values', () => {
      expect(fromScaled(-32085300)).toBe(-32.0853);
      expect(fromScaled(-34781800)).toBe(-34.7818);
    });

    it('should handle zero', () => {
      expect(fromScaled(0)).toBe(0);
    });

    it('should preserve precision', () => {
      expect(fromScaled(1123456)).toBe(1.123456);
      expect(fromScaled(123)).toBe(0.000123);
    });

    it('should be inverse of toScaled', () => {
      const original = 32.0853;
      expect(fromScaled(toScaled(original))).toBe(original);

      const negative = -34.7818;
      expect(fromScaled(toScaled(negative))).toBe(negative);
    });
  });

  describe('toScaledCoordinates', () => {
    it('should convert coordinate objects correctly', () => {
      const coords: Coordinates = { lat: 32.0853, lon: 34.7818 };
      const scaled = toScaledCoordinates(coords);

      expect(scaled).toEqual({
        latitude: 32085300,
        longitude: 34781800,
      });
    });

    it('should handle negative coordinates', () => {
      const coords: Coordinates = { lat: -32.0853, lon: -34.7818 };
      const scaled = toScaledCoordinates(coords);

      expect(scaled).toEqual({
        latitude: -32085300,
        longitude: -34781800,
      });
    });

    it('should handle zero coordinates', () => {
      const coords: Coordinates = { lat: 0, lon: 0 };
      const scaled = toScaledCoordinates(coords);

      expect(scaled).toEqual({
        latitude: 0,
        longitude: 0,
      });
    });

    it('should round coordinates properly', () => {
      const coords: Coordinates = { lat: 32.0853456, lon: 34.7817654 };
      const scaled = toScaledCoordinates(coords);

      expect(scaled).toEqual({
        latitude: 32085346,
        longitude: 34781765,
      });
    });
  });

  describe('fromScaledCoordinates', () => {
    it('should convert scaled coordinate objects to real', () => {
      const scaled: ScaledCoordinates = { latitude: 32085300, longitude: 34781800 };
      const coords = fromScaledCoordinates(scaled);

      expect(coords).toEqual({
        lat: 32.0853,
        lon: 34.7818,
      });
    });

    it('should handle negative scaled coordinates', () => {
      const scaled: ScaledCoordinates = { latitude: -32085300, longitude: -34781800 };
      const coords = fromScaledCoordinates(scaled);

      expect(coords).toEqual({
        lat: -32.0853,
        lon: -34.7818,
      });
    });

    it('should be inverse of toScaledCoordinates', () => {
      const original: Coordinates = { lat: 32.0853, lon: 34.7818 };
      const scaled = toScaledCoordinates(original);
      const result = fromScaledCoordinates(scaled);

      expect(result).toEqual(original);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two nearby points', () => {
      const tel_aviv: Coordinates = { lat: 32.0853, lon: 34.7818 };
      const tel_aviv_museum: Coordinates = { lat: 32.0777, lon: 34.7805 };

      const distance = calculateDistance(tel_aviv, tel_aviv_museum);

      // Distance should be roughly 850 meters
      expect(distance).toBeGreaterThan(800);
      expect(distance).toBeLessThan(900);
    });

    it('should calculate distance between far apart points', () => {
      const tel_aviv: Coordinates = { lat: 32.0853, lon: 34.7818 };
      const jerusalem: Coordinates = { lat: 31.7683, lon: 35.2137 };

      const distance = calculateDistance(tel_aviv, jerusalem);

      // Distance should be roughly 50-60 km
      expect(distance).toBeGreaterThan(45000);
      expect(distance).toBeLessThan(65000);
    });

    it('should return zero for same point', () => {
      const point: Coordinates = { lat: 32.0853, lon: 34.7818 };
      const distance = calculateDistance(point, point);

      expect(distance).toBe(0);
    });

    it('should handle crossing equator', () => {
      const north: Coordinates = { lat: 10, lon: 0 };
      const south: Coordinates = { lat: -10, lon: 0 };

      const distance = calculateDistance(north, south);

      // Distance should be roughly 2,222 km
      expect(distance).toBeGreaterThan(2200000);
      expect(distance).toBeLessThan(2250000);
    });

    it('should handle crossing date line', () => {
      const west: Coordinates = { lat: 0, lon: 179 };
      const east: Coordinates = { lat: 0, lon: -179 };

      const distance = calculateDistance(west, east);

      // Distance should be roughly 222 km
      expect(distance).toBeGreaterThan(200000);
      expect(distance).toBeLessThan(250000);
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates({ lat: 32.0853, lon: 34.7818 })).toBe(true);
      expect(isValidCoordinates({ lat: 0, lon: 0 })).toBe(true);
      expect(isValidCoordinates({ lat: -90, lon: -180 })).toBe(true);
      expect(isValidCoordinates({ lat: 90, lon: 180 })).toBe(true);
    });

    it('should reject latitude out of range', () => {
      expect(isValidCoordinates({ lat: 91, lon: 0 })).toBe(false);
      expect(isValidCoordinates({ lat: -91, lon: 0 })).toBe(false);
      expect(isValidCoordinates({ lat: 100, lon: 0 })).toBe(false);
      expect(isValidCoordinates({ lat: -100, lon: 0 })).toBe(false);
    });

    it('should reject longitude out of range', () => {
      expect(isValidCoordinates({ lat: 0, lon: 181 })).toBe(false);
      expect(isValidCoordinates({ lat: 0, lon: -181 })).toBe(false);
      expect(isValidCoordinates({ lat: 0, lon: 200 })).toBe(false);
      expect(isValidCoordinates({ lat: 0, lon: -200 })).toBe(false);
    });

    it('should reject NaN values', () => {
      expect(isValidCoordinates({ lat: NaN, lon: 0 })).toBe(false);
      expect(isValidCoordinates({ lat: 0, lon: NaN })).toBe(false);
      expect(isValidCoordinates({ lat: NaN, lon: NaN })).toBe(false);
    });

    it('should reject non-number types', () => {
      expect(isValidCoordinates({ lat: '32' as any, lon: 34 })).toBe(false);
      expect(isValidCoordinates({ lat: 32, lon: '34' as any })).toBe(false);
      expect(isValidCoordinates({ lat: null as any, lon: 0 })).toBe(false);
      expect(isValidCoordinates({ lat: 0, lon: undefined as any })).toBe(false);
    });

    it('should accept boundary values', () => {
      expect(isValidCoordinates({ lat: 90, lon: 180 })).toBe(true);
      expect(isValidCoordinates({ lat: -90, lon: -180 })).toBe(true);
      expect(isValidCoordinates({ lat: 90, lon: -180 })).toBe(true);
      expect(isValidCoordinates({ lat: -90, lon: 180 })).toBe(true);
    });
  });

  describe('COORDINATE_SCALE constant', () => {
    it('should have correct value', () => {
      expect(COORDINATE_SCALE).toBe(1_000_000);
    });
  });
});
