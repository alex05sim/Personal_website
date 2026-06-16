/** Geographic helpers for the live Earth in the hero / world globes. */

/**
 * Approximate the sub-solar point (the lat/lon where the sun is directly
 * overhead) for a given instant. Uses a standard solar-declination estimate
 * and the mean-sun longitude; accurate to ~1° / ~15 min, which is plenty for a
 * visual day/night terminator.
 */
export function subsolarPoint(date: Date = new Date()): { lat: number; lon: number } {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - startOfYear;
  const dayOfYear = Math.floor(dayMs / 86400000);

  const declination = -23.44 * Math.cos((2 * Math.PI) / 365 * (dayOfYear + 10));

  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const rawLon = -15 * (utcHours - 12);
  const lon = ((rawLon + 540) % 360) - 180;

  return { lat: declination, lon };
}

/**
 * Convert lat/lon (degrees) to a point on a sphere of the given radius, in the
 * coordinate convention that aligns with the standard equirectangular Earth
 * textures (e.g. `earth_day.jpg`).
 */
export function latLonToVec3(
  lat: number,
  lon: number,
  radius: number,
): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;

  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}
