# PosterHaus — Agent Guide

## Quick start
```bash
npm install        # install deps
npm start          # starts server.js on port 3000, bound to 0.0.0.0
node compress-posters.js  # compress all poster images (Sharp, 800px width, jpeg q70)
```

## Architecture

**Single-file monolith** (`server.js:324`) — all routes, auth, uploads in one file.  
**Hybrid DB**: MySQL (2 pools in `db.js`) + MongoDB (via `mongoDb.js`/Mongoose).

- MySQL simulates 2 distributed nodes: `posterhaus_orders` (orders + items tables) and `posterhaus_logs` (logs table). Auto-creates on startup.
- MongoDB stores poster metadata (name, price, category, tags). Auto-seeded from file scan.
- Poster catalog merges MySQL order status with MongoDB metadata at request time (`loadPosters`).
- `server.js:108-156` — NOSQL SYNC syncs poster data to MongoDB on every `/api/posters` call via `upsertPoster`.

## Required `.env` vars
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, MONGO_URI
```
Server will *not* start without MySQL + MongoDB running.

## Auth & security
- 4 hardcoded users in `server.js:37-42`: `admin`, `agent1`–`agent3`. **Change before deployment.**
- Session secret hardcoded at `server.js:49`. **Change before deployment.**
- `requireAuth` checks `req.session.user` (401 if missing). `requireAdmin` checks role `=== 'admin'` (403 otherwise).
- `/admin.html` redirects to `/login.html` if unauthenticated (`server.js:99-102`).
- Login POSTs to `/api/login`; logout to `/api/logout`.

## Key API routes
| Route | Auth | Notes |
|---|---|---|
| `GET /api/posters` | none | Merges MySQL order status + MongoDB metadata. Prices: standard ₹60. |
| `POST /api/orders` | none | Requires `items[]`, `buyerName`, `utrNumber`. `buyerContact` optional. |
| `PATCH /api/orders/:id` | requireAuth | Changes status (pending➡confirmed/rejected). Logs time-to-sell when confirmed. |
| `GET /api/orders` | requireAuth | All orders from MySQL, items embedded. |
| `POST /api/admin/mark-sold` | requireAuth | In-person cash sale. Sets status=confirmed. Default price ₹60 or `customPrice`. |
| `POST /api/admin/upload-poster` | requireAdmin | Admin uploads to `posters/`, preserves original filename. |
| `GET /api/performance` | none | Compares MySQL vs MongoDB query speed. |
| `GET /api/logs` | requireAdmin | Audit trail from MySQL logs node. |

## File uploads
- Customer uploads → `P_wanted/` with timestamped unique filenames (multer `storage`).
- Admin uploads → `posters/` preserving `file.originalname` (`adminStorage`).
- Poster images served at `/posters/...` and `/P_wanted/...` via `express.static`.

## Conventions
- CommonJS (`require`, no `import`), 2-space indent, semicolons.
- Route paths under `/api/...`.
- Order statuses: `pending`, `confirmed`, `rejected`. Color badges in admin UI.
- Pricing: standard ₹60, custom ₹80, framing +₹250.
- `AGENT_TRAINING.md` — operational guide for stall cashiers. `GEMINI.md` — academic distributed-systems context.

## Testing
No test framework. `npm test` fails with `"no test specified"`. Verify manually.

## Known gotchas
- MySQL `order_items` uses `TINYINT(1)` for booleans — `db.js:160` maps via `!!item.isCustom`.
- `compress-posters.js` must be run from project root. Destructively replaces originals (writes temp file, unlinks, renames).
- `orders.json` and `sales_log.txt` are legacy files in `.gitignore` — the app now uses MySQL exclusively.
- `.env` only has MySQL vars in this repo — add `MONGO_URI` (e.g. `mongodb://localhost:27017/posterhaus`) for MongoDB to connect.
