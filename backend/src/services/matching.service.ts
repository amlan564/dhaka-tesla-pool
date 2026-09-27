import type { RideZone } from "../constants/ride-zones.js";
import { COMPATIBLE_ROUTES } from "../constants/pool-rules.js";

export function areRoutesCompatible(
  pickupZoneA: RideZone,
  destinationZoneA: RideZone,
  pickupZoneB: RideZone,
  destinationZoneB: RideZone,
): boolean {
  if (pickupZoneA === pickupZoneB) {
    return true;
  }

  return (
    COMPATIBLE_ROUTES[pickupZoneA]?.includes(destinationZoneB) === true ||
    COMPATIBLE_ROUTES[pickupZoneB]?.includes(destinationZoneA) === true
  );
}
