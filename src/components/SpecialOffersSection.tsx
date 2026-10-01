import Link from "next/link";
import { SpecialOffer } from "@/lib/types";

export default function SpecialOffersSection({
  offers,
}: {
  offers: SpecialOffer[];
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <h2 className="text-lg md:text-xl font-bold mb-4">🎁 Special Offers</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {offers.map((o) => (
          <Link
            key={o.id}
            href={o.link || "#"}
            className="card overflow-hidden group flex flex-col"
          >
            {/*
              Full-image container:
              - aspect-[4/3] gives a wide box so landscape banners look right
              - flex + items-center + justify-center centers the image
              - object-contain makes the entire image visible, no crop
              - bg-gray-50 gives the empty space a soft background
            */}
            <div className="bg-gray-50 aspect-[4/3] flex items-center justify-center p-2 relative">
              <img
                src={o.imageUrl}
                alt={o.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              {o.discount && (
                <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {o.discount}
                </span>
              )}
            </div>

            <div className="p-3">
              <h3 className="font-semibold text-sm line-clamp-1">{o.title}</h3>
              {o.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {o.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
