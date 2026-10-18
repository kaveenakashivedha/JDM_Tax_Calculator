from dataclasses import dataclass
from enum import Enum


class FuelType(str, Enum):
    petrol = "petrol"
    hybrid = "hybrid"


# Insurance = FOB × (M3 × 0.001 × 1.05), e.g. 8.22 M3 → 0.8631% of FOB
INSURANCE_RATE_PER_M3 = 0.001
INSURANCE_LOADING = 1.05
CID_RATE = 0.45  # includes the extra 15% from 16/5/2026
CIF_UPLIFT = 1.10
SSCL_RATE = 0.025
VAT_RATE = 0.18
VEL = 15_000
XID_MINIMUM = 1_992_000
LUXURY_TAX_RATE = 1.0

# (max cc inclusive, tax per cc)
XID_BANDS = {
    FuelType.petrol: [(1000, 2450), (1299, 3850), (1499, 4450), (1599, 5150)],
    FuelType.hybrid: [(1299, 2750), (1499, 3450), (1599, 4800)],
}

# (buy price below, flat fee) in JPY; 4,000,000 and above pays a percentage
AGENT_FEE_BANDS = [
    (1_000_000, 140_000),
    (2_000_000, 150_000),
    (3_000_000, 160_000),
    (4_000_000, 280_000),
]
AGENT_FEE_RATE_ABOVE = 0.10

# RoRo freight: (max M3 inclusive, flat charge) in JPY; above 16 M3 pays USD per M3
RORO_FREIGHT_BANDS = [
    (10.00, 110_000),
    (11.00, 120_000),
    (12.00, 130_000),
    (13.00, 140_000),
    (14.00, 150_000),
    (15.00, 160_000),
    (16.00, 190_000),
]
RORO_USD_PER_M3_ABOVE = 95

LUXURY_THRESHOLDS = {
    FuelType.petrol: 5_000_000,
    FuelType.hybrid: 5_500_000,
}

FEES = {
    "banking": 55_000,
    "clearing": 45_000,
    "port": 35_000,
    "stamp": 1_750,
}
DEFAULT_JDM_FEE = 200_000  # LKR; can be overridden per calculation

# Premium warranty is deducted from the CIF (not taxed), paid separately,
# plus a handling fee
DEFAULT_WARRANTY_HANDLING_PCT = 10.0  # can be overridden per calculation


def web_value_after_deduction(web_value_jpy: float) -> float:
    # Remove Japan's 10% consumption tax, then take 85%
    return web_value_jpy * 100 / 110 * 85 / 100


class UnsupportedVehicleError(ValueError):
    pass


@dataclass
class TaxBreakdown:
    agent_fee_jpy: float
    purchase_fob_jpy: float
    fob_jpy: float
    insurance_jpy: float
    freight_jpy: float
    cif_jpy: float
    cif_lkr: float
    cid: float
    xid: float
    vat_base: float
    sscl: float
    vat: float
    vel: float
    luxury_tax: float
    total_tax: float
    fees: dict[str, float]
    total_fees: float
    premium_warranty_jpy: float
    premium_warranty_lkr: float
    warranty_handling_pct: float
    warranty_handling_fee: float
    total_vehicle_cost: float


def excise_duty(fuel_type: FuelType, engine_cc: int) -> float:
    for max_cc, per_cc in XID_BANDS[fuel_type]:
        if engine_cc <= max_cc:
            return max(per_cc * engine_cc, XID_MINIMUM)
    raise UnsupportedVehicleError(
        f"No excise rate for {fuel_type.value} vehicles above "
        f"{XID_BANDS[fuel_type][-1][0]}cc"
    )


def luxury_tax(fuel_type: FuelType, cif_lkr: float) -> float:
    return max(0.0, cif_lkr - LUXURY_THRESHOLDS[fuel_type]) * LUXURY_TAX_RATE


def agent_fee_for(unit_price: float) -> float:
    for below, fee in AGENT_FEE_BANDS:
        if unit_price < below:
            return fee
    return unit_price * AGENT_FEE_RATE_ABOVE


def roro_freight(vehicle_m3: float, usd_jpy_rate: float | None = None) -> float:
    for max_m3, charge in RORO_FREIGHT_BANDS:
        if vehicle_m3 <= max_m3:
            return charge
    if usd_jpy_rate is None:
        raise UnsupportedVehicleError(
            f"usd_jpy_rate is required for vehicles above "
            f"{RORO_FREIGHT_BANDS[-1][0]} M3 (charged in USD per M3)"
        )
    return vehicle_m3 * RORO_USD_PER_M3_ABOVE * usd_jpy_rate


def calculate_tax(
    unit_price: float,
    inspection: float,
    vehicle_m3: float,
    fuel_type: FuelType,
    engine_cc: int,
    jpy_rate: float,
    auction_fee: float = 0.0,
    usd_jpy_rate: float | None = None,
    premium_warranty_jpy: float = 0.0,
    jdm_fee: float = DEFAULT_JDM_FEE,
    web_value_jpy: float | None = None,
    warranty_handling_pct: float = DEFAULT_WARRANTY_HANDLING_PCT,
) -> TaxBreakdown:
    agent_fee = agent_fee_for(unit_price)
    freight = roro_freight(vehicle_m3, usd_jpy_rate)
    purchase_fob = unit_price + agent_fee + inspection
    # FOB can't be lower than the web value after deduction
    fob = (
        max(purchase_fob, web_value_after_deduction(web_value_jpy))
        if web_value_jpy is not None
        else purchase_fob
    )
    insurance = fob * vehicle_m3 * INSURANCE_RATE_PER_M3 * INSURANCE_LOADING
    gross_cif = fob + auction_fee + insurance + freight

    if premium_warranty_jpy >= gross_cif:
        raise UnsupportedVehicleError(
            f"Premium warranty must be less than the CIF (¥{gross_cif:,.0f})"
        )

    # The warranty is carved out of the CIF (after insurance), so only the rest is taxed
    cif_jpy = gross_cif - premium_warranty_jpy
    cif_lkr = cif_jpy * jpy_rate

    cid = cif_lkr * CID_RATE
    xid = excise_duty(fuel_type, engine_cc)
    vat_base = cif_lkr * CIF_UPLIFT + cid + xid
    sscl = vat_base * SSCL_RATE
    vat = vat_base * VAT_RATE
    lxt = luxury_tax(fuel_type, cif_lkr)
    total_tax = cid + xid + sscl + vat + VEL + lxt
    fees = {**FEES, "jdm": jdm_fee}
    total_fees = sum(fees.values())

    warranty_lkr = premium_warranty_jpy * jpy_rate
    warranty_handling = warranty_lkr * warranty_handling_pct / 100

    return TaxBreakdown(
        agent_fee_jpy=round(agent_fee, 2),
        purchase_fob_jpy=round(purchase_fob, 2),
        fob_jpy=round(fob, 2),
        insurance_jpy=round(insurance, 2),
        freight_jpy=round(freight, 2),
        cif_jpy=round(cif_jpy, 2),
        cif_lkr=round(cif_lkr, 2),
        cid=round(cid, 2),
        xid=round(xid, 2),
        vat_base=round(vat_base, 2),
        sscl=round(sscl, 2),
        vat=round(vat, 2),
        vel=VEL,
        luxury_tax=round(lxt, 2),
        total_tax=round(total_tax, 2),
        fees=fees,
        total_fees=total_fees,
        premium_warranty_jpy=round(premium_warranty_jpy, 2),
        premium_warranty_lkr=round(warranty_lkr, 2),
        warranty_handling_pct=warranty_handling_pct,
        warranty_handling_fee=round(warranty_handling, 2),
        total_vehicle_cost=round(
            cif_lkr + total_tax + total_fees + warranty_lkr + warranty_handling, 2
        ),
    )
