import { Router } from "express";
import {
  acceptRide,
  getCurrentPool,
  getPendingRides,
  getRideHistory,
  getVehicle,
  updateRideStatus,
  updateVehicleStatus,
} from "../controllers/driver.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.use(authenticate, authorize("DRIVER"));

router.patch("/vehicle/status", updateVehicleStatus);

router.get("/vehicle", getVehicle);

router.get("/rides/requests", getPendingRides);

router.patch("/rides/:id/accept", acceptRide);

router.patch("/rides/:id/status", updateRideStatus);

router.get("/pool", getCurrentPool);

router.get("/rides/history", getRideHistory);

export default router;
