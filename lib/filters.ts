export type FilterName = "none" | "dreamy" | "vintage" | "mono";
export const FILTERS: { key: FilterName; label: string; css: string }[] = [
  { key: "none", label: "Natural", css: "none" },
  { key: "dreamy", label: "Dreamy", css: "brightness(1.08) saturate(0.85) contrast(0.92) hue-rotate(-8deg)" },
  { key: "vintage", label: "Vintage", css: "sepia(0.45) contrast(1.05) saturate(0.9) brightness(0.98)" },
  { key: "mono", label: "Black and white", css: "grayscale(1) contrast(1.1)" }
];

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Applies a filter to raw RGBA pixels in place. Pixel maths works in every browser (canvas ctx.filter does not). */
export function applyFilter(data: Uint8ClampedArray, name: FilterName) {
  if (name === "none") return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (name === "mono") {
      const y = clamp((0.299 * r + 0.587 * g + 0.114 * b - 128) * 1.1 + 128);
      data[i] = data[i + 1] = data[i + 2] = y;
    } else if (name === "vintage") {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b, sg = 0.349 * r + 0.686 * g + 0.168 * b, sb = 0.272 * r + 0.534 * g + 0.131 * b;
      data[i] = clamp(r * 0.55 + sr * 0.45 + 6);
      data[i + 1] = clamp(g * 0.55 + sg * 0.45);
      data[i + 2] = clamp(b * 0.55 + sb * 0.45 - 8);
    } else if (name === "dreamy") {
      data[i] = clamp((r - 128) * 0.9 + 128 + 18);
      data[i + 1] = clamp((g - 128) * 0.9 + 128 + 6);
      data[i + 2] = clamp((b - 128) * 0.9 + 128 + 20);
    }
  }
}
