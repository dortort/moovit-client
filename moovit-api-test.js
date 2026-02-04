/**
 * Moovit API Test with Puppeteer
 *
 * This script:
 * 1. Uses Puppeteer to navigate to moovitapp.com
 * 2. Waits for AWS WAF challenge to be solved
 * 3. Extracts the aws-waf-token cookie
 * 4. Tests API endpoints using the acquired token
 */

const puppeteer = require('puppeteer');

// API Configuration
const API_BASE = 'https://moovitapp.com/api';
const HEADERS = {
  'moovit_app_type': 'WEB_TRIP_PLANNER',
  'moovit_client_version': '5.151.2/V567',
  'moovit_customer_id': '4908',
  'moovit_metro_id': '1',
  'moovit_phone_type': '2',
  'moovit_user_key': 'F36627',
  'moovit_gtfs_language': 'EN',
  'accept': 'application/json'
};

// Route coordinates (lat * 1000000)
const ROUTES = {
  jerusalemCBS: { lat: 31789130, lon: 35203210, name: 'Central Bus Station Jerusalem' },
  azrieliMall: { lat: 32074370, lon: 34792120, name: 'Azrieli Mall Tel Aviv' }
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function acquireWafToken(page) {
  console.log('\n=== Step 1: Acquiring WAF Token ===\n');

  // Navigate to Moovit
  console.log('Navigating to moovitapp.com...');
  await page.goto('https://moovitapp.com/tripplan/israel-1/poi/en', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Wait for WAF challenge to complete
  console.log('Waiting for WAF challenge to complete...');
  await sleep(3000);

  // Get cookies
  const cookies = await page.cookies();
  const wafCookie = cookies.find(c => c.name === 'aws-waf-token');

  if (!wafCookie) {
    console.log('Available cookies:', cookies.map(c => c.name));
    throw new Error('WAF token cookie not found');
  }

  console.log('✅ WAF token acquired!');
  console.log(`   Token (first 50 chars): ${wafCookie.value.substring(0, 50)}...`);

  return cookies;
}

async function testAlertAPI(page, cookies) {
  console.log('\n=== Test: GET /api/alert ===\n');

  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await page.evaluate(async (headers, cookieStr) => {
    const res = await fetch('https://moovitapp.com/api/alert', {
      headers: headers,
      credentials: 'include'
    });
    return {
      status: res.status,
      data: await res.json()
    };
  }, HEADERS);

  console.log(`Status: ${response.status}`);
  console.log(`Response: ${JSON.stringify(response.data)}`);
  return response;
}

async function testRouteSearch(page, from, to) {
  console.log('\n=== Test: Route Search ===\n');
  console.log(`From: ${from.name}`);
  console.log(`To: ${to.name}`);

  const timestamp = Date.now();
  const url = `${API_BASE}/route/search?` + new URLSearchParams({
    tripPlanPref: '2',
    time: timestamp.toString(),
    timeType: '2',
    isCurrentTime: 'true',
    routeTypes: '3,5,4,7,6,2,1,0',
    routeTransportOptions: '1,5',
    fromLocation_id: '0',
    fromLocation_type: '6',
    fromLocation_latitude: from.lat.toString(),
    fromLocation_longitude: from.lon.toString(),
    fromLocation_caption: from.name,
    toLocation_id: '0',
    toLocation_type: '6',
    toLocation_latitude: to.lat.toString(),
    toLocation_longitude: to.lon.toString(),
    toLocation_caption: to.name
  });

  const response = await page.evaluate(async (searchUrl, headers) => {
    const res = await fetch(searchUrl, {
      headers: headers,
      credentials: 'include'
    });
    return {
      status: res.status,
      data: await res.json()
    };
  }, url, HEADERS);

  console.log(`Status: ${response.status}`);
  console.log(`Token: ${response.data.token || 'Not found'}`);

  return response.data.token;
}

async function testRouteResult(page, token) {
  console.log('\n=== Test: Route Results ===\n');

  const url = `${API_BASE}/route/result?token=${encodeURIComponent(token)}&offset=0`;

  const response = await page.evaluate(async (resultUrl, headers) => {
    const res = await fetch(resultUrl, {
      headers: headers,
      credentials: 'include'
    });
    return {
      status: res.status,
      data: await res.json()
    };
  }, url, HEADERS);

  console.log(`Status: ${response.status}`);
  console.log(`Results count: ${response.data.results?.length || 0}`);
  console.log(`Completed: ${response.data.completed}`);

  // Parse and display route options
  if (response.data.results) {
    console.log('\n--- Available Route Categories ---\n');

    response.data.results.forEach((result, i) => {
      if (result.result?.tripPlanSections?.tripPlanSections) {
        result.result.tripPlanSections.tripPlanSections.forEach(section => {
          console.log(`  • ${section.name}`);
        });
      }

      if (result.result?.itinerary) {
        const itin = result.result.itinerary;
        console.log(`\n--- Option: ${itin.sectionName || 'Route'} ---`);

        let totalDuration = 0;
        itin.legs?.forEach((leg, j) => {
          const legType = Object.keys(leg)[0];
          const legData = leg[legType];
          const time = legData.time || {};
          const duration = time.endTimeUtc && time.startTimeUtc
            ? Math.round((time.endTimeUtc - time.startTimeUtc) / 60000)
            : 0;
          totalDuration += duration;

          switch (legType) {
            case 'walkLeg':
              const walkDist = legData.shape?.distanceInMeters || 0;
              console.log(`  ${j+1}. 🚶 WALK: ${Math.round(walkDist)}m (${duration} min)`);
              break;
            case 'transitLeg':
              const line = legData.line || {};
              const lineName = line.shortName || line.number || '?';
              const agency = line.agencyName || '';
              const stops = legData.numOfStopsInLeg || 0;
              console.log(`  ${j+1}. 🚌 TRANSIT: Line ${lineName} (${agency})`);
              console.log(`       From: ${legData.origin?.caption || '?'}`);
              console.log(`       To: ${legData.dest?.caption || '?'}`);
              console.log(`       Stops: ${stops}, Duration: ${duration} min`);
              break;
            case 'taxiLeg':
              const provider = legData.taxiProviderName || 'Taxi';
              const taxiDist = legData.shape?.distanceInMeters || 0;
              console.log(`  ${j+1}. 🚕 TAXI (${provider}): ${(taxiDist/1000).toFixed(1)}km (${duration} min)`);
              break;
            case 'waitToTaxiLeg':
              const waitMin = Math.round((legData.approxWaitingSecFromOrdering || 0) / 60);
              console.log(`  ${j+1}. ⏳ WAIT for taxi: ~${waitMin} min`);
              break;
            case 'waitLeg':
              console.log(`  ${j+1}. ⏳ WAIT: ${duration} min`);
              break;
            case 'pathwayWalkLeg':
              console.log(`  ${j+1}. 🚶 WALK (pathway): ${duration} min`);
              break;
            case 'waitToMultiLineLeg':
              console.log(`  ${j+1}. ⏳ WAIT for bus`);
              break;
            case 'lineWithAlternativesLeg':
              const lines = legData.lineWithAlternatives || legData.lines || [];
              if (lines.length > 0) {
                const mainLine = lines[0]?.line || {};
                const mainLineName = mainLine.shortName || mainLine.number || '?';
                const mainAgency = mainLine.agencyName || '';
                const dest = legData.dest?.caption || lines[0]?.dest?.caption || '?';
                const origin = legData.origin?.caption || lines[0]?.origin?.caption || '?';
                console.log(`  ${j+1}. 🚌 BUS ${mainLineName} (${mainAgency})`);
                console.log(`       ${origin} → ${dest}`);
                if (lines.length > 1) {
                  console.log(`       Alternatives: ${lines.slice(1).map(l => l.line?.shortName).join(', ')}`);
                }
              } else {
                console.log(`  ${j+1}. 🚌 BUS (details in response)`);
              }
              break;
            default:
              console.log(`  ${j+1}. ${legType}: ${duration} min`);
          }
        });

        // Calculate total from first/last leg times
        if (itin.legs?.length > 0) {
          const firstLeg = itin.legs[0];
          const lastLeg = itin.legs[itin.legs.length - 1];
          const firstType = Object.keys(firstLeg)[0];
          const lastType = Object.keys(lastLeg)[0];
          const startTime = firstLeg[firstType]?.time?.startTimeUtc;
          const endTime = lastLeg[lastType]?.time?.endTimeUtc;
          if (startTime && endTime) {
            const totalMin = Math.round((endTime - startTime) / 60000);
            console.log(`\n  TOTAL TIME: ${totalMin} min (${Math.floor(totalMin/60)}h ${totalMin%60}m)`);
          }
        }
      }
    });
  }

  return response;
}

async function testLinesArrival(page) {
  console.log('\n=== Test: Lines Arrival ===\n');

  const response = await page.evaluate(async (headers) => {
    const res = await fetch('https://moovitapp.com/api/lines/linesarrival', {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        params: {
          lineStopPairs: [
            { lineId: 6623410, stopId: 72956 },
            { lineId: 6007876, stopId: 73017 }
          ]
        }
      }),
      credentials: 'include'
    });
    return {
      status: res.status,
      data: await res.json()
    };
  }, HEADERS);

  console.log(`Status: ${response.status}`);

  if (Array.isArray(response.data)) {
    response.data.forEach(stop => {
      console.log(`\nStop ${stop.stopId}:`);
      const arrivals = stop.lineArrivals?.arrivals || [];
      if (arrivals.length === 0) {
        console.log('  No arrivals currently');
      } else {
        arrivals.forEach(arr => {
          const etaMin = Math.round((arr.rtEtdUTC - Date.now()) / 60000);
          console.log(`  Line ${stop.lineArrivals.lineId}: ${etaMin} min`);
        });
      }
      console.log(`  Next poll: ${stop.nextPollingIntervalSecs}s`);
    });
  }

  return response;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     MOOVIT API TEST WITH PUPPETEER                       ║');
  console.log('║     Route: Jerusalem CBS → Azrieli Mall Tel Aviv         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36');

    // Step 1: Acquire WAF token
    const cookies = await acquireWafToken(page);

    // Step 2: Test Alert API
    await testAlertAPI(page, cookies);

    // Step 3: Test Route Search
    const token = await testRouteSearch(
      page,
      ROUTES.jerusalemCBS,
      ROUTES.azrieliMall
    );

    if (token) {
      // Wait a bit for results to be ready
      await sleep(1000);

      // Step 4: Get Route Results
      await testRouteResult(page, token);
    }

    // Step 5: Test Lines Arrival
    await testLinesArrival(page);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     ALL TESTS COMPLETE                                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

main();
