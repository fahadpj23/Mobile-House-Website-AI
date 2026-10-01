// ===== Product =====
export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string; // slug of the category
  brand: string;
  stock: number;
  specifications?: { key: string; value: string }[];
  isSpecialOffer?: boolean;
  isFeatured?: boolean;
  series?: string;
  seriesName?: string;
  totalSold?: number;
  createdAt?: number;
  updatedAt?: number;
}

// ===== Customer =====
export interface Customer {
  id?: string; // Firebase Auth UID
  email: string;
  name?: string;
  photoURL?: string;
  phone?: string;
  provider?: "password" | "google";
  createdAt?: number;
  updatedAt?: number;
}
// ===== Category =====
export interface Category {
  id?: string;
  name: string;
  slug: string;
  createdAt?: number;
}

// ===== Spec Template (used in categories) =====
export interface SpecTemplate {
  key: string;
  placeholder?: string;
  required?: boolean;
}

// ===== Category Spec (stored in Firestore) =====
export interface CategorySpec {
  id?: string;
  categorySlug: string;
  categoryName: string;
  specs: SpecTemplate[];
  updatedAt?: number;
}

// ===== Brand =====
export interface Brand {
  id?: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt?: number;
}

// ===== Banner =====
export interface Banner {
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  link?: string;
  position: "hero" | "mid" | "bottom";
  active: boolean;
  order?: number;
  createdAt?: number;
}

// ===== Special Offer =====
export interface SpecialOffer {
  id?: string;
  title: string;
  description?: string;
  imageUrl: string;
  link?: string;
  discount?: string;
  active: boolean;
  createdAt?: number;
}

// ===== Order =====
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "cod" | "card" | "bkash" | "nagad";

export interface OrderItem {
  productId: string;
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
  paymentStatus: "paid" | "unpaid";
  shipping: {
    name: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
  };
  returnRequested?: boolean;
  returnReason?: string;
  createdAt?: number;
  updatedAt?: number;
}
