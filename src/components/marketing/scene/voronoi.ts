import * as THREE from 'three'
import { CARD_T, cardOutline, mulberry32 } from './common'

export type Fragment = { geometry: THREE.BufferGeometry; centroid: [number, number]; points: Float32Array }

type P = [number, number]

/** Sutherland–Hodgman clip of a polygon by the half-plane dot(p - m, n) <= 0. */
function clipHalfPlane(poly: P[], m: P, n: P): P[] {
  const out: P[] = []
  const side = (p: P) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1]
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const sa = side(a), sb = side(b)
    if (sa <= 0) out.push(a)
    if ((sa <= 0) !== (sb <= 0)) {
      const t = sa / (sa - sb)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

function centroid(poly: P[]): P {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    const f = p[0] * q[1] - q[0] * p[1]
    a += f; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f
  }
  a *= 0.5
  return a === 0 ? [0, 0] : [cx / (6 * a), cy / (6 * a)]
}

/** Pre-fragments one card face into Voronoi cells (built once per page, deterministic per seed). */
export function fragmentCard(seed: number, cells = 16): Fragment[] {
  const rand = mulberry32(seed)
  const outline = cardOutline(4)
  // Jittered grid seeds so cells are even-ish but never regular; a couple of extra seeds near the centre for finer shards there.
  const cols = 5, rows = 3
  const seeds: P[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    seeds.push([-0.8 + ((c + 0.5 + (rand() - 0.5) * 0.7) / cols) * 1.6, -0.5 + ((r + 0.5 + (rand() - 0.5) * 0.7) / rows) * 1.0])
  }
  while (seeds.length < cells) seeds.push([(rand() - 0.5) * 0.9, (rand() - 0.5) * 0.6])

  const frags: Fragment[] = []
  for (let i = 0; i < seeds.length; i++) {
    let poly = outline
    for (let j = 0; j < seeds.length; j++) {
      if (i === j) continue
      const m: P = [(seeds[i][0] + seeds[j][0]) / 2, (seeds[i][1] + seeds[j][1]) / 2]
      const n: P = [seeds[j][0] - seeds[i][0], seeds[j][1] - seeds[i][1]]
      poly = clipHalfPlane(poly, m, n)
      if (poly.length < 3) break
    }
    if (poly.length < 3) continue
    const c = centroid(poly)
    const shape = new THREE.Shape()
    poly.forEach((p, k) => (k === 0 ? shape.moveTo(p[0] - c[0], p[1] - c[1]) : shape.lineTo(p[0] - c[0], p[1] - c[1])))
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: CARD_T, bevelEnabled: false })
    g.translate(0, 0, -CARD_T / 2)
    g.computeBoundingSphere()
    const pts = new Float32Array(poly.length * 6)
    poly.forEach((p, k) => {
      pts[k * 6] = p[0] - c[0]; pts[k * 6 + 1] = p[1] - c[1]; pts[k * 6 + 2] = -CARD_T / 2
      pts[k * 6 + 3] = p[0] - c[0]; pts[k * 6 + 4] = p[1] - c[1]; pts[k * 6 + 5] = CARD_T / 2
    })
    frags.push({ geometry: g, centroid: c, points: pts })
  }
  return frags
}
