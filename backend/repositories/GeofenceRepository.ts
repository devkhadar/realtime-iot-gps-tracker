import { Geofence } from "@prisma/client";
import prisma from "../db/prisma";
import { activeMockGeofences } from "../utils/mockData";
import { geofenceEngine } from "../core/geofence-engine";

export interface IGeofenceRepository {
  getAll(): Promise<Geofence[]>;
  getById(id: string): Promise<Geofence | null>;
  upsert(name: string, latlngs: any, latitude: number, longitude: number, order: number): Promise<Geofence>;
  updateOrder(geofences: { sno: string; order: number }[]): Promise<void>;
  updateLatLngs(id: string, latlngs: any): Promise<Geofence>;
  delete(id: string): Promise<void>;
}

export class PrismaGeofenceRepository implements IGeofenceRepository {
  async getAll(): Promise<Geofence[]> {
    return prisma.geofence.findMany({ orderBy: { order: "asc" } });
  }

  async getById(id: string): Promise<Geofence | null> {
    return prisma.geofence.findUnique({ where: { id } });
  }

  async upsert(name: string, latlngs: any, latitude: number, longitude: number, order: number): Promise<Geofence> {
    const geofence = await prisma.geofence.upsert({
      where: { name },
      update: { latlngs, latitude, longitude, order },
      create: { name, latlngs, latitude, longitude, order }
    });
    // @ts-ignore
    geofenceEngine.upsertGeofence(geofence);
    return geofence;
  }

  async updateOrder(geofences: { sno: string; order: number }[]): Promise<void> {
    await prisma.$transaction(
      geofences.map((g) =>
        prisma.geofence.updateMany({
          where: { name: g.sno.toString() },
          data: { order: g.order }
        })
      )
    );
  }

  async updateLatLngs(id: string, latlngs: any): Promise<Geofence> {
    const updated = await prisma.geofence.update({
      where: { id },
      data: { latlngs }
    });
    // @ts-ignore
    geofenceEngine.upsertGeofence(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const geofence = await prisma.geofence.findUnique({ where: { id } });
    if (geofence) {
      await prisma.geofence.delete({ where: { id } });
      geofenceEngine.removeGeofence(geofence.name);
    }
  }
}

export class MockGeofenceRepository implements IGeofenceRepository {
  async getAll(): Promise<Geofence[]> {
    return activeMockGeofences as unknown as Geofence[];
  }

  async getById(id: string): Promise<Geofence | null> {
    return (activeMockGeofences.find(g => g.id === id) as unknown as Geofence) || null;
  }

  async upsert(name: string, latlngs: any, latitude: number, longitude: number, order: number): Promise<Geofence> {
    const newMockGf = { id: `mock-${Date.now()}`, name, latitude, longitude, latlngs, order, createdAt: new Date(), updatedAt: new Date() };
    const existingIdx = activeMockGeofences.findIndex(g => g.name === name);
    if (existingIdx >= 0) activeMockGeofences[existingIdx] = newMockGf;
    else activeMockGeofences.push(newMockGf);
    
    // @ts-ignore
    geofenceEngine.upsertGeofence(newMockGf);
    return newMockGf as unknown as Geofence;
  }

  async updateOrder(geofences: { sno: string; order: number }[]): Promise<void> {
    // In mock mode, we usually don't implement full transaction logic, but we can update array directly
    geofences.forEach(update => {
      const gf = activeMockGeofences.find(g => g.name === update.sno.toString());
      if (gf) gf.order = update.order;
    });
  }

  async updateLatLngs(id: string, latlngs: any): Promise<Geofence> {
    const gf = activeMockGeofences.find(g => g.id === id);
    if (!gf) throw new Error("Geofence not found");
    gf.latlngs = latlngs;
    // @ts-ignore
    geofenceEngine.upsertGeofence(gf);
    return gf as unknown as Geofence;
  }

  async delete(id: string): Promise<void> {
    const gfIdx = activeMockGeofences.findIndex(g => g.id === id);
    if (gfIdx === -1) throw new Error("Geofence not found");
    const gfName = activeMockGeofences[gfIdx].name;
    activeMockGeofences.splice(gfIdx, 1);
    geofenceEngine.removeGeofence(gfName);
  }
}
