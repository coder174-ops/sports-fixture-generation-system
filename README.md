# 🏆 TourneyPro — Double Knockout Tournament Manager

A full-stack **MERN** application for managing sports tournaments with **Double Knockout** bracket format, seeding, byes, and live score updates.

---

## ✨ Features

### 🌐 Public / User Side
- Browse all tournaments on homepage
- Filter by sport (Cricket, Football, Basketball, etc.)
- Register account (user or admin)
- Register team for any open tournament
  - Team name, captain name, captain contact/email
  - Optional: player names and roles
  - Past performance points (used for seeding)
- View fixture/bracket after generation
- Track your team's approval status

### ⚙️ Admin Side
- Create tournaments with full config:
  - Sport type, max teams, players per team
  - Venue, dates, registration deadline
  - Overs (for cricket), prize info
- Approve or reject team registrations
- Set team points/seeding before fixture generation
- **Generate Double Knockout fixture** with:
  - Seeding based on past performance points
  - Automatic bye assignment for top seeds
  - Winners Bracket + Losers Bracket + Grand Final
- Update live match scores (runs, wickets, overs, extras)
- Declare match winner → teams auto-advance in bracket
- Update tournament status at any stage

---

## 🔄 Double Knockout Logic

1. Teams are **seeded by points** (descending) then seed number
2. **Byes** are assigned to top seeds to fill bracket to next power of 2
3. Bracket seeding uses standard tournament seeding (1 vs last, 2 vs second-last...)
4. **Winners Bracket**: All teams start here. First loss → drops to Losers Bracket
5. **Losers Bracket**: Second loss → eliminated
6. **Grand Final**: WB champion vs LB champion
7. Optional **Grand Final Reset** if LB winner wins the final

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Styling | Custom CSS (no UI library) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)

### 1. Clone / Extract
```bash
cd tournament-app
```

### 2. Run Setup Script
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Configure Environment
Edit `backend/.env`:
```
MONGO_URI=mongodb://localhost:27017/tournament_db
JWT_SECRET=your_secret_key_here
PORT=5000
```

For **MongoDB Atlas**:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/tournament_db
```

### 4. Start the App

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```

Open **http://localhost:3000**

---

## 👤 Default Accounts

| Role | How to Create |
|------|--------------|
| Admin | Register with admin code: `ADMIN2024` |
| User | Register normally (no code needed) |

---

## 📁 Project Structure

```
tournament-app/
├── backend/
│   ├── models/
│   │   ├── User.js          # Auth model
│   │   ├── Tournament.js    # Tournament config
│   │   ├── Team.js          # Team registrations
│   │   └── Match.js         # Match fixtures & scores
│   ├── routes/
│   │   ├── auth.js          # Login / Register
│   │   ├── tournaments.js   # CRUD tournaments
│   │   ├── teams.js         # Team registration & approval
│   │   └── matches.js       # Fixture gen + score update
│   ├── middleware/
│   │   └── auth.js          # JWT + admin guard
│   ├── server.js
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── Navbar.js
        │   └── Navbar.css
        ├── context/
        │   └── AuthContext.js
        ├── pages/
        │   ├── Home.js / Home.css
        │   ├── Tournaments.js
        │   ├── TournamentDetail.js
        │   ├── Auth.js          # Login + Register
        │   ├── AdminDashboard.js
        │   └── MyTeams.js
        ├── utils/
        │   └── api.js           # Axios API helpers
        ├── App.js
        └── index.css            # Global styles
```

---

## 🏏 Sports Supported

The system works for any sport. Special fields per sport:
- **Cricket**: Overs per innings field, score shows runs/wickets/overs/extras
- **Football / Others**: Score fields still available (adapt labels in admin)

Supported sport types: `cricket`, `football`, `basketball`, `badminton`, `tennis`, `volleyball`, `other`

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Tournaments
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/tournaments` | Public |
| GET | `/api/tournaments/:id` | Public |
| POST | `/api/tournaments` | Admin |
| PUT | `/api/tournaments/:id` | Admin |
| DELETE | `/api/tournaments/:id` | Admin |

### Teams
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/teams/tournament/:id` | Public |
| POST | `/api/teams/register` | Auth |
| GET | `/api/teams/my/teams` | Auth |
| PUT | `/api/teams/:id/status` | Admin |
| GET | `/api/teams` | Admin |

### Matches
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/matches/tournament/:id` | Public |
| POST | `/api/matches/generate/:id` | Admin |
| PUT | `/api/matches/:id/score` | Admin |
| PUT | `/api/matches/:id` | Admin |

---

## 📝 Usage Flow

1. **Admin** creates a tournament (e.g., Cricket Cup, 8 teams, 11 players, Wankhede Stadium, 20 overs)
2. **Users** register accounts and submit team registrations
3. **Admin** reviews pending teams → approves/rejects
4. **Admin** sets team points for seeding (based on past performance)
5. **Admin** clicks "Generate Fixture" → Double Knockout bracket created automatically
6. **Admin** updates scores match by match → winners advance, losers drop to LB
7. **Everyone** can view live bracket, scores, and standings on the public site
