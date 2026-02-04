#!/bin/bash

COOKIE='eupubconsent-v2=CQfHDcgQfHDcgAcABBFRCQFgAAAAAAAAAChQAAAXsgKgA4AGaAZ8BHgCVQHbAQUAjSBIgCSgEowJkgUWAo4BVICsAFcwK-gWrAt4BewAAAAA.YAAAAAAAAAAA; OptanonAlertBoxClosed=2026-02-04T11:57:43.064Z; AMP_TOKEN=%24NOT_FOUND; _gid=GA1.2.1619665831.1770206338; _ga_BXEN30Q9C7=GS2.1.s1770206258$o1$g1$t1770206861$j60$l0$h0; _ga_WJGSXBP16Y=GS2.1.s1770206258$o1$g1$t1770206861$j60$l0$h0; mv_lang=en; _ga=GA1.2.910008413.1770206259; mv_metro=1; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Feb+04+2026+07%3A30%3A13+GMT-0500+(Eastern+Standard+Time)&version=202506.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=05cf70bc-3b02-4251-8a5c-18d2ae05e1dd&interactionCount=2&isAnonUser=1&landingPath=NotLandingPage&AwaitingReconsent=false&groups=C0002%3A0%2CC0004%3A0%2CV2STACK42%3A0&intType=2&geolocation=FR%3BIDF; aws-waf-token=26ac0c56-ba3c-4a33-a139-d6e433ac8ab6:IAoApyRXzm8QAAAA:f28aKbsHyNlntiRUCSU2cr8nzNs79I8PlcIT9NOyDU0tfP+TtOFo0MDAkybSXA8kLAmmRkbW8O7t6/N0o1UsqfscQ1PDA/VvpsCDnI/Ghn9FHc2J2Upn+n9d0XMSqHX50NMizv2KPuAJ8FQ1n+8TtJhE0Bli2AnU64XdnUEnReu++mUwGsxV4MsFxv3hfg=='

COMMON_HEADERS=(
  -H "accept: application/json"
  -H "moovit_app_type: WEB_TRIP_PLANNER"
  -H "moovit_client_version: 5.151.2/V567"
  -H "moovit_customer_id: 4908"
  -H "moovit_metro_id: 1"
  -H "moovit_phone_type: 2"
  -H "moovit_user_key: F36627"
  -H "moovit_gtfs_language: EN"
  -H "Cookie: $COOKIE"
  -H "Referer: https://moovitapp.com/tripplan/"
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
)

echo "============================================"
echo "        MOOVIT API ENDPOINT TESTS"
echo "============================================"
echo ""

echo "=== 1. GET /api/alert ==="
echo "Get service alerts for metro area"
curl -s "https://moovitapp.com/api/alert" "${COMMON_HEADERS[@]}"
echo -e "\n"

echo "=== 2. GET /api/alert/metro ==="
echo "Get metro-level alerts"
curl -s "https://moovitapp.com/api/alert/metro" "${COMMON_HEADERS[@]}" | head -c 500
echo -e "\n"

echo "=== 3. GET /api/alert/entities ==="
echo "Get alert entities"
curl -s "https://moovitapp.com/api/alert/entities" "${COMMON_HEADERS[@]}" | head -c 500
echo -e "\n"

echo "=== 4. GET /api/image?ids=... ==="
echo "Get transit images by ID"
curl -s "https://moovitapp.com/api/image?ids=13560,291729" "${COMMON_HEADERS[@]}" | head -c 400
echo -e "\n"

echo "=== 5. GET /api/route/search ==="
echo "Search routes Jerusalem -> Tel Aviv"
ROUTE_RESPONSE=$(curl -s "https://moovitapp.com/api/route/search?tripPlanPref=2&time=$(date +%s)000&timeType=2&isCurrentTime=true&routeTypes=3,5,4,7,6,2,1,0&routeTransportOptions=1,5&fromLocation_id=0&fromLocation_type=6&fromLocation_latitude=31789130&fromLocation_longitude=35203210&fromLocation_caption=Jerusalem&toLocation_id=0&toLocation_type=6&toLocation_latitude=32075369&toLocation_longitude=34775131&toLocation_caption=TelAviv" "${COMMON_HEADERS[@]}")
echo "$ROUTE_RESPONSE"
TOKEN=$(echo "$ROUTE_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo -e "\n"

echo "=== 6. GET /api/route/result ==="
echo "Get route results (using token from search)"
if [ -n "$TOKEN" ]; then
  curl -s "https://moovitapp.com/api/route/result?token=$TOKEN&offset=0" "${COMMON_HEADERS[@]}" | head -c 1500
else
  echo "No token available"
fi
echo -e "\n"

echo "=== 7. POST /api/lines/linesarrival ==="
echo "Get real-time arrivals for line/stop pairs"
curl -s -X POST "https://moovitapp.com/api/lines/linesarrival" \
  "${COMMON_HEADERS[@]}" \
  -H "content-type: application/json" \
  -d '{"params":{"lineStopPairs":[{"lineId":6623410,"stopId":72956},{"lineId":6007876,"stopId":73017}]}}'
echo -e "\n"

echo "=== 8. POST /api/lines/linearrival ==="
echo "Get arrivals for specific line at stop"
curl -s -X POST "https://moovitapp.com/api/lines/linearrival" \
  "${COMMON_HEADERS[@]}" \
  -H "content-type: application/json" \
  -d '{"stopId":46034316,"lineIds":"{\"ids\":[7286381]}"}'
echo -e "\n"

echo "=== 9. GET /api/lines/agency_order ==="
echo "Get agency ordering"
curl -s "https://moovitapp.com/api/lines/agency_order" "${COMMON_HEADERS[@]}" | head -c 500
echo -e "\n"

echo "=== 10. GET /api/lines/agency ==="
echo "Get agency details"
curl -s "https://moovitapp.com/api/lines/agency" "${COMMON_HEADERS[@]}" | head -c 500
echo -e "\n"

echo "=== 11. GET /api/nearby/stops ==="
echo "Get nearby stops (protobuf response)"
curl -s "https://moovitapp.com/api/nearby/stops?tilesLatLngs=3520,3178&revision=$(date +%s)000&metroId=1" \
  "${COMMON_HEADERS[@]}" \
  -H "accept: application/x-protobuf" \
  -H "protobuf-version: V3" \
  -w "\nHTTP: %{http_code}, Size: %{size_download} bytes" -o /dev/null
echo -e "\n"

echo "=== 12. GET /api/nearby/microMobility ==="
echo "Get micro-mobility options (scooters, bikes)"
curl -s "https://moovitapp.com/api/nearby/microMobility?metroId=1&tilesLatLngs=3520,3178&customerKey=moovit" \
  "${COMMON_HEADERS[@]}" \
  -H "accept: application/x-protobuf" \
  -H "protobuf-version: V3" \
  -w "\nHTTP: %{http_code}, Size: %{size_download} bytes" -o /dev/null
echo -e "\n"

echo "=== 13. GET /api/nearby/stopsAdditionalData ==="
echo "Get additional stop data"
curl -s "https://moovitapp.com/api/nearby/stopsAdditionalData?stopsIds=13561,13040,29688899&metroId=1&getLineDepartures=false" \
  "${COMMON_HEADERS[@]}" \
  -H "accept: application/x-protobuf" \
  -H "protobuf-version: V3" \
  -w "\nHTTP: %{http_code}, Size: %{size_download} bytes" -o /dev/null
echo -e "\n"

echo "=== 14. POST /api/lines/search ==="
echo "Search for lines (protobuf)"
curl -s -X POST "https://moovitapp.com/api/lines/search" \
  "${COMMON_HEADERS[@]}" \
  -H "content-type: application/json" \
  -H "accept: application/x-protobuf" \
  -H "protobuf-version: V3" \
  -d '{"query":"CB4QABoCOTA="}' \
  -w "\nHTTP: %{http_code}, Size: %{size_download} bytes" -o /dev/null
echo -e "\n"

echo "=== 15. POST /api/location ==="
echo "Search locations (protobuf)"
curl -s -X POST "https://moovitapp.com/api/location" \
  "${COMMON_HEADERS[@]}" \
  -H "content-type: application/json" \
  -H "accept: application/x-protobuf" \
  -H "protobuf-version: V3" \
  -d '{"query":"CgpKZXJ1c2FsZW0="}' \
  -w "\nHTTP: %{http_code}, Size: %{size_download} bytes" -o /dev/null
echo -e "\n"

echo "============================================"
echo "        ALL TESTS COMPLETE"
echo "============================================"
