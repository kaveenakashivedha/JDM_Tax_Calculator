import type { FuelType } from './api'

export interface VehiclePreset {
  id: string
  name: string
  fuel_type: FuelType
  engine_cc: number
  // Outer dimensions in mm, used to work out the RoRo M3
  length_mm: number
  width_mm: number
  height_mm: number
  // Use when the shipping M3 is known and differs from L × W × H
  m3?: number
  // New-car price on the manufacturer's site (JPY), for reference only
  web_value_jpy?: number
}

// Specs are typical figures for the current model; check the exact grade before quoting.
export const VEHICLES: VehiclePreset[] = [
  { id: 'wagon-r', name: 'Suzuki Wagon R FX Petrol', fuel_type: 'petrol', engine_cc: 658,
    length_mm: 3395, width_mm: 1475, height_mm: 1650, web_value_jpy: 1_457_000 },
  // ZL (5BA-MH85S, R06D engine): spec sheet gives 3,395 × 1,475 × 1,650 mm, 0.657 L
  { id: 'wagon-r-zl', name: 'Suzuki Wagon R ZL Petrol', fuel_type: 'petrol', engine_cc: 657,
    length_mm: 3395, width_mm: 1475, height_mm: 1650, web_value_jpy: 1_430_000 },
  // HYBRID ZX (5AA-MH95S, R06D engine + WA04C motor): same sheet, 3,395 × 1,475 × 1,650 mm, 0.657 L.
  // Mild hybrid, but cleared as petrol for tax.
  { id: 'wagon-r-hybrid-zx', name: 'Suzuki Wagon R HYBRID ZX', fuel_type: 'petrol', engine_cc: 657,
    length_mm: 3395, width_mm: 1475, height_mm: 1650, web_value_jpy: 1_736_900 },
  { id: 'dayz-x', name: 'Nissan Dayz X', fuel_type: 'petrol', engine_cc: 659,
    length_mm: 3395, width_mm: 1475, height_mm: 1640, web_value_jpy: 1_500_400 },
  // Highway Star: specs copied from the Dayz X; mild hybrid, cleared as petrol
  { id: 'dayz-hws-x', name: 'Nissan Dayz Highway Star X', fuel_type: 'petrol',
    engine_cc: 659, length_mm: 3395, width_mm: 1475, height_mm: 1640, web_value_jpy: 1_745_700 },
  { id: 'dayz-hws-x-propilot', name: 'Nissan Dayz Highway Star X ProPilot Edition', fuel_type: 'petrol',
    engine_cc: 659, length_mm: 3395, width_mm: 1475, height_mm: 1640, web_value_jpy: 1_834_800 },
  { id: 'dayz-hws-g-turbo', name: 'Nissan Dayz Highway Star G Turbo', fuel_type: 'petrol',
    engine_cc: 659, length_mm: 3395, width_mm: 1475, height_mm: 1640, web_value_jpy: 1_888_700 },
  { id: 'dayz-hws-g-turbo-propilot', name: 'Nissan Dayz Highway Star G Turbo ProPilot Edition', fuel_type: 'petrol',
    engine_cc: 659, length_mm: 3395, width_mm: 1475, height_mm: 1640, web_value_jpy: 1_964_600 },
  { id: 'mira-es', name: 'Daihatsu Mira L', fuel_type: 'petrol', engine_cc: 658,
    length_mm: 3395, width_mm: 1475, height_mm: 1500, web_value_jpy: 1_096_700 },
  { id: 'mira-x', name: 'Daihatsu Mira X', fuel_type: 'petrol', engine_cc: 658,
    length_mm: 3395, width_mm: 1475, height_mm: 1500, web_value_jpy: 1_256_200 },
  { id: 'mira-x-limited', name: 'Daihatsu Mira X Limited', fuel_type: 'petrol', engine_cc: 658,
    length_mm: 3395, width_mm: 1475, height_mm: 1500, web_value_jpy: 1_380_500 },
  // X 1.0L (5BA-KSP210-AHXNK, 1KR-FE, 2WD CVT): spec sheet gives 3,950 × 1,695 × 1,495 mm, 0.996 L
  { id: 'yaris-x-10', name: 'Toyota Yaris X 1.0L Petrol', fuel_type: 'petrol', engine_cc: 996,
    length_mm: 3950, width_mm: 1695, height_mm: 1495, web_value_jpy: 1_697_300 },
  // G 1.0L (5BA-KSP210-AHXGK, 1KR-FE, 2WD CVT): same sheet and body as the X 1.0L
  { id: 'yaris-g-10', name: 'Toyota Yaris G 1.0L Petrol', fuel_type: 'petrol', engine_cc: 996,
    length_mm: 3950, width_mm: 1695, height_mm: 1495, web_value_jpy: 1_921_700 },
  // Roomy Custom G-T (4BA-M900A-GBVJ, 1KR-VET 1.0L turbo, 2WD only): spec sheet gives 3,705 × 1,670 × 1,735 mm, 0.996 L
  { id: 'roomy-custom-gt', name: 'Toyota Roomy Custom G-T', fuel_type: 'petrol', engine_cc: 996,
    length_mm: 3705, width_mm: 1670, height_mm: 1735, web_value_jpy: 2_313_300 },
  // Roomy Custom G (5BA-M900A-GBVE, 1KR-FE 1.0L, 2WD): same sheet and body as the Custom G-T
  { id: 'roomy-custom-g', name: 'Toyota Roomy Custom G', fuel_type: 'petrol', engine_cc: 996,
    length_mm: 3705, width_mm: 1670, height_mm: 1735, web_value_jpy: 2_170_300 },
  // Roomy G-T (4BA-M900A-GBGJ, 1KR-VET 1.0L turbo, 2WD only): same sheet, non-Custom body is 3,700 mm long
  { id: 'roomy-gt', name: 'Toyota Roomy G-T', fuel_type: 'petrol', engine_cc: 996,
    length_mm: 3700, width_mm: 1670, height_mm: 1735, web_value_jpy: 2_117_500 },
  // Roomy G (5BA-M900A-GBGE, 1KR-FE 1.0L, 2WD): same sheet and body as the G-T
  { id: 'roomy-g', name: 'Toyota Roomy G', fuel_type: 'petrol', engine_cc: 996,
    length_mm: 3700, width_mm: 1670, height_mm: 1735, web_value_jpy: 1_989_900 },
  // Roomy X (5BA-M900A-GBME, 1KR-FE 1.0L, 2WD): same sheet and body as the G
  { id: 'roomy-x', name: 'Toyota Roomy X', fuel_type: 'petrol', engine_cc: 996,
    length_mm: 3700, width_mm: 1670, height_mm: 1735, web_value_jpy: 1_830_400 },
  // Raize X petrol: spec sheet gives 3,995 × 1,695 × 1,620 mm for all grades
  // 2WD (5BA-A201A-GBLF): WA-VE 1.196 L
  { id: 'raize-x-2wd', name: 'Toyota Raize X Petrol 2WD (1.2L)', fuel_type: 'petrol', engine_cc: 1196,
    length_mm: 3995, width_mm: 1695, height_mm: 1620, web_value_jpy: 1_800_700 },
  // 4WD (3BA-A210A-GBLV): 1KR-VET 0.996 L turbo. Web value copied from the 2WD; confirm the 4WD figure
  { id: 'raize-x-4wd', name: 'Toyota Raize X Petrol 4WD (1.0L Turbo)', fuel_type: 'petrol', engine_cc: 996,
    length_mm: 3995, width_mm: 1695, height_mm: 1620, web_value_jpy: 1_800_700 },
  // { id: 'alto', name: 'Suzuki Alto', fuel_type: 'petrol', engine_cc: 658,
  //   length_mm: 3395, width_mm: 1475, height_mm: 1525 },
  // { id: 'swift', name: 'Suzuki Swift', fuel_type: 'petrol', engine_cc: 1197,
  //   length_mm: 3860, width_mm: 1695, height_mm: 1500 },
  // { id: 'n-box', name: 'Honda N-BOX', fuel_type: 'petrol', engine_cc: 658,
  //   length_mm: 3395, width_mm: 1475, height_mm: 1790 },
  // { id: 'fit-ehev', name: 'Honda Fit e:HEV', fuel_type: 'hybrid', engine_cc: 1496,
  //   length_mm: 3995, width_mm: 1695, height_mm: 1540 },
  // { id: 'vezel-ehev', name: 'Honda Vezel e:HEV', fuel_type: 'hybrid', engine_cc: 1496,
  //   length_mm: 4330, width_mm: 1790, height_mm: 1590 },
  // { id: 'aqua', name: 'Toyota Aqua', fuel_type: 'hybrid', engine_cc: 1490,
  //   length_mm: 4050, width_mm: 1695, height_mm: 1485 },
  // { id: 'yaris-hybrid', name: 'Toyota Yaris Hybrid', fuel_type: 'hybrid', engine_cc: 1490,
  //   length_mm: 3940, width_mm: 1695, height_mm: 1500 },
  // { id: 'yaris-cross-hybrid', name: 'Toyota Yaris Cross Hybrid', fuel_type: 'hybrid', engine_cc: 1490,
  //   length_mm: 4180, width_mm: 1765, height_mm: 1590 },
  // { id: 'raize-hybrid', name: 'Toyota Raize Hybrid', fuel_type: 'hybrid', engine_cc: 1196,
  //   length_mm: 3995, width_mm: 1695, height_mm: 1620 },
  // { id: 'note-epower', name: 'Nissan Note e-POWER', fuel_type: 'hybrid', engine_cc: 1198,
  //   length_mm: 4045, width_mm: 1695, height_mm: 1520 },
]

// Models grouped by make (first word of the name), both sorted A–Z, for the dropdown
export const VEHICLE_GROUPS: { make: string; vehicles: VehiclePreset[] }[] = [...VEHICLES]
  .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
  .reduce<{ make: string; vehicles: VehiclePreset[] }[]>((groups, v) => {
    const make = v.name.split(' ')[0]
    const last = groups[groups.length - 1]
    if (last?.make === make) last.vehicles.push(v)
    else groups.push({ make, vehicles: [v] })
    return groups
  }, [])

export function vehicleM3(v: VehiclePreset): number {
  if (v.m3 !== undefined) return v.m3
  const m3 = (v.length_mm * v.width_mm * v.height_mm) / 1e9
  return Math.round(m3 * 100) / 100
}
