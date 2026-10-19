// app/api/home/offers/route.ts
import { NextResponse } from "next/server";
import { getSpecialOffers } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const offers = await getSpecialOffers(true);
  return NextResponse.json(offers);
}
