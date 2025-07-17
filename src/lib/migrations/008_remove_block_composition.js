exports.up = function(knex) {
  return knex.schema.alterTable('prompts', function(table) {
    table.dropColumn('block_composition');
  }).then(() => {
    return knex.schema.alterTable('prompt_versions', function(table) {
      table.dropColumn('block_composition');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('prompts', function(table) {
    table.text('block_composition').nullable();
  }).then(() => {
    return knex.schema.alterTable('prompt_versions', function(table) {
      table.text('block_composition').nullable();
    });
  });
};