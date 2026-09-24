import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";

export const uploadImage = async (
  file: File,
  folder = "products",
): Promise<string> => {
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const storageRef = ref(storage, `${folder}/${filename}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const uploadMultipleImages = async (
  files: File[],
  folder = "products",
): Promise<string[]> => {
  return Promise.all(files.map((f) => uploadImage(f, folder)));
};

export const deleteImage = async (url: string) => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (err) {
    console.error("Delete image failed", err);
  }
};
