export enum RoomStatus {
  Vacant = 0,
  Occupied = 1,
}

export interface House {
  id: number;
  ownerId: string;
  name: string;
  address: string;
  createdAt: string;
}

export interface CreateHouseDto {
  name: string;
  address: string;
}

export interface UpdateHouseDto {
  name: string;
  address: string;
}

export interface Room {
  id: number;
  houseId: number;
  name: string;
  floor: number;
  status: RoomStatus;
  createdAt: string;
}

export interface CreateRoomDto {
  name: string;
  floor: number;
  status: RoomStatus;
}

export interface UpdateRoomDto {
  name: string;
  floor: number;
  status: RoomStatus;
}