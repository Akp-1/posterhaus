# PosterHaus — Agent Guide (V2.2 Online Side-Hustle Edition)

## Project Overview

PosterHaus is a **college poster e-commerce business system**. It is a hybrid monolith combining:

- A **modern dark-themed storefront** (`public/index.html`) where students browse, filter by category/tags, build bundles, upload custom prints, and place orders via UPI.
- A **secure admin dashboard** (`public/admin.html`) featuring an 8-card financial overview, order verification, inventory classification tool, category uploads, and analytics.
- A **Node.js + Express backend** (`server.js`) serving all API routes.
- A **dual-database hybrid architecture**: MySQL (orders + audit logs) and MongoDB (poster metadata).

---

## Tech Stack & Constraints

| Layer | Technology |
|---|---|
| Runtime | Node.js (CommonJS — `require`, no ESM `import`) |
| Framework | Express 5.x |
| Relational DB | MySQL 8.0+ via `mysql2/promise` (2 pools simulating distributed nodes) |
| NoSQL DB | MongoDB via Mongoose 9.x |
| File Uploads | Multer 2.x |
| Auth | Session-based (`express-session`) — 4 hardcoded users |
| Image Processing | Sharp |
| Frontend | Vanilla HTML5 / CSS3 / ES6+ JavaScript (no build step, Poppins + Inter fonts) |

---

## Pricing & Bundle Rules (V2.2 Final)

| Item Type | Base Price | Bundle Pricing |
|---|---|---|
| Standard Poster (1x) | ₹49 | Single item: ₹49 |
| Standard Posters (2x Bundle) | ₹79 | Save ₹19 |
| Standard Posters (3x Bundle) | ₹99 | Save ₹48 (Best Value) |
| Print-on-Demand (Custom) | ₹59 | Flat ₹59 (not eligible for bundle discounts) |

### Server & Client Bundle Formula
```javascript
function calcBundlePrice(standardQty) {
  const threes = Math.floor(standardQty / 3);
  const rem    = standardQty % 3;
  const twos   = Math.floor(rem / 2);
  const ones   = rem % 2;
  return threes * 99 + twos * 79 + ones * 49;
}
```

> **Note:** Wooden framing has been **completely removed** from all pricing, UI, and backend logic.

---

## Poster Categorization (Hybrid System)

Posters are categorized automatically via folder hierarchy AND manually via the admin classification tool:

```
posters/
├── anime/          → auto-category: 'Anime'
├── cars/           → auto-category: 'Cars'
├── gaming/         → auto-category: 'Gaming'
└── gojo.jpg        → auto-category: 'General'
```

1. **Folder Auto-detection:** `loadPosters()` scans 1-level subfolders in `posters/` and assigns the folder name as the default category.
2. **Admin Override:** In `/admin.html` Inventory tab, admins can change the category (10 predefined categories + General) and set comma-separated search tags via `PATCH /api/admin/poster/:file`.
3. **MongoDB Priority:** Admin overrides saved in MongoDB take precedence over folder auto-detection.

---

## Key API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/posters` | none | Merged catalog (filesystem subfolders + MySQL order status + MongoDB metadata) |
| `POST` | `/api/orders` | none | Customer places order. Server calculates bundle total. |
| `GET` | `/api/orders` | requireAuth | All orders with embedded items from MySQL. |
| `PATCH` | `/api/orders/:id` | requireAuth | Change order status (pending ➔ confirmed / rejected). |
| `POST` | `/api/admin/mark-sold` | requireAuth | Record manual cash sale. Default price ₹49. |
| `POST` | `/api/admin/upload-poster` | requireAdmin | Admin uploads new poster image into category subfolder. |
| `PATCH` | `/api/admin/poster/:file` | requireAuth | Admin updates category and tags for a poster. |
| `POST` | `/api/upload` | none | Customer uploads custom print request to `P_wanted/` (max 10MB, ₹59). |
| `GET` | `/api/performance` | none | Benchmarks MySQL vs MongoDB query speed. |
| `GET` | `/api/logs` | requireAdmin | Plain-text audit trail from `posterhaus_logs`. |

---

## Order Pickup & Delivery SLAs

- **Ready-made posters:** Delivered on campus within **48 hours**.
- **Print-on-Demand:** Delivered on campus within **3–4 days**.
- **Customer confirmation:** Order confirmation instructs buyers to save their Order ID; sellers reach out via Instagram/WhatsApp.

---

## File Structure

```
d:\web\
├── server.js              # Express server, bundle pricing, category scanning, API routes
├── db.js                  # MySQL dual-node pools, ACID transaction simulation
├── mongoDb.js             # Mongoose Poster model, default ₹49, updatePosterMeta helper
├── compress-posters.js    # Batch image compression (Sharp, 800px, q70)
├── .env                   # MySQL + MongoDB credentials (never commit)
├── package.json           # CommonJS, no build step, `npm start` runs server.js on port 3026
├── public/
│   ├── index.html         # V2.2 Dark storefront (Hero, Categories, Shop, Bundle, Custom, Cart)
│   ├── admin.html         # V2.2 Admin Dashboard (8 Stat Cards, Classification, Analytics)
│   ├── login.html         # PosterHaus Admin Login
│   └── qr.png             # UPI QR code for payment
├── posters/               # Standard posters (root or category subfolders like anime/, cars/)
└── P_wanted/              # User-uploaded custom print requests (served at /P_wanted/)
```

---

## Quick Start

```bash
npm install                  # Install dependencies
npm start                    # Start server on port 3026 (0.0.0.0)
node compress-posters.js     # Compress all posters (destructive — replaces originals)
```

---

## Agent Behavioral Guidelines

1. **Monolith Rule:** Keep all Express server logic in `server.js`.
2. **Pricing Contract:** Do not alter the ₹49 / ₹79 / ₹99 / ₹59 pricing matrix or greedy bundle algorithm without explicit user instruction.
3. **No Framing:** Never re-introduce wooden framing checkboxes or pricing.
4. **Offline / Online Messaging:** All user-facing text must be online campus-delivery focused (never "come to the stall" or "Pi").
