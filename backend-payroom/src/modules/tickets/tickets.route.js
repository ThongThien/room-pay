import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { allowRoles } from "../../middlewares/role.js";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  deleteTicket,
  getTicketStats,
} from "./tickets.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// CREATE - Create a new ticket (tenant only)
router.post("/", allowRoles("tenant"), createTicket);

// READ - Get all tickets (owner sees all from their properties, tenant sees theirs)
router.get("/", allowRoles("owner", "tenant"), getTickets);

// READ - Get ticket statistics
router.get("/stats", allowRoles("owner", "tenant"), getTicketStats);

// READ - Get single ticket by ID
router.get("/:id", allowRoles("owner", "tenant"), getTicketById);

// UPDATE - Update ticket status (owner only)
router.patch("/:id/status", allowRoles("owner"), updateTicketStatus);

// DELETE - Delete ticket
router.delete("/:id", allowRoles("owner", "tenant"), deleteTicket);

export default router;
