exports.up = function(knex) {
  return knex.schema.createTable('prompt_versions', function(table) {
    table.increments('id').primary();
    table.integer('prompt_id').unsigned().notNullable();
    table.text('content_snapshot').notNullable();
    table.integer('version_number').notNullable();
    table.timestamps(true, true);
    
    table.foreign('prompt_id').references('id').inTable('prompts').onDelete('CASCADE');
    table.unique(['prompt_id', 'version_number']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('prompt_versions');
};