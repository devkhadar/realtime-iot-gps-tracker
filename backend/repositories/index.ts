import { AuthRepository, MockAuthRepository, PrismaAuthRepository } from "./AuthRepository";
import { IGeofenceRepository, MockGeofenceRepository, PrismaGeofenceRepository } from "./GeofenceRepository";

const useMockDb = process.env.USE_MOCK_DB === "true";

export const geofenceRepository: IGeofenceRepository = useMockDb 
  ? new MockGeofenceRepository() 
  : new PrismaGeofenceRepository();

export const authRepository: AuthRepository = useMockDb 
  ? new MockAuthRepository() 
  : new PrismaAuthRepository();
