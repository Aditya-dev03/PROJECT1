# ✈️ Travora — Smart Travel Planning & Group Coordination Platform

<p align="center">
  <strong>Plan trips effortlessly with AI-powered itineraries, real-time group collaboration, live map tracking, and smart expense splitting.</strong>
</p>

---

## 🌟 Key Features

- **🤖 AI Multi-Day Itinerary Engine**:
  - Resilient multi-tier venue discovery (Foursquare POI, OpenStreetMap geocoding, Gemini AI enrichment, and curated high-quality attractions).
  - Geographic spatial clustering that prevents unrealistic distance jumps across days.
  - Pace-adaptive scheduling (Relaxed, Balanced, Packed) with pre-render hard constraint validation and self-repair.

- **💬 Real-Time Group Chat & Media Feed**:
  - Live chat messaging for trip members.
  - Photo sharing, automatic bot receipts when expenses are logged, and crew status.

- **🗺️ Interactive Live Map & GPS Route Tracker**:
  - Interactive Leaflet map with dark/light mode tile rendering.
  - Synchronized venue pins, route flow, and real-time buddy location radar.
  - Detailed activity modal with ratings, category tags, address, and venue highlights.

- **💰 Expense Splitting & Category Analytics**:
  - Multi-currency support (₹ INR, $ USD, € EUR, £ GBP, etc.).
  - Equal and custom split logic between trip members.
  - Visual category breakdown chart and remaining budget progress bars.

- **🔑 Instant Join-Code Buddy Invites**:
  - 6-character entropy-validated trip invite codes.
  - Quick copy and instant native sharing.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Vanilla CSS design system with rich glassmorphism, fluid tokens, and responsive mobile navigation
- **Mapping**: Leaflet, React Leaflet
- **Backend & Realtime**: Supabase Client
- **AI & Geocoding**: Google Gemini API, OpenStreetMap Nominatim, Foursquare Places API
- **Icons & Polish**: Lucide Icons, Canvas Confetti

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or yarn

### Installation
```bash
# Clone repository
git clone https://github.com/Aditya-dev03/PROJECT1.git
cd PROJECT1

# Install dependencies
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production
```bash
npm run build
```

### Running Test Suites
```bash
# Full AI Itinerary & Constraint Engine Test
npm run test:itinerary

# Trip Join Code Architecture Test
npm run test:join-code
```

---

## 📄 License
MIT
