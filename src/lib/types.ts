// ===== Category (N-level tree) =====
export interface Category {
  id?: string;
  name: string;
  slug: string;
  parentSlug?: string | null;
}

export interface SpecTemplate {
  key: string;
  placeholder?: string;
  required?: boolean;
}

export interface CategorySpec {
  categorySlug: string;
  categoryName: string;
  specs: SpecTemplate[];
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
  images?: string[];
  enabled: boolean;
}

export interface SpecValue {
  key: string;
  value: string;
  placeholder?: string;
  required?: boolean;
}

export interface Product {
  id?: string;
  name: string;
  description?: string;
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

// ===== Orders =====
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

// ===== Admin RBAC =====
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
