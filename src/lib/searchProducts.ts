"use client";
import { getProducts, getSeries } from "./firestore";
import { productThumb } from "./productThumb";
import type { Product, Series } from "./types";

export interface LiveSearchResult {
  series: Series[];
  products: Product[];
}

export async function searchProductsLive(
  term: string,
  productLimit = 8,
  seriesLimit = 4,
): Promise<LiveSearchResult> {
  const q = term.trim().toLowerCase();
  if (!q) return { series: [], products: [] };

  const [pRes, sRes] = await Promise.allSettled([getProducts(), getSeries()]);

  const allProducts: Product[] =
    pRes.status === "fulfilled" && Array.isArray(pRes.value) ? pRes.value : [];
  const allSeries: Series[] =
    sRes.status === "fulfilled" && Array.isArray(sRes.value) ? sRes.value : [];

  console.log(
    `[search] term="${q}" loaded products=${allProducts.length} series=${allSeries.length}`,
  );
  if (pRes.status === "rejected")
    console.error("[search] getProducts failed:", pRes.reason);
  if (sRes.status === "rejected")
    console.warn("[search] getSeries failed:", sRes.reason);

  const matchedSeries = allSeries
    .filter((s) => {
      const name = (s?.name || "").toLowerCase();
      const slug = (s?.slug || "").toLowerCase();
      return name.includes(q) || slug.includes(q);
    })
    .slice(0, seriesLimit);

  const matchedProducts = allProducts
    .filter((p) => {
      if (!p) return false;
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const series = (p.seriesName || p.series || "").toLowerCase();
      const category = (p.categoryName || p.category || "").toLowerCase();
      return (
        name.includes(q) ||
        brand.includes(q) ||
        series.includes(q) ||
        category.includes(q)
      );
    })
    .slice(0, productLimit);

  console.log(
    `[search] matches: series=${matchedSeries.length} products=${matchedProducts.length}`,
  );

  return { series: matchedSeries, products: matchedProducts };
}

export { productThumb };
