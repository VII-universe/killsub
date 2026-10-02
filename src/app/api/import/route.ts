import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { parseCsvTransactions, transactionsToText, extractPdfText, detectSubscriptionsFromText } from '@/utils/bankImport'

const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Uživatel není přihlášen.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Nahrajte prosím soubor s výpisem (CSV nebo PDF).' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Soubor je příliš velký. Maximální velikost je 10 MB.' }, { status: 400 })
    }

    const lowerName = file.name.toLowerCase()
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf')
    const isCsv = file.type === 'text/csv' || lowerName.endsWith('.csv')

    if (!isPdf && !isCsv) {
      return NextResponse.json({ error: 'Podporované formáty jsou CSV a PDF.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

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
  }
}
