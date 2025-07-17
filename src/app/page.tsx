'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CanvasBlock, Block, Prompt, PromptContent, PromptTextElement } from '@/types';
import { TextEditorCanvas } from '@/components/TextEditorCanvas';
import { AdvancedBlockLibrary } from '@/components/AdvancedBlockLibrary';
import { Sidebar } from '@/components/Sidebar';
import { extractVariables } from '@/lib/variables';

export default function Home() {
  // Core state
  const [promptContent, setPromptContent] = useState<PromptContent>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  
  // Dynamic widths state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarWidth');
      return saved ? parseInt(saved, 10) : 320;
    }
    return 320;
  });
  
  // Handle sidebar width changes
  const handleSidebarWidthChange = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth);
  }, []);

  // Block library state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  
  // Prompts state
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  // Load blocks from API
  const loadBlocks = useCallback(async () => {
    setIsLoadingBlocks(true);
    setBlocksError(null);
    
    try {
      const response = await fetch('/api/blocks');
      if (!response.ok) {
        throw new Error(`Failed to load blocks: ${response.statusText}`);
      }
      
      const blocksData = await response.json();
      setBlocks(blocksData);
    } catch (error) {
      console.error('Error loading blocks:', error);
      setBlocksError(error instanceof Error ? error.message : 'Failed to load blocks');
    } finally {
      setIsLoadingBlocks(false);
    }
  }, []);

  // Load prompts from API
  const loadPrompts = useCallback(async () => {
    setIsLoadingPrompts(true);
    
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error(`Failed to load prompts: ${response.statusText}`);
      }
      
      const promptsData = await response.json();
      setPrompts(promptsData);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setIsLoadingPrompts(false);
    }
  }, []);

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load blocks and prompts
        await Promise.all([loadBlocks(), loadPrompts()]);
        
        // Seed database if needed (only if empty)
        await fetch('/api/seed', { method: 'POST' });
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [loadBlocks, loadPrompts]);

  // Block CRUD operations
  const handleBlockCreate = useCallback(async (blockData: any) => {
    try {
      const response = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create block: ${response.statusText}`);
      }

      const newBlock = await response.json();
      setBlocks(prev => [newBlock, ...prev]);
    } catch (error) {
      console.error('Error creating block:', error);
      throw error;
    }
  }, []);

  const handleBlockUpdate = useCallback(async (id: number, updates: any) => {
    try {
      const response = await fetch(`/api/blocks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update block: ${response.statusText}`);
      }

      const updatedBlock = await response.json();
      setBlocks(prev => prev.map(block => 
        block.id === id ? updatedBlock : block
      ));

      // Update any blocks in prompt content that reference this preset block
      setPromptContent(prev => prev.map(element => {
        if (element.type === 'block' && element.blockId === id && element.blockType === 'preset') {
          return {
            ...element,
            originalBlock: updatedBlock,
          };
        }
        return element;
      }));
    } catch (error) {
      console.error('Error updating block:', error);
      throw error;
    }
  }, []);

  const handleBlockDelete = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/blocks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete block: ${response.statusText}`);
      }

      setBlocks(prev => prev.filter(block => block.id !== id));
      
      // Remove any blocks in prompt content that reference this preset block
      setPromptContent(prev => prev.filter(element => 
        !(element.type === 'block' && element.blockId === id && element.blockType === 'preset')
      ));
    } catch (error) {
      console.error('Error deleting block:', error);
      throw error;
    }
  }, []);

  // Prompt operations
  const handleSavePrompt = useCallback(async (title: string) => {
    if (promptContent.length === 0) {
      alert('Add some content to your prompt before saving.');
      return;
    }

    try {
      const { apiHelpers } = await import('@/lib/api');
      const response = await apiHelpers.savePromptFromContent(
        promptContent,
        variables,
        title,
        [], // tags
        []  // categories
      );

      if (response.error) {
        throw new Error(response.error);
      }

      setCurrentPrompt(response.data!);
      
      // Refresh prompts list
      loadPrompts();
      
      console.log('Prompt saved successfully:', response.data);
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [promptContent, variables, loadPrompts]);

  // Load prompt functionality
  const handlePromptLoad = useCallback(async (prompt: Prompt) => {
    setIsLoadingPrompt(true);
    
    try {
      const { apiHelpers } = await import('@/lib/api');
      const result = await apiHelpers.loadPromptAsContent(prompt.id);
      
      if (!result) {
        throw new Error('Failed to load prompt content');
      }
      
      setPromptContent(result.promptContent);
      setVariables(result.variables);
      setCurrentPrompt(result.prompt);
      
      console.log('Prompt loaded successfully:', result.prompt.title);
    } catch (error) {
      console.error('Error loading prompt:', error);
      alert('Failed to load prompt: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoadingPrompt(false);
    }
  }, []);

  // Delete prompt functionality
  const handlePromptDelete = useCallback(async (promptId: number) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete prompt: ${response.statusText}`);
      }

      // Refresh prompts list
      loadPrompts();
      
      // Clear current prompt if it was the deleted one
      if (currentPrompt?.id === promptId) {
        setCurrentPrompt(null);
      }
      
      console.log('Prompt deleted successfully');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Failed to delete prompt: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [currentPrompt, loadPrompts]);

  // Title change functionality
  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (!currentPrompt) {
      console.error('No current prompt to update title');
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${currentPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update prompt title: ${response.statusText}`);
      }

      const updatedPrompt = await response.json();
      setCurrentPrompt(updatedPrompt);
      
      // Refresh prompts list to show updated title
      loadPrompts();
      
      console.log('Prompt title updated successfully');
    } catch (error) {
      console.error('Error updating prompt title:', error);
      alert('Failed to update prompt title: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [currentPrompt, loadPrompts]);

  // Calculate all variables needed
  const allVariables = useMemo(() => {
    const variableSet = new Set<string>();
    promptContent.forEach(element => {
      if (element.type === 'text') {
        const textVariables = extractVariables(element.content);
        textVariables.forEach(variable => variableSet.add(variable));
      } else if (element.type === 'block') {
        const blockContent = element.isOverridden 
          ? element.overrideContent || ''
          : element.originalBlock?.content || '';
        const blockVariables = extractVariables(blockContent);
        blockVariables.forEach(variable => variableSet.add(variable));
      }
    });
    return Array.from(variableSet);
  }, [promptContent]);

  // Variable management
  const handleVariablesChange = useCallback((newVariables: Record<string, string>) => {
    setVariables(newVariables);
  }, []);

  const handleVariableChange = useCallback((variable: string, value: string) => {
    setVariables(prev => ({ ...prev, [variable]: value }));
  }, []);

  const handleShowPreviewToggle = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag events
  const handleDragStart = useCallback((event: any) => {
    const { active } = event;
    if (active.data.current?.type === 'library-block') {
      setActiveBlock(active.data.current.block);
    }
  }, []);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    setActiveBlock(null);
    
    if (over && active.data.current?.type === 'library-block') {
      const block = active.data.current.block;
      
      // Handle different drop target types
      if (over.id === 'text-editor-droppable') {
        // Dropped on main text editor area - add to end
        const newElement = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'block' as const,
          order: promptContent.length + 1,
          blockId: block.id,
          blockType: block.type,
          originalBlock: block,
          isOverridden: false,
          overrideContent: undefined,
        };
        
        setPromptContent(prev => [...prev, newElement].sort((a, b) => a.order - b.order));
      } else if (over.data.current?.type === 'drop-zone') {
        // Dropped on a specific drop zone
        const { afterElementId } = over.data.current;
        const sortedContent = [...promptContent].sort((a, b) => a.order - b.order);
        
        let newOrder: number;
        
        if (over.id === 'drop-zone-top') {
          // Insert at the beginning
          newOrder = sortedContent.length > 0 ? sortedContent[0].order - 1 : 1;
        } else if (afterElementId) {
          // Insert after specific element
          const afterIndex = sortedContent.findIndex(el => el.id === afterElementId);
          if (afterIndex !== -1 && afterIndex < sortedContent.length - 1) {
            // Insert between two elements
            const currentOrder = sortedContent[afterIndex].order;
            const nextOrder = sortedContent[afterIndex + 1].order;
            newOrder = (currentOrder + nextOrder) / 2;
          } else {
            // Insert after the last element or element not found
            newOrder = (sortedContent[sortedContent.length - 1]?.order || 0) + 1;
          }
        } else {
          // Default to end
          newOrder = (sortedContent[sortedContent.length - 1]?.order || 0) + 1;
        }
        
        const newElement = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'block' as const,
          order: newOrder,
          blockId: block.id,
          blockType: block.type,
          originalBlock: block,
          isOverridden: false,
          overrideContent: undefined,
        };
        
        setPromptContent(prev => [...prev, newElement].sort((a, b) => a.order - b.order));
      }
    }
  }, [promptContent]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 shadow-sm">
        <div 
          className="px-6 py-4 transition-all duration-300"
          style={{ 
            marginLeft: `${sidebarWidth}px`
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Visual Prompt Builder
              </h1>
              <p className="text-sm text-gray-400">
                Build, organize, and version your LLM prompts
              </p>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-3">
              {currentPrompt && (
                <div className="text-sm text-gray-400">
                  Current: <span className="font-medium text-white">{currentPrompt.title}</span>
                </div>
              )}
              
              <button
                onClick={() => {
                  const title = prompt('Enter prompt title:');
                  if (title) {
                    handleSavePrompt(title);
                  }
                }}
                disabled={promptContent.length === 0}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  promptContent.length > 0
                    ? 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                    : 'border-gray-600 bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Save Prompt
              </button>
              
              <button
                onClick={() => {
                  // TODO: Open prompt library modal
                  console.log('Open prompt library');
                }}
                className="px-4 py-2 text-sm border border-gray-600 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Load Prompt
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main 
        className="flex h-[calc(100vh-88px)] transition-all duration-300 min-h-0"
        style={{ 
          marginLeft: `${sidebarWidth}px`
        }}
      >
        {/* Canvas Area */}
        <TextEditorCanvas
          promptContent={promptContent}
          setPromptContent={setPromptContent}
          variables={variables}
          onVariablesChange={handleVariablesChange}
          showPreview={showPreview}
          onShowPreviewToggle={handleShowPreviewToggle}
          allVariables={allVariables}
          blocks={blocks}
          isLoading={isLoadingPrompt}
          currentPrompt={currentPrompt}
          onTitleChange={handleTitleChange}
        />

        {/* Block Library */}
        <AdvancedBlockLibrary
          blocks={blocks}
          isLoading={isLoadingBlocks}
          error={blocksError}
          onBlockCreate={handleBlockCreate}
          onBlockUpdate={handleBlockUpdate}
          onBlockDelete={handleBlockDelete}
          onRefresh={loadBlocks}
        />
      </main>

      {/* Sidebar */}
      <Sidebar
        variables={variables}
        allVariables={allVariables}
        onVariableChange={handleVariableChange}
        prompts={prompts}
        onPromptSelect={(prompt) => {
          console.log('Selected prompt:', prompt);
        }}
        onPromptLoad={handlePromptLoad}
        onPromptDelete={handlePromptDelete}
        onWidthChange={handleSidebarWidthChange}
      />

      {/* Status Bar */}
      <div 
        className="bg-gray-800 border-t border-gray-700 px-6 py-2 text-sm text-gray-400 transition-all duration-300"
        style={{ 
          marginLeft: `${sidebarWidth}px`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              {promptContent.length} element{promptContent.length !== 1 ? 's' : ''} in prompt
            </span>
            <span>•</span>
            <span>
              {promptContent.filter(el => el.type === 'block').length} block{promptContent.filter(el => el.type === 'block').length !== 1 ? 's' : ''}, {promptContent.filter(el => el.type === 'text').length} text
            </span>
            {Object.keys(variables).length > 0 && (
              <>
                <span>•</span>
                <span>
                  {Object.keys(variables).length} variable{Object.keys(variables).length !== 1 ? 's' : ''} set
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span>{blocks.length} blocks in library</span>
            {currentPrompt && (
              <>
                <span>•</span>
                <span>Saved as: {currentPrompt.title}</span>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
      
      <DragOverlay>
        {activeBlock && (
          <div className="border rounded-lg bg-gray-800 shadow-2xl border-blue-500 p-3 opacity-90 rotate-2 scale-105">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeBlock.type === 'preset' 
                  ? 'bg-blue-900/30 text-blue-300' 
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {activeBlock.type}
              </span>
              <h3 className="font-medium text-white text-sm">
                {activeBlock.title}
              </h3>
            </div>
            <div className="text-xs text-gray-400 mt-1 line-clamp-2">
              {activeBlock.content}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}