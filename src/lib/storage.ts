import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload a file to Firebase Storage and return its public download URL.
 * @param file - The File object from an <input type="file" />
 * @param folder - The folder to store in (e.g. "products", "banners", "brands")
 */
export async function uploadImage(
  file: File,
  folder = "misc",
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${folder}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

/**
 * Delete a file from Firebase Storage given its public download URL.
 * Silently ignores errors if the file was already deleted.
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  if (!url || typeof url !== "string") return;

  try {
    // Extract storage path from the URL:
    // https://firebasestorage.googleapis.com/v0/b/BUCKET/o/products%2F123.jpg?alt=media&token=xxx
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/o\/(.+?)\?/);
    if (!match) {
      console.warn("Could not extract storage path from URL:", url);
      return;
    }
    const filePath = match[1];
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (err: any) {
    if (err?.code === "storage/object-not-found") {
      // File already deleted — ignore
      return;
    }
    console.error("Failed to delete image:", url, err);
  }
}

/**
 * Delete multiple images at once. Never throws.
 */
export async function deleteImagesByUrl(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) return;
  await Promise.all(urls.map((url) => deleteImageByUrl(url)));
}
