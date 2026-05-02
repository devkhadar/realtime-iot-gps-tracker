import express, { Request } from "express";
import logger from "../../utils/logger";
import { fetchExternalData } from "../../services/apiService";
import { requestTypes } from "../../utils/constant";
import { Vehicle } from "../../model/vehicle";
import { isDutyCompleted } from "../../utils/dutyCheck";
import { systemSettings } from "./settings";
import { liveTrackingService } from "../../services/liveTrackingService";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { ExtendedResponse } from "../../types";
import { verifyWebhookSignature } from "../../middleware/webhookSignature.middleware";
import { ipWhitelist } from "../../middleware/ipWhitelist.middleware";

// Limit to 200 requests per minute per IP to prevent DDoS
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { message: "Too many requests from this IP, please try again after a minute", statusCode: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict validation schema for incoming telemetry batch
const telemetryBatchSchema = z.array(z.object({
  vehicleNumber: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  vehicleName: z.string().optional(),
  speed: z.number().nonnegative()
}).passthrough());

const router = express.Router();


router.get("/all-vehicles", async (req: Request, res: any) => {
  try {
    const data = await fetchExternalData("/analytics/live", requestTypes.GET);
    const vehicles = data.vehicles.map((x: any) => new Vehicle(x));

    res.apiResponse(200, { totalVehicles: data.totalVehicles, vehicles }, "");
  } catch (err: any) {
    logger.error("Error fetching vehicles:", { error: err.message });
    res.apiResponse(500, { totalVehicles: 0, vehicles: [] }, err.message || err);
  }
});



// @ts-ignore - express-rate-limit types can sometimes be finicky with different express versions
router.post("/live", webhookLimiter, ipWhitelist, verifyWebhookSignature, async (req: Request, res: any) => {
  const io = req.app.get("io");
  const ingestStart = Date.now();

  // Duty hours check
  if (isDutyCompleted()) {
    liveTrackingService.clearState(io);
    return res.apiResponse(200, "", `Duty time ended at ${systemSettings.parserEndsAt}, resumes at ${systemSettings.parserStartsAt}`);
  }

  try {
    // Validate payload with Zod
    const validationResult = telemetryBatchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid telemetry payload",
        errors: validationResult.error.issues,
        statusCode: 400
      });
    }

    const vehicles = validationResult.data;
    const processedCount = await liveTrackingService.processTelemetryBatch(vehicles, io);

    const processingTime = Date.now() - ingestStart;
    logger.debug(`Processed ${processedCount} vehicles in ${processingTime}ms`);

    res.apiResponse(201, "", "Vehicle movement data sent");
  } catch (err: any) {
    logger.error("Live ingestion error:", { error: err.message });
    res.apiResponse(err.message === "Request body must be an array of vehicle objects" ? 400 : 500, "", err.message || err);
  }
});

export default router;
