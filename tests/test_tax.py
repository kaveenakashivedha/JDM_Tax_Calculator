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
    assert r.insurance_jpy == 13_809.60
    assert r.freight_jpy == 110_000
    assert r.cif_jpy == 1_753_809.60
    assert r.cif_lkr == 3_685_455.49
    assert r.cid == 1_658_454.97
    assert r.xid == 1_992_000
    assert r.vat_base == 7_704_456.01
    assert r.sscl == 192_611.40
    assert r.vat == 1_386_802.08
    assert r.luxury_tax == 0
    assert r.total_tax == 5_244_868.46


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
    assert res.json()["total_tax"] == 5_244_868.46


def test_endpoint_rejects_unsupported_cc():
    res = client.post("/tax/calculate", json={**WAGON_R, "engine_cc": 1600})
    assert res.status_code == 422


def test_endpoint_requires_usd_rate_above_16_m3():
    res = client.post("/tax/calculate", json={**WAGON_R, "vehicle_m3": 17})
    assert res.status_code == 422
