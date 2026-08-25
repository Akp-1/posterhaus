# PROJECT REPORT: Scalable Distributed Database Solution
**Course:** Group Project (Database Management Systems)  
**Title:** Design and Implementation of a Distributed E-commerce Platform (PosterHaus)  
**Student/Team:** Ayush  
**Date:** May 13, 2026

---

## 1. System Requirement Analysis
### 1.1 Application Requirements
PosterHaus is a real-time e-commerce platform for selling posters. The system requires:
- **Scalability:** Ability to handle increasing loads of orders and logs.
- **Reliability:** Audit logs must be preserved even if the main order system is under heavy load.
- **Flexibility:** The product catalog (posters) needs a flexible schema to support various metadata (tags, categories, sizes) without frequent relational schema migrations.

### 1.2 Entities, Relationships, and Data Flow
- **Posters:** Managed as documents (NoSQL) containing ID, Name, Image Path, and Category.
- **Orders:** Managed as relational records containing Buyer info and Status.
- **Order Items:** Linked to Orders (1:N relationship).
- **Audit Logs:** System-wide event logs for tracking administrator actions and sales.

**Data Flow:** 
1. Client browses posters (Fetched from MongoDB).
2. Client places an order (Written to MySQL Node 1).
3. System triggers an audit event (Written to MySQL Node 2).
4. Admin verifies payment and updates status (MySQL Node 1).

### 1.3 Justification for Distributed Database
A distributed approach was chosen to:
- **Improve Performance:** By separating "Audit Logs" (high-volume writes) from "Orders" (critical transactions), we reduce disk I/O contention.
- **Enhance Availability:** The NoSQL catalog (MongoDB) remains accessible even if the relational transaction nodes are undergoing maintenance.
- **Optimization:** Allows using the "Best Tool for the Job" (Relational for Finance, NoSQL for Catalog).

---

## 2. Distributed Database Design
### 2.1 Global Database Schema
The system uses a **Hybrid Distributed Architecture**:
- **Relational Node 1 (MySQL):** `posterhaus_orders` (Tables: `orders`, `order_items`)
- **Relational Node 2 (MySQL):** `posterhaus_logs` (Table: `logs`)
- **NoSQL Node 3 (MongoDB):** `posterhaus` (Collection: `posters`)

### 2.2 Fragmentation and Allocation Strategy
- **Vertical Fragmentation:** Applied by splitting the schema into functional units (Transactions vs. Auditing).
- **Data Allocation:** Node 1 is the "Transactional Master," while Node 2 is the "Audit Node."
- **Replication Strategy:** For this simulation, data is localized to specific nodes to demonstrate fragmentation, but in production, Node 1 would utilize Master-Slave replication for high availability.

### 2.3 Architecture Diagram
```text
       +-----------------------+
       |   Client Browser UI   |
       +-----------+-----------+
                   |
       +-----------v-----------+
       |   Node.js API Server  |
       +-----+-----+-----+-----+
             |     |     |
      +------+     |     +-------+
      |            |             |
+-----v-----+ +----v-----+ +-----v-----+
|  Node 1   | |  Node 2   | |  Node 3   |
|  MySQL    | |  MySQL    | |  MongoDB  |
| (Orders)  | |  (Logs)   | | (Catalog) |
+-----------+ +-----------+ +-----------+
```

---

## 3. Implementation
### 3.1 Distributed Query Execution
The function `getOrdersWithLogs()` in `db.js` demonstrates an **Application-Level Distributed Join**. It fetches data from Node 1 and Node 2 simultaneously and merges the result sets based on the `orderId`.

### 3.2 Transaction Management (ACID)
The `addOrder()` function implements a **Distributed Transaction Simulation**:
1. **Atomicity:** A MySQL transaction is started on Node 1.
2. **Consistency:** The order is only committed if the log entry is successfully sent to Node 2.
3. **Isolation:** Uses standard SQL isolation levels via connection pooling.
4. **Durability:** Data is persisted to separate physical database schemas.

---

## 4. NoSQL Integration (MongoDB)
### 4.1 Data Modeling
Posters are modeled as dynamic documents in MongoDB. 
- **CRUD Operations:** Implemented in `mongoDb.js` using the Mongoose ODM.
- **Example Document:**
```json
{
  "posterId": "PST-001",
  "name": "Cyberpunk Neon",
  "price": 60,
  "category": "Art",
  "isAvailable": true
}
```

### 4.2 Relational vs. NoSQL Comparison
- **Relational (MySQL):** Used for Orders because ACID compliance is mandatory for payments.
- **NoSQL (MongoDB):** Used for Posters because the catalog needs to be fast and the schema may change (e.g., adding "Artist" or "Dimensions" fields).

---

## 5. Concurrency & Recovery
### 5.1 Concurrency Control
The system uses **Optimistic Concurrency Control** for status updates and **Pessimistic Locking** (via SQL transactions) during order creation to prevent duplicate UTR submissions.

### 5.2 Failure & Recovery Simulation
- **Failure:** If Node 2 (Logs) is down, the system is designed to catch the error and log it to a local emergency file (recovery mechanism), ensuring the main sale is not lost.
- **Recovery:** Upon restart, the system re-initializes all pools to restore connectivity.

---

## 6. Performance Evaluation
### 6.1 Query Performance Analysis
The `/api/performance` route provides real-time analysis.
- **Centralized:** Higher latency due to shared resources.
- **Distributed:** Lower latency for the catalog (NoSQL) and parallel processing for Order/Log retrieval.

### 6.2 Optimization Methods
- **Indexing:** Applied to `orderId` in MySQL and `posterId` in MongoDB.
- **Connection Pooling:** 10 concurrent connections per MySQL node to handle traffic spikes.

---

## 7. Output Screenshots
> **[INSTRUCTIONS: Paste your screenshots in the spaces below]**

#### 7.1 Distributed MySQL Databases (Showing Node 1 and Node 2)
*(Screenshot of MySQL Workbench or terminal showing `posterhaus_orders` and `posterhaus_logs`)*
` [SCREENSHOT HERE] `

#### 7.2 NoSQL Integration (MongoDB Catalog)
*(Screenshot of MongoDB Compass or Shell showing the posters collection)*
` [SCREENSHOT HERE] `

#### 7.3 Performance Analysis Result
*(Screenshot of the browser visiting `http://localhost:3000/api/performance`)*
` [SCREENSHOT HERE] `

#### 7.4 Transaction Demo (Order Creation)
*(Screenshot of the storefront console showing a successful distributed transaction commit)*
` [SCREENSHOT HERE] `

---

## 8. Conclusion
The PosterHaus project successfully demonstrates that a distributed database architecture significantly improves the scalability and maintainability of a real-time e-commerce application. By separating concerns into different nodes and integrating NoSQL, we achieved a balance between high-performance catalog browsing and robust transactional integrity.

---
**Undertaking of Originality:**  
I, Ayush, hereby declare that this project is my original work and all implementations were performed according to the requirements provided.
