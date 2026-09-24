import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "firebase/auth";

// 🔑 Whitelisted admin emails
export const SUPER_ADMIN_EMAILS = ["fajar@gmail.com"];

export const isAdminUser = async (user: User | null): Promise<boolean> => {
  if (!user || !user.email) return false;

  // 1. Super admin whitelist
  if (SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.log("✅ Admin via whitelist:", user.email);
    return true;
  }

  // 2. Firestore check
  try {
    const ref = doc(db, "admins", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data()?.role === "admin") {
      console.log("✅ Admin via Firestore:", user.uid);
      return true;
    }
  } catch (err) {
    console.error("❌ Admin check error:", err);
  }

  console.log("❌ Not an admin:", user.email);
  return false;
};

export const makeAdmin = async (uid: string, email: string) => {
  await setDoc(doc(db, "admins", uid), {
    email,
    role: "admin",
    createdAt: Date.now(),
  });
};
