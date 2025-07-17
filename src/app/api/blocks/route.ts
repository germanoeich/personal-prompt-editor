import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { extractVariables } from '@/lib/variables';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') || undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || undefined;

    const blocks = dbManager.getBlocks({ search, type, tags, categories });
    
    // Parse JSON fields for response
    const parsedBlocks = blocks.map((block: any) => ({
      ...block,
      tags: JSON.parse(block.tags || '[]'),
      categories: JSON.parse(block.categories || '[]'),
      variables: JSON.parse(block.variables || '[]')
    }));

    return NextResponse.json(parsedBlocks);
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.title || !data.content || !data.type) {
      return NextResponse.json(
        { error: 'Title, content, and type are required' },
        { status: 400 }
      );
    }

    if (data.type !== 'preset') {
      return NextResponse.json(
        { error: 'Type must be "preset"' },
        { status: 400 }
      );
    }

    // Extract variables from content
    const variables = extractVariables(data.content);

    const blockData = {
      title: data.title,
      content: data.content,
      type: data.type,
      tags: Array.isArray(data.tags) ? data.tags : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
      variables
    };

    const result = dbManager.createBlock(blockData);
    
    // Fetch the created block with parsed JSON fields
    const createdBlock = dbManager.getBlock(result.lastInsertRowid as number);
    if (!createdBlock) {
      return NextResponse.json({ error: 'Block not found after creation' }, { status: 500 });
    }
    
    const parsedBlock = {
      ...createdBlock,
      tags: JSON.parse((createdBlock as any).tags || '[]'),
      categories: JSON.parse((createdBlock as any).categories || '[]'),
      variables: JSON.parse((createdBlock as any).variables || '[]')
    };

    return NextResponse.json(parsedBlock, { status: 201 });
  } catch (error) {
    console.error('Error creating block:', error);
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
  }
}