import { z } from "zod";
import { RIDE_ZONES } from "../constants/ride-zones.js";

export const createRideSchema = z.object({
  pickupZone: z.enum(RIDE_ZONES),

  destinationZone: z.enum(RIDE_ZONES),

  requestedSeats: z
    .number()
    .int("Requested seats must be an integer")
    .min(1, "At least 1 seat is required")
    .max(3, "A maximum of 3 seats can be requested"),
});

export type CreateRideInput = z.infer<typeof createRideSchema>;
