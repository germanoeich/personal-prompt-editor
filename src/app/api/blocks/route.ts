import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/knex-db';
import { extractVariables } from '@/lib/variables';

// Database row type for blocks
interface BlockDbRow {
  id: number;
  title: string;
  content: string;
  type: 'preset';
  tags: string;
  categories: string;
  variables: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
  current_version: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') || undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || undefined;

    const blocks = await dbManager.getBlocks({ search, type, tags, categories });
    
    // Parse JSON fields for response
    const parsedBlocks = blocks.map((block) => {
      const blockRow = block as BlockDbRow;
      return {
        ...blockRow,
        tags: JSON.parse(blockRow.tags || '[]'),
        categories: JSON.parse(blockRow.categories || '[]'),
        variables: JSON.parse(blockRow.variables || '[]')
      };
    });

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

    const result = await dbManager.createBlock(blockData);
    
    // Fetch the created block with parsed JSON fields
    const createdBlock = await dbManager.getBlock(result.lastInsertRowid as number);
    if (!createdBlock) {
      return NextResponse.json({ error: 'Block not found after creation' }, { status: 500 });
    }
    
    const createdBlockRow = createdBlock as BlockDbRow;
    const parsedBlock = {
      ...createdBlockRow,
      tags: JSON.parse(createdBlockRow.tags || '[]'),
      categories: JSON.parse(createdBlockRow.categories || '[]'),
      variables: JSON.parse(createdBlockRow.variables || '[]')
    };

    return NextResponse.json(parsedBlock, { status: 201 });
  } catch (error) {
    console.error('Error creating block:', error);
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
  }
}