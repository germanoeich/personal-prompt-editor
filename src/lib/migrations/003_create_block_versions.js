exports.up = function(knex) {
  return knex.schema.createTable('block_versions', function(table) {
    table.increments('id').primary();
    table.integer('block_id').unsigned().notNullable();
    table.text('content').notNullable();
    table.integer('version_number').notNullable();
    table.timestamps(true, true);
    
    table.foreign('block_id').references('id').inTable('blocks').onDelete('CASCADE');
    table.unique(['block_id', 'version_number']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('block_versions');
};