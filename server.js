const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');

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
    maxAge: 1000 * 60 * 60 * 8  // 8 hours — this was missing before, causing the
                                  // "unauthorized on another device" bug
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
    // ── FIXED: explicitly save session before sending response ───────────────
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

// ── FIXED: protect admin.html BEFORE static middleware ───────────────────────
// This must come before app.use(express.static(...)) or it won't intercept
app.get('/admin.html', (req, res, next) => {
  if (!req.session.user) return res.redirect('/login.html');
  next();
});

// ── FIXED: also protect admin route for cashier agents ───────────────────────
// Agents can access admin.html (to manage orders), only certain API routes are admin-only
app.use(express.static('public'));
app.use('/posters', express.static('posters'));
app.use('/P_wanted', express.static('P_wanted'));

// ─── Logging ──────────────────────────────────────────────────────────────────
const AUDIT_LOG_FILE = path.join(__dirname, 'sales_log.txt');
function logAction(username, action) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(AUDIT_LOG_FILE, `[${timestamp}] [USER: ${username}] ${action}\n`);
}

// ─── Load Posters ─────────────────────────────────────────────────────────────
function loadPosters() {
  const dir = path.join(__dirname, 'posters');
  if (!fs.existsSync(dir)) return [];

  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const allFiles = fs.readdirSync(dir).filter(f =>
    exts.includes(path.extname(f).toLowerCase())
  );

  const orders = loadOrders();
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

// ─── Orders Store ─────────────────────────────────────────────────────────────
const ORDERS_FILE = path.join(__dirname, 'orders.json');
function loadOrders() {
  if (fs.existsSync(ORDERS_FILE)) {
    try { return JSON.parse(fs.readFileSync(ORDERS_FILE)); }
    catch { return []; }   // ── FIXED: handle corrupt JSON gracefully
  }
  return [];
}
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get('/api/posters', (req, res) => res.json(loadPosters()));

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    success: true,
    poster: {
      id: `CUST-${Date.now()}`,
      name: 'Custom Print',
      file: req.file.filename,
      // ── UPDATE THIS ──────────────────────────────────────────────────────
      price: 80,   // ← change custom print price here
      // ─────────────────────────────────────────────────────────────────────
      isCustom: true
    }
  });
});

app.post('/api/admin/upload-poster', requireAdmin, adminUpload.single('poster'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  logAction(req.session.user.username, `Uploaded new standard poster: ${req.file.originalname}`);
  res.json({ success: true });
});

app.post('/api/orders', (req, res) => {
  const { items, buyerName, buyerContact, utrNumber } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items in order' });
  if (!buyerName || !utrNumber) return res.status(400).json({ error: 'Missing required fields' });

  const orders = loadOrders();
  const orderId = `ORD-${Date.now()}`;
  orders.push({
    orderId,
    items,
    buyerName,
    buyerContact,
    utrNumber,
    status: 'pending',
    timestamp: new Date().toISOString()
  });
  saveOrders(orders);
  res.json({ success: true, orderId });
});

app.post('/api/admin/mark-sold', requireAuth, (req, res) => {
  try {
    const { posterFile, posterId, posterName, customPrice } = req.body;
    if (!posterFile) return res.status(400).json({ error: 'Missing poster data' });

    const orders = loadOrders();
    const orderId = `SALE-${Date.now()}`;
    const user = req.session.user.username;
    // ── UPDATE THIS ──────────────────────────────────────────────────────────
    const finalPrice = customPrice ? parseInt(customPrice) : 60; // ← default stall price
    // ─────────────────────────────────────────────────────────────────────────

    orders.push({
      orderId,
      items: [{ id: posterId, name: posterName, file: posterFile, price: finalPrice, isCustom: false, framed: false }],
      buyerName: 'In-Person Buyer',
      buyerContact: 'At Stall',
      utrNumber: 'STALL-SALE',
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      processedBy: user
    });
    saveOrders(orders);

    logAction(user, `MARK-SOLD: ${posterName} (${posterId}) | Price: ₹${finalPrice}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark sold error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/orders', requireAuth, (req, res) => res.json(loadOrders()));

app.patch('/api/orders/:id', requireAuth, (req, res) => {
  const orders = loadOrders();
  const order = orders.find(o => o.orderId === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  const oldStatus = order.status;
  order.status = req.body.status || order.status;
  saveOrders(orders);

  if (oldStatus !== order.status) {
    const user = req.session.user.username;
    logAction(user, `Changed order ${order.orderId} from ${oldStatus} → ${order.status}`);

    if (order.status === 'confirmed') {
      order.items.forEach(item => {
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
        logAction(user, logStr);
      });
    }
  }
  res.json(order);
});

app.get('/api/logs', requireAdmin, (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/plain');
    res.send(fs.readFileSync(AUDIT_LOG_FILE, 'utf8'));
  } catch (_) {
    res.send('No logs yet.');
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  // ── UPDATE THIS ────────────────────────────────────────────────────────────
  // Replace <your-pi-ip> with your Raspberry Pi's actual local IP.
  // Run `hostname -I` on the Pi to find it (e.g. 192.168.1.42)
  console.log(`\n🖼️  PosterHaus running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://<your-pi-ip>:${PORT}  ← share on college WiFi`);
  console.log(`\n   Admin:   http://<your-pi-ip>:${PORT}/admin.html\n`);
  // ───────────────────────────────────────────────────────────────────────────
});
