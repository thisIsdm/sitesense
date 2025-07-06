import { betterAuth } from "better-auth";

import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@/generated/prisma";
import { nextCookies } from "better-auth/next-js";

const prisma = new PrismaClient();

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "sqlite",
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        password: {
            hash: async (password: string) => {
                const bcrypt = require("bcrypt");
                const saltRounds = 10;
                return await bcrypt.hash(password, saltRounds);
            },
            verify: async ({ password, hash }) => {
                const bcrypt = require("bcrypt");
                return (await bcrypt.compare(password, hash)) as boolean;
            },
        },
        minPasswordLength: 2,
    },
    plugins: [nextCookies()],
});
