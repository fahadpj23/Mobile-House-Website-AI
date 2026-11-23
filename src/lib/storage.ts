import { ref, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

/**
 * Upload a file to Cloudinary and return its secure URL.
 * @param file - The File object from an <input type="file" />
 * @param folder - Cloudinary folder (e.g. "products", "banners", "brands")
 */
export async function uploadImage(
  file: File,
  folder = "misc",
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary env variables are missing");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }
  return data.secure_url as string;
}

const isCloudinaryUrl = (url: string) => url.includes("res.cloudinary.com");
const isFirebaseUrl = (url: string) =>
  url.includes("firebasestorage.googleapis.com");

/** https://res.cloudinary.com/<cloud>/image/upload/v123/products/abc.webp -> products/abc */
function cloudinaryPublicId(url: string): string | null {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function deleteFirebaseImage(url: string): Promise<void> {
  try {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/o\/(.+?)\?/);
    if (!match) {
      console.warn("Could not extract storage path from URL:", url);
      return;
    }
    await deleteObject(ref(storage, match[1]));
  } catch (err: any) {
    if (err?.code === "storage/object-not-found") return;
    console.error("Failed to delete Firebase image:", url, err);
  }
}

/**
 * Delete one image by URL (Cloudinary or legacy Firebase). Never throws.
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  if (!url || typeof url !== "string") return;
  await deleteImagesByUrl([url]);
}

/**
 * Delete multiple images at once. Never throws.
 */
export async function deleteImagesByUrl(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) return;

  const cloudIds: string[] = [];
  const firebaseUrls: string[] = [];

  for (const url of urls) {
    if (!url || typeof url !== "string") continue;
    if (isCloudinaryUrl(url)) {
      const id = cloudinaryPublicId(url);
      if (id) cloudIds.push(id);
    } else if (isFirebaseUrl(url)) {
      firebaseUrls.push(url);
    }
  }

  await Promise.all([
    ...firebaseUrls.map(deleteFirebaseImage),
    cloudIds.length
      ? fetch("/api/cloudinary/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicIds: cloudIds }),
        }).catch((err) => console.error("Cloudinary delete failed:", err))
      : Promise.resolve(),
  ]);
}
