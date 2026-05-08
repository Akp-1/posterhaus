require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const db = require('./db');

const app = express();

// ── UPDATE THIS ──────────────────────────────────────────────────────────────
// Change PORT if 3000 is already in use on your Raspberry Pi
const PORT = 3000;
// ─────────────────────────────────────────────────────────────────────────────

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

const adminStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'posters/'),
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

app.use(express.static('public'));
app.use('/posters', express.static('posters'));
app.use('/P_wanted', express.static('P_wanted'));

// ─── Load Posters ─────────────────────────────────────────────────────────────
async function loadPosters() {
  const dir = path.join(__dirname, 'posters');
  if (!fs.existsSync(dir)) return [];

  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const allFiles = fs.readdirSync(dir).filter(f =>
    exts.includes(path.extname(f).toLowerCase())
  );

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

  return allFiles.map((file, i) => {
    const status = fileStatus.get(file) || 'available';
    if (status === 'sold') return null;

    const id = `PST-${String(i + 1).padStart(3, '0')}`;
    const name = path.basename(file, path.extname(file))
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    return { id, name, file, price: 60, status };
  }).filter(Boolean);
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

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    success: true,
    poster: {
      id: `CUST-${Date.now()}`,
      name: 'Custom Print',
      file: req.file.filename,
      price: 80,
      isCustom: true
    }
  });
});

app.post('/api/admin/upload-poster', requireAdmin, adminUpload.single('poster'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  await db.logAction(req.session.user.username, `Uploaded new standard poster: ${req.file.originalname}`);
  res.json({ success: true });
});

app.post('/api/orders', async (req, res) => {
  const { items, buyerName, buyerContact, utrNumber } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items in order' });
  if (!buyerName || !utrNumber) return res.status(400).json({ error: 'Missing required fields' });

  const orderId = `ORD-${Date.now()}`;
  try {
    await db.addOrder({
      orderId,
      items,
      buyerName,
      buyerContact,
      utrNumber,
      status: 'pending',
      timestamp: new Date().toISOString()
    });
    res.json({ success: true, orderId });
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
    const finalPrice = customPrice ? parseInt(customPrice) : 60;

    await db.addOrder({
      orderId,
      items: [{ id: posterId, name: posterName, file: posterFile, price: finalPrice, isCustom: false, framed: false }],
      buyerName: 'In-Person Buyer',
      buyerContact: 'At Stall',
      utrNumber: 'STALL-SALE',
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
          if (item.framed) logStr += ` (Framed)`;
          logStr += ` | Price: ₹${item.price + (item.framed ? 250 : 0)}`;
          if (!item.isCustom) {
            try {
              const stats = fs.statSync(path.join(__dirname, 'posters', item.file));
              const hours = ((new Date() - stats.birthtime) / 3600000).toFixed(1);
              logStr += ` | Time to sell: ${hours}h`;
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

// ─── Start ────────────────────────────────────────────────────────────────────
db.initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🖼️  PosterHaus running at:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://0.0.0.0:${PORT}`);
    console.log(`\n   Admin:   http://localhost:${PORT}/admin.html\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
