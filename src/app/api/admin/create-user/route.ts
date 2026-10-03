import { NextResponse } from "next/server";
import { adminSdk } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import type { AdminSection } from "@/lib/types";

export const runtime = "nodejs"; // Admin SDK needs Node runtime

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      role,
      permissions,
      callerUid, // the super admin's uid (we verify below)
    } = body as {
      email: string;
      password: string;
      role: "admin" | "super";
      permissions: AdminSection[] | ["*"];
      callerUid: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const { auth, db } = adminSdk();

    // ── Verify the caller is a super admin ──
    if (!callerUid) {
      return NextResponse.json({ error: "Missing callerUid" }, { status: 401 });
    }

    const callerSnap = await db.collection("admins").doc(callerUid).get();
    if (!callerSnap.exists) {
      return NextResponse.json(
        { error: "Caller is not an admin" },
        { status: 403 },
      );
    }
    const caller = callerSnap.data() as {
      role?: string;
      permissions?: string[];
    };
    const callerIsSuper =
      caller?.role === "super" ||
      (Array.isArray(caller?.permissions) &&
        caller!.permissions!.includes("*"));

    if (!callerIsSuper) {
      return NextResponse.json(
        { error: "Only super admins can create admin users" },
        { status: 403 },
      );
    }

    // ── Create Firebase Auth user ──
    let uid: string;
    try {
      const created = await auth.createUser({
        email,
        password,
        emailVerified: false,
      });
      uid = created.uid;
    } catch (err: any) {
      if (err?.code === "auth/email-already-exists") {
        // If the email already exists, look up the UID so we can still
        // attach admin permissions to them
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
      } else {
        throw err;
      }
    }

    // ── Write the admin doc ──
    await db.collection("admins").doc(uid).set(
      {
        email,
        role,
        permissions,
        addedAt: Date.now(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, uid, email });
  } catch (err: any) {
    console.error("[create-user]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create user" },
      { status: 500 },
    );
  }
}
