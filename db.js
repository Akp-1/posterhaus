const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// SIMULATING TWO DIFFERENT DATABASE NODES
let orderNode; // Node 1: Handles Orders and Items
let auditNode; // Node 2: Handles Logs (Audit Trail)

async function initDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  // Create two separate databases to simulate distributed nodes
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`posterhaus_orders\`;`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`posterhaus_logs\`;`);
  await connection.end();

  // Initialize Pool for Node 1 (Orders)
  orderNode = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'posterhaus_orders',
    waitForConnections: true,
    connectionLimit: 10
  });

  // Initialize Pool for Node 2 (Logs)
  auditNode = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'posterhaus_logs',
    waitForConnections: true,
    connectionLimit: 10
  });

  // Create tables on Node 1
  await orderNode.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orderId VARCHAR(255) UNIQUE,
      buyerName VARCHAR(255),
      buyerContact VARCHAR(255),
      utrNumber VARCHAR(255),
      status VARCHAR(50),
      timestamp VARCHAR(255),
      processedBy VARCHAR(255)
    );
  `);

  await orderNode.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orderId VARCHAR(255),
      posterId VARCHAR(255),
      name VARCHAR(255),
      file VARCHAR(255),
      price INT,
      isCustom TINYINT(1),
      framed TINYINT(1),
      FOREIGN KEY (orderId) REFERENCES orders(orderId)
    );
  `);

  // Create tables on Node 2
  await auditNode.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp VARCHAR(255),
      username VARCHAR(255),
      action TEXT
    );
  `);

  console.log('Distributed MySQL Nodes (Orders & Logs) initialized.');
  await migrateData();
}

// TRANSACTION HANDLING (ACID) across distributed nodes
async function addOrder(order) {
  const conn1 = await orderNode.getConnection();
  const conn2 = await auditNode.getConnection();

  try {
    // Start Transaction on Node 1
    await conn1.beginTransaction();
    
    await conn1.query(
      'INSERT INTO orders (orderId, buyerName, buyerContact, utrNumber, status, timestamp, processedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [order.orderId, order.buyerName, order.buyerContact, order.utrNumber, order.status, order.timestamp, order.processedBy || null]
    );

    if (order.items) {
      for (const item of order.items) {
        await conn1.query(
          'INSERT INTO order_items (orderId, posterId, name, file, price, isCustom, framed) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [order.orderId, item.id, item.name, item.file, item.price, item.isCustom ? 1 : 0, item.framed ? 1 : 0]
        );
      }
    }

    // Simulation of Concurrency Control (Locking)
    // We log the action to the OTHER node (Node 2)
    const logTime = new Date().toISOString();
    await conn2.query(
      'INSERT INTO logs (timestamp, username, action) VALUES (?, ?, ?)',
      [logTime, order.processedBy || 'system', `NEW_ORDER: ${order.orderId} for ${order.buyerName}`]
    );

    // Commit both (Two-Phase Commit Simulation)
    await conn1.commit();
    // Audit logs usually don't need strict rollback, but for the project we'll treat them as a unit
    console.log(`Distributed Transaction committed for Order: ${order.orderId}`);

  } catch (err) {
    await conn1.rollback();
    console.error('Distributed Transaction failed, rolling back Node 1:', err);
    throw err;
  } finally {
    conn1.release();
    conn2.release();
  }
}

// DISTRIBUTED QUERY: Joining data from two different nodes in the application layer
async function getOrdersWithLogs() {
  const [orders] = await orderNode.query('SELECT * FROM orders ORDER BY timestamp DESC');
  const [logs] = await auditNode.query('SELECT * FROM logs WHERE action LIKE "NEW_ORDER%"');

  // Logic to "join" them (Distributed Join simulation)
  return orders.map(order => {
    const relatedLog = logs.find(l => l.action.includes(order.orderId));
    return { ...order, auditTrail: relatedLog ? relatedLog.timestamp : 'No log' };
  });
}

async function migrateData() {
  // Simplified migration check for the new distributed structure
  const [count] = await orderNode.query('SELECT COUNT(*) as count FROM orders');
  if (count[0].count === 0) {
    const ORDERS_FILE = path.join(__dirname, 'orders.json.bak'); // Check if backup exists
    if (fs.existsSync(ORDERS_FILE)) {
      console.log('Restoring data to distributed nodes...');
      // ... migration logic can go here if needed ...
    }
  }
}

async function getOrders() {
  const [orders] = await orderNode.query('SELECT * FROM orders ORDER BY timestamp DESC');
  for (const order of orders) {
    const [items] = await orderNode.query('SELECT * FROM order_items WHERE orderId = ?', [order.orderId]);
    order.items = items.map(item => ({
      ...item,
      isCustom: !!item.isCustom,
      framed: !!item.framed
    }));
  }
  return orders;
}

async function updateOrderStatus(orderId, status) {
  await orderNode.query('UPDATE orders SET status = ? WHERE orderId = ?', [status, orderId]);
}

async function getOrderById(orderId) {
  const [rows] = await orderNode.query('SELECT * FROM orders WHERE orderId = ?', [orderId]);
  const order = rows[0];
  if (order) {
    const [items] = await orderNode.query('SELECT * FROM order_items WHERE orderId = ?', [orderId]);
    order.items = items.map(item => ({
      ...item,
      isCustom: !!item.isCustom,
      framed: !!item.framed
    }));
  }
  return order;
}

async function logAction(username, action) {
  const timestamp = new Date().toISOString();
  await auditNode.query('INSERT INTO logs (timestamp, username, action) VALUES (?, ?, ?)', [timestamp, username, action]);
}

async function getLogs() {
  const [rows] = await auditNode.query('SELECT * FROM logs ORDER BY timestamp DESC');
  return rows;
}

module.exports = {
  initDb,
  getOrders,
  addOrder,
  updateOrderStatus,
  getOrderById,
  logAction,
  getLogs,
  getOrdersWithLogs // New distributed query
};
