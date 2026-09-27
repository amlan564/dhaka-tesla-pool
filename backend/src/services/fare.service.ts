import type { RideZone } from "../constants/ride-zones.js";

const BASE_FARE = 5000; // 50 BDT
const DISTANCE_CHARGE_PER_UNIT = 2000; // 20 BDT per distance unit

const POOL_DISCOUNT_PERCENTAGE: Record<number, number> = {
  1: 0,
  2: 10,
  3: 15,
};

const zoneDistanceMap: Record<string, number> = {
  "Banani-Gulshan": 2,
  "Gulshan-Banani": 2,

  "Banani-Mohakhali": 2,
  "Mohakhali-Banani": 2,

  "Gulshan-Bashundhara": 3,
  "Bashundhara-Gulshan": 3,

  "Banani-Uttara": 4,
  "Uttara-Banani": 4,

  "Banani-Farmgate": 3,
  "Farmgate-Banani": 3,

  "Gulshan-Dhanmondi": 4,
  "Dhanmondi-Gulshan": 4,

  "Mohakhali-Mirpur": 4,
  "Mirpur-Mohakhali": 4,

  "Farmgate-Dhanmondi": 2,
  "Dhanmondi-Farmgate": 2,
};

export function calculateFare(
  pickupZone: RideZone,
  destinationZone: RideZone,
  poolSize: number,
): number {
  if (pickupZone === destinationZone) {
    throw new Error("Pickup and destination cannot be the same");
  }

  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 3) {
    throw new Error("Pool size must be between 1 and 3");
  }

  const key = `${pickupZone}-${destinationZone}`;
  const distance = zoneDistanceMap[key];

  if (distance === undefined) {
    throw new Error(
      `No predefined distance found for ${pickupZone} to ${destinationZone}`,
    );
  }

  const distanceCharge = distance * DISTANCE_CHARGE_PER_UNIT;

  const subtotal = BASE_FARE + distanceCharge;

  const discountPercentage = POOL_DISCOUNT_PERCENTAGE[poolSize];

  const poolDiscount = Math.round((subtotal * discountPercentage) / 100);

  const passengerFare = subtotal - poolDiscount;

  return passengerFare;
}
