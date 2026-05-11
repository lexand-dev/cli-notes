import { promises as fs } from "fs";
import * as path from "path";
import { getLogger } from "./logger";

const logger = getLogger("db");
const DB_FILE = path.resolve(process.cwd(), "notes.db");
const JSON_FALLBACK = path.resolve(process.cwd(), "notes.json");

let sqliteModule: any = null;
let db: any = null;
let useSqlite = false;

async function init() {
  if (db || useSqlite) return;

  // Try to load Bun's sqlite module. If it fails, fall back to a JSON file store.
  try {
    sqliteModule = await import("bun:sqlite");
    const Database = sqliteModule?.default ?? sqliteModule?.Database ?? sqliteModule;
    db = new Database(DB_FILE);
    // create table if not exists
    try {
      db.run("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, tags TEXT, created_at TEXT)");
    } catch (e) {
      // some versions of the API might expect exec()
      if (typeof db.exec === "function") {
        db.exec("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, tags TEXT, created_at TEXT)");
      } else {
        throw e;
      }
    }
    useSqlite = true;
    logger.info("Using bun:sqlite for persistence", { file: DB_FILE });
    return;
  } catch (err) {
    useSqlite = false;
    logger.warn("bun:sqlite not available, falling back to JSON file storage", String(err));
  }

  // Ensure JSON fallback exists
  try {
    await fs.stat(JSON_FALLBACK);
  } catch {
    await fs.writeFile(JSON_FALLBACK, JSON.stringify({ notes: [] }, null, 2), "utf8");
  }
}

function parseTags(tags?: string | string[] | null) {
  if (!tags) return null;
  if (Array.isArray(tags)) return tags.join(",");
  return String(tags);
}

export async function addNote(content: string, tags?: string | string[] | null) {
  await init();
  const created_at = new Date().toISOString();
  const tagsStr = parseTags(tags);

  if (useSqlite && db) {
    // Insert and return the inserted row
    db.run("INSERT INTO notes (content, tags, created_at) VALUES (?, ?, ?)", [content, tagsStr, created_at]);
    // Retrieve last inserted id
    const rows = [];
    for (const r of db.query("SELECT id, content, tags, created_at FROM notes ORDER BY id DESC LIMIT 1")) rows.push(r);
    return rows[0] ?? null;
  }

  // JSON fallback
  const raw = await fs.readFile(JSON_FALLBACK, "utf8");
  const data = JSON.parse(raw);
  const id = (data.notes.reduce((max: number, n: any) => Math.max(max, n.id || 0), 0) || 0) + 1;
  const note = { id, content, tags: tagsStr, created_at };
  data.notes.push(note);
  await fs.writeFile(JSON_FALLBACK, JSON.stringify(data, null, 2), "utf8");
  return note;
}

export async function getAllNotes() {
  await init();
  if (useSqlite && db) {
    const rows: any[] = [];
    for (const r of db.query("SELECT id, content, tags, created_at FROM notes ORDER BY id")) rows.push(r);
    return rows;
  }

  const raw = await fs.readFile(JSON_FALLBACK, "utf8");
  const data = JSON.parse(raw);
  return data.notes || [];
}

export async function findNotes(filter: string) {
  await init();
  if (!filter) return await getAllNotes();
  const term = `%${filter}%`;
  if (useSqlite && db) {
    const rows: any[] = [];
    // Using LIKE for simple substring matching on content
    try {
      for (const r of db.query("SELECT id, content, tags, created_at FROM notes WHERE content LIKE ? ORDER BY id", [term])) rows.push(r);
    } catch (e) {
      // As a fallback (some bun:sqlite versions may not bind LIKE with wildcards correctly),
      // use an escaped inline query.
      const esc = String(filter).replace(/'/g, "''");
      for (const r of db.query(`SELECT id, content, tags, created_at FROM notes WHERE content LIKE '%${esc}%' ORDER BY id`)) rows.push(r);
    }

    // If the SQL approach returned rows, return them. Otherwise, fall back to JS filtering.
    if (rows.length > 0) return rows;
    const all = await getAllNotes();
    return all.filter((n: any) => String(n.content).toLowerCase().includes(filter.toLowerCase()));
  }

  const all = await getAllNotes();
  return all.filter((n: any) => String(n.content).toLowerCase().includes(filter.toLowerCase()));
}

export async function removeNote(id: number) {
  await init();
  if (!id) return false;
  if (useSqlite && db) {
    db.run("DELETE FROM notes WHERE id = ?", [id]);
    return true;
  }

  const raw = await fs.readFile(JSON_FALLBACK, "utf8");
  const data = JSON.parse(raw);
  const before = data.notes.length;
  data.notes = data.notes.filter((n: any) => n.id !== id);
  await fs.writeFile(JSON_FALLBACK, JSON.stringify(data, null, 2), "utf8");
  return data.notes.length < before;
}

export async function clearNotes() {
  await init();
  if (useSqlite && db) {
    db.run("DELETE FROM notes");
    return true;
  }
  await fs.writeFile(JSON_FALLBACK, JSON.stringify({ notes: [] }, null, 2), "utf8");
  return true;
}
