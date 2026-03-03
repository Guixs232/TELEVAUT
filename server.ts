import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { RPCError } from "telegram/errors";
import admZip from "adm-zip";
import cryptoJS from "crypto-js";
import * as tar from "tar";

dotenv.config();

const app = express();
const PORT = 3000;

// Database Setup
const db = new Database("storage.db");
db.pragma('foreign_keys = ON');

// Migration: Add thumbnail_file_id if it doesn't exist
try {
  db.prepare("SELECT thumbnail_file_id FROM files LIMIT 1").get();
} catch (e) {
  try {
    db.prepare("ALTER TABLE files ADD COLUMN thumbnail_file_id TEXT DEFAULT NULL").run();
    console.log("Added thumbnail_file_id column to files table");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    telegram_file_id TEXT NOT NULL,
    thumbnail_file_id TEXT DEFAULT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT,
    category TEXT,
    genre TEXT,
    folder_id INTEGER DEFAULT NULL,
    user_id INTEGER NOT NULL,
    share_token TEXT UNIQUE DEFAULT NULL,
    share_permissions TEXT DEFAULT 'view',
    allow_copy INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_credentials (
    user_id INTEGER PRIMARY KEY,
    api_id INTEGER,
    api_hash TEXT,
    session_string TEXT,
    phone_number TEXT,
    bot_token TEXT,
    chat_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY,
    bio TEXT,
    language TEXT DEFAULT 'en',
    frame_id TEXT DEFAULT 'none',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS file_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    telegram_file_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
  );
`);

// Multer for handling file uploads to the server before sending to Telegram
const uploadDir = path.join(process.cwd(), "uploads");
const chunkDir = path.join(uploadDir, "chunks");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(chunkDir)) {
  fs.mkdirSync(chunkDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 2000 * 1024 * 1024, // 2GB limit
    fieldSize: 2000 * 1024 * 1024
  }
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// GramJS Client Management
const clients = new Map<number, TelegramClient>();
const phoneCodeHashes = new Map<number, string>();

async function getClient(userId: number) {
  if (clients.has(userId)) {
    const client = clients.get(userId)!;
    if (client.connected) return client;
    await client.connect();
    return client;
  }
  
  const creds = db.prepare("SELECT * FROM user_credentials WHERE user_id = ?").get(userId) as any;
  if (!creds || !creds.session_string) return null;
  
  const client = new TelegramClient(
    new StringSession(creds.session_string),
    creds.api_id,
    creds.api_hash,
    { connectionRetries: 5 }
  );
  
  await client.connect();
  clients.set(userId, client);
  return client;
}

// Telegram MTProto Auth Endpoints
app.post("/api/auth/telegram/send-code", async (req: any, res: any) => {
  const { userId, apiId, apiHash, phoneNumber } = req.body;
  if (!userId || !apiId || !apiHash || !phoneNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const cleanApiId = parseInt(apiId.toString().trim());
  const cleanApiHash = apiHash.toString().trim();
  const cleanPhoneNumber = phoneNumber.toString().trim();
  const uid = parseInt(userId.toString().trim());

  if (isNaN(cleanApiId)) {
    return res.status(400).json({ error: "Invalid API ID" });
  }

  // Verify user exists to prevent foreign key constraint failure
  const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(uid);
  if (!userExists) {
    return res.status(401).json({ error: "User session invalid. Please logout and login again." });
  }

  try {
    const client = new TelegramClient(new StringSession(""), cleanApiId, cleanApiHash, {
      connectionRetries: 5,
    });
    await client.connect();
    
    const { phoneCodeHash } = await client.sendCode(
      { apiId: cleanApiId, apiHash: cleanApiHash },
      cleanPhoneNumber
    );
    
    phoneCodeHashes.set(uid, phoneCodeHash);
    clients.set(uid, client);
    
    // Save initial credentials using ON CONFLICT to preserve other fields
    db.prepare(`
      INSERT INTO user_credentials (user_id, api_id, api_hash, phone_number)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        api_id = excluded.api_id,
        api_hash = excluded.api_hash,
        phone_number = excluded.phone_number
    `).run(uid, cleanApiId, cleanApiHash, cleanPhoneNumber);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Send code error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/telegram/sign-in", async (req: any, res: any) => {
  const { userId, code } = req.body;
  const uid = parseInt(userId.toString().trim());
  const client = clients.get(uid);
  const phoneCodeHash = phoneCodeHashes.get(uid);
  
  if (!client || !phoneCodeHash) {
    return res.status(400).json({ error: "Session expired or not started" });
  }

  try {
    const creds = db.prepare("SELECT * FROM user_credentials WHERE user_id = ?").get(uid) as any;
    await client.invoke(new Api.auth.SignIn({
      phoneNumber: creds.phone_number,
      phoneCodeHash: phoneCodeHash,
      phoneCode: code,
    }));
    
    const sessionString = (client.session as StringSession).save();
    db.prepare("UPDATE user_credentials SET session_string = ? WHERE user_id = ?").run(sessionString, uid);
    
    res.json({ success: true });
  } catch (error: any) {
    if (error.message.includes("SESSION_PASSWORD_NEEDED")) {
      return res.json({ success: true, requiresPassword: true });
    }
    console.error("Sign in error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/telegram/2fa", async (req: any, res: any) => {
  const { userId, password: pwd } = req.body;
  const uid = parseInt(userId.toString().trim());
  const client = clients.get(uid);
  
  if (!client) {
    return res.status(400).json({ error: "Session not found" });
  }

  try {
    // For 2FA, we need to get the password info first
    const passwordInfo = await client.invoke(new Api.account.GetPassword());
    await client.invoke(new Api.auth.CheckPassword({
      password: await (client as any).getPasswordCheck(passwordInfo, pwd)
    }));
    
    const sessionString = (client.session as StringSession).save();
    db.prepare("UPDATE user_credentials SET session_string = ? WHERE user_id = ?").run(sessionString, uid);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("2FA error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Authentication Endpoints
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password } = req.body;
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    stmt.run(username, password);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
  if (user) {
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Settings Endpoints
app.get("/api/telegram/me", async (req: any, res: any) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  
  try {
    const client = await getClient(parseInt(userId));
    if (!client) return res.status(404).json({ error: "Not connected" });
    
    const me = await client.getMe();
    res.json(me);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/settings", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  const creds = db.prepare("SELECT * FROM user_credentials WHERE user_id = ?").get(userId);
  res.json(creds || {});
});

app.post("/api/settings", (req, res) => {
  const { userId, botToken, chatId } = req.body;
  const uid = parseInt(userId.toString().trim());
  const upsert = db.prepare(`
    INSERT INTO user_credentials (user_id, bot_token, chat_id)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      bot_token = excluded.bot_token,
      chat_id = excluded.chat_id
  `);
  upsert.run(uid, botToken, chatId);
  res.json({ success: true });
});

// Helper to get config
const getConfig = (userId: number) => {
  const creds = db.prepare("SELECT * FROM user_credentials WHERE user_id = ?").get(userId) as any;
  return {
    botToken: creds?.bot_token || process.env.TELEGRAM_BOT_TOKEN,
    chatId: creds?.chat_id || process.env.TELEGRAM_CHAT_ID,
    apiId: creds?.api_id,
    apiHash: creds?.api_hash,
    sessionString: creds?.session_string
  };
};

const getTelegramUrl = (userId: number, method: string) => {
  const { botToken } = getConfig(userId);
  return `https://api.telegram.org/bot${botToken}/${method}`;
};

// Folder Endpoints
app.get("/api/folders", (req, res) => {
  const { parentId: pId, userId } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  const parentId = (pId === 'null' || pId === '' || pId === undefined) ? null : pId;
  const folders = db.prepare("SELECT * FROM folders WHERE parent_id IS ? AND user_id = ?").all(parentId, userId);
  res.json(folders);
});

app.post("/api/folders", (req, res) => {
  const { name, parentId, userId } = req.body;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  const stmt = db.prepare("INSERT INTO folders (name, parent_id, user_id) VALUES (?, ?, ?)");
  const info = stmt.run(name, parentId || null, userId);
  res.json({ id: info.lastInsertRowid, name });
});

app.delete("/api/folders/:id", (req, res) => {
  db.prepare("DELETE FROM folders WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/files", (req, res) => {
  try {
    const { folderId: fId, category, userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const folderId = (fId === 'null' || fId === '' || fId === undefined) ? null : fId;
    
    let query = "SELECT * FROM files WHERE user_id = ?";
    const params: any[] = [userId];

    if (category && category !== 'all') {
      query += " AND category = ?";
      params.push(category);
    }
    
    if (folderId !== undefined) {
      query += " AND folder_id IS ?";
      params.push(folderId);
    }

    query += " ORDER BY created_at DESC";
    const files = db.prepare(query).all(...params);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// Chunked Upload Endpoints
app.post("/api/upload/chunk", upload.single("chunk"), (req: any, res: any) => {
  try {
    const { uploadId, chunkIndex } = req.body;
    if (!req.file || !uploadId || chunkIndex === undefined) {
      return res.status(400).json({ error: "Missing chunk data" });
    }

    const fileChunkDir = path.join(chunkDir, uploadId);
    if (!fs.existsSync(fileChunkDir)) {
      fs.mkdirSync(fileChunkDir, { recursive: true });
    }

    const chunkPath = path.join(fileChunkDir, `chunk-${chunkIndex}`);
    fs.renameSync(req.file.path, chunkPath);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Chunk upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload/finalize", async (req: any, res: any) => {
  const { uploadId, fileName, fileSize, mimeType, folderId, genre, userId } = req.body;
  
  if (!uploadId || !fileName || !fileSize || !userId) {
    return res.status(400).json({ error: "Missing finalization data" });
  }

  const fileChunkDir = path.join(chunkDir, uploadId);
  const finalPath = path.join(uploadDir, `${Date.now()}-${fileName}`);
  
  try {
    // Reassemble chunks
    const chunks = fs.readdirSync(fileChunkDir).sort((a, b) => {
      const idxA = parseInt(a.split("-")[1]);
      const idxB = parseInt(b.split("-")[1]);
      return idxA - idxB;
    });

    const writeStream = fs.createWriteStream(finalPath);
    for (const chunkName of chunks) {
      const chunkPath = path.join(fileChunkDir, chunkName);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
      fs.unlinkSync(chunkPath);
    }
    
    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on("finish", () => resolve(null));
      writeStream.on("error", reject);
    });

    fs.rmSync(fileChunkDir, { recursive: true, force: true });

    // Upload to Telegram via GramJS
    const client = await getClient(parseInt(userId));
    if (!client) throw new Error("Telegram client not configured");

    const result = await client.sendFile("me", {
      file: finalPath,
      forceDocument: true,
      workers: 8,
    }) as any;

    let category = mimeType.split("/")[0];
    const ext = fileName.split(".").pop()?.toLowerCase();
    
    // Better category grouping
    if (category === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext || '')) {
      category = 'image';
    } else if (category === 'video' || ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv'].includes(ext || '')) {
      category = 'video';
    } else if (category === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext || '')) {
      category = 'audio';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'xml', 'json', 'html', 'css', 'js', 'ts', 'py', 'sql'].includes(ext || '')) {
      category = 'application';
    } else {
      category = 'application';
    }

    const fileStmt = db.prepare(`
      INSERT INTO files (name, telegram_file_id, size, mime_type, category, genre, folder_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    fileStmt.run(
      fileName,
      result.id.toString(), // Store message ID
      fileSize,
      mimeType,
      category,
      genre || null,
      folderId ? parseInt(folderId) : null,
      userId
    );

    // Clean up local file
    fs.unlinkSync(finalPath);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Upload error:", error);
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  const { folderId, genre, userId } = req.body;
  if (!userId) return res.status(400).json({ error: "User ID required" });

  try {
    const client = await getClient(parseInt(userId));
    if (!client) throw new Error("Telegram client not configured");

    const result = await client.sendFile("me", {
      file: req.file.path,
      forceDocument: true,
      workers: 4,
    }) as any;

    let category = req.file.mimetype.split("/")[0];
    const ext = req.file.originalname.split(".").pop()?.toLowerCase();

    // Better category grouping
    if (category === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext || '')) {
      category = 'image';
    } else if (category === 'video' || ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv'].includes(ext || '')) {
      category = 'video';
    } else if (category === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext || '')) {
      category = 'audio';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'xml', 'json', 'html', 'css', 'js', 'ts', 'py', 'sql'].includes(ext || '')) {
      category = 'application';
    } else {
      category = 'application';
    }

    db.prepare(`
      INSERT INTO files (name, telegram_file_id, size, mime_type, category, genre, folder_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.file.originalname,
      result.id.toString(),
      req.file.size,
      req.file.mimetype,
      category,
      genre || null,
      folderId ? parseInt(folderId) : null,
      userId
    );

    fs.unlinkSync(req.file.path);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// Extraction Endpoint
app.post("/api/extract", async (req: any, res: any) => {
  const { fileId, userId, folderId } = req.body;
  if (!fileId || !userId) return res.status(400).json({ error: "Missing data" });

  try {
    const file = db.prepare("SELECT * FROM files WHERE id = ? AND user_id = ?").get(fileId, userId) as any;
    if (!file) return res.status(404).json({ error: "File not found" });

    const client = await getClient(parseInt(userId));
    if (!client) throw new Error("Telegram client not configured");

    const buffer = await client.downloadMedia(
      new Api.Message({ id: parseInt(file.telegram_file_id) }) as any,
      {}
    ) as Buffer;
    
    const tempPath = path.join(uploadDir, `extract-${Date.now()}-${file.name}`);
    fs.writeFileSync(tempPath, buffer);

    const extractDir = path.join(uploadDir, `extracted-${Date.now()}`);
    fs.mkdirSync(extractDir);

    const fileNameLower = file.name.toLowerCase();
    
    if (fileNameLower.endsWith('.zip')) {
      const zip = new admZip(tempPath);
      zip.extractAllTo(extractDir, true);
    } else if (fileNameLower.endsWith('.tar') || fileNameLower.endsWith('.tar.gz') || fileNameLower.endsWith('.tgz')) {
      await tar.x({
        file: tempPath,
        cwd: extractDir,
      });
    } else {
      throw new Error("Unsupported archive format for extraction");
    }

    // Recursively read extracted files
    const processDirectory = async (dir: string, currentFolderId: number | null) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Create a new folder in DB
          const stmt = db.prepare("INSERT INTO folders (name, parent_id, user_id) VALUES (?, ?, ?)");
          const result = stmt.run(entry.name, currentFolderId, userId);
          await processDirectory(fullPath, result.lastInsertRowid as number);
        } else {
          const entrySize = fs.statSync(fullPath).size;
          const result = await client.sendFile("me", {
            file: fullPath,
            forceDocument: true,
            workers: 8,
          }) as any;

          const category = entry.name.split(".").pop() || "unknown";
          db.prepare(`
            INSERT INTO files (name, telegram_file_id, size, mime_type, category, folder_id, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(entry.name, result.id.toString(), entrySize, "application/octet-stream", category, currentFolderId, userId);
        }
      }
    };

    await processDirectory(extractDir, folderId ? parseInt(folderId) : null);

    fs.unlinkSync(tempPath);
    fs.rmSync(extractDir, { recursive: true, force: true });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Extraction error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Profile Endpoints
app.get("/api/profile", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  
  const profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId);
  res.json(profile || { user_id: userId, bio: '', language: 'en', frame_id: 'none' });
});

app.post("/api/profile", (req, res) => {
  const { userId, bio, language, frameId } = req.body;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  
  db.prepare(`
    INSERT INTO user_profiles (user_id, bio, language, frame_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      bio = excluded.bio,
      language = excluded.language,
      frame_id = excluded.frame_id
  `).run(userId, bio, language, frameId);
  
  res.json({ success: true });
});

app.get("/api/telegram/photo", async (req: any, res: any) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  
  try {
    const client = await getClient(parseInt(userId));
    if (!client) return res.status(404).json({ error: "Not connected" });
    
    const photo = await client.downloadProfilePhoto("me") as Buffer;
    if (photo) {
      res.setHeader("Content-Type", "image/jpeg");
      res.send(photo);
    } else {
      res.status(404).json({ error: "No profile photo" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/telegram/me", async (req: any, res: any) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  
  try {
    const client = await getClient(parseInt(userId));
    if (!client) return res.status(404).json({ error: "Not connected" });
    
    const me = await client.getMe();
    res.json(me);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sharing Endpoints
app.post("/api/files/:id/share", (req, res) => {
  try {
    const { permissions, allowCopy } = req.body;
    const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    db.prepare("UPDATE files SET share_token = ?, share_permissions = ?, allow_copy = ? WHERE id = ?").run(shareToken, permissions || 'view', allowCopy ? 1 : 0, req.params.id);
    res.json({ success: true, shareToken });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate share link" });
  }
});

app.post("/api/files/clone", async (req: any, res: any) => {
  const { shareToken, userId, targetFolderId } = req.body;
  if (!shareToken || !userId) return res.status(400).json({ error: "Missing data" });

  try {
    const sourceFile: any = db.prepare("SELECT * FROM files WHERE share_token = ?").get(shareToken);
    if (!sourceFile) return res.status(404).json({ error: "Source file not found" });
    if (!sourceFile.allow_copy) return res.status(403).json({ error: "Copying not allowed for this file" });

    const sourceClient = await getClient(sourceFile.user_id);
    const targetClient = await getClient(parseInt(userId));
    if (!sourceClient || !targetClient) throw new Error("Telegram client not configured");

    // Download from source and upload to target
    const buffer = await sourceClient.downloadMedia(
      new Api.Message({ id: parseInt(sourceFile.telegram_file_id) }) as any,
      {}
    ) as Buffer;

    const tempPath = path.join(uploadDir, `clone-${Date.now()}-${sourceFile.name}`);
    fs.writeFileSync(tempPath, buffer);

    const result = await targetClient.sendFile("me", {
      file: tempPath,
      forceDocument: true,
      workers: 8,
    }) as any;

    db.prepare(`
      INSERT INTO files (name, telegram_file_id, size, mime_type, category, folder_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sourceFile.name, result.id.toString(), sourceFile.size, sourceFile.mime_type, sourceFile.category, targetFolderId || null, userId);

    fs.unlinkSync(tempPath);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Cloning error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/share/:token", async (req: any, res: any) => {
  try {
    const file: any = db.prepare("SELECT * FROM files WHERE share_token = ?").get(req.params.token);
    if (!file) return res.status(404).json({ error: "Shared file not found" });

    res.json({
      id: file.id,
      name: file.name,
      size: file.size,
      mime_type: file.mime_type,
      category: file.category,
      genre: file.genre,
      created_at: file.created_at,
      userId: file.user_id,
      allowCopy: file.allow_copy === 1,
      shareToken: file.share_token,
      downloadUrl: `/api/download/${file.id}?userId=${file.user_id}`
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch shared file" });
  }
});

app.get("/api/files/:id/thumbnail", async (req: any, res: any) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID required" });

  try {
    const file: any = db.prepare("SELECT * FROM files WHERE id = ? AND user_id = ?").get(req.params.id, userId);
    if (!file) return res.status(404).json({ error: "File not found" });

    const { botToken } = getConfig(parseInt(userId));
    let targetFileId = file.thumbnail_file_id;

    // If no thumbnail but it's an image, use the main file as thumbnail
    if (!targetFileId && file.category === 'image') {
      targetFileId = file.telegram_file_id;
      if (targetFileId === 'chunked') {
        const firstChunk: any = db.prepare("SELECT telegram_file_id FROM file_chunks WHERE file_id = ? AND chunk_index = 0").get(file.id);
        targetFileId = firstChunk?.telegram_file_id;
      }
    }

    if (!targetFileId) {
      // Return a generic icon or 404
      return res.status(404).json({ error: "No thumbnail available" });
    }

    const getFileResponse = await axios.get(getTelegramUrl(parseInt(userId), "getFile"), {
      params: { file_id: targetFileId },
      timeout: 30000,
    });
    const filePath = getFileResponse.data.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    const response = await axios({
      url: downloadUrl,
      method: "GET",
      responseType: "stream",
      timeout: 30000,
    });

    res.setHeader("Content-Type", "image/jpeg"); // Telegram thumbnails are usually JPEGs
    response.data.pipe(res);
  } catch (error: any) {
    console.error("Thumbnail error:", error.message);
    res.status(500).json({ error: "Failed to fetch thumbnail" });
  }
});

app.get("/api/download/:id", async (req: any, res: any) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  
  try {
    const file = db.prepare("SELECT * FROM files WHERE id = ? AND user_id = ?").get(req.params.id, userId) as any;
    if (!file) return res.status(404).json({ error: "File not found" });

    const client = await getClient(parseInt(userId));
    if (!client) throw new Error("Telegram client not configured");

    const buffer = await client.downloadMedia(
      new Api.Message({ id: parseInt(file.telegram_file_id) }) as any,
      {}
    ) as Buffer;

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.send(buffer);
  } catch (error: any) {
    console.error("Download error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/stream/:id", async (req: any, res: any) => {
  const { userId } = req.query;
  const range = req.headers.range;
  if (!userId) return res.status(400).json({ error: "User ID required" });

  try {
    const file = db.prepare("SELECT * FROM files WHERE id = ? AND user_id = ?").get(req.params.id, userId) as any;
    if (!file) return res.status(404).json({ error: "File not found" });

    const client = await getClient(parseInt(userId));
    if (!client) throw new Error("Telegram client not configured");

    const fileSize = file.size;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      // For range requests, we need to download the media as a buffer and slice it
      // GramJS downloadMedia doesn't easily support range on messages without getting the file location
      // For now, we'll download the whole thing and slice (not ideal for large files, but works for small ones)
      // A better way would be to get the document location and use downloadFile
      const buffer = await client.downloadMedia(
        new Api.Message({ id: parseInt(file.telegram_file_id) }) as any,
        {}
      ) as Buffer;

      const slicedBuffer = buffer.slice(start, end + 1);

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": slicedBuffer.length,
        "Content-Type": file.mime_type || "video/mp4",
      });
      res.end(slicedBuffer);
    } else {
      const buffer = await client.downloadMedia(
        new Api.Message({ id: parseInt(file.telegram_file_id) }) as any,
        {}
      ) as Buffer;
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": file.mime_type || "video/mp4",
      });
      res.end(buffer);
    }
  } catch (error: any) {
    console.error("Stream error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/files/:id", (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    db.prepare("DELETE FROM files WHERE id = ? AND user_id = ?").run(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Move/Copy Endpoints
app.post("/api/files/move", (req, res) => {
  try {
    const { fileIds, targetFolderId, userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const stmt = db.prepare("UPDATE files SET folder_id = ? WHERE id = ? AND user_id = ?");
    const moveMany = db.transaction((ids) => {
      for (const id of ids) stmt.run(targetFolderId || null, id, userId);
    });
    moveMany(fileIds);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to move files" });
  }
});

app.post("/api/folders/move", (req, res) => {
  try {
    const { folderIds, targetFolderId, userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const stmt = db.prepare("UPDATE folders SET parent_id = ? WHERE id = ? AND user_id = ?");
    const moveMany = db.transaction((ids) => {
      for (const id of ids) {
        if (id === targetFolderId) continue; // Cannot move folder into itself
        stmt.run(targetFolderId || null, id, userId);
      }
    });
    moveMany(folderIds);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to move folders" });
  }
});

app.post("/api/files/copy", (req, res) => {
  try {
    const { fileIds, targetFolderId, userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const selectStmt = db.prepare("SELECT * FROM files WHERE id = ?");
    const insertStmt = db.prepare(`
      INSERT INTO files (name, telegram_file_id, thumbnail_file_id, size, mime_type, category, genre, folder_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const selectChunksStmt = db.prepare("SELECT * FROM file_chunks WHERE file_id = ?");
    const insertChunkStmt = db.prepare("INSERT INTO file_chunks (file_id, telegram_file_id, chunk_index) VALUES (?, ?, ?)");

    const copyMany = db.transaction((ids) => {
      for (const id of ids) {
        const file = selectStmt.get(id) as any;
        if (!file) continue;
        
        const info = insertStmt.run(
          `Copy of ${file.name}`,
          file.telegram_file_id,
          file.thumbnail_file_id,
          file.size,
          file.mime_type,
          file.category,
          file.genre,
          targetFolderId || null,
          userId
        );
        
        const newFileId = info.lastInsertRowid;
        const chunks = selectChunksStmt.all(id) as any[];
        for (const chunk of chunks) {
          insertChunkStmt.run(newFileId, chunk.telegram_file_id, chunk.chunk_index);
        }
      }
    });
    
    copyMany(fileIds);
    res.json({ success: true });
  } catch (error) {
    console.error("Copy error:", error);
    res.status(500).json({ error: "Failed to copy files" });
  }
});

// Catch-all for missing API routes to prevent returning HTML
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.timeout = 10 * 60 * 1000; // 10 minutes timeout
}

startServer();
