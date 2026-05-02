import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_for_dev";

export interface AuthRequest extends Request {
  adminId?: string;
}

export const adminAuth = (req: AuthRequest, res: any, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided."
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    req.adminId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid token."
    });
  }
};
