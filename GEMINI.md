# PosterHaus Project Overview

PosterHaus is a minimalist e-commerce application designed for selling posters. It features a straightforward storefront for customers and an administrative dashboard for order management and payment verification.

## 🚀 Technologies
- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML, CSS, and JavaScript
- **Database:** Local JSON persistence (`orders.json`)
- **Assets:** Local file-based image management (`posters/` directory)

## 📂 Project Structure
- `server.js`: The core Express server handling API routes and static file serving.
- `posters/`: (Required) A directory for poster images (formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`).
- `public/`: (Required) Contains static files served by the server.
    - `index.html`: The customer-facing storefront.
    - `admin.html`: The administrative interface for order verification.
- `orders.json`: (Auto-generated) Stores all order information including UTR numbers and status.
- `package.json`: Project metadata and dependencies.

## 🛠️ Building and Running
1.  **Installation:** Dependencies are already initialized. Ensure Node.js is installed.
    ```bash
    npm install
    ```
2.  **Configuration:** 
    - Update `UPI_ID` and `SHOP_NAME` in `public/index.html` within the `<script>` section to match your payment details.
    - Drop your images in the `posters/` directory.
3.  **Start the Server:**
    ```bash
    npm start
    ```
4.  **Accessing the App:**
    - **Storefront:** `http://localhost:3000/`
    - **Admin Panel:** `http://localhost:3000/admin.html`

## 🎨 Development Conventions
- **Clean Styling:** Uses a combination of 'Cormorant Garamond' for headings and 'DM Mono' for UI elements to maintain a premium feel.
- **Stateless Frontend:** The frontend communicates with the backend via RESTful APIs (`/api/posters`, `/api/orders`).
- **Manual Verification:** Payment is handled via UPI with manual UTR (Transaction ID) verification by the administrator.

## ✅ TODOs / Known Issues
- [ ] Implement user authentication for the `admin.html` dashboard.
- [ ] Add support for dynamic price updates from the admin panel.
- [ ] Add image compression or thumbnail generation for the `posters/` folder.
