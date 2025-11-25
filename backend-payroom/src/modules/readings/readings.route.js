import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { allowRoles } from "../../middlewares/role.js";
import { upload } from "../../middlewares/upload.js";
import {
    submitReading,
    getMyReadings,
    getCurrentCycle,
    getLastReading,
    createCycle,
    getRoomsMissingReadings,
    confirmReading
} from "./readings.controller.js";

const router = express.Router();

// All routes require authentication and tenant role
router.use(authMiddleware);

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
router.get("/my-readings", allowRoles("tenant"), getMyReadings);

// Get current open reading cycle
router.get("/current-cycle", allowRoles("tenant"), getCurrentCycle);

// Get last confirmed reading for reference
router.get("/last-reading", allowRoles("tenant"), getLastReading);

router.post("/create-cycles", allowRoles("owner"), createCycle);
router.put("/:cycleId/rooms/:roomId/confirm", allowRoles("owner"), confirmReading);
router.get("/:cycleId/missing", allowRoles("owner"), getRoomsMissingReadings);
export default router;
