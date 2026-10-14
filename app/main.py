from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="JDM Tax Calculator")

# Placeholder rate until the real tax rules are defined.
TAX_RATE = 0.10


class TaxRequest(BaseModel):
    price: float = Field(gt=0, description="Vehicle price")


class TaxResponse(BaseModel):
    price: float
    tax_rate: float
    tax: float
    total: float


@app.get("/")
def root():
    return {"message": "hello"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/tax/calculate", response_model=TaxResponse)
def calculate_tax(request: TaxRequest):
    tax = round(request.price * TAX_RATE, 2)
    return TaxResponse(
        price=request.price,
        tax_rate=TAX_RATE,
        tax=tax,
        total=round(request.price + tax, 2),
    )
