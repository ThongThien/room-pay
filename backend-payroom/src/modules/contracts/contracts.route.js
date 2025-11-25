import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { allowRoles } from "../../middlewares/role.js";
import {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
  endContract,
} from "./contracts.controller.js";

const router = express.Router();

// All routes require authentication and owner role
router.use(authMiddleware);
router.use(allowRoles("owner"));

// CREATE - Create a new contract
router.post("/", createContract);

// READ - Get all contracts (supports query params: status, roomId, tenantId, houseId)
router.get("/", getContracts);

// READ - Get a single contract by ID
router.get("/:id", getContractById);

// UPDATE - Update a contract
router.put("/:id", updateContract);

// DELETE - Delete a contract
router.delete("/:id", deleteContract);

// PATCH - End a contract (helper endpoint)
router.patch("/:id/end", endContract);

export default router;
