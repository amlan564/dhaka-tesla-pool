import { z } from "zod";

export const vehicleStatusSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE"]),
});

export const rideStatusSchema = z.object({
  status: z.enum(["DRIVER_ARRIVED", "STARTED", "COMPLETED"]),
});

export type VehicleStatusInput = z.infer<typeof vehicleStatusSchema>;

export type RideStatusInput = z.infer<typeof rideStatusSchema>;
