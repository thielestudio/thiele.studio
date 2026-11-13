// Erzeugt public/pixel-mask.svg: die Maske für die Pixel-Füllung der Buttons
// (src/components/PixelButton.astro). 20 Bilder nebeneinander, je COLS × ROWS
// Zellen. Die Füllung läuft von links nach rechts, mit einer weichen, gestreuten
// Kante: Jede Zelle blendet über mehrere Bilder ein (Deckkraft in 5-%-Stufen),
// Zellen weiter rechts und mit höherem Zufallswert später. Bild 0 ist leer,
// Bild 19 ist voll. Fester Startwert, damit jeder Lauf dieselbe Datei ergibt.
//
//   node scripts/pixel-mask.mjs
import { writeFileSync } from "node:fs";

const COLS = 16;
const ROWS = 5;
const FRAMES = 20;
const CELL = 10;
const BAND = 0.4; // Breite der weichen Kante, Anteil der Gesamtbreite
const JITTER = 0.14; // Zufall im Einsatz je Zelle, Anteil des Ablaufs
const FADE = 0.36; // so lange blendet eine Zelle ein, Anteil des Ablaufs
const STRETCH = 1.12; // der Ablauf endet vor dem letzten Bild, das Bild 19 ist ohnehin voll

let seed = 20261014;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const fw = COLS * CELL;
const fh = ROWS * CELL;
const jitter = Array.from({ length: COLS * ROWS }, () => rand());

const frames = [];
for (let k = 1; k < FRAMES - 1; k++) {
  const p = (k / (FRAMES - 1)) * STRETCH;
  const byOpacity = new Map();
  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const start = (col / COLS) * (1 - BAND) + jitter[i] * JITTER;
    const v = Math.min(Math.max((p - start) / FADE, 0), 1);
    const op = Math.round(v * 20) / 20;
    if (op <= 0) continue;
    const x = k * fw + col * CELL;
    const y = row * CELL;
    // 0,1 Überlappung gegen Haarlinien zwischen den Zellen
    const d = `M${x} ${y}h${CELL + 0.1}v${CELL + 0.1}h-${CELL + 0.1}z`;
    byOpacity.set(op, (byOpacity.get(op) ?? "") + d);
  }
  for (const [op, d] of [...byOpacity].sort((a, b) => a[0] - b[0])) {
    frames.push(op >= 1 ? `<path d="${d}"/>` : `<path d="${d}" opacity="${op}"/>`);
  }
}
frames.push(`<path d="M${(FRAMES - 1) * fw} 0h${fw}v${fh}h-${fw}z"/>`);

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fw * FRAMES} ${fh}" ` +
  `preserveAspectRatio="none" shape-rendering="crispEdges"><g fill="#fff">${frames.join("")}</g></svg>\n`;

writeFileSync(new URL("../public/pixel-mask.svg", import.meta.url), svg);
console.log(`public/pixel-mask.svg: ${FRAMES} Bilder, ${COLS}×${ROWS} Zellen, ${svg.length} Bytes`);
