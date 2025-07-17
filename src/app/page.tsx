'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
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
  
  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320);

  // Block library state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);

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

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Seed database if needed
        await fetch('/api/seed', { method: 'POST' });
        
        // Load blocks
        await loadBlocks();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [loadBlocks]);

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

  // Prompt operations (basic - will be enhanced later)
  const handleSavePrompt = useCallback(async (title: string) => {
    if (promptContent.length === 0) {
      alert('Add some content to your prompt before saving.');
      return;
    }

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          blockComposition: promptContent, // TODO: Update API to handle new structure
          variables,
          tags: [], // TODO: Extract from blocks or allow user input
          categories: [], // TODO: Extract from blocks or allow user input
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save prompt: ${response.statusText}`);
      }

      const savedPrompt = await response.json();
      setCurrentPrompt(savedPrompt);
      
      // TODO: Add success notification
      console.log('Prompt saved successfully:', savedPrompt);
    } catch (error) {
      console.error('Error saving prompt:', error);
      // TODO: Add error notification
    }
  }, [promptContent, variables]);

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

  // Handle drag end for adding blocks to text editor
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    if (over && active.data.current?.type === 'library-block') {
      const block = active.data.current.block;
      
      // Add block to prompt content
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
    }
  }, [promptContent]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
        prompts={[]} // TODO: Connect to real prompts data
        onPromptSelect={(prompt) => {
          // TODO: Load prompt into canvas
          console.log('Selected prompt:', prompt);
        }}
        onPromptDelete={(promptId) => {
          // TODO: Delete prompt
          console.log('Delete prompt:', promptId);
        }}
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
    </DndContext>
  );
}