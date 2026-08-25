# System Design Report: Scalable Distributed Database for PosterHaus
**Title:** Design and Implement a Scalable Distributed Database Solution for a Real-Time Application  
**Case Study:** PosterHaus (E-commerce Platform for Posters)

---

## 1. System Requirement Analysis
### Application Requirements
PosterHaus is a real-time e-commerce platform requiring:
- High availability for browsing posters.
- Consistency for order management and payment verification.
- Auditability for administrative actions and logs.
- Scalability to handle large numbers of concurrent users during sales events.

### Entities and Relationships
- **User:** Customer/Admin roles.
- **Poster (NoSQL):** Metadata (Name, Price, Category, Inventory).
- **Order (Relational):** Transaction details, Buyer info, Status.
- **Audit Logs (Relational):** System events for recovery and audit.

### Justification for Distributed Database
A centralized database would become a bottleneck for PosterHaus because:
1. **Vertical Fragmentation:** Separating high-write "Logs" from high-read/transactional "Orders" reduces disk I/O contention.
2. **Hybrid Integration:** Using NoSQL (MongoDB) for the catalog allows for flexible schema updates without downtime, while MySQL ensures ACID compliance for financial transactions.

---

## 2. Distributed Database Design
### Global Database Schema
The system is divided into three logical nodes:
1. **Node 1 (Relational - MySQL):** `posterhaus_orders` database.
2. **Node 2 (Relational - MySQL):** `posterhaus_logs` database.
3. **Node 3 (NoSQL - MongoDB):** `posterhaus` database for poster catalog.

### Fragmentation & Allocation strategy
- **Vertical Fragmentation:** Tables are split across Node 1 (Orders/Items) and Node 2 (Logs).
- **Data Allocation:** Orders are allocated to the primary transactional node, while logs are offloaded to an audit node.

### Architecture Diagram
```text
[ Client (Web/Admin) ]
       |
[ Node.js Application Server ]
  /           |            \
[Node 1]    [Node 2]     [Node 3]
 MySQL       MySQL       MongoDB
(Orders)     (Logs)     (Catalog)
```

---

## 3. Implementation
### Distributed Queries
Implemented in `db.js` via the `getOrdersWithLogs()` function, which performs an application-layer join between `posterhaus_orders` and `posterhaus_logs`.

### Transaction Management (ACID)
Simulated via `db.addOrder()`, which initiates a transaction on Node 1 (Orders) and ensures a record is created in Node 2 (Logs) before committing.

---

## 4. NoSQL Integration
### MongoDB Design
- **Document Model:** Posters are stored as JSON-like documents.
- **Operations:** CRUD implemented for poster metadata synchronization in `mongoDb.js`.
- **Comparison:**
  - **Relational:** Fixed schema, better for joins (e.g., Orders -> Items).
  - **NoSQL:** Flexible schema, faster for large catalogs and semi-structured metadata.

---

## 5. Concurrency & Recovery Handling
### Concurrency Control
Utilizes MySQL connection pooling and explicit `BEGIN TRANSACTION` blocks in Node.js to handle race conditions during order placement.

### Failure Simulation
The system is designed to handle "Node 2" (Logs) downtime by allowing the application to continue taking orders (High Availability) while queuing logs or handling errors gracefully (Partial Failure Tolerance).

---

## 6. Performance Evaluation
### Query Performance Analysis
Comparison performed via `/api/performance` endpoint:
- **Centralized Query:** Single DB overhead for all tables.
- **Distributed Query:** Parallel access to Nodes 1 and 2 reduces latency.
- **Optimization:** MongoDB caching reduces the need to query relational databases for static poster data.

---

## 7. Output Screenshots & Demo
*(To be populated by the student)*
- Admin Panel screenshot.
- MySQL Workbench showing two databases (`posterhaus_orders`, `posterhaus_logs`).
- MongoDB Compass showing `posters` collection.
- `/api/performance` output.

---
**Team Contribution:**
- Ayush (Full System Implementation & Design)
