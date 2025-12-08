import { API_URLS, getAuthHeaders } from "@/utils/config";
import { 
  House, CreateHouseDto, UpdateHouseDto, 
  Room, CreateRoomDto, UpdateRoomDto 
} from "@/types/property";

// --- HOUSE SERVICE ---

export const getHouses = async (): Promise<House[]> => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch houses");
  const json = await res.json();
  return json.data;
};

export const getHouseById = async (id: number): Promise<House> => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch house");
  const json = await res.json();
  return json.data;
};

export const createHouse = async (data: CreateHouseDto): Promise<House> => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create house");
  return res.json();
};

export const updateHouse = async (id: number, data: UpdateHouseDto) => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update house");
  return res.json();
};

export const deleteHouse = async (id: number) => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete house");
  return res.json();
};

// --- ROOM SERVICE ---

export const getRooms = async (houseId: number): Promise<Room[]> => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses/${houseId}/rooms`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch rooms");
  const json = await res.json();
  return json.data;
};

export const createRoom = async (houseId: number, data: CreateRoomDto): Promise<Room> => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses/${houseId}/rooms`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create room");
  return res.json();
};

export const updateRoom = async (houseId: number, roomId: number, data: UpdateRoomDto) => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses/${houseId}/rooms/${roomId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update room");
  return res.json();
};

export const deleteRoom = async (houseId: number, roomId: number) => {
  const res = await fetch(`${API_URLS.PROPERTY}/houses/${houseId}/rooms/${roomId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete room");
  return res.json();
};