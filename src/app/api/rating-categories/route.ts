import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/knex-db';

export async function GET() {
  try {
    const categories = await dbManager.getRatingCategories();
    
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching rating categories:', error);
    return NextResponse.json({ error: 'Failed to fetch rating categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, order } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const result = await dbManager.createRatingCategory({
      name,
      description,
      order_index: order || 0,
    });
    
    const categories = await dbManager.getRatingCategories();
    const category = categories.find(c => c.id === result.lastInsertRowid);
    
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating rating category:', error);
    return NextResponse.json({ error: 'Failed to create rating category' }, { status: 500 });
  }
}