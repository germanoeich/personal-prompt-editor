import { NextRequest, NextResponse } from 'next/server';
import { simpleDb } from '@/lib/simple-db';

export async function GET() {
  try {
    const categories = simpleDb.ratingCategories.findAll();
    
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
    
    const categoryId = simpleDb.ratingCategories.create({
      name,
      description,
      order: order || 0,
    });
    
    const category = simpleDb.ratingCategories.findAll().find(c => c?.id === Number(categoryId));
    
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating rating category:', error);
    return NextResponse.json({ error: 'Failed to create rating category' }, { status: 500 });
  }
}