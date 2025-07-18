import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Create all tables with proper relationships and versioning
db.exec(`
  -- Rating Categories (configurable rating dimensions)
  CREATE TABLE IF NOT EXISTS rating_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Blocks (reusable prompt components)
  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('preset')),
    tags TEXT DEFAULT '', -- JSON array of tags
    categories TEXT DEFAULT '', -- JSON array of categories
    variables TEXT DEFAULT '', -- JSON array of extracted variables
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_version INTEGER DEFAULT 1
  );

  -- Block Versions (complete version history)
  CREATE TABLE IF NOT EXISTS block_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    variables TEXT DEFAULT '', -- JSON array of variables at this version
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
    UNIQUE(block_id, version_number)
  );

  -- Prompts (complete prompt compositions)
  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content_snapshot TEXT NOT NULL, -- Full rendered prompt text
    content_text TEXT NOT NULL, -- Text-based format for storage
    tags TEXT DEFAULT '', -- JSON array of tags
    categories TEXT DEFAULT '', -- JSON array of categories
    variables TEXT DEFAULT '', -- JSON object of variable values
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_version INTEGER DEFAULT 1
  );

  -- Prompt Versions (complete prompt history)
  CREATE TABLE IF NOT EXISTS prompt_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_snapshot TEXT NOT NULL,
    content_text TEXT NOT NULL, -- Text-based format for storage
    variables TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    UNIQUE(prompt_id, version_number)
  );

  -- Ratings (effectiveness tracking)
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    prompt_version_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES rating_categories(id) ON DELETE CASCADE,
    UNIQUE(prompt_id, prompt_version_id, category_id)
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_blocks_type ON blocks(type);
  CREATE INDEX IF NOT EXISTS idx_blocks_tags ON blocks(tags);
  CREATE INDEX IF NOT EXISTS idx_blocks_updated_at ON blocks(updated_at);
  CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts(tags);
  CREATE INDEX IF NOT EXISTS idx_prompts_updated_at ON prompts(updated_at);
  CREATE INDEX IF NOT EXISTS idx_ratings_prompt ON ratings(prompt_id);
  CREATE INDEX IF NOT EXISTS idx_block_versions_block_id ON block_versions(block_id);
  CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
`);

// Database operations with proper error handling
export class DatabaseManager {
  private db: Database.Database;

  constructor() {
    this.db = db;
  }

  // Rating Categories
  getRatingCategories() {
    return this.db.prepare('SELECT * FROM rating_categories WHERE active = true ORDER BY order_index, name').all();
  }

  createRatingCategory(data: { name: string; description?: string; order_index?: number }) {
    const stmt = this.db.prepare(`
      INSERT INTO rating_categories (name, description, order_index)
      VALUES (?, ?, ?)
    `);
    return stmt.run(data.name, data.description || '', data.order_index || 0);
  }

  updateRatingCategory(id: number, data: Partial<{ name: string; description: string; order_index: number; active: boolean }>) {
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const stmt = this.db.prepare(`UPDATE rating_categories SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    return stmt.run(...values, id);
  }

  // Blocks
  getBlocks(filters: { search?: string; type?: string; tags?: string[]; categories?: string[] } = {}) {
    let query = 'SELECT * FROM blocks WHERE 1=1';
    const params: any[] = [];

    if (filters.search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(() => 'tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      filters.tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    if (filters.categories && filters.categories.length > 0) {
      const categoryConditions = filters.categories.map(() => 'categories LIKE ?').join(' OR ');
      query += ` AND (${categoryConditions})`;
      filters.categories.forEach(cat => params.push(`%"${cat}"%`));
    }

    query += ' ORDER BY updated_at DESC';
    return this.db.prepare(query).all(...params);
  }

  getBlock(id: number) {
    return this.db.prepare('SELECT * FROM blocks WHERE id = ?').get(id);
  }

  createBlock(data: {
    title: string;
    content: string;
    type: 'preset';
    tags?: string[];
    categories?: string[];
    variables?: string[];
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO blocks (title, content, type, tags, categories, variables)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.title,
      data.content,
      data.type,
      JSON.stringify(data.tags || []),
      JSON.stringify(data.categories || []),
      JSON.stringify(data.variables || [])
    );

    // Create initial version
    this.createBlockVersion(result.lastInsertRowid as number, 1, data);
    
    return result;
  }

  updateBlock(id: number, data: Partial<{
    title: string;
    content: string;
    tags: string[];
    categories: string[];
    variables: string[];
  }>) {
    const transaction = this.db.transaction(() => {
      // Get current block
      const currentBlock = this.getBlock(id);
      if (!currentBlock) throw new Error('Block not found');

      // Increment version
      const newVersion = (currentBlock as any).current_version + 1;

      // Update block
      const updates = Object.keys(data).map(key => 
        ['tags', 'categories', 'variables'].includes(key) 
          ? `${key} = ?` 
          : `${key} = ?`
      ).join(', ');
      
      const values = Object.entries(data).map(([key, value]) => 
        ['tags', 'categories', 'variables'].includes(key) 
          ? JSON.stringify(value) 
          : value
      );

      const stmt = this.db.prepare(`
        UPDATE blocks SET ${updates}, current_version = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(...values, newVersion, id);

      // Create new version
      const mergedData = { ...currentBlock, ...data };
      this.createBlockVersion(id, newVersion, mergedData);

      return newVersion;
    });

    return transaction();
  }

  deleteBlock(id: number) {
    return this.db.prepare('DELETE FROM blocks WHERE id = ?').run(id);
  }

  // Block Versions
  createBlockVersion(blockId: number, versionNumber: number, data: any) {
    const stmt = this.db.prepare(`
      INSERT INTO block_versions (block_id, version_number, title, content, variables)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
      blockId,
      versionNumber,
      data.title,
      data.content,
      JSON.stringify(data.variables || [])
    );
  }

  getBlockVersions(blockId: number) {
    return this.db.prepare('SELECT * FROM block_versions WHERE block_id = ? ORDER BY version_number DESC').all(blockId);
  }

  getBlockVersion(blockId: number, versionNumber: number) {
    return this.db.prepare('SELECT * FROM block_versions WHERE block_id = ? AND version_number = ?').get(blockId, versionNumber);
  }

  // Prompts
  getPrompts(filters: { search?: string; tags?: string[]; categories?: string[] } = {}) {
    let query = 'SELECT * FROM prompts WHERE 1=1';
    const params: any[] = [];

    if (filters.search) {
      query += ' AND (title LIKE ? OR content_snapshot LIKE ?)';
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(() => 'tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      filters.tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    if (filters.categories && filters.categories.length > 0) {
      const categoryConditions = filters.categories.map(() => 'categories LIKE ?').join(' OR ');
      query += ` AND (${categoryConditions})`;
      filters.categories.forEach(cat => params.push(`%"${cat}"%`));
    }

    query += ' ORDER BY updated_at DESC';
    return this.db.prepare(query).all(...params);
  }

  getPrompt(id: number) {
    return this.db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
  }

  createPrompt(data: {
    title: string;
    contentSnapshot: string;
    contentText: string;
    tags?: string[];
    categories?: string[];
    variables?: Record<string, string>;
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO prompts (title, content_snapshot, content_text, tags, categories, variables)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.title,
      data.contentSnapshot,
      data.contentText,
      JSON.stringify(data.tags || []),
      JSON.stringify(data.categories || []),
      JSON.stringify(data.variables || {})
    );

    // Create initial version
    this.createPromptVersion(result.lastInsertRowid as number, 1, data);
    
    return result;
  }

  updatePrompt(id: number, data: Partial<{
    title: string;
    contentSnapshot: string;
    contentText: string;
    tags: string[];
    categories: string[];
    variables: Record<string, string>;
  }>) {
    const transaction = this.db.transaction(() => {
      // Get current prompt
      const currentPrompt = this.getPrompt(id);
      if (!currentPrompt) throw new Error('Prompt not found');

      // Increment version
      const newVersion = (currentPrompt as any).current_version + 1;

      // Update prompt - handle field name mapping
      const updates = Object.keys(data).map(key => {
        if (key === 'contentSnapshot') return 'content_snapshot = ?';
        if (key === 'contentText') return 'content_text = ?';
        if (['tags', 'categories', 'variables'].includes(key)) return `${key} = ?`;
        return `${key} = ?`;
      }).join(', ');
      
      const values = Object.entries(data).map(([key, value]) => 
        ['tags', 'categories', 'variables'].includes(key) 
          ? JSON.stringify(value) 
          : value
      );

      const stmt = this.db.prepare(`
        UPDATE prompts SET ${updates}, current_version = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(...values, newVersion, id);

      // Create new version
      const mergedData = { ...currentPrompt, ...data };
      this.createPromptVersion(id, newVersion, mergedData);

      return newVersion;
    });

    return transaction();
  }

  deletePrompt(id: number) {
    return this.db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
  }

  // Prompt Versions
  createPromptVersion(promptId: number, versionNumber: number, data: any) {
    const stmt = this.db.prepare(`
      INSERT INTO prompt_versions (prompt_id, version_number, title, content_snapshot, content_text, variables)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Ensure content_snapshot is never null/undefined
    const contentSnapshot = data.contentSnapshot || data.content_snapshot || '';
    const contentText = data.contentText || data.content_text || '';
    
    return stmt.run(
      promptId,
      versionNumber,
      data.title,
      contentSnapshot,
      contentText,
      JSON.stringify(data.variables || JSON.parse(data.variables || '{}'))
    );
  }

  getPromptVersions(promptId: number) {
    return this.db.prepare('SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version_number DESC').all(promptId);
  }

  getPromptVersion(promptId: number, versionNumber: number) {
    return this.db.prepare('SELECT * FROM prompt_versions WHERE prompt_id = ? AND version_number = ?').get(promptId, versionNumber);
  }

  // Ratings
  getPromptRatings(promptId: number, versionNumber?: number) {
    let query = `
      SELECT r.*, rc.name as category_name, rc.description as category_description
      FROM ratings r 
      JOIN rating_categories rc ON r.category_id = rc.id 
      WHERE r.prompt_id = ?
    `;
    const params = [promptId];

    if (versionNumber) {
      query += ' AND EXISTS (SELECT 1 FROM prompt_versions pv WHERE pv.id = r.prompt_version_id AND pv.version_number = ?)';
      params.push(versionNumber);
    }

    query += ' ORDER BY rc.order_index, rc.name';
    return this.db.prepare(query).all(...params);
  }

  createOrUpdateRating(data: {
    promptId: number;
    promptVersionId: number;
    categoryId: number;
    score: number;
    notes?: string;
  }) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ratings (prompt_id, prompt_version_id, category_id, score, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(data.promptId, data.promptVersionId, data.categoryId, data.score, data.notes || '');
  }

  deleteRating(promptId: number, promptVersionId: number, categoryId: number) {
    return this.db.prepare('DELETE FROM ratings WHERE prompt_id = ? AND prompt_version_id = ? AND category_id = ?')
      .run(promptId, promptVersionId, categoryId);
  }

  // Utility methods
  incrementBlockUsage(blockId: number) {
    return this.db.prepare('UPDATE blocks SET usage_count = usage_count + 1 WHERE id = ?').run(blockId);
  }

  getAllTags() {
    const blockTags = this.db.prepare('SELECT DISTINCT tags FROM blocks WHERE tags != ""').all();
    const promptTags = this.db.prepare('SELECT DISTINCT tags FROM prompts WHERE tags != ""').all();
    
    const allTags = new Set<string>();
    [...blockTags, ...promptTags].forEach((row: any) => {
      try {
        const tags = JSON.parse(row.tags);
        tags.forEach((tag: string) => allTags.add(tag));
      } catch (e) {
        // Skip invalid JSON
      }
    });
    
    return Array.from(allTags).sort();
  }

  getAllCategories() {
    const blockCategories = this.db.prepare('SELECT DISTINCT categories FROM blocks WHERE categories != ""').all();
    const promptCategories = this.db.prepare('SELECT DISTINCT categories FROM prompts WHERE categories != ""').all();
    
    const allCategories = new Set<string>();
    [...blockCategories, ...promptCategories].forEach((row: any) => {
      try {
        const categories = JSON.parse(row.categories);
        categories.forEach((cat: string) => allCategories.add(cat));
      } catch (e) {
        // Skip invalid JSON
      }
    });
    
    return Array.from(allCategories).sort();
  }
}

export const dbManager = new DatabaseManager();