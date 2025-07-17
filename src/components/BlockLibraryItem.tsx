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

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
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
        group border rounded-lg bg-white shadow-sm transition-all duration-200
        ${isDragging ? 'shadow-lg cursor-grabbing' : 'cursor-grab hover:shadow-md'}
        ${isExpanded ? 'border-blue-200' : 'border-gray-200'}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1 min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="flex-shrink-0 p-0.5 mr-2 mt-0.5 text-gray-400 hover:text-gray-600 transition-colors"
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
                  className="w-full font-medium bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none pb-1"
                  placeholder="Block title..."
                  autoFocus
                />
              ) : (
                <h3 className="font-medium text-gray-900 truncate">
                  {block.title}
                </h3>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  className="p-1 text-green-600 hover:bg-green-50 rounded text-xs"
                  title="Save"
                >
                  ✓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded text-xs"
                  title="Cancel"
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
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <PencilIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                  title="Duplicate"
                >
                  <DocumentDuplicateIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Block Info */}
        <div className="flex items-center gap-2 mt-2 ml-6">
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            block.type === 'preset' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {block.type}
          </span>
          
          {block.variables.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              {block.variables.length} var{block.variables.length !== 1 ? 's' : ''}
            </span>
          )}

          {block.usage_count > 0 && (
            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
              Used {block.usage_count}×
            </span>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 ml-6 space-y-3 border-t pt-3">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-24 p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter block content with {{variable}} placeholders..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tag1, tag2, tag3..."
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Content Preview */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <div className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
                    {block.content}
                  </div>
                </div>

                {/* Variables */}
                {block.variables.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Variables
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {block.variables.map((variable, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded border"
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {block.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Categories
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {block.categories.map((category, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-500">
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