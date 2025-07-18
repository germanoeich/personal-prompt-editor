// Helper function to extract variables from content
function extractVariables(content) {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables = [];
  let match;
  
  while ((match = variableRegex.exec(content)) !== null) {
    const variable = match[1].trim();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }
  
  return variables;
}

exports.seed = async function(knex) {
  // Deletes ALL existing entries in reverse order (to respect foreign keys)
  await knex('ratings').del();
  await knex('prompt_versions').del();
  await knex('prompts').del();
  await knex('block_versions').del();
  await knex('blocks').del();
  await knex('rating_categories').del();

  // Create rating categories
  const ratingCategories = [
    { name: 'Adherence', description: 'How well the AI follows the prompt instructions', order_index: 1 },
    { name: 'Performance', description: 'Overall quality and usefulness of the response', order_index: 2 },
    { name: 'One-shot Capability', description: 'How well it works without examples or iteration', order_index: 3 },
    { name: 'Clarity', description: 'How clear and understandable the prompt is', order_index: 4 },
    { name: 'Specificity', description: 'How specific and targeted the prompt is', order_index: 5 }
  ];

  console.log('📝 Creating rating categories...');
  for (const category of ratingCategories) {
    await knex('rating_categories').insert(category);
  }

  // Create preset blocks
  const presetBlocks = [
    {
      title: 'System Role',
      content: 'You are {{role}}, an expert in {{domain}}. Your responses should be {{tone}} and {{length}}.',
      type: 'preset',
      tags: ['system', 'role', 'identity'],
      categories: ['AI Behavior', 'Foundation']
    },
    {
      title: 'Task Definition',
      content: 'Your primary task is to {{task}}. Focus on {{focus_area}} while ensuring {{quality_criteria}}. The expected outcome is {{outcome}}.',
      type: 'preset',
      tags: ['task', 'definition', 'objective'],
      categories: ['Task Management', 'Instructions']
    },
    {
      title: 'Output Format',
      content: 'Please format your response as {{format_type}}. Use {{structure}} and include {{required_elements}}.',
      type: 'preset',
      tags: ['format', 'structure', 'output'],
      categories: ['Formatting', 'Structure']
    },
    {
      title: 'Code Review',
      content: 'Review the following {{code_type}} code for {{review_criteria}}. Provide specific feedback and suggestions.',
      type: 'preset',
      tags: ['code', 'review', 'development'],
      categories: ['Programming', 'Quality Assurance']
    },
    {
      title: 'Creative Writing',
      content: 'Write a {{genre}} piece in {{style}} style. The tone should be {{tone}}, target audience is {{audience}}, length should be {{length}}, and include themes of {{themes}}.',
      type: 'preset',
      tags: ['creative', 'writing', 'storytelling'],
      categories: ['Creative', 'Content Creation']
    },
    {
      title: 'Data Analysis',
      content: 'Analyze the provided {{data_type}} data focusing on {{analysis_type}}. Identify key insights and {{deliverable}}.',
      type: 'preset',
      tags: ['data', 'analysis', 'insights'],
      categories: ['Analytics', 'Research']
    },
    {
      title: 'Meeting Summary',
      content: 'Summarize the meeting focusing on {{summary_focus}}. Include action items for {{stakeholders}}, key decisions made regarding {{decision_areas}}, and next steps for {{timeline}}.',
      type: 'preset',
      tags: ['meeting', 'summary', 'business'],
      categories: ['Business', 'Communication']
    },
    {
      title: 'Email Template',
      content: 'Compose a {{email_type}} email to {{recipient}}. The tone should be {{tone}}, purpose is {{purpose}}, include {{key_points}}, desired action is {{call_to_action}}, and timeline is {{timeline}}. Keep it {{length}} and {{formality}}.',
      type: 'preset',
      tags: ['email', 'communication', 'business'],
      categories: ['Communication', 'Business']
    },
    {
      title: 'Research Question',
      content: 'Research and provide comprehensive information about {{topic}}. Focus on {{research_areas}} and provide sources. Target audience: {{audience}}.',
      type: 'preset',
      tags: ['research', 'information', 'academic'],
      categories: ['Research', 'Education']
    },
    {
      title: 'Problem Solving',
      content: 'Help solve this {{problem_type}} problem: {{problem_description}}. Use {{methodology}} approach and consider {{constraints}}.',
      type: 'preset',
      tags: ['problem', 'solving', 'methodology'],
      categories: ['Problem Solving', 'Consulting']
    }
  ];

  console.log('🧩 Creating preset blocks...');
  for (const block of presetBlocks) {
    const variables = extractVariables(block.content);
    
    // Insert block
    const [blockId] = await knex('blocks').insert({
      title: block.title,
      content: block.content,
      type: block.type,
      tags: JSON.stringify(block.tags),
      categories: JSON.stringify(block.categories),
      variables: JSON.stringify(variables)
    });

    // Create initial version
    await knex('block_versions').insert({
      block_id: blockId,
      version_number: 1,
      title: block.title,
      content: block.content,
      variables: JSON.stringify(variables)
    });
  }

  console.log('✅ Database seeded successfully!');
};