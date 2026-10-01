# Colbios Sports — Multi-Sport Live Tracking System

A full-stack college sports live tracking platform. Admins manually log events in real time; the public site auto-refreshes every 7 seconds.

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the server
python run.py
```

Open **http://localhost:5000** for the public site.  
Open **http://localhost:5000/admin/login** for the admin panel.

**Default credentials:** `admin` / `admin123`

---

## Folder Structure

```
colbios/
├── run.py                     # Entry point
├── requirements.txt
├── colbios.db                 # Auto-created SQLite database
│
├── backend/
│   ├── app.py                 # Flask app factory
│   ├── models/
│   │   └── database.py        # SQLAlchemy models (User, Match, Event)
│   ├── routes/
│   │   ├── api.py             # Public API
│   │   ├── admin_api.py       # Admin API (auth-guarded)
│   │   └── auth.py            # Login / logout / session check
│   └── services/
│       └── sport_config.py    # Sport definitions (add new sports here)
│
├── frontend/
│   ├── index.html             # Home — Live / Upcoming / Finished
│   ├── match.html             # Match detail + event timeline
│   ├── css/style.css
│   └── js/
│       ├── main.js            # Home page logic + polling
│       └── match.js           # Match detail logic + polling
│
└── admin/
    ├── login.html
    ├── dashboard.html         # Create & manage matches
    ├── live.html              # Live control panel
    ├── css/admin.css
    └── js/
        ├── dashboard.js
        └── live.js
```

---

## Adding a New Sport

Edit `backend/services/sport_config.py` and add a new key to `SPORT_CONFIG`:

```python
"rugby": {
    "display_name": "Rugby",
    "color": "#be123c",
    "events": [
        {"key": "try",        "label": "Try",           "scoring": True,  "value": 5, "own_goal": False},
        {"key": "conversion", "label": "Conversion",    "scoring": True,  "value": 2, "own_goal": False},
        {"key": "penalty_kick","label": "Penalty Kick", "scoring": True,  "value": 3, "own_goal": False},
        {"key": "yellow_card","label": "Yellow Card",   "scoring": False, "value": 0, "own_goal": False},
    ],
}
```

No other changes required. The admin dashboard and scoring engine pick it up automatically.

---

## API Reference

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches` | All matches (filter: `?status=live`) |
| GET | `/api/match/<id>` | Match + events |
| GET | `/api/sports` | All sport types |
| GET | `/api/sport-config/<sport>` | Events config for a sport |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | `{username, password}` |
| POST | `/auth/logout` | Clears session |
| GET | `/auth/check` | Session check |

### Admin (session required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/api/matches` | All matches |
| POST | `/admin/api/match/create` | Create match |
| PUT | `/admin/api/match/<id>/update` | Edit match |
| DELETE | `/admin/api/match/<id>/delete` | Delete match |
| POST | `/admin/api/match/<id>/status` | `{status: live\|upcoming\|finished}` |
| POST | `/admin/api/match/<id>/reset-score` | Reset score to 0–0 |
| POST | `/admin/api/event/add` | Add event (auto-updates score) |
| DELETE | `/admin/api/event/<id>/delete` | Remove event (reverses score) |
| GET | `/admin/api/match/<id>/events` | Events for a match |

---

## Event Scoring Logic

- Each event has a `value` in the sport config
- `own_goal: true` events credit the *opposing* team
- Deleting an event automatically reverses its score contribution
- Non-scoring events (cards, timeouts) update the timeline only

---

## Production Notes

- Replace `SECRET_KEY` in `app.py` with a secure random string
- Use gunicorn: `gunicorn -w 4 "backend.app:create_app()"`
- Swap SQLite for PostgreSQL by changing `SQLALCHEMY_DATABASE_URI`
- Add HTTPS via nginx reverse proxy
