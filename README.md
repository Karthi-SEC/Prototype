# RescueGrid Prototype

RescueGrid is a responsive emergency response web app built with React and Vite. It simulates ambulance dispatch, live GPS tracking, emergency helplines, health records, and nearby hospitals in a modern dashboard experience.

## Highlights

- Real-time SOS dispatch flow with nearest ambulance assignment
- Live ambulance tracking with Leaflet maps and route visualization
- Arrival state transition and emergency status overlays
- Guest tracking mode for emergency use without login
- Dashboard with emergency profile and quick actions
- Health records module with document list and uploads
- Nearby hospitals directory with call actions
- National and Tamil Nadu emergency helpline directory
- Dual theme support: dark mode and light mode with toggle and persistence
- Fully responsive layout for desktop and mobile

## Tech Stack

- React
- Vite
- Leaflet
- Plain CSS (custom design system and animations)

## Project Structure

- src/App.jsx: main application logic, pages, context, and state
- src/App.css: global UI styling and theme definitions
- src/index.css: base root sizing styles

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

Open the local URL shown in terminal, usually:

```text
http://localhost:5173
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Available Scripts

- npm run dev: start Vite dev server
- npm run build: build production assets
- npm run preview: preview built app locally
- npm run lint: run ESLint checks

## Notes

- The app uses browser geolocation when available and falls back to a default Chennai location.
- Theme selection is persisted in localStorage.
- This is a prototype simulation and does not connect to a real ambulance backend.
