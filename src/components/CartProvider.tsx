"use client";
import {
  createContext,
  useContext,
  useEffect,
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
}

const Ctx = createContext<CartCtx>({} as CartCtx);
const STORAGE_KEY = "cart_v1";

const keyOf = (i: CartItem) => `${i.product.id}__${i.variantId || "base"}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setItems(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const addItem: CartCtx["addItem"] = (product, quantity, opts) => {
    setItems((prev) => {
      const key = `${product.id}__${opts?.variantId || "base"}`;
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

  const updateQty = (key: string, qty: number) =>
    setItems((prev) =>
      prev
        .map((i) => (keyOf(i) === key ? { ...i, quantity: qty } : i))
        .filter((i) => i.quantity > 0),
    );

  const clearCart = () => setItems([]);

  const total = items.reduce((s, i) => {
    const v = i.product.variants?.find((x) => x.id === i.variantId);
    const price = v
      ? v.discountPrice || v.price
      : i.product.discountPrice || i.product.price;
    return s + price * i.quantity;
  }, 0);

  return (
    <Ctx.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, total }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => useContext(Ctx);
