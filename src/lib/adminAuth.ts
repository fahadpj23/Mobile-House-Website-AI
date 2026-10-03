import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "firebase/auth";
import type { AdminUser, AdminSection } from "./types";

const ADMINS = "admins";

export async function getAdminDoc(
  user: User | null,
): Promise<AdminUser | null> {
  if (!user) return null;

  try {
    const snap = await getDoc(doc(db, ADMINS, user.uid));
    if (snap.exists()) {
      const data = snap.data() as Omit<AdminUser, "uid">;
      return { uid: user.uid, ...data };
    }
  } catch (e) {
    console.warn("[getAdminDoc] uid lookup failed:", e);
  }

  if (user.email) {
    try {
      const q = query(collection(db, ADMINS), where("email", "==", user.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as Omit<AdminUser, "uid">;
        return { uid: d.id, ...data };
      }
    } catch (e) {
      console.warn("[getAdminDoc] email query failed:", e);
    }
  }

  return null;
}

export async function isAdminUser(user: User | null): Promise<boolean> {
  const d = await getAdminDoc(user);
  return !!d;
}

export function isSuperAdmin(admin: AdminUser | null): boolean {
  if (!admin) return false;
  return admin.role === "super" || (admin.permissions as any[])?.includes("*");
}

export function canAccess(
  admin: AdminUser | null,
  section: AdminSection,
): boolean {
  if (!admin) return false;
  if (isSuperAdmin(admin)) return true;
  return (admin.permissions as AdminSection[])?.includes(section) ?? false;
}

export async function createAdminDoc(
  uid: string,
  email: string,
  permissions: AdminSection[] | ["*"],
  role: "admin" | "super" = "admin",
): Promise<void> {
  await setDoc(doc(db, ADMINS, uid), {
    email,
    role,
    permissions,
    addedAt: Date.now(),
  });
}

export async function updateAdminDoc(
  uid: string,
  patch: Partial<Pick<AdminUser, "permissions" | "role">>,
): Promise<void> {
  await updateDoc(doc(db, ADMINS, uid), patch);
}

export async function deleteAdminDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, ADMINS, uid));
}

export async function listAdmins(): Promise<AdminUser[]> {
  const snap = await getDocs(collection(db, ADMINS));
  return snap.docs.map((d) => ({
    uid: d.id,
    ...(d.data() as Omit<AdminUser, "uid">),
  }));
}

export async function makeAdmin(
  uid: string,
  email: string,
  permissions: AdminSection[] | ["*"] = ["*"],
): Promise<void> {
  await createAdminDoc(uid, email, permissions, "admin");
}
