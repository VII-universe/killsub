'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Content, Lang } from './content'
import SplitFlap from './SplitFlap'
import type { KillSceneHandle } from './scene/kill'

type Pop = { id: number; x: number; y: number; text: string }

export default function KillSection({ c, lang }: { c: Content; lang: Lang }) {
  const k = c.kill
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([])
  const handleRef = useRef<KillSceneHandle | null>(null)
  const [saved, setSaved] = useState(0)
  const [dead, setDead] = useState<boolean[]>(() => k.cards.map(() => false))
  const [pops, setPops] = useState<Pop[]>([])
  const [live, setLive] = useState('')
  const [ready, setReady] = useState(false)
  const locale = lang === 'en' ? 'en-GB' : 'cs-CZ'
  const fmt = (n: number) => n.toLocaleString(locale)
  const allDead = dead.every(Boolean)

  const doKill = useCallback((i: number) => {
    const h = handleRef.current
    if (!h) return
    setDead((d) => (d[i] ? d : d.map((v, j) => (j === i ? true : v))))
    h.kill(i)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    let handle: KillSceneHandle | null = null
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || handle || cancelled) return
      io.disconnect()
      import('./scene/kill').then(async ({ createKillScene }) => {
        if (cancelled) return
        handle = await createKillScene(canvas, {
          cards: k.cards,
          lang,
          reducedMotion: reduced,
          onFirstFrame: () => setReady(true),
          onKilled: (i, at) => {
            const card = k.cards[i]
            setSaved((s) => s + card.price)
            const id = Date.now() + i
            setPops((p) => [...p, { id, x: at.x, y: at.y, text: `+${fmt(card.price)} Kč` }])
            window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1600)
            setLive(k.a11y.killed.replace('{name}', card.name).replace('{price}', fmt(card.price)))
          },
          onRects: (rects) => {
            rects.forEach((r, i) => {
              const b = btnRefs.current[i]
              if (!b) return
              if (!r) { b.style.display = 'none'; return }
              b.style.display = ''
              b.style.transform = `translate(${r.x}px, ${r.y}px)`
              b.style.width = `${r.w}px`
              b.style.height = `${r.h}px`
            })
          },
        })
        handleRef.current = handle
        if (cancelled) handle.dispose()
      }).catch((err) => console.error('[kill] scene failed', err))
    }, { rootMargin: '400px 0px' })
    io.observe(canvas)
    return () => { cancelled = true; io.disconnect(); handle?.dispose(); handleRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const onCanvasMove = (e: React.PointerEvent) => {
    const h = handleRef.current
    if (!h) return
    const i = h.pick(e.clientX, e.clientY)
    h.setHover(i)
    ;(e.currentTarget as HTMLElement).style.cursor = i === null ? '' : 'pointer'
  }
  const onCanvasDown = (e: React.PointerEvent) => {
    const h = handleRef.current
    if (!h) return
    const i = h.pick(e.clientX, e.clientY)
    if (i !== null) doKill(i)
  }
  const replay = () => {
    handleRef.current?.reset()
    setDead(k.cards.map(() => false))
    setSaved(0)
    setLive('')
    btnRefs.current[0]?.focus()
  }

  return (
    <section className="mk-kill" aria-labelledby="mk-kill-h">
      <div className="mk-kill-grid">
        <div className="mk-kill-copy">
          <p className="mk-eyebrow mono upper">{k.eyebrow}</p>
          <h2 id="mk-kill-h" className="mk-h2">
            {k.headline.split('\n').map((l, i) => <span className="mk-line" key={i}><span className="mk-line-in" style={{ ['--i' as string]: i }}>{l}</span></span>)}
          </h2>
          <p className="mk-sub">{k.sub}</p>
          <p className="mk-saved" aria-hidden="true">
            <SplitFlap value={saved} locale={locale} label="" />
            <span className="mk-cur">Kč</span>
          </p>
          <p className="mk-counter-label mono">{k.savedLabel}</p>
          <p className="mk-kill-hint mono">{allDead ? k.done.replace('{value}', fmt(saved)) : k.instruction}</p>
          {allDead && <button type="button" className="mk-btn mk-btn-ghost" onClick={replay}>{k.replay} <span className="arr" aria-hidden="true">↻</span></button>}
        </div>
        <div className="mk-kill-stage" data-ready={ready}>
          <canvas ref={canvasRef} aria-label={k.a11y.scene} role="img" onPointerMove={onCanvasMove} onPointerDown={onCanvasDown} onPointerLeave={() => handleRef.current?.setHover(null)} />
          <div className="mk-kill-buttons">
            {k.cards.map((card, i) => (
              <button
                key={card.name}
                ref={(el) => { btnRefs.current[i] = el }}
                type="button"
                className="mk-kill-btn"
                disabled={dead[i]}
                aria-label={k.a11y.kill.replace('{name}', card.name).replace('{price}', fmt(card.price)).replace('{reason}', card.reason)}
                onClick={() => doKill(i)}
                onFocus={() => handleRef.current?.setHover(i)}
                onBlur={() => handleRef.current?.setHover(null)}
              />
            ))}
          </div>
          <ul className="mk-kill-reasons mono" aria-hidden="true">
            {k.cards.map((card, i) => (
              <li key={card.name} data-dead={dead[i]}>
                <span className="mk-kill-reason-name">{card.name}</span>
                <span>{dead[i] ? `−${fmt(card.price)} Kč` : card.reason}</span>
              </li>
            ))}
          </ul>
          {pops.map((p) => (
            <span key={p.id} className="mk-pop mono" style={{ left: p.x, top: p.y }} aria-hidden="true">{p.text}</span>
          ))}
        </div>
      </div>
      <div className="mk-caps">
        <p className="mk-eyebrow mono upper">{c.capabilities.eyebrow}</p>
        <ul className="mk-caps-list">
          {c.capabilities.rows.map((r, i) => (
            <li key={r.title}>
              <span className="mono mk-cap-n" style={{ color: 'var(--mk-ink3)' }}>0{i + 1}</span>
              <span className="mk-cap-title">{r.title}</span>
              <span className="mk-cap-body">{r.body}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mk-sr-live" aria-live="polite" role="status">{live}</p>
    </section>
  )
}
