'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import { PromptTextElement } from '@/types';

interface TextEditorTextProps {
  element: PromptTextElement;
  isEditing: boolean;
  isFocused: boolean;
  onEdit: () => void;
  onChange?: (content: string) => void;
  onSave: (content: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onCreatePreset?: (content: string) => void;
}

export function TextEditorText({
  element,
  isEditing,
  isFocused,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
  onFocus,
  onBlur,
  onCreatePreset,
}: TextEditorTextProps) {
  const [editContent, setEditContent] = useState(element.content);
  const [isButtonClick, setIsButtonClick] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset edit content when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditContent(element.content);
    }
  }, [isEditing, element.content]);

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
    const newContent = e.target.value;
    setEditContent(newContent);
    
    // Update parent state immediately if onChange is provided
    if (onChange) {
      onChange(newContent);
    }
    
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

  const handleBlur = () => {
    // Auto-save when clicking away, but not if a button was clicked
    if (isEditing && !isButtonClick) {
      handleSave();
    }
    // Reset button click flag
    setIsButtonClick(false);
  };

  const handleButtonClick = (callback: () => void) => {
    setIsButtonClick(true);
    callback();
  };

  const isEmpty = !element.content.trim();

  return (
    <div 
      data-text-editor
      className={`relative group rounded-lg border-2 border-dashed transition-all ${
        isEmpty 
          ? 'border-gray-600 bg-gray-800/50' 
          : 'border-transparent bg-gray-800'
      } ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
    >
      {/* Action Bar */}
      <div className={`absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
        isEmpty ? 'opacity-100' : ''
      }`}>
        {!isEditing && (
          <>
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors shadow-sm"
              title="Edit text"
            >
              <PencilIcon className="w-3 h-3" />
            </button>

            {onCreatePreset && element.content.trim() && (
              <button
                onClick={() => onCreatePreset(element.content)}
                className="p-1 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded transition-colors shadow-sm"
                title="Create preset from this text"
              >
                <BookmarkIcon className="w-3 h-3" />
              </button>
            )}
            
            {onMoveUp && (
              <button
                onClick={onMoveUp}
                className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors shadow-sm"
                title="Move up"
              >
                <ChevronUpIcon className="w-3 h-3" />
              </button>
            )}
            
            {onMoveDown && (
              <button
                onClick={onMoveDown}
                className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors shadow-sm"
                title="Move down"
              >
                <ChevronDownIcon className="w-3 h-3" />
              </button>
            )}
            
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors shadow-sm"
              title="Delete text block"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </>
        )}
        
        {isEditing && (
          <>
            <button
              onClick={() => handleButtonClick(handleSave)}
              className="p-1 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors shadow-sm"
              title="Save (Ctrl+Enter)"
            >
              <CheckIcon className="w-3 h-3" />
            </button>
            
            <button
              onClick={() => handleButtonClick(onCancel)}
              className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors shadow-sm"
              title="Cancel (Esc)"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-8">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full bg-transparent text-gray-100 border-none outline-none resize-none placeholder-gray-500 text-sm leading-relaxed"
            placeholder="Type your text here... Use {{variable}} for dynamic content"
            style={{ minHeight: '60px' }}
          />
        ) : (
          <div 
            className={`text-sm leading-relaxed cursor-text ${
              isEmpty 
                ? 'text-gray-500 italic' 
                : 'text-gray-200'
            }`}
            onClick={onEdit}
          >
            {isEmpty ? (
              <div className="flex items-center gap-2">
                <PencilIcon className="w-4 h-4" />
                Click to add text...
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{element.content}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}