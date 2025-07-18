import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/knex-db';
import { extractVariables } from '@/lib/variables';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blockId = parseInt(id);
    if (isNaN(blockId)) {
      return NextResponse.json({ error: 'Invalid block ID' }, { status: 400 });
    }

    const block = await dbManager.getBlock(blockId);
    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Parse JSON fields for response
    const parsedBlock = {
      ...block,
      tags: JSON.parse((block as any).tags || '[]'),
      categories: JSON.parse((block as any).categories || '[]'),
      variables: JSON.parse((block as any).variables || '[]')
    };

    return NextResponse.json(parsedBlock);
  } catch (error) {
    console.error('Error fetching block:', error);
    return NextResponse.json({ error: 'Failed to fetch block' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blockId = parseInt(id);
    if (isNaN(blockId)) {
      return NextResponse.json({ error: 'Invalid block ID' }, { status: 400 });
    }

    const data = await request.json();
    
    // Validate that block exists
    const existingBlock = await dbManager.getBlock(blockId);
    if (!existingBlock) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Extract variables if content is being updated
    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) {
      updateData.content = data.content;
      updateData.variables = extractVariables(data.content);
    }
    if (data.tags !== undefined) updateData.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.categories !== undefined) updateData.categories = Array.isArray(data.categories) ? data.categories : [];

    // Update block (this creates a new version automatically)
    await dbManager.updateBlock(blockId, updateData);
    
    // Fetch updated block
    const updatedBlock = await dbManager.getBlock(blockId);
    if (!updatedBlock) {
      return NextResponse.json({ error: 'Block not found after update' }, { status: 404 });
    }
    
    const parsedBlock = {
      ...updatedBlock,
      tags: JSON.parse((updatedBlock as any).tags || '[]'),
      categories: JSON.parse((updatedBlock as any).categories || '[]'),
      variables: JSON.parse((updatedBlock as any).variables || '[]')
    };

    return NextResponse.json(parsedBlock);
  } catch (error) {
    console.error('Error updating block:', error);
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blockId = parseInt(id);
    if (isNaN(blockId)) {
      return NextResponse.json({ error: 'Invalid block ID' }, { status: 400 });
    }

    // Validate that block exists
    const existingBlock = await dbManager.getBlock(blockId);
    if (!existingBlock) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Delete block
    await dbManager.deleteBlock(blockId);

    return NextResponse.json({ message: 'Block deleted successfully' });
  } catch (error) {
    console.error('Error deleting block:', error);
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
  }
}