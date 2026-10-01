import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBOXyd-5X9u7ugc_XxSC4j0pJ36c8I70aQ",
  authDomain: "mobilehousewebsite.firebaseapp.com",
  databaseURL: "https://mobilehousewebsite-default-rtdb.firebaseio.com",
  projectId: "mobilehousewebsite",
  storageBucket: "mobilehousewebsite.firebasestorage.app",
  messagingSenderId: "27265006915",
  appId: "1:27265006915:web:8814d2072efca18732c3f6",
};
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
