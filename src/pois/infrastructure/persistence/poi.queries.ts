export const POI_QUERIES = {
  FIND_POIS_NEARBY: `
    SELECT
        p.id,
        p.name,
        p.poi_type       AS type,
        p.brand,
        ST_Y(p.location::geometry) AS lat,
        ST_X(p.location::geometry) AS lng,
        p.address,
        p.metadata,
        p.source,
        p.verified,
        p.created_at,
        p.updated_at,
        ROUND(
        (ST_Distance(p.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000.0)::numeric,
        2) AS distance_km
        FROM pois p WHERE
        ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
            $3 * 1000
        )
        AND ($4::VARCHAR IS NULL OR p.poi_type = $4)
        ORDER BY p.location <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        LIMIT 100;`,

  FIND_POIS_ALONG_ROUTE: `
        SELECT DISTINCT ON (p.id)
            p.id,
            p.name,
            p.poi_type       AS type,
            p.brand,
            ST_Y(p.location::geometry) AS lat,
            ST_X(p.location::geometry) AS lng,
            p.address,
            p.metadata,
            p.source,
            p.verified,
            p.created_at,
            p.updated_at,
            NULL::NUMERIC AS distance_km
            FROM pois p
            WHERE
            ST_DWithin(
                p.location,
                ST_GeomFromText($1, 4326)::geography,
                $2
            )
            AND ($3::VARCHAR IS NULL OR p.poi_type = $3)
            ORDER BY p.id;
        `,
};
