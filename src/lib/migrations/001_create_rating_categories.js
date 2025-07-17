exports.up = function(knex) {
  return knex.schema.createTable('rating_categories', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.text('description');
    table.integer('order').defaultTo(0);
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('rating_categories');
};