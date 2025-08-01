import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/knex-db';
import { parseTextToPromptContent, generateContentSnapshot } from '@/lib/prompt-conversion';

// Database row type for prompts
interface PromptDbRow {
  id: number;
  title: string;
  content_snapshot: string;
  content_text: string;
  tags: string;
  categories: string;
  variables: string;
  created_at: string;
  updated_at: string;
  current_version: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || undefined;

    const prompts = await dbManager.getPrompts({ search, tags, categories });
    
    // Parse JSON fields for response
    const parsedPrompts = prompts.map((prompt) => {
      const promptRow = prompt as PromptDbRow;
      return {
        ...promptRow,
        tags: JSON.parse(promptRow.tags || '[]'),
        categories: JSON.parse(promptRow.categories || '[]'),
        variables: JSON.parse(promptRow.variables || '{}'),
        contentText: promptRow.content_text
      };
    });

    return NextResponse.json(parsedPrompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.title || !data.contentText) {
      return NextResponse.json(
        { error: 'Title and contentText are required' },
        { status: 400 }
      );
    }

    // Parse the content text to generate a content snapshot
    const promptContent = parseTextToPromptContent(data.contentText);
    const contentSnapshot = generateContentSnapshot(promptContent, data.variables || {});

    const promptData = {
      title: data.title,
      contentSnapshot: contentSnapshot.trim(),
      contentText: data.contentText,
      tags: Array.isArray(data.tags) ? data.tags : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
      variables: data.variables || {}
    };

    const result = await dbManager.createPrompt(promptData);
    
    // Increment usage count for any preset blocks used in the content
    const blockMatches = data.contentText.match(/<block\s+id="?(\d+)"?\s*\/?>/g) || [];
    const blockIds = blockMatches.map((match: string) => {
      const idMatch = match.match(/id="?(\d+)"?/);
      return idMatch ? parseInt(idMatch[1]) : null;
    }).filter(Boolean);
    
    for (const blockId of blockIds) {
      await dbManager.incrementBlockUsage(blockId);
    }
    
    // Fetch the created prompt with parsed JSON fields
    const createdPrompt = await dbManager.getPrompt(result.lastInsertRowid as number);
    if (!createdPrompt) {
      return NextResponse.json({ error: 'Prompt not found after creation' }, { status: 500 });
    }
    
    const createdPromptRow = createdPrompt as PromptDbRow;
    const parsedPrompt = {
      ...createdPromptRow,
      tags: JSON.parse(createdPromptRow.tags || '[]'),
      categories: JSON.parse(createdPromptRow.categories || '[]'),
      variables: JSON.parse(createdPromptRow.variables || '{}'),
      contentText: createdPromptRow.content_text
    };

    return NextResponse.json(parsedPrompt, { status: 201 });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
  }
}