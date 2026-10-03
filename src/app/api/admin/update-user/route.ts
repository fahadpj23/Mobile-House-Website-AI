import { NextResponse } from "next/server";
import { adminSdk } from "@/lib/firebaseAdmin";
import type { AdminSection } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, role, permissions, callerUid } = body as {
      uid: string;
      role: "admin" | "super";
      permissions: AdminSection[] | ["*"];
      callerUid: string;
    };

    if (!uid || !callerUid) {
      return NextResponse.json(
        { error: "uid and callerUid required" },
        { status: 400 },
      );
    }

    const { db } = adminSdk();

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
        { error: "Only super admins can edit admins" },
        { status: 403 },
      );
    }

    await db
      .collection("admins")
      .doc(uid)
      .set({ role, permissions }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[update-user]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update user" },
      { status: 500 },
    );
  }
}
