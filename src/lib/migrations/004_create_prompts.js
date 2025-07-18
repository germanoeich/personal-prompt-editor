exports.up = function(knex) {
  return knex.schema.createTable('prompts', function(table) {
    table.increments('id').primary();
    table.text('title').notNullable();
    table.text('content_snapshot').notNullable();
    table.text('content_text').notNullable();
    table.text('tags').defaultTo('');
    table.text('categories').defaultTo('');
    table.text('variables').defaultTo('');
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    table.integer('current_version').defaultTo(1);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('prompts');
};