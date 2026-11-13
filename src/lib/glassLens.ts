// Glasverzerrung wie auf raggededge.com (Daniel, 13.11.2026), als SVG-Filter
// statt WebGL. Eine Verschiebungskarte aus dem Canvas sagt jedem Pixel, von
// wo er sein Bild holt: Rot = waagrecht, Grün = senkrecht, 128 = nichts.

const NS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";
let host: SVGSVGElement | null = null;

const svg = () => {
  if (!host) {
    host = document.createElementNS(NS, "svg");
    host.setAttribute("aria-hidden", "true");
    host.setAttribute("width", "0");
    host.setAttribute("height", "0");
    host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    document.body.append(host);
  }
  return host;
};

const node = (tag: string, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
};

// Karte malen: fn liefert je Pixel [dx, dy] zwischen -1 und 1
const paint = (w: number, h: number, fn: (x: number, y: number) => [number, number]) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [dx, dy] = fn(x, y);
      const i = (y * w + x) * 4;
      d[i] = Math.round(127.5 + 127.5 * dx);
      d[i + 1] = Math.round(127.5 + 127.5 * dy);
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
};

const image = (href: string, attrs: Record<string, string | number>) => {
  const el = node("feImage", { ...attrs, preserveAspectRatio: "none" });
  el.setAttribute("href", href);
  el.setAttributeNS(XLINK, "xlink:href", href);
  return el;
};

const filter = (id: string, attrs: Record<string, string | number>) => {
  document.getElementById(id)?.remove();
  const f = node("filter", {
    id,
    filterUnits: "userSpaceOnUse",
    primitiveUnits: "userSpaceOnUse",
    "color-interpolation-filters": "sRGB",
    ...attrs,
  });
  svg().append(f);
  return f;
};

// Rand wie gebogenes Glas: zum Bildschirmrand hin wird das Bild waagrecht
// vergrößert. Formel von raggededge (CurveEffect, distance 34, strength 1):
// uv.x += (uv.x * 2 - 1) * -0.05 * pow(1 - abstand, 34). Hier mit doppeltem
// Exponenten, damit die Zone halb so hoch ist (Daniel, 13.11.2026), dazu ein
// leichter Weichzeichner, der zur Kante hin zunimmt: das macht es gläsern.
export const edgeLens = (id: string, w: number, h: number, edge: "top" | "bottom", vh: number) => {
  const STRENGTH = 0.05;
  const DISTANCE = 68;
  const BLUR = 2.2;
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  const dist = (y: number) => (edge === "top" ? y + 0.5 : h - y - 0.5);
  const href = paint(w, h, (x, y) => {
    const u = (2 * (x + 0.5)) / w - 1;
    const f = Math.max(1 - dist(y) / vh, 0) ** DISTANCE;
    return [-u * f, 0];
  });
  // Maske für den Weichzeichner: an der Kante voll, nach innen auslaufend
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createImageData(1, h);
  for (let y = 0; y < h; y++) {
    g.data[y * 4 + 3] = Math.round(255 * Math.max(1 - dist(y) / h, 0) ** 1.6);
  }
  ctx.putImageData(g, 0, 0);
  const mask = c.toDataURL();
  const f = filter(id, { x: 0, y: 0, width: w, height: h });
  f.append(
    image(href, { x: 0, y: 0, width: w, height: h, result: "map" }),
    node("feDisplacementMap", {
      in: "SourceGraphic",
      in2: "map",
      scale: (2 * STRENGTH * w).toFixed(1),
      xChannelSelector: "R",
      yChannelSelector: "G",
      result: "warp",
    }),
    node("feGaussianBlur", { in: "warp", stdDeviation: BLUR, edgeMode: "duplicate", result: "soft" }),
    image(mask, { x: 0, y: 0, width: w, height: h, result: "mask" }),
    node("feComposite", { in: "soft", in2: "mask", operator: "in", result: "edge" }),
    node("feComposite", { in: "edge", in2: "warp", operator: "over" }),
  );
  return `url(#${id})`;
};
