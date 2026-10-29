'use client'

/** Tiny synthesized UI sounds (no audio files). Off by default; the nav toggle flips `ks_sound` in localStorage. */
const KEY = 'ks_sound'
let ctx: AudioContext | null = null
let enabled = false
let loaded = false

function load() {
  if (loaded) return
  loaded = true
  try { enabled = localStorage.getItem(KEY) === '1' } catch { enabled = false }
}
export function isSoundOn() { load(); return enabled }
export function setSoundOn(on: boolean) {
  enabled = on; loaded = true
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
  if (on) { ensure(); playDing(0.5) }
}
function ensure() {
  if (!ctx) { try { ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)() } catch { return null } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}
function noise(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource(); src.buffer = buf; return src
}

/** Card lands on the pile: a short, dull tap. */
export function playKlap(gain = 0.18) {
  if (!isSoundOn()) return
  const c = ensure(); if (!c) return
  const t = c.currentTime
  const src = noise(c, 0.08)
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.07)
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  src.connect(lp).connect(g).connect(c.destination); src.start(t); src.stop(t + 0.09)
}
/** Card shatters: a brittle crunch. */
export function playCrunch(gain = 0.3) {
  if (!isSoundOn()) return
  const c = ensure(); if (!c) return
  const t = c.currentTime
  const src = noise(c, 0.22)
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.2); bp.Q.value = 0.8
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  src.connect(bp).connect(g).connect(c.destination); src.start(t); src.stop(t + 0.23)
}
/** Saved amount: a soft two-note ping. */
export function playDing(gain = 0.12) {
  if (!isSoundOn()) return
  const c = ensure(); if (!c) return
  const t = c.currentTime
  for (const [f, dt] of [[880, 0], [1318.5, 0.07]] as const) {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(gain, t + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.35)
    o.connect(g).connect(c.destination); o.start(t + dt); o.stop(t + dt + 0.4)
  }
}
