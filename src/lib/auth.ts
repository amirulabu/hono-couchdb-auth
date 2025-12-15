import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "./db";
import { createUserDbIfNotExists } from "./couch";

// Initialize Better Auth with Bun's native SQLite
export const auth = betterAuth({
  // Database configuration using bun:sqlite
  database: db,
  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want email verification
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },

  // Security configuration
  secret: process.env.AUTH_SECRET!,

  // Base URL for redirects and callbacks
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  // Trust proxy headers (useful for production behind reverse proxy)
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.endsWith("/sign-up/email")) {
        const newSession = ctx.context.newSession;
        if (!newSession) return;
        console.log("New user signed up:", { user: newSession.user });
        await createUserDbIfNotExists({ userId: newSession.user.id });
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
