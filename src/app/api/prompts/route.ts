import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/knex-db';
import { replaceVariables } from '@/lib/variables';
import { parseTextToPromptContent, generateContentSnapshot } from '@/lib/prompt-conversion';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || undefined;

    const prompts = await dbManager.getPrompts({ search, tags, categories });
    
    // Parse JSON fields for response
    const parsedPrompts = prompts.map((prompt: any) => ({
      ...prompt,
      tags: JSON.parse(prompt.tags || '[]'),
      categories: JSON.parse(prompt.categories || '[]'),
      variables: JSON.parse(prompt.variables || '{}'),
      contentText: prompt.content_text
    }));

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
    
    const parsedPrompt = {
      ...createdPrompt,
      tags: JSON.parse((createdPrompt as any).tags || '[]'),
      categories: JSON.parse((createdPrompt as any).categories || '[]'),
      variables: JSON.parse((createdPrompt as any).variables || '{}'),
      contentText: (createdPrompt as any).content_text
    };

    return NextResponse.json(parsedPrompt, { status: 201 });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
  }
}