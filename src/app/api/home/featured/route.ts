// app/api/home/featured/route.ts
import { NextResponse } from "next/server";
import { getProducts } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getProducts();
  const flagged = products.filter((p) => p.isFeatured);
  const source = flagged.length > 0 ? flagged : products;
  return NextResponse.json(source.slice(0, 10));
}
