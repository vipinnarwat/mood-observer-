

const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const Database     = require('better-sqlite3');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const cors         = require('cors');
const nodemailer   = require('nodemailer');
const { v4: uuid } = require('uuid');
const path         = require('path');

// ══════════════════════════════════════════════════════════════
//  CONFIG — set via environment variables in production
// ══════════════════════════════════════════════════════════════
const PORT        = process.env.PORT        || 3001;
const JWT_SECRET  = process.env.JWT_SECRET  || 'moodobserver-CHANGE-THIS-IN-PROD';
const DB_PATH     = process.env.DB_PATH     || path.join(__dirname, 'moodobserver.db');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Email — SMTP settings (use Gmail App Password, Zoho, SendGrid SMTP, etc.)
const MAIL_HOST   = process.env.MAIL_HOST   || 'smtp.gmail.com';
const MAIL_PORT   = parseInt(process.env.MAIL_PORT || '587');
const MAIL_SECURE = process.env.MAIL_SECURE === 'true'; // true for port 465
const MAIL_USER   = process.env.MAIL_USER   || 'your-gmail@gmail.com';
const MAIL_PASS   = process.env.MAIL_PASS   || 'your-app-password';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'vipinnarwat55@gmail.com'; // YOUR email for notifications
const MAIL_FROM   = process.env.MAIL_FROM   || `"MoodObserver" <${MAIL_USER}>`;

// ══════════════════════════════════════════════════════════════
//  NODEMAILER TRANSPORTER
// ══════════════════════════════════════════════════════════════
const transporter = nodemailer.createTransport({
  host:   MAIL_HOST,
  port:   MAIL_PORT,
  secure: MAIL_SECURE,
  auth:   { user: MAIL_USER, pass: MAIL_PASS },
});

async function sendMail(to, subject, html) {
  try {
    await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
    console.log(`✉️  Mail sent → ${to} : ${subject}`);
  } catch (e) {
    console.error('❌ Mail error:', e.message);
  }
}

// ── Email Templates ──────────────────────────────────────────
function bookingConfirmationHtml(data) {
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#0c0e14;font-family:'Segoe UI',sans-serif;color:#e8eaf2}
  .wrap{max-width:560px;margin:0 auto;padding:32px 16px}
  .card{background:#13151e;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden}
  .header{background:linear-gradient(135deg,#7c6af7,#a78bfa);padding:32px;text-align:center}
  .header h1{margin:0;font-size:26px;font-weight:700;color:#fff}
  .header p{margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8)}
  .body{padding:28px}
  .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px}
  .row:last-child{border:none}
  .label{color:#6b7090}
  .value{font-weight:600;text-align:right}
  .badge{display:inline-block;background:rgba(92,230,181,0.15);border:1px solid rgba(92,230,181,0.3);color:#5ce6b5;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:20px}
  .footer{padding:20px 28px;background:#0e1018;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:12px;color:#6b7090}
  .cta{display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#7c6af7,#a78bfa);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px}
</style></head><body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <h1>🧠 MoodObserver</h1>
      <p>Your appointment is confirmed!</p>
    </div>
    <div class="body">
      <div class="badge">✓ Booking Confirmed</div>
      <div class="row"><span class="label">Booking ID</span><span class="value">${data.bookingId}</span></div>
      <div class="row"><span class="label">Patient Name</span><span class="value">${data.patientName}</span></div>
      <div class="row"><span class="label">Package</span><span class="value">${data.packageName}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${data.date}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">${data.time}</span></div>
      <div class="row"><span class="label">Amount Paid</span><span class="value" style="color:#5ce6b5">₹${data.amount}</span></div>
      <div class="row"><span class="label">Transaction ID</span><span class="value">${data.transactionId}</span></div>
      <div class="row"><span class="label">Payment Method</span><span class="value">${data.method?.toUpperCase()}</span></div>
      <p style="margin-top:20px;font-size:14px;color:#6b7090;line-height:1.7">
        Our therapist will reach out to you before your session. 
        If you have any questions, feel free to WhatsApp us at <strong style="color:#5ce6b5">+91 7303062988</strong>.
      </p>
      <a href="https://wa.me/917303062988" class="cta">💬 Contact on WhatsApp</a>
    </div>
    <div class="footer">
      © MoodObserver · Confidential &amp; Secure · 🔒 SSL Protected<br>
      <a href="#" style="color:#7c6af7">Unsubscribe</a>
    </div>
  </div>
</div></body></html>`;
}

function adminNotificationHtml(data) {
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',sans-serif;color:#1a1a1a}
  .wrap{max-width:560px;margin:0 auto;padding:32px 16px}
  .card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
  .header{background:#7c6af7;padding:24px;color:#fff}
  .header h2{margin:0;font-size:20px}
  .body{padding:24px}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px}
  .label{color:#666}
  .value{font-weight:600}
  .amount{font-size:22px;font-weight:700;color:#7c6af7;margin:16px 0}
  .wa-btn{display:inline-block;padding:10px 24px;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:12px}
</style></head><body>
<div class="wrap">
  <div class="card">
    <div class="header"><h2>🔔 New Booking &amp; Payment — MoodObserver</h2></div>
    <div class="body">
      <div class="amount">₹${data.amount} received ✓</div>
      <div class="row"><span class="label">Booking ID</span><span class="value">${data.bookingId}</span></div>
      <div class="row"><span class="label">Patient Name</span><span class="value">${data.patientName}</span></div>
      <div class="row"><span class="label">Phone</span><span class="value">${data.phone}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${data.email || '—'}</span></div>
      <div class="row"><span class="label">Package</span><span class="value">${data.packageName}</span></div>
      <div class="row"><span class="label">Date &amp; Time</span><span class="value">${data.date} at ${data.time}</span></div>
      <div class="row"><span class="label">Transaction ID</span><span class="value">${data.transactionId}</span></div>
      <div class="row"><span class="label">Payment Method</span><span class="value">${data.method?.toUpperCase()}</span></div>
      <a href="https://wa.me/91${data.phone.replace(/\D/g,'')}" class="wa-btn">💬 WhatsApp Patient</a>
    </div>
  </div>
</div></body></html>`;
}

// ══════════════════════════════════════════════════════════════
//  DATABASE
// ══════════════════════════════════════════════════════════════
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    display_name  TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar        TEXT DEFAULT '😊',
    age           INTEGER,
    gender        TEXT,
    phone         TEXT,
    xp            INTEGER DEFAULT 0,
    streak        INTEGER DEFAULT 0,
    last_mood_date TEXT,
    private_mode  INTEGER DEFAULT 0,
    read_receipts INTEGER DEFAULT 1,
    notifications INTEGER DEFAULT 1,
    analytics     INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mood_logs (
    id        TEXT PRIMARY KEY,
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood      TEXT NOT NULL CHECK(mood IN ('Happy','Sad','Angry','Tired','Neutral')),
    note      TEXT,
    logged_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_completions (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_text    TEXT NOT NULL,
    mood_context TEXT,
    xp_earned    INTEGER DEFAULT 10,
    completed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id               TEXT PRIMARY KEY,
    user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
    patient_name     TEXT NOT NULL,
    phone            TEXT NOT NULL,
    email            TEXT,
    package_name     TEXT NOT NULL,
    package_price    INTEGER NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    payment_method   TEXT,
    payment_status   TEXT DEFAULT 'pending',
    transaction_id   TEXT,
    notes            TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    room       TEXT NOT NULL DEFAULT 'general',
    content    TEXT NOT NULL,
    mood_tag   TEXT,
    is_deleted INTEGER DEFAULT 0,
    sent_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS direct_messages (
    id          TEXT PRIMARY KEY,
    sender_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    read_at     TEXT,
    sent_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_mood_user  ON mood_logs(user_id, logged_at DESC);
  CREATE INDEX IF NOT EXISTS idx_task_user  ON task_completions(user_id, completed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_chat_room  ON chat_messages(room, sent_at DESC);
  CREATE INDEX IF NOT EXISTS idx_book_user  ON bookings(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dm_pair    ON direct_messages(sender_id, receiver_id, sent_at ASC);
`);

console.log('✅ SQLite ready:', DB_PATH);

// ── Prepared statements ──────────────────────────────────────
const S = {
  insertUser:       db.prepare(`INSERT INTO users (id,username,display_name,email,password_hash,avatar,age,gender) VALUES (?,?,?,?,?,?,?,?)`),
  userById:         db.prepare(`SELECT * FROM users WHERE id=?`),
  userByEmail:      db.prepare(`SELECT * FROM users WHERE email=?`),
  userByUsername:   db.prepare(`SELECT * FROM users WHERE username=?`),
  updateUser:       db.prepare(`UPDATE users SET display_name=?,email=?,phone=?,avatar=?,age=?,gender=?,private_mode=?,read_receipts=?,notifications=?,analytics=?,updated_at=datetime('now') WHERE id=?`),
  addXp:            db.prepare(`UPDATE users SET xp=xp+?,updated_at=datetime('now') WHERE id=?`),
  updateStreak:     db.prepare(`UPDATE users SET streak=?,last_mood_date=?,updated_at=datetime('now') WHERE id=?`),
  insertMood:       db.prepare(`INSERT INTO mood_logs (id,user_id,mood,note) VALUES (?,?,?,?)`),
  moodsByUser:      db.prepare(`SELECT * FROM mood_logs WHERE user_id=? ORDER BY logged_at DESC LIMIT ?`),
  moodStats:        db.prepare(`SELECT mood, COUNT(*) as count FROM mood_logs WHERE user_id=? GROUP BY mood`),
  clearMoods:       db.prepare(`DELETE FROM mood_logs WHERE user_id=?`),
  insertTask:       db.prepare(`INSERT INTO task_completions (id,user_id,task_text,mood_context,xp_earned) VALUES (?,?,?,?,?)`),
  tasksByUser:      db.prepare(`SELECT * FROM task_completions WHERE user_id=? ORDER BY completed_at DESC LIMIT ?`),
  clearTasks:       db.prepare(`DELETE FROM task_completions WHERE user_id=?`),
  insertBooking:    db.prepare(`INSERT INTO bookings (id,user_id,patient_name,phone,email,package_name,package_price,appointment_date,appointment_time,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`),
  updateBookingPay: db.prepare(`UPDATE bookings SET payment_method=?,payment_status=?,transaction_id=? WHERE id=?`),
  bookingById:      db.prepare(`SELECT * FROM bookings WHERE id=?`),
  bookingsByUser:   db.prepare(`SELECT * FROM bookings WHERE user_id=? ORDER BY created_at DESC`),
  insertMsg:        db.prepare(`INSERT INTO chat_messages (id,user_id,room,content,mood_tag) VALUES (?,?,?,?,?)`),
  msgsByRoom:       db.prepare(`SELECT m.*,u.display_name,u.avatar,u.username FROM chat_messages m LEFT JOIN users u ON m.user_id=u.id WHERE m.room=? AND m.is_deleted=0 ORDER BY m.sent_at DESC LIMIT ?`),
  msgWithUser:      db.prepare(`SELECT m.*,u.display_name,u.avatar,u.username FROM chat_messages m LEFT JOIN users u ON m.user_id=u.id WHERE m.id=?`),
  deleteMsg:        db.prepare(`UPDATE chat_messages SET is_deleted=1 WHERE id=? AND user_id=?`),
  insertDm:         db.prepare(`INSERT INTO direct_messages (id,sender_id,receiver_id,content) VALUES (?,?,?,?)`),
  dmConversation:   db.prepare(`SELECT dm.*,s.display_name sender_name,s.avatar sender_av,r.display_name receiver_name,r.avatar receiver_av FROM direct_messages dm JOIN users s ON dm.sender_id=s.id JOIN users r ON dm.receiver_id=r.id WHERE (dm.sender_id=? AND dm.receiver_id=?) OR (dm.sender_id=? AND dm.receiver_id=?) ORDER BY dm.sent_at ASC LIMIT 100`),
  markDmsRead:      db.prepare(`UPDATE direct_messages SET read_at=datetime('now') WHERE receiver_id=? AND sender_id=? AND read_at IS NULL`),
  insertToken:      db.prepare(`INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)`),
  tokensByUser:     db.prepare(`SELECT * FROM refresh_tokens WHERE user_id=?`),
  deleteToken:      db.prepare(`DELETE FROM refresh_tokens WHERE token_hash=?`),
  pruneTokens:      db.prepare(`DELETE FROM refresh_tokens WHERE expires_at < datetime('now')`),
};

setInterval(() => S.pruneTokens.run(), 6 * 3600 * 1000);

// ══════════════════════════════════════════════════════════════
//  EXPRESS + HTTP SERVER + SOCKET.IO
// ══════════════════════════════════════════════════════════════
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: CORS_ORIGIN, credentials: true },
  pingTimeout: 60000,
});

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
const ok  = (res, data, code = 200) => res.status(code).json({ success: true,  ...data });
const bad = (res, msg,  code = 400) => res.status(code).json({ success: false, error: msg });

function signAccess(u)  { return jwt.sign({ sub: u.id, username: u.username }, JWT_SECRET, { expiresIn: '15m' }); }
function signRefresh(u) { return jwt.sign({ sub: u.id }, JWT_SECRET, { expiresIn: '30d' }); }
function strip(u)       { const { password_hash, ...s } = u; return s; }

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return bad(res, 'Unauthorized', 401);
  try { req.userId = jwt.verify(h.slice(7), JWT_SECRET).sub; next(); }
  catch { bad(res, 'Token expired', 401); }
}

function verifySocketToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

const PKG = { 'Basic Support': 499, 'Deep Therapy': 999, 'Premium Healing': 1499 };
const ROOMS = ['general','happy','sad','vent','mindful','sleep'];

// ══════════════════════════════════════════════════════════════
//  SOCKET.IO — REAL-TIME CHAT
// ══════════════════════════════════════════════════════════════
// Track online users per room: Map<room, Map<socketId, userInfo>>
const roomUsers = new Map();
ROOMS.forEach(r => roomUsers.set(r, new Map()));

// Track typing: Map<room, Set<username>>
const roomTyping = new Map();
ROOMS.forEach(r => roomTyping.set(r, new Set()));

// Track socket → user mapping
const socketUserMap = new Map(); // socketId → { userId, username, displayName, avatar, currentRoom }

io.use((socket, next) => {
  // Allow guest connections (read-only) — token is optional
  const token = socket.handshake.auth?.token;
  if (token) {
    const payload = verifySocketToken(token);
    if (payload) {
      socket.userId = payload.sub;
      const u = S.userById.get(payload.sub);
      if (u) {
        socket.userInfo = { userId: u.id, username: u.username, displayName: u.display_name, avatar: u.avatar };
      }
    }
  }
  next();
});

io.on('connection', (socket) => {
  const isAuthed = !!socket.userId;
  console.log(`🔌 Socket connected: ${socket.id} (${isAuthed ? socket.userInfo?.username : 'guest'})`);

  if (socket.userInfo) {
    socketUserMap.set(socket.id, { ...socket.userInfo, currentRoom: 'general' });
  }

  // ── Join a room ──────────────────────────────────────────
  socket.on('join_room', (room) => {
    if (!ROOMS.includes(room)) return;

    // Leave previous room
    const info = socketUserMap.get(socket.id);
    if (info?.currentRoom && info.currentRoom !== room) {
      const prevRoom = info.currentRoom;
      socket.leave(prevRoom);

      // Remove from typing
      roomTyping.get(prevRoom)?.delete(info?.username);

      // Remove from room users
      if (isAuthed) {
        roomUsers.get(prevRoom)?.delete(socket.id);
        broadcastRoomUsers(prevRoom);
      }

      // Stop typing indicator
      socket.to(prevRoom).emit('typing_update', {
        room: prevRoom,
        typingUsers: [...(roomTyping.get(prevRoom) || [])]
      });
    }

    socket.join(room);
    if (info) info.currentRoom = room;

    // Load last 50 messages and send to this socket
    const messages = S.msgsByRoom.all(room, 50).reverse();
    socket.emit('room_history', { room, messages });

    // Add to room users if authed
    if (isAuthed && socket.userInfo) {
      roomUsers.get(room)?.set(socket.id, socket.userInfo);
      broadcastRoomUsers(room);
    }

    // Send online count to all in room
    socket.emit('room_joined', { room, onlineCount: getRoomOnlineCount(room) });
  });

  // ── Send a message ───────────────────────────────────────
  socket.on('send_message', ({ room, content, moodTag }) => {
    if (!isAuthed) return socket.emit('error', { message: 'Sign in to send messages' });
    if (!ROOMS.includes(room)) return;
    if (!content?.trim() || content.length > 1000) return;

    const id = uuid();
    S.insertMsg.run(id, socket.userId, room, content.trim(), moodTag || null);
    const saved = S.msgWithUser.get(id);

    // Clear typing
    roomTyping.get(room)?.delete(socket.userInfo?.username);
    io.to(room).emit('typing_update', { room, typingUsers: [...(roomTyping.get(room) || [])] });

    // Broadcast to everyone in room (including sender)
    io.to(room).emit('new_message', {
      room,
      message: { ...saved, isOwn: false } // client sets isOwn based on their userId
    });
  });

  // ── Typing indicator ─────────────────────────────────────
  socket.on('typing_start', ({ room }) => {
    if (!isAuthed || !socket.userInfo) return;
    roomTyping.get(room)?.add(socket.userInfo.username);
    socket.to(room).emit('typing_update', {
      room,
      typingUsers: [...(roomTyping.get(room) || [])]
    });
  });

  socket.on('typing_stop', ({ room }) => {
    if (!isAuthed || !socket.userInfo) return;
    roomTyping.get(room)?.delete(socket.userInfo.username);
    socket.to(room).emit('typing_update', {
      room,
      typingUsers: [...(roomTyping.get(room) || [])]
    });
  });

  // ── Delete message ───────────────────────────────────────
  socket.on('delete_message', ({ messageId, room }) => {
    if (!isAuthed) return;
    const r = S.deleteMsg.run(messageId, socket.userId);
    if (r.changes) {
      io.to(room).emit('message_deleted', { messageId, room });
    }
  });

  // ── Disconnect ───────────────────────────────────────────
  socket.on('disconnect', () => {
    const info = socketUserMap.get(socket.id);
    if (info) {
      const room = info.currentRoom;
      roomUsers.get(room)?.delete(socket.id);
      roomTyping.get(room)?.delete(info.username);

      if (room) {
        broadcastRoomUsers(room);
        io.to(room).emit('typing_update', {
          room,
          typingUsers: [...(roomTyping.get(room) || [])]
        });
      }
      socketUserMap.delete(socket.id);
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

function getRoomOnlineCount(room) {
  return roomUsers.get(room)?.size || 0;
}

function broadcastRoomUsers(room) {
  const users = [...(roomUsers.get(room)?.values() || [])];
  io.to(room).emit('room_users', { room, users, count: users.length });
}

// ══════════════════════════════════════════════════════════════
//  REST API — AUTH
// ══════════════════════════════════════════════════════════════
const A = express.Router();

A.post('/register', async (req, res) => {
  const { username, display_name, email, password, avatar, age, gender } = req.body;
  if (!username || !display_name || !email || !password) return bad(res, 'username, display_name, email, password required');
  if (password.length < 6) return bad(res, 'Password must be ≥ 6 characters');
  if (S.userByEmail.get(email.toLowerCase()) || S.userByUsername.get(username.toLowerCase())) return bad(res, 'Email or username already taken', 409);

  const id   = uuid();
  const hash = await bcrypt.hash(password, 12);
  S.insertUser.run(id, username.toLowerCase(), display_name, email.toLowerCase(), hash, avatar || '😊', age || null, gender || null);

  const user = S.userById.get(id);
  const at   = signAccess(user);
  const rt   = signRefresh(user);
  const rh   = await bcrypt.hash(rt, 8);
  S.insertToken.run(uuid(), id, rh, new Date(Date.now() + 30*86400*1000).toISOString());
  ok(res, { user: strip(user), access_token: at, refresh_token: rt }, 201);
});

A.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return bad(res, 'email and password required');
  const user = S.userByEmail.get(email.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return bad(res, 'Invalid credentials', 401);
  const at = signAccess(user);
  const rt = signRefresh(user);
  const rh = await bcrypt.hash(rt, 8);
  S.insertToken.run(uuid(), user.id, rh, new Date(Date.now() + 30*86400*1000).toISOString());
  ok(res, { user: strip(user), access_token: at, refresh_token: rt });
});

A.post('/refresh', async (req, res) => {
  const { refresh_token, user_id } = req.body;
  if (!refresh_token || !user_id) return bad(res, 'refresh_token and user_id required');
  const rows = S.tokensByUser.all(user_id);
  let found = null;
  for (const r of rows) { if (await bcrypt.compare(refresh_token, r.token_hash)) { found = r; break; } }
  if (!found || new Date(found.expires_at) < new Date()) { if (found) S.deleteToken.run(found.token_hash); return bad(res, 'Session expired', 401); }
  try { jwt.verify(refresh_token, JWT_SECRET); } catch { return bad(res, 'Invalid token', 401); }
  ok(res, { access_token: signAccess(S.userById.get(user_id)) });
});

A.post('/logout', authMiddleware, async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    for (const r of S.tokensByUser.all(req.userId)) {
      if (await bcrypt.compare(refresh_token, r.token_hash)) { S.deleteToken.run(r.token_hash); break; }
    }
  }
  ok(res, { message: 'Logged out' });
});

app.use('/api/auth', A);

// ══════════════════════════════════════════════════════════════
//  REST API — USER
// ══════════════════════════════════════════════════════════════
const U = express.Router(); U.use(authMiddleware);

U.get('/me', (req, res) => {
  const u = S.userById.get(req.userId);
  if (!u) return bad(res, 'Not found', 404);
  ok(res, { user: strip(u) });
});

U.patch('/me', (req, res) => {
  const u = S.userById.get(req.userId);
  if (!u) return bad(res, 'Not found', 404);
  const { display_name=u.display_name, email=u.email, phone=u.phone, avatar=u.avatar,
          age=u.age, gender=u.gender, private_mode=u.private_mode,
          read_receipts=u.read_receipts, notifications=u.notifications, analytics=u.analytics } = req.body;
  S.updateUser.run(display_name, email, phone, avatar, age, gender, private_mode?1:0, read_receipts?1:0, notifications?1:0, analytics?1:0, req.userId);
  ok(res, { user: strip(S.userById.get(req.userId)) });
});

U.get('/stats', (req, res) => {
  const u  = S.userById.get(req.userId);
  const ms = S.moodStats.all(req.userId);
  const tc = db.prepare(`SELECT COUNT(*) c FROM task_completions WHERE user_id=?`).get(req.userId).c;
  const bc = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE user_id=?`).get(req.userId).c;
  ok(res, { xp: u.xp, streak: u.streak, level: Math.floor(u.xp/100)+1, moods_logged: ms.reduce((s,m)=>s+m.count,0), mood_breakdown: ms, tasks_completed: tc, sessions_booked: bc });
});

app.use('/api/user', U);

// ══════════════════════════════════════════════════════════════
//  REST API — MOODS
// ══════════════════════════════════════════════════════════════
const M = express.Router(); M.use(authMiddleware);

M.post('/', (req, res) => {
  const { mood, note } = req.body;
  if (!['Happy','Sad','Angry','Tired','Neutral'].includes(mood)) return bad(res, 'Invalid mood');
  const u     = S.userById.get(req.userId);
  const today = new Date().toISOString().slice(0,10);
  const newStreak = u.last_mood_date === today ? u.streak : u.streak + 1;
  const id = uuid();
  S.insertMood.run(id, req.userId, mood, note||null);
  S.addXp.run(5, req.userId);
  S.updateStreak.run(newStreak, today, req.userId);
  ok(res, { id, mood, xp_earned: 5, new_streak: newStreak }, 201);
});

M.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit)||50, 500);
  ok(res, { moods: S.moodsByUser.all(req.userId, limit), stats: S.moodStats.all(req.userId) });
});

M.delete('/', (req, res) => { S.clearMoods.run(req.userId); ok(res, { message: 'Cleared' }); });
app.use('/api/moods', M);

// ══════════════════════════════════════════════════════════════
//  REST API — TASKS
// ══════════════════════════════════════════════════════════════
const T = express.Router(); T.use(authMiddleware);

T.post('/', (req, res) => {
  const { task_text, mood_context } = req.body;
  if (!task_text?.trim()) return bad(res, 'task_text required');
  const id = uuid();
  S.insertTask.run(id, req.userId, task_text.trim(), mood_context||null, 10);
  S.addXp.run(10, req.userId);
  ok(res, { id, task_text, xp_earned: 10, total_xp: S.userById.get(req.userId).xp }, 201);
});

T.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit)||50, 500);
  ok(res, { tasks: S.tasksByUser.all(req.userId, limit) });
});

T.delete('/', (req, res) => { S.clearTasks.run(req.userId); ok(res, { message: 'Cleared' }); });
app.use('/api/tasks', T);

// ══════════════════════════════════════════════════════════════
//  REST API — BOOKINGS (with email notifications)
// ══════════════════════════════════════════════════════════════
const B = express.Router();

B.post('/', (req, res) => {
  const { patient_name, phone, email, package_name, appointment_date, appointment_time, notes } = req.body;
  if (!patient_name||!phone||!package_name||!appointment_date||!appointment_time) return bad(res, 'Missing required fields');
  if (!PKG[package_name]) return bad(res, `Invalid package. Must be: ${Object.keys(PKG).join(', ')}`);
  if (!/^\+?[\d\s\-]{8,15}$/.test(phone)) return bad(res, 'Invalid phone number');

  const userId = (() => { try { return jwt.verify(req.headers.authorization?.slice(7)||'', JWT_SECRET).sub; } catch { return null; } })();
  const id = 'MO-' + Date.now().toString(36).toUpperCase();
  S.insertBooking.run(id, userId, patient_name, phone, email||null, package_name, PKG[package_name], appointment_date, appointment_time, notes||null);
  ok(res, { booking_id: id, package_name, price: PKG[package_name], status: 'pending' }, 201);
});

B.post('/:id/pay', async (req, res) => {
  const booking = S.bookingById.get(req.params.id);
  if (!booking) return bad(res, 'Booking not found', 404);
  if (booking.payment_status === 'paid') return bad(res, 'Already paid');
  const { method } = req.body;
  if (!['upi','card','netbanking'].includes(method)) return bad(res, 'Invalid method');

  // ── Simulate payment (replace with Razorpay/PhonePe SDK here) ──
  await new Promise(r => setTimeout(r, 1800 + Math.random()*600));
  const success = Math.random() < 0.95;
  // ────────────────────────────────────────────────────────────────

  const txn = success ? 'TXN' + Math.random().toString(36).substr(2,9).toUpperCase() : null;
  S.updateBookingPay.run(method, success ? 'paid' : 'failed', txn, booking.id);

  if (success) {
    const emailData = {
      bookingId:   booking.id,
      patientName: booking.patient_name,
      phone:       booking.phone,
      email:       booking.email,
      packageName: booking.package_name,
      amount:      booking.package_price,
      date:        booking.appointment_date,
      time:        booking.appointment_time,
      transactionId: txn,
      method,
    };

    // 1. Email to patient (if they provided email)
    if (booking.email) {
      sendMail(
        booking.email,
        `✅ Appointment Confirmed — ${booking.package_name} | MoodObserver`,
        bookingConfirmationHtml(emailData)
      );
    }

    // 2. Email to admin (you)
    sendMail(
      ADMIN_EMAIL,
      `🔔 New Booking ₹${booking.package_price} — ${booking.patient_name} (${booking.package_name})`,
      adminNotificationHtml(emailData)
    );

    ok(res, { success: true, booking_id: booking.id, transaction_id: txn, amount: booking.package_price, method, status: 'paid' });
  } else {
    bad(res, 'Payment declined. Please try again.', 402);
  }
});

B.get('/', authMiddleware, (req, res) => ok(res, { bookings: S.bookingsByUser.all(req.userId) }));
B.get('/:id', (req, res) => {
  const b = S.bookingById.get(req.params.id);
  if (!b) return bad(res, 'Not found', 404);
  ok(res, { booking: b });
});

app.use('/api/bookings', B);

// ══════════════════════════════════════════════════════════════
//  REST API — CHAT (history endpoint, sending done via Socket.io)
// ══════════════════════════════════════════════════════════════
const C = express.Router();
C.get('/:room', (req, res) => {
  if (!ROOMS.includes(req.params.room)) return bad(res, 'Invalid room');
  const limit = Math.min(parseInt(req.query.limit)||50, 200);
  ok(res, { room: req.params.room, messages: S.msgsByRoom.all(req.params.room, limit).reverse() });
});
app.use('/api/chat', C);

// ══════════════════════════════════════════════════════════════
//  REST API — DIRECT MESSAGES
// ══════════════════════════════════════════════════════════════
const D = express.Router(); D.use(authMiddleware);

D.get('/:username', (req, res) => {
  const other = S.userByUsername.get(req.params.username.toLowerCase());
  if (!other) return bad(res, 'User not found', 404);
  S.markDmsRead.run(req.userId, other.id);
  ok(res, { messages: S.dmConversation.all(req.userId, other.id, other.id, req.userId) });
});

D.post('/:username', (req, res) => {
  const other = S.userByUsername.get(req.params.username.toLowerCase());
  if (!other) return bad(res, 'User not found', 404);
  if (other.id === req.userId) return bad(res, "Can't DM yourself");
  const { content } = req.body;
  if (!content?.trim() || content.length > 2000) return bad(res, 'content required (max 2000)');
  const id = uuid();
  S.insertDm.run(id, req.userId, other.id, content.trim());
  ok(res, { id, sent_at: new Date().toISOString() }, 201);
});

app.use('/api/dm', D);

// ── User search ──────────────────────────────────────────────
app.get('/api/users/search', authMiddleware, (req, res) => {
  const q = (req.query.q||'').toLowerCase().trim();
  if (q.length < 2) return bad(res, 'Query must be ≥ 2 chars');
  const users = db.prepare(`SELECT id,username,display_name,avatar FROM users WHERE (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?) AND id!=? LIMIT 20`).all(`%${q}%`,`%${q}%`,req.userId);
  ok(res, { users });
});

// ── Health ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const onlineTotal = [...roomUsers.values()].reduce((t, m) => t + m.size, 0);
  ok(res, {
    status:     'ok',
    users:      db.prepare(`SELECT COUNT(*) c FROM users`).get().c,
    messages:   db.prepare(`SELECT COUNT(*) c FROM chat_messages`).get().c,
    online:     onlineTotal,
    uptime:     Math.round(process.uptime()),
  });
});

app.use((req, res) => bad(res, `Not found: ${req.method} ${req.path}`, 404));
app.use((e, req, res, next) => { console.error(e); bad(res, 'Internal error', 500); });

// ══════════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════════
server.listen(PORT, () => {
  console.log(`\n🧠 MoodObserver  →  http://localhost:${PORT}`);
  console.log(`   API           →  http://localhost:${PORT}/api`);
  console.log(`   Socket.IO     →  ws://localhost:${PORT}`);
  console.log(`   Health        →  http://localhost:${PORT}/api/health`);
  console.log(`\n📧 Admin email  →  ${ADMIN_EMAIL}`);
  console.log(`   SMTP host     →  ${MAIL_HOST}:${MAIL_PORT}\n`);
});