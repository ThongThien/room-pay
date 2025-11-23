import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const run = async () => {
    const users = await prisma.users.findMany();
    console.log(users);
};

run();
