import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prisma/client.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Test route
app.get("/api/test", async (req, res) => {
    try {
        const users = await prisma.users.findMany();
        res.json({
            message: "Backend OK!",
            users: users
        });
    } catch (error) {
        console.error("Test error:", error);
        res.status(500).json({ error: "Error connecting to DB" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend running at: http://localhost:${PORT}`);
});
