import api from './api';

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/api/settings');
    return response.data.data;
  },

  updateSettings: async (settingsData) => {
    const response = await api.post('/api/settings', settingsData);
    return response.data;
  }
};
