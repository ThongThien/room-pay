import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { allowRoles } from "../../middlewares/role.js";
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} from "./rooms.controller.js";

const router = express.Router();

// All routes require authentication and owner role
router.use(authMiddleware);
router.use(allowRoles("owner"));

// CREATE - Create a new room
router.post("/", createRoom);

// READ - Get all rooms (supports query params: houseId, status)
router.get("/", getRooms);

// READ - Get a single room by ID
router.get("/:id", getRoomById);

// UPDATE - Update a room
router.put("/:id", updateRoom);

// DELETE - Delete a room
router.delete("/:id", deleteRoom);

export default router;
