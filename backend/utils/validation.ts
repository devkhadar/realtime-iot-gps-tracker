/**
 * Validates an incoming telemetry payload from a GPS device.
 */
export const validateTelemetryPayload = (payload: any): boolean => {
  if (!payload || typeof payload !== "object") return false;

  // Must have at least latitude and longitude
  if (payload.latitude == null || payload.longitude == null) return false;

  // Type checks
  if (typeof payload.latitude !== "number" || typeof payload.longitude !== "number") return false;

  // Range validation
  if (Math.abs(payload.longitude) > 180) return false;
  if (Math.abs(payload.latitude) > 90) return false;

  // Speed must be non-negative if present
  if (payload.speed != null && (typeof payload.speed !== "number" || payload.speed < 0)) {
    return false;
  }

  return true;
};

/**
 * Validates the vehicle data payload sent via the /api/live HTTP endpoint.
 */
export const validateVehiclePayload = (vehicle: any): boolean => {
  if (!vehicle || typeof vehicle !== "object") return false;

  const requiredFields = ["vehicleNumber", "latitude", "longitude"];
  for (const field of requiredFields) {
    if (vehicle[field] === undefined || vehicle[field] === null) return false;
  }

  if (typeof vehicle.latitude !== "number" || Math.abs(vehicle.latitude) > 90) return false;
  if (typeof vehicle.longitude !== "number" || Math.abs(vehicle.longitude) > 180) return false;

  return true;
};
