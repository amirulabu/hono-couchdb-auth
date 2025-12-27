import { couchdbAdapter } from "@amirulabu/couchdb-better-auth";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { bearer } from "better-auth/plugins";
import { createUserDbIfNotExists, generateCouchDbJwt } from "./couch";
import { env } from "./env";

// Initialize Better Auth with CouchDB adapter
export const auth = betterAuth({
  // Database configuration using CouchDB adapter
  database: couchdbAdapter({
    url: env.COUCHDB_URL,
    database: "better_auth", // Optional: defaults to "better_auth"
    debugLogs: true,
  }),
  plugins: [bearer()],
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
  secret: env.AUTH_SECRET,

  // Base URL for redirects and callbacks
  baseURL: env.BETTER_AUTH_URL,

  // Trust proxy headers (useful for production behind reverse proxy)
  // trustedOrigins: [env.BETTER_AUTH_URL],

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.endsWith("/sign-up/email")) {
        const newSession = ctx.context.newSession;
        if (!newSession) return;
        console.log("New user signed up:", { user: newSession.user });
        await createUserDbIfNotExists({ userId: newSession.user.id });
      }
      if (ctx.path.endsWith("/sign-in/email")) {
        const session = ctx.context.newSession || ctx.context.session;
        if (!session) return;
        const userId = session.user.id;
        const couchJwt = await generateCouchDbJwt(userId);

        // Modify the response body to include the JWT
        const returned = ctx.context.returned;
        if (returned && typeof returned === "object") {
          (ctx.context as { returned: Record<string, unknown> }).returned = {
            ...returned,
            couchjwt: couchJwt,
          };
        }
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
