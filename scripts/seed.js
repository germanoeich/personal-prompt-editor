#!/usr/bin/env node

const path = require('path');
const Database = require('better-sqlite3');

// Database setup
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

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

// Database manager functions
const dbManager = {
  getBlocks() {
    return db.prepare('SELECT * FROM blocks ORDER BY created_at DESC').all();
  },
  
  getPrompts() {
    return db.prepare('SELECT * FROM prompts ORDER BY created_at DESC').all();
  },
  
  createRatingCategory(data) {
    const stmt = db.prepare(`
      INSERT INTO rating_categories (name, description, order_index)
      VALUES (?, ?, ?)
    `);
    return stmt.run(data.name, data.description, data.order_index);
  },
  
  createBlock(data) {
    const stmt = db.prepare(`
      INSERT INTO blocks (title, content, type, tags, categories, variables, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    return stmt.run(
      data.title,
      data.content,
      data.type,
      JSON.stringify(data.tags),
      JSON.stringify(data.categories),
      JSON.stringify(data.variables)
    );
  },
  
  createPrompt(data) {
    const stmt = db.prepare(`
      INSERT INTO prompts (title, content_snapshot, content_text, tags, categories, variables, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    return stmt.run(
      data.title,
      data.contentSnapshot,
      data.contentText,
      JSON.stringify(data.tags),
      JSON.stringify(data.categories),
      JSON.stringify(data.variables)
    );
  }
};

console.log('🌱 Starting database seeding...');

try {
  // Check if database already has data
  const existingBlocks = dbManager.getBlocks();
  const existingPrompts = dbManager.getPrompts();
  
  if (existingBlocks.length > 0 || existingPrompts.length > 0) {
    console.log('📦 Database already seeded');
    console.log(`   - Blocks: ${existingBlocks.length}`);
    console.log(`   - Prompts: ${existingPrompts.length}`);
    process.exit(0);
  }
  
  // Clear existing data (in case of partial data)
  db.exec('DELETE FROM ratings');
  db.exec('DELETE FROM prompt_versions');
  db.exec('DELETE FROM prompts');
  db.exec('DELETE FROM block_versions');
  db.exec('DELETE FROM blocks');
  db.exec('DELETE FROM rating_categories');

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
    dbManager.createRatingCategory(category);
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
    dbManager.createBlock({
      ...block,
      variables
    });
  }

  // Create sample prompts
  const samplePrompts = [
    {
      title: 'Code Review Assistant',
      blockComposition: [
        { 
          id: 1, 
          type: 'preset', 
          title: 'System Role',
          content: 'You are {{role}}, an expert in {{domain}}. Your responses should be {{tone}} and {{length}}.',
          enabled: true,
          canvasId: 'canvas-1-1'
        },
        { 
          id: 4, 
          type: 'preset', 
          title: 'Code Review',
          content: 'Review the following {{code_type}} code for {{review_criteria}}. Provide specific feedback and suggestions.',
          enabled: true,
          canvasId: 'canvas-4-1'
        }
      ],
      tags: ['code', 'review', 'development'],
      categories: ['Programming'],
      variables: {
        role: 'Senior Software Engineer',
        domain: 'software development',
        tone: 'constructive',
        length: 'detailed',
        code_type: 'JavaScript',
        review_criteria: 'security vulnerabilities and performance issues'
      }
    },
    {
      title: 'Creative Story Writer',
      blockComposition: [
        { 
          id: 1, 
          type: 'preset', 
          title: 'System Role',
          content: 'You are {{role}}, an expert in {{domain}}. Your responses should be {{tone}} and {{length}}.',
          enabled: true,
          canvasId: 'canvas-1-2'
        },
        { 
          id: 5, 
          type: 'preset', 
          title: 'Creative Writing',
          content: 'Write a {{genre}} piece in {{style}} style. The tone should be {{tone}}, target audience is {{audience}}, length should be {{length}}, and include themes of {{themes}}.',
          enabled: true,
          canvasId: 'canvas-5-1'
        }
      ],
      tags: ['creative', 'writing', 'storytelling'],
      categories: ['Creative'],
      variables: {
        role: 'Creative Writer',
        domain: 'storytelling and narrative craft',
        tone: 'engaging',
        length: 'medium-length',
        genre: 'science fiction',
        style: 'descriptive',
        audience: 'young adults',
        themes: 'technology and humanity'
      }
    },
    {
      title: 'Business Email Assistant',
      blockComposition: [
        { 
          id: 1, 
          type: 'preset', 
          title: 'System Role',
          content: 'You are {{role}}, an expert in {{domain}}. Your responses should be {{tone}} and {{length}}.',
          enabled: true,
          canvasId: 'canvas-1-3'
        },
        { 
          id: 8, 
          type: 'preset', 
          title: 'Email Template',
          content: 'Compose a {{email_type}} email to {{recipient}}. The tone should be {{tone}}, purpose is {{purpose}}, include {{key_points}}, desired action is {{call_to_action}}, and timeline is {{timeline}}. Keep it {{length}} and {{formality}}.',
          enabled: true,
          canvasId: 'canvas-8-1'
        }
      ],
      tags: ['email', 'business', 'communication'],
      categories: ['Business', 'Communication'],
      variables: {
        role: 'Business Communication Specialist',
        domain: 'professional communication',
        tone: 'professional',
        length: 'concise',
        email_type: 'follow-up',
        recipient: 'project stakeholders',
        purpose: 'project status update',
        key_points: 'current progress and upcoming milestones',
        call_to_action: 'review and provide feedback',
        timeline: 'by end of week',
        formality: 'formal'
      }
    }
  ];

  console.log('📋 Creating sample prompts...');
  for (const prompt of samplePrompts) {
    // Convert blockComposition to text format
    let contentText = '';
    const enabledBlocks = prompt.blockComposition.filter(block => block.enabled);
    for (const block of enabledBlocks) {
      if (block.type === 'preset') {
        contentText += `<block id="${block.id}" />\n\n`;
      } else {
        // Escape any content that might contain tags
        const escapedContent = block.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        contentText += `<text>${escapedContent}</text>\n\n`;
      }
    }
    
    // Generate content snapshot
    let contentSnapshot = '';
    for (const block of enabledBlocks) {
      contentSnapshot += block.content + '\n\n';
    }
    
    // Apply variable replacements to snapshot
    for (const [key, value] of Object.entries(prompt.variables)) {
      contentSnapshot = contentSnapshot.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    dbManager.createPrompt({
      title: prompt.title,
      contentSnapshot: contentSnapshot.trim(),
      contentText: contentText.trim(),
      tags: prompt.tags,
      categories: prompt.categories,
      variables: prompt.variables
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`   - Rating categories: ${ratingCategories.length}`);
  console.log(`   - Preset blocks: ${presetBlocks.length}`);
  console.log(`   - Sample prompts: ${samplePrompts.length}`);
  
} catch (error) {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
} finally {
  db.close();
}