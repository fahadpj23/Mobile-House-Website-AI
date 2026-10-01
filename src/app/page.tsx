import Link from "next/link";
import {
  getProducts,
  getBanners,
  getSpecialOffers,
  getMostSellingProducts,
} from "@/lib/firestore";
import ProductCard from "@/components/ProductCard";
import BannerCarousel from "@/components/BannerCarousel";
import SpecialOffersSection from "@/components/SpecialOffersSection";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, heroBanners, midBanners, offers, mostSelling] =
    await Promise.all([
      getProducts(),
      getBanners("hero"),
      getBanners("mid"),
      getSpecialOffers(true),
      getMostSellingProducts(8),
    ]);

  const activeHeroBanners = heroBanners.filter((b) => b.active);
  const activeMidBanners = midBanners.filter((b) => b.active);

  const flagged = products.filter((p) => p.isFeatured);
  const featuredDisplay = (flagged.length > 0 ? flagged : products).slice(0, 8);

  return (
    <div>
      {/* ===== HERO BANNERS ===== */}
      {activeHeroBanners.length > 0 ? (
        <BannerCarousel banners={activeHeroBanners} />
      ) : (
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
              Latest Smartphones at Best Prices
            </h1>
            <p className="text-sm md:text-base mb-6 text-blue-100">
              Shop from top brands with Cash on Delivery available
            </p>
            <Link
              href="/products"
              className="bg-white text-blue-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition text-sm"
            >
              Shop Now
            </Link>
          </div>
        </section>
      )}

      {/* ===== FEATURED PRODUCTS ===== */}
      <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg md:text-xl font-bold">Featured Products</h2>
          <Link
            href="/products"
            className="text-blue-600 text-xs md:text-sm font-medium hover:underline"
          >
            View All →
          </Link>
        </div>
        {featuredDisplay.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No products yet. Add products from the admin panel.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {featuredDisplay.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ===== MID BANNERS ===== */}
      {activeMidBanners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-4">
          <div
            className={`grid gap-3 ${
              activeMidBanners.length === 1 ? "grid-cols-1" : "md:grid-cols-2"
            }`}
          >
            {activeMidBanners.map((b) => (
              <Link
                key={b.id}
                href={b.link || "#"}
                className="block rounded-lg overflow-hidden hover:shadow-lg transition group"
              >
                <div className="relative">
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    className="w-full h-40 md:h-52 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {(b.title || b.subtitle) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 text-white">
                      {b.title && (
                        <h3 className="text-base md:text-lg font-bold">
                          {b.title}
                        </h3>
                      )}
                      {b.subtitle && (
                        <p className="text-xs text-gray-200">{b.subtitle}</p>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== SPECIAL OFFERS ===== */}
      {offers.length > 0 && <SpecialOffersSection offers={offers} />}

      {/* ===== MOST SELLING PRODUCTS ===== */}
      {mostSelling.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-bold">🔥 Most Selling</h2>
            <Link
              href="/products"
              className="text-blue-600 text-xs md:text-sm font-medium hover:underline"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {mostSelling.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
