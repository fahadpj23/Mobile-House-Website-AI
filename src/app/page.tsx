// app/page.tsx
import Link from "next/link";
import { getBanners, getCategories } from "@/lib/firestore";
import BannerCarousel from "@/components/BannerCarousel";
import FeaturedSection from "@/components/FeaturedSection";
import MidBannersLazy from "@/components/MidBannersLazy";
import SpecialOffersLazy from "@/components/SpecialOffersLazy";
import MostSellingSection from "@/components/MostSellingSection";
import CategorySectionLazy from "@/components/CategorySectionLazy";

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

export default async function HomePage() {
  // Only fetch what the server truly needs:
  // hero banners (above the fold) + category list (to decide which lazy sections to render).
  const [heroBanners, categories] = await Promise.all([
    getBanners("hero"),
    getCategories(),
  ]);

  const activeHeroBanners = heroBanners.filter((b) => b.active);

  /* ────────── Resolve top-level categories for lazy sections ────────── */
  const slugToCat: Record<
    string,
    { name: string; parentSlug?: string | null; slug: string }
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

  const topSlugs = new Set<string>();
  categories.forEach((c) => topSlugs.add(topLevelSlugOf(c.slug)));

  const topLevelCategories = Array.from(topSlugs)
    .map((slug) => ({
      slug,
      name: slugToCat[slug]?.name || slug,
    }))
    .sort((a, b) => {
      if (a.slug === "__other__") return 1;
      if (b.slug === "__other__") return -1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="bg-white">
      {/* ═══════════ HERO (server-rendered, above the fold) ═══════════ */}
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

      {/* ═══════════ FEATURED (API fires on scroll) ═══════════ */}
      <FeaturedSection />

      {/* ═══════════ MID BANNERS (API fires on scroll) ═══════════ */}
      <MidBannersLazy />

      {/* ═══════════ SPECIAL OFFERS (API fires on scroll) ═══════════ */}
      <SpecialOffersLazy />

      {/* ═══════════ MOST SELLING (API fires on scroll) ═══════════ */}
      <MostSellingSection />

      {/* ═══════════ CATEGORY SECTIONS (each API fires on its own scroll) ═══════════ */}
      {topLevelCategories.map((cat) => (
        <CategorySectionLazy
          key={cat.slug}
          slug={cat.slug}
          name={cat.name}
          icon={iconFor(cat.slug, cat.name)}
        />
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
