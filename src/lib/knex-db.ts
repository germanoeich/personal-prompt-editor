// Import the server-only database instance
import db from './server-db';

// Database operations with proper error handling
export class DatabaseManager {
  private db: typeof db;

  constructor() {
    this.db = db;
  }

  // Rating Categories
  async getRatingCategories() {
    return await this.db('rating_categories')
      .where('active', true)
      .orderBy('order_index')
      .orderBy('name');
  }

  async createRatingCategory(data: { name: string; description?: string; order_index?: number }) {
    const [id] = await this.db('rating_categories').insert({
      name: data.name,
      description: data.description || '',
      order_index: data.order_index || 0
    });
    return { lastInsertRowid: id };
  }

  async updateRatingCategory(id: number, data: Partial<{ name: string; description: string; order_index: number; active: boolean }>) {
    const result = await this.db('rating_categories')
      .where('id', id)
      .update({
        ...data,
        updated_at: this.db.fn.now()
      });
    return { changes: result };
  }

  // Blocks
  async getBlocks(filters: { search?: string; type?: string; tags?: string[]; categories?: string[] } = {}) {
    let query = this.db('blocks');

    if (filters.search) {
      query = query.where(function() {
        this.where('title', 'like', `%${filters.search}%`)
          .orWhere('content', 'like', `%${filters.search}%`);
      });
    }

    if (filters.type) {
      query = query.where('type', filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.where(function() {
        for (const tag of filters.tags!) {
          this.orWhere('tags', 'like', `%"${tag}"%`);
        }
      });
    }

    if (filters.categories && filters.categories.length > 0) {
      query = query.where(function() {
        for (const cat of filters.categories!) {
          this.orWhere('categories', 'like', `%"${cat}"%`);
        }
      });
    }

    return await query.orderBy('updated_at', 'desc');
  }

  async getBlock(id: number) {
    return await this.db('blocks').where('id', id).first();
  }

  async createBlock(data: {
    title: string;
    content: string;
    type: 'preset';
    tags?: string[];
    categories?: string[];
    variables?: string[];
  }) {
    return await this.db.transaction(async (trx) => {
      const [blockId] = await trx('blocks').insert({
        title: data.title,
        content: data.content,
        type: data.type,
        tags: JSON.stringify(data.tags || []),
        categories: JSON.stringify(data.categories || []),
        variables: JSON.stringify(data.variables || [])
      });

      // Create initial version
      await trx('block_versions').insert({
        block_id: blockId,
        version_number: 1,
        title: data.title,
        content: data.content,
        variables: JSON.stringify(data.variables || [])
      });

      return { lastInsertRowid: blockId };
    });
  }

  async updateBlock(id: number, data: Partial<{
    title: string;
    content: string;
    tags: string[];
    categories: string[];
    variables: string[];
  }>) {
    return await this.db.transaction(async (trx) => {
      // Get current block
      const currentBlock = await trx('blocks').where('id', id).first();
      if (!currentBlock) throw new Error('Block not found');

      // Increment version
      const newVersion = currentBlock.current_version + 1;

      // Update block
      const updateData: {
        title?: string;
        content?: string;
        tags?: string;
        categories?: string;
        variables?: string;
        current_version?: number;
        updated_at?: ReturnType<typeof trx.fn.now>;
      } = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
      if (data.categories !== undefined) updateData.categories = JSON.stringify(data.categories);
      if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
      
      updateData.current_version = newVersion;
      updateData.updated_at = trx.fn.now();

      await trx('blocks').where('id', id).update(updateData);

      // Create new version
      const mergedData = { ...currentBlock, ...data };
      await trx('block_versions').insert({
        block_id: id,
        version_number: newVersion,
        title: mergedData.title,
        content: mergedData.content,
        variables: JSON.stringify(mergedData.variables || JSON.parse(currentBlock.variables || '[]'))
      });

      return newVersion;
    });
  }

  async deleteBlock(id: number) {
    const result = await this.db('blocks').where('id', id).delete();
    return { changes: result };
  }

  // Block Versions
  async getBlockVersions(blockId: number) {
    return await this.db('block_versions')
      .where('block_id', blockId)
      .orderBy('version_number', 'desc');
  }

  async getBlockVersion(blockId: number, versionNumber: number) {
    return await this.db('block_versions')
      .where({ block_id: blockId, version_number: versionNumber })
      .first();
  }

  // Prompts
  async getPrompts(filters: { search?: string; tags?: string[]; categories?: string[] } = {}) {
    let query = this.db('prompts');

    if (filters.search) {
      query = query.where(function() {
        this.where('title', 'like', `%${filters.search}%`)
          .orWhere('content_snapshot', 'like', `%${filters.search}%`);
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.where(function() {
        for (const tag of filters.tags!) {
          this.orWhere('tags', 'like', `%"${tag}"%`);
        }
      });
    }

    if (filters.categories && filters.categories.length > 0) {
      query = query.where(function() {
        for (const cat of filters.categories!) {
          this.orWhere('categories', 'like', `%"${cat}"%`);
        }
      });
    }

    return await query.orderBy('updated_at', 'desc');
  }

  async getPrompt(id: number) {
    return await this.db('prompts').where('id', id).first();
  }

  async createPrompt(data: {
    title: string;
    contentSnapshot: string;
    contentText: string;
    tags?: string[];
    categories?: string[];
    variables?: Record<string, string>;
  }) {
    return await this.db.transaction(async (trx) => {
      const [promptId] = await trx('prompts').insert({
        title: data.title,
        content_snapshot: data.contentSnapshot,
        content_text: data.contentText,
        tags: JSON.stringify(data.tags || []),
        categories: JSON.stringify(data.categories || []),
        variables: JSON.stringify(data.variables || {})
      });

      // Create initial version
      await trx('prompt_versions').insert({
        prompt_id: promptId,
        version_number: 1,
        title: data.title,
        content_snapshot: data.contentSnapshot,
        content_text: data.contentText,
        variables: JSON.stringify(data.variables || {})
      });

      return { lastInsertRowid: promptId };
    });
  }

  async updatePrompt(id: number, data: Partial<{
    title: string;
    contentSnapshot: string;
    contentText: string;
    tags: string[];
    categories: string[];
    variables: Record<string, string>;
  }>) {
    return await this.db.transaction(async (trx) => {
      // Get current prompt
      const currentPrompt = await trx('prompts').where('id', id).first();
      if (!currentPrompt) throw new Error('Prompt not found');

      // Increment version
      const newVersion = currentPrompt.current_version + 1;

      // Update prompt
      const updateData: {
        title?: string;
        content_snapshot?: string;
        content_text?: string;
        tags?: string;
        categories?: string;
        variables?: string;
        current_version?: number;
        updated_at?: ReturnType<typeof trx.fn.now>;
      } = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.contentSnapshot !== undefined) updateData.content_snapshot = data.contentSnapshot;
      if (data.contentText !== undefined) updateData.content_text = data.contentText;
      if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
      if (data.categories !== undefined) updateData.categories = JSON.stringify(data.categories);
      if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
      
      updateData.current_version = newVersion;
      updateData.updated_at = trx.fn.now();

      await trx('prompts').where('id', id).update(updateData);

      // Create new version
      const mergedData = { 
        ...currentPrompt, 
        ...data,
        content_snapshot: data.contentSnapshot || currentPrompt.content_snapshot,
        content_text: data.contentText || currentPrompt.content_text
      };
      
      await trx('prompt_versions').insert({
        prompt_id: id,
        version_number: newVersion,
        title: mergedData.title,
        content_snapshot: mergedData.content_snapshot,
        content_text: mergedData.content_text,
        variables: JSON.stringify(mergedData.variables || JSON.parse(currentPrompt.variables || '{}'))
      });

      return newVersion;
    });
  }

  async deletePrompt(id: number) {
    const result = await this.db('prompts').where('id', id).delete();
    return { changes: result };
  }

  // Prompt Versions
  async getPromptVersions(promptId: number) {
    return await this.db('prompt_versions')
      .where('prompt_id', promptId)
      .orderBy('version_number', 'desc');
  }

  async getPromptVersion(promptId: number, versionNumber: number) {
    return await this.db('prompt_versions')
      .where({ prompt_id: promptId, version_number: versionNumber })
      .first();
  }

  // Ratings
  async getPromptRatings(promptId: number, versionNumber?: number) {
    let query = this.db('ratings as r')
      .join('rating_categories as rc', 'r.category_id', 'rc.id')
      .select('r.*', 'rc.name as category_name', 'rc.description as category_description')
      .where('r.prompt_id', promptId);

    if (versionNumber) {
      query = query.whereExists(function() {
        this.select(1)
          .from('prompt_versions as pv')
          .whereRaw('pv.id = r.prompt_version_id')
          .where('pv.version_number', versionNumber);
      });
    }

    return await query.orderBy('rc.order_index').orderBy('rc.name');
  }

  async createOrUpdateRating(data: {
    promptId: number;
    promptVersionId: number;
    categoryId: number;
    score: number;
    notes?: string;
  }) {
    // Check if rating exists
    const existing = await this.db('ratings')
      .where({
        prompt_id: data.promptId,
        prompt_version_id: data.promptVersionId,
        category_id: data.categoryId
      })
      .first();

    if (existing) {
      await this.db('ratings')
        .where('id', existing.id)
        .update({
          score: data.score,
          notes: data.notes || '',
          updated_at: this.db.fn.now()
        });
    } else {
      await this.db('ratings').insert({
        prompt_id: data.promptId,
        prompt_version_id: data.promptVersionId,
        category_id: data.categoryId,
        score: data.score,
        notes: data.notes || ''
      });
    }

    return { changes: 1 };
  }

  async deleteRating(promptId: number, promptVersionId: number, categoryId: number) {
    const result = await this.db('ratings')
      .where({
        prompt_id: promptId,
        prompt_version_id: promptVersionId,
        category_id: categoryId
      })
      .delete();
    return { changes: result };
  }

  // Utility methods
  async incrementBlockUsage(blockId: number) {
    const result = await this.db('blocks')
      .where('id', blockId)
      .increment('usage_count', 1);
    return { changes: result };
  }

  async getAllTags() {
    const blockTags = await this.db('blocks')
      .whereNot('tags', '')
      .select('tags')
      .distinct();
    
    const promptTags = await this.db('prompts')
      .whereNot('tags', '')
      .select('tags')
      .distinct();
    
    const allTags = new Set<string>();
    [...blockTags, ...promptTags].forEach((row) => {
      try {
        const tags = JSON.parse(row.tags);
        tags.forEach((tag: string) => allTags.add(tag));
      } catch {
        // Skip invalid JSON
      }
    });
    
    return Array.from(allTags).sort();
  }

  async getAllCategories() {
    const blockCategories = await this.db('blocks')
      .whereNot('categories', '')
      .select('categories')
      .distinct();
    
    const promptCategories = await this.db('prompts')
      .whereNot('categories', '')
      .select('categories')
      .distinct();
    
    const allCategories = new Set<string>();
    [...blockCategories, ...promptCategories].forEach((row) => {
      try {
        const categories = JSON.parse(row.categories);
        categories.forEach((cat: string) => allCategories.add(cat));
      } catch {
        // Skip invalid JSON
      }
    });
    
    return Array.from(allCategories).sort();
  }

  // Close database connection (for cleanup)
  async destroy() {
    await this.db.destroy();
  }
}

export const dbManager = new DatabaseManager();
export default db;