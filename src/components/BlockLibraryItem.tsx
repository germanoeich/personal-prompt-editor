'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { Block } from '@/types';

interface BlockLibraryItemProps {
  block: Block;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (updates: any) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BlockLibraryItem({
  block,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDuplicate,
  onDelete,
}: BlockLibraryItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(block.title);
  const [editContent, setEditContent] = useState(block.content);
  const [editTags, setEditTags] = useState(block.tags.join(', '));

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `block-${block.id}`,
    data: {
      type: 'library-block',
      block,
    },
  });

  const style = isDragging ? {
    opacity: 0.4,
  } : undefined;

  const handleSave = () => {
    const newTags = editTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onEdit({
      title: editTitle.trim(),
      content: editContent,
      tags: newTags,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(block.title);
    setEditContent(block.content);
    setEditTags(block.tags.join(', '));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group border rounded-lg bg-gray-800 shadow-sm transition-all duration-200
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab hover:shadow-md'}
        ${isExpanded ? 'border-blue-600' : 'border-gray-600'}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="p-3 relative">
        {/* Action Buttons - positioned absolutely */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-1 text-green-400 hover:bg-green-900/20 rounded text-xs"
              >
                ✓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="p-1 text-gray-300 hover:bg-gray-700 rounded text-xs"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 text-blue-400 hover:bg-blue-900/20 rounded"
              >
                <PencilIcon className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="p-1 text-gray-300 hover:bg-gray-700 rounded"
              >
                <DocumentDuplicateIcon className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 text-red-400 hover:bg-red-900/20 rounded"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
        
        {/* Header */}
        <div className="flex items-start pr-20"> {/* Add right padding to avoid button overlap */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="flex-shrink-0 p-0.5 mr-2 mt-0.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full font-medium bg-transparent text-white border-b border-gray-600 focus:border-blue-400 focus:outline-none pb-1"
                placeholder="Block title..."
                autoFocus
              />
            ) : (
              <h3 className="font-medium text-white truncate">
                {block.title}
              </h3>
            )}
          </div>
        </div>

        {/* Block Info */}
        <div className="flex items-center gap-2 mt-2 ml-6">
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            block.type === 'preset' 
              ? 'bg-blue-900/30 text-blue-300' 
              : 'bg-gray-700 text-gray-300'
          }`}>
            {block.type}
          </span>
          
          {block.variables.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-300 rounded-full">
              {block.variables.length} var{block.variables.length !== 1 ? 's' : ''}
            </span>
          )}

          {block.usage_count > 0 && (
            <span className="px-2 py-0.5 text-xs bg-purple-900/30 text-purple-300 rounded-full">
              Used {block.usage_count}×
            </span>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 ml-6 space-y-3 border-t border-gray-600 pt-3">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Content
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-24 p-2 text-xs border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter block content with {{variable}} placeholders..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full p-2 text-xs border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tag1, tag2, tag3..."
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Content Preview */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Content
                  </label>
                  <div className="text-xs text-gray-200 whitespace-pre-wrap bg-gray-800 p-2 rounded border border-gray-600 max-h-32 overflow-y-auto">
                    {block.content}
                  </div>
                </div>

                {/* Variables */}
                {block.variables.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Variables
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {block.variables.map((variable, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-yellow-900/30 text-yellow-300 rounded border border-yellow-500/30"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {block.tags.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {block.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {block.categories.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Categories
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {block.categories.map((category, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-blue-900/30 text-blue-300 rounded border border-blue-500/30"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-400">
                  Created: {new Date(block.created_at).toLocaleDateString()}
                  {block.updated_at !== block.created_at && (
                    <> • Updated: {new Date(block.updated_at).toLocaleDateString()}</>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}