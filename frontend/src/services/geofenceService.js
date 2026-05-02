import api from './api';

export const geofenceService = {
  getAll: async () => {
    const response = await api.get('/api/geofence');
    return response.data.data; // Our backend wraps lists in a "data" property
  },

  create: async (name, latlngs) => {
    const response = await api.post('/api/geofence', { name, latlngs });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/geofence/${id}`);
    return response.data;
  }
};
