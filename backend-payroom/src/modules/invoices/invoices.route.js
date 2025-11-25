import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { allowRoles } from "../../middlewares/role.js";
import {
  getInvoices,
  getInvoiceById,
  getMyInvoiceStats,
  getOwnerInvoiceStats,
} from "./invoices.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all invoices (owner sees all their properties, tenant sees only theirs)
router.get("/", allowRoles("owner", "tenant"), getInvoices);

// Get single invoice by ID (both owner and tenant with proper access control)
router.get("/:id", allowRoles("owner", "tenant"), getInvoiceById);

// Get invoice statistics for tenant
router.get("/stats/my-stats", allowRoles("tenant"), getMyInvoiceStats);

// Get invoice statistics for owner
router.get("/stats/owner-stats", allowRoles("owner"), getOwnerInvoiceStats);

export default router;
