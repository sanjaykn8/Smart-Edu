# Smart Edu

A personalized learning platform with AI-driven assessments and course recommendations.

## What's inside

This repo contains a **legacy Python app** and the **primary React + Node API app**.

| Layer | Stack | Entry point |
|---|---|---|
| Legacy Python app | stdlib WSGI + Jinja2 + SQLite + pandas | `app.py` |
| React frontend | Vite + React 18 + Zustand + shadcn/ui | `src/` |
| API server | Express + mysql2 | `server.cjs` |

The React app is the main product surface. The API server fetches quiz questions from MySQL and saves assessment attempts back into MySQL.

---

## Legacy Python app

This path is kept for reference. The main working flow is the React + Node API setup below.

```bash
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:3155` in your browser.  
Set `PORT` env var to use a different port.

### Features
- Registration & login (SHA-256 salted passwords, session cookies)
- Course selection → assessment form → proficiency inference
- Personalized next-course recommendation + study plan
- Progress dashboard with per-user history
- Dataset-backed course insights from `Learning_Data.csv`

---

## React frontend + API server

Run the API server in one terminal:

```bash
npm install
npm run server
```

Run the Vite client in another terminal:

```bash
npm run dev
```

Open `http://localhost:8080`.

```bash
npm run build   # production build → dist/
npm run preview # serve the production build locally
```

### Features
- Quiz questions are fetched from MySQL
- Assessment submission is scored by the API and stored in `quiz_attempts`
- All state persisted to `localStorage` via Zustand (survives page refresh)
- Dark / light mode toggle with persistence
- Guided multi-step flow: Course → Assessment → Results → Dashboard
- Progress rings, bar charts, history table on the dashboard

---

## Scoring logic

The quiz score is based on correct answers out of 5. Video hours are normalized into a small supporting signal, and the API combines both into an overall readiness score.

