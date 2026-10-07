// components/ViewToggle.tsx
"use client";
import { LayoutGrid, List } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "list"; // default: list

  const setView = (v: "grid" | "list") => {
    const usp = new URLSearchParams(searchParams.toString());
    if (v === "list") usp.delete("view");
    else usp.set("view", v);
    const qs = usp.toString();
    router.push(`/products${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
      <button
        onClick={() => setView("list")}
        className={`px-3 py-1.5 text-xs flex items-center gap-1 transition ${
          view === "list"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <List size={14} /> List
      </button>
      <button
        onClick={() => setView("grid")}
        className={`px-3 py-1.5 text-xs flex items-center gap-1 transition ${
          view === "grid"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <LayoutGrid size={14} /> Grid
      </button>
    </div>
  );
}
