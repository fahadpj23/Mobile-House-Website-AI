// app/api/home/offers/route.ts
import { NextResponse } from "next/server";
import { getSpecialOffers } from "@/lib/firestore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const offers = await getSpecialOffers(true);

    return NextResponse.json(offers, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err: any) {
    console.error("❌ /api/home/offers failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to load special offers" },
      { status: 500 },
    );
  }
}
