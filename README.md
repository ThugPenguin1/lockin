# LockIn — AI-Powered Social Study Platform

An AI-powered social study platform where friend groups commit to focus sessions together, with on-device attention tracking and smart accountability nudges that weaponize FOMO to turn procrastination into productivity.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Next.js 15 + Tailwind CSS + Framer Motion |
| Real-time | WebSockets (Socket.IO) |
| On-device CV | MediaPipe Face Mesh + TensorFlow.js |
| AI/NLP | MiniMax API (contextual nudge generation) |
| Backend | FastAPI + PostgreSQL + SQLAlchemy |
| ML Pipeline | scikit-learn (productivity pattern analysis) |

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

**Prerequisites:** Python 3.11+, Node.js 18+, PostgreSQL 15+

**Database:**
```bash
createdb lockin
```

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:socket_app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
hackathon/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/    # REST API routes
│   │   ├── core/             # Config, DB, auth
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Business logic + WebSocket
│   └── ml/                   # scikit-learn productivity analyzer
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages (lobby, session, summary)
│       ├── components/       # Reusable UI components
│       ├── hooks/            # Custom React hooks
│       └── lib/              # API client, store, socket, attention tracker
└── docker-compose.yml
```

## AI/ML Components

### 1. On-Device Attention Tracker (Edge AI)
- MediaPipe Face Mesh extracts 478 facial landmarks
- Calculates gaze direction, head pose (pitch/yaw), blink rate
- Weighted classifier: 45% gaze + 40% head pose + 15% blink pattern
- All processing in-browser via WebAssembly — zero video transmitted

### 2. Smart Nudge Engine (MiniMax API)
- Triggers when attention drops below threshold AND friends are still focused
- Contextual generation conditioned on: active friends, session duration, user patterns
- Three nudge types: social, competitive, supportive
- Falls back to template-based nudges when API unavailable

### 3. Productivity Pattern Analyzer (scikit-learn)
- Gradient Boosting Regressor trained on session features
- Cyclic time encoding (sin/cos for hour-of-day)
- Identifies: optimal study times, best partners, ideal group sizes
- Generates actionable recommendations after 5+ sessions

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://lockin:lockin@localhost:5432/lockin
SECRET_KEY=your-secret-key
MINIMAX_API_KEY=your-minimax-key
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Create account |
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/auth/me | Get current user |
| POST | /api/v1/squads/ | Create squad |
| GET | /api/v1/squads/ | Get my squads |
| POST | /api/v1/squads/join | Join via invite code |
| POST | /api/v1/sessions/ | Start focus session |
| POST | /api/v1/sessions/{id}/join | Join session |
| POST | /api/v1/sessions/{id}/leave | Leave session |
| POST | /api/v1/sessions/attention | Submit attention data |
| GET | /api/v1/sessions/{id}/summary | Get session summary |
| GET | /api/v1/analytics/dashboard | User analytics |
| GET | /api/v1/ml/recommendations | ML-powered insights |

## Built for Hack The East 2026
