export interface Specification {
  key: string;
  value: string;
}

export interface SpecTemplate {
  key: string;
  required?: boolean;
  placeholder?: string;
}

export interface CategorySpec {
  id?: string;
  categorySlug: string;
  categoryName: string;
  specs: SpecTemplate[];
  updatedAt?: number;
}

export interface Brand {
  id?: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt?: number;
}

export interface Product {
  id?: string;
  name: string;
  brand: string;
  price: number;
  discountPrice?: number;
  category: string;
  subCategory?: string;
  description: string;
  stock: number;
  images: string[];
  specifications: Specification[];
  featured?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "cod" | "card" | "bkash" | "nagad";

export interface Order {
  id?: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid" | "paid";
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
