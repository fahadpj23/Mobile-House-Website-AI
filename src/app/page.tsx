import Link from "next/link";
import {
  getProducts,
  getBanners,
  getSpecialOffers,
  getMostSellingProducts,
  getCategories,
} from "@/lib/firestore";
import ProductCard from "@/components/ProductCard";
import BannerCarousel from "@/components/BannerCarousel";
import SpecialOffersSection from "@/components/SpecialOffersSection";

export const dynamic = "force-dynamic";

/* ═══════════════════════════════════════════════════════
   Category icon map — curated emoji per known slug.
   ═══════════════════════════════════════════════════════ */
const CATEGORY_ICONS: Record<string, string> = {
  phones: "📱",
  smartphones: "📱",
  "mobile-phones": "📱",
  mobiles: "📱",
  android: "🤖",
  iphone: "🍎",
  apple: "🍎",
  accessories: "🎧",
  headphones: "🎧",
  earphones: "🎧",
  earbuds: "🎧",
  chargers: "🔌",
  cables: "🔗",
  "power-banks": "🔋",
  "memory-cards": "💾",
  covers: "🛡️",
  "phone-covers": "🛡️",
  "screen-guards": "🛡️",
  "smart-watches": "⌚",
  watches: "⌚",
  speakers: "🔊",
  electronics: "⚡",
  tv: "📺",
  televisions: "📺",
  laptops: "💻",
  computers: "💻",
  tablets: "📲",
  cameras: "📷",
  gaming: "🎮",
  audio: "🔊",
  appliances: "🏠",
  "home-appliances": "🏠",
  refrigerators: "🧊",
  fridge: "🧊",
  "washing-machines": "🌀",
  "air-conditioners": "❄️",
  ac: "❄️",
  fans: "💨",
  "water-heaters": "🔥",
  microwave: "🔥",
  "kitchen-appliances": "🍳",
  "vacuum-cleaners": "🧹",
  irons: "👔",
  "special-offers": "🎁",
  offers: "🎁",
  new: "✨",
  featured: "⭐",
  brands: "🏷️",
  other: "📦",
};

function iconFor(slug: string, name: string): string {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (CATEGORY_ICONS[s]) return CATEGORY_ICONS[s];

  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (s.includes(key) || n.includes(key)) return icon;
  }

  return "📦";
}

/* ─── Skeleton-style shimmer for category cards ─── */
const SKELETON_BASE =
  "relative overflow-hidden bg-white ring-1 ring-gray-200/80 hover:ring-gray-300";

function SkeletonShine() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/60 to-transparent"
    />
  );
}

export default async function HomePage() {
  const [products, heroBanners, midBanners, offers, mostSelling, categories] =
    await Promise.all([
      getProducts(),
      getBanners("hero"),
      getBanners("mid"),
      getSpecialOffers(true),
      getMostSellingProducts(8),
      getCategories(),
    ]);

  const activeHeroBanners = heroBanners.filter((b) => b.active);
  const activeMidBanners = midBanners.filter((b) => b.active);

  /* ────────── Category helpers ────────── */
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

  const productTopSlug = (p: (typeof products)[number]): string => {
    if (p.categoryPath && p.categoryPath.length > 0) {
      return p.categoryPath[0];
    }
    if (p.category) {
      return topLevelSlugOf(p.category);
    }
    return "__other__";
  };

  /* ────────── Bucket products by top category ────────── */
  type Bucket = {
    slug: string;
    name: string;
    products: typeof products;
  };

  const bucketMap: Record<string, Bucket> = {};
  for (const p of products) {
    const topSlug = productTopSlug(p);
    const topName =
      slugToCat[topSlug]?.name || (topSlug === "__other__" ? "Other" : topSlug);

    if (!bucketMap[topSlug]) {
      bucketMap[topSlug] = { slug: topSlug, name: topName, products: [] };
    }
    bucketMap[topSlug].products.push(p);
  }

  const buckets: Bucket[] = Object.values(bucketMap).sort((a, b) => {
    if (a.slug === "__other__") return 1;
    if (b.slug === "__other__") return -1;
    return a.name.localeCompare(b.name);
  });

  /* ────────── Featured (unified, no category split) ────────── */
  const featuredProducts = (() => {
    const flagged = products.filter((p) => p.isFeatured);
    const source = flagged.length > 0 ? flagged : products;
    return source.slice(0, 10);
  })();

  /* ────────── Most Selling (unified, no category split) ────────── */
  const mostSellingProducts = (() => {
    const topIds = new Set(mostSelling.map((p) => p.id));
    const extras = products
      .filter((p) => !topIds.has(p.id) && (p.totalSold ?? 0) > 0)
      .sort((a, b) => (b.totalSold ?? 0) - (a.totalSold ?? 0));
    return [...mostSelling, ...extras].slice(0, 10);
  })();

  /* ────────── Category grid ────────── */
  const rootCategories = categories
    .filter((c) => !c.parentSlug)
    .sort((a, b) => a.name.localeCompare(b.name));

  const categoryCards = rootCategories
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      icon: iconFor(c.slug, c.name),
      hasProducts: (bucketMap[c.slug]?.products.length ?? 0) > 0,
    }))
    .filter((c) => c.hasProducts);

  return (
    <div className="bg-white">
      {/* ═══════════ HERO ═══════════ */}
      {activeHeroBanners.length > 0 ? (
        <BannerCarousel banners={activeHeroBanners} />
      ) : (
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-20 text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur text-[10px] font-medium tracking-wider uppercase mb-4 border border-white/20">
              ✨ New Arrivals 2024
            </span>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
              Premium Smartphones
              <br />
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                at Unbeatable Prices
              </span>
            </h1>
            <p className="text-xs md:text-sm text-blue-100/80 mb-6 max-w-xl mx-auto">
              Shop from top brands with cash on delivery and easy EMI options
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <Link
                href="/products"
                className="bg-white text-slate-900 px-6 py-2.5 rounded-full font-semibold hover:bg-blue-50 transition text-xs md:text-sm shadow-lg hover:shadow-xl"
              >
                Shop Now
              </Link>
              <Link
                href="/products?category=accessories"
                className="border border-white/30 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-white/10 transition text-xs md:text-sm backdrop-blur"
              >
                Browse Accessories
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ CATEGORY GRID — skeleton style ═══════════ */}
      {categoryCards.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-8 md:pt-12">
          <div className="text-center mb-6">
            <span className="text-[10px] font-bold tracking-[0.2em] text-blue-600 uppercase">
              Explore
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-1 tracking-tight">
              Shop by Category
            </h2>
            <p className="text-xs text-gray-500 mt-1.5">
              Find exactly what you're looking for
            </p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2 md:gap-3">
            {categoryCards.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className={`group ${SKELETON_BASE} rounded-xl p-3 flex flex-col items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300`}
              >
                <SkeletonShine />

                <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 ring-1 ring-gray-200/60 flex items-center justify-center overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="text-base md:text-lg leading-none grayscale group-hover:grayscale-0 transition-all duration-300">
                    {c.icon}
                  </span>
                </div>

                <span className="text-[10px] md:text-[11px] font-medium text-gray-600 text-center leading-tight line-clamp-2 group-hover:text-gray-900 transition-colors">
                  {c.name}
                </span>

                <div className="w-full space-y-1 opacity-40 group-hover:opacity-60 transition-opacity">
                  <div className="h-1 rounded-full bg-gray-200/80 w-3/4 mx-auto" />
                  <div className="h-1 rounded-full bg-gray-200/60 w-1/2 mx-auto" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ FEATURED (unified) ═══════════ */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-0.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-lg">⭐</span>
                  <span className="truncate">Featured Products</span>
                </h2>
              </div>
            </div>
            <Link
              href="/products"
              className="text-[11px] md:text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap flex items-center gap-1 group/link"
            >
              View all
              <span className="transition-transform group-hover/link:translate-x-0.5">
                →
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ MID BANNERS ═══════════ */}
      {activeMidBanners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-3">
          <div
            className={`grid gap-3 ${
              activeMidBanners.length === 1 ? "grid-cols-1" : "md:grid-cols-2"
            }`}
          >
            {activeMidBanners.map((b) => (
              <Link
                key={b.id}
                href={b.link || "#"}
                className="block rounded-xl overflow-hidden hover:shadow-xl transition-all group relative"
              >
                <div className="relative">
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    className="w-full h-36 md:h-44 object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {(b.title || b.subtitle) && (
                    <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                      {b.title && (
                        <h3 className="text-base md:text-lg font-bold tracking-tight">
                          {b.title}
                        </h3>
                      )}
                      {b.subtitle && (
                        <p className="text-[11px] text-gray-200 mt-0.5">
                          {b.subtitle}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ SPECIAL OFFERS ═══════════ */}
      {offers.length > 0 && <SpecialOffersSection offers={offers} />}

      {/* ═══════════ MOST SELLING (unified) ═══════════ */}
      {mostSellingProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-0.5 h-6 rounded-full bg-gradient-to-b from-red-400 to-rose-600 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-lg">🔥</span>
                  <span className="truncate">Most Selling</span>
                </h2>
              </div>
            </div>
            <Link
              href="/products"
              className="text-[11px] md:text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap flex items-center gap-1 group/link"
            >
              View all
              <span className="transition-transform group-hover/link:translate-x-0.5">
                →
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3">
            {mostSellingProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ CATEGORY FULL LISTINGS ═══════════ */}
      {buckets.map((group) => (
        <section
          key={group.slug}
          className="max-w-7xl mx-auto px-4 py-10 md:py-14 border-t border-gray-100"
        >
          <div className="flex items-end justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-0.5 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-lg">
                    {iconFor(group.slug, group.name)}
                  </span>
                  <span className="truncate">{group.name}</span>
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Handpicked selections
                </p>
              </div>
            </div>
            <Link
              href={`/products?category=${group.slug}`}
              className="text-[11px] md:text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap flex items-center gap-1 group/link"
            >
              View all
              <span className="transition-transform group-hover/link:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3">
            {group.products.slice(0, 10).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}

      {/* ═══════════ FOOTER CTA ═══════════ */}
      <section className="max-w-7xl mx-auto px-4 pt-3 pb-12">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-6 py-10 md:py-12 text-center text-white">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
              Ready to find your next favorite?
            </h2>
            <p className="text-xs text-blue-100/80 mb-5 max-w-md mx-auto">
              Browse our full collection of phones, accessories, and appliances
            </p>
            <Link
              href="/products"
              className="inline-block bg-white text-slate-900 px-6 py-2.5 rounded-full font-semibold hover:bg-blue-50 transition text-xs md:text-sm shadow-lg"
            >
              Explore All Products →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
