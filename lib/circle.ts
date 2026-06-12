export function buildGeodesicCircle(lat: number, lng: number, radiusMeters: number, points = 64) {
  const coordinates: [number, number][] = [];
  const earthRadius = 6371000;

  for (let i = 0; i <= points; i += 1) {
    const bearing = (i / points) * Math.PI * 2;
    const latRadians = (lat * Math.PI) / 180;
    const lngRadians = (lng * Math.PI) / 180;
    const angularDistance = radiusMeters / earthRadius;

    const nextLat = Math.asin(
      Math.sin(latRadians) * Math.cos(angularDistance) +
        Math.cos(latRadians) * Math.sin(angularDistance) * Math.cos(bearing)
    );

    const nextLng =
      lngRadians +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRadians),
        Math.cos(angularDistance) - Math.sin(latRadians) * Math.sin(nextLat)
      );

    coordinates.push([(nextLng * 180) / Math.PI, (nextLat * 180) / Math.PI]);
  }

  return coordinates;
}
