// app/admin/products/edit/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/lib/firestore";
import ProductForm from "@/components/ProductForm";
import { Product } from "@/lib/types";
import { ArrowLeft, Loader2 } from "lucide-react";

/* ── Skeleton ───────────────────────────────── */
function Sk({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      aria-hidden
    />
  );
}

function ProductFormSkeleton() {
  return (
    <div className="max-w-4xl space-y-5">
      {/* Step 1 card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sk className="w-6 h-6 rounded-full" />
          <Sk className="h-5 w-40" />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Sk className="h-10 rounded-lg" />
          <Sk className="h-10 rounded-lg" />
        </div>
      </div>

      {/* Step 2 card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sk className="w-6 h-6 rounded-full" />
          <Sk className="h-5 w-36" />
        </div>
        <Sk className="h-10 rounded-lg" />
        <Sk className="h-20 rounded-lg" />
        <Sk className="h-10 rounded-lg" />
      </div>

      {/* Highlights card */}
      <div className="card p-5 space-y-3">
        <Sk className="h-5 w-44" />
        <Sk className="h-10 rounded-lg" />
        <Sk className="h-10 rounded-lg" />
      </div>

      {/* Pricing card */}
      <div className="card p-5 space-y-3">
        <Sk className="h-5 w-36" />
        <div className="grid md:grid-cols-3 gap-3">
          <Sk className="h-10 rounded-lg" />
          <Sk className="h-10 rounded-lg" />
          <Sk className="h-10 rounded-lg" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Sk className="h-10 w-36 rounded-lg" />
        <Sk className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  // Accept both ?id=... (query) and /edit/[id] (route param) so the page
  // works no matter which link style is used.
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    // Prefer route param; fall back to query string.
    const urlId =
      id ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("id") || ""
        : "");
    setResolvedId(urlId || null);
  }, [id]);

  useEffect(() => {
    if (!resolvedId) return;
    let cancelled = false;
    getProductById(resolvedId)
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedId]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Edit Product</h1>
        </div>
        {product === undefined && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            Loading product…
          </span>
        )}
      </div>

      {product === undefined ? (
        <ProductFormSkeleton />
      ) : product === null ? (
        <div className="card p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Product not found.</p>
          <p className="text-sm text-gray-500 mb-3">
            It may have been deleted, or the ID is invalid.
          </p>
          <Link
            href="/admin/products"
            className="btn-primary inline-flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Back to products
          </Link>
        </div>
      ) : (
        <ProductForm initialData={product} />
      )}
    </div>
  );
}
