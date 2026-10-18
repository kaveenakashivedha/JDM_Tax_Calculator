import { useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { flushSync } from 'react-dom'
import { calculateTax, estimateFob, estimateFreight, webValueAfterDeduction, type FuelType, type TaxResponse } from './api'
import { VEHICLES, VEHICLE_GROUPS, vehicleM3, type VehiclePreset } from './vehicles'
import logo from './assets/jdm-logo.jpg'
import Estimate, { newEstimateNumber, type EstimateDetails } from './Estimate'

const RORO_FLAT_RATE_MAX_M3 = 16
const WARRANTY_FREIGHT_OFFSET = 70_000

interface FormState {
  unit_price: string
  auction_fee: string
  inspection: string
  vehicle_m3: string
  fuel_type: FuelType
  engine_cc: string
  jpy_rate: string
  usd_jpy_rate: string
  jdm_fee: string
}

const EMPTY: FormState = {
  unit_price: '',
  auction_fee: '',
  inspection: '30000',
  vehicle_m3: '',
  fuel_type: 'petrol',
  engine_cc: '',
  jpy_rate: '',
  usd_jpy_rate: '',
  jdm_fee: '200000',
}

const SAMPLE: FormState = {
  unit_price: '1450000',
  auction_fee: '0',
  inspection: '30000',
  vehicle_m3: '8.26',  // Wagon R FX: 3395 × 1475 × 1650 mm
  fuel_type: 'petrol',
  engine_cc: '658',
  jpy_rate: '2.1014',
  usd_jpy_rate: '',
  jdm_fee: '200000',
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
  const [vehicleId, setVehicleId] = useState('')
  const [warrantyOn, setWarrantyOn] = useState(false)
  const moreRef = useRef<HTMLDetailsElement>(null)
  const [warranty, setWarranty] = useState('')
  const [handlingPct, setHandlingPct] = useState('10')
  const [warrantyEdited, setWarrantyEdited] = useState(false)
  const [result, setResult] = useState<TaxResponse | null>(null)
  const [submitted, setSubmitted] = useState<FormState | null>(null)
  const [submittedVehicle, setSubmittedVehicle] = useState<VehiclePreset | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [estimate, setEstimate] = useState<EstimateDetails | null>(null)
  const printDialog = useRef<HTMLDialogElement>(null)

  const needsUsdRate = Number(form.vehicle_m3) > RORO_FLAT_RATE_MAX_M3
  const vehicle = VEHICLES.find((v) => v.id === vehicleId)

  // Suggested warranty: max(0, FOB − web value × 100/110 × 85/100) + (freight − 70,000)
  const freight = form.vehicle_m3
    ? estimateFreight(Number(form.vehicle_m3), Number(form.usd_jpy_rate) || undefined)
    : null
  const warrantyCalc =
    vehicle?.web_value_jpy !== undefined && form.unit_price && freight !== null
      ? (() => {
          const fob = estimateFob(Number(form.unit_price), Number(form.inspection || 0))
          const webAfter = webValueAfterDeduction(vehicle.web_value_jpy)
          const fobLessWeb = Math.max(0, fob - webAfter)
          const total = Math.max(0, Math.round(fobLessWeb + freight - WARRANTY_FREIGHT_OFFSET))
          return { fob, webAfter, fobLessWeb, freight, total }
        })()
      : null
  const suggestedWarranty = warrantyCalc?.total ?? null
  // Follow the suggestion until the amount is typed in by hand
  const warrantyValue = warrantyEdited || suggestedWarranty === null ? warranty : String(suggestedWarranty)

  const set = (key: keyof FormState) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value })

  // Editing a spec by hand means it no longer matches the selected model
  const setSpec = (key: 'fuel_type' | 'engine_cc' | 'vehicle_m3') =>
    (e: { target: { value: string } }) => {
      setVehicleId('')
      set(key)(e)
    }

  function selectVehicle(id: string) {
    setVehicleId(id)
    const v = VEHICLES.find((v) => v.id === id)
    if (!v) return
    setForm({
      ...form,
      fuel_type: v.fuel_type,
      engine_cc: String(v.engine_cc),
      vehicle_m3: String(vehicleM3(v)),
    })
  }

  function fillSample() {
    setVehicleId('wagon-r')
    setForm(SAMPLE)
  }

  function onPrint(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!submitted) return
    const data = new FormData(e.currentTarget)
    const date = new Date()
    const details: EstimateDetails = {
      number: newEstimateNumber(date),
      date,
      customer: String(data.get('customer')).trim(),
      purpose: String(data.get('purpose')).trim(),
      vehicleName: String(data.get('vehicle')).trim(),
      vehicleSpec: `${submitted.engine_cc}cc · ${submitted.fuel_type === 'hybrid' ? 'Hybrid' : 'Petrol'}`,
    }
    printDialog.current?.close()
    flushSync(() => setEstimate(details))

    // The browser uses the page title as the suggested PDF file name
    const title = document.title
    const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    document.title = ['jdm', slug(details.customer), slug(details.vehicleName),
      date.toISOString().slice(0, 10), 'estimate'].filter(Boolean).join('-')
    window.addEventListener('afterprint', () => { document.title = title }, { once: true })
    window.print()
  }

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
        premium_warranty_jpy: warrantyOn ? Number(warrantyValue || 0) : 0,
        warranty_handling_pct: Number(handlingPct || 0),
        jdm_fee: Number(form.jdm_fee || 0),
        ...(vehicle?.web_value_jpy !== undefined && { web_value_jpy: vehicle.web_value_jpy }),
      })
      setResult(res)
      setSubmitted(form)
      setSubmittedVehicle(vehicle)
    } catch (err) {
      setResult(null)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <main className="page">
      <header className="masthead">
        <img className="brand-logo" src={logo} alt="Japan Direct Motors" width="72" height="72" />
        <div>
          <p className="brand-name">Japan Direct Motors</p>
          <h1>Import Cost Calculator</h1>
          <p className="brand-tagline">Sri Lankan import taxes and the total landed cost of a Japanese vehicle.</p>
        </div>
      </header>

      <div className="layout">
        <form className="card form" onSubmit={onSubmit}
          // Expand Additional details so the browser can point at a missing field inside it
          onInvalidCapture={(e) => {
            if (moreRef.current?.contains(e.target as Node)) moreRef.current.open = true
          }}>
          <div className="card-head">
            <h2>Vehicle details</h2>
            <button type="button" className="link" onClick={fillSample}>
              Fill sample
            </button>
          </div>

          <fieldset>
            <legend>Vehicle & purchase</legend>
            <Field label="Model" hint="Fills fuel type, cc and size">
              <select value={vehicleId} onChange={(e) => selectVehicle(e.target.value)}>
                <option value="">Other / enter manually</option>
                {VEHICLE_GROUPS.map((g) => (
                  <optgroup key={g.make} label={g.make}>
                    {g.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Unit price" hint="Auction buy price">
              <NumberInput required value={form.unit_price}
                onChange={set('unit_price')} placeholder="1,450,000" />
            </Field>
            <Field label="Auction fee" hint="Optional">
              <NumberInput value={form.auction_fee}
                onChange={set('auction_fee')} placeholder="0" />
            </Field>
            <Field label="Inspection">
              <NumberInput required value={form.inspection}
                onChange={set('inspection')} placeholder="30,000" />
            </Field>
            <Field label="LKR per 1 JPY">
              <NumberInput required value={form.jpy_rate}
                onChange={set('jpy_rate')} placeholder="2.1014" />
            </Field>
            {needsUsdRate && (
              <Field label="JPY per 1 USD" hint={`Freight above ${RORO_FLAT_RATE_MAX_M3} M3 is charged in USD`}>
                <NumberInput required value={form.usd_jpy_rate}
                  onChange={set('usd_jpy_rate')} placeholder="150" />
              </Field>
            )}
            <label className="switch">
              <input type="checkbox" role="switch" checked={warrantyOn}
                onChange={(e) => setWarrantyOn(e.target.checked)} />
              <span className="switch-track" aria-hidden="true" />
              <span>
                Premium warranty
                <span className="hint switch-hint">Deducted from CIF, not taxed · plus handling fee</span>
              </span>
            </label>
            {warrantyOn && (
              <Field label="Warranty amount (JPY)"
                hint={suggestedWarranty !== null
                  ? undefined
                  : vehicle?.web_value_jpy === undefined
                    ? vehicle ? 'No web value for this model' : 'Select a model to prefill'
                    : 'Enter unit price and size to prefill'}>
                <NumberInput required value={warrantyValue}
                  onChange={(e) => { setWarranty(e.target.value); setWarrantyEdited(true) }}
                  placeholder="130,000" />
              </Field>
            )}
            {warrantyOn && warrantyCalc && (
              <div className="calc" aria-label="Suggested warranty calculation">
                <div className="calc-head">
                  <span>Suggested warranty</span>
                  {warrantyEdited && (
                    <button type="button" className="link" onClick={() => setWarrantyEdited(false)}>
                      Use this amount
                    </button>
                  )}
                </div>
                <dl>
                  <div><dt>FOB</dt><dd>{jpy(warrantyCalc.fob)}</dd></div>
                  <div><dt>Less web value after deduction</dt><dd>−{jpy(warrantyCalc.webAfter)}</dd></div>
                  <div className="calc-sub">
                    <dt>
                      Vehicle difference
                      {warrantyCalc.fob < warrantyCalc.webAfter && <span className="calc-tag">Negative · counted as 0</span>}
                    </dt>
                    <dd>{jpy(warrantyCalc.fobLessWeb)}</dd>
                  </div>
                  <div><dt>Freight</dt><dd>{jpy(warrantyCalc.freight)}</dd></div>
                  <div><dt>Less freight allowance</dt><dd>−{jpy(WARRANTY_FREIGHT_OFFSET)}</dd></div>
                  <div className="calc-sub">
                    <dt>Freight difference</dt>
                    <dd>{jpy(warrantyCalc.freight - WARRANTY_FREIGHT_OFFSET)}</dd>
                  </div>
                  <div className="calc-total"><dt>Suggested warranty</dt><dd>{jpy(warrantyCalc.total)}</dd></div>
                </dl>
              </div>
            )}
            {warrantyOn && (
              <Field label="Handling fee (%)" hint="Of the warranty amount">
                <NumberInput required value={handlingPct}
                  onChange={(e) => setHandlingPct(e.target.value)} placeholder="10" />
              </Field>
            )}
          </fieldset>

          <details className="more" ref={moreRef}>
            <summary>Additional details</summary>
            <fieldset>
              <legend>Vehicle specs</legend>
              <Field label="Fuel type">
                <select value={form.fuel_type} onChange={setSpec('fuel_type')}>
                  <option value="petrol">Petrol</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
              <Field label="Engine capacity (cc)" hint="Up to 1599cc">
                <NumberInput integer required value={form.engine_cc}
                  onChange={setSpec('engine_cc')} placeholder="658" />
              </Field>
              <Field label="Size (M3)" hint="Length × width × height in metres">
                <NumberInput required value={form.vehicle_m3}
                  onChange={setSpec('vehicle_m3')} placeholder="8.22" />
              </Field>
            </fieldset>

            <fieldset>
              <legend>Fees</legend>
              <Field label="JDM fee (LKR)" hint="Default Rs 200,000">
                <NumberInput required value={form.jdm_fee}
                  onChange={set('jdm_fee')} placeholder="200,000" />
              </Field>
            </fieldset>
          </details>

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
              vehicle={submittedVehicle}
              showDetails={showDetails}
              onToggle={() => setShowDetails(!showDetails)}
              onPrint={() => printDialog.current?.showModal()}
            />
          ) : (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true">¥</span>
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

    <dialog className="print-dialog" ref={printDialog} aria-labelledby="print-title">
      {/* key resets the fields to the latest vehicle each time a new result comes in */}
      <form key={result ? result.total_vehicle_cost : 0} method="dialog" onSubmit={onPrint}>
        <h2 id="print-title">Print cost estimate</h2>
        <p className="dialog-sub">Who is this estimate for?</p>
        <Field label="Customer name">
          <input name="customer" required autoFocus placeholder="e.g. Mr. A. Perera" />
        </Field>
        <Field label="Purpose">
          <input name="purpose" required defaultValue="Personal vehicle import" />
        </Field>
        <Field label="Vehicle">
          <input name="vehicle" required defaultValue={submittedVehicle?.name ?? ''} placeholder="Daihatsu Mira L" />
        </Field>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={() => printDialog.current?.close()}>Cancel</button>
          <button type="submit" className="primary">Print estimate</button>
        </div>
      </form>
    </dialog>

    {result && submitted && estimate && <Estimate r={result} jpyRate={submitted.jpy_rate} d={estimate} />}
    </>
  )
}

// Text field that only accepts numbers, so scrolling or arrow keys can't change the value.
// Shows thousands separators when not being edited.
function NumberInput({
  value,
  onChange,
  integer = false,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string
  onChange: (e: { target: { value: string } }) => void
  integer?: boolean
}) {
  const [editing, setEditing] = useState(false)
  return (
    <input {...rest} type="text" inputMode={integer ? 'numeric' : 'decimal'} autoComplete="off"
      value={editing ? value : groupDigits(value)}
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      onChange={(e) => onChange({ target: { value: cleanNumber(e.target.value, integer) } })} />
  )
}

// Keep digits and a single decimal point
function cleanNumber(raw: string, integer: boolean): string {
  const digits = raw.replace(integer ? /[^\d]/g : /[^\d.]/g, '')
  const dot = digits.indexOf('.')
  return dot === -1 ? digits : digits.slice(0, dot + 1) + digits.slice(dot + 1).replace(/\./g, '')
}

function groupDigits(value: string): string {
  const [whole, decimals] = value.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimals === undefined ? grouped : `${grouped}.${decimals}`
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
  vehicle,
  showDetails,
  onToggle,
  onPrint,
}: {
  r: TaxResponse
  f: FormState
  vehicle?: VehiclePreset
  showDetails: boolean
  onToggle: () => void
  onPrint: () => void
}) {
  const otherFees = r.total_fees - (r.fees.jdm ?? 0)
  const summary = [
    { label: 'Vehicle (CIF)', value: r.cif_lkr, tone: 'vehicle' },
    { label: 'Government tax', value: r.total_tax, tone: 'tax' },
    { label: 'Bank, port & clearing', value: otherFees, tone: 'fees' },
    { label: 'JDM fee', value: r.fees.jdm ?? 0, tone: 'jdm' },
    ...(r.premium_warranty_jpy > 0
      ? [{ label: 'Premium warranty', value: r.premium_warranty_lkr + r.warranty_handling_fee, tone: 'warranty' }]
      : []),
  ]

  return (
    <>
      <div className="total">
        <h2>Total vehicle cost</h2>
        <p className="total-value">{lkr(r.total_vehicle_cost)}</p>
        {vehicle && (
          <p className="vehicle-ref">
            {vehicle.name}
            {vehicle.web_value_jpy !== undefined && <> · Web value {jpy(vehicle.web_value_jpy)}</>}
          </p>
        )}
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

      <div className="result-actions">
        <button className="toggle" onClick={onToggle} aria-expanded={showDetails}>
          {showDetails ? 'Hide' : 'Show'} full breakdown
        </button>
        <button className="toggle print-btn" onClick={onPrint}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print estimate
        </button>
      </div>

      {showDetails && (
        <div className="details">
          <Table title="Cost in Japan" rows={[
            ['Unit price', jpy(Number(f.unit_price))],
            ['Agent fee', jpy(r.agent_fee_jpy)],
            ['Inspection', jpy(Number(f.inspection || 0))],
            ...(r.fob_jpy > r.purchase_fob_jpy
              ? [
                  ['Purchase FOB', jpy(r.purchase_fob_jpy)],
                  ['Raised to web value after deduction', '+' + jpy(r.fob_jpy - r.purchase_fob_jpy)],
                ] as [string, string][]
              : []),
          ]} total={['FOB', jpy(r.fob_jpy)]} />

          <Table title="Shipping" rows={[
            ['FOB', jpy(r.fob_jpy)],
            ['Auction fee', jpy(Number(f.auction_fee || 0))],
            [`Insurance · FOB × ${f.vehicle_m3} M3 × 0.001 × 1.05`, jpy(r.insurance_jpy)],
            [`RoRo freight (${f.vehicle_m3} M3)`, jpy(r.freight_jpy)],
            ...(r.premium_warranty_jpy > 0
              ? [['Less premium warranty', '−' + jpy(r.premium_warranty_jpy)] as [string, string]]
              : []),
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

          {r.premium_warranty_jpy > 0 && (
            <Table title="Premium warranty · deducted from CIF, not taxed" rows={[
              ['Warranty', jpy(r.premium_warranty_jpy)],
              [`Converted at ${f.jpy_rate} LKR/JPY`, lkr(r.premium_warranty_lkr)],
              [`Handling fee · ${r.warranty_handling_pct}%`, lkr(r.warranty_handling_fee)],
            ]} total={['Total warranty', lkr(r.premium_warranty_lkr + r.warranty_handling_fee)]} />
          )}
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
