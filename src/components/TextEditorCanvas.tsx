'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Block,
  Prompt,
  PromptTab
} from '@/types';
import { extractVariables, replaceVariables } from '@/lib/variables';
import { generateElementId } from '@/lib/utils';
import { TextEditorBlock } from './TextEditorBlock';
import { TextEditorText } from './TextEditorText';
import { DropZone } from './DropZone';
import { CreateBlockModal } from './CreateBlockModal';

interface TextEditorCanvasProps {
  // Tab props
  tabs: PromptTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  
  // Content props (for active tab)
  promptContent: PromptContent;
  setPromptContent: React.Dispatch<React.SetStateAction<PromptContent>>;
  variables: Record<string, string>;
  onVariablesChange: (variables: Record<string, string>) => void;
  allVariables: string[];
  blocks: Block[];
  isLoading?: boolean;
  currentPrompt?: Prompt | null;
  onTitleChange?: (title: string) => void;
  onBlockCreate?: (blockData: any) => Promise<void>;
  onSavePrompt?: (title: string) => Promise<void>;
  availableTags?: string[];
  availableCategories?: string[];
}

export function TextEditorCanvas({
  // Tab props
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  
  // Content props
  promptContent,
  setPromptContent,
  variables,
  onVariablesChange,
  allVariables,
  blocks,
  isLoading = false,
  currentPrompt,
  onTitleChange,
  onBlockCreate,
  onSavePrompt,
  availableTags = [],
  availableCategories = [],
}: TextEditorCanvasProps) {
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalPrefill, setCreateModalPrefill] = useState<any>(null);
  const [convertingElementId, setConvertingElementId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync title value with active tab
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      setTitleValue(activeTab.title);
    } else {
      setTitleValue('');
    }
  }, [activeTabId, tabs]);

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
      id: generateElementId('text'),
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
      id: generateElementId('block'),
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

  // Save prompt
  const savePrompt = useCallback(async () => {
    if (isSaving || !onSavePrompt) return;
    
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const activeTab = tabs.find(t => t.id === activeTabId);
      const title = activeTab?.title || `Prompt - ${new Date().toLocaleString()}`;
      
      await onSavePrompt(title);
      
      setSaveSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSavePrompt, tabs, activeTabId]);

  // Handle block drop from library
  const handleBlockDrop = useCallback((block: Block, afterElementId?: string) => {
    addBlockElement(block, afterElementId);
  }, [addBlockElement]);

  // Create preset handlers
  const handleCreatePresetFromText = useCallback((content: string, elementId: string) => {
    setCreateModalPrefill({
      title: 'Text Block',
      content,
      tags: [],
      categories: [],
    });
    setConvertingElementId(elementId);
    setIsCreateModalOpen(true);
  }, []);

  const handleCreatePresetFromBlock = useCallback((content: string, title: string) => {
    setCreateModalPrefill({
      title,
      content,
      tags: [],
      categories: [],
    });
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateBlock = useCallback(async (blockData: any) => {
    if (onBlockCreate) {
      try {
        // Create the new block
        const response = await onBlockCreate(blockData);
        setIsCreateModalOpen(false);
        setCreateModalPrefill(null);
        
        // If we're converting a text element to a preset, replace it
        if (convertingElementId && response) {
          // Find the position of the element being converted
          const elementIndex = promptContent.findIndex(el => el.id === convertingElementId);
          if (elementIndex !== -1) {
            const elementOrder = promptContent[elementIndex].order;
            
            // Remove the old text element
            const updatedContent = promptContent.filter(el => el.id !== convertingElementId);
            
            // Add the new block element at the same position
            const newBlockElement = {
              id: generateElementId('block'),
              type: 'block' as const,
              order: elementOrder,
              blockId: response.id,
              blockType: 'preset' as const,
              originalBlock: response,
              isOverridden: false,
              overrideContent: undefined,
            };
            
            setPromptContent([...updatedContent, newBlockElement].sort((a, b) => a.order - b.order));
          }
          setConvertingElementId(null);
        }
      } catch (error) {
        console.error('Failed to create block:', error);
      }
    }
  }, [onBlockCreate, convertingElementId, promptContent, setPromptContent]);

  // Title editing handlers
  const handleTitleClick = useCallback(() => {
    setIsEditingTitle(true);
  }, []);

  const handleTitleSave = useCallback(() => {
    if (onTitleChange && titleValue.trim()) {
      onTitleChange(titleValue.trim());
    }
    setIsEditingTitle(false);
  }, [onTitleChange, titleValue]);

  const handleTitleCancel = useCallback(() => {
    setTitleValue(currentPrompt?.title || '');
    setIsEditingTitle(false);
  }, [currentPrompt]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  const sortedContent = useMemo(() => 
    [...promptContent].sort((a, b) => a.order - b.order),
    [promptContent]
  );

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-white">Loading prompt...</div>
          </div>
        </div>
      )}
      
      {/* Tab Bar */}
      <div className="flex bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center min-w-0 border-r border-gray-700 ${
                tab.id === activeTabId ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-750'
              }`}
            >
              <button
                onClick={() => onTabSelect(tab.id)}
                className={`px-4 py-2 text-sm flex items-center gap-2 ${
                  tab.id === activeTabId ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="truncate max-w-[200px]">
                  {tab.isDirty && '• '}
                  {tab.title}
                </span>
              </button>
              <button
                onClick={() => onTabClose(tab.id)}
                className="p-1 mx-1 text-gray-400 hover:text-gray-300 hover:bg-gray-600 rounded"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={onNewTab}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-750 flex items-center gap-2 border-r border-gray-700"
          >
            <PlusIcon className="w-4 h-4" />
            New
          </button>
        </div>
      </div>
      
      {/* Header */}
      {activeTabId && (
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 flex-shrink-0 group">
          <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                className="text-xl font-semibold text-white bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                placeholder="Enter prompt title..."
              />
              <button
                onClick={handleTitleSave}
                className="p-1 text-green-400 hover:text-green-300 transition-colors"
                title="Save title"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleTitleCancel}
                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Cancel editing"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white">
                {tabs.find(t => t.id === activeTabId)?.title || 'Untitled Prompt'}
              </h2>
              <button
                onClick={handleTitleClick}
                className="p-1 text-gray-400 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                title="Edit title"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={savePrompt}
            disabled={promptContent.length === 0 || isSaving}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              promptContent.length > 0 && !isSaving
                ? saveSuccess
                  ? 'border-green-500 bg-green-600 text-white'
                  : saveError
                  ? 'border-red-500 bg-red-600 text-white'
                  : 'border-purple-500 bg-purple-600 text-white hover:bg-purple-700'
                : 'border-gray-600 bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : saveError ? 'Error' : 'Save'}
          </button>
        </div>
      </div>
      )}

      {/* Save Error Message */}
      {saveError && (
        <div className="p-3 bg-red-900/20 border-b border-red-500/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <XMarkIcon className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">Save failed: {saveError}</span>
            <button
              onClick={() => setSaveError(null)}
              className="ml-auto text-red-400 hover:text-red-300 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
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
        {!activeTabId ? (
          <div className="flex flex-col items-center justify-center text-gray-400 min-h-96">
            <div className="text-5xl mb-4">📝</div>
            <div className="text-xl font-medium mb-2">No prompt open</div>
            <div className="text-sm mb-6">Open a prompt from the sidebar or create a new one</div>
            <button
              onClick={onNewTab}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create New Prompt
            </button>
          </div>
        ) : sortedContent.length === 0 ? (
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
                    onCreatePreset={(content) => handleCreatePresetFromText(content, element.id)}
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
                    onCreatePreset={handleCreatePresetFromBlock}
                  />
                )}

                {/* Add Button */}
                {!isDragging && (
                  <div className="flex items-center justify-center py-1 my-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Create Block Modal */}
      {isCreateModalOpen && (
        <CreateBlockModal
          onClose={() => {
            setIsCreateModalOpen(false);
            setCreateModalPrefill(null);
            setConvertingElementId(null);
          }}
          onCreate={handleCreateBlock}
          availableTags={availableTags}
          availableCategories={availableCategories}
          prefillData={createModalPrefill}
        />
      )}
    </div>
  );
}