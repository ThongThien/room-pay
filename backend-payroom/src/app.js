import express from "express";
import router from "./modules/auth/auth.route.js";
import housesRouter from "./modules/houses/houses.route.js";
import roomsRouter from "./modules/rooms/rooms.route.js";
import tenantsRouter from "./modules/tenants/tenants.route.js";
import contractsRouter from "./modules/contracts/contracts.route.js";
import invoicesRouter from "./modules/invoices/invoices.route.js";
import ticketsRouter from "./modules/tickets/tickets.route.js";
import readingsRouter from "./modules/readings/readings.route.js";
import { authMiddleware } from "./middlewares/auth.js";
import { allowRoles } from "./middlewares/role.js";

const app = express();
app.use((req, res, next) => {
  if (req.url.endsWith("/") && req.url.length > 1) {
    req.url = req.url.slice(0, -1);
  }
  next();
});

app.use(express.json());
app.use("/auth", router);
app.use("/houses", housesRouter);
app.use("/rooms", roomsRouter);
app.use("/tenants", tenantsRouter);
app.use("/contracts", contractsRouter);
app.use("/invoices", invoicesRouter);
app.use("/tickets", ticketsRouter);
app.use("/readings", readingsRouter);

export default app;
