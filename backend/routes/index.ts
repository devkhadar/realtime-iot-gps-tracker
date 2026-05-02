import express from "express";
import vehicleRouter from "./fleet-api/vehicle";
import geofenceRouter from "./fleet-api/geofence";
import authRouter from "./fleet-api/auth";
import settingsRouter from "./fleet-api/settings";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Vehicles
 *     description: Fleet vehicle management and real-time tracking
 *   - name: Geofences
 *     description: Geofence creation and management
 */

// Fleet Management Routes
router.use("/api", authRouter);
router.use("/api", vehicleRouter);
router.use("/api", geofenceRouter);
router.use("/api", settingsRouter);

export default router;
