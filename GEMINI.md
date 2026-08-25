# PosterHaus Project Overview (Distributed Edition)

PosterHaus is a distributed e-commerce application designed for selling posters. It features a hybrid database architecture (MySQL + MongoDB) to demonstrate scalability, distributed transactions, and NoSQL integration.

## 🚀 Technologies
- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML, CSS, and JavaScript
- **Relational DB (Distributed):** MySQL (Vertical Fragmentation across `posterhaus_orders` and `posterhaus_logs`)
- **NoSQL DB:** MongoDB (Metadata management for poster catalog)
- **Assets:** Local file-based image management (`posters/` directory)

## 📂 Project Structure
- `server.js`: Core Express server with distributed routing and NoSQL sync.
- `db.js`: MySQL management using distributed nodes for Orders and Audit Logs.
- `mongoDb.js`: MongoDB integration for flexible poster metadata.
- `posters/`: Directory for standard poster images.
- `P_wanted/`: Directory for custom user-uploaded poster requests.
- `PROJECT_REPORT.md`: Technical documentation for the distributed system.
- `FINAL_PROJECT_REPORT.md`: Comprehensive academic report with placeholders.

## 🛠️ Building and Running
1.  **Environment Setup:**
    - Ensure MySQL and MongoDB are running.
    - Configure `.env` with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `MONGO_URI`.
2.  **Installation:**
    ```bash
    npm install
    ```
3.  **Start the Server:**
    ```bash
    npm start
    ```
4.  **Key Endpoints:**
    - **Performance Analysis:** `http://localhost:3000/api/performance`
    - **Distributed Join Demo:** `http://localhost:3000/api/orders-full` (Admin required)

## 🎨 Development Conventions
- **Distributed Transactions:** Orders are committed to Node 1 only after successful logging to Node 2 (ACID Simulation).
- **Hybrid Data:** Poster display merges real-time file status from MySQL with rich metadata from MongoDB.
- **Security:** Session-based authentication for Admin and Agent roles.

## ✅ Completed Academic Requirements
- [x] Distributed Database Design (Fragmentation/Allocation)
- [x] Transaction Management (ACID Concepts)
- [x] NoSQL Integration (MongoDB CRUD)
- [x] Distributed Queries (Application-layer joins)
- [x] Performance Evaluation (Relational vs. NoSQL comparison)
