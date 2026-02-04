/**
 * Route Planning Example
 *
 * Demonstrates how to search for transit routes between two locations in Paris.
 */
import { MoovitClient } from '../src';

async function main() {
  // Create client for Paris (metroId: 662)
  const client = new MoovitClient({
    metroId: 662,
    language: 'FR',
    debug: true,
  });

  console.log('Initializing Moovit client...');
  await client.initialize();

  try {
    // Search for routes from Gare du Nord to Tour Eiffel
    console.log('\nSearching routes: Gare du Nord → Tour Eiffel...\n');

    const result = await client.routes.search({
      from: { type: 'text', query: 'Gare du Nord, Paris' },
      to: { type: 'text', query: 'Tour Eiffel, Paris' },
      departureTime: new Date(),
    });

    console.log(`Found ${result.itineraries.length} route options:\n`);

    for (let i = 0; i < result.itineraries.length; i++) {
      const itinerary = result.itineraries[i];
      console.log(`Route ${i + 1}:`);
      console.log(`  Total duration: ${itinerary.totalDuration} minutes`);
      console.log(`  Walking distance: ${itinerary.walkingDistance} meters`);
      console.log(`  Legs:`);

      for (const leg of itinerary.legs) {
        if (leg.type === 'walk') {
          console.log(`    🚶 Walk ${leg.distance}m (${leg.duration} min)`);
        } else if (leg.type === 'transit') {
          console.log(
            `    🚇 ${leg.line.shortName} → ${leg.destination.name} (${leg.duration} min)`
          );
        } else if (leg.type === 'wait') {
          console.log(`    ⏱️  Wait ${leg.duration} min`);
        }
      }
      console.log('');
    }

    // Example with coordinates
    console.log('Searching routes using coordinates...\n');

    const coordResult = await client.routes.search({
      from: { type: 'coordinates', lat: 48.8809, lon: 2.3553 }, // Gare de l'Est
      to: { type: 'coordinates', lat: 48.8606, lon: 2.3376 }, // Louvre
    });

    console.log(`Found ${coordResult.itineraries.length} routes from Gare de l'Est to Louvre`);
  } finally {
    await client.close();
    console.log('\nClient closed.');
  }
}

main().catch(console.error);
