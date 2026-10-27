// lib/types.ts

// ===== Category (N-level tree) =====
export interface Category {
  id?: string;
  name: string;
  slug: string;
  parentSlug?: string | null;
}

// ===== Spec model (grouped) =====
export interface SpecField {
  key: string;
  placeholder?: string;
  required?: boolean;
}

export interface SpecGroup {
  group: string;
  fields: SpecField[];
}

export type SpecTemplate = SpecGroup;

export interface CategorySpec {
  id?: string;
  categorySlug: string;
  categoryName: string;
  specs: SpecGroup[];
  updatedAt?: number;
}

export function normalizeSpecs(raw: any): SpecGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (
    first &&
    typeof first === "object" &&
    "group" in first &&
    "fields" in first
  ) {
    return (raw as SpecGroup[]).map((g) => ({
      group: g.group,
      fields: (g.fields || []).map((f) => ({
        key: f.key ?? "",
        placeholder: f.placeholder ?? "",
        required: !!f.required,
      })),
    }));
  }
  return [
    {
      group: "General",
      fields: raw
        .filter((f: any) => f && typeof f === "object")
        .map((f: any) => ({
          key: f?.key ?? "",
          placeholder: f?.placeholder ?? "",
          required: !!f?.required,
        })),
    },
  ];
}

export interface Brand {
  id?: string;
  name: string;
  slug?: string;
  logo?: string;
}

export interface Series {
  id?: string;
  name: string;
  slug: string;
}

// ===== Product Variants =====
export interface ProductOptionValue {
  id: string;
  label: string;
  colorHex?: string;
  images?: string[];
}

export interface ProductOption {
  id: string;
  name: string;
  type: "text" | "color";
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  optionValueIds: string[];
  sku?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  /** Per-variant gallery. If empty, storefront falls back to color images. */
  images?: string[];
  enabled: boolean;
}

export interface SpecValue {
  key: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  group?: string;
}

export interface Product {
  id?: string;
  name: string;
  description?: string;
  highlights?: string[];
  price: number;
  discountPrice?: number;
  category: string;
  categoryPath?: string[];
  categoryName?: string;
  brand: string;
  stock: number;
  images: string[];
  specifications: SpecValue[];
  isSpecialOffer?: boolean;
  isFeatured?: boolean;
  totalSold?: number;
  series?: string;
  seriesName?: string;
  options?: ProductOption[];
  variants?: ProductVariant[];
  createdAt?: any;
  updatedAt?: any;
}

export interface Banner {
  id?: string;
  imageUrl: string;
  link?: string;
  position: "hero" | "mid" | "bottom";
  active: boolean;
  title?: string;
  subtitle?: string;
  order?: number;
  createdAt?: number;
}

export interface SpecialOffer {
  id?: string;
  title: string;
  description?: string;
  imageUrl: string;
  link?: string;
  discount?: string;
  active: boolean;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "cod" | "card" | "bkash" | "nagad";
export type PaymentStatus = "paid" | "unpaid";

export interface OrderItem {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id?: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shipping: {
    name: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
  };
  returnRequested?: boolean;
  returnReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type AdminSection =
  | "dashboard"
  | "products"
  | "categories"
  | "brands"
  | "banners"
  | "offers"
  | "orders"
  | "users";

export interface AdminUser {
  uid: string;
  email: string;
  role: "admin" | "super";
  permissions: AdminSection[] | ["*"];
  addedAt?: number;
}

export interface Customer {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  createdAt?: number;
  updatedAt?: number;
}
