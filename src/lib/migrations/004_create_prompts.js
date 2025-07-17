exports.up = function(knex) {
  return knex.schema.createTable('prompts', function(table) {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('content_snapshot').notNullable();
    table.json('tags');
    table.json('categories');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('prompts');
};