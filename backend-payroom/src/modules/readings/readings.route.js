import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { allowRoles } from "../../middlewares/role.js";
import { upload } from "../../middlewares/upload.js";
import {
    submitReading,
    getMyReadings,
    getCurrentCycle,
    getLastReading
} from "./readings.controller.js";

const router = express.Router();

// All routes require authentication and tenant role
router.use(authMiddleware);
router.use(allowRoles("tenant"));

// Submit meter reading with images
router.post(
    "/submit",
    upload.fields([
        { name: "electricImage", maxCount: 1 },
        { name: "waterImage", maxCount: 1 }
    ]),
    submitReading
);

// Get tenant's reading history
router.get("/my-readings", getMyReadings);

// Get current open reading cycle
router.get("/current-cycle", getCurrentCycle);

// Get last confirmed reading for reference
router.get("/last-reading", getLastReading);

export default router;
