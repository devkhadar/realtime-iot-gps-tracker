export const requestTypes = {
  GET: "GET",
  POST: "POST",
} as const;

export const events: Record<string, string | undefined> = {
  "ZONE-ALPHA-1": process.env.MQTT_TOPIC_ZONE_A,
  "ZONE-BETA-1": process.env.MQTT_TOPIC_ZONE_B,
};

export const getCurrentISTTime = (): number => {
  const date = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  return date.getTime() + istOffset;
};

export const formatTimeToHHMM = (currentTime: number = getCurrentISTTime()): string => {
  const date = new Date(currentTime);
  const formattedTime = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formattedTime;
};

export const findETA = (speed: number | string, distance: number): string => {
  const s = typeof speed === 'string' ? parseFloat(speed) : speed;
  if (!s || !distance || distance <= 0) {
    return "NA";
  }

  const timeRequired = (distance / s) * 3600000;
  const utcEta = getCurrentISTTime() + timeRequired;
  return formatTimeToHHMM(utcEta);
};

export const findETAWithBuffer = (speed: number | string, distance: number): string => {
  const s = typeof speed === 'string' ? parseFloat(speed) : speed;
  if (!s || !distance || distance <= 0) {
    return "NA";
  }

  const timeRequired = (distance / s) * 3600000;
  const utcEta = getCurrentISTTime() + timeRequired;
  const utcEtaWithBuffer = utcEta + 15 * 60 * 1000;
  return formatTimeToHHMM(utcEtaWithBuffer);
};

export const findETAInMins = (speed: number | string, distance: number): number => {
  const s = typeof speed === 'string' ? parseFloat(speed) : speed;
  if (!s || !distance || distance <= 0) {
    return 0;
  }
  const timeRequired = (distance / s) * 60;
  return Math.round(timeRequired);
};

/**
 * Calculate the next 15-minute departure slot dynamically.
 */
export const getNextDepartureSlot = (arrivalTime: number, currentTime: number | null = null): number => {
  const now = currentTime || getCurrentISTTime();
  const fifteenMins = 15 * 60 * 1000;
  
  let departureTime = Math.ceil((arrivalTime + 1) / fifteenMins) * fifteenMins;
  
  while (departureTime <= now) {
    departureTime += fifteenMins;
  }
  
  return departureTime;
};
