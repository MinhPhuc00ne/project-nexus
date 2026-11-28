import { BadRequestException, Injectable } from '@nestjs/common';

export interface RouteDistance {
  distanceKm: number;
  durationMinutes: number;
  method: 'OSRM_ROUTING' | 'HAVERSINE_ESTIMATION';
}

/** Route information only; shipping prices always come from GHN. */
@Injectable()
export class RouteDistanceService {
  async getRoadDistanceAndDuration(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number,
  ): Promise<RouteDistance> {
    if (
      ![originLat, originLon, destLat, destLon].every(Number.isFinite) ||
      Math.abs(originLat) > 90 ||
      Math.abs(destLat) > 90 ||
      Math.abs(originLon) > 180 ||
      Math.abs(destLon) > 180
    ) {
      throw new BadRequestException('Invalid distance coordinates.');
    }
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`;
      const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (response.ok) {
        const result = (await response.json()) as {
          code?: string;
          routes?: Array<{ distance: number; duration: number }>;
        };
        const route = result.routes?.[0];
        if (
          result.code === 'Ok' &&
          route &&
          Number.isFinite(route.distance) &&
          route.distance >= 0 &&
          Number.isFinite(route.duration) &&
          route.duration >= 0
        ) {
          return {
            distanceKm: Math.round(route.distance / 10) / 100,
            durationMinutes: Math.max(1, Math.round(route.duration / 60)),
            method: 'OSRM_ROUTING',
          };
        }
      }
    } catch {
      // An unavailable routing provider must not block an official GHN quote.
    }
    const toRad = (value: number): number => (value * Math.PI) / 180;
    const a =
      Math.sin(toRad(destLat - originLat) / 2) ** 2 +
      Math.cos(toRad(originLat)) *
        Math.cos(toRad(destLat)) *
        Math.sin(toRad(destLon - originLon) / 2) ** 2;
    const distanceKm =
      Math.round(6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a))) * 1.25 * 100) / 100;
    return {
      distanceKm,
      durationMinutes: Math.max(5, Math.round((distanceKm / 25) * 60)),
      method: 'HAVERSINE_ESTIMATION',
    };
  }
}
