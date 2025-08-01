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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prompt = await dbManager.getPrompt(parseInt(id));
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    
    // Parse JSON fields for response
    const promptRow = prompt as PromptDbRow;
    const parsedPrompt = {
      ...promptRow,
      tags: JSON.parse(promptRow.tags || '[]'),
      categories: JSON.parse(promptRow.categories || '[]'),
      variables: JSON.parse(promptRow.variables || '{}'),
      contentText: promptRow.content_text
    };
    
    return NextResponse.json(parsedPrompt, { status: 200 });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    if (!data.title && !data.contentText && !data.tags && !data.categories && !data.variables) {
      return NextResponse.json(
        { error: 'At least one field is required to update' },
        { status: 400 }
      );
    }

    const updateData: {
      title?: string;
      tags?: string[];
      categories?: string[];
      variables?: Record<string, string>;
      contentText?: string;
      contentSnapshot?: string;
    } = {};
    
    if (data.title) updateData.title = data.title;
    if (data.tags) updateData.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.categories) updateData.categories = Array.isArray(data.categories) ? data.categories : [];
    if (data.variables) updateData.variables = data.variables;

    if (data.contentText) {
      // Parse the content text to generate a content snapshot
      const promptContent = parseTextToPromptContent(data.contentText);
      const contentSnapshot = generateContentSnapshot(promptContent, data.variables || {});
      
      updateData.contentText = data.contentText;
      updateData.contentSnapshot = contentSnapshot.trim();
      
      // Increment usage count for any preset blocks used in the content
      const blockMatches = data.contentText.match(/<block\s+id="?(\d+)"?\s*\/?>/g) || [];
      const blockIds = blockMatches.map((match: string) => {
        const idMatch = match.match(/id="?(\d+)"?/);
        return idMatch ? parseInt(idMatch[1]) : null;
      }).filter(Boolean);
      
      for (const blockId of blockIds) {
        await dbManager.incrementBlockUsage(blockId);
      }
    }

    await dbManager.updatePrompt(parseInt(id), updateData);
    
    // Fetch the updated prompt with parsed JSON fields
    const updatedPrompt = await dbManager.getPrompt(parseInt(id));
    if (!updatedPrompt) {
      return NextResponse.json({ error: 'Prompt not found after update' }, { status: 500 });
    }
    
    const updatedPromptRow = updatedPrompt as PromptDbRow;
    const parsedPrompt = {
      ...updatedPromptRow,
      tags: JSON.parse(updatedPromptRow.tags || '[]'),
      categories: JSON.parse(updatedPromptRow.categories || '[]'),
      variables: JSON.parse(updatedPromptRow.variables || '{}'),
      contentText: updatedPromptRow.content_text
    };

    return NextResponse.json(parsedPrompt, { status: 200 });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await dbManager.deletePrompt(parseInt(id));
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Prompt deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }
}