const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool;

async function initDb() {
  // First connect without database to create it if it doesn't exist
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
  await connection.end();

  // Now create the pool with the database
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Create tables
  await pool.query(`
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

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp VARCHAR(255),
      username VARCHAR(255),
      action TEXT
    );
  `);

  console.log('MySQL Database initialized.');
  await migrateData();
}

async function migrateData() {
  const ORDERS_FILE = path.join(__dirname, 'orders.json');
  const LOGS_FILE = path.join(__dirname, 'sales_log.txt');

  // Migrate Orders
  if (fs.existsSync(ORDERS_FILE)) {
    console.log('Migrating orders from JSON to MySQL...');
    try {
      const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      for (const order of orders) {
        const [existing] = await pool.query('SELECT orderId FROM orders WHERE orderId = ?', [order.orderId]);
        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO orders (orderId, buyerName, buyerContact, utrNumber, status, timestamp, processedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [order.orderId, order.buyerName, order.buyerContact, order.utrNumber, order.status, order.timestamp, order.processedBy || null]
          );

          if (order.items) {
            for (const item of order.items) {
              await pool.query(
                'INSERT INTO order_items (orderId, posterId, name, file, price, isCustom, framed) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [order.orderId, item.id, item.name, item.file, item.price, item.isCustom ? 1 : 0, item.framed ? 1 : 0]
              );
            }
          }
        }
      }
      fs.renameSync(ORDERS_FILE, ORDERS_FILE + '.bak');
      console.log('Orders migration complete.');
    } catch (err) {
      console.error('Migration error (orders):', err);
    }
  }

  // Migrate Logs
  if (fs.existsSync(LOGS_FILE)) {
    console.log('Migrating logs from text file to MySQL...');
    try {
      const logs = fs.readFileSync(LOGS_FILE, 'utf8').split('\n');
      for (const line of logs) {
        if (!line.trim()) continue;
        const match = line.match(/\[(.*?)\] \[USER: (.*?)\] (.*)/);
        if (match) {
          await pool.query(
            'INSERT INTO logs (timestamp, username, action) VALUES (?, ?, ?)',
            [match[1], match[2], match[3]]
          );
        }
      }
      fs.renameSync(LOGS_FILE, LOGS_FILE + '.bak');
      console.log('Logs migration complete.');
    } catch (err) {
      console.error('Migration error (logs):', err);
    }
  }
}

async function getOrders() {
  const [orders] = await pool.query('SELECT * FROM orders ORDER BY timestamp DESC');
  for (const order of orders) {
    const [items] = await pool.query('SELECT * FROM order_items WHERE orderId = ?', [order.orderId]);
    order.items = items.map(item => ({
      ...item,
      isCustom: !!item.isCustom,
      framed: !!item.framed
    }));
  }
  return orders;
}

async function addOrder(order) {
  await pool.query(
    'INSERT INTO orders (orderId, buyerName, buyerContact, utrNumber, status, timestamp, processedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [order.orderId, order.buyerName, order.buyerContact, order.utrNumber, order.status, order.timestamp, order.processedBy || null]
  );

  if (order.items) {
    for (const item of order.items) {
      await pool.query(
        'INSERT INTO order_items (orderId, posterId, name, file, price, isCustom, framed) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [order.orderId, item.id, item.name, item.file, item.price, item.isCustom ? 1 : 0, item.framed ? 1 : 0]
      );
    }
  }
}

async function updateOrderStatus(orderId, status) {
  await pool.query('UPDATE orders SET status = ? WHERE orderId = ?', [status, orderId]);
}

async function getOrderById(orderId) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE orderId = ?', [orderId]);
  const order = rows[0];
  if (order) {
    const [items] = await pool.query('SELECT * FROM order_items WHERE orderId = ?', [orderId]);
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
  await pool.query('INSERT INTO logs (timestamp, username, action) VALUES (?, ?, ?)', [timestamp, username, action]);
}

async function getLogs() {
  const [rows] = await pool.query('SELECT * FROM logs ORDER BY timestamp DESC');
  return rows;
}

module.exports = {
  initDb,
  getOrders,
  addOrder,
  updateOrderStatus,
  getOrderById,
  logAction,
  getLogs
};
