import { NextRequest, NextResponse } from 'next/server';
import { simpleDb } from '@/lib/simple-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prompt = simpleDb.prompts.findById(id);
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    
    return NextResponse.json({ prompt }, { status: 200 });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
  }
}

// PUT and DELETE endpoints can be implemented later if needed