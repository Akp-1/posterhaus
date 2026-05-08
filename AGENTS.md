# Repository Guidelines

## Project Structure & Module Organization
PosterHaus is a CommonJS Node/Express app for poster sales and stall order management.

- `server.js` contains the Express server, auth/session setup, file uploads, order APIs, audit logging, and static file serving.
- `public/` contains browser pages: `index.html` for the storefront, `login.html` for authentication, `admin.html` for cashier/admin workflows, and `qr.png` for payment display.
- `posters/` stores standard poster images served at `/posters/...`.
- `P_wanted/` stores customer-uploaded custom print images served at `/P_wanted/...`.
- `orders.json` and `sales_log.txt` are runtime data files. Treat them as local state, not source code.
- `GEMINI.md` documents project behavior; `AGENT_TRAINING.md` is an operational guide for stall agents.

## Build, Test, and Development Commands
Install dependencies:

```bash
npm install
```

Run the local server:

```bash
npm start
```

This starts `server.js` on port `3000` and serves the storefront at `http://localhost:3000/`, login at `/login.html`, and dashboard at `/admin.html`.

There is no build step; frontend files are static HTML/CSS/JavaScript served directly by Express.

## Coding Style & Naming Conventions
Use CommonJS style in backend code: `require(...)`, `module.exports` if modules are split later, and semicolons. Keep indentation at 2 spaces in JavaScript. Use descriptive camelCase names for variables and functions, such as `loadOrders`, `saveOrders`, and `requireAdmin`. Keep route paths REST-like under `/api/...`.

For uploaded or static poster files, preserve clear image extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, or `.gif`.

## Testing Guidelines
No automated test framework is configured; `npm test` currently exits with an error. Before submitting changes, manually verify login/logout, poster listing, custom uploads, order creation, order status updates, in-person sales, and admin-only routes.

If tests are added, prefer Node’s built-in test runner or a lightweight framework, place tests under `test/`, and name files like `orders.test.js`.

## Commit & Pull Request Guidelines
Recent commits use short messages such as `resolved unauthorizeed access` and initial commit messages. Use clearer imperative messages going forward, for example `Fix session persistence for admin dashboard`.

Pull requests should include a summary, affected routes/pages, manual test steps, screenshots for UI changes, and notes for any changes to prices, credentials, order storage, or upload behavior.

## Security & Configuration Tips
Change default user passwords and the session secret before deployment. Do not commit real credentials, payment details, private customer uploads, or production `orders.json` data.
