exports.up = function(knex) {
  return knex.schema.createTable('blocks', function(table) {
    table.increments('id').primary();
    table.text('title').notNullable();
    table.text('content').notNullable();
    table.text('type').notNullable().checkIn(['preset']);
    table.text('tags').defaultTo('');
    table.text('categories').defaultTo('');
    table.text('variables').defaultTo('');
    table.integer('usage_count').defaultTo(0);
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    table.integer('current_version').defaultTo(1);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('blocks');
};