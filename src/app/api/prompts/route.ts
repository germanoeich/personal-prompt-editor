import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { replaceVariables } from '@/lib/variables';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || undefined;

    const prompts = dbManager.getPrompts({ search, tags, categories });
    
    // Parse JSON fields for response
    const parsedPrompts = prompts.map((prompt: any) => ({
      ...prompt,
      blockComposition: JSON.parse(prompt.block_composition || '[]'),
      tags: JSON.parse(prompt.tags || '[]'),
      categories: JSON.parse(prompt.categories || '[]'),
      variables: JSON.parse(prompt.variables || '{}')
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
    
    if (!data.title || !data.blockComposition) {
      return NextResponse.json(
        { error: 'Title and block composition are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(data.blockComposition)) {
      return NextResponse.json(
        { error: 'Block composition must be an array' },
        { status: 400 }
      );
    }

    // Generate content snapshot by combining enabled blocks
    let contentSnapshot = '';
    const enabledBlocks = data.blockComposition.filter((block: any) => block.enabled !== false);
    
    for (const blockData of enabledBlocks) {
      if (blockData.content) {
        contentSnapshot += blockData.content + '\n\n';
      }
    }

    // Apply variable replacements if provided
    if (data.variables && typeof data.variables === 'object') {
      contentSnapshot = replaceVariables(contentSnapshot, data.variables);
    }

    const promptData = {
      title: data.title,
      contentSnapshot: contentSnapshot.trim(),
      blockComposition: data.blockComposition,
      tags: Array.isArray(data.tags) ? data.tags : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
      variables: data.variables || {}
    };

    const result = dbManager.createPrompt(promptData);
    
    // Increment usage count for any preset blocks used
    data.blockComposition.forEach((block: any) => {
      if (block.id && block.type === 'preset') {
        dbManager.incrementBlockUsage(block.id);
      }
    });
    
    // Fetch the created prompt with parsed JSON fields
    const createdPrompt = dbManager.getPrompt(result.lastInsertRowid as number);
    if (!createdPrompt) {
      return NextResponse.json({ error: 'Prompt not found after creation' }, { status: 500 });
    }
    
    const parsedPrompt = {
      ...createdPrompt,
      blockComposition: JSON.parse((createdPrompt as any).block_composition || '[]'),
      tags: JSON.parse((createdPrompt as any).tags || '[]'),
      categories: JSON.parse((createdPrompt as any).categories || '[]'),
      variables: JSON.parse((createdPrompt as any).variables || '{}')
    };

    return NextResponse.json(parsedPrompt, { status: 201 });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
  }
}