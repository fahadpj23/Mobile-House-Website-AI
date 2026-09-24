import { getProducts, getCategories } from "@/lib/firestore";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { q?: string; category?: string };
}

export default async function ProductsPage({ searchParams }: Props) {
  const [all, categories] = await Promise.all([getProducts(), getCategories()]);

  let products = all;
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
    );
  }
  if (searchParams.category) {
    products = products.filter((p) => p.category === searchParams.category);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">All Products</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/products" className="btn-outline text-sm">
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}`}
            className="btn-outline text-sm"
          >
            {c.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
