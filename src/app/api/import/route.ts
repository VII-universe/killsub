import { NextResponse } from 'next/server'
import { del, get } from '@vercel/blob'
import { createClient } from '@/utils/supabase/server'
import { parseCsvTransactions, transactionsToText, extractPdfText, detectSubscriptionsFromText } from '@/utils/bankImport'

export async function POST(request: Request) {
  let blobUrl: string | undefined

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    blobUrl = typeof body?.blobUrl === 'string' ? body.blobUrl : undefined
    const filename: string = typeof body?.filename === 'string' ? body.filename : ''

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile || profile.plan !== 'pro') {
      return NextResponse.json({ error: 'pro_required' }, { status: 403 })
    }

    if (!blobUrl) {
      return NextResponse.json({ error: 'Chybí odkaz na nahraný soubor.' }, { status: 400 })
    }

    const blobResult = await get(blobUrl, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    if (!blobResult || !blobResult.stream) {
      return NextResponse.json({ error: 'Nepodařilo se stáhnout nahraný soubor.' }, { status: 400 })
    }
    const buffer = Buffer.from(await new Response(blobResult.stream).arrayBuffer())

    const lowerName = filename.toLowerCase()
    const isPdf = lowerName.endsWith('.pdf')
    const isCsv = lowerName.endsWith('.csv')

    if (!isPdf && !isCsv) {
      return NextResponse.json({ error: 'Podporované formáty jsou CSV a PDF.' }, { status: 400 })
    }

    let transactionsText: string
    if (isCsv) {
      const csvText = buffer.toString('utf-8')
      const transactions = parseCsvTransactions(csvText)
      if (transactions.length === 0) {
        return NextResponse.json(
          { error: 'Ve výpisu se nepodařilo najít sloupec s částkou. Zkuste jiný soubor.' },
          { status: 400 }
        )
      }
      transactionsText = transactionsToText(transactions)
    } else {
      transactionsText = await extractPdfText(buffer)
      if (!transactionsText.trim()) {
        return NextResponse.json({ error: 'Z PDF se nepodařilo extrahovat žádný text.' }, { status: 400 })
      }
    }

    const subscriptions = await detectSubscriptionsFromText(transactionsText)
    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('Chyba při importu bankovního výpisu:', error)
    const message = error instanceof Error ? error.message : 'Nastala neočekávaná chyba při analýze výpisu.'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (blobUrl) {
      try {
        await del(blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN })
      } catch (cleanupError) {
        console.error('Nepodařilo se smazat dočasný blob:', cleanupError)
      }
    }
  }
}
