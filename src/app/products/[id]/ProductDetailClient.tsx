// app/products/[id]/ProductDetailClient.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Product, SpecValue } from "@/lib/types";
import { useCart } from "@/components/CartProvider";
import toast from "react-hot-toast";
import {
  ShoppingCart,
  Truck,
  Shield,
  Minus,
  Plus,
  Check,
  AlertTriangle,
  Sparkles,
  Star,
  Zap,
  Package,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Info,
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
   Highlights — editorial bullet column (medium text)
   ═══════════════════════════════════════════════════════ */
function HighlightsBlock({ highlights }: { highlights: string[] }) {
  if (!highlights.length) return null;

  return (
    <div className="mb-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2.5 flex items-center gap-1.5">
        <Sparkles size={10} className="text-amber-500" />
        Key features
      </p>
      <ul className="space-y-2">
        {highlights.map((h, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed"
          >
            <span className="text-amber-500 shrink-0 mt-0.5 font-semibold text-sm leading-none">
              →
            </span>
            <span className="flex-1">{h}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Specifications — refined editorial definition list
   ═══════════════════════════════════════════════════════ */
function SpecificationsBlock({
  groups,
}: {
  groups: { group: string; specs: SpecValue[] }[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (!groups.length) {
    return (
      <div className="flex items-start gap-2 py-3">
        <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500">No specifications provided.</p>
      </div>
    );
  }

  const total = groups.reduce((n, g) => n + g.specs.length, 0);
  const previewCount = 4;

  const preview: SpecValue[] = [];
  outer: for (const g of groups) {
    for (const s of g.specs) {
      preview.push(s);
      if (preview.length >= previewCount) break outer;
    }
  }

  const renderRow = (spec: SpecValue, i: number) => (
    <div
      key={i}
      className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 -mx-2 px-2 rounded transition-colors"
    >
      <span className="text-xs text-gray-500 shrink-0 w-28 leading-relaxed">
        {spec.key}
      </span>
      <span className="text-xs text-gray-900 font-medium break-words leading-relaxed flex-1 text-right">
        {spec.value}
      </span>
    </div>
  );

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 flex items-center gap-1.5">
          <span className="w-3 h-px bg-gray-400" />
          Specifications
        </p>
        <span className="text-[10px] text-gray-400 font-medium">
          {total} field{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Collapsed preview */}
      {!expanded && <div>{preview.map(renderRow)}</div>}

      {/* Expanded — grouped */}
      {expanded && (
        <div className="space-y-6">
          {groups.map(({ group, specs }) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                  {group}
                </p>
                <span className="flex-1 h-px bg-gray-100" />
                <span className="text-[9px] text-gray-400 font-semibold">
                  {specs.length}
                </span>
              </div>
              <div>{specs.map(renderRow)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 hover:text-blue-800 transition border border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/40"
      >
        {expanded ? (
          <>
            Show less
            <span className="text-sm leading-none">↑</span>
          </>
        ) : (
          <>
            Show all {total} specs
            <span className="text-sm leading-none">↓</span>
          </>
        )}
      </button>
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
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-gray-200 px-4 py-2.5 flex items-center gap-3">
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
        className={`h-10 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
          stock <= 0
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : justAdded
              ? "bg-green-600 text-white"
              : "bg-gray-900 text-white active:scale-95"
        }`}
      >
        {justAdded ? (
          <>
            <Check size={14} /> Added
          </>
        ) : (
          <>
            <ShoppingCart size={14} /> {hasVariants ? "Add" : "Add to Cart"}
          </>
        )}
      </button>
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

  const loadGenerationRef = useRef(0);

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

    const colorOpt = product.options!.find((o) => o.type === "color");
    if (!colorOpt) return base;

    const colorIdx = product.options!.findIndex((o) => o.id === colorOpt.id);
    const colorValId = activeVariant.optionValueIds[colorIdx];
    const colorImages =
      colorOpt.values.find((v) => v.id === colorValId)?.images || [];

    if (colorImages.length === 0) return base;

    const seen = new Set<string>();
    const out: string[] = [];
    for (const url of [...colorImages, ...base]) {
      if (!seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
    return out;
  }, [hasVariants, activeVariant, product.images, product.options]);

  useEffect(() => {
    loadGenerationRef.current += 1;
    setActiveImg(0);
    setImgError(false);
    setLoadedSrc(null);
  }, [activeVariant?.id]);

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
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-12 pb-24 md:pb-12">
        <div className="grid md:grid-cols-5 gap-6 md:gap-10">
          {/* ─────────── IMAGE COLUMN (2/5) ─────────── */}
          <div className="md:col-span-2">
            <div className="md:sticky md:top-24">
              <div className="relative group">
                <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50">
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
                        className={`absolute inset-0 w-full h-full object-contain p-8 transition-all duration-300 ${
                          imgLoaded
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-95"
                        }`}
                        onLoad={() => {
                          setLoadedSrc((prev) =>
                            prev === currentImage ? prev : currentImage,
                          );
                        }}
                        onError={() => setImgError(true)}
                      />
                    </>
                  )}

                  {gallery.length > 1 && (
                    <>
                      <button
                        onClick={goPrevImg}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-700 hover:scale-105 transition opacity-0 group-hover:opacity-100"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={goNextImg}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-700 hover:scale-105 transition opacity-0 group-hover:opacity-100"
                        aria-label="Next image"
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
                      aria-label="Wishlist"
                    >
                      <Heart
                        size={14}
                        fill={wishlisted ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-600 hover:bg-white transition"
                      aria-label="Share"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>

                  {gallery.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur text-gray-700 text-[10px] font-medium px-2.5 py-0.5 rounded-full shadow-sm">
                      {safeActiveImg + 1} / {gallery.length}
                    </div>
                  )}
                </div>

                {gallery.length > 1 && (
                  <div className="flex gap-2 mt-3 justify-center flex-wrap">
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
          <div className="md:col-span-3">
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

                {/* Title — smaller size, extrabold weight */}
                <h1 className="text-xl md:text-2xl font-extrabold mb-4 leading-snug text-gray-900 tracking-tight">
                  {displayTitle}
                </h1>

                {/* Price */}
                <div className="flex items-end gap-3 flex-wrap mb-2">
                  <span className="text-3xl md:text-4xl font-bold text-gray-900 leading-none">
                    ₹{price.toLocaleString()}
                  </span>
                  {hasMrp && (
                    <>
                      <span className="text-base line-through text-gray-400 pb-1">
                        ₹{originalPrice!.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded mb-1">
                        {discountPct}% OFF
                      </span>
                    </>
                  )}
                </div>

                {hasMrp && (
                  <p className="text-xs text-green-700 font-medium mb-5 flex items-center gap-1">
                    <Zap size={11} />
                    You save ₹{(originalPrice! - price).toLocaleString()}
                  </p>
                )}

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">
                    {product.description}
                  </p>
                )}

                {/* Highlights */}
                <HighlightsBlock highlights={highlights} />

                {/* Variants */}
                {hasVariants && (
                  <div className="space-y-5 mb-6 pb-6 border-b border-gray-100">
                    {product.options!.map((opt) => {
                      const chosenLabel = opt.values.find(
                        (v) => v.id === selected[opt.id],
                      )?.label;
                      return (
                        <div key={opt.id}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2.5">
                            {opt.name}
                            {chosenLabel && (
                              <span className="ml-2 text-gray-700 normal-case tracking-normal font-semibold">
                                {chosenLabel}
                              </span>
                            )}
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
                                  className={`relative rounded-xl overflow-hidden transition-all bg-white ${
                                    active
                                      ? "ring-2 ring-gray-900 ring-offset-1"
                                      : "ring-1 ring-gray-200 hover:ring-gray-400"
                                  } ${
                                    !available
                                      ? "opacity-40 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  {opt.type === "color" ? (
                                    <div className="w-[60px] flex flex-col items-center">
                                      <div className="relative w-[60px] h-[60px] bg-white p-1">
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
                                            className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 rounded"
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
                                      <p className="text-[9px] text-center py-1 truncate w-full px-1 border-t border-gray-100 font-medium text-gray-600">
                                        {v.label}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="px-3 py-1.5 text-[11px] font-medium block">
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

                {/* Qty + Add */}
                <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                  <div className="flex items-center border border-gray-300 rounded-xl h-12 bg-white">
                    <button
                      type="button"
                      onClick={decQty}
                      disabled={!canDecrement}
                      className="w-11 h-full flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition rounded-l-xl"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={15} />
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
                      className="w-11 h-full text-center text-sm font-semibold outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={incQty}
                      disabled={!canIncrement}
                      className="w-11 h-full flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition rounded-r-xl"
                      aria-label="Increase quantity"
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  <button
                    onClick={handleAdd}
                    disabled={stock <= 0}
                    className={`hidden md:flex flex-1 h-12 rounded-xl text-sm font-bold items-center justify-center gap-2 transition-all ${
                      stock <= 0
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : justAdded
                          ? "bg-green-600 text-white"
                          : "bg-gray-900 hover:bg-black text-white active:scale-[0.98]"
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <Check size={16} /> Added to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} /> Add to Cart
                      </>
                    )}
                  </button>
                </div>

                {/* Meta strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500 mb-6">
                  <span className="inline-flex items-center gap-1">
                    <Package size={11} />
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
                    <Truck size={11} /> 2-4 days
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Shield size={11} /> Warranty
                  </span>
                </div>

                {/* Specifications */}
                <SpecificationsBlock groups={groupedSpecs} />
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
    </>
  );
}
