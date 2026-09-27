import type { RideZone } from "./ride-zones.js";

export const COMPATIBLE_ROUTES: Record<RideZone, RideZone[]> = {
  Banani: ["Gulshan", "Mohakhali"],

  Gulshan: ["Banani", "Bashundhara"],

  Mohakhali: ["Banani", "Mirpur"],

  Dhanmondi: ["Farmgate", "Gulshan"],

  Mirpur: ["Mohakhali", "Uttara"],

  Uttara: ["Banani", "Mirpur"],

  Farmgate: ["Dhanmondi", "Banani"],

  Bashundhara: ["Gulshan"],
};
