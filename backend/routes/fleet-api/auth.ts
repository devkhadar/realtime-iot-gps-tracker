import express, { Request } from "express";
import bcrypt from "bcryptjs";
import logger from "../../utils/logger";
import { authRepository } from "../../repositories";

const router = express.Router();

/**
 * @swagger
 * /api/auth/setup:
 *   post:
 *     summary: Create an initial admin account if none exists
 *     tags: [Auth]
 */
router.post("/auth/setup", async (req: Request, res: any) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await authRepository.setup(username, hashedPassword);
    
    if (!result.success) {
      return res.status(403).json(result);
    }

    res.status(201).json(result);
  } catch (err: any) {
    logger.error("Error setting up admin:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Auth]
 */
router.post("/auth/login", async (req: Request, res: any) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    // In login, we pass the raw password so the repo can check it (mock repo checks against "admin123", prisma repo hashes it)
    const result = await authRepository.login(username, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.status(200).json(result);
  } catch (err: any) {
    logger.error("Error logging in:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
