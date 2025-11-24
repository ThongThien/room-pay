import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existing = await prisma.users.findUnique({
            where: { Email: email }
        });

        if (existing)
            return res.status(400).json({ message: "Email already exists" });

        const hashed = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: {
                Name: name,
                Email: email,
                PasswordHash: hashed,
                Role: "tenant"
            }
        });

        res.json({ message: "Register success", user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.users.findUnique({
            where: { Email: email }
        });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const match = await bcrypt.compare(password, user.PasswordHash);
        if (!match)
            return res.status(401).json({ message: "Wrong password" });

        const accessToken = jwt.sign(
            { userId: user.Id, role: user.Role },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { userId: user.Id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ accessToken, refreshToken });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
