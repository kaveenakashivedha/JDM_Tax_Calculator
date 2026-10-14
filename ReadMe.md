# JDM Tax Calculator

FastAPI backend.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000/
- Health check: http://127.0.0.1:8000/health
- Interactive docs: http://127.0.0.1:8000/docs

## Tax calculation

`POST /tax/calculate` — all amounts in JPY except `jpy_rate` (LKR per 1 JPY).
`fuel_type` is `petrol` or `hybrid`; engines above 1599cc are rejected (no rate yet).

```bash
curl -X POST http://127.0.0.1:8000/tax/calculate \
  -H "Content-Type: application/json" \
  -d '{"unit_price": 1000000, "inspection": 10000,
       "vehicle_m3": 8.22, "fuel_type": "petrol", "engine_cc": 658, "jpy_rate": 2.1014}'
```

Returns the full breakdown (CIF, CID, XID, VAT, SSCL, VEL, luxury tax, fees, total cost) in LKR.

## Tests

```bash
pytest
```

## Deploy (Render)

`render.yaml` defines the web service. In Render choose **New → Blueprint**, select this
GitHub repo, and apply. Render installs `requirements.txt`, runs
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and checks `/health`.
