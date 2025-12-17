import { SHA256 } from "bun";
import * as jwt from "jsonwebtoken";
import type { RequestError } from "nano";
import Nano from "nano";
import { env } from "./env";
import { UserSecurity } from "./models";

const db = Nano(env.COUCHDB_URL);

const getUserDbName = (userId: string) => {
  const hashedUserDb = SHA256.hash(userId, "hex");
  return `userdb_${hashedUserDb}`;
};

const registerUser = async (userId: string) => {
  const usersDb = db.use("_users");
  const userDoc = {
    _id: `org.couchdb.user:${userId}`,
    name: userId,
    roles: ["registered-user"],
    type: "user",
    password: Bun.randomUUIDv7(), // generate a random password
    createdAt: new Date().toISOString(),
  };

  try {
    await usersDb.insert(userDoc);
    console.log(`User document for ${userId} created in _users database.`);

    const userDbName = getUserDbName(userId);
    await db.db.create(userDbName);
    console.log(`Database ${userDbName} created for user ${userId}.`);
    const userDb = db.use(userDbName);
    const userSecurityDoc = new UserSecurity(
      { names: [], roles: [] },
      { names: [userId], roles: [] }
    );

    console.log(`Setting security document for database ${userDbName}.`);
    await userDb.insert(userSecurityDoc, "_security");
  } catch (error) {
    console.error(`Error creating user document for ${userId}:`, error);
    throw error;
  }
};

export const createUserDbIfNotExists = async ({
  userId,
}: {
  userId: string;
}) => {
  const userDbName = getUserDbName(userId);

  try {
    await db.db.get(userDbName);
    console.log(`Database ${userDbName} already exists.`);
  } catch (error) {
    const err = error as RequestError;
    if (err?.statusCode === 404) {
      await registerUser(userId);
    } else {
      console.error(`Error checking/creating database ${userDbName}:`, error);
      throw error;
    }
  }
};

const ensureUserExists = async (userId: string) => {
  const usersDb = db.use("_users");
  const userDocId = `org.couchdb.user:${userId}`;

  try {
    await usersDb.get(userDocId);
    // User exists, no need to create
    return;
  } catch (error) {
    const err = error as RequestError;
    if (err?.statusCode === 404) {
      // User doesn't exist, create it
      const userDoc = {
        _id: userDocId,
        name: userId,
        roles: ["registered-user"],
        type: "user",
        password: Bun.randomUUIDv7(), // generate a random password
        createdAt: new Date().toISOString(),
      };
      await usersDb.insert(userDoc);
      console.log(`User document for ${userId} created in _users database.`);
    } else {
      console.error(`Error checking user ${userId}:`, error);
      throw error;
    }
  }
};

export const generateCouchDbJwt = async (userId: string) => {
  await ensureUserExists(userId);

  const privateKey = env.COUCHDB_JWT_SECRET;

  const token = jwt.sign(
    {
      sub: userId,
      "_couchdb.roles": ["registered-user"],
    },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn: "24h",
      header: {
        alg: "RS256",
        kid: "_default", // Match the key ID in jwt_keys section
      },
    }
  );
  return token;
};
