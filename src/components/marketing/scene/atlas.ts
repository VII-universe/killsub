import * as THREE from 'three'
import type { CardData } from '../content'

export const ATLAS_COLS = 4
export const ATLAS_ROWS = 4
export const BACK_TILE = 15 // last tile = card back

function fontFamily(varName: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return v ? v.split(',')[0].trim() : fallback
}

function noisePattern(ctx: CanvasRenderingContext2D) {
  const n = document.createElement('canvas')
  n.width = n.height = 96
  const nctx = n.getContext('2d')!
  const img = nctx.createImageData(96, 96)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 70
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  nctx.putImageData(img, 0, 0)
  return ctx.createPattern(n, 'repeat')!
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draws every card face (and one back) into a texture atlas. Text is user-style names only — no brand marks. */
export async function buildAtlas(cards: CardData[], lang: 'cs' | 'en', tileW: number): Promise<THREE.CanvasTexture> {
  const tileH = Math.round(tileW / 1.6)
  const canvas = document.createElement('canvas')
  canvas.width = tileW * ATLAS_COLS
  canvas.height = tileH * ATLAS_ROWS
  const ctx = canvas.getContext('2d')!

  const sans = fontFamily('--font-mk-sans', 'system-ui')
  const mono = fontFamily('--font-mk-mono', 'ui-monospace')
  // Safari can leave FontFaceSet.load() pending; never let fonts block the scene for more than 1.5 s.
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`600 40px ${sans}`), document.fonts.load(`500 40px ${mono}`)]),
      new Promise((r) => setTimeout(r, 1500)),
    ])
  } catch { /* fallback fonts are fine */ }

  const grain = noisePattern(ctx)
  const bone = '#ECE9E2'
  const bone2 = 'rgba(236,233,226,0.58)'
  const bone3 = 'rgba(236,233,226,0.34)'
  const pad = tileW * 0.065

  const drawBase = (x: number, y: number) => {
    // Matte anthracite with a very soft diagonal sheen and paper grain.
    ctx.fillStyle = '#1C1C22'
    ctx.fillRect(x, y, tileW, tileH)
    const g = ctx.createLinearGradient(x, y, x + tileW, y + tileH)
    g.addColorStop(0, 'rgba(255,255,255,0.045)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.0)')
    g.addColorStop(1, 'rgba(0,0,0,0.06)')
    ctx.fillStyle = g
    ctx.fillRect(x, y, tileW, tileH)
    ctx.save()
    ctx.globalAlpha = 0.07
    ctx.fillStyle = grain
    ctx.fillRect(x, y, tileW, tileH)
    ctx.restore()
  }

  const killMark = (cx: number, cy: number, r: number, color: string) => {
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1.5, r * 0.22)
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
    const d = r * 0.46
    ctx.beginPath(); ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d); ctx.stroke()
  }

  cards.forEach((card, i) => {
    const x = (i % ATLAS_COLS) * tileW
    const y = Math.floor(i / ATLAS_COLS) * tileH
    drawBase(x, y)

    // Name — the thing the user typed in. Display face, strong, top-left.
    ctx.fillStyle = bone
    ctx.textBaseline = 'top'
    ctx.font = `600 ${Math.round(tileH * 0.125)}px ${sans}`
    ctx.fillText(card.name, x + pad, y + pad * 0.95)

    // Small kill mark top-right (neutral Killsub glyph, not a brand logo).
    killMark(x + tileW - pad - tileH * 0.06, y + pad + tileH * 0.06, tileH * 0.055, bone3)

    // Price, mono, large, bottom-left; cycle + renewal day underneath.
    ctx.textBaseline = 'alphabetic'
    ctx.font = `500 ${Math.round(tileH * 0.19)}px ${mono}`
    const price = `${card.price.toLocaleString(lang === 'en' ? 'en-GB' : 'cs-CZ')} Kč`
    ctx.fillText(price, x + pad, y + tileH - pad - tileH * 0.11)
    ctx.fillStyle = bone2
    ctx.font = `500 ${Math.round(tileH * 0.062)}px ${mono}`
    const dayLabel = lang === 'en' ? `renews on the ${card.day}${card.day === 1 ? 'st' : card.day === 2 ? 'nd' : card.day === 3 ? 'rd' : 'th'}` : `obnoví se ${card.day}. den`
    ctx.fillText(`${card.cycle.toUpperCase()}  ·  ${dayLabel.toUpperCase()}`, x + pad, y + tileH - pad)

    // Thin rule above price block
    ctx.fillStyle = 'rgba(236,233,226,0.14)'
    ctx.fillRect(x + pad, y + tileH * 0.56, tileW - pad * 2, Math.max(1, tileH * 0.004))
  })

  // Card back: magnetic stripe + wordmark, no text noise.
  {
    const x = (BACK_TILE % ATLAS_COLS) * tileW
    const y = Math.floor(BACK_TILE / ATLAS_COLS) * tileH
    drawBase(x, y)
    ctx.fillStyle = 'rgba(0,0,0,0.42)'
    ctx.fillRect(x, y + tileH * 0.14, tileW, tileH * 0.17)
    ctx.fillStyle = bone3
    ctx.font = `500 ${Math.round(tileH * 0.07)}px ${mono}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('KILLSUB', x + pad, y + tileH - pad)
    killMark(x + tileW - pad - tileH * 0.07, y + tileH - pad - tileH * 0.06, tileH * 0.065, bone3)
    ctx.fillStyle = 'rgba(236,233,226,0.08)'
    roundRect(ctx, x + pad, y + tileH * 0.42, tileW * 0.32, tileH * 0.16, tileH * 0.03)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.anisotropy = 8
  tex.flipY = true
  tex.needsUpdate = true
  return tex
}

/** UV offset of a tile (atlas rows counted from the top of the canvas; flipY maps them to GL space). */
export function tileOffset(index: number): [number, number] {
  const col = index % ATLAS_COLS
  const row = Math.floor(index / ATLAS_COLS)
  return [col / ATLAS_COLS, 1 - (row + 1) / ATLAS_ROWS]
}
