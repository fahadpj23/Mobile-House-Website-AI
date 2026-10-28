"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Product } from "@/lib/types";

interface CartItem {
  product: Product;
  variantId?: string;
  variantLabel?: string;
  selectedOptions?: { name: string; value: string }[];
  quantity: number;
}

interface AddItemOpts {
  variantId?: string;
  variantLabel?: string;
  selectedOptions?: { name: string; value: string }[];
}

interface CartCtx {
  items: CartItem[];
  addItem: (product: Product, quantity: number, opts?: AddItemOpts) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  isReady: boolean;
}

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "cart_v1";

// ✅ Accept both parameters as possibly undefined
const makeKey = (
  productId: string | undefined,
  variantId?: string | undefined,
) => `${productId || "unknown"}__${variantId || "base"}`;

// ✅ Now i.product.id is safely passed
const keyOf = (i: CartItem) => makeKey(i.product.id, i.variantId);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
    hydrated.current = true;
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem: CartCtx["addItem"] = (product, quantity, opts) => {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    setItems((prev) => {
      const key = makeKey(product.id, opts?.variantId);
      const existing = prev.find((i) => keyOf(i) === key);
      if (existing) {
        return prev.map((i) =>
          keyOf(i) === key ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [
        ...prev,
        {
          product,
          quantity,
          variantId: opts?.variantId,
          variantLabel: opts?.variantLabel,
          selectedOptions: opts?.selectedOptions,
        },
      ];
    });
  };

  const removeItem = (key: string) =>
    setItems((prev) => prev.filter((i) => keyOf(i) !== key));

  const updateQty = (key: string, qty: number) => {
    const next = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0;
    setItems((prev) =>
      prev
        .map((i) => (keyOf(i) === key ? { ...i, quantity: next } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const clearCart = () => setItems([]);

  // ✅ STRICTLY USE `price` for total calculation
  const total = useMemo(
    () =>
      items.reduce((s, i) => {
        const v = i.product.variants?.find((x) => x.id === i.variantId);
        const actualPrice = v ? v.price : i.product.price;
        return s + (actualPrice ?? 0) * i.quantity;
      }, 0),
    [items],
  );

  const value = useMemo<CartCtx>(
    () => ({
      items,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      total,
      isReady,
    }),
    [items, total, isReady],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
};
