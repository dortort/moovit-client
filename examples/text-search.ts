/**
 * Text Search Example
 *
 * Demonstrates how to search for locations by text query.
 */
import { MoovitClient } from '../src';

async function main() {
  const client = new MoovitClient({
    metroId: 61, // Paris
    debug: true,
  });

  console.log('Initializing Moovit client...');
  await client.initialize();

  try {
    // Search for locations
    const queries = [
      'Montmartre',
      'Champs-Élysées',
      'Notre-Dame',
      'Gare Saint-Lazare',
      'Opéra Garnier',
    ];

    for (const query of queries) {
      console.log(`\nSearching for: "${query}"`);
      console.log('-'.repeat(40));

      const results = await client.locations.search(query);

      if (results.length === 0) {
        console.log('  No results found');
        continue;
      }

      for (const result of results.slice(0, 3)) {
        console.log(`  ${result.name}`);
        if (result.subtitle) {
          console.log(`    ${result.subtitle}`);
        }
        console.log(`    Type: ${result.type}`);
        console.log(`    Coords: ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`);
        console.log('');
      }
    }

    // Resolve a single location
    console.log('\nResolving location: "Arc de Triomphe, Paris"');
    const location = await client.locations.resolve({
      type: 'text',
      query: 'Arc de Triomphe, Paris',
    });

    console.log(`Resolved to: ${location.caption}`);
    console.log(`Coordinates: ${location.coordinates.lat}, ${location.coordinates.lon}`);
  } finally {
    await client.close();
    console.log('\nClient closed.');
  }
}

main().catch(console.error);
