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
  premium_warranty_jpy?: number
  jdm_fee?: number
  web_value_jpy?: number
  warranty_handling_pct?: number
}

export interface TaxResponse {
  agent_fee_jpy: number
  purchase_fob_jpy: number
  fob_jpy: number
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
  premium_warranty_jpy: number
  premium_warranty_lkr: number
  warranty_handling_pct: number
  warranty_handling_fee: number
  total_vehicle_cost: number
}

// Mirrors agent_fee_for in app/tax.py so the form can show FOB before calculating.
// The backend recalculates and has the final say.
const AGENT_FEE_BANDS: [number, number][] = [
  [1_000_000, 140_000],
  [2_000_000, 150_000],
  [3_000_000, 160_000],
  [4_000_000, 280_000],
]

export function estimateFob(unitPrice: number, inspection: number): number {
  const band = AGENT_FEE_BANDS.find(([below]) => unitPrice < below)
  const agentFee = band ? band[1] : unitPrice * 0.1
  return unitPrice + agentFee + inspection
}

// Mirrors roro_freight in app/tax.py: [max M3 inclusive, flat JPY]; above 16 M3 is USD 95 per M3
const RORO_FREIGHT_BANDS: [number, number][] = [
  [10, 110_000],
  [11, 120_000],
  [12, 130_000],
  [13, 140_000],
  [14, 150_000],
  [15, 160_000],
  [16, 190_000],
]

export function estimateFreight(m3: number, usdJpyRate?: number): number | null {
  const band = RORO_FREIGHT_BANDS.find(([max]) => m3 <= max)
  if (band) return band[1]
  return usdJpyRate ? m3 * 95 * usdJpyRate : null
}

// Mirrors web_value_after_deduction in app/tax.py: remove 10% consumption tax, take 85%
export function webValueAfterDeduction(webValue: number): number {
  return (webValue * 100) / 110 * 85 / 100
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
