import api from './api';

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data; // expects { success: true, token: "..." }
  }
};
