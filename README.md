# PosterHaus 🖼️ (V2.2 Online Side-Hustle Edition)

PosterHaus is a minimalist, high-performance e-commerce platform designed for selling posters on college campuses. It features a modern dark-themed vanilla JS storefront, interactive bundle builder, automated category detection, admin classification tools, and a hybrid database architecture (MySQL + MongoDB).

---

## 🚀 Key Features

- **Modern Minimalist Storefront**: Clean gallery UI with Cormorant Garamond serif headings & DM Mono typography, built without heavy frameworks.
- **Dynamic Bundle Pricing**: Greedy bundle engine applied automatically (1 poster ₹49, 2 posters ₹79, 3 posters ₹99).
- **Categorization & Filtering**: 10 curated categories (`Anime`, `Cars`, `Gaming`, `Movies`, `Music`, `Quotes`, `Minimalist`, `Sports`, `Aesthetic`, `Memes`) with search by name, category, or tags.
- **Paginated Performance**: Loads 50 posters at a time for optimal bandwidth and fast page loads.
- **Print-on-Demand (Custom Prints)**: Upload zone supporting JPG, PNG, WebP, PDF up to 10 MB (flat ₹59).
- **Admin Dashboard & Analytics**: 8 financial/order stat cards, sales audit logs, analytics charts, and a live poster classification tool (category & tag override).
- **Hybrid Database System**: MySQL for relational ACID order processing and audit logs + MongoDB for flexible poster catalog metadata.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom Properties), JavaScript (ES6+).
- **Backend**: Node.js, Express.
- **Databases**:
  - **MySQL 8.0+**: Distributed pools for `posterhaus_orders` and `posterhaus_logs`.
  - **MongoDB**: Poster catalog metadata and tags via Mongoose.
- **Image Processing**: Sharp (for batch image optimization).

---

## 💻 Local Setup & Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL Server](https://dev.mysql.com/downloads/installer/)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community)

### 2. Clone the Repository
```bash
git clone https://github.com/Akp-1/posterhaus.git
cd posterhaus
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Configuration
Create a `.env` file in the root directory:
```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
MONGO_URI=mongodb://localhost:27017/posterhaus
```

### 5. Setup Assets
- Place your poster images in `/posters` (in root or inside subfolders like `/posters/anime/`).
- Place your payment QR code at `public/qr.png`.

### 6. Run the Server
```bash
npm start
```
The app will be available at:
- **Storefront**: `http://localhost:3026`
- **Admin Panel**: `http://localhost:3026/admin.html`

---

## 📂 Project Structure

```
.
├── public/                # Static assets, HTML storefront, login, and admin interface
├── posters/               # Poster image assets (root or subfolders e.g., posters/anime/)
├── P_wanted/              # Temporary storage for custom print uploads
├── server.js              # Monolith Express server, bundle pricing, and API routes
├── db.js                  # MySQL connection pools (Orders & Audit Logs)
├── mongoDb.js             # MongoDB Mongoose connection and poster metadata models
├── compress-posters.js    # Utility script to optimize image assets (Sharp, 800px)
└── agent.md               # Developer and Agent reference guide
```

---

## 🔧 Maintenance Commands

### Compress Poster Images
To optimize all images in the `posters` directory for web use:
```bash
node compress-posters.js
```

---

## 🛡️ Security

- **Authentication**: Admin credentials are managed in `server.js` via session authentication. Change default user passwords before deploying.
- **Environment Variables**: Never commit `.env` files to version control.

---

## 📄 License
This project is open-source and available under the [ISC License](LICENSE).
