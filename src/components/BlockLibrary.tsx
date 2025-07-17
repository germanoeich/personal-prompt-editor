'use client';

import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Block as BlockType } from '@/types/database';
import Block from './Block';

interface DraggableBlockProps {
  block: BlockType;
  onEdit: (block: BlockType) => void;
}

function DraggableBlock({ block, onEdit }: DraggableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `block-${block.id || 'unknown'}`,
    data: {
      type: 'block',
      block,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      <Block
        block={block}
        onEdit={onEdit}
        isDragging={isDragging}
        className="mb-2"
      />
    </div>
  );
}

interface BlockLibraryProps {
  onEditBlock?: (block: BlockType) => void;
  onCreateBlock?: () => void;
}

export default function BlockLibrary({ onEditBlock, onCreateBlock }: BlockLibraryProps) {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'preset' | 'one-off'>('all');

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const response = await fetch('/api/blocks');
      const data = await response.json();
      setBlocks(data.blocks || []);
    } catch (error) {
      console.error('Error fetching blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBlocks = blocks.filter(block => {
    const matchesSearch = searchTerm === '' || 
      block.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || block.type === filterType;
    
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading blocks...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Block Library</h2>
          {onCreateBlock && (
            <button
              onClick={onCreateBlock}
              className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
            >
              + New Block
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs rounded ${
                filterType === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('preset')}
              className={`px-3 py-1 text-xs rounded ${
                filterType === 'preset'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Preset
            </button>
            <button
              onClick={() => setFilterType('one-off')}
              className={`px-3 py-1 text-xs rounded ${
                filterType === 'one-off'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              One-off
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBlocks.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            {searchTerm || filterType !== 'all' ? 'No blocks match your filters' : 'No blocks available'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBlocks.map(block => {
              if (!block || !block.id) {
                console.warn('Skipping invalid block:', block);
                return null;
              }
              return (
                <DraggableBlock
                  key={block.id}
                  block={block}
                  onEdit={onEditBlock || (() => {})}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}