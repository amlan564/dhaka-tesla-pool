import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  cancelRide,
  createRideRequest,
  getPassengerRide,
  getPassengerRides,
} from "../services/ride.service.js";
import { createRideSchema } from "../validators/ride.validator.js";

export async function createRide(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const result = createRideSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid ride request",
      errors: result.error.issues,
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  try {
    const ride = await createRideRequest(req.user.userId, result.data);

    res.status(201).json({
      message: "Ride request created successfully",
      ride,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create ride request";

    res.status(400).json({
      message,
    });
  }
}

export async function getMyRides(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  try {
    const rides = await getPassengerRides(req.user.userId);

    res.status(200).json({
      rides,
    });
  } catch {
    res.status(500).json({
      message: "Failed to fetch rides",
    });
  }
}

export async function getMyRide(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  const rideId = req.params.id;

  if (!rideId || Array.isArray(rideId)) {
    res.status(400).json({
      message: "Invalid ride ID",
    });
    return;
  }

  try {
    const ride = await getPassengerRide(req.user.userId, rideId);

    res.status(200).json({
      ride,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch ride";

    res.status(404).json({
      message,
    });
  }
}

export async function cancelMyRide(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  const rideId = req.params.id;

  if (!rideId || Array.isArray(rideId)) {
    res.status(400).json({
      message: "Invalid ride ID",
    });
    return;
  }

  try {
    const ride = await cancelRide(req.user.userId, rideId);

    res.status(200).json({
      message: "Ride cancelled successfully",
      ride,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel ride";

    res.status(400).json({
      message,
    });
  }
}
