export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Geofence {
  id?: string;
  name: string;
  order: number;
  latitude: number;
  longitude: number;
  latlngs: LatLng[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Vehicle {
  id?: string;
  vehicleNumber: string;
  vehicleName?: string;
  status?: string;
}

export interface TelemetryBatchItem {
  vehicleNumber: string;
  latitude: number;
  longitude: number;
  vehicleName?: string;
  speed: number;
  [key: string]: any;
}

export interface MovementRecord {
  vehicleId: string;
  vehicleName?: string;
  from: string | null;
  to: string;
  toFlag: string;
  timestamp: number;
  enteredTime: number | null;
  speed: number;
  etaInMins: number;
  eta: string;
  dep?: string;
  distance: number;
  isStopped: boolean;
  stoppedSince: number | null;
  stoppedDurationMins: number | null;
  latitude: number;
  longitude: number;
}

export interface VehicleGeofenceState {
  current?: Geofence | null;
  previous?: Geofence | null;
  destination?: Geofence | null;
  enteredTime?: number | null;
  stoppedSince?: number | null;
  vehicleName?: string;
}

import { Response } from "express";
export interface ExtendedResponse extends Response {
  apiResponse: (statusCode: number, data: any, message: string, total?: number) => void;
}
