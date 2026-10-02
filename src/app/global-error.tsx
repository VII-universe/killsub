'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="cs">
      <body style={{ background: '#080313', color: '#F0F0F4', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Něco se pokazilo</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: '#9094AD' }}>
            Omlouváme se, nastala neočekávaná chyba. Zkuste to prosím znovu.
          </p>
        </div>
      </body>
    </html>
  )
}
