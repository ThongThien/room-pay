import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { allowRoles } from "../../middlewares/role.js";
import {
  createHouse,
  getHouses,
  getHouseById,
  updateHouse,
  deleteHouse,
} from "./houses.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(allowRoles("owner"));

// CRUD house
router.post("/", createHouse);

router.get("/", getHouses);

router.get("/:id", getHouseById);

router.put("/:id", updateHouse);

router.delete("/:id", deleteHouse);

export default router;
