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

// Helper function to create consistent user documents
const createUserDoc = (userId: string) => ({
  _id: `org.couchdb.user:${userId}`,
  name: userId,
  roles: ["registered-user"],
  type: "user",
  password: Bun.randomUUIDv7(), // generate a random password
  createdAt: new Date().toISOString(),
});

const registerUser = async (userId: string) => {
  const usersDb = db.use("_users");
  const userDoc = createUserDoc(userId);
  let userCreated = false;
  let dbCreated = false;

  try {
    // Step 1: Create user document
    await usersDb.insert(userDoc);
    userCreated = true;
    console.log(`User document for ${userId} created in _users database.`);

    // Step 2: Create user database
    const userDbName = getUserDbName(userId);
    await db.db.create(userDbName);
    dbCreated = true;
    console.log(`Database ${userDbName} created for user ${userId}.`);

    // Step 3: Set security document
    const userDb = db.use(userDbName);
    const userSecurityDoc = new UserSecurity(
      { names: [], roles: [] },
      { names: [userId], roles: [] }
    );

    console.log(`Setting security document for database ${userDbName}.`);
    await userDb.insert(userSecurityDoc, "_security");
    console.log(`User ${userId} fully registered with personal database.`);
  } catch (error) {
    console.error(`Error during user registration for ${userId}:`, error);
    
    // Rollback: Clean up partially created resources
    if (dbCreated) {
      try {
        const userDbName = getUserDbName(userId);
        await db.db.destroy(userDbName);
        console.log(`Rolled back database ${userDbName}`);
      } catch (rollbackError) {
        console.error(`Failed to rollback database for ${userId}:`, rollbackError);
      }
    }
    
    if (userCreated) {
      try {
        const doc = await usersDb.get(userDoc._id);
        await usersDb.destroy(doc._id, doc._rev);
        console.log(`Rolled back user document for ${userId}`);
      } catch (rollbackError) {
        console.error(`Failed to rollback user document for ${userId}:`, rollbackError);
      }
    }
    
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

export const generateCouchDbJwt = async (userId: string) => {
  // Ensure both user document AND user database exist
  await createUserDbIfNotExists({ userId });

  // Convert escaped newlines to actual newlines (dotenv stores them as literal \n)
  const privateKey = env.COUCHDB_JWT_SECRET.replace(/\\n/g, "\n");

  const token = jwt.sign(
    {
      sub: userId,
      "_couchdb.roles": ["registered-user"],
    },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn: "1h",
      header: {
        alg: "RS256",
        kid: "_default", // Match the key ID in jwt_keys section
      },
    }
  );
  return token;
};
