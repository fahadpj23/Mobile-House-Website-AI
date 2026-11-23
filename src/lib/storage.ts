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

/** https://res.cloudinary.com/<cloud>/image/upload/v123/products/abc.webp -> products/abc */
function cloudinaryPublicId(url: string): string | null {
  if (!url.includes("res.cloudinary.com")) return null;
  const m = url.match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+)\.[^./]+$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Delete one image by URL. Never throws.
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

  const publicIds = urls
    .map((u) => (typeof u === "string" ? cloudinaryPublicId(u) : null))
    .filter((id): id is string => !!id);

  if (publicIds.length === 0) return;

  try {
    await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicIds }),
    });
  } catch (err) {
    console.error("Cloudinary delete failed:", err);
  }
}
