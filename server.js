const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- 資料庫路徑設定 ----------
// 本機測試時會存在專案根目錄；部署到 Zeabur 時，
// 透過環境變數 DATA_DIR 指向掛載的持久空間 (Volume)，確保重新部署資料不遺失
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const dbPath = path.join(DATA_DIR, 'bookings.db');
const db = new Database(dbPath);

console.log(`[INFO] 資料庫存放路徑: ${dbPath}`);

// 建立資料表 (如果不存在)
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    email TEXT,
    date TEXT,
    time TEXT,
    address TEXT,
    towing INTEGER,
    towingSize TEXT,
    unpack INTEGER,
    unpackPlatform INTEGER,
    unpackJack INTEGER,
    unpackOther TEXT,
    remark1 INTEGER,
    remark2 INTEGER,
    remark3 INTEGER,
    remarkOther TEXT,
    createdAt TEXT
  )
`);

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
// 設定靜態檔案目錄 (將 index.html, css, js 等放進 public 資料夾)
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API：提交新預訂 ----------
app.post('/api/bookings', (req, res) => {
  try {
    const b = req.body;
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO bookings (
        id, name, phone, email, date, time, address,
        towing, towingSize,
        unpack, unpackPlatform, unpackJack, unpackOther,
        remark1, remark2, remark3, remarkOther,
        createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      b.name || '',
      b.phone || '',
      b.email || '',
      b.date || '',
      b.time || '',
      b.address || '',
      b.towing ? 1 : 0,
      b.towingSize || '',
      b.unpack ? 1 : 0,
      b.unpackPlatform ? 1 : 0,
      b.unpackJack ? 1 : 0,
      b.unpackOther || '',
      b.remark1 ? 1 : 0,
      b.remark2 ? 1 : 0,
      b.remark3 ? 1 : 0,
      b.remarkOther || '',
      createdAt
    );

    console.log(`[INFO] 收到新預訂: ${b.name} (${b.phone})`);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[ERROR] 新增預訂失敗:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- API：取得所有預訂（給 admin.html 用）----------
app.get('/api/bookings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM bookings ORDER BY createdAt DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('[ERROR] 讀取預訂失敗:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- API：刪除單筆預訂 ----------
app.delete('/api/bookings/:id', (req, res) => {
  try {
    const id = req.params.id;
    const result = db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
    
    if (result.changes > 0) {
      console.log(`[INFO] 刪除預訂記錄 ID: ${id}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: "找不到該筆記錄" });
    }
  } catch (err) {
    console.error('[ERROR] 刪除預訂失敗:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- 啟動伺服器 ----------
app.listen(PORT, () => {
  console.log(`[INFO] 伺服器已啟動，聆聽 Port: ${PORT}`);
});
