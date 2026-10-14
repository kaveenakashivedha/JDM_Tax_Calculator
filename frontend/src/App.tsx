import { useState, type FormEvent } from 'react'
import { calculateTax, type FuelType, type TaxResponse } from './api'

const RORO_FLAT_RATE_MAX_M3 = 16

interface FormState {
  unit_price: string
  auction_fee: string
  inspection: string
  vehicle_m3: string
  fuel_type: FuelType
  engine_cc: string
  jpy_rate: string
  usd_jpy_rate: string
}

const EMPTY: FormState = {
  unit_price: '',
  auction_fee: '',
  inspection: '',
  vehicle_m3: '',
  fuel_type: 'petrol',
  engine_cc: '',
  jpy_rate: '',
  usd_jpy_rate: '',
}

const SAMPLE: FormState = {
  unit_price: '1450000',
  auction_fee: '0',
  inspection: '30000',
  vehicle_m3: '8.22',
  fuel_type: 'petrol',
  engine_cc: '658',
  jpy_rate: '2.1014',
  usd_jpy_rate: '',
}

const FEE_LABELS: Record<string, string> = {
  banking: 'Banking fees',
  clearing: 'Clearing fees',
  port: 'Port fees',
  stamp: 'Stamp fee',
  jdm: 'JDM fee',
}

const lkr = (n: number) =>
  'Rs ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const jpy = (n: number) => '¥' + Math.round(n).toLocaleString('en-US')
const pct = (part: number, whole: number) => ((part / whole) * 100).toFixed(1) + '%'

export default function App() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [result, setResult] = useState<TaxResponse | null>(null)
  const [submitted, setSubmitted] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const needsUsdRate = Number(form.vehicle_m3) > RORO_FLAT_RATE_MAX_M3

  const set = (key: keyof FormState) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await calculateTax({
        unit_price: Number(form.unit_price),
        auction_fee: Number(form.auction_fee || 0),
        inspection: Number(form.inspection || 0),
        vehicle_m3: Number(form.vehicle_m3),
        fuel_type: form.fuel_type,
        engine_cc: Number(form.engine_cc),
        jpy_rate: Number(form.jpy_rate),
        ...(needsUsdRate && { usd_jpy_rate: Number(form.usd_jpy_rate) }),
      })
      setResult(res)
      setSubmitted(form)
    } catch (err) {
      setResult(null)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <header className="masthead">
        <h1>JDM Tax Calculator</h1>
        <p>Estimate Sri Lankan import taxes and the total landed cost of a Japanese vehicle.</p>
      </header>

      <div className="layout">
        <form className="card form" onSubmit={onSubmit}>
          <div className="card-head">
            <h2>Vehicle details</h2>
            <button type="button" className="link" onClick={() => setForm(SAMPLE)}>
              Fill sample
            </button>
          </div>

          <fieldset>
            <legend>Purchase in Japan (JPY)</legend>
            <Field label="Unit price" hint="Auction buy price">
              <input type="number" min="1" step="any" required value={form.unit_price}
                onChange={set('unit_price')} placeholder="1,450,000" />
            </Field>
            <Field label="Auction fee" hint="Optional">
              <input type="number" min="0" step="any" value={form.auction_fee}
                onChange={set('auction_fee')} placeholder="0" />
            </Field>
            <Field label="Inspection">
              <input type="number" min="0" step="any" required value={form.inspection}
                onChange={set('inspection')} placeholder="30,000" />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Vehicle</legend>
            <Field label="Fuel type">
              <select value={form.fuel_type} onChange={set('fuel_type')}>
                <option value="petrol">Petrol</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>
            <Field label="Engine capacity (cc)" hint="Up to 1599cc">
              <input type="number" min="1" max="1599" step="1" required value={form.engine_cc}
                onChange={set('engine_cc')} placeholder="658" />
            </Field>
            <Field label="Size (M3)" hint="Length × width × height in metres">
              <input type="number" min="0.01" step="any" required value={form.vehicle_m3}
                onChange={set('vehicle_m3')} placeholder="8.22" />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Exchange rates</legend>
            <Field label="LKR per 1 JPY">
              <input type="number" min="0" step="any" required value={form.jpy_rate}
                onChange={set('jpy_rate')} placeholder="2.1014" />
            </Field>
            {needsUsdRate && (
              <Field label="JPY per 1 USD" hint={`Freight above ${RORO_FLAT_RATE_MAX_M3} M3 is charged in USD`}>
                <input type="number" min="0" step="any" required value={form.usd_jpy_rate}
                  onChange={set('usd_jpy_rate')} placeholder="150" />
              </Field>
            )}
          </fieldset>

          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
          {error && <p className="error" role="alert">{error}</p>}
        </form>

        <section className="card results" aria-live="polite">
          {result && submitted ? (
            <Results
              r={result}
              f={submitted}
              showDetails={showDetails}
              onToggle={() => setShowDetails(!showDetails)}
            />
          ) : (
            <div className="empty">
              <h2>Total vehicle cost</h2>
              <p>Enter the vehicle details and press <strong>Calculate</strong> to see the estimate.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="footnote">
        Estimates only. Tax rates, fees and freight charges may change; confirm with your clearing agent.
      </footer>
    </main>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <span className="hint">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function Results({
  r,
  f,
  showDetails,
  onToggle,
}: {
  r: TaxResponse
  f: FormState
  showDetails: boolean
  onToggle: () => void
}) {
  const otherFees = r.total_fees - (r.fees.jdm ?? 0)
  const summary = [
    { label: 'Vehicle (CIF)', value: r.cif_lkr, tone: 'vehicle' },
    { label: 'Government tax', value: r.total_tax, tone: 'tax' },
    { label: 'Bank, port & clearing', value: otherFees, tone: 'fees' },
    { label: 'JDM fee', value: r.fees.jdm ?? 0, tone: 'jdm' },
  ]

  return (
    <>
      <div className="total">
        <h2>Total vehicle cost</h2>
        <p className="total-value">{lkr(r.total_vehicle_cost)}</p>
      </div>

      <div className="bar" aria-hidden="true">
        {summary.map((s) => (
          <span key={s.label} className={`seg ${s.tone}`}
            style={{ width: pct(s.value, r.total_vehicle_cost) }} />
        ))}
      </div>

      <ul className="summary">
        {summary.map((s) => (
          <li key={s.label}>
            <span className={`dot ${s.tone}`} />
            <span className="summary-label">{s.label}</span>
            <span className="num">{lkr(s.value)}</span>
            <span className="share">{pct(s.value, r.total_vehicle_cost)}</span>
          </li>
        ))}
      </ul>

      {r.luxury_tax > 0 && (
        <p className="notice">Includes luxury tax of {lkr(r.luxury_tax)}: the CIF is above the {f.fuel_type} threshold.</p>
      )}

      <button className="toggle" onClick={onToggle} aria-expanded={showDetails}>
        {showDetails ? 'Hide' : 'Show'} full breakdown
      </button>

      {showDetails && (
        <div className="details">
          <Table title="Cost in Japan" rows={[
            ['Unit price', jpy(Number(f.unit_price))],
            ['Auction fee', jpy(Number(f.auction_fee || 0))],
            ['Agent fee', jpy(r.agent_fee_jpy)],
            ['Inspection', jpy(Number(f.inspection || 0))],
            ['Insurance', jpy(r.insurance_jpy)],
            [`RoRo freight (${f.vehicle_m3} M3)`, jpy(r.freight_jpy)],
          ]} total={['CIF', jpy(r.cif_jpy)]} />

          <Table title={`Converted at ${f.jpy_rate} LKR/JPY`} rows={[]} total={['CIF', lkr(r.cif_lkr)]} />

          <Table title="Government taxes" rows={[
            ['Customs import duty (CID) · 45%', lkr(r.cid)],
            [`Excise duty (XID) · ${f.engine_cc}cc`, lkr(r.xid)],
            ['SSCL · 2.5%', lkr(r.sscl)],
            ['VAT · 18%', lkr(r.vat)],
            ['Vehicle entitlement levy (VEL)', lkr(r.vel)],
            ['Luxury tax', lkr(r.luxury_tax)],
          ]} total={['Total tax', lkr(r.total_tax)]}
            note={`VAT and SSCL base (CIF × 110% + CID + XID): ${lkr(r.vat_base)}`} />

          <Table title="Fees" rows={Object.entries(r.fees).map(([k, v]) => [FEE_LABELS[k] ?? k, lkr(v)])}
            total={['Total fees', lkr(r.total_fees)]} />
        </div>
      )}
    </>
  )
}

function Table({
  title,
  rows,
  total,
  note,
}: {
  title: string
  rows: [string, string][]
  total: [string, string]
  note?: string
}) {
  return (
    <table className="breakdown">
      <caption>{title}</caption>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td className="num">{value}</td>
          </tr>
        ))}
        <tr className="subtotal">
          <th scope="row">{total[0]}</th>
          <td className="num">{total[1]}</td>
        </tr>
      </tbody>
      {note && (
        <tfoot>
          <tr>
            <td colSpan={2}>{note}</td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}
