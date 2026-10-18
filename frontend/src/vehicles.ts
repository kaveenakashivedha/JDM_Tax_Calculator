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
  { id: 'dayz-x', name: 'Nissan Dayz X', fuel_type: 'petrol', engine_cc: 659,
    length_mm: 3395, width_mm: 1475, height_mm: 1640, web_value_jpy: 1_500_400 },
  { id: 'mira-es', name: 'Daihatsu Mira L', fuel_type: 'petrol', engine_cc: 658,
    length_mm: 3395, width_mm: 1475, height_mm: 1500, web_value_jpy: 1_096_700 },
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

export function vehicleM3(v: VehiclePreset): number {
  if (v.m3 !== undefined) return v.m3
  const m3 = (v.length_mm * v.width_mm * v.height_mm) / 1e9
  return Math.round(m3 * 100) / 100
}
