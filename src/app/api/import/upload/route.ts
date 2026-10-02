import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createClient } from '@/utils/supabase/server'

const MAX_SIZE = 10 * 1024 * 1024

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
    }

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Soubor je příliš velký. Maximální velikost je 10 MB.' }, { status: 400 })
    }

    const body = await request.blob()
    if (body.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Soubor je příliš velký. Maximální velikost je 10 MB.' }, { status: 400 })
    }

    const rawName = request.headers.get('x-filename')
    const filename = rawName ? decodeURIComponent(rawName) : 'statement'
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const pathname = `bank-imports/${user.id}-${Date.now()}-${safeName}`

    const blob = await put(pathname, body, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Chyba při nahrávání do Vercel Blob:', error)
    const message = error instanceof Error ? error.message : 'Nepodařilo se nahrát soubor.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
