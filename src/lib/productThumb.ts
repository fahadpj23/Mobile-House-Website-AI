import type { Product } from "./types";

export function productThumb(p: Product | null | undefined): string {
  if (!p) return "/placeholder.png";

  const opts = p.options || [];
  const vars = p.variants || [];
  const colorIdx = opts.findIndex((o) => o.type === "color");

  const imgForVariant = (v: (typeof vars)[number]): string | undefined => {
    if (colorIdx === -1) return undefined;
    const valId = v.optionValueIds[colorIdx];
    const val = opts[colorIdx].values.find((x) => x.id === valId);
    return val?.images?.[0];
  };

  const inStock = vars.find((v) => v.enabled && v.stock > 0);
  if (inStock) {
    const img = imgForVariant(inStock);
    if (img) return img;
  }
  const enabled = vars.find((v) => v.enabled);
  if (enabled) {
    const img = imgForVariant(enabled);
    if (img) return img;
  }
  if (vars[0]) {
    const img = imgForVariant(vars[0]);
    if (img) return img;
  }
  for (const opt of opts) {
    if (opt.type !== "color") continue;
    for (const val of opt.values) {
      if (val.images?.[0]) return val.images[0];
    }
  }
  if (p.images?.[0]) return p.images[0];
  return "/placeholder.png";
}
