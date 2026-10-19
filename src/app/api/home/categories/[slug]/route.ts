// app/api/home/categories/[slug]/route.ts
import { NextResponse } from "next/server";
import { getProducts, getCategories } from "@/lib/firestore";

export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };

export async function GET(_req: Request, { params }: Params) {
  const wanted = params.slug;
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  const slugToCat: Record<
    string,
    { name: string; parentSlug?: string; slug: string }
  > = {};
  categories.forEach((c) => {
    slugToCat[c.slug] = {
      name: c.name,
      parentSlug: c.parentSlug,
      slug: c.slug,
    };
  });

  const topLevelSlugOf = (slug: string): string => {
    let cur = slugToCat[slug];
    let curSlug = slug;
    const guard = new Set<string>();
    while (
      cur?.parentSlug &&
      slugToCat[cur.parentSlug] &&
      !guard.has(curSlug)
    ) {
      guard.add(curSlug);
      curSlug = cur.parentSlug;
      cur = slugToCat[curSlug];
    }
    return curSlug;
  };

  const topSlugOf = (p: (typeof products)[number]): string => {
    if (p.categoryPath && p.categoryPath.length > 0) return p.categoryPath[0];
    if (p.category) return topLevelSlugOf(p.category);
    return "__other__";
  };

  const matches = products.filter((p) => topSlugOf(p) === wanted).slice(0, 10);

  return NextResponse.json(matches);
}
