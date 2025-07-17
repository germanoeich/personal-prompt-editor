import { simpleDb } from './simple-db';

const sampleBlocks = [
  {
    title: 'System Role',
    content: 'You are {{role}}, an expert in {{domain}}. Your responses should be {{tone}} and {{length}}.',
    type: 'preset' as const,
    tags: JSON.stringify(['system', 'role', 'persona']),
    categories: JSON.stringify(['setup'])
  },
  {
    title: 'Task Definition',
    content: 'Your task is to {{task}}. Please consider the following requirements:\n- {{requirement1}}\n- {{requirement2}}\n- {{requirement3}}',
    type: 'preset' as const,
    tags: JSON.stringify(['task', 'requirements']),
    categories: JSON.stringify(['instructions'])
  },
  {
    title: 'Output Format',
    content: 'Please format your response as follows:\n\n**Summary**: {{summary_instruction}}\n**Details**: {{details_instruction}}\n**Conclusion**: {{conclusion_instruction}}',
    type: 'preset' as const,
    tags: JSON.stringify(['format', 'structure']),
    categories: JSON.stringify(['output'])
  },
  {
    title: 'Code Review',
    content: 'Review the following {{language}} code and provide feedback on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance improvements\n4. Security considerations\n\nCode to review:\n```{{language}}\n{{code}}\n```',
    type: 'preset' as const,
    tags: JSON.stringify(['code', 'review', 'programming']),
    categories: JSON.stringify(['development'])
  },
  {
    title: 'Creative Writing',
    content: 'Write a {{genre}} story that is {{length}} in length. The story should:\n- Feature {{protagonist}} as the main character\n- Take place in {{setting}}\n- Include the theme of {{theme}}\n- Have a {{tone}} tone throughout',
    type: 'preset' as const,
    tags: JSON.stringify(['creative', 'writing', 'story']),
    categories: JSON.stringify(['content'])
  },
  {
    title: 'Data Analysis',
    content: 'Analyze the following dataset and provide insights:\n\nDataset: {{dataset_description}}\n\nPlease focus on:\n1. Key trends and patterns\n2. Statistical significance\n3. Actionable recommendations\n4. Potential limitations\n\nData:\n{{data}}',
    type: 'preset' as const,
    tags: JSON.stringify(['data', 'analysis', 'statistics']),
    categories: JSON.stringify(['analysis'])
  },
  {
    title: 'Meeting Summary',
    content: 'Summarize the following meeting notes:\n\n**Meeting**: {{meeting_title}}\n**Date**: {{date}}\n**Attendees**: {{attendees}}\n\n**Notes**:\n{{notes}}\n\nPlease provide:\n- Key decisions made\n- Action items and owners\n- Next steps',
    type: 'preset' as const,
    tags: JSON.stringify(['meeting', 'summary', 'business']),
    categories: JSON.stringify(['productivity'])
  },
  {
    title: 'Email Template',
    content: 'Draft a {{email_type}} email with the following details:\n\n**To**: {{recipient}}\n**Subject**: {{subject}}\n**Purpose**: {{purpose}}\n**Key Points**: {{key_points}}\n\nTone should be {{tone}} and {{formality_level}}.',
    type: 'preset' as const,
    tags: JSON.stringify(['email', 'communication', 'template']),
    categories: JSON.stringify(['communication'])
  }
];

export async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Check if blocks already exist
    const existingBlocks = simpleDb.blocks.findAll();
    if (existingBlocks.length > 0) {
      console.log('Database already has blocks, skipping seeding');
      return;
    }
    
    // Insert sample blocks
    for (const block of sampleBlocks) {
      const blockData = {
        title: block.title,
        content: block.content,
        type: block.type,
        tags: block.tags ? JSON.parse(block.tags) : null,
        categories: block.categories ? JSON.parse(block.categories) : null,
      };
      
      simpleDb.blocks.create(blockData);
      console.log(`Created block: ${block.title}`);
    }
    
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}