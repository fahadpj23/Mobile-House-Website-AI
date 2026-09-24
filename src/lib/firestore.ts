import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Product,
  Category,
  Order,
  CategorySpec,
  Brand,
  SpecTemplate,
} from "./types";

// ===== Products =====
export const getProducts = async (): Promise<Product[]> => {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
};

export const getProductById = async (id: string): Promise<Product | null> => {
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
};

export const addProduct = async (product: Omit<Product, "id">) => {
  return addDoc(collection(db, "products"), {
    ...product,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  return updateDoc(doc(db, "products", id), {
    ...product,
    updatedAt: Date.now(),
  });
};

export const deleteProduct = async (id: string) => {
  return deleteDoc(doc(db, "products", id));
};

// ===== Categories =====
export const getCategories = async (): Promise<Category[]> => {
  const snap = await getDocs(collection(db, "categories"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
};

export const addCategory = async (category: Omit<Category, "id">) => {
  return addDoc(collection(db, "categories"), category);
};

export const deleteCategory = async (id: string) => {
  return deleteDoc(doc(db, "categories", id));
};

// ===== Category Spec Templates =====
export const getCategorySpec = async (
  categorySlug: string,
): Promise<CategorySpec | null> => {
  const snap = await getDoc(doc(db, "categorySpecs", categorySlug));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CategorySpec;
};

export const saveCategorySpec = async (
  categorySlug: string,
  categoryName: string,
  specs: SpecTemplate[],
) => {
  return setDoc(doc(db, "categorySpecs", categorySlug), {
    categorySlug,
    categoryName,
    specs,
    updatedAt: Date.now(),
  });
};

export const getAllCategorySpecs = async (): Promise<CategorySpec[]> => {
  const snap = await getDocs(collection(db, "categorySpecs"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CategorySpec);
};

// ===== Brands =====
export const getBrands = async (): Promise<Brand[]> => {
  const q = query(collection(db, "brands"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Brand);
};

export const addBrand = async (name: string, logo?: string) => {
  const slug = name.toLowerCase().trim().replace(/\s+/g, "-");
  return setDoc(doc(db, "brands", slug), {
    name: name.trim(),
    slug,
    logo: logo || "",
    createdAt: Date.now(),
  });
};

export const deleteBrand = async (id: string) => {
  return deleteDoc(doc(db, "brands", id));
};

// ===== Orders =====
export const createOrder = async (order: Omit<Order, "id">) => {
  return addDoc(collection(db, "orders"), {
    ...order,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
};

export const getOrders = async (): Promise<Order[]> => {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
};

export const getOrdersByUser = async (userId: string): Promise<Order[]> => {
  const q = query(collection(db, "orders"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
};

export const updateOrder = async (id: string, data: Partial<Order>) => {
  return updateDoc(doc(db, "orders", id), { ...data, updatedAt: Date.now() });
};
