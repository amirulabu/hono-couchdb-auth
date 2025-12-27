import { createAuthClient } from "better-auth/client";
import { config } from "dotenv";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";

// Load environment variables
config();

// Get base URL from environment or use default
const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const couchDbUrl = process.env.COUCHDB_URL || "http://localhost:5984";

// Store the CouchDB JWT for use across tests
let storedCouchJwt: string | null = null;

// Create a cookie jar to persist cookies across requests in Node.js
const cookieJar = new CookieJar();

// Create a fetch wrapper that handles cookies
const fetchWithCookies = fetchCookie(fetch, cookieJar);

// Point this to your Hono auth server
// The Better Auth client will automatically use the `/api/auth` routes
const authClient = createAuthClient({
  baseURL,
  fetch: fetchWithCookies,
});

async function stepSignUp(email: string, password: string) {
  try {
    console.log("\n[1] Sign Up (email & password)");
    const { data, error } = await authClient.signUp.email({
      name: "Test User",
      email,
      password,
    });

    if (error) {
      console.error("Sign up error:", error);
      return false;
    } else {
      console.log("Sign up success. User:", data?.user ?? data);
      return true;
    }
  } catch (err) {
    console.error("Unexpected sign up error:", err);
    return false;
  }
}

async function stepSignIn(email: string, password: string) {
  try {
    console.log("\n[2] Sign In (email & password)");

    // Use raw fetch to ensure cookies are captured
    const response = await fetchWithCookies(
      `${baseURL}/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe: true }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Sign in error:", data);
      return false;
    } else {
      console.log("Sign in success. data:", data);
      if (data.couchjwt) {
        console.log(
          "  ✓ CouchDB JWT received:",
          data.couchjwt.substring(0, 50) + "..."
        );
        // Store the JWT for CouchDB connectivity test
        storedCouchJwt = data.couchjwt;
      }
      return true;
    }
  } catch (err) {
    console.error("Unexpected sign in error:", err);
    return false;
  }
}

async function stepGetSession() {
  try {
    console.log("\n[3] Get Session");

    const response = await fetchWithCookies(`${baseURL}/session`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Get session error:", response.status, response.statusText);
      const errorData = await response.json().catch(() => null);
      if (errorData) console.error("  Details:", errorData);
      return false;
    }

    const data = await response.json();
    console.log("Get session success:");
    console.log("  User:", data.user);
    console.log(
      "  Session expires at:",
      new Date(data.session.expiresAt).toISOString()
    );
    if (data.couchJwt) {
      console.log("  CouchDB JWT:", data.couchJwt.substring(0, 50) + "...");
    }
    return true;
  } catch (err) {
    console.error("Unexpected get session error:", err);
    return false;
  }
}

async function stepChangePassword(
  currentPassword: string,
  newPassword: string
) {
  try {
    console.log("\n[4] Change Password");

    // Use raw fetch with Origin header (required for CSRF protection in Node.js)
    const response = await fetchWithCookies(
      `${baseURL}/api/auth/change-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: baseURL,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Change password error:", data);
      return false;
    } else {
      console.log("Change password success:", data);
      return true;
    }
  } catch (err) {
    console.error("Unexpected change password error:", err);
    return false;
  }
}

async function stepTestCouchDbConnectivity() {
  try {
    console.log("\n[*] Test CouchDB Connectivity with JWT");

    if (!storedCouchJwt) {
      console.error("No CouchDB JWT available - sign in first");
      return false;
    }

    // Test 1: Verify JWT authentication with CouchDB /_session endpoint
    console.log("  Testing JWT authentication with CouchDB...");
    const sessionResponse = await fetch(`${couchDbUrl}/_session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${storedCouchJwt}`,
        Accept: "application/json",
      },
    });

    if (!sessionResponse.ok) {
      console.error(
        "  ✗ CouchDB session check failed:",
        sessionResponse.status,
        sessionResponse.statusText
      );
      const errorData = await sessionResponse.text();
      console.error("  Details:", errorData);
      return false;
    }

    const sessionData = await sessionResponse.json();
    console.log("  ✓ CouchDB session authenticated:");
    console.log("    User context:", JSON.stringify(sessionData.userCtx));

    // Test 2: Try to list all databases (should show user's accessible databases)
    console.log("  Testing database access...");
    const dbsResponse = await fetch(`${couchDbUrl}/_all_dbs`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${storedCouchJwt}`,
        Accept: "application/json",
      },
    });

    if (dbsResponse.ok) {
      const dbs = await dbsResponse.json();
      console.log("  ✓ Accessible databases:", dbs.length > 5 ? `${dbs.length} databases` : dbs);
    } else {
      // This might fail due to permissions - that's okay
      console.log("  ℹ Cannot list all databases (expected for non-admin users)");
    }

    return true;
  } catch (err) {
    console.error("Unexpected CouchDB connectivity error:", err);
    return false;
  }
}

async function stepSignInWithNewPassword(email: string, newPassword: string) {
  try {
    console.log("\n[5] Sign In with new password");
    const { data, error } = await authClient.signIn.email({
      email,
      password: newPassword,
      rememberMe: true,
    });

    if (error) {
      console.error(
        "Sign in with new password error (may fail if password wasn't changed):",
        error
      );
      return false;
    } else {
      console.log("Sign in with new password success. data:", data);
      const responseData = data as typeof data & { couchjwt?: string };
      if (responseData?.couchjwt) {
        console.log(
          "  ✓ CouchDB JWT received:",
          `${responseData.couchjwt.substring(0, 50)}...`
        );
      }
      return true;
    }
  } catch (err) {
    console.error("Unexpected sign in with new password error:", err);
    return false;
  }
}

async function stepSignOut() {
  try {
    console.log("\n[6] Sign Out");

    // Use raw fetch to ensure cookies are properly cleared from the jar
    const response = await fetchWithCookies(
      `${baseURL}/api/auth/sign-out`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: baseURL,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Sign out error:", data);
      return false;
    } else {
      console.log("Sign out success:", data);
      return true;
    }
  } catch (err) {
    console.error("Unexpected sign out error:", err);
    return false;
  }
}

async function stepVerifySignedOut() {
  try {
    console.log("\n[7] Verify Signed Out (should fail)");

    const response = await fetchWithCookies(`${baseURL}/session`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      console.log("✓ Correctly returned 401 Unauthorized after sign out");
      return true;
    } else if (!response.ok) {
      console.log(
        "✓ Session endpoint returned error (expected):",
        response.status
      );
      return true;
    } else {
      const data = await response.json();
      console.warn("⚠ Session still active after sign out:", data);
      return false;
    }
  } catch (err) {
    console.error("Unexpected verify signed out error:", err);
    return false;
  }
}

async function runEmailPasswordFlows() {
  // Use a fresh, unique email on each run so sign up doesn't clash
  const uniqueSuffix = Date.now();
  const email = `test.user+${uniqueSuffix}@example.com`;
  const password = "password1234";
  const newPassword = "newpassword1234";

  console.log("=== Email & Password Auth Flow Test ===");
  console.log("Base URL:", baseURL);
  console.log("Test user email:", email);
  console.log("---------------------------------------");

  const results: { step: string; passed: boolean }[] = [];

  // Execute steps sequentially
  results.push({ step: "Sign Up", passed: await stepSignUp(email, password) });
  results.push({ step: "Sign In", passed: await stepSignIn(email, password) });
  results.push({
    step: "CouchDB Connectivity",
    passed: await stepTestCouchDbConnectivity(),
  });
  results.push({ step: "Get Session", passed: await stepGetSession() });
  results.push({
    step: "Change Password",
    passed: await stepChangePassword(password, newPassword),
  });
  results.push({
    step: "Sign In with New Password",
    passed: await stepSignInWithNewPassword(email, newPassword),
  });
  results.push({ step: "Sign Out", passed: await stepSignOut() });
  results.push({
    step: "Verify Signed Out",
    passed: await stepVerifySignedOut(),
  });

  console.log("\n=== Test Results Summary ===");
  results.forEach(({ step, passed }) => {
    const status = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`${status} - ${step}`);
  });

  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nTotal: ${passedCount}/${results.length} tests passed`);

  if (allPassed) {
    console.log("✅ All tests passed!");
  } else {
    console.log("❌ Some tests failed");
    process.exitCode = 1;
  }

  console.log("\n=== Email & Password Auth Flow Test Finished ===");
}

// Run when invoked directly
runEmailPasswordFlows().catch((err) => {
  console.error("Fatal error while running auth flow tests:", err);
  process.exitCode = 1;
});
