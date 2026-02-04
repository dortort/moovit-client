/**
 * Service Alerts Example
 *
 * Demonstrates how to retrieve service alerts and disruption information.
 */
import { MoovitClient, AlertSeverity, AlertEffect } from '../src';

async function main() {
  const client = new MoovitClient({
    metroId: 61, // Paris
    language: 'FR',
    debug: true,
  });

  console.log('Initializing Moovit client...');
  await client.initialize();

  try {
    // Get all active alerts
    console.log('\nFetching service alerts for Paris...\n');
    const alerts = await client.alerts.getAlerts();

    if (alerts.length === 0) {
      console.log('No active alerts at this time.');
    } else {
      console.log(`Found ${alerts.length} active alerts:\n`);

      for (const alert of alerts.slice(0, 5)) {
        const severityLabel = getSeverityLabel(alert.severity);
        const effectLabel = getEffectLabel(alert.effect);

        console.log(`[${severityLabel}] ${alert.title}`);
        if (alert.description) {
          console.log(`  ${alert.description}`);
        }
        console.log(`  Effect: ${effectLabel}`);

        if (alert.affectedEntities && alert.affectedEntities.length > 0) {
          console.log(`  Affects: ${alert.affectedEntities.map((e) => e.name || e.type).join(', ')}`);
        }

        if (alert.startTime) {
          console.log(`  From: ${alert.startTime.toLocaleString('fr-FR')}`);
        }
        if (alert.endTime) {
          console.log(`  Until: ${alert.endTime.toLocaleString('fr-FR')}`);
        }

        console.log('');

        // Get detailed information for the first alert
        if (alerts.indexOf(alert) === 0) {
          console.log('Getting detailed information for first alert...\n');
          const details = await client.alerts.getAlertDetails(alert.id, 'fr');

          if (details) {
            console.log('Full description:');
            console.log(details.fullDescription || details.description || 'No additional details');
            console.log('');
          }
        }
      }
    }

    // Get metro-level alerts
    console.log('Fetching metro-level alerts...\n');
    const metroAlerts = await client.alerts.getMetroAlerts();
    console.log(`Found ${metroAlerts.length} metro-level alerts.`);
  } finally {
    await client.close();
    console.log('\nClient closed.');
  }
}

function getSeverityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.INFO:
      return 'INFO';
    case AlertSeverity.WARNING:
      return 'WARNING';
    case AlertSeverity.SEVERE:
      return 'SEVERE';
    default:
      return 'UNKNOWN';
  }
}

function getEffectLabel(effect: AlertEffect): string {
  switch (effect) {
    case AlertEffect.NO_SERVICE:
      return 'No Service';
    case AlertEffect.REDUCED_SERVICE:
      return 'Reduced Service';
    case AlertEffect.SIGNIFICANT_DELAYS:
      return 'Significant Delays';
    case AlertEffect.DETOUR:
      return 'Detour';
    case AlertEffect.ADDITIONAL_SERVICE:
      return 'Additional Service';
    case AlertEffect.MODIFIED_SERVICE:
      return 'Modified Service';
    case AlertEffect.STOP_MOVED:
      return 'Stop Moved';
    case AlertEffect.OTHER_EFFECT:
      return 'Other Effect';
    default:
      return 'Unknown Effect';
  }
}

main().catch(console.error);
