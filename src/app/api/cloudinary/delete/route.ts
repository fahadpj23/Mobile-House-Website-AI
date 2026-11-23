import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: Request) {
  try {
    const { publicIds } = await req.json();
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return NextResponse.json(
        { error: "publicIds required" },
        { status: 400 },
      );
    }

    const result = await cloudinary.api.delete_resources(publicIds, {
      invalidate: true,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("Cloudinary delete error:", err);
    return NextResponse.json(
      { error: err?.message || "Delete failed" },
      { status: 500 },
    );
  }
}
