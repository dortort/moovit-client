#!/bin/bash

# Route Test: Jerusalem Central Bus Station → Azrieli Mall Tel Aviv

COOKIE='mv_lang=en; mv_metro=1; aws-waf-token=26ac0c56-ba3c-4a33-a139-d6e433ac8ab6:IAoAhN9ZmAcOAAAA:2MLbpbFULcUgOwj+atYAa2E0Nj3TbFd0+nLJAxgOrCC0QBzbZEHFyFcpg1El07+CxPcPSdMO9tTBKDK3AG9bPslDUROJ5Q6Qexpx/o4r1aKoJBE5YDggNBIbId5Pp3R3kwv53iCS5vsBBCUgebWx+o45alAWkkjAn6KLJnccDR7C1+DVMQqOWMoa48ny4w=='

# Coordinates (lat * 1000000, lon * 1000000)
# Jerusalem Central Bus Station: 31.789130, 35.203210
FROM_LAT=31789130
FROM_LON=35203210
FROM_NAME="Central%20Bus%20Station%20Jerusalem"

# Azrieli Mall Tel Aviv: 32.074370, 34.792120
TO_LAT=32074370
TO_LON=34792120
TO_NAME="Azrieli%20Mall%20Tel%20Aviv"

TIMESTAMP=$(date +%s)000

echo "=============================================="
echo "  ROUTE TEST: Jerusalem CBS → Azrieli Mall"
echo "=============================================="
echo ""
echo "From: Jerusalem Central Bus Station (31.789130, 35.203210)"
echo "To:   Azrieli Mall Tel Aviv (32.074370, 34.792120)"
echo "Time: $(date)"
echo ""

echo "=== STEP 1: Initiating Route Search ==="
SEARCH_RESPONSE=$(curl -s "https://moovitapp.com/api/route/search?tripPlanPref=2&time=${TIMESTAMP}&timeType=2&isCurrentTime=true&routeTypes=3,5,4,7,6,2,1,0&routeTransportOptions=1,5&fromLocation_id=0&fromLocation_type=6&fromLocation_latitude=${FROM_LAT}&fromLocation_longitude=${FROM_LON}&fromLocation_caption=${FROM_NAME}&toLocation_id=0&toLocation_type=6&toLocation_latitude=${TO_LAT}&toLocation_longitude=${TO_LON}&toLocation_caption=${TO_NAME}" \
  -H "accept: application/json" \
  -H "moovit_app_type: WEB_TRIP_PLANNER" \
  -H "moovit_client_version: 5.151.2/V567" \
  -H "moovit_customer_id: 4908" \
  -H "moovit_metro_id: 1" \
  -H "moovit_phone_type: 2" \
  -H "moovit_user_key: F36627" \
  -H "moovit_gtfs_language: EN" \
  -H "Cookie: $COOKIE" \
  -H "Referer: https://moovitapp.com/tripplan/")

echo "Search Response: $SEARCH_RESPONSE"
TOKEN=$(echo "$SEARCH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get routing token"
  exit 1
fi

echo ""
echo "=== STEP 2: Polling for Route Results ==="
echo "Token: ${TOKEN:0:50}..."
echo ""

# Poll for results
sleep 1
RESULT_RESPONSE=$(curl -s "https://moovitapp.com/api/route/result?token=$TOKEN&offset=0" \
  -H "accept: application/json" \
  -H "moovit_app_type: WEB_TRIP_PLANNER" \
  -H "moovit_client_version: 5.151.2/V567" \
  -H "moovit_customer_id: 4908" \
  -H "moovit_metro_id: 1" \
  -H "moovit_phone_type: 2" \
  -H "moovit_user_key: F36627" \
  -H "moovit_gtfs_language: EN" \
  -H "Cookie: $COOKIE" \
  -H "Referer: https://moovitapp.com/tripplan/")

# Save full response
echo "$RESULT_RESPONSE" > /tmp/route_result.json
echo "Full response saved to /tmp/route_result.json"
echo ""

echo "=== STEP 3: Parsing Route Options ==="
echo ""

# Use Python to parse JSON if available, otherwise use grep
if command -v python3 &> /dev/null; then
python3 << 'PYTHON_SCRIPT'
import json
import sys
from datetime import datetime

try:
    with open('/tmp/route_result.json', 'r') as f:
        data = json.load(f)
except:
    print("Failed to parse JSON")
    sys.exit(1)

results = data.get('results', [])
completed = data.get('completed', 0)

print(f"Found {len(results)} result items (completed: {completed})")
print("")

# Parse sections first
sections = {}
for r in results:
    if 'tripPlanSections' in r.get('result', {}):
        for sec in r['result']['tripPlanSections'].get('tripPlanSections', []):
            sections[sec.get('sectionId')] = sec.get('name', 'Unknown')

# Parse itineraries
itinerary_count = 0
for r in results:
    result = r.get('result', {})
    if 'itinerary' not in result:
        continue

    itinerary_count += 1
    itin = result['itinerary']
    section_id = itin.get('sectionId', 0)
    section_name = sections.get(section_id, f"Section {section_id}")

    print(f"{'='*50}")
    print(f"OPTION {itinerary_count}: {section_name}")
    print(f"{'='*50}")

    legs = itin.get('legs', [])
    total_duration = 0

    for i, leg in enumerate(legs, 1):
        leg_type = list(leg.keys())[0] if leg else "unknown"
        leg_data = leg.get(leg_type, {})

        time_data = leg_data.get('time', {})
        start = time_data.get('startTimeUtc', 0)
        end = time_data.get('endTimeUtc', 0)
        duration_sec = (end - start) // 1000 if start and end else 0
        duration_min = duration_sec // 60

        if leg_type == 'walkLeg':
            shape = leg_data.get('shape', {})
            dist = shape.get('distanceInMeters', 0)
            print(f"  {i}. 🚶 WALK: {dist:.0f}m ({duration_min} min)")

        elif leg_type == 'transitLeg':
            line = leg_data.get('line', {})
            line_name = line.get('shortName', line.get('number', '?'))
            agency = line.get('agencyName', '')
            origin = leg_data.get('origin', {}).get('caption', '')
            dest = leg_data.get('dest', {}).get('caption', '')
            stops = leg_data.get('numOfStopsInLeg', 0)
            print(f"  {i}. 🚌 TRANSIT Line {line_name} ({agency})")
            print(f"      From: {origin}")
            print(f"      To:   {dest}")
            print(f"      Stops: {stops}, Duration: {duration_min} min")

        elif leg_type == 'taxiLeg':
            provider = leg_data.get('taxiProviderName', 'Taxi')
            shape = leg_data.get('shape', {})
            dist = shape.get('distanceInMeters', 0)
            print(f"  {i}. 🚕 TAXI ({provider}): {dist/1000:.1f}km ({duration_min} min)")

        elif leg_type == 'waitToTaxiLeg':
            wait_min = leg_data.get('approxWaitingSecFromOrdering', 0) // 60
            print(f"  {i}. ⏳ WAIT for taxi: ~{wait_min} min")

        elif leg_type == 'bikeLeg':
            shape = leg_data.get('shape', {})
            dist = shape.get('distanceInMeters', 0)
            print(f"  {i}. 🚲 BIKE: {dist/1000:.1f}km ({duration_min} min)")

        elif leg_type == 'waitLeg':
            print(f"  {i}. ⏳ WAIT: {duration_min} min")

        else:
            print(f"  {i}. {leg_type}: {duration_min} min")

        total_duration += duration_min

    # Get total time from first and last leg
    if legs:
        first_leg = legs[0]
        last_leg = legs[-1]
        first_type = list(first_leg.keys())[0]
        last_type = list(last_leg.keys())[0]
        start_time = first_leg[first_type].get('time', {}).get('startTimeUtc', 0)
        end_time = last_leg[last_type].get('time', {}).get('endTimeUtc', 0)
        if start_time and end_time:
            total_min = (end_time - start_time) // 60000
            print(f"\n  TOTAL TIME: {total_min} min ({total_min//60}h {total_min%60}m)")

    print("")

if itinerary_count == 0:
    print("No itineraries found in response. Raw data sample:")
    print(json.dumps(data, indent=2)[:2000])

PYTHON_SCRIPT
else
  echo "Python not available. Raw JSON response:"
  head -c 3000 /tmp/route_result.json
fi

echo ""
echo "=== TEST COMPLETE ==="
