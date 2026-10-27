// app/products/[id]/ProductDetailClient.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Product, SpecValue } from "@/lib/types";
import { useCart } from "@/components/CartProvider";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  ShoppingCart,
  Truck,
  Shield,
  Minus,
  Plus,
  Check,
  AlertTriangle,
  Star,
  Zap,
  Package,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Info,
  X,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   Skeletons
   ═══════════════════════════════════════════════════════ */
function Sk({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      aria-hidden
    />
  );
}

function ImageSkeleton() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-2xl bg-gray-300/70 animate-pulse" />
        <div className="h-3 w-20 rounded bg-gray-300/70 animate-pulse" />
      </div>
    </div>
  );
}

function InfoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Sk className="h-4 w-24" />
        <Sk className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        <Sk className="h-8 w-4/5" />
        <Sk className="h-8 w-3/5" />
      </div>
      <div className="flex items-end gap-3">
        <Sk className="h-10 w-32" />
        <Sk className="h-5 w-16" />
      </div>
      <div className="space-y-2 pt-2">
        <Sk className="h-3.5 w-full" />
        <Sk className="h-3.5 w-5/6" />
      </div>
      <Sk className="h-11 w-full rounded-xl" />
      <Sk className="h-12 w-full rounded-xl" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Highlights — Elegant, Airy List
   ═══════════════════════════════════════════════════════ */
function HighlightsBlock({ highlights }: { highlights: string[] }) {
  if (!highlights.length) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">
        Product Highlights
      </h2>
      <ul className="space-y-3">
        {highlights.map((h, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
              <Check size={12} className="text-green-600" strokeWidth={3} />
            </div>
            <span className="text-[14px] leading-relaxed text-gray-700">
              {h}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Specifications — Soft, Elegant Cards
   ═══════════════════════════════════════════════════════ */
function SpecificationsBlock({
  groups,
}: {
  groups: { group: string; specs: SpecValue[] }[];
}) {
  if (!groups.length) {
    return (
      <div className="mt-10 border-t border-gray-100 pt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Specifications</h2>
        <div className="flex items-start gap-2 py-3">
          <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500">No specifications provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 border-t border-gray-100 pt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">
        Specifications
      </h2>

      <div className="space-y-6">
        {groups.map(({ group, specs }) => {
          const isInTheBox = group.toLowerCase().includes("box");

          return (
            <section
              key={group}
              className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              {/* Elegant Light Header */}
              <header className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200">
                <h3 className="text-[13px] font-extrabold text-gray-800 uppercase tracking-widest">
                  {group}
                </h3>
              </header>

              {isInTheBox ? (
                <div className="divide-y divide-gray-100">
                  {specs.map((spec, i) => (
                    <div
                      key={i}
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6"
                    >
                      <span className="sm:w-[35%] shrink-0 text-sm text-gray-500 font-medium">
                        {spec.key}
                      </span>
                      <span className="text-[15px] text-gray-900 leading-relaxed">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {specs.map((spec, i) => (
                    <div
                      key={i}
                      className={[
                        "px-5 py-4 flex flex-col gap-1",
                        // Elegant right border for left column
                        i % 2 === 0 ? "sm:border-r sm:border-gray-100" : "",
                        // Bottom border for all rows except last
                        i < specs.length - (specs.length % 2 === 0 ? 2 : 1)
                          ? "border-b border-gray-100"
                          : "",
                        // Mobile border fix
                        "max-sm:border-b max-sm:border-gray-100 max-sm:last:border-b-0",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                        {spec.key}
                      </span>
                      <span className="text-[15px] text-gray-900 leading-relaxed">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Similar Products Section
   ═══════════════════════════════════════════════════════ */
function SimilarProducts({
  category,
  currentProductId,
}: {
  category: string;
  currentProductId: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      setLoading(true);
      try {
        // ⚠️ REPLACE THIS MOCK FETCH WITH YOUR ACTUAL API CALL
        await new Promise((resolve) => setTimeout(resolve, 800));
        setProducts([]);
      } catch (error) {
        console.error("Failed to fetch similar products", error);
      } finally {
        setLoading(false);
      }
    };

    if (category) fetchSimilar();
  }, [category, currentProductId]);

  if (loading) {
    return (
      <div className="mt-12 pt-8 border-t border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Similar Products
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-40 shrink-0 space-y-2">
              <Sk className="aspect-square rounded-lg" />
              <Sk className="h-4 w-3/4" />
              <Sk className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Similar Products
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((p) =>
          p.id ? (
            <Link key={p.id} href={`/products/${p.id}`} className="group">
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden relative mb-3">
                <img
                  src={p.images?.[0] || "/placeholder.png"}
                  alt={p.name}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                {p.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-gray-900">
                  ₹{p.price.toLocaleString()}
                </span>
                {p.discountPrice && (
                  <span className="text-xs text-gray-400 line-through">
                    ₹{p.discountPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </Link>
          ) : null,
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Mobile sticky buy bar
   ═══════════════════════════════════════════════════════ */
function MobileBuyBar({
  price,
  stock,
  hasVariants,
  onAdd,
  justAdded,
}: {
  price: number;
  stock: number;
  hasVariants: boolean;
  onAdd: () => void;
  justAdded: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
          Total
        </p>
        <p className="text-base font-bold text-gray-900 leading-none">
          ₹{price.toLocaleString()}
        </p>
      </div>
      <button
        onClick={onAdd}
        disabled={stock <= 0}
        className={`h-10 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition ${
          stock <= 0
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : justAdded
              ? "bg-green-600 text-white"
              : "bg-gray-900 text-white active:scale-95"
        }`}
      >
        {justAdded ? (
          <>
            <Check size={16} /> Added
          </>
        ) : (
          <>
            <ShoppingCart size={16} /> {hasVariants ? "Add" : "Add to Cart"}
          </>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Image Zoom Modal
   ═══════════════════════════════════════════════════════ */
function ImageZoomModal({
  images,
  activeIndex,
  onClose,
  onNavigate,
}: {
  images: string[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")
        onNavigate((activeIndex - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onNavigate((activeIndex + 1) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, images.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
        aria-label="Close zoom"
      >
        <X size={20} />
      </button>

      <div
        className="relative w-full max-w-4xl aspect-square flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[activeIndex]}
          alt={`Zoomed view ${activeIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                onNavigate((activeIndex - 1 + images.length) % images.length)
              }
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => onNavigate((activeIndex + 1) % images.length)}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden shrink-0 transition-all ${
                activeIndex === i
                  ? "ring-2 ring-white opacity-100"
                  : "opacity-50 hover:opacity-100"
              }`}
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover bg-white"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════ */
export default function ProductDetailClient({ product }: { product: Product }) {
  const { addItem } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [infoReady, setInfoReady] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [imgThumbError, setImgThumbError] = useState<Record<number, boolean>>(
    {},
  );
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const loadGenerationRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const hasVariants = !!product.options?.length && !!product.variants?.length;

  useEffect(() => {
    if (!hasVariants) {
      setInfoReady(true);
      return;
    }

    const variantIdFromUrl = searchParams.get("variant");

    let target = variantIdFromUrl
      ? product.variants!.find((v) => v.id === variantIdFromUrl)
      : undefined;

    if (!target) {
      target =
        product.variants!.find((v) => v.enabled && v.stock > 0) ||
        product.variants!.find((v) => v.enabled) ||
        product.variants![0];
    }

    if (!target) {
      setInfoReady(true);
      return;
    }

    const preset: Record<string, string> = {};
    product.options!.forEach((opt, i) => {
      preset[opt.id] = target.optionValueIds[i];
    });
    setSelected(preset);
    setInfoReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, searchParams]);

  const activeVariant = useMemo(() => {
    if (!hasVariants) return undefined;
    return product.variants!.find((v) =>
      product.options!.every((o, i) => v.optionValueIds[i] === selected[o.id]),
    );
  }, [hasVariants, product.options, product.variants, selected]);

  useEffect(() => {
    if (!hasVariants || !activeVariant) return;

    const currentUrlVariant = searchParams.get("variant");
    if (currentUrlVariant !== activeVariant.id) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", activeVariant.id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeVariant, hasVariants, searchParams, router, pathname]);

  const variantSuffix = useMemo(() => {
    if (!hasVariants || !activeVariant) return "";

    const ramOptIdx = product.options!.findIndex((o) => /ram/i.test(o.name));
    const ramLabel =
      ramOptIdx >= 0 ? selected[product.options![ramOptIdx].id] : undefined;

    const ramValue =
      ramLabel && ramOptIdx >= 0
        ? product.options![ramOptIdx].values.find((v) => v.id === ramLabel)
            ?.label
        : undefined;

    const restParts: string[] = [];
    product.options!.forEach((o, i) => {
      if (i === ramOptIdx) return;
      const valId = selected[o.id];
      if (!valId) return;
      const v = o.values.find((x) => x.id === valId);
      if (v?.label) restParts.push(v.label);
    });

    const groups: string[] = [];
    if (restParts.length) groups.push(`(${restParts.join(", ")})`);
    if (ramValue) groups.push(`(${ramValue})`);
    return groups.length ? ` ${groups.join(" ")}` : "";
  }, [hasVariants, product.options, selected, activeVariant]);

  const displayTitle = `${product.name}${variantSuffix}`;

  const gallery = useMemo(() => {
    const base = product.images || [];

    if (!hasVariants || !activeVariant) return base;

    const dedupMerge = (first: string[], rest: string[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const url of [...first, ...rest]) {
        if (!url || seen.has(url)) continue;
        seen.add(url);
        out.push(url);
      }
      return out;
    };

    if (activeVariant.images?.length) {
      return dedupMerge(activeVariant.images, base);
    }

    const colorOpt = product.options!.find((o) => o.type === "color");
    if (colorOpt) {
      const colorIdx = product.options!.findIndex((o) => o.id === colorOpt.id);
      const colorValId = activeVariant.optionValueIds[colorIdx];
      const colorImages =
        colorOpt.values.find((v) => v.id === colorValId)?.images || [];
      if (colorImages.length) return dedupMerge(colorImages, base);
    }

    return base;
  }, [hasVariants, activeVariant, product.images, product.options]);

  useEffect(() => {
    loadGenerationRef.current += 1;
    setActiveImg(0);
    setImgError(false);
    setLoadedSrc(null);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVariant?.id, gallery.length]);

  // ✅ Force scroll to start on initial mobile load
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, []);

  const safeActiveImg = Math.min(activeImg, gallery.length - 1);
  const currentImage = gallery[safeActiveImg] || "/placeholder.png";

  const imgLoaded = currentImage === loadedSrc;
  const showSkeleton = !imgLoaded && !imgError;

  const price = activeVariant ? activeVariant.price : product.price;
  const originalPrice = activeVariant
    ? activeVariant.discountPrice
    : product.discountPrice;
  const stock = activeVariant ? activeVariant.stock : product.stock;

  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, Math.max(1, stock))));
  }, [stock]);

  const hasMrp = typeof originalPrice === "number" && originalPrice > price;
  const discountPct = hasMrp
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  const valueAvailable = (optId: string, valId: string): boolean => {
    if (!hasVariants) return true;
    const candidate = { ...selected, [optId]: valId };
    const fullySelected = product.options!.every((o) => candidate[o.id]);
    if (!fullySelected) return true;
    const match = product.variants!.find((v) =>
      product.options!.every((o, i) => v.optionValueIds[i] === candidate[o.id]),
    );
    return !!match && match.enabled && match.stock > 0;
  };

  const canDecrement = qty > 1 && stock > 0;
  const canIncrement = qty < stock;

  const decQty = () => {
    if (!canDecrement) return;
    setQty((q) => Math.max(1, q - 1));
  };

  const incQty = () => {
    if (!canIncrement) {
      if (stock > 0) toast.error(`Only ${stock} in stock`);
      return;
    }
    setQty((q) => q + 1);
  };

  const handleAdd = () => {
    if (hasVariants && !activeVariant) {
      toast.error("Please select all options");
      return;
    }
    if (hasVariants && (!activeVariant!.enabled || activeVariant!.stock <= 0)) {
      toast.error("This variant is out of stock");
      return;
    }
    if (stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    if (qty > stock) {
      toast.error(`Only ${stock} in stock`);
      return;
    }

    const trimmedSuffix = variantSuffix.trim();
    const variantLabel = trimmedSuffix || undefined;

    const selectedOptions = hasVariants
      ? product.options!.map((o, i) => ({
          name: o.name,
          value:
            o.values.find((v) => v.id === activeVariant!.optionValueIds[i])
              ?.label || "",
        }))
      : undefined;

    addItem(product, qty, {
      variantId: activeVariant?.id,
      variantLabel,
      selectedOptions,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);

    toast.success("Added to cart — heading to checkout");
    router.push("/checkout");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: displayTitle,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  const goPrevImg = () => {
    if (gallery.length <= 1) return;
    loadGenerationRef.current += 1;
    setActiveImg((i) => (i - 1 + gallery.length) % gallery.length);
    setImgError(false);
    setLoadedSrc(null);
  };

  const goNextImg = () => {
    if (gallery.length <= 1) return;
    loadGenerationRef.current += 1;
    setActiveImg((i) => (i + 1) % gallery.length);
    setImgError(false);
    setLoadedSrc(null);
  };

  const handleThumbnailClick = (i: number) => {
    loadGenerationRef.current += 1;
    setActiveImg(i);
    setImgError(false);
    setLoadedSrc(null);

    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: i * width,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const newIndex = Math.round(scrollLeft / clientWidth);
    if (newIndex !== activeImg) {
      setActiveImg(newIndex);
    }
  };

  const highlights = useMemo(
    () => (product.highlights || []).map((h) => h.trim()).filter(Boolean),
    [product.highlights],
  );

  const groupedSpecs = useMemo(() => {
    const map: Record<string, SpecValue[]> = {};
    const order: string[] = [];
    (product.specifications || []).forEach((s) => {
      const g = (s.group || "General").trim() || "General";
      if (!map[g]) {
        map[g] = [];
        order.push(g);
      }
      map[g].push(s);
    });
    return order.map((g) => ({ group: g, specs: map[g] }));
  }, [product.specifications]);

  return (
    <>
      {/* Added top padding for breathing room */}
      <div className="w-full pt-8 md:pt-12">
        <div className="grid md:grid-cols-5 gap-0 md:gap-10 items-start">
          {/* ─────────── IMAGE COLUMN (2/5) ─────────── */}
          <div className="md:col-span-2 w-full max-w-[480px] mx-auto flex justify-center md:sticky md:top-28 md:self-start">
            <div className="w-full">
              <div className="relative group w-full">
                {/* MOBILE SLIDER */}
                <div className="block md:hidden w-full">
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full aspect-square bg-gray-50"
                  >
                    {gallery.map((img, i) => (
                      <div
                        key={i}
                        className="w-full h-full shrink-0 snap-center relative flex items-center justify-center p-4"
                      >
                        {imgError ? (
                          <AlertTriangle size={32} className="text-gray-400" />
                        ) : (
                          <img
                            src={img}
                            alt={`${displayTitle} - ${i + 1}`}
                            // ✅ Added max-w-none to prevent auto-scroll bug
                            className="w-full h-full max-w-none object-contain cursor-zoom-in"
                            onClick={() => setIsZoomOpen(true)}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                    <button
                      onClick={() => setWishlisted((w) => !w)}
                      className={`w-8 h-8 rounded-full backdrop-blur shadow-sm flex items-center justify-center transition ${
                        wishlisted
                          ? "bg-red-500 text-white"
                          : "bg-white/90 text-gray-600"
                      }`}
                    >
                      <Heart
                        size={14}
                        fill={wishlisted ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-600"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>

                  {gallery.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {gallery.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-all ${
                            safeActiveImg === i
                              ? "w-4 bg-gray-900"
                              : "w-1.5 bg-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* DESKTOP IMAGE */}
                <div className="hidden md:flex justify-center w-full">
                  <div className="relative aspect-square w-full max-w-[440px] overflow-hidden bg-gray-50 rounded-3xl">
                    {imgError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <AlertTriangle size={32} className="mb-2" />
                        <p className="text-xs">Image unavailable</p>
                      </div>
                    ) : (
                      <>
                        {showSkeleton && <ImageSkeleton />}
                        <img
                          key={`${currentImage}::${loadedSrc === currentImage ? "loaded" : "loading"}`}
                          src={currentImage}
                          alt={displayTitle}
                          loading="eager"
                          fetchPriority="high"
                          decoding="sync"
                          className={`absolute inset-0 w-full h-full object-contain p-5 transition-all duration-300 cursor-zoom-in ${
                            imgLoaded
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-95"
                          }`}
                          onClick={() => setIsZoomOpen(true)}
                          onLoad={() =>
                            setLoadedSrc((prev) =>
                              prev === currentImage ? prev : currentImage,
                            )
                          }
                          onError={() => setImgError(true)}
                        />
                      </>
                    )}

                    {gallery.length > 1 && (
                      <>
                        <button
                          onClick={goPrevImg}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-700 hover:scale-105 transition opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={goNextImg}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-700 hover:scale-105 transition opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <button
                        onClick={() => setWishlisted((w) => !w)}
                        className={`w-8 h-8 rounded-full backdrop-blur shadow-sm flex items-center justify-center transition ${
                          wishlisted
                            ? "bg-red-500 text-white"
                            : "bg-white/90 text-gray-600 hover:bg-white"
                        }`}
                      >
                        <Heart
                          size={14}
                          fill={wishlisted ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        onClick={handleShare}
                        className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-600 hover:bg-white transition"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Thumbnails */}
                {gallery.length > 1 && (
                  <div className="hidden md:flex gap-2 mt-3 justify-center flex-wrap">
                    {gallery.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => handleThumbnailClick(i)}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden transition-all bg-gray-50 ${
                          safeActiveImg === i
                            ? "ring-2 ring-gray-900 ring-offset-1"
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        {imgThumbError[i] ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <AlertTriangle
                              size={12}
                              className="text-gray-400"
                            />
                          </div>
                        ) : (
                          <img
                            src={img}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-contain p-1"
                            onError={() =>
                              setImgThumbError((m) => ({ ...m, [i]: true }))
                            }
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─────────── CONTENT COLUMN (3/5) ─────────── */}
          <div className="md:col-span-3 px-4 md:px-0 py-4 md:py-0">
            {!infoReady ? (
              <InfoSkeleton />
            ) : (
              <>
                {/* Meta line */}
                <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-[0.15em] font-bold flex-wrap">
                  <span className="text-gray-400">{product.brand}</span>
                  {product.isFeatured && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-amber-600 inline-flex items-center gap-0.5">
                        <Star size={9} fill="currentColor" />
                        Featured
                      </span>
                    </>
                  )}
                  {stock > 0 ? (
                    stock <= 5 ? (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-amber-700">
                          Only {stock} left
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-green-700">In stock</span>
                      </>
                    )
                  ) : (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-red-700">Out of stock</span>
                    </>
                  )}
                </div>

                {/* Product title */}
                <h1 className="text-[22px] md:text-[28px] font-bold mb-3 leading-tight text-gray-900 tracking-tight">
                  {displayTitle}
                </h1>

                <div>
                  {hasMrp && (
                    <>
                      <span className="hidden sm:inline h-4 w-px bg-gray-200" />
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded">
                        <Zap size={10} /> {discountPct}% off
                      </span>
                    </>
                  )}
                </div>

                {/* Price & MRP */}
                <div className="flex items-end gap-3 flex-wrap mb-2">
                  <span className="text-3xl md:text-4xl font-bold text-gray-900 leading-none">
                    ₹{price.toLocaleString()}
                  </span>
                  {hasMrp && (
                    <>
                      <span className="text-base line-through text-gray-400 pb-1">
                        ₹{originalPrice!.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>

                {hasMrp && (
                  <p className="text-xs text-green-700 font-semibold mb-6 flex items-center gap-1">
                    <Zap size={11} />
                    You save ₹{(originalPrice! - price).toLocaleString()}
                  </p>
                )}

                {/* VARIANTS (Reduced Box size) */}
                {hasVariants && (
                  <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                    {product.options!.map((opt) => {
                      return (
                        <div key={opt.id}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">
                            {opt.name}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {opt.values.map((v) => {
                              const active = selected[opt.id] === v.id;
                              const available = valueAvailable(opt.id, v.id);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setSelected((s) => ({
                                      ...s,
                                      [opt.id]: v.id,
                                    }));
                                  }}
                                  disabled={!available}
                                  className={`relative rounded-lg overflow-hidden transition-all bg-white ${
                                    active
                                      ? "ring-1 ring-gray-900 ring-offset-1 shadow-sm"
                                      : "ring-1 ring-gray-200 hover:ring-gray-300"
                                  } ${
                                    !available
                                      ? "opacity-40 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  {opt.type === "color" ? (
                                    <div className="w-[44px] flex flex-col items-center">
                                      <div className="relative w-[44px] h-[44px] bg-white p-1">
                                        {v.images?.[0] ? (
                                          <img
                                            src={v.images[0]}
                                            alt={v.label}
                                            loading="lazy"
                                            decoding="async"
                                            className="absolute inset-0 w-full h-full object-contain p-0.5"
                                          />
                                        ) : (
                                          <div
                                            className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 rounded-md"
                                            style={
                                              v.colorHex
                                                ? { background: v.colorHex }
                                                : undefined
                                            }
                                          >
                                            {!v.colorHex && v.label}
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-[8px] text-center py-0.5 truncate w-full px-1 border-t border-gray-100 font-medium text-gray-600">
                                        {v.label}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="px-2.5 py-1 text-[11px] font-medium block">
                                      {v.label}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ─────────── QUANTITY & BUTTONS (Reduced Width & Compact) ─────────── */}
                <div className="flex flex-row items-center gap-2 mb-8">
                  {/* Modern Quantity Pill (Compact) */}
                  <div className="flex items-center justify-between border border-gray-300 rounded-lg h-9 bg-white w-[100px] shadow-sm shrink-0">
                    <button
                      type="button"
                      onClick={decQty}
                      disabled={!canDecrement}
                      className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition rounded-l-lg"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, stock)}
                      value={qty}
                      onChange={(e) => {
                        const v = Math.max(
                          1,
                          Math.min(stock || 1, Number(e.target.value) || 1),
                        );
                        setQty(v);
                      }}
                      className="w-7 h-full text-center text-xs font-bold outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={incQty}
                      disabled={!canIncrement}
                      className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition rounded-r-lg"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Add to Cart (Compact Outline) - Fixed width to avoid stretching */}
                  <button
                    onClick={handleAdd}
                    disabled={stock <= 0}
                    className={`w-[120px] h-9 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                      stock <= 0
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-transparent"
                        : justAdded
                          ? "bg-green-50 text-green-700 border-2 border-green-600"
                          : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-[0.98]"
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <Check size={14} className="text-green-700" /> Added
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={14} /> Add to Cart
                      </>
                    )}
                  </button>

                  {/* Buy Now (Compact Solid) - Fixed width to avoid stretching */}
                  <button
                    onClick={handleAdd}
                    disabled={stock <= 0}
                    className={`w-[100px] h-9 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                      stock <= 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                        : "bg-gray-900 hover:bg-black text-white active:scale-[0.98]"
                    }`}
                  >
                    <Zap size={14} className="fill-white" /> Buy Now
                  </button>
                </div>

                {/* Meta strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500 mb-8 border-b border-gray-100 pb-6">
                  <span className="inline-flex items-center gap-1">
                    <Package size={14} className="text-gray-400" />
                    <span className="text-gray-800 font-semibold">
                      {stock}
                    </span>{" "}
                    units
                  </span>
                  {activeVariant?.sku && (
                    <span>
                      SKU{" "}
                      <code className="font-mono text-gray-800">
                        {activeVariant.sku}
                      </code>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Truck size={14} className="text-gray-400" /> 2-4 days
                    delivery
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Shield size={14} className="text-gray-400" /> Warranty
                  </span>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-[14px] text-gray-600 leading-relaxed mb-6">
                    {product.description}
                  </p>
                )}

                {/* Highlights */}
                <HighlightsBlock highlights={highlights} />

                {/* Specifications */}
                <SpecificationsBlock groups={groupedSpecs} />

                {/* Similar Products */}
                <SimilarProducts
                  category={product.category || "general"}
                  currentProductId={product.id || ""}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky buy bar */}
      {infoReady && (
        <MobileBuyBar
          price={price}
          stock={stock}
          hasVariants={hasVariants}
          onAdd={handleAdd}
          justAdded={justAdded}
        />
      )}

      {/* Image Zoom Modal */}
      {isZoomOpen && (
        <ImageZoomModal
          images={gallery}
          activeIndex={safeActiveImg}
          onClose={() => setIsZoomOpen(false)}
          onNavigate={setActiveImg}
        />
      )}
    </>
  );
}
