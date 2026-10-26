/**
 * Driving distance from the business's base to a rental delivery address, for
 * the notification email only.
 *
 * Both lookups are free and need no account: the US Census geocoder turns the
 * address into coordinates, and the public OSRM server routes it by car. The
 * time is OSRM's free-flow estimate (no traffic). Each call has a short timeout
 * and any failure returns what is known so far; the email still carries a
 * Google Maps directions link, which needs no API at all.
 *
 * The base address lives in Worker secrets, never in this (public) repo:
 *   DELIVERY_ORIGIN_LL    "lon,lat" of the base
 *   DELIVERY_ORIGIN_ADDR  the base's street address, for the directions link
 */

const GEOCODER = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const ROUTER = 'https://router.project-osrm.org/route/v1/driving/';

// The delivery area the site advertises.
export const DELIVERY_LIMIT_MIN = 30;

async function getJson(url, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'user-agent': 'augustineevents.com inquiry notifier' } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function driveFrom(env, address) {
  const originLL = env && env.DELIVERY_ORIGIN_LL;
  const originAddr = env && env.DELIVERY_ORIGIN_ADDR;
  if (!address) return null;

  const out = {
    mapsUrl: originAddr
      ? 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(originAddr) +
        '&destination=' + encodeURIComponent(address)
      : null,
    miles: null,
    minutes: null,
    matched: null,
  };
  if (!originLL) return out;

  const q = new URLSearchParams({ address, benchmark: 'Public_AR_Current', format: 'json' });
  const geo = await getJson(`${GEOCODER}?${q}`, 3500);
  const match = geo && geo.result && geo.result.addressMatches && geo.result.addressMatches[0];
  if (!match) return out;
  out.matched = match.matchedAddress;

  const dest = `${match.coordinates.x},${match.coordinates.y}`;
  const route = await getJson(`${ROUTER}${originLL};${dest}?overview=false`, 3500);
  const r = route && route.routes && route.routes[0];
  if (!r) return out;
  out.miles = Math.round((r.distance / 1609.344) * 10) / 10;
  out.minutes = Math.round(r.duration / 60);
  return out;
}
