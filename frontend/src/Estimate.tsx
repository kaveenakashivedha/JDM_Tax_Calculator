import type { TaxResponse } from './api'
import logo from './assets/jdm-logo.jpg'

// Company details printed on every estimate
const COMPANY = {
  name: 'Japan Direct Motors',
  tagline: 'Japanese Quality. Direct to Sri Lanka.',
  city: 'Colombo, Sri Lanka',
  phones: ['075 535 9053', '075 866 3969'],
  email: 'info@japandirectmotors.lk',
}

const FEE_LABELS: Record<string, string> = {
  banking: 'LC charges',
  clearing: 'Clearing charges',
  port: 'Port charges',
  stamp: 'Stamp fee',
  jdm: 'JDM fee',
}

export interface EstimateDetails {
  number: string
  date: Date
  customer: string
  purpose: string
  vehicleName: string
  vehicleSpec: string
}

const lkr = (n: number) => 'LKR ' + Math.round(n).toLocaleString('en-US')
const jpy = (n: number) => '¥' + Math.round(n).toLocaleString('en-US')

// JDM-YYMMDD-NNNN
export function newEstimateNumber(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 10_000)).padStart(4, '0')
  return `JDM-${yy}${mm}${dd}-${seq}`
}

type Row = { label: string; value: string; strong?: boolean }

export default function Estimate({ r, jpyRate, d }: { r: TaxResponse; jpyRate: string; d: EstimateDetails }) {
  const fees = Object.entries(r.fees)
  const hasWarranty = r.premium_warranty_jpy > 0

  // Total from the rounded lines so the printed figures always add up
  const lines = [
    r.cif_lkr,
    r.total_tax,
    ...fees.map(([, v]) => v),
    ...(hasWarranty ? [r.premium_warranty_lkr, r.warranty_handling_fee] : []),
  ]
  const total = lines.reduce((sum, n) => sum + Math.round(n), 0)

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Vehicle cost (CIF)',
      rows: [
        // Full CIF is before the premium warranty is taken off
        { label: 'Full CIF value', value: jpy(r.cif_jpy + r.premium_warranty_jpy) },
        { label: 'Proforma Invoice Value', value: jpy(r.cif_jpy) },
        { label: 'Exchange rate', value: `¥1 = LKR ${jpyRate}` },
        { label: 'CIF value in Sri Lankan rupees', value: lkr(r.cif_lkr), strong: true },
      ],
    },
    {
      title: 'Government duty & taxes',
      rows: [{ label: 'Customs duty & government taxes', value: lkr(r.total_tax), strong: true }],
    },
    {
      title: 'Clearing & other charges',
      rows: fees.map(([k, v]) => ({ label: FEE_LABELS[k] ?? k, value: lkr(v) })),
    },
    ...(hasWarranty
      ? [{
          title: 'Premium warranty',
          rows: [
            { label: `Premium warranty (${jpy(r.premium_warranty_jpy)})`, value: lkr(r.premium_warranty_lkr) },
            { label: `Handling fee (${r.warranty_handling_pct}%)`, value: lkr(r.warranty_handling_fee) },
          ],
        }]
      : []),
  ]

  return (
    <article className="estimate">
      <div className="est-band" />

      <header className="est-head">
        <img className="est-logo" src={logo} alt="" />
        <div className="est-company">
          <h1>{COMPANY.name}</h1>
          <p>{COMPANY.tagline}</p>
          <p>{COMPANY.city}</p>
        </div>
        <div className="est-title">
          <h2>Cost estimate</h2>
          <p>Estimate No.&nbsp; {d.number}</p>
          <p>Date&nbsp; {d.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <div className="est-cards">
        <div className="est-card">
          <span className="est-label">Issued to</span>
          <strong>{d.customer}</strong>
          <span>{d.purpose}</span>
        </div>
        <div className="est-card">
          <span className="est-label">Vehicle</span>
          <strong>{d.vehicleName}</strong>
          <span>{d.vehicleSpec}</span>
        </div>
      </div>

      <table className="est-table">
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        {sections.map((s) => (
          <tbody key={s.title}>
            <tr className="est-section">
              <th colSpan={2} scope="colgroup">{s.title}</th>
            </tr>
            {s.rows.map((row) => (
              <tr key={row.label} className={row.strong ? 'est-strong' : undefined}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      <div className="est-total">
        <span>Total estimated cost</span>
        <strong>{lkr(total)}</strong>
      </div>

      {/* Notes and footer sit at the bottom of the printed page, whatever the paper size */}
      <div className="est-bottom">
      <section className="est-notes">
        <span className="est-label">Notes</span>
        <ul>
          <li>
            These prices are based on the average bidding prices from recently auctioned units.
            Prices may slightly change depending on the yen rate and market demand.
          </li>
          <li>This is an estimate, not an invoice.</li>
        </ul>
      </section>
      <footer className="est-foot">
        <div>
          <strong>{COMPANY.name}</strong>
          <span>{COMPANY.city}</span>
        </div>
        <div className="est-contact">
          <span className="est-label">Call us</span>
          <strong>{COMPANY.phones.join('  |  ')}</strong>
          <span>{COMPANY.email}</span>
        </div>
      </footer>
      <div className="est-band est-band-bottom" />
      </div>
    </article>
  )
}
