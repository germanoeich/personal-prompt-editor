exports.up = function(knex) {
  return knex.schema.createTable('ratings', function(table) {
    table.increments('id').primary();
    table.integer('prompt_id').notNullable();
    table.integer('prompt_version_id').notNullable();
    table.integer('category_id').notNullable();
    table.integer('score').notNullable().checkBetween([1, 5]);
    table.text('notes').defaultTo('');
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('prompt_id').references('id').inTable('prompts').onDelete('CASCADE');
    table.foreign('prompt_version_id').references('id').inTable('prompt_versions').onDelete('CASCADE');
    table.foreign('category_id').references('id').inTable('rating_categories').onDelete('CASCADE');
    table.unique(['prompt_id', 'prompt_version_id', 'category_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ratings');
};