# JDM Tax Calculator — frontend

React + Vite app that calls the FastAPI backend's `POST /tax/calculate`.

## Develop

```bash
cp .env.example .env      # set VITE_API_URL if the API isn't on http://127.0.0.1:8000
npm install
npm run dev               # http://localhost:5173
```

The backend allows any `localhost` / `127.0.0.1` port automatically.

## Deploy (Render Static Site)

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment variable: `VITE_API_URL=https://<your-api>.onrender.com`

Then set `ALLOWED_ORIGINS=https://<your-frontend>.onrender.com` on the backend service.
