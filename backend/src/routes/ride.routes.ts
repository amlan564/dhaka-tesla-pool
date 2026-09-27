import { Router } from "express";
import {
  cancelMyRide,
  createRide,
  getMyRide,
  getMyRides,
} from "../controllers/ride.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.use(authenticate, authorize("PASSENGER"));

router.post("/", createRide);

router.get("/", getMyRides);

router.get("/:id", getMyRide);

router.patch("/:id/cancel", cancelMyRide);

export default router;
