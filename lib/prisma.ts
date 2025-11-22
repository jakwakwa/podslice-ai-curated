import { PrismaClient } from "@prisma/client";

import { withAccelerate } from "@prisma/extension-accelerate";

const prismaClientSingleton = () => {
	// return new PrismaClient()
	return new PrismaClient({
		accelerateUrl: process.env.DATABASE_URL,
	}).$extends(withAccelerate());
};

declare global {
	var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
