import { NextResponse } from "next/server";
import { adminSdk } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { uid, callerUid } = await req.json();
    if (!uid || !callerUid) {
      return NextResponse.json(
        { error: "uid and callerUid required" },
        { status: 400 },
      );
    }
    if (uid === callerUid) {
      return NextResponse.json(
        { error: "You can't delete yourself" },
        { status: 400 },
      );
    }

    const { auth, db } = adminSdk();

    // Verify caller is super
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
        { error: "Only super admins can delete admins" },
        { status: 403 },
      );
    }

    // Remove the admin doc first
    await db.collection("admins").doc(uid).delete();

    // Try to remove the Auth user too — ignore if missing
    try {
      await auth.deleteUser(uid);
    } catch (err: any) {
      if (err?.code !== "auth/user-not-found") {
        console.warn("[delete-user] auth.deleteUser failed:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[delete-user]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete user" },
      { status: 500 },
    );
  }
}
