import { KnownLocation, Coordinates } from '../types';
import { UnknownAliasError } from '../errors';

/**
 * Built-in known locations for Israel (metroId: 1)
 * These are major transit hubs, stations, and landmarks
 */
export const ISRAEL_KNOWN_LOCATIONS: KnownLocation[] = [
  // Tel Aviv
  {
    id: 'tel-aviv-central',
    name: 'Tel Aviv Central Bus Station',
    coordinates: { lat: 32.0561, lon: 34.7794 },
    aliases: ['tahana-merkazit-tel-aviv', 'ta-cbs'],
    category: 'bus-station',
  },
  {
    id: 'tel-aviv-savidor',
    name: 'Tel Aviv Savidor Center Railway Station',
    coordinates: { lat: 32.1040, lon: 34.8080 },
    aliases: ['savidor', 'tel-aviv-merkaz'],
    category: 'train-station',
  },
  {
    id: 'tel-aviv-hashalom',
    name: 'Tel Aviv HaShalom Railway Station',
    coordinates: { lat: 32.0725, lon: 34.7917 },
    aliases: ['hashalom', 'azrieli-station'],
    category: 'train-station',
  },
  {
    id: 'tel-aviv-university',
    name: 'Tel Aviv University Railway Station',
    coordinates: { lat: 32.1133, lon: 34.8044 },
    aliases: ['tau-station'],
    category: 'train-station',
  },
  {
    id: 'azrieli-mall',
    name: 'Azrieli Center',
    coordinates: { lat: 32.0744, lon: 34.7921 },
    aliases: ['azrieli'],
    category: 'landmark',
  },
  {
    id: 'dizengoff-center',
    name: 'Dizengoff Center',
    coordinates: { lat: 32.0755, lon: 34.7755 },
    aliases: ['dizengoff'],
    category: 'landmark',
  },
  {
    id: 'rabin-square',
    name: 'Rabin Square',
    coordinates: { lat: 32.0804, lon: 34.7810 },
    aliases: ['kikar-rabin'],
    category: 'landmark',
  },
  // Jerusalem
  {
    id: 'jerusalem-central',
    name: 'Jerusalem Central Bus Station',
    coordinates: { lat: 31.7891, lon: 35.2032 },
    aliases: ['tahana-merkazit-yerushalayim', 'jlm-cbs'],
    category: 'bus-station',
  },
  {
    id: 'jerusalem-navon',
    name: 'Jerusalem Yitzhak Navon Railway Station',
    coordinates: { lat: 31.7880, lon: 35.2030 },
    aliases: ['navon-station', 'jerusalem-station'],
    category: 'train-station',
  },
  {
    id: 'jerusalem-old-city',
    name: 'Jerusalem Old City - Jaffa Gate',
    coordinates: { lat: 31.7767, lon: 35.2276 },
    aliases: ['old-city', 'jaffa-gate'],
    category: 'landmark',
  },
  {
    id: 'western-wall',
    name: 'Western Wall',
    coordinates: { lat: 31.7767, lon: 35.2343 },
    aliases: ['kotel', 'wailing-wall'],
    category: 'landmark',
  },
  {
    id: 'mahane-yehuda',
    name: 'Mahane Yehuda Market',
    coordinates: { lat: 31.7851, lon: 35.2122 },
    aliases: ['shuk', 'the-shuk'],
    category: 'landmark',
  },
  // Haifa
  {
    id: 'haifa-hof-hacarmel',
    name: 'Haifa Hof HaCarmel Railway Station',
    coordinates: { lat: 32.7942, lon: 34.9576 },
    aliases: ['hof-hacarmel'],
    category: 'train-station',
  },
  {
    id: 'haifa-merkaz-hashmona',
    name: 'Haifa Merkaz HaShmona Railway Station',
    coordinates: { lat: 32.8040, lon: 34.9953 },
    aliases: ['haifa-merkaz'],
    category: 'train-station',
  },
  {
    id: 'haifa-bat-galim',
    name: 'Haifa Bat Galim Railway Station',
    coordinates: { lat: 32.8238, lon: 34.9686 },
    aliases: ['bat-galim'],
    category: 'train-station',
  },
  {
    id: 'haifa-central',
    name: 'Haifa Central Bus Station',
    coordinates: { lat: 32.7956, lon: 34.9946 },
    aliases: ['haifa-cbs'],
    category: 'bus-station',
  },
  // Beer Sheva
  {
    id: 'beer-sheva-central',
    name: 'Beer Sheva Central Railway Station',
    coordinates: { lat: 31.2433, lon: 34.7983 },
    aliases: ['beer-sheva-merkaz'],
    category: 'train-station',
  },
  {
    id: 'beer-sheva-north',
    name: 'Beer Sheva North Railway Station',
    coordinates: { lat: 31.2620, lon: 34.8082 },
    aliases: ['beer-sheva-tzafon'],
    category: 'train-station',
  },
  // Ben Gurion Airport
  {
    id: 'ben-gurion-airport',
    name: 'Ben Gurion International Airport',
    coordinates: { lat: 32.0055, lon: 34.8854 },
    aliases: ['tls', 'natbag', 'airport'],
    category: 'airport',
  },
  // Netanya
  {
    id: 'netanya-station',
    name: 'Netanya Railway Station',
    coordinates: { lat: 32.3260, lon: 34.8561 },
    aliases: ['netanya'],
    category: 'train-station',
  },
  // Herzliya
  {
    id: 'herzliya-station',
    name: 'Herzliya Railway Station',
    coordinates: { lat: 32.1553, lon: 34.8358 },
    aliases: ['herzliya'],
    category: 'train-station',
  },
  // Rishon LeZion
  {
    id: 'rishon-lezion-moshe-dayan',
    name: 'Rishon LeZion Moshe Dayan Railway Station',
    coordinates: { lat: 31.9897, lon: 34.7703 },
    aliases: ['rishon-moshe-dayan'],
    category: 'train-station',
  },
  {
    id: 'rishon-lezion-harishonim',
    name: 'Rishon LeZion HaRishonim Railway Station',
    coordinates: { lat: 31.9647, lon: 34.8060 },
    aliases: ['rishon-harishonim'],
    category: 'train-station',
  },
  // Petah Tikva
  {
    id: 'petah-tikva-kiryat-arye',
    name: 'Petah Tikva Kiryat Arye Railway Station',
    coordinates: { lat: 32.0894, lon: 34.8461 },
    aliases: ['kiryat-arye'],
    category: 'train-station',
  },
  // Rehovot
  {
    id: 'rehovot-station',
    name: 'Rehovot Railway Station',
    coordinates: { lat: 31.8931, lon: 34.8117 },
    aliases: ['rehovot'],
    category: 'train-station',
  },
  // Ashdod
  {
    id: 'ashdod-ad-halom',
    name: 'Ashdod Ad Halom Railway Station',
    coordinates: { lat: 31.7930, lon: 34.6426 },
    aliases: ['ashdod'],
    category: 'train-station',
  },
  // Ashkelon
  {
    id: 'ashkelon-station',
    name: 'Ashkelon Railway Station',
    coordinates: { lat: 31.6655, lon: 34.5747 },
    aliases: ['ashkelon'],
    category: 'train-station',
  },
  // Modiin
  {
    id: 'modiin-central',
    name: 'Modiin Central Railway Station',
    coordinates: { lat: 31.8989, lon: 35.0106 },
    aliases: ['modiin'],
    category: 'train-station',
  },
  // Nahariya
  {
    id: 'nahariya-station',
    name: 'Nahariya Railway Station',
    coordinates: { lat: 33.0089, lon: 35.0922 },
    aliases: ['nahariya'],
    category: 'train-station',
  },
  // Acre
  {
    id: 'akko-station',
    name: 'Akko Railway Station',
    coordinates: { lat: 32.9289, lon: 35.0747 },
    aliases: ['akko', 'acre'],
    category: 'train-station',
  },
];

/**
 * Registry for managing known locations and user aliases
 */
export class LocationRegistry {
  private locations: Map<string, KnownLocation> = new Map();
  private aliasMap: Map<string, string> = new Map();

  constructor(initialLocations: KnownLocation[] = ISRAEL_KNOWN_LOCATIONS) {
    for (const location of initialLocations) {
      this.register(location);
    }
  }

  /**
   * Register a new known location
   */
  register(location: KnownLocation): void {
    this.locations.set(location.id, location);
    this.aliasMap.set(location.id.toLowerCase(), location.id);
    this.aliasMap.set(location.name.toLowerCase(), location.id);

    if (location.aliases) {
      for (const alias of location.aliases) {
        this.aliasMap.set(alias.toLowerCase(), location.id);
      }
    }
  }

  /**
   * Register a user alias for an existing location
   */
  registerAlias(alias: string, locationId: string): void {
    if (!this.locations.has(locationId)) {
      throw new UnknownAliasError(locationId);
    }
    this.aliasMap.set(alias.toLowerCase(), locationId);
  }

  /**
   * Get a location by ID or alias
   */
  get(idOrAlias: string): KnownLocation | undefined {
    const normalizedKey = idOrAlias.toLowerCase();
    const locationId = this.aliasMap.get(normalizedKey);

    if (locationId) {
      return this.locations.get(locationId);
    }

    return undefined;
  }

  /**
   * Check if a location exists
   */
  has(idOrAlias: string): boolean {
    return this.aliasMap.has(idOrAlias.toLowerCase());
  }

  /**
   * Get all known locations
   */
  list(): KnownLocation[] {
    return Array.from(this.locations.values());
  }

  /**
   * Get coordinates for a location by ID or alias
   */
  getCoordinates(idOrAlias: string): Coordinates | undefined {
    const location = this.get(idOrAlias);
    return location?.coordinates;
  }

  /**
   * Search locations by partial name match
   */
  search(query: string): KnownLocation[] {
    const normalizedQuery = query.toLowerCase();
    const results: KnownLocation[] = [];

    for (const location of this.locations.values()) {
      if (
        location.name.toLowerCase().includes(normalizedQuery) ||
        location.id.toLowerCase().includes(normalizedQuery) ||
        location.aliases?.some(alias => alias.toLowerCase().includes(normalizedQuery))
      ) {
        results.push(location);
      }
    }

    return results;
  }

  /**
   * Get locations by category
   */
  getByCategory(category: KnownLocation['category']): KnownLocation[] {
    return this.list().filter(loc => loc.category === category);
  }

  /**
   * Get count of registered locations
   */
  get size(): number {
    return this.locations.size;
  }
}

/**
 * Default registry instance with Israeli locations
 */
export const defaultRegistry = new LocationRegistry();
