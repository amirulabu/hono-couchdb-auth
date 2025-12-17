import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
 
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().default("./auth.db"),
    PORT: z.number().default(3000),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    AUTH_SECRET: z.string().min(32),
    COUCHDB_URL: z.url().default("http://admin:password@localhost:5984"),
    COUCHDB_JWT_SECRET: z.string().min(32),
  },
 
 
  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: process.env,
 
  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
});