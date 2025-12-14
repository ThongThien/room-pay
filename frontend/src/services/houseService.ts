import axiosClient from '../utils/axiosClient';

interface HousePayload {
  // Define the structure of the house payload here if known
  [key: string]: any;
}

export const houseService = {
  // GET /api/houses
  getAll: async (): Promise<any> => {
    return await axiosClient.get('/houses');
  },

  // POST /api/houses
  create: async (payload: HousePayload): Promise<any> => {
    return await axiosClient.post('/houses', payload);
  },

  // PUT /api/houses/{id}
  update: async (id: string, payload: HousePayload): Promise<any> => {
    return await axiosClient.put(`/houses/${id}`, payload);
  },

  // DELETE /api/houses/{id}
  delete: async (id: string): Promise<any> => {
    return await axiosClient.delete(`/houses/${id}`);
  }
};