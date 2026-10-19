// components/SpecialOffersLazy.tsx
"use client";

import HomeSectionLoader from "@/components/HomeSectionLoader";
import SpecialOffersSection from "@/components/SpecialOffersSection";

type Offer = Record<string, unknown>;

export default function SpecialOffersLazy() {
  return (
    <HomeSectionLoader<Offer[]>
      endpoint="/api/home/offers"
      minHeight={320}
      skeleton="offers"
      skeletonCount={3}
    >
      {(offers) =>
        offers.length > 0 ? (
          <SpecialOffersSection offers={offers as never} />
        ) : null
      }
    </HomeSectionLoader>
  );
}
