// app/api/home/most-selling/route.ts
import { NextResponse } from "next/server";
import { getMostSellingProducts } from "@/lib/firestore";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalise(p: Product): Product {
  const anyP = p as any;
  return {
    ...anyP,
    id: p.id,
    name: anyP.name ?? "Untitled",
    description: anyP.description ?? "",
    price: typeof anyP.price === "number" ? anyP.price : 0,
    mrp: typeof anyP.mrp === "number" ? anyP.mrp : undefined,
    images: Array.isArray(anyP.images) ? anyP.images : [],
    brand: anyP.brand ?? "",
    category: anyP.category ?? "",
    categoryPath: Array.isArray(anyP.categoryPath) ? anyP.categoryPath : [],
    categoryName: anyP.categoryName ?? "",
    stock: typeof anyP.stock === "number" ? anyP.stock : 0,
    totalSold: typeof anyP.totalSold === "number" ? anyP.totalSold : 0,
    specifications: Array.isArray(anyP.specifications)
      ? anyP.specifications
      : [],
    highlights: Array.isArray(anyP.highlights) ? anyP.highlights : [],
    isSpecialOffer: !!anyP.isSpecialOffer,
    isNewArrival: !!anyP.isNewArrival,
    isMostSelling: !!anyP.isMostSelling || !!anyP.isTopSelling,
    options: Array.isArray(anyP.options) ? anyP.options : [],
    variants: Array.isArray(anyP.variants) ? anyP.variants : [],
    series: anyP.series ?? "",
    seriesName: anyP.seriesName ?? "",
  } as Product;
}

export async function GET() {
  try {
    // getMostSellingProducts already filters + sorts internally.
    const products = await getMostSellingProducts();

    // De-dupe defensively (Firestore ids are unique anyway)
    const seen = new Set<string>();
    const unique = products.filter((p) => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return NextResponse.json(unique.map(normalise), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err: any) {
    console.error("❌ /api/home/most-selling failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to load most-selling products" },
      { status: 500 },
    );
  }
}
