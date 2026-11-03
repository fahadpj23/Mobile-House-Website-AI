// lib/firestore.ts
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
  runTransaction,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { deleteImageByUrl, deleteImagesByUrl } from "./storage";
import {
  Product,
  Category,
  Order,
  CategorySpec,
  Brand,
  SpecGroup,
  Banner,
  SpecialOffer,
  Customer,
} from "./types";

// ============================================================
// PRODUCTS
// ============================================================
export const getProducts = async (): Promise<Product[]> => {
  const q = query(
    collection(db, "websiteProducts"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
};

export const getProductById = async (id: string): Promise<Product | null> => {
  const snap = await getDoc(doc(db, "websiteProducts", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
};

export const addProduct = async (product: Omit<Product, "id">) => {
  return addDoc(collection(db, "websiteProducts"), {
    ...product,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  if (product.images && product.images.length >= 0) {
    const existing = await getDoc(doc(db, "websiteProducts", id));
    if (existing.exists()) {
      const oldImages: string[] = existing.data().images || [];
      const newImages: string[] = product.images;

      const removed = oldImages.filter((url) => !newImages.includes(url));

      if (removed.length > 0) {
        await deleteImagesByUrl(removed);
      }
    }
  }

  return updateDoc(doc(db, "websiteProducts", id), {
    ...product,
    updatedAt: Date.now(),
  });
};

export const deleteProduct = async (id: string) => {
  const productSnap = await getDoc(doc(db, "websiteProducts", id));
  if (!productSnap.exists()) {
    console.warn("Product not found:", id);
    return;
  }

  const product = productSnap.data() as Product;

  if (product.images && product.images.length > 0) {
    await deleteImagesByUrl(product.images);
  }

  return deleteDoc(doc(db, "websiteProducts", id));
};

// ============================================================
// CATEGORIES
// ============================================================
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

// ============================================================
// CATEGORY SPEC TEMPLATES
// ============================================================
export const getCategorySpec = async (
  categorySlug: string,
): Promise<CategorySpec | null> => {
  const snap = await getDoc(doc(db, "categorySpecs", categorySlug));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as unknown as CategorySpec;
};

export const saveCategorySpec = async (
  categorySlug: string,
  categoryName: string,
  specs: SpecGroup[],
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
  return snap.docs.map((d) => {
    const data = d.data() as Omit<CategorySpec, "id">;
    return { id: d.id, ...data };
  });
};

// ============================================================
// BRANDS
// ============================================================
export const getBrands = async (): Promise<Brand[]> => {
  const q = query(collection(db, "brands"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Brand);
};

export const addBrand = async (name: string, logo?: string): Promise<Brand> => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Brand name is required");

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const nameLower = trimmed.toLowerCase();

  const bySlug = await getDocs(
    query(collection(db, "brands"), where("slug", "==", slug)),
  );
  if (!bySlug.empty) {
    const d = bySlug.docs[0];
    return { id: d.id, ...(d.data() as Omit<Brand, "id">) };
  }

  const byName = await getDocs(
    query(collection(db, "brands"), where("nameLower", "==", nameLower)),
  );
  if (!byName.empty) {
    const d = byName.docs[0];
    return { id: d.id, ...(d.data() as Omit<Brand, "id">) };
  }

  const ref = await addDoc(collection(db, "brands"), {
    name: trimmed,
    slug,
    nameLower,
    logo: logo || "",
    createdAt: Date.now(),
  });

  return { id: ref.id, name: trimmed, slug, logo: logo || "" } as Brand;
};

export const deleteBrand = async (id: string) => {
  const snap = await getDoc(doc(db, "brands", id));
  if (snap.exists()) {
    const brand = snap.data() as Brand;
    if (brand.logo) {
      await deleteImageByUrl(brand.logo);
    }
  }
  return deleteDoc(doc(db, "brands", id));
};

// ============================================================
// STOCK MANAGEMENT (shared types)
// ============================================================
type CartLine = {
  product: {
    id: string;
    name?: string;
    variants?: { id: string; stock: number; enabled?: boolean }[];
  };
  variantId?: string;
  quantity: number;
};

/**
 * Internal: recompute product.stock from its variants.
 * Matches ProductForm: sum of enabled variants' stock.
 */
function computeAggregateStock(variants: any[]): number {
  return variants
    .filter((v) => v.enabled !== false)
    .reduce((s, v) => s + (Number(v.stock) || 0), 0);
}

// ============================================================
// ORDERS
// ============================================================
/**
 * Creates the order AND decrements stock atomically per product.
 * - Uses runTransaction per product so two simultaneous checkouts
 *   cannot oversell.
 * - Also increments totalSold in the same transaction.
 *
 * Throws if any product has insufficient stock.
 */
export const createOrder = async (order: Omit<Order, "id">) => {
  // Pre-group quantities by product & variant
  const productQty = new Map<string, number>();
  const variantQty = new Map<string, number>();

  for (const item of order.items) {
    const pid = item.productId;
    if (!pid) continue;
    productQty.set(pid, (productQty.get(pid) || 0) + item.quantity);
    if (item.variantId) {
      const k = `${pid}::${item.variantId}`;
      variantQty.set(k, (variantQty.get(k) || 0) + item.quantity);
    }
  }

  // ============================================================
  // STEP 1: Decrement stock (transactional, atomic per product)
  // ============================================================
  for (const [productId, totalQty] of productQty) {
    const productRef = doc(db, "websiteProducts", productId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(productRef);
      if (!snap.exists()) {
        throw new Error(`Product ${productId} no longer exists`);
      }

      const data = snap.data() as any;
      const hasVariants =
        Array.isArray(data.variants) && data.variants.length > 0;

      if (!hasVariants) {
        const current = Number(data.stock) || 0;
        if (current < totalQty) {
          throw new Error(
            `Insufficient stock for "${data.name}" — only ${current} left`,
          );
        }
        tx.update(productRef, {
          stock: current - totalQty,
          totalSold: increment(totalQty),
        });
        return;
      }

      // Variant path — decrement each variant, recompute aggregate
      const updatedVariants = data.variants.map((v: any) => {
        const key = `${productId}::${v.id}`;
        const dec = variantQty.get(key) || 0;
        if (dec === 0) return v;

        const current = Number(v.stock) || 0;
        if (current < dec) {
          throw new Error(
            `Insufficient stock for "${data.name}" (variant ${v.id}) — only ${current} left`,
          );
        }
        return { ...v, stock: current - dec };
      });

      tx.update(productRef, {
        variants: updatedVariants,
        stock: computeAggregateStock(updatedVariants),
        totalSold: increment(totalQty),
      });
    });
  }

  // ============================================================
  // STEP 2: Write the order document
  // ============================================================
  const orderRef = await addDoc(collection(db, "orders"), {
    ...order,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return orderRef;
};

/**
 * Exposed separately so the CheckoutPage can reserve stock BEFORE
 * createOrder and roll back if the order write fails.
 * (For the simplest flow, createOrder already does both — see CheckoutPage.)
 */
export const decrementStockForOrder = async (cartItems: CartLine[]) => {
  const productQty = new Map<string, number>();
  const variantQty = new Map<string, number>();

  for (const line of cartItems) {
    const pid = line.product.id;
    if (!pid) continue;
    productQty.set(pid, (productQty.get(pid) || 0) + line.quantity);
    if (line.variantId) {
      const k = `${pid}::${line.variantId}`;
      variantQty.set(k, (variantQty.get(k) || 0) + line.quantity);
    }
  }

  for (const [productId, totalQty] of productQty) {
    const prodRef = doc(db, "websiteProducts", productId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(prodRef);
      if (!snap.exists()) throw new Error(`Product ${productId} not found`);

      const data = snap.data() as any;
      const hasVariants =
        Array.isArray(data.variants) && data.variants.length > 0;

      if (!hasVariants) {
        const current = Number(data.stock) || 0;
        if (current < totalQty) {
          throw new Error(
            `Insufficient stock for "${data.name}" — only ${current} left`,
          );
        }
        tx.update(prodRef, {
          stock: current - totalQty,
          totalSold: increment(totalQty),
        });
        return;
      }

      const updatedVariants = data.variants.map((v: any) => {
        const key = `${productId}::${v.id}`;
        const dec = variantQty.get(key) || 0;
        if (dec === 0) return v;
        const current = Number(v.stock) || 0;
        if (current < dec) {
          throw new Error(
            `Insufficient stock for "${data.name}" (variant ${v.id}) — only ${current} left`,
          );
        }
        return { ...v, stock: current - dec };
      });

      tx.update(prodRef, {
        variants: updatedVariants,
        stock: computeAggregateStock(updatedVariants),
        totalSold: increment(totalQty),
      });
    });
  }
};

/**
 * Best-effort rollback: adds stock back + decrements totalSold.
 * Used when createOrder fails after decrementStockForOrder.
 */
export const restoreStockForOrder = async (cartItems: CartLine[]) => {
  const productQty = new Map<string, number>();
  const variantQty = new Map<string, number>();

  for (const line of cartItems) {
    const pid = line.product.id;
    if (!pid) continue;
    productQty.set(pid, (productQty.get(pid) || 0) + line.quantity);
    if (line.variantId) {
      const k = `${pid}::${line.variantId}`;
      variantQty.set(k, (variantQty.get(k) || 0) + line.quantity);
    }
  }

  for (const [productId, totalQty] of productQty) {
    const prodRef = doc(db, "websiteProducts", productId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(prodRef);
      if (!snap.exists()) return;

      const data = snap.data() as any;
      const hasVariants =
        Array.isArray(data.variants) && data.variants.length > 0;

      if (!hasVariants) {
        tx.update(prodRef, {
          stock: (Number(data.stock) || 0) + totalQty,
          totalSold: increment(-totalQty),
        });
        return;
      }

      const updatedVariants = data.variants.map((v: any) => {
        const key = `${productId}::${v.id}`;
        const inc = variantQty.get(key) || 0;
        return inc ? { ...v, stock: (Number(v.stock) || 0) + inc } : v;
      });

      tx.update(prodRef, {
        variants: updatedVariants,
        stock: computeAggregateStock(updatedVariants),
        totalSold: increment(-totalQty),
      });
    });
  }
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

// ============================================================
// BANNERS
// ============================================================
const bannersCol = collection(db, "banners");

export async function getBanners(position?: string): Promise<Banner[]> {
  const constraints = position ? [where("position", "==", position)] : [];
  const q = query(bannersCol, ...constraints);
  const snap = await getDocs(q);

  return snap.docs
    .map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as Banner & { order?: number; createdAt?: number },
    )
    .sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });
}

export async function addBanner(data: Omit<Banner, "id">) {
  const existing = await getDocs(bannersCol);
  const maxOrder = existing.docs.reduce((max, d) => {
    const o = (d.data() as { order?: number }).order;
    return typeof o === "number" && o > max ? o : max;
  }, 0);

  return addDoc(bannersCol, {
    ...data,
    order: maxOrder + 1,
    createdAt: Date.now(),
  });
}

export async function updateBanner(id: string, data: Partial<Banner>) {
  if (data.imageUrl) {
    const snap = await getDoc(doc(db, "banners", id));
    if (snap.exists()) {
      const oldUrl = snap.data().imageUrl;
      if (oldUrl && oldUrl !== data.imageUrl) {
        await deleteImageByUrl(oldUrl);
      }
    }
  }
  return updateDoc(doc(db, "banners", id), data);
}

export async function deleteBanner(id: string) {
  const snap = await getDoc(doc(db, "banners", id));
  if (snap.exists()) {
    const banner = snap.data() as Banner;
    if (banner.imageUrl) {
      await deleteImageByUrl(banner.imageUrl);
    }
  }
  return deleteDoc(doc(db, "banners", id));
}

// ============================================================
// SPECIAL OFFERS
// ============================================================
const offersCol = collection(db, "specialOffers");

export async function getSpecialOffers(
  activeOnly = false,
): Promise<SpecialOffer[]> {
  const constraints = activeOnly ? [where("active", "==", true)] : [];
  const q = query(offersCol, ...constraints);
  const snap = await getDocs(q);

  return snap.docs
    .map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as SpecialOffer & { createdAt?: number },
    )
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function addSpecialOffer(data: Omit<SpecialOffer, "id">) {
  return addDoc(offersCol, { ...data, createdAt: Date.now() });
}

export async function updateSpecialOffer(
  id: string,
  data: Partial<SpecialOffer>,
) {
  if (data.imageUrl) {
    const snap = await getDoc(doc(db, "specialOffers", id));
    if (snap.exists()) {
      const oldUrl = snap.data().imageUrl;
      if (oldUrl && oldUrl !== data.imageUrl) {
        await deleteImageByUrl(oldUrl);
      }
    }
  }
  return updateDoc(doc(db, "specialOffers", id), data);
}

export async function deleteSpecialOffer(id: string) {
  const snap = await getDoc(doc(db, "specialOffers", id));
  if (snap.exists()) {
    const offer = snap.data() as SpecialOffer;
    if (offer.imageUrl) {
      await deleteImageByUrl(offer.imageUrl);
    }
  }
  return deleteDoc(doc(db, "specialOffers", id));
}

// ============================================================
// MOST SELLING PRODUCTS
// ============================================================
export async function getMostSellingProducts(limit = 8): Promise<Product[]> {
  const q = query(
    collection(db, "websiteProducts"),
    orderBy("totalSold", "desc"),
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  return all.filter((p) => (p.totalSold || 0) > 0).slice(0, limit);
}

// ============================================================
// SERIES
// ============================================================
export interface Series {
  id: string;
  name: string;
  slug: string;
}

const SERIES_COLLECTION = "series";

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function getSeries(): Promise<Series[]> {
  const snap = await getDocs(
    query(collection(db, SERIES_COLLECTION), orderBy("name", "asc")),
  );
  return snap.docs.map((d) => {
    const data = d.data() as Partial<Series>;
    return {
      id: d.id,
      name: data.name || "",
      slug: data.slug || slugify(data.name || ""),
    };
  });
}

export async function addSeries(name: string): Promise<Series> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Series name is required");

  const slug = slugify(trimmed);

  const existing = await getDocs(
    query(collection(db, SERIES_COLLECTION), where("slug", "==", slug)),
  );
  if (!existing.empty) {
    const d = existing.docs[0];
    const data = d.data() as Partial<Series>;
    return {
      id: d.id,
      name: data.name || trimmed,
      slug: data.slug || slug,
    };
  }

  const ref = await addDoc(collection(db, SERIES_COLLECTION), {
    name: trimmed,
    slug,
    createdAt: Date.now(),
  });

  return { id: ref.id, name: trimmed, slug };
}

export async function deleteSeries(id: string) {
  return deleteDoc(doc(db, SERIES_COLLECTION, id));
}

// ============================================================
// CUSTOMERS
// ============================================================
const CUSTOMERS_COLLECTION = "customers";

export async function getCustomer(uid: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, CUSTOMERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Customer, "id">) };
}

export async function upsertCustomer(
  uid: string,
  data: Partial<Customer> & { email: string },
): Promise<Customer> {
  const ref = doc(db, CUSTOMERS_COLLECTION, uid);
  const existing = await getDoc(ref);

  const payload: Partial<Customer> = {
    ...data,
    updatedAt: Date.now(),
  };

  if (!existing.exists()) {
    payload.createdAt = Date.now();
  }

  await setDoc(ref, payload, { merge: true });

  const fresh = await getDoc(ref);
  return { id: fresh.id, ...(fresh.data() as Omit<Customer, "id">) };
}
