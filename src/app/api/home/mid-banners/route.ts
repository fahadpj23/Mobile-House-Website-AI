// app/api/home/mid-banners/route.ts
import { NextResponse } from "next/server";
import { getBanners } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const banners = await getBanners("mid");
  return NextResponse.json(banners.filter((b) => b.active));
}
