'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  PencilIcon, 
  TrashIcon, 
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { CanvasBlock } from '@/types';
import { extractVariables } from '@/lib/variables';

interface CanvasBlockComponentProps {
  block: CanvasBlock;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<CanvasBlock>) => void;
  onCancel: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export function CanvasBlockComponent({
  block,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onToggleEnabled,
  onRemove,
  onDuplicate,
}: CanvasBlockComponentProps) {
  const [editTitle, setEditTitle] = useState(block.title);
  const [editContent, setEditContent] = useState(block.content);
  const [editTags, setEditTags] = useState(block.tags.join(', '));
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `canvas-${block.canvasId}`,
    data: {
      type: 'canvas-block',
      block,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Focus on title input when editing starts
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  // Reset form when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditTitle(block.title);
      setEditContent(block.content);
      setEditTags(block.tags.join(', '));
    }
  }, [isEditing, block]);

  const handleSave = () => {
    const newTags = editTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    const newVariables = extractVariables(editContent);

    onSave({
      title: editTitle.trim(),
      content: editContent,
      tags: newTags,
      variables: newVariables,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const variableCount = extractVariables(block.content).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-gray-800 border rounded-lg shadow-sm transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-600' : 'border-gray-700 hover:border-gray-600'}
        ${!block.enabled ? 'opacity-50' : ''}
        ${isDragging ? 'shadow-lg' : ''}
      `}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Bars3Icon className="w-4 h-4 text-gray-500" />
      </div>

      <div className="pl-8 pr-4 py-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full text-lg font-medium bg-transparent text-gray-100 border-b border-gray-600 focus:border-blue-500 focus:outline-none pb-1"
                placeholder="Block title..."
              />
            ) : (
              <h3 className="text-lg font-medium text-gray-100 truncate">
                {block.title}
              </h3>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  className="p-1 text-green-400 hover:bg-green-900/20 rounded"
                  title="Save (Ctrl+Enter)"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                  }}
                  className="p-1 text-gray-300 hover:bg-gray-700 rounded"
                  title="Cancel (Esc)"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEnabled();
                  }}
                  className={`p-1 rounded transition-colors ${
                    block.enabled
                      ? 'text-green-400 hover:bg-green-900/20'
                      : 'text-gray-500 hover:bg-gray-700'
                  }`}
                  title={block.enabled ? 'Disable block' : 'Enable block'}
                >
                  {block.enabled ? (
                    <EyeIcon className="w-4 h-4" />
                  ) : (
                    <EyeSlashIcon className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1 text-blue-400 hover:bg-blue-900/20 rounded"
                  title="Edit block"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  className="p-1 text-gray-300 hover:bg-gray-700 rounded"
                  title="Duplicate block"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="p-1 text-red-400 hover:bg-red-900/20 rounded"
                  title="Remove block"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Block Type and Variable Count */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-1 text-xs rounded-full ${
            block.type === 'preset' 
              ? 'bg-blue-900/30 text-blue-300' 
              : 'bg-gray-700 text-gray-300'
          }`}>
            {block.type}
          </span>
          
          {variableCount > 0 && (
            <span className="px-2 py-1 text-xs bg-green-900/30 text-green-300 rounded-full">
              {variableCount} variable{variableCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Content
              </label>
              <textarea
                ref={contentTextareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-32 p-3 text-sm border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-400"
                placeholder="Enter block content with {{variable}} placeholders..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-2 text-sm border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                placeholder="tag1, tag2, tag3..."
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-200 whitespace-pre-wrap">
            {block.content}
          </div>
        )}

        {/* Tags */}
        {!isEditing && block.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {block.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Disabled Overlay */}
      {!block.enabled && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-80 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-gray-300 bg-gray-800 px-2 py-1 rounded border border-gray-600">
            Disabled
          </span>
        </div>
      )}
    </div>
  );
}