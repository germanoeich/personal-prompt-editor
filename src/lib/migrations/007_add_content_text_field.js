exports.up = function(knex) {
  return knex.schema.alterTable('prompts', function(table) {
    table.text('content_text').nullable(); // New text-based format for storage
  }).then(() => {
    return knex.schema.alterTable('prompt_versions', function(table) {
      table.text('content_text').nullable(); // New text-based format for storage
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('prompts', function(table) {
    table.dropColumn('content_text');
  }).then(() => {
    return knex.schema.alterTable('prompt_versions', function(table) {
      table.dropColumn('content_text');
    });
  });
};