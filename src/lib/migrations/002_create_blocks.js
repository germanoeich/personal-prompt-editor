exports.up = function(knex) {
  return knex.schema.createTable('blocks', function(table) {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.enum('type', ['preset', 'one-off']).notNullable();
    table.json('tags');
    table.json('categories');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('blocks');
};