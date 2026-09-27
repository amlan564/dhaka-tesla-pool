import type { RideZone } from "../constants/ride-zones.js";
import { COMPATIBLE_ROUTES } from "../constants/pool-rules.js";

export function areRoutesCompatible(
  pickupZoneA: RideZone,
  destinationZoneA: RideZone,
  pickupZoneB: RideZone,
  destinationZoneB: RideZone,
): boolean {
  if (pickupZoneA !== pickupZoneB) {
    return false;
  }

  if (destinationZoneA === destinationZoneB) {
    return true;
  }

  const compatibleDestinations = COMPATIBLE_ROUTES[pickupZoneA] ?? [];

  return (
    compatibleDestinations.includes(destinationZoneA) &&
    compatibleDestinations.includes(destinationZoneB)
  );
}
