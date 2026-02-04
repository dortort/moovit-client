/**
 * Real-time Arrivals Example
 *
 * Demonstrates how to get real-time arrival information for transit lines.
 */
import { MoovitClient } from '../src';

async function main() {
  const client = new MoovitClient({
    metroId: 662, // Paris
    debug: true,
  });

  console.log('Initializing Moovit client...');
  await client.initialize();

  try {
    // First, search for a route to get real line/stop IDs
    console.log('\nFinding a route to get line/stop information...\n');

    const routes = await client.routes.search({
      from: { type: 'text', query: 'Châtelet, Paris' },
      to: { type: 'text', query: 'La Défense, Paris' },
    });

    // Extract line/stop pairs from the route results
    const lineStopPairs: Array<{ lineId: number; stopId: number }> = [];

    for (const itinerary of routes.itineraries) {
      for (const leg of itinerary.legs) {
        if (leg.type === 'transit' && leg.line && leg.origin) {
          // Get line and stop IDs from the route
          const lineId = leg.line.id;
          const stopId = leg.origin.id;

          if (lineId && stopId && !lineStopPairs.some((p) => p.lineId === lineId)) {
            lineStopPairs.push({ lineId, stopId });
          }
        }
      }
    }

    if (lineStopPairs.length === 0) {
      console.log('No transit lines found in routes.');
      return;
    }

    console.log(`Found ${lineStopPairs.length} transit lines. Getting arrivals...\n`);

    // Get real-time arrivals
    const arrivals = await client.lines.getArrivals(lineStopPairs.slice(0, 3));

    for (const stop of arrivals) {
      console.log(`Stop ${stop.stopId} - Line ${stop.lineId}:`);

      if (stop.arrivals.length === 0) {
        console.log('  No upcoming arrivals');
        continue;
      }

      for (const arrival of stop.arrivals.slice(0, 3)) {
        const etaMinutes = Math.round(
          (arrival.realTimeEta.getTime() - Date.now()) / 60000
        );
        const scheduled = arrival.scheduledTime.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        console.log(`  Arriving in ${etaMinutes} min (scheduled: ${scheduled})`);

        if (arrival.vehicleLocation) {
          console.log(
            `    Vehicle at: ${arrival.vehicleLocation.coordinates.lat.toFixed(4)}, ${arrival.vehicleLocation.coordinates.lon.toFixed(4)}`
          );
        }
      }
      console.log('');
    }

    // Get agencies
    console.log('Transit agencies in Paris:\n');
    const agencies = await client.lines.getAgencies();

    for (const agency of agencies.slice(0, 5)) {
      console.log(`  - ${agency.name} (ID: ${agency.id})`);
    }
  } finally {
    await client.close();
    console.log('\nClient closed.');
  }
}

main().catch(console.error);
