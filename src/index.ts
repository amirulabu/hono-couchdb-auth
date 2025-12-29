import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./lib/auth";
import { generateCouchDbJwt } from "./lib/couch";
import { env } from "./lib/env";

// Load environment variables
config();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization","Accept", "Origin", "Referer"],
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

  const user = currentSession.user;
  const couchJwt = await generateCouchDbJwt(user.id);
  return c.json({
    session:{
      expiresAt: currentSession.session.expiresAt,
    },
    user:{
      name: user.name,
      email: user.email,
      id: user.id,
    },
    couchJwt,
  });
});

app.get("/", (c) => c.text("Hello, world!"));

const port = env.PORT;

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 Server running at http://localhost:${port}`);
