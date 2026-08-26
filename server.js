require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const db = require('./db');
const mongoDb = require('./mongoDb'); // IMPORT MONGODB

const app = express();
const PORT = 3026;

// ─── Constants ───────────────────────────────────────────────────────────────
const STANDARD_PRICE = 49;
const CUSTOM_PRICE   = 59;
const CATEGORIES = ['Anime','Cars','Gaming','Movies','Music','Quotes','Minimalist','Sports','Aesthetic','Memes'];

// ─── Bundle Pricing ──────────────────────────────────────────────────────────
// Greedy: maximize 3-bundles (₹99), then 2-bundles (₹79), then singles (₹49)
function calcBundlePrice(standardQty) {
  const threes = Math.floor(standardQty / 3);
  const rem    = standardQty % 3;
  const twos   = Math.floor(rem / 2);
  const ones   = rem % 2;
  return threes * 99 + twos * 79 + ones * 49;
}

// ─── Setup Uploads ───────────────────────────────────────────────────────────
const P_WANTED_DIR = path.join(__dirname, 'P_wanted');
if (!fs.existsSync(P_WANTED_DIR)) fs.mkdirSync(P_WANTED_DIR);
const POSTERS_DIR = path.join(__dirname, 'posters');
if (!fs.existsSync(POSTERS_DIR)) fs.mkdirSync(POSTERS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'P_wanted/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Admin upload — dynamic destination based on category
const adminStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = (req.body && req.body.category) || '';
    let dest = 'posters/';
    if (category && category !== 'General') {
      dest = path.join('posters', category.toLowerCase()) + '/';
      const fullPath = path.join(__dirname, dest);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => cb(null, file.originalname)
});
const adminUpload = multer({ storage: adminStorage });

// ─── Auth Setup ──────────────────────────────────────────────────────────────
// ── UPDATE THIS ──────────────────────────────────────────────────────────────
// Change passwords before deploying. Do NOT keep defaults.
const USERS = {
  'admin':  { password: '0241BTCS', role: 'admin' },   // ← change this password
  'agent1': { password: '145236',   role: 'cashier1' }, // ← change this password
  'agent2': { password: '478569',   role: 'cashier2' }, // ← change this password
  'agent3': { password: '178239',   role: 'cashier3' }  // ← change this password
};
// ─────────────────────────────────────────────────────────────────────────────

// ── FIXED: session now works properly across devices on local network ─────────
app.use(session({
  // ── UPDATE THIS ────────────────────────────────────────────────────────────
  // Change this to a long random string in production, e.g. 'xK9#mP2@rQ7!nL4$'
  secret: 'posterhaus-secret-change-me',
  // ───────────────────────────────────────────────────────────────────────────
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,        // Keep false — you're on HTTP (no HTTPS on LAN)
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8  // 8 hours
  }
}));

app.use(express.json());

// ─── Lazy DB Initialization for Serverless ────────────────────────────────────
let dbInitPromise = null;
async function ensureDbInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await db.initDb();
      } catch (err) {
        console.error('MySQL Init Warning:', err.message);
      }
      try {
        await mongoDb.initMongo();
      } catch (err) {
        console.error('MongoDB Init Warning:', err.message);
      }
    })();
  }
  return dbInitPromise;
}

app.use(async (req, res, next) => {
  await ensureDbInitialized();
  next();
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });
  next();
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];
  if (user && user.password === password) {
    req.session.user = { username, role: user.role };
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json({ success: true, role: user.role });
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', (req, res) => {
  if (req.session.user) res.json(req.session.user);
  else res.status(401).json({ error: 'Not logged in' });
});

app.get('/admin.html', (req, res, next) => {
  if (!req.session.user) return res.redirect('/login.html');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/posters', express.static(path.join(__dirname, 'posters')));
app.use('/P_wanted', express.static(path.join(__dirname, 'P_wanted')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Load Posters (Integration of MongoDB + MySQL + Folder Categories) ────────
async function loadPosters() {
  const dir = path.join(__dirname, 'posters');
  if (!fs.existsSync(dir)) return [];

  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  // Scan root files + 1-level-deep subfolders for category detection
  const allFiles = []; // { file: relative path, autoCategory: string }

  // Root-level files → category: 'General'
  const rootEntries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && exts.includes(path.extname(entry.name).toLowerCase())) {
      allFiles.push({ file: entry.name, autoCategory: 'General' });
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      // Subfolder → category = folder name (title-cased)
      const subCategory = entry.name.charAt(0).toUpperCase() + entry.name.slice(1).toLowerCase();
      const subDir = path.join(dir, entry.name);
      const subEntries = fs.readdirSync(subDir);
      for (const subFile of subEntries) {
        if (exts.includes(path.extname(subFile).toLowerCase())) {
          allFiles.push({ file: path.join(entry.name, subFile).replace(/\\/g, '/'), autoCategory: subCategory });
        }
      }
    }
  }

  const orders = await db.getOrders();
  const fileStatus = new Map();

  orders.forEach(o => {
    if (o.items) {
      o.items.forEach(item => {
        if (!item.isCustom) {
          if (o.status === 'confirmed') fileStatus.set(item.file, 'sold');
          else if (o.status === 'pending' && fileStatus.get(item.file) !== 'sold')
            fileStatus.set(item.file, 'reserved');
        }
      });
    }
  });

  const posters = [];
  for (let i = 0; i < allFiles.length; i++) {
    const { file, autoCategory } = allFiles[i];
    const status = fileStatus.get(file) || 'available';
    if (status === 'sold') continue;

    const id = `PST-${String(i + 1).padStart(3, '0')}`;
    const baseName = path.basename(file, path.extname(file));
    const name = baseName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    // Check if poster already has an admin-assigned category in MongoDB
    const existing = await mongoDb.getPosterByFile(file);
    const category = (existing && existing.category && existing.category !== 'General')
      ? existing.category
      : autoCategory;
    const tags = (existing && existing.tags && existing.tags.length > 0)
      ? existing.tags
      : [];

    // NOSQL SYNC: Store/Update metadata in MongoDB
    const mongoData = await mongoDb.upsertPoster({
      posterId: id,
      name,
      file,
      price: STANDARD_PRICE,
      category,
      tags,
      isAvailable: status === 'available'
    });

    posters.push({ ...mongoData._doc, id: id, status });
  }
  return posters;
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get('/api/posters', async (req, res) => {
  try {
    const posters = await loadPosters();
    res.json(posters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PERFORMANCE ANALYSIS ROUTE (TASK 6)
app.get('/api/performance', async (req, res) => {
  const startRel = Date.now();
  await db.getOrders(); // Query MySQL
  const relTime = Date.now() - startRel;

  const startNoSql = Date.now();
  await mongoDb.getAllPosters(); // Query MongoDB
  const noSqlTime = Date.now() - startNoSql;

  res.json({
    relational_mysql_ms: relTime,
    nosql_mongodb_ms: noSqlTime,
    analysis: "Relational is slower for complex joins but better for consistency. NoSQL is faster for simple document retrieval."
  });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    success: true,
    poster: {
      id: `CUST-${Date.now()}`,
      name: 'Custom Print',
      file: req.file.filename,
      price: CUSTOM_PRICE,
      isCustom: true
    }
  });
});

app.post('/api/admin/upload-poster', requireAdmin, adminUpload.single('poster'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const category = (req.body && req.body.category) || 'General';
  await db.logAction(req.session.user.username, `Uploaded new standard poster: ${req.file.originalname} [${category}]`);
  res.json({ success: true, category });
});

// ─── Admin Poster Classification ──────────────────────────────────────────────
app.patch('/api/admin/poster/:file', requireAuth, async (req, res) => {
  try {
    const { category, tags } = req.body;
    const file = decodeURIComponent(req.params.file);
    const update = {};
    if (category) update.category = category;
    if (tags) update.tags = tags; // array of strings
    const result = await mongoDb.updatePosterMeta(file, update);
    if (!result) return res.status(404).json({ error: 'Poster not found' });
    await db.logAction(req.session.user.username, `Updated poster metadata: ${file} → ${category || 'unchanged'}`);
    res.json({ success: true, poster: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { items, buyerName, buyerPhone, hostel, roomNumber, utrNumber } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items in order' });
  if (!buyerName || !utrNumber) return res.status(400).json({ error: 'Missing required fields' });

  // Combine optional contact fields
  const buyerContact = [buyerPhone, hostel, roomNumber].filter(Boolean).join(' | ');

  // Server-side bundle pricing
  const standardItems = items.filter(i => !i.isCustom);
  const customItems   = items.filter(i => i.isCustom);
  const standardTotal = calcBundlePrice(standardItems.length);
  const customTotal   = customItems.length * CUSTOM_PRICE;
  const totalAmount   = standardTotal + customTotal;

  // Assign correct prices to items
  // For standard items, distribute bundle price proportionally (or just store individual price)
  const pricedItems = items.map(item => ({
    ...item,
    price: item.isCustom ? CUSTOM_PRICE : STANDARD_PRICE,
    framed: false // V2.2: framing removed
  }));

  const orderId = `ORD-${Date.now()}`;
  try {
    await db.addOrder({
      orderId,
      items: pricedItems,
      buyerName,
      buyerContact,
      utrNumber,
      status: 'pending',
      timestamp: new Date().toISOString()
    });
    res.json({ success: true, orderId, totalAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/mark-sold', requireAuth, async (req, res) => {
  try {
    const { posterFile, posterId, posterName, customPrice } = req.body;
    if (!posterFile) return res.status(400).json({ error: 'Missing poster data' });

    const orderId = `SALE-${Date.now()}`;
    const user = req.session.user.username;
    const finalPrice = customPrice ? parseInt(customPrice) : STANDARD_PRICE;

    await db.addOrder({
      orderId,
      items: [{ id: posterId, name: posterName, file: posterFile, price: finalPrice, isCustom: false, framed: false }],
      buyerName: 'In-Person Buyer',
      buyerContact: 'Cash Sale',
      utrNumber: 'CASH-SALE',
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      processedBy: user
    });

    await db.logAction(user, `MARK-SOLD: ${posterName} (${posterId}) | Price: ₹${finalPrice}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark sold error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });

    const oldStatus = order.status;
    const newStatus = req.body.status || oldStatus;
    
    if (oldStatus !== newStatus) {
      await db.updateOrderStatus(order.orderId, newStatus);
      const user = req.session.user.username;
      await db.logAction(user, `Changed order ${order.orderId} from ${oldStatus} → ${newStatus}`);

      if (newStatus === 'confirmed') {
        for (const item of order.items) {
          let logStr = `Item Sold: ${item.id} - ${item.name}`;
          logStr += ` | Price: ₹${item.price}`;
          if (!item.isCustom) {
            try {
              const filePath = path.join(__dirname, 'posters', item.file);
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const hours = ((new Date() - stats.birthtime) / 3600000).toFixed(1);
                logStr += ` | Time to sell: ${hours}h`;
              }
            } catch (_) {}
          }
          await db.logAction(user, logStr);
        }
      }
    }
    res.json({ ...order, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', requireAdmin, async (req, res) => {
  try {
    const logs = await db.getLogs();
    const logText = logs.map(l => `[${l.timestamp}] [USER: ${l.username}] ${l.action}`).join('\n');
    res.setHeader('Content-Type', 'text/plain');
    res.send(logText || 'No logs yet.');
  } catch (err) {
    res.status(500).send('Error retrieving logs');
  }
});

// ─── Start / Export ───────────────────────────────────────────────────────────
async function startServer() {
  await ensureDbInitialized();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🖼️  PosterHaus running at: http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
