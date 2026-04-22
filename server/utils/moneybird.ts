// Moneybird API client
// Docs: https://developer.moneybird.com/

const BASE_URL = 'https://moneybird.com/api/v2'

interface MoneybirdConfig {
  apiToken: string
  administrationId: string
}

async function moneybirdFetch(config: MoneybirdConfig, path: string, options: any = {}) {
  const url = `${BASE_URL}/${config.administrationId}/${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Moneybird API error ${response.status}: ${text}`)
  }

  if (response.status === 204) return null
  return response.json()
}

// ─── CONTACTS ──────────────────────

export async function moneybirdCreateContact(config: MoneybirdConfig, data: {
  name: string
  email?: string
  phone?: string
  address?: string
}) {
  return moneybirdFetch(config, 'contacts.json', {
    method: 'POST',
    body: {
      contact: {
        company_name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        address1: data.address || ''
      }
    }
  })
}

export async function moneybirdFindContact(config: MoneybirdConfig, query: string) {
  const contacts = await moneybirdFetch(config, `contacts.json?query=${encodeURIComponent(query)}`)
  return contacts?.[0] || null
}

// ─── INVOICES ──────────────────────

export async function moneybirdCreateInvoice(config: MoneybirdConfig, data: {
  contactId: string
  lines: Array<{
    description: string
    quantity: number
    unitPrice: number
    vatRate: string // "21", "9", "0"
  }>
  reference?: string
}) {
  // Map VAT rates to Moneybird tax rate IDs
  // These are defaults — real IDs should come from Moneybird
  const details = data.lines.map(line => ({
    description: line.description,
    amount: String(line.quantity),
    price: String(line.unitPrice),
    tax_rate_id: line.vatRate // Will need to be mapped to actual Moneybird tax rate IDs
  }))

  return moneybirdFetch(config, 'sales_invoices.json', {
    method: 'POST',
    body: {
      sales_invoice: {
        contact_id: data.contactId,
        reference: data.reference || '',
        details_attributes: details
      }
    }
  })
}

export async function moneybirdSendInvoice(config: MoneybirdConfig, invoiceId: string, method: 'email' | 'manual' = 'email') {
  return moneybirdFetch(config, `sales_invoices/${invoiceId}/send_invoice.json`, {
    method: 'PATCH',
    body: {
      sales_invoice_sending: {
        delivery_method: method === 'email' ? 'Email' : 'Manual'
      }
    }
  })
}

export async function moneybirdGetInvoice(config: MoneybirdConfig, invoiceId: string) {
  return moneybirdFetch(config, `sales_invoices/${invoiceId}.json`)
}

// ─── TAX RATES ─────────────────────

export async function moneybirdGetTaxRates(config: MoneybirdConfig) {
  return moneybirdFetch(config, 'tax_rates.json')
}

// ─── TEST CONNECTION ───────────────

export async function moneybirdTestConnection(config: MoneybirdConfig): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const admin = await moneybirdFetch(config, '.json')
    return { ok: true, name: admin?.name || 'Verbonden' }
  }
  catch (e: any) {
    return { ok: false, error: e.message }
  }
}
