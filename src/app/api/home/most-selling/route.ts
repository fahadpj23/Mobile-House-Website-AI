// app/api/home/most-selling/route.ts
import { NextResponse } from "next/server";
import { getProducts, getMostSellingProducts } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const [products, mostSelling] = await Promise.all([
    getProducts(),
    getMostSellingProducts(8),
  ]);

  const topIds = new Set(mostSelling.map((p) => p.id));
  const extras = products
    .filter((p) => !topIds.has(p.id) && (p.totalSold ?? 0) > 0)
    .sort((a, b) => (b.totalSold ?? 0) - (a.totalSold ?? 0));

  return NextResponse.json([...mostSelling, ...extras].slice(0, 10));
}
