import express, { Request } from "express";
import logger from "../../utils/logger";
import { adminAuth } from "../../middleware/auth.middleware";
import { geofenceRepository } from "../../repositories";

const router = express.Router();

// Mutation routes (POST, PUT, DELETE) require admin authentication
const protectedRouter = express.Router();
protectedRouter.use(adminAuth);

router.get("/geofence", async (req: Request, res: any) => {
  try {
    const geofences = await geofenceRepository.getAll();
    res.apiResponse(200, geofences, "", geofences.length);
  } catch (err: any) {
    logger.error("Error fetching geofences:", err);
    res.apiResponse(500, "", err.message || err);
  }
});

router.use(protectedRouter);

protectedRouter.post("/geofence", async (req: Request, res: any) => {
  try {
    const { name, latlngs, id } = req.body;

    if (!name || !Array.isArray(latlngs) || latlngs.length === 0) {
      return res.apiResponse(400, {}, "Invalid name or latlngs data");
    }

    const order = id || 0;
    const latitude = latlngs[0].latitude;
    const longitude = latlngs[0].longitude;

    await geofenceRepository.upsert(name, latlngs, latitude, longitude, order);

    res.apiResponse(201, { totalGeofences: latlngs.length, data: latlngs }, "Geofence created successfully");
  } catch (err: any) {
    logger.error("Error creating geofence:", err);
    res.apiResponse(500, {}, err.message || "Internal server error");
  }
});

protectedRouter.put("/geofence", async (req: Request, res: any) => {
  try {
    const { geofences } = req.body;
    if (!Array.isArray(geofences) || geofences.some((g) => !g.sno || g.order === undefined)) {
      return res.apiResponse(400, {}, "Invalid geofences data");
    }

    await geofenceRepository.updateOrder(geofences);

    res.apiResponse(200, {}, "Geofence orders updated successfully");
  } catch (err: any) {
    logger.error("Error updating geofence orders:", err);
    res.apiResponse(500, {}, err.message || "Internal server error");
  }
});

/**
 * @swagger
 * /api/geofence/{id}/latlngs:
 *   post:
 *     summary: Add latlngs to a geofence by ID
 *     tags: [Geofences]
 */
protectedRouter.post("/geofence/:id/latlngs", async (req: Request, res: any) => {
  try {
    const geofenceId = req.params.id as string;
    const latlngs = req.body.latlngs;

    if (!Array.isArray(latlngs)) {
      return res.status(400).json({ error: "latlngs must be an array" });
    }

    await geofenceRepository.updateLatLngs(geofenceId, latlngs);
    
    res.apiResponse(200, { totalGeofences: 0, data: [] }, "Geofence latlngs updated");
  } catch (err: any) {
    logger.error("Error updating latlngs:", err);
    res.apiResponse(500, {}, err.message);
  }
});

/**
 * @swagger
 * /api/geofence/{id}:
 *   get:
 *     summary: Get geofence details
 *     tags: [Geofences]
 */
router.get("/geofence/:id", async (req: Request, res: any) => {
  try {
    const geofenceId = req.params.id as string;
    const geofence = await geofenceRepository.getById(geofenceId);

    if (!geofence) {
      return res.apiResponse(404, {}, "Geofence not found");
    }

    res.apiResponse(200, geofence, "Geofence details retrieved");
  } catch (err: any) {
    logger.error("Error fetching geofence detail:", err);
    res.apiResponse(500, {}, err.message);
  }
});

protectedRouter.delete("/geofence/:id", async (req: Request, res: any) => {
  try {
    const geofenceId = req.params.id as string;
    
    await geofenceRepository.delete(geofenceId);

    res.apiResponse(200, {}, "Geofence deleted successfully");
  } catch (err: any) {
    logger.error("Error deleting geofence:", err);
    res.apiResponse(500, {}, err.message);
  }
});

export default router;
