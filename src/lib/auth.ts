import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { prisma } from "./db.js";

const trustedOrigins = process.env.TRUSTED_ORIGINS 
  ? process.env.TRUSTED_ORIGINS.split(",").map((url: string) => url.trim())
  : [
      "http://localhost:3000",
      "https://ironforge-frontend.vercel.app",
      "https://ironforge-frontend-git-main-eduardoolimpiodevs-projects.vercel.app",
      "https://ironforge-frontend-ribslm54a-eduardoolimpiodevs-projects.vercel.app",
    ];

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "https://ironforge-backend.onrender.com",
  trustedOrigins,
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
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    useSecureCookies: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [openAPI()],
});
