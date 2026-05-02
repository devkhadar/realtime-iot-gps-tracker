export const mockGeofences = [
  {
    id: "mock-1",
    name: "Corporate Headquarters",
    latitude: 17.44,
    longitude: 78.38,
    latlngs: [
      { latitude: 17.441, longitude: 78.381 },
      { latitude: 17.441, longitude: 78.385 },
      { latitude: 17.438, longitude: 78.385 },
      { latitude: 17.438, longitude: 78.381 },
    ],
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "mock-2",
    name: "North Warehouse",
    latitude: 17.45,
    longitude: 78.39,
    latlngs: [
      { latitude: 17.452, longitude: 78.390 },
      { latitude: 17.452, longitude: 78.394 },
      { latitude: 17.448, longitude: 78.394 },
      { latitude: 17.448, longitude: 78.390 },
    ],
    order: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "mock-3",
    name: "Logistics Hub Alpha",
    latitude: 17.43,
    longitude: 78.37,
    latlngs: [
      { latitude: 17.432, longitude: 78.370 },
      { latitude: 17.432, longitude: 78.376 },
      { latitude: 17.428, longitude: 78.376 },
      { latitude: 17.428, longitude: 78.370 },
    ],
    order: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export let activeMockGeofences = [...mockGeofences];

export const setMockGeofences = (data: any[]) => {
  activeMockGeofences = data;
};
