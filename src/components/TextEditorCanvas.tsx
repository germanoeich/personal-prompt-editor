'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { 
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { 
  PromptContent, 
  PromptElement, 
  PromptTextElement, 
  PromptBlockElement, 
  Block 
} from '@/types';
import { extractVariables, replaceVariables } from '@/lib/variables';
import { TextEditorBlock } from './TextEditorBlock';
import { TextEditorText } from './TextEditorText';
import { DropZone } from './DropZone';

interface TextEditorCanvasProps {
  promptContent: PromptContent;
  setPromptContent: React.Dispatch<React.SetStateAction<PromptContent>>;
  variables: Record<string, string>;
  onVariablesChange: (variables: Record<string, string>) => void;
  showPreview: boolean;
  onShowPreviewToggle: () => void;
  allVariables: string[];
  blocks: Block[];
}

export function TextEditorCanvas({
  promptContent,
  setPromptContent,
  variables,
  onVariablesChange,
  showPreview,
  onShowPreviewToggle,
  allVariables,
  blocks,
}: TextEditorCanvasProps) {
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Droppable setup for text editor
  const { setNodeRef, isOver } = useDroppable({
    id: 'text-editor-droppable',
  });

  // Monitor drag events to show/hide drop zones
  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  });

  // Generate next order number
  const getNextOrder = useCallback(() => {
    return Math.max(...promptContent.map(el => el.order), 0) + 1;
  }, [promptContent]);

  // Add new text element
  const addTextElement = useCallback((afterElementId?: string) => {
    const sortedContent = [...promptContent].sort((a, b) => a.order - b.order);
    let newOrder: number;
    
    if (afterElementId) {
      const afterIndex = sortedContent.findIndex(el => el.id === afterElementId);
      if (afterIndex !== -1 && afterIndex < sortedContent.length - 1) {
        // Insert between two elements
        const currentOrder = sortedContent[afterIndex].order;
        const nextOrder = sortedContent[afterIndex + 1].order;
        newOrder = (currentOrder + nextOrder) / 2;
      } else {
        // Insert after the last element or element not found
        newOrder = getNextOrder();
      }
    } else {
      // Add to end
      newOrder = getNextOrder();
    }

    const newElement: PromptTextElement = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      order: newOrder,
      content: '',
    };

    setPromptContent(prev => [...prev, newElement].sort((a, b) => a.order - b.order));
    setEditingElementId(newElement.id);
    setFocusedElementId(newElement.id);
  }, [promptContent, getNextOrder, setPromptContent]);

  // Add block element
  const addBlockElement = useCallback((block: Block, afterElementId?: string) => {
    const sortedContent = [...promptContent].sort((a, b) => a.order - b.order);
    let newOrder: number;
    
    if (afterElementId) {
      const afterIndex = sortedContent.findIndex(el => el.id === afterElementId);
      if (afterIndex !== -1 && afterIndex < sortedContent.length - 1) {
        // Insert between two elements
        const currentOrder = sortedContent[afterIndex].order;
        const nextOrder = sortedContent[afterIndex + 1].order;
        newOrder = (currentOrder + nextOrder) / 2;
      } else {
        // Insert after the last element or element not found
        newOrder = getNextOrder();
      }
    } else {
      // Add to end
      newOrder = getNextOrder();
    }

    const newElement: PromptBlockElement = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'block',
      order: newOrder,
      blockId: block.id,
      blockType: block.type,
      originalBlock: block,
      isOverridden: false,
      overrideContent: undefined,
    };

    setPromptContent(prev => [...prev, newElement].sort((a, b) => a.order - b.order));
  }, [promptContent, getNextOrder, setPromptContent]);

  // Update element
  const updateElement = useCallback((elementId: string, updates: any) => {
    setPromptContent(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  }, [setPromptContent]);

  // Delete element
  const deleteElement = useCallback((elementId: string) => {
    setPromptContent(prev => prev.filter(el => el.id !== elementId));
  }, [setPromptContent]);

  // Move element up/down
  const moveElement = useCallback((elementId: string, direction: 'up' | 'down') => {
    setPromptContent(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const currentIndex = sorted.findIndex(el => el.id === elementId);
      if (currentIndex === -1) return prev;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= sorted.length) return prev;

      // Swap orders
      const currentElement = sorted[currentIndex];
      const targetElement = sorted[newIndex];
      const tempOrder = currentElement.order;
      currentElement.order = targetElement.order;
      targetElement.order = tempOrder;

      return sorted;
    });
  }, [setPromptContent]);

  // Generate preview content
  const previewContent = useMemo(() => {
    const sortedContent = [...promptContent].sort((a, b) => a.order - b.order);
    
    return sortedContent.map(element => {
      if (element.type === 'text') {
        return replaceVariables(element.content, variables);
      } else if (element.type === 'block') {
        const blockContent = element.isOverridden 
          ? element.overrideContent || ''
          : element.originalBlock?.content || '';
        
        // Handle {{originalText}} replacement in overrides
        let finalContent = blockContent;
        if (element.isOverridden && element.overrideContent?.includes('{{originalText}}')) {
          finalContent = element.overrideContent.replace(
            /\{\{originalText\}\}/g, 
            element.originalBlock?.content || ''
          );
        }
        
        return replaceVariables(finalContent, variables);
      }
      return '';
    }).join('\n\n');
  }, [promptContent, variables]);

  // Generate final content for copying
  const finalContent = useMemo(() => {
    const sortedContent = [...promptContent].sort((a, b) => a.order - b.order);
    
    return sortedContent.map(element => {
      if (element.type === 'text') {
        return replaceVariables(element.content, variables);
      } else if (element.type === 'block') {
        const blockContent = element.isOverridden 
          ? element.overrideContent || ''
          : element.originalBlock?.content || '';
        
        // Handle {{originalText}} replacement in overrides
        let finalContent = blockContent;
        if (element.isOverridden && element.overrideContent?.includes('{{originalText}}')) {
          finalContent = element.overrideContent.replace(
            /\{\{originalText\}\}/g, 
            element.originalBlock?.content || ''
          );
        }
        
        return replaceVariables(finalContent, variables);
      }
      return '';
    }).filter(content => content.trim().length > 0).join('\n\n');
  }, [promptContent, variables]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finalContent);
      // TODO: Add success notification
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // TODO: Add error notification
    }
  }, [finalContent]);

  // Handle block drop from library
  const handleBlockDrop = useCallback((block: Block, afterElementId?: string) => {
    addBlockElement(block, afterElementId);
  }, [addBlockElement]);


  const sortedContent = useMemo(() => 
    [...promptContent].sort((a, b) => a.order - b.order),
    [promptContent]
  );

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 flex-shrink-0">
        <h2 className="text-xl font-semibold text-white">Prompt Builder</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onShowPreviewToggle}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              showPreview
                ? 'border-green-500 bg-green-600 text-white hover:bg-green-700'
                : 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          
          <button
            onClick={copyToClipboard}
            disabled={promptContent.length === 0}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              promptContent.length > 0
                ? 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                : 'border-gray-600 bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Copy Prompt
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <div className="p-4 border-b border-gray-700 bg-gray-800 flex-shrink-0">
          <h3 className="text-sm font-medium text-blue-300 mb-2">Preview</h3>
          <div className="text-sm text-gray-200 whitespace-pre-wrap bg-gray-900 p-3 rounded border border-gray-600 max-h-40 overflow-y-auto">
            {previewContent || 'Add content to see preview...'}
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div 
        ref={setNodeRef}
        className={`flex-1 p-4 bg-gray-900 overflow-y-auto min-h-0 transition-colors ${
          isOver ? 'bg-blue-900/20 border-blue-500/50' : ''
        }`}
      >
        {sortedContent.length === 0 ? (
          <div className={`flex flex-col items-center justify-center text-gray-400 min-h-96 transition-all ${
            isOver ? 'text-blue-300' : ''
          }`}>
            <div className="text-4xl mb-4">✍️</div>
            <div className="text-lg font-medium mb-2">
              {isOver ? 'Drop block here to add it' : 'Start building your prompt'}
            </div>
            <div className="text-sm mb-4">
              {isOver ? 'Release to add the block' : 'Add text blocks or drag preset blocks from the library'}
            </div>
            {!isOver && (
              <button
                onClick={() => addTextElement()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Text Block
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Top drop zone */}
            <DropZone 
              id="drop-zone-top" 
              label="Drop block at the beginning"
            />
            
            {sortedContent.map((element, index) => (
              <div key={element.id} className="group relative">
                {element.type === 'text' ? (
                  <TextEditorText
                    element={element}
                    isEditing={editingElementId === element.id}
                    isFocused={focusedElementId === element.id}
                    onEdit={() => setEditingElementId(element.id)}
                    onSave={(content) => {
                      updateElement(element.id, { content });
                      setEditingElementId(null);
                    }}
                    onCancel={() => setEditingElementId(null)}
                    onDelete={() => deleteElement(element.id)}
                    onMoveUp={index > 0 ? () => moveElement(element.id, 'up') : undefined}
                    onMoveDown={index < sortedContent.length - 1 ? () => moveElement(element.id, 'down') : undefined}
                    onFocus={() => setFocusedElementId(element.id)}
                    onBlur={() => setFocusedElementId(null)}
                  />
                ) : (
                  <TextEditorBlock
                    element={element}
                    isEditing={editingElementId === element.id}
                    onEdit={() => setEditingElementId(element.id)}
                    onSave={(overrideContent) => {
                      updateElement(element.id, { 
                        isOverridden: true, 
                        overrideContent 
                      });
                      setEditingElementId(null);
                    }}
                    onCancel={() => setEditingElementId(null)}
                    onReset={() => {
                      updateElement(element.id, { 
                        isOverridden: false, 
                        overrideContent: undefined 
                      });
                    }}
                    onDelete={() => deleteElement(element.id)}
                    onMoveUp={index > 0 ? () => moveElement(element.id, 'up') : undefined}
                    onMoveDown={index < sortedContent.length - 1 ? () => moveElement(element.id, 'down') : undefined}
                  />
                )}

                {/* Add Button */}
                {!isDragging && (
                  <div className="flex items-center justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => addTextElement(element.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors"
                    >
                      <PlusIcon className="w-3 h-3" />
                      Add Text
                    </button>
                  </div>
                )}

                {/* Drop zone after each element - positioned between blocks */}
                <DropZone 
                  id={`drop-zone-after-${element.id}`} 
                  afterElementId={element.id}
                  label={`Drop block after ${element.type === 'text' ? 'text' : element.originalBlock?.title || 'block'}`}
                />
              </div>
            ))}

            {/* Final Add Button */}
            <div className="flex items-center justify-center py-2">
              <button
                onClick={() => addTextElement()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Text Block
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}