# Smart Edu

A personalized learning platform with AI-driven assessments and course recommendations.

## What's inside

This repo contains **two standalone apps** that share the same logic:

| Layer | Stack | Entry point |
|---|---|---|
| Python backend | stdlib WSGI + Jinja2 + SQLite + pandas | `app.py` |
| React frontend | Vite + React 18 + Zustand + shadcn/ui | `src/` |

Both implement the same proficiency inference and course recommendation engine.

---

## Python backend

No framework dependencies — pure stdlib WSGI with Jinja2 for templating.

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

## React frontend

```bash
npm install
npm run dev
```

Open `http://localhost:8080`.

```bash
npm run build   # production build → dist/
npm run preview # serve the production build locally
```

### Features
- All state persisted to `localStorage` via Zustand (survives page refresh)
- Dark / light mode toggle with persistence
- Guided multi-step flow: Course → Assessment → Results → Dashboard
- Progress rings, bar charts, history table on the dashboard

---

## Proficiency logic

Both apps use the same formula:

```
score = 0.45 × exam + 0.40 × quiz + 0.15 × clamp(time / 5, 0, 20)

≥ 78  → Advanced
≥ 52  → Intermediate
< 52  → Beginner
```
