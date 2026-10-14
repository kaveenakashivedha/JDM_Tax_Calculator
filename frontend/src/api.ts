export type FuelType = 'petrol' | 'hybrid'

export interface TaxRequest {
  unit_price: number
  inspection: number
  vehicle_m3: number
  auction_fee: number
  fuel_type: FuelType
  engine_cc: number
  jpy_rate: number
  usd_jpy_rate?: number
}

export interface TaxResponse {
  agent_fee_jpy: number
  insurance_jpy: number
  freight_jpy: number
  cif_jpy: number
  cif_lkr: number
  cid: number
  xid: number
  vat_base: number
  sscl: number
  vat: number
  vel: number
  luxury_tax: number
  total_tax: number
  fees: Record<string, number>
  total_fees: number
  total_vehicle_cost: number
}

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

interface ValidationError {
  loc: (string | number)[]
  msg: string
}

function errorMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return (detail as ValidationError[])
      .map((e) => `${e.loc[e.loc.length - 1]}: ${e.msg}`)
      .join('; ')
  }
  return 'Request failed'
}

export async function calculateTax(body: TaxRequest): Promise<TaxResponse> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/tax/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the server. It may be waking up — try again in a minute.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorMessage(data.detail))
  return data as TaxResponse
}
