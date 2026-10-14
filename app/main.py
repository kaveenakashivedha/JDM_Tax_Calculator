import os
from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.tax import FuelType, UnsupportedVehicleError, calculate_tax

app = FastAPI(title="JDM Tax Calculator")

# Comma-separated list of frontend URLs allowed to call the API
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class TaxRequest(BaseModel):
    unit_price: float = Field(gt=0, description="Auction purchase price (JPY)")
    inspection: float = Field(ge=0, description="JPY")
    vehicle_m3: float = Field(gt=0, description="Length x width x height in metres")
    auction_fee: float = Field(default=0, ge=0, description="JPY")
    fuel_type: FuelType
    engine_cc: int = Field(gt=0)
    jpy_rate: float = Field(gt=0, description="LKR per 1 JPY")
    usd_jpy_rate: float | None = Field(
        default=None, gt=0, description="JPY per 1 USD; required above 16 M3"
    )


class TaxResponse(BaseModel):
    agent_fee_jpy: float
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
    total_vehicle_cost: float


@app.get("/")
def root():
    return {"message": "hello"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/tax/calculate", response_model=TaxResponse)
def tax_calculate(request: TaxRequest):
    try:
        breakdown = calculate_tax(**request.model_dump())
    except UnsupportedVehicleError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return asdict(breakdown)
