import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  acceptRideRequest,
  getDriverCurrentPool,
  getDriverRideHistory,
  getPendingRideRequests,
  updateDriverVehicleStatus,
  updateRideStatusByDriver,
} from "../services/driver.service.js";
import {
  rideStatusSchema,
  vehicleStatusSchema,
} from "../validators/driver.validator.js";

export async function updateVehicleStatus(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  const result = vehicleStatusSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid vehicle status",
      errors: result.error.issues,
    });
    return;
  }

  try {
    const vehicle = await updateDriverVehicleStatus(
      req.user.userId,
      result.data.status,
    );

    res.status(200).json({
      message: "Vehicle status updated successfully",
      vehicle,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update vehicle status";

    res.status(400).json({
      message,
    });
  }
}

export async function getPendingRides(
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
    const rides = await getPendingRideRequests(req.user.userId);

    res.status(200).json({
      rides,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch ride requests";

    res.status(400).json({
      message,
    });
  }
}

export async function acceptRide(
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
    const ride = await acceptRideRequest(req.user.userId, rideId);

    res.status(200).json({
      message: "Ride request accepted successfully",
      ride,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accept ride request";

    res.status(400).json({
      message,
    });
  }
}

export async function updateRideStatus(
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

  const result = rideStatusSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid ride status",
      errors: result.error.issues,
    });
    return;
  }

  try {
    const ride = await updateRideStatusByDriver(
      req.user.userId,
      rideId,
      result.data.status,
    );

    res.status(200).json({
      message: "Ride status updated successfully",
      ride,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update ride status";

    res.status(400).json({
      message,
    });
  }
}

export async function getCurrentPool(
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
    const pool = await getDriverCurrentPool(req.user.userId);

    res.status(200).json({
      pool,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch current pool";

    res.status(400).json({
      message,
    });
  }
}

export async function getRideHistory(
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
    const rides = await getDriverRideHistory(req.user.userId);

    res.status(200).json({
      rides,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch ride history";

    res.status(400).json({
      message,
    });
  }
}
