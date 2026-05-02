import express, { Request } from "express";
import { adminAuth } from "../../middleware/auth.middleware";
import prisma from "../../db/prisma";
import logger from "../../utils/logger";

const router = express.Router();

const isMock = process.env.USE_MOCK_DB === "true";

// Defaults used in mock mode and as in-memory cache
const DEFAULTS = {
  checkDutyFlag: false,
  parserStartsAt: "08:00",
  parserEndsAt: "20:00",
  dutyDays: "Monday,Tuesday,Wednesday,Thursday,Friday",
};

// In-memory cache — populated on startup from DB (or defaults in mock mode)
export let systemSettings = {
  ...DEFAULTS,
  isMockMode: isMock,
};

/**
 * Load settings from DB into the in-memory cache.
 * Called once on server startup so dutyCheck.ts always has fresh values.
 */
export async function loadSettingsFromDb(): Promise<void> {
  if (isMock) {
    logger.info("Mock mode: using default duty settings (DB skipped)");
    return;
  }
  try {
    const row = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", ...DEFAULTS },
    });
    systemSettings = {
      checkDutyFlag: row.checkDutyFlag,
      parserStartsAt: row.parserStartsAt,
      parserEndsAt: row.parserEndsAt,
      dutyDays: row.dutyDays,
      isMockMode: false,
    };
    logger.info("System settings loaded from DB", systemSettings);
  } catch (err) {
    logger.error("Failed to load settings from DB — using defaults", err);
  }
}

router.get("/settings", adminAuth, (req: Request, res: any) => {
  res.apiResponse(200, systemSettings, "Settings retrieved");
});

router.post("/settings", adminAuth, async (req: Request, res: any) => {
  try {
    const { checkDutyFlag, parserStartsAt, parserEndsAt, dutyDays } = req.body;

    const updated = {
      checkDutyFlag: !!checkDutyFlag,
      parserStartsAt: parserStartsAt || systemSettings.parserStartsAt,
      parserEndsAt: parserEndsAt || systemSettings.parserEndsAt,
      dutyDays: dutyDays || systemSettings.dutyDays,
    };

    // Persist to DB (skipped in mock mode)
    if (!isMock) {
      await prisma.systemSettings.upsert({
        where: { id: "default" },
        update: updated,
        create: { id: "default", ...updated },
      });
    }

    // Update in-memory cache so dutyCheck.ts picks it up immediately
    systemSettings = { ...updated, isMockMode: isMock };

    logger.info("System settings updated via Admin UI", systemSettings);
    res.apiResponse(200, systemSettings, "Settings updated successfully");
  } catch (err: any) {
    logger.error("Error updating settings:", err);
    res.apiResponse(500, {}, err.message);
  }
});

export default router;
