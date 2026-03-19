# 🚑 MediRoute - Real-Time Ambulance Routing System

A full-stack application for real-time ambulance dispatch with traffic-aware routing and emergency SOS capabilities.

---

## ✨ Features

- 🚨 **Emergency SOS** - Call ambulance without authentication
- 🎯 **Traffic-Aware Routing** - A* algorithm with real-time traffic
- 📊 **Real-time Tracking** - Live WebSocket updates
- 🔐 **Secure Authentication** - JWT-based access
- 🏥 **Hospital Integration** - Auto-assign nearest hospital
- 📱 **Responsive UI** - Map-based visualization

---

## 🛠 Technology Stack

**Backend**: Node.js, Express, SQLite, WebSocket, JWT
**Frontend**: React, Vite, Leaflet (mapping)
**Languages**: JavaScript (ES6+), HTML5, CSS3

---

## 📦 Prerequisites

- Node.js v16+ and npm v8+
- Ports: 4000 (backend), 5173 (frontend)

**Verify Installation:**
```bash
node --version
npm --version
```

---

## 📥 Installation

### **1. Navigate to Project**
```bash
cd Real-Time-Intelligent-Ambulance-Routing
```

### **2. Install Backend Dependencies**
```bash
cd backend
npm install
```

### **3. Setup Backend Environment**
Create `.env` file in backend folder:
```
PORT=4000
DATABASE_PATH=data/app.sqlite
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_secret_key
```

### **4. Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

---

## 🚀 How to Run

### **Terminal 1 - Start Backend**
```bash
cd backend
npm start
# Output: Backend listening on http://localhost:4000
```

### **Terminal 2 - Start Frontend**
```bash
cd frontend
npm run dev
# Output: Local: http://localhost:5173/
```

**Open Browser**: `http://localhost:5173`

---

## 🧠 Core Algorithms

**A* Pathfinding** - Time-weighted route finding with traffic consideration
**Traffic Engine** - Simulates realistic road conditions (low/medium/high)
**Ambulance Allocation** - Assigns nearest available ambulance by travel time
**Movement Simulation** - Realistic ambulance tracking with ETA updates

---

## 📂 Project Structure

```
Real-Time-Intelligent-Ambulance-Routing/
├── backend/
│   ├── src/
│   │   ├── index.js                    # Server entry
│   │   ├── routes/sosRoutes.js         # Emergency endpoints
│   │   ├── services/sosService.js      # SOS logic
│   │   ├── sim/
│   │   │   ├── routing/aStarTimeWeighted.js  # A* algorithm
│   │   │   ├── traffic/trafficEngine.js      # Traffic simulation
│   │   │   └── ambulanceAllocator.js         # Ambulance assignment
│   │   └── db/index.js                 # Database init
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx           # Login + Emergency SOS
│   │   │   ├── SignupPage.jsx
│   │   │   ├── SOSTrackingPage.jsx     # Real-time tracking
│   │   │   └── DashboardPage.jsx
│   │   ├── components/MapView/         # Map components
│   │   └── AppRouter.jsx               # Route config
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 👤 Usage

### **Regular User**
1. Sign up at `/signup`
2. Login with credentials
3. Request ambulance from dashboard
4. Track in real-time

### **Emergency User** ⭐ (No Account Needed)
1. On login page, click **"🚨 IN EMERGENCY? Call Ambulance Now"**
2. Enter optional name/phone
3. Allow browser geolocation
4. Ambulance dispatched immediately
5. Real-time tracking begins

---

## 📡 API Endpoints

**Authentication**
```
POST /api/auth/register    - Create account
POST /api/auth/login       - Login
```

**SOS**
```
POST /api/sos/request      - Request ambulance (authenticated)
POST /api/sos/emergency    - Emergency SOS (no auth required) ⭐
```

**Users**
```
GET  /api/users/me         - Get profile
PUT  /api/users/me         - Update profile
GET  /api/users/contacts   - Emergency contacts
```

**WebSocket**
```
ws://localhost:4000/ws     - Real-time tracking
?token=JWT_TOKEN           - Optional for authenticated users
```

---

## 🐛 Troubleshooting

**Port Already in Use**
```bash
netstat -ano | findstr ":4000"
taskkill /PID <PID> /F
```

**Module Not Found**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Database Locked**
```bash
rm backend/data/app.sqlite-shm
rm backend/data/app.sqlite-wal
```

**CORS Error**
Check `.env` has: `CORS_ORIGIN=http://localhost:5173`

---

## 💡 Key Points

- A* algorithm finds optimal routes in ~50ms
- Traffic multipliers: Low (1.0x) | Medium (1.35x) | High (1.8x)
- Ambulances recalculate routes every 5 seconds
- Emergency users don't need authentication
- Database: SQLite with WAL mode
- Real-time updates via WebSocket (1 Hz)

---

## 📝 License

ISC License

---

**Ready to route? Happy ambulancing! 🚑**

