export const ROUTING_QUERIES = {
  // $1:id  $2:userId  $3:vehicleId  $4:requestHash
  // $5:originAddress  $6:originLng  $7:originLat
  // $8:destAddress    $9:destLng   $10:destLat
  // $11:waypointsJson  $12:departureTime  $13:provider  $14:rawResponse
  INSERT_CALCULATION: `
    INSERT INTO toll_calculations (
      id, user_id, vehicle_id, request_hash,
      origin_address,   origin_location,
      destination_address, destination_location,
      waypoints_json, departure_time, provider, currency, raw_response
    ) VALUES (
      $1, $2, $3, $4,
      $5,  ST_SetSRID(ST_MakePoint($6, $7),   4326)::geography,
      $8,  ST_SetSRID(ST_MakePoint($9, $10),  4326)::geography,
      $11, $12, $13, 'MXN', $14
    )
    RETURNING id
  `,

  // $1:id  $2:calculationId  $3:routeIndex  $4:labels
  // $5:hasTolls  $6:distanceMeters  $7:durationSeconds  $8:tollCount
  // $9:fuelCost  $10:tagCost  $11:cashCost  $12:grandTotal
  // $13:polyline  $14:googleMapsUrl
  INSERT_ROUTE: `
    INSERT INTO toll_calculation_routes (
      id, calculation_id, route_index, labels,
      has_tolls, distance_meters, duration_seconds, toll_count,
      fuel_cost, tag_cost, cash_cost, grand_total,
      polyline, google_maps_url
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14
    )
    RETURNING id
  `,

  // $1:routeId  $2:sequenceOrder  $3:tollBoothId  $4:tollSectionId
  // $5:eventType  $6:boothName
  // $7:cashCost  $8:tagPriCost  $9:costApplied
  // $10:paymentMethodUsed  $11:arrivalTime
  INSERT_ROUTE_BOOTH: `
    INSERT INTO toll_calculation_route_booths (
      route_id, sequence_order, toll_booth_id, toll_section_id,
      event_type, booth_name,
      cash_cost, tag_pri_cost, cost_applied,
      payment_method_used, arrival_time
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6,
      $7, $8, $9,
      $10, $11
    )
  `,

  // $1:routeId  $2:sequenceOrder  $3:lat  $4:lng
  // $5:instruction  $6:distanceMeters  $7:durationSeconds
  INSERT_DIRECTION_STEP: `
    INSERT INTO toll_calculation_route_directions (
      route_id, sequence_order, lat, lng,
      instruction, distance_meters, duration_seconds
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7
    )
  `,

  // $1:id  $2:userId
  FIND_CALCULATION_BY_ID: `
    SELECT
      id,
      user_id,
      vehicle_id,
      request_hash,
      origin_address,
      ST_Y(origin_location::geometry)      AS origin_lat,
      ST_X(origin_location::geometry)      AS origin_lng,
      destination_address,
      ST_Y(destination_location::geometry) AS destination_lat,
      ST_X(destination_location::geometry) AS destination_lng,
      waypoints_json,
      departure_time,
      provider,
      created_at
    FROM toll_calculations
    WHERE id = $1 AND user_id = $2
  `,

  // $1:calculationId
  FIND_ROUTES_BY_CALCULATION: `
    SELECT
      id, route_index, labels,
      has_tolls, distance_meters, duration_seconds, toll_count,
      fuel_cost, tag_cost, cash_cost, grand_total,
      polyline, google_maps_url
    FROM toll_calculation_routes
    WHERE calculation_id = $1
    ORDER BY route_index
  `,

  // $1:routeId
  FIND_BOOTHS_BY_ROUTE: `
    SELECT
      sequence_order, toll_booth_id,
      event_type, booth_name,
      cash_cost, tag_pri_cost, cost_applied,
      payment_method_used, arrival_time
    FROM toll_calculation_route_booths
    WHERE route_id = $1
    ORDER BY sequence_order
  `,

  // $1:routeId
  FIND_DIRECTIONS_BY_ROUTE: `
    SELECT
      sequence_order, lat, lng,
      instruction, distance_meters, duration_seconds
    FROM toll_calculation_route_directions
    WHERE route_id = $1
    ORDER BY sequence_order
  `,

  // $1:requestHash  $2:userId
  FIND_CALCULATION_BY_HASH: `
    SELECT id
    FROM toll_calculations
    WHERE request_hash = $1 AND user_id = $2
    LIMIT 1
  `,

  // $1:userId  $2:limit  $3:offset
  FIND_CALCULATIONS_BY_USER: `
    SELECT
      tc.id,
      tc.origin_address,
      ST_Y(tc.origin_location::geometry)      AS origin_lat,
      ST_X(tc.origin_location::geometry)      AS origin_lng,
      tc.destination_address,
      ST_Y(tc.destination_location::geometry) AS destination_lat,
      ST_X(tc.destination_location::geometry) AS destination_lng,
      tc.provider,
      tc.created_at,
      COUNT(tcr.id)::int          AS route_count,
      MIN(tcr.grand_total)        AS cheapest_route_cost
    FROM toll_calculations tc
    LEFT JOIN toll_calculation_routes tcr ON tcr.calculation_id = tc.id
    WHERE tc.user_id = $1
    GROUP BY tc.id
    ORDER BY tc.created_at DESC
    LIMIT $2 OFFSET $3
  `,

  COUNT_BY_USER: `
    SELECT COUNT(*)::int AS total
    FROM toll_calculations
    WHERE user_id = $1
  `,
};
