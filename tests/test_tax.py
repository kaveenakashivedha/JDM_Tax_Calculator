import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.tax import (
    FuelType,
    UnsupportedVehicleError,
    agent_fee_for,
    roro_freight,
    calculate_tax,
    excise_duty,
    luxury_tax,
    web_value_after_deduction,
)

client = TestClient(app)

# Right-hand Wagon R column of the costing sheet, with freight from the RoRo table
WAGON_R = {
    "unit_price": 1_450_000,
    "inspection": 30_000,
    "vehicle_m3": 8.22,
    "fuel_type": "petrol",
    "engine_cc": 658,
    "jpy_rate": 2.1014,
}


def test_wagon_r_matches_sheet():
    r = calculate_tax(**{**WAGON_R, "fuel_type": FuelType.petrol})
    assert r.agent_fee_jpy == 150_000
    assert r.fob_jpy == 1_630_000
    assert r.insurance_jpy == 14_068.53
    assert r.freight_jpy == 110_000
    assert r.cif_jpy == 1_754_068.53
    assert r.cif_lkr == 3_685_999.61
    assert r.cid == 1_658_699.82
    assert r.xid == 1_992_000
    assert r.vat_base == 7_705_299.39
    assert r.sscl == 192_632.48
    assert r.vat == 1_386_953.89
    assert r.luxury_tax == 0
    assert r.total_tax == 5_245_286.20


@pytest.mark.parametrize(
    "unit_price, fee",
    [
        (1, 140_000),
        (999_999, 140_000),
        (1_000_000, 150_000),
        (1_999_500, 150_000),
        (2_000_000, 160_000),
        (3_000_000, 280_000),
        (3_999_999, 280_000),
        (4_000_000, 400_000),
        (5_000_000, 500_000),
    ],
)
def test_agent_fee_bands(unit_price, fee):
    assert agent_fee_for(unit_price) == fee


@pytest.mark.parametrize(
    "m3, charge",
    [
        (8.22, 110_000),
        (10.00, 110_000),
        (10.01, 120_000),
        (12.5, 140_000),
        (15.01, 190_000),
        (16.00, 190_000),
    ],
)
def test_roro_freight_bands(m3, charge):
    assert roro_freight(m3) == charge


def test_roro_freight_above_16_m3_in_usd():
    assert roro_freight(20, usd_jpy_rate=150) == 20 * 95 * 150
    with pytest.raises(UnsupportedVehicleError):
        roro_freight(20)


def test_insurance_scales_with_m3():
    # 1,630,000 FOB × 10.5 M3 × 0.001 × 1.05
    r = calculate_tax(**{**WAGON_R, "fuel_type": FuelType.petrol, "vehicle_m3": 10.5})
    assert r.insurance_jpy == 17_970.75


def test_luxury_tax_on_amount_above_threshold():
    assert luxury_tax(FuelType.petrol, 6_500_000) == 1_500_000
    assert luxury_tax(FuelType.hybrid, 5_400_000) == 0
    assert luxury_tax(FuelType.hybrid, 6_000_000) == 500_000


def test_xid_minimum_and_bands():
    assert excise_duty(FuelType.petrol, 658) == 1_992_000
    assert excise_duty(FuelType.petrol, 1000) == 2_450_000
    assert excise_duty(FuelType.petrol, 1500) == 7_725_000
    with pytest.raises(UnsupportedVehicleError):
        excise_duty(FuelType.petrol, 1600)


def test_endpoint():
    res = client.post("/tax/calculate", json=WAGON_R)
    assert res.status_code == 200
    assert res.json()["agent_fee_jpy"] == 150_000
    assert res.json()["total_tax"] == 5_245_286.20


def test_endpoint_rejects_unsupported_cc():
    res = client.post("/tax/calculate", json={**WAGON_R, "engine_cc": 1600})
    assert res.status_code == 422


def test_endpoint_requires_usd_rate_above_16_m3():
    res = client.post("/tax/calculate", json={**WAGON_R, "vehicle_m3": 17})
    assert res.status_code == 422


def test_premium_warranty_deducted_from_cif():
    base = calculate_tax(**{**WAGON_R, "fuel_type": FuelType.petrol})
    r = calculate_tax(**{**WAGON_R, "fuel_type": FuelType.petrol,
                         "premium_warranty_jpy": 130_000})
    assert r.fob_jpy == base.fob_jpy
    assert r.insurance_jpy == base.insurance_jpy  # still on the full FOB
    assert r.cif_jpy == 1_624_068.53  # 1,754,068.53 - 130,000
    assert r.total_tax < base.total_tax
    assert r.premium_warranty_lkr == 273_182.00  # 130,000 x 2.1014
    assert r.warranty_handling_fee == 27_318.20
    assert r.total_vehicle_cost == round(
        r.cif_lkr + r.total_tax + r.total_fees + 273_182 + 27_318.20, 2)


def test_premium_warranty_must_be_less_than_cif():
    with pytest.raises(UnsupportedVehicleError):
        calculate_tax(**{**WAGON_R, "fuel_type": FuelType.petrol,
                         "premium_warranty_jpy": 1_754_068.53})


def test_web_value_after_deduction_matches_sheet():
    assert round(web_value_after_deduction(1_457_000), 4) == 1_125_863.6364


def test_premium_warranty_has_no_web_value_cap():
    # Previously capped at web value after deduction − FOB (¥224,545 here)
    res = client.post("/tax/calculate", json={**WAGON_R, "premium_warranty_jpy": 500_000})
    assert res.status_code == 200
    assert res.json()["cif_jpy"] == 1_254_068.53


def test_jdm_fee_defaults_and_can_be_overridden():
    res = client.post("/tax/calculate", json=WAGON_R)
    assert res.json()["fees"]["jdm"] == 200_000
    custom = client.post("/tax/calculate", json={**WAGON_R, "jdm_fee": 300_000}).json()
    assert custom["fees"]["jdm"] == 300_000
    assert custom["total_fees"] == res.json()["total_fees"] + 100_000


def test_tax_base_adds_web_value_shortfall_to_cif():
    # Web value 2,400,000 -> 1,854,545.45 after deduction, 224,545.45 above the 1,630,000 FOB
    base = calculate_tax(**{**WAGON_R, "fuel_type": FuelType.petrol})
    r = calculate_tax(**{**WAGON_R, "fuel_type": FuelType.petrol, "web_value_jpy": 2_400_000})
    # FOB, insurance and CIF stay on the real purchase
    assert r.fob_jpy == 1_630_000
    assert r.insurance_jpy == base.insurance_jpy == 14_068.53
    assert r.cif_jpy == base.cif_jpy == 1_754_068.53
    assert r.web_value_adjustment_jpy == 224_545.45
    assert r.tax_base_jpy == 1_978_613.98
    assert r.tax_base_lkr == pytest.approx(1_978_613.98 * 2.1014, abs=0.05)
    # Taxes follow the tax base; the landed cost only adds the extra tax
    assert r.cid == pytest.approx(r.tax_base_lkr * 0.45, abs=0.01)
    assert r.total_vehicle_cost == pytest.approx(
        base.total_vehicle_cost + r.total_tax - base.total_tax, abs=0.02)


def test_tax_base_equals_cif_when_fob_above_web_value_after_deduction():
    # 1,457,000 -> 1,125,863.64 after deduction, below the 1,630,000 FOB
    r = calculate_tax(**{**WAGON_R, "fuel_type": FuelType.petrol, "web_value_jpy": 1_457_000})
    assert r.web_value_adjustment_jpy == 0
    assert r.tax_base_jpy == r.cif_jpy


def test_warranty_handling_rate_defaults_to_10_and_can_be_changed():
    args = {**WAGON_R, "fuel_type": FuelType.petrol, "premium_warranty_jpy": 130_000}
    assert calculate_tax(**args).warranty_handling_fee == 27_318.20  # 10% of 273,182
    r = calculate_tax(**args, warranty_handling_pct=5)
    assert r.warranty_handling_pct == 5
    assert r.warranty_handling_fee == 13_659.10
