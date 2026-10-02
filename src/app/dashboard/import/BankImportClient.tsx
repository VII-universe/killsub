'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import styles from './import.module.css'
import { addSubscription } from '@/app/actions/subscriptions'
import { suggestCategory } from '@/utils/categories'
import UpgradeModal from '@/components/UpgradeModal'

interface DetectedSubscription {
  name: string
  amount: number
  currency: string
  billing_cycle: string
  confidence: 'high' | 'medium' | 'low'
}

type Status = 'idle' | 'analyzing' | 'results' | 'error' | 'adding' | 'added' | 'pro_required'

const CYCLE_LABEL: Record<string, string> = {
  monthly: 'měsíčně',
  yearly: 'ročně',
  weekly: 'týdně',
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'vysoká jistota',
  medium: 'střední jistota',
  low: 'nízká jistota',
}

export default function BankImportClient() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState<DetectedSubscription[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [editedNames, setEditedNames] = useState<Record<number, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStatus('idle')
    setError(null)
    setDetected([])
    setSelected(new Set())
    setAddedCount(0)
    setEditedNames({})
  }

  const handleFile = async (file: File) => {
    setStatus('analyzing')
    setError(null)

    try {
      const uploadRes = await fetch('/api/import/upload', {
        method: 'PUT',
        headers: {
          'content-type': file.type || 'application/octet-stream',
          'x-filename': encodeURIComponent(file.name),
        },
        body: file,
      })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        setError(uploadData?.error || 'Nepodařilo se nahrát soubor.')
        setStatus('error')
        return
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blobUrl: uploadData.url, filename: file.name }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403 && data?.error === 'pro_required') {
          setStatus('pro_required')
          return
        }
        setError(data?.error || 'Nastala chyba při analýze výpisu.')
        setStatus('error')
        return
      }

      const subscriptions: DetectedSubscription[] = data.subscriptions || []
      setDetected(subscriptions)
      setSelected(new Set(subscriptions.map((_, idx) => idx)))
      setStatus('results')
    } catch {
      setError('Nepodařilo se spojit se serverem. Zkuste to znovu.')
      setStatus('error')
    }
  }

  const toggleSelected = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleAddSelected = async () => {
    setStatus('adding')
    let successCount = 0

    for (const idx of selected) {
      const sub = detected[idx]
      const name = (editedNames[idx] ?? sub.name).trim() || sub.name
      const formData = new FormData()
      formData.set('name', name)
      formData.set('amount', String(sub.amount))
      formData.set('currency', sub.currency || 'CZK')
      formData.set('billing_cycle', sub.billing_cycle || 'monthly')
      formData.set('category', suggestCategory(name))

      const result = await addSubscription(null, formData)
      if (result.success) successCount++
    }

    setAddedCount(successCount)
    setStatus('added')
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>
            <div className={styles.navMark}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1L9 5.5H14L10 8.5L11.5 13L7 10.2L2.5 13L4 8.5L0 5.5H5L7 1Z" fill="white" />
              </svg>
            </div>
            Killsub
          </Link>
          <Link href="/dashboard" className={styles.backLink}>← Zpět na dashboard</Link>
        </div>
      </nav>

      <main className={styles.main}>
        <h1 className={styles.title}>Import z bankovního výpisu</h1>
        <p className={styles.subtitle}>
          Nahraj CSV nebo PDF výpis z banky a AI za tebe najde opakující se platby za předplatná.
        </p>

        {(status === 'idle' || status === 'analyzing' || status === 'pro_required') && (
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
            style={status === 'analyzing' ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf,application/pdf,text/csv"
              className={styles.hiddenInput}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <div className={styles.dropzoneIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
              </svg>
            </div>
            <p className={styles.dropzoneTitle}>Přetáhni sem výpis z banky</p>
            <p className={styles.dropzoneHint}>nebo klikni pro výběr souboru · CSV nebo PDF, max 10 MB</p>
          </div>
        )}

        {status === 'pro_required' && (
          <UpgradeModal
            message="Import z bankovního výpisu pomocí AI je dostupný pouze pro Pro plán."
            onClose={() => setStatus('idle')}
          />
        )}

        {status === 'analyzing' && (
          <div className={styles.statusBox}>
            <div className={styles.spinner} />
            <p className={styles.statusText}>Analyzuji výpis…</p>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.statusBox}>
            <p className={styles.errorText}>{error}</p>
            <button type="button" className={styles.secondaryBtn} onClick={reset}>
              Zkusit znovu
            </button>
          </div>
        )}

        {status === 'results' && detected.length === 0 && (
          <div className={styles.statusBox}>
            <p className={styles.statusText}>
              Nenašli jsme žádná předplatná. Zkus jiný výpis nebo přidej předplatné ručně.
            </p>
            <div className={styles.resultActions}>
              <button type="button" className={styles.secondaryBtn} onClick={reset}>
                Zkusit jiný výpis
              </button>
              <Link href="/dashboard" className={styles.secondaryBtn}>
                Zpět na dashboard
              </Link>
            </div>
          </div>
        )}

        {(status === 'results' || status === 'adding') && detected.length > 0 && (
          <>
            <div className={styles.cardsList}>
              {detected.map((sub, idx) => (
                <label key={`${sub.name}-${idx}`} className={styles.card}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selected.has(idx)}
                    onChange={() => toggleSelected(idx)}
                  />
                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <input
                        type="text"
                        className={styles.cardNameInput}
                        value={editedNames[idx] ?? sub.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditedNames((prev) => ({ ...prev, [idx]: e.target.value }))}
                        title="Klepnutím přejmenuješ, co platba ve skutečnosti je"
                      />
                      <span className={`${styles.badge} ${styles[`badge_${sub.confidence}`]}`}>
                        {CONFIDENCE_LABEL[sub.confidence] || sub.confidence}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>
                      {sub.amount.toLocaleString('cs-CZ')} {sub.currency} · {CYCLE_LABEL[sub.billing_cycle] || sub.billing_cycle}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <button
              type="button"
              className={styles.primaryBtn}
              disabled={selected.size === 0 || status === 'adding'}
              onClick={handleAddSelected}
            >
              {status === 'adding' ? 'Přidávám…' : `Přidat vybrané do Killsub (${selected.size})`}
            </button>
          </>
        )}

        {status === 'added' && (
          <div className={styles.statusBox}>
            <p className={styles.successText}>
              {addedCount > 0
                ? `Přidáno ${addedCount} ${addedCount === 1 ? 'předplatné' : 'předplatných'} do Killsub.`
                : 'Nepodařilo se přidat žádné předplatné.'}
            </p>
            <div className={styles.resultActions}>
              <button type="button" className={styles.secondaryBtn} onClick={reset}>
                Importovat další výpis
              </button>
              <Link href="/dashboard" className={styles.primaryBtnLink}>
                Zpět na dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
