// Formen für die Partikel-Bühne im About-Teil.
// Jede Form liefert genau COUNT Punkte, damit zwischen ihnen überblendet werden kann.
// Koordinaten: Mitte 0, ungefähr ±1.6 breit, ±1.2 hoch. Formen mit fill: true
// füllen den ganzen Bildschirm und werden nicht nach rechts versetzt.

export type Shape = {
  positions: Float32Array; // COUNT * 3
  normals: Float32Array; // COUNT * 3, Länge 0 = keine Schattierung
  emphasis: Float32Array; // COUNT, 0 = leise, 1 = betont
  fill: boolean;
  drift: number; // wie stark die Partikel um ihre Position schwanken
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

function empty(count: number, fill: boolean, drift: number): Shape {
  return {
    positions: new Float32Array(count * 3),
    normals: new Float32Array(count * 3),
    emphasis: new Float32Array(count),
    fill,
    drift,
  };
}

function rotate(s: Shape, rx: number, ry: number) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  for (const arr of [s.positions, s.normals]) {
    for (let i = 0; i < arr.length; i += 3) {
      let x = arr[i], y = arr[i + 1], z = arr[i + 2];
      const y1 = y * cx - z * sx;
      const z1 = y * sx + z * cx;
      const x2 = x * cy + z1 * sy;
      const z2 = -x * sy + z1 * cy;
      arr[i] = x2; arr[i + 1] = y1; arr[i + 2] = z2;
    }
  }
}

// 1 · Rauschen über den ganzen Bildschirm
export function noise(count: number, w: number, h: number, quiet = false): Shape {
  const s = empty(count, true, 0.09);
  for (let i = 0; i < count; i++) {
    s.positions.set([rand(-w / 2, w / 2), rand(-h / 2, h / 2), rand(-1.5, 1.5)], i * 3);
    s.emphasis[i] = quiet ? rand(0.02, 0.14) : rand(0.2, 0.65);
  }
  return s;
}

// 2 · Gleichförmiges Raster, aus dem sich eine eigene Form löst
export function standout(count: number): Shape {
  const s = empty(count, false, 0.008);
  const gridCount = Math.floor(count * 0.76);
  const cols = 30, rows = 19;
  for (let i = 0; i < gridCount; i++) {
    const node = i % (cols * rows);
    const c = node % cols, r = Math.floor(node / cols);
    s.positions.set(
      [(c / (cols - 1) - 0.5) * 2.3 + gauss() * 0.004, (r / (rows - 1) - 0.5) * 1.45 + gauss() * 0.004, gauss() * 0.004],
      i * 3
    );
    s.emphasis[i] = 0.32;
  }
  for (let i = gridCount; i < count; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2;
    const k = Math.sqrt(1 - u * u);
    const n: [number, number, number] = [k * Math.cos(t), u, k * Math.sin(t)];
    s.positions.set([0.3 + n[0] * 0.3, 0.12 + n[1] * 0.3, 0.7 + n[2] * 0.3], i * 3);
    s.normals.set(n, i * 3);
    s.emphasis[i] = 1;
  }
  rotate(s, -0.45, 0.35);
  return s;
}

// 3 · Aus dem Rauschen tritt eine klare Signalwelle
export function signal(count: number): Shape {
  const s = empty(count, false, 0.045);
  const onWave = Math.floor(count * 0.45);
  for (let i = 0; i < count; i++) {
    const x = rand(-1.25, 1.25);
    if (i < onWave) {
      const y = 0.3 * Math.sin(x * 3.4) * (0.65 + 0.35 * Math.cos(x * 1.2));
      s.positions.set([x, y + gauss() * 0.012, gauss() * 0.03], i * 3);
      s.emphasis[i] = 1;
    } else {
      s.positions.set([x, gauss() * 0.7, rand(-0.6, 0.6)], i * 3);
      s.emphasis[i] = 0.28;
    }
  }
  rotate(s, 0, -0.25);
  return s;
}

// 4 · Gleichmäßiges Gitter: das System, keine Stelle schwächer als die andere
export function system(count: number): Shape {
  const s = empty(count, false, 0.006);
  const k = 9;
  const nodes = k * k * k;
  for (let i = 0; i < count; i++) {
    const node = i % nodes;
    const x = node % k, y = Math.floor(node / k) % k, z = Math.floor(node / (k * k));
    s.positions.set(
      [
        (x / (k - 1) - 0.5) * 1.5 + gauss() * 0.004,
        (y / (k - 1) - 0.5) * 1.5 + gauss() * 0.004,
        (z / (k - 1) - 0.5) * 1.5 + gauss() * 0.004,
      ],
      i * 3
    );
    s.emphasis[i] = 0.45;
  }
  rotate(s, 0.4, 0.62);
  return s;
}

// 5 · Steigende Kurve: testen, nachbessern, wachsen
export function growth(count: number): Shape {
  const s = empty(count, false, 0.02);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = rand(-1, 1);
    const x = -1.2 + 2.4 * u;
    const y = -0.8 + 1.6 * Math.pow(u, 2.2);
    s.positions.set([x, y + gauss() * 0.02, v * 0.32], i * 3);
    s.emphasis[i] = 0.3 + 0.7 * u;
  }
  rotate(s, 0.15, -0.45);
  return s;
}

// 7 · Kopf (Platzhalter aus einer Formel, später 3D-Scan)
type Vec3 = [number, number, number];

const sdEllipsoid = (p: Vec3, c: Vec3, r: Vec3) => {
  const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2];
  const k0 = Math.hypot(x, y, z);
  const k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
};
const sdSphere = (p: Vec3, c: Vec3, r: number) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r;
const sdCapsuleY = (p: Vec3, x: number, z: number, y0: number, y1: number, r: number) => {
  const y = Math.min(Math.max(p[1], y0), y1);
  return Math.hypot(p[0] - x, p[1] - y, p[2] - z) - r;
};
const smin = (a: number, b: number, k: number) => {
  const h = Math.min(Math.max(0.5 + (0.5 * (b - a)) / k, 0), 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
};
const ssub = (a: number, b: number, k: number) => -smin(-a, b, k);

function headSDF(p: Vec3): number {
  let d = sdEllipsoid(p, [0, 0.25, -0.05], [0.78, 0.88, 0.92]);
  d = smin(d, sdEllipsoid(p, [0, -0.25, 0.18], [0.62, 0.72, 0.68]), 0.25);
  d = smin(d, sdEllipsoid(p, [0, -0.72, 0.3], [0.36, 0.22, 0.3]), 0.2);
  for (const s of [-1, 1]) {
    d = smin(d, sdEllipsoid(p, [0.38 * s, -0.12, 0.5], [0.22, 0.16, 0.2]), 0.15);
    d = smin(d, sdEllipsoid(p, [0.8 * s, -0.02, -0.02], [0.08, 0.22, 0.14]), 0.06);
  }
  d = smin(d, sdEllipsoid(p, [0, 0.17, 0.74], [0.52, 0.1, 0.18]), 0.12);
  d = smin(d, sdEllipsoid(p, [0, -0.1, 0.88], [0.09, 0.25, 0.15]), 0.1);
  d = smin(d, sdSphere(p, [0, -0.3, 1.0], 0.1), 0.08);
  for (const s of [-1, 1]) {
    d = ssub(d, sdSphere(p, [0.27 * s, 0.03, 0.9], 0.16), 0.08);
    d = smin(d, sdSphere(p, [0.27 * s, 0.04, 0.72], 0.11), 0.03);
  }
  d = smin(d, sdEllipsoid(p, [0, -0.5, 0.8], [0.2, 0.07, 0.08]), 0.06);
  d = ssub(d, sdEllipsoid(p, [0, -0.5, 0.88], [0.18, 0.014, 0.06]), 0.02);
  d = smin(d, sdCapsuleY(p, 0, -0.12, -1.5, -0.7, 0.38), 0.2);
  return Math.max(d, -1.35 - p[1]);
}

const CENTER: Vec3 = [0, -0.2, 0];
function projectToSurface(dir: Vec3): Vec3 {
  let t = 2.4;
  for (let i = 0; i < 96; i++) {
    const p: Vec3 = [CENTER[0] + dir[0] * t, CENTER[1] + dir[1] * t, CENTER[2] + dir[2] * t];
    const d = headSDF(p);
    if (Math.abs(d) < 0.0008) break;
    t -= d * 0.8;
    if (t < 0) { t = 0; break; }
  }
  return [CENTER[0] + dir[0] * t, CENTER[1] + dir[1] * t, CENTER[2] + dir[2] * t];
}

// THREE und Hilfsfunktionen werden übergeben, damit sie nur einmal geladen werden
export function head(
  count: number,
  THREE: typeof import("three"),
  MeshSurfaceSampler: any,
  mergeVertices: (g: any) => any
): Shape {
  let g = new THREE.IcosahedronGeometry(1, 40) as any;
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const pos = g.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const p = projectToSurface([v.x, v.y, v.z]);
    pos.setXYZ(i, p[0], p[1], p[2]);
  }
  g.computeVertexNormals();

  const s = empty(count, false, 0.01);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(g)).build();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(p, n);
    s.positions.set([p.x * 0.85, (p.y + 0.12) * 0.85, p.z * 0.85], i * 3);
    s.normals.set([n.x, n.y, n.z], i * 3);
    s.emphasis[i] = 1;
  }
  return s;
}
