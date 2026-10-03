import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBOXyd-5X9u7ugc_XxSC4j0pJ36c8I70aQ",
  authDomain: "mobilehousewebsite.firebaseapp.com",
  databaseURL: "https://mobilehousewebsite-default-rtdb.firebaseio.com",
  projectId: "mobilehousewebsite",
  storageBucket: "mobilehousewebsite.firebasestorage.app",
  messagingSenderId: "27265006915",
  appId: "1:27265006915:web:8814d2072efca18732c3f6",
};
// ── Primary (customer) app ──
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// ── Secondary (admin) app — completely separate session ──
const ADMIN_APP_NAME = "admin-app";

function getAdminApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) return existing;
  return initializeApp(firebaseConfig, ADMIN_APP_NAME);
}

export const adminAuth = getAuth(getAdminApp());
