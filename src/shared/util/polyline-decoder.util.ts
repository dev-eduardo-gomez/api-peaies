export interface LatLng {
  lat: number;
  lng: number;
}

// Decodes a Google Maps encoded polyline into an array of coordinates.
// Spec: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(encoded: string): LatLng[] {
  const coords: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    lat += decodeChunk(encoded, index, (next) => (index = next));
    lng += decodeChunk(encoded, index, (next) => (index = next));
    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coords;
}

// Encodes an array of coordinates into a Google Maps encoded polyline string.
export function encodePolyline(coords: LatLng[]): string {
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const { lat, lng } of coords) {
    output += encodeValue(Math.round(lat * 1e5) - prevLat);
    output += encodeValue(Math.round(lng * 1e5) - prevLng);
    prevLat = Math.round(lat * 1e5);
    prevLng = Math.round(lng * 1e5);
  }

  return output;
}

// Converts a decoded polyline into a WKT LINESTRING for PostGIS queries.
export function polylineToWkt(encoded: string): string {
  const coords = decodePolyline(encoded);
  if (coords.length < 2)
    throw new Error('Polyline must have at least 2 points');
  const points = coords.map((c) => `${c.lng} ${c.lat}`).join(', ');
  return `LINESTRING(${points})`;
}

function decodeChunk(
  encoded: string,
  start: number,
  setIndex: (next: number) => void,
): number {
  let result = 0;
  let shift = 0;
  let index = start;
  let byte: number;

  do {
    byte = encoded.charCodeAt(index++) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  setIndex(index);
  return result & 1 ? ~(result >> 1) : result >> 1;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let output = '';
  while (v >= 0x20) {
    output += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  output += String.fromCharCode(v + 63);
  return output;
}
