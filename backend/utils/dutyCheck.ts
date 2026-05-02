import { systemSettings } from "../routes/fleet-api/settings";
import logger from "./logger";

const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Check if the current time is outside duty hours.
 * Reads from the in-memory systemSettings cache (populated from DB on startup).
 */
export const isDutyCompleted = (): boolean => {
  // Bypass in mock mode or when duty enforcement is disabled
  if (process.env.USE_MOCK_DB === "true" || !systemSettings.checkDutyFlag) {
    return false;
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long",
  };

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-IN", options);
  const parts = formatter.formatToParts(now);

  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  const currentDay = parts.find((p) => p.type === "weekday")?.value || "";

  if (!hour || !minute) return true;

  const currentMinutes = parseTimeToMinutes(`${hour}:${minute}`);
  const startMinutes = parseTimeToMinutes(systemSettings.parserStartsAt);
  const endMinutes = parseTimeToMinutes(systemSettings.parserEndsAt);
  const dutyDays = systemSettings.dutyDays
    ? systemSettings.dutyDays.split(",").map((d) => d.trim())
    : [];

  const isDutyDay = dutyDays.includes(currentDay);

  if (!isDutyDay || currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return true;
  }

  return false;
};
