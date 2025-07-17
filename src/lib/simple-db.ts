import Database from 'better-sqlite3';
import path from 'path';

const environment = process.env.NODE_ENV || 'development';
const dbPath = path.join(process.cwd(), 'data', environment === 'production' ? 'prod.sqlite3' : 'dev.sqlite3');

let db: Database.Database;

try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
} catch (error) {
  console.error('Failed to initialize database:', error);
  throw error;
}

// Helper function to convert SQLite row to camelCase object
function rowToObject(row: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!row) return null;
  
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    let processedValue = value;
    
    // Parse JSON fields
    if (key === 'tags' || key === 'categories') {
      try {
        processedValue = value ? JSON.parse(value as string) : null;
      } catch {
        processedValue = null;
      }
    }
    
    result[key] = processedValue;
  }
  
  // Ensure id is always a number if present
  if (result.id && typeof result.id !== 'number') {
    result.id = parseInt(result.id as string, 10);
  }
  
  return result;
}

export const simpleDb = {
  // Blocks operations
  blocks: {
    findAll: (search?: string, type?: string) => {
      let query = 'SELECT * FROM blocks ORDER BY updated_at DESC';
      const params: unknown[] = [];
      
      if (search || type) {
        const conditions = [];
        if (search) {
          conditions.push('(title LIKE ? OR content LIKE ?)');
          params.push(`%${search}%`, `%${search}%`);
        }
        if (type) {
          conditions.push('type = ?');
          params.push(type);
        }
        query = `SELECT * FROM blocks WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`;
      }
      
      const stmt = db.prepare(query);
      const rows = stmt.all(...params) as Record<string, unknown>[];
      return rows.map(rowToObject);
    },
    
    findById: (id: string | number) => {
      const stmt = db.prepare('SELECT * FROM blocks WHERE id = ?');
      const row = stmt.get(id) as Record<string, unknown> | undefined;
      return rowToObject(row);
    },
    
    create: (data: Record<string, unknown>) => {
      const stmt = db.prepare(`
        INSERT INTO blocks (title, content, type, tags, categories, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const result = stmt.run(
        data.title,
        data.content,
        data.type,
        data.tags ? JSON.stringify(data.tags) : null,
        data.categories ? JSON.stringify(data.categories) : null
      );
      
      return result.lastInsertRowid;
    },
    
    update: (id: string | number, data: Record<string, unknown>) => {
      const fields = [];
      const values = [];
      
      if (data.title !== undefined) {
        fields.push('title = ?');
        values.push(data.title);
      }
      if (data.content !== undefined) {
        fields.push('content = ?');
        values.push(data.content);
      }
      if (data.tags !== undefined) {
        fields.push('tags = ?');
        values.push(data.tags ? JSON.stringify(data.tags) : null);
      }
      if (data.categories !== undefined) {
        fields.push('categories = ?');
        values.push(data.categories ? JSON.stringify(data.categories) : null);
      }
      
      fields.push('updated_at = datetime(\'now\')');
      values.push(id);
      
      const stmt = db.prepare(`UPDATE blocks SET ${fields.join(', ')} WHERE id = ?`);
      return stmt.run(...values);
    },
    
    delete: (id: string | number) => {
      const stmt = db.prepare('DELETE FROM blocks WHERE id = ?');
      return stmt.run(id);
    }
  },
  
  // Prompts operations
  prompts: {
    findAll: (search?: string) => {
      let query = 'SELECT * FROM prompts ORDER BY updated_at DESC';
      const params: unknown[] = [];
      
      if (search) {
        query = 'SELECT * FROM prompts WHERE title LIKE ? OR content_snapshot LIKE ? ORDER BY updated_at DESC';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      const stmt = db.prepare(query);
      const rows = stmt.all(...params) as Record<string, unknown>[];
      return rows.map(rowToObject);
    },
    
    findById: (id: string | number) => {
      const stmt = db.prepare('SELECT * FROM prompts WHERE id = ?');
      const row = stmt.get(id) as Record<string, unknown> | undefined;
      return rowToObject(row);
    },
    
    create: (data: Record<string, unknown>) => {
      const stmt = db.prepare(`
        INSERT INTO prompts (title, content_snapshot, tags, categories, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const result = stmt.run(
        data.title,
        data.content_snapshot,
        data.tags ? JSON.stringify(data.tags) : null,
        data.categories ? JSON.stringify(data.categories) : null
      );
      
      return result.lastInsertRowid;
    }
  },
  
  // Rating categories
  ratingCategories: {
    findAll: () => {
      const stmt = db.prepare('SELECT * FROM rating_categories WHERE active = 1 ORDER BY "order" ASC');
      const rows = stmt.all() as Record<string, unknown>[];
      return rows.map(rowToObject);
    },
    
    create: (data: Record<string, unknown>) => {
      const stmt = db.prepare(`
        INSERT INTO rating_categories (name, description, "order", active, created_at, updated_at)
        VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
      `);
      
      const result = stmt.run(data.name, data.description, (data.order as number) || 0);
      return result.lastInsertRowid;
    }
  }
};

export async function initializeDatabase() {
  try {
    // Check if tables exist, create if not
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);
    
    if (!tableNames.includes('rating_categories')) {
      // Run migrations manually
      const migrations = [
        `CREATE TABLE rating_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          "order" INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE blocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT CHECK(type IN ('preset', 'one-off')) NOT NULL,
          tags TEXT,
          categories TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE block_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          block_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
          UNIQUE(block_id, version_number)
        )`,
        `CREATE TABLE prompts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content_snapshot TEXT NOT NULL,
          tags TEXT,
          categories TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE prompt_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prompt_id INTEGER NOT NULL,
          content_snapshot TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
          UNIQUE(prompt_id, version_number)
        )`,
        `CREATE TABLE ratings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prompt_version_id INTEGER NOT NULL,
          category TEXT NOT NULL,
          score INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id) ON DELETE CASCADE,
          UNIQUE(prompt_version_id, category)
        )`
      ];
      
      for (const migration of migrations) {
        db.exec(migration);
      }
      
      console.log('Database migrations completed successfully');
    }
    
    // Insert default rating categories if they don't exist
    const existingCategories = simpleDb.ratingCategories.findAll();
    if (existingCategories.length === 0) {
      simpleDb.ratingCategories.create({
        name: 'Adherence',
        description: 'How well the prompt adheres to requirements',
        order: 1
      });
      simpleDb.ratingCategories.create({
        name: 'Performance', 
        description: 'Overall performance quality',
        order: 2
      });
      simpleDb.ratingCategories.create({
        name: 'One-shot capability',
        description: 'Effectiveness without examples', 
        order: 3
      });
      console.log('Default rating categories created');
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export default simpleDb;