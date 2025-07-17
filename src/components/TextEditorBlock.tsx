'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  BookmarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { PromptBlockElement } from '@/types';
import { extractVariables } from '@/lib/variables';

interface TextEditorBlockProps {
  element: PromptBlockElement;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (overrideContent: string) => void;
  onCancel: () => void;
  onReset: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function TextEditorBlock({
  element,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onReset,
  onDelete,
  onMoveUp,
  onMoveDown,
}: TextEditorBlockProps) {
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset edit content when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditContent(element.isOverridden ? element.overrideContent || '' : element.originalBlock?.content || '');
    }
  }, [isEditing, element.isOverridden, element.overrideContent, element.originalBlock?.content]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleSave = () => {
    onSave(editContent);
  };

  const displayContent = element.isOverridden ? element.overrideContent : element.originalBlock?.content;
  const variables = extractVariables(displayContent || '');

  return (
    <div className={`relative group rounded-lg border transition-all ${
      element.isOverridden 
        ? 'border-orange-500 bg-orange-900/10' 
        : 'border-blue-500 bg-blue-900/10'
    }`}>
      {/* Action Bar */}
      <div className="absolute top-16 right-2 flex items-center gap-1 z-10">
        {!isEditing && (
          <>
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors shadow-sm"
            >
              <PencilIcon className="w-3 h-3" />
            </button>
            
            {element.isOverridden && (
              <button
                onClick={onReset}
                className="p-1 text-gray-400 hover:text-orange-400 hover:bg-gray-700 rounded transition-colors shadow-sm"
              >
                <ArrowPathIcon className="w-3 h-3" />
              </button>
            )}
            
            {onMoveUp && (
              <button
                onClick={onMoveUp}
                className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors shadow-sm"
              >
                <ChevronUpIcon className="w-3 h-3" />
              </button>
            )}
            
            {onMoveDown && (
              <button
                onClick={onMoveDown}
                className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors shadow-sm"
              >
                <ChevronDownIcon className="w-3 h-3" />
              </button>
            )}
            
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors shadow-sm"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </>
        )}
        
        {isEditing && (
          <>
            <button
              onClick={handleSave}
              className="p-1 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors shadow-sm"
            >
              <CheckIcon className="w-3 h-3" />
            </button>
            
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors shadow-sm"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Header */}
      <div className={`px-4 py-2 border-b ${
        element.isOverridden 
          ? 'border-orange-500/30 bg-orange-900/20' 
          : 'border-blue-500/30 bg-blue-900/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white">
              {element.originalBlock?.title || 'Block'}
            </h3>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              element.blockType === 'preset' 
                ? 'bg-blue-900/30 text-blue-300' 
                : 'bg-gray-700 text-gray-300'
            }`}>
              {element.blockType}
            </span>
            {element.isOverridden && (
              <span className="px-2 py-0.5 text-xs bg-orange-900/30 text-orange-300 rounded-full">
                Override
              </span>
            )}
          </div>
          
          {/* Variables */}
          {variables.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Variables:</span>
              <div className="flex gap-1">
                {variables.slice(0, 3).map((variable, index) => (
                  <span
                    key={index}
                    className="px-1.5 py-0.5 text-xs bg-green-900/30 text-green-300 rounded"
                  >
                    {variable}
                  </span>
                ))}
                {variables.length > 3 && (
                  <span className="text-xs text-gray-400">+{variables.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-gray-800 text-gray-100 border border-gray-600 rounded-md p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-relaxed"
              placeholder="Enter your override content... Use {{originalText}} to include the original block content"
              style={{ minHeight: '120px' }}
            />
            
            <div className="text-xs text-gray-400 space-y-1">
              <p>• Use <code className="bg-gray-700 px-1 rounded">{'{{originalText}}'}</code> to include the original block content</p>
              <p>• Use <code className="bg-gray-700 px-1 rounded">{'{{variable}}'}</code> for dynamic content</p>
              <p>• Save with <kbd className="bg-gray-700 px-1 rounded">Ctrl+Enter</kbd> or Cancel with <kbd className="bg-gray-700 px-1 rounded">Esc</kbd></p>
            </div>
          </div>
        ) : (
          <div 
            className="text-sm leading-relaxed text-gray-200 cursor-text whitespace-pre-wrap"
            onClick={onEdit}
          >
            {displayContent || 'Click to edit...'}
          </div>
        )}
      </div>

      {/* Override Indicator */}
      {element.isOverridden && !isEditing && (
        <div className="px-4 py-2 border-t border-orange-500/30 bg-orange-900/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-orange-300">
              This block has been overridden
            </span>
            <button
              onClick={onReset}
              className="text-xs text-orange-400 hover:text-orange-300 underline"
            >
              Reset to original
            </button>
          </div>
        </div>
      )}
    </div>
  );
}