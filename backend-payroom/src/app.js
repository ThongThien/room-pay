import express from "express";
import router from "./modules/auth/auth.route.js";

const app = express();
app.use(express.json());

app.use("/auth", router);

app.use((req, res, next) => {
    if (req.url.endsWith("/") && req.url.length > 1) {
        req.url = req.url.slice(0, -1);
    }
    next();
});

// Test phan quyen
app.get("/test/owner", authMiddleware, allowRoles("owner"), (req, res) => {
    res.send("OWNER OK");
});

app.get("/test/tenant", authMiddleware, allowRoles("tenant"), (req, res) => {
    res.send("TENANT OK");
});

export default app;
