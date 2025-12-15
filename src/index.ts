import { Hono } from "hono";
import { config } from "dotenv";
import { auth } from "./lib/auth";
import { cors } from "hono/cors";
import { generateCouchDbJwt } from "./lib/couch";

// Load environment variables
config();

const app = new Hono();

app.use(
  "*", // or replace with "*" to enable cors for all routes
  cors({
    origin: "*", // replace with your origin
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.get("/session", async (c) => {
  const currentSession = await auth.api.getSession(c.req.raw);
  if (!currentSession) return c.body(null, 401);

  const session = currentSession.session;
  const user = currentSession.user;
  return c.json({
    session,
    user,
  });
});

app.get("/couch-jwt", async (c) => {
  const currentSession = await auth.api.getSession(c.req.raw);
  if (!currentSession) return c.body(null, 401);
  const userId = currentSession.user.id;

  const couchJwt = await generateCouchDbJwt(userId);

  return c.json({ couchJwt });
});

app.get("/", (c) => c.text("Hello, Hono!"));

// Start server
const port = parseInt(process.env.PORT || "3000");

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 Server running at http://localhost:${port}`);
