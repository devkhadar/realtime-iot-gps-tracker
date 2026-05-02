import { Admin } from "@prisma/client";
import prisma from "../db/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_for_dev";

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
  admin?: { id: string; username: string };
}

export interface AuthRepository {
  setup(username: string, passwordHash: string): Promise<AuthResponse>;
  login(username: string, passwordHashAttempt: string): Promise<AuthResponse>;
}

export class PrismaAuthRepository implements AuthRepository {
  async setup(username: string, passwordHash: string): Promise<AuthResponse> {
    const adminCount = await prisma.admin.count();
    if (adminCount > 0) {
      return { success: false, error: "Admin account already exists" };
    }

    await prisma.admin.create({
      data: { username, password: passwordHash },
    });

    return { success: true, message: "Admin created successfully" };
  }

  async login(username: string, passwordHashAttempt: string): Promise<AuthResponse> {
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) return { success: false, error: "Invalid credentials" };

    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(passwordHashAttempt, admin.password);
    if (!isMatch) return { success: false, error: "Invalid credentials" };

    const token = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: "1d" });
    return {
      success: true,
      message: "Logged in successfully",
      token,
      admin: { id: admin.id, username: admin.username }
    };
  }
}

export class MockAuthRepository implements AuthRepository {
  async setup(username: string, passwordHash: string): Promise<AuthResponse> {
    return { success: false, error: "Admin account setup is disabled in mock mode" };
  }

  async login(username: string, passwordHashAttempt: string): Promise<AuthResponse> {
    // In mock mode, we hardcode the password check logic to avoid needing DB hashing
    if (username === "admin" && passwordHashAttempt === "admin123") {
      const token = jwt.sign({ id: "mock-admin-id" }, JWT_SECRET, { expiresIn: "1d" });
      return {
        success: true,
        message: "Logged in successfully (MOCK MODE)",
        token,
        admin: { id: "mock-admin-id", username: "admin" }
      };
    }
    return { success: false, error: "Invalid credentials (MOCK MODE: use admin / admin123)" };
  }
}
