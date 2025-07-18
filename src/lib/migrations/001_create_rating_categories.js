exports.up = function(knex) {
  return knex.schema.createTable('rating_categories', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.text('description');
    table.integer('order_index').defaultTo(0);
    table.boolean('active').defaultTo(true);
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('rating_categories');
};