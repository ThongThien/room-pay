import axiosClient from '../utils/axiosClient';

export const houseService = {
  // GET /api/houses
  getAll: async () => {
    return await axiosClient.get('/houses'); 
  },

  // POST /api/houses
  create: async (payload) => {
    return await axiosClient.post('/houses', payload);
  },

  // PUT /api/houses/{id}
  update: async (id, payload) => {
    return await axiosClient.put(`/houses/${id}`, payload);
  },

  // DELETE /api/houses/{id}
  delete: async (id) => {
    return await axiosClient.delete(`/houses/${id}`);
  }
};