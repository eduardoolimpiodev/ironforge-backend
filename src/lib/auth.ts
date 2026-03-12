import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { prisma } from "./db.js";

const isAllowedOrigin = (origin: string) => {
  const allowedPatterns = [
    /^http:\/\/localhost:3000$/,
    /^https:\/\/.*\.vercel\.app$/,
  ];
  return allowedPatterns.some(pattern => pattern.test(origin));
};

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "https://ironforge-backend.onrender.com",
  trustedOrigins: (origin) => {
    if (!origin) return true;
    return isAllowedOrigin(origin);
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    cookieOptions: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  plugins: [openAPI()],
});
