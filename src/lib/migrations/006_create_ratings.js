exports.up = function(knex) {
  return knex.schema.createTable('ratings', function(table) {
    table.increments('id').primary();
    table.integer('prompt_version_id').unsigned().notNullable();
    table.string('category', 100).notNullable();
    table.integer('score').notNullable();
    table.timestamps(true, true);
    
    table.foreign('prompt_version_id').references('id').inTable('prompt_versions').onDelete('CASCADE');
    table.unique(['prompt_version_id', 'category']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ratings');
};