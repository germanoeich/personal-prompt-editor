exports.up = function(knex) {
  return knex.schema
    .raw('CREATE INDEX IF NOT EXISTS idx_blocks_type ON blocks(type)')
    .raw('CREATE INDEX IF NOT EXISTS idx_blocks_tags ON blocks(tags)')
    .raw('CREATE INDEX IF NOT EXISTS idx_blocks_updated_at ON blocks(updated_at)')
    .raw('CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts(tags)')
    .raw('CREATE INDEX IF NOT EXISTS idx_prompts_updated_at ON prompts(updated_at)')
    .raw('CREATE INDEX IF NOT EXISTS idx_ratings_prompt ON ratings(prompt_id)')
    .raw('CREATE INDEX IF NOT EXISTS idx_block_versions_block_id ON block_versions(block_id)')
    .raw('CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id)');
};

exports.down = function(knex) {
  return knex.schema
    .raw('DROP INDEX IF EXISTS idx_blocks_type')
    .raw('DROP INDEX IF EXISTS idx_blocks_tags')
    .raw('DROP INDEX IF EXISTS idx_blocks_updated_at')
    .raw('DROP INDEX IF EXISTS idx_prompts_tags')
    .raw('DROP INDEX IF EXISTS idx_prompts_updated_at')
    .raw('DROP INDEX IF EXISTS idx_ratings_prompt')
    .raw('DROP INDEX IF EXISTS idx_block_versions_block_id')
    .raw('DROP INDEX IF EXISTS idx_prompt_versions_prompt_id');
};