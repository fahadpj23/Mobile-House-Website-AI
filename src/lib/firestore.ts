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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { deleteImageByUrl, deleteImagesByUrl } from "./storage";
import {
  Product,
  Category,
  Order,
  CategorySpec,
  Brand,
  SpecTemplate,
  Banner,
  SpecialOffer,
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

/**
 * Update a product. Automatically deletes any images that were
 * removed by comparing old vs new image arrays.
 */
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

/**
 * Delete a product AND all its images from Firebase Storage.
 */
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

// ============================================================
// BRANDS
// ============================================================
export const getBrands = async (): Promise<Brand[]> => {
  const q = query(collection(db, "brands"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Brand);
};

/**
 * Add a new brand. Uses an auto-generated doc id (NOT the slug),
 * so `deleteBrand(id)` works consistently with `getBrands()` results.
 * Prevents duplicates by case-insensitive name.
 */
export const addBrand = async (name: string, logo?: string): Promise<Brand> => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Brand name is required");

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const nameLower = trimmed.toLowerCase();

  // Dedupe by slug first (fast path for legacy data), then by nameLower
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

/**
 * Delete a brand. Also removes its logo from Storage if present.
 */
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
// ORDERS
// ============================================================
export const createOrder = async (order: Omit<Order, "id">) => {
  const orderRef = await addDoc(collection(db, "orders"), {
    ...order,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  for (const item of order.items) {
    try {
      const productRef = doc(db, "websiteProducts", item.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const currentSold = productSnap.data().totalSold || 0;
        await updateDoc(productRef, {
          totalSold: currentSold + item.quantity,
        });
      }
    } catch (err) {
      console.error("Failed to update totalSold for", item.productId, err);
    }
  }

  return orderRef;
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
  let q = query(bannersCol, orderBy("order", "asc"));
  if (position) {
    q = query(
      bannersCol,
      where("position", "==", position),
      orderBy("order", "asc"),
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Banner[];
}

export async function addBanner(data: Omit<Banner, "id">) {
  return addDoc(bannersCol, { ...data, createdAt: Date.now() });
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
  let q = query(offersCol, orderBy("createdAt", "desc"));
  if (activeOnly) {
    q = query(
      offersCol,
      where("active", "==", true),
      orderBy("createdAt", "desc"),
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SpecialOffer[];
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
  name: string; // display name: "S26 Series"
  slug: string; // "s26-series"
}

const SERIES_COLLECTION = "series";

/** Slugify: "S26 Series" → "s26-series" */
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

/**
 * Add a series. Prevents duplicates by slug.
 * Returns the existing one if the slug already exists.
 */
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
import type { Customer } from "./types";

const CUSTOMERS_COLLECTION = "customers";

/** Fetch a customer profile by UID. Returns null if none. */
export async function getCustomer(uid: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, CUSTOMERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Customer, "id">) };
}

/**
 * Create or update a customer profile in `customers/{uid}`.
 * Merges with existing data so you never overwrite `createdAt`.
 */
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
