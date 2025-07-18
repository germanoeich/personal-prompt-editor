exports.up = function(knex) {
  return knex.schema.createTable('block_versions', function(table) {
    table.increments('id').primary();
    table.integer('block_id').notNullable();
    table.integer('version_number').notNullable();
    table.text('title').notNullable();
    table.text('content').notNullable();
    table.text('variables').defaultTo('');
    table.datetime('created_at').defaultTo(knex.fn.now());
    
    table.foreign('block_id').references('id').inTable('blocks').onDelete('CASCADE');
    table.unique(['block_id', 'version_number']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('block_versions');
};