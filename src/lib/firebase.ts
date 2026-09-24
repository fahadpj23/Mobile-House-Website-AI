import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA52ob8-ASkUtoGVtWZMeX7BntXI_Rg2DA",
  authDomain: "mobilehouseweb.firebaseapp.com",
  projectId: "mobilehouseweb",
  storageBucket: "mobilehouseweb.firebasestorage.app",
  messagingSenderId: "575867744712",
  appId: "1:575867744712:web:f307767a6a382fc854d0fd",
  measurementId: "G-CYCXV1K3S6",
};
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
