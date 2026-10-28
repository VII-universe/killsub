import * as THREE from 'three'
import { tileOffset, BACK_TILE, ATLAS_COLS, ATLAS_ROWS } from './atlas'

// Card = 1.6 × 1.0 × 0.035 units (payment-card ratio).
export const CARD_W = 1.6
export const CARD_H = 1.0
export const CARD_T = 0.035
export const CARD_R = 0.085
export const G = 9.81

/** Outline of the card face (counter-clockwise, rounded corners) as a polygon — shared by the mesh and the Voronoi fragmenter. */
export function cardOutline(segments = 5): [number, number][] {
  const w = CARD_W / 2, h = CARD_H / 2, r = CARD_R
  const pts: [number, number][] = []
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= segments; i++) {
      const a = a0 + (i / segments) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  corner(w - r, -h + r, -Math.PI / 2)
  corner(w - r, h - r, 0)
  corner(-w + r, h - r, Math.PI / 2)
  corner(-w + r, -h + r, Math.PI)
  return pts
}

export function cardGeometry() {
  const s = new THREE.Shape()
  const w = CARD_W / 2, h = CARD_H / 2, r = CARD_R
  s.moveTo(-w + r, -h)
  s.lineTo(w - r, -h); s.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false)
  s.lineTo(w, h - r); s.absarc(w - r, h - r, r, 0, Math.PI / 2, false)
  s.lineTo(-w + r, h); s.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-w, -h + r); s.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false)
  const bevel = 0.006
  const depth = CARD_T - bevel * 2
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 })
  g.translate(0, 0, -depth / 2)
  g.computeBoundingSphere()
  return g
}

export type CardMaterialMode = { kind: 'instanced' } | { kind: 'single'; tile: number; offset?: [number, number] }

/** Matte anthracite card with clearcoat; the face samples the text atlas, edges stay plain. */
export function cardMaterial(atlas: THREE.Texture, mode: CardMaterialMode) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x1c1c22,
    map: atlas,
    roughness: 0.52,
    metalness: 0.12,
    clearcoat: 0.75,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.38,
  })
  const [bx, by] = tileOffset(BACK_TILE)
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTileScale = { value: new THREE.Vector2(1 / ATLAS_COLS, 1 / ATLAS_ROWS) }
    shader.uniforms.uBackTile = { value: new THREE.Vector2(bx, by) }
    shader.uniforms.uCardSize = { value: new THREE.Vector2(CARD_W, CARD_H) }
    shader.uniforms.uFade = { value: 1 }
    const single = mode.kind === 'single'
    if (single) {
      const [tx, ty] = tileOffset(mode.tile)
      shader.uniforms.uTile = { value: new THREE.Vector2(tx, ty) }
      shader.uniforms.uOffset = { value: new THREE.Vector2(mode.offset?.[0] ?? 0, mode.offset?.[1] ?? 0) }
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${single ? 'uniform vec2 uTile; uniform vec2 uOffset;' : 'attribute vec2 aTile;'} varying vec2 vTile; varying vec2 vCardUv; varying vec3 vObjN; uniform vec2 uCardSize;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\nvTile = ${single ? 'uTile' : 'aTile'}; vCardUv = (position.xy${single ? ' + uOffset' : ''}) / uCardSize + 0.5; vObjN = normal;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vTile; varying vec2 vCardUv; varying vec3 vObjN; uniform vec2 uTileScale; uniform vec2 uBackTile; uniform float uFade;')
      .replace('#include <map_fragment>', `
        float face = step(0.92, abs(vObjN.z));
        vec2 tile = vObjN.z > 0.0 ? vTile : uBackTile;
        vec2 cuv = vObjN.z > 0.0 ? vCardUv : vec2(1.0 - vCardUv.x, vCardUv.y);
        vec2 tuv = clamp(cuv, 0.002, 0.998) * uTileScale + tile;
        vec4 texel = texture2D(map, tuv);
        diffuseColor.rgb = mix(diffuseColor.rgb * 1.25, texel.rgb, face);
        diffuseColor.a *= uFade;
      `)
    mat.userData.shader = shader
  }
  return mat
}

export function floorTexture(): THREE.CanvasTexture {
  // Floor: near-black with a soft lift under the pile and a darker drain disc the cards sink into.
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#0B0B0E'
  ctx.fillRect(0, 0, 512, 512)
  const lift = ctx.createRadialGradient(256, 256, 20, 256, 256, 250)
  lift.addColorStop(0, '#15151A')
  lift.addColorStop(0.55, '#0E0E12')
  lift.addColorStop(1, '#0B0B0E')
  ctx.fillStyle = lift
  ctx.fillRect(0, 0, 512, 512)
  const drain = ctx.createRadialGradient(256, 256, 0, 256, 256, 92)
  drain.addColorStop(0, '#040405')
  drain.addColorStop(0.7, '#07070A')
  drain.addColorStop(0.92, 'rgba(28,28,34,0.5)')
  drain.addColorStop(1, 'rgba(28,28,34,0)')
  ctx.fillStyle = drain
  ctx.fillRect(0, 0, 512, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
