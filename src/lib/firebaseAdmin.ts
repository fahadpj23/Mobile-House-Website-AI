import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function getAdminApp(): App {
  const apps = getApps();
  if (apps.length) {
    console.log("[firebase-admin] reusing existing app");
    return apps[0];
  }

  console.log("===========================================");
  console.log("[firebase-admin] INITIALIZING");
  console.log("[firebase-admin] cwd:", process.cwd());

  const jsonPath = path.join(process.cwd(), "firebase-service-account.json");
  console.log("[firebase-admin] looking for JSON at:", jsonPath);
  console.log("[firebase-admin] JSON exists:", fs.existsSync(jsonPath));

  if (!fs.existsSync(jsonPath)) {
    console.error("[firebase-admin] ❌ JSON file missing at project root");
    throw new Error("firebase-service-account.json not found at project root.");
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  console.log("[firebase-admin] file size:", raw.length);

  const sa = JSON.parse(raw);

  console.log("[firebase-admin] project_id:", sa.project_id);
  console.log("[firebase-admin] client_email:", sa.client_email);
  console.log("[firebase-admin] private_key type:", typeof sa.private_key);
  console.log("[firebase-admin] private_key length:", sa.private_key?.length);
  console.log(
    "[firebase-admin] private_key first 40:",
    JSON.stringify(sa.private_key?.slice(0, 40)),
  );
  console.log(
    "[firebase-admin] private_key last 40:",
    JSON.stringify(sa.private_key?.slice(-40)),
  );

  if (!sa.private_key) {
    console.error("[firebase-admin] ❌ private_key missing in JSON");
    throw new Error("private_key missing in service account JSON");
  }

  // Ensure the key has real newlines
  let pk = sa.private_key;
  if (!pk.includes("\n")) {
    console.log("[firebase-admin] no real newlines found → converting \\n");
    pk = pk.replace(/\\n/g, "\n");
  }

  if (!pk.startsWith("-----BEGIN PRIVATE KEY-----")) {
    console.error(
      "[firebase-admin] ❌ key does not start with -----BEGIN PRIVATE KEY-----",
    );
    console.error(
      "[firebase-admin] actual start:",
      JSON.stringify(pk.slice(0, 40)),
    );
    throw new Error("Malformed private key: missing BEGIN header");
  }

  if (!pk.trim().endsWith("-----END PRIVATE KEY-----")) {
    console.error(
      "[firebase-admin] ❌ key does not end with -----END PRIVATE KEY-----",
    );
    console.error(
      "[firebase-admin] actual end:",
      JSON.stringify(pk.slice(-40)),
    );
    throw new Error("Malformed private key: missing END footer");
  }

  console.log("[firebase-admin] ✅ private key looks valid");
  console.log("===========================================");

  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: pk,
    }),
  });
}

export function adminSdk() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}
