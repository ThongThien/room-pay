import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { allowRoles } from "../../middlewares/role.js";
import {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
  assignRoom,
  moveRoom,
  checkoutTenant
} from "./tenants.controller.js";

const router = express.Router();

// All routes require authentication and owner role
router.use(authMiddleware);
router.use(allowRoles("owner"));

// CREATE - Create a new tenant
router.post("/", createTenant);

// READ - Get all tenants (supports query params: status, search)
router.get("/", getTenants);

// READ - Get a single tenant by ID
router.get("/:id", getTenantById);

// UPDATE - Update a tenant
router.put("/:id", updateTenant);

// DELETE - Delete a tenant
router.delete("/:id", deleteTenant);

router.post("/:id/assign-room", assignRoom);

router.post("/:id/move-room", moveRoom);

router.post("/:id/checkout", checkoutTenant);

export default router;
