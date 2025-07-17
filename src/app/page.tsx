'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CanvasBlock, Block, Prompt } from '@/types';
import { AdvancedCanvas } from '@/components/AdvancedCanvas';
import { AdvancedBlockLibrary } from '@/components/AdvancedBlockLibrary';
import { VariablesPanel } from '@/components/VariablesPanel';
import { extractVariables } from '@/lib/variables';

export default function Home() {
  // Core state
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  
  // Variables panel state
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);
  const [variablesPanelWidth, setVariablesPanelWidth] = useState(300);

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

      // Update any canvas blocks that reference this preset block
      setCanvasBlocks(prev => prev.map(canvasBlock => {
        if (canvasBlock.id === id && canvasBlock.type === 'preset') {
          return {
            ...canvasBlock,
            ...updatedBlock,
            // Preserve canvas-specific properties
            enabled: canvasBlock.enabled,
            canvasId: canvasBlock.canvasId,
          };
        }
        return canvasBlock;
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
      
      // Remove any canvas blocks that reference this preset block
      setCanvasBlocks(prev => prev.filter(canvasBlock => 
        !(canvasBlock.id === id && canvasBlock.type === 'preset')
      ));
    } catch (error) {
      console.error('Error deleting block:', error);
      throw error;
    }
  }, []);

  // Prompt operations (basic - will be enhanced later)
  const handleSavePrompt = useCallback(async (title: string) => {
    if (canvasBlocks.length === 0) {
      alert('Add some blocks to your prompt before saving.');
      return;
    }

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          blockComposition: canvasBlocks,
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
  }, [canvasBlocks, variables]);

  // Calculate all variables needed
  const allVariables = useMemo(() => {
    const variableSet = new Set<string>();
    canvasBlocks
      .filter(block => block.enabled)
      .forEach(block => {
        const blockVariables = extractVariables(block.content);
        blockVariables.forEach(variable => variableSet.add(variable));
      });
    return Array.from(variableSet);
  }, [canvasBlocks]);

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

  const handleVariablesPanelToggle = useCallback(() => {
    setIsVariablesPanelOpen(prev => !prev);
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

  // Drag and drop handlers from AdvancedCanvas
  const [dragHandlers, setDragHandlers] = useState<{
    onDragStart: (event: any) => void;
    onDragOver: (event: any) => void;
    onDragEnd: (event: any) => void;
  } | null>(null);

  const handleDragHandlersReady = useCallback((handlers: {
    onDragStart: (event: any) => void;
    onDragOver: (event: any) => void;
    onDragEnd: (event: any) => void;
  }) => {
    setDragHandlers(handlers);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={dragHandlers?.onDragStart}
      onDragOver={dragHandlers?.onDragOver}
      onDragEnd={dragHandlers?.onDragEnd}
    >
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 shadow-sm">
        <div 
          className="px-6 py-4 transition-all duration-200"
          style={{ 
            marginLeft: isVariablesPanelOpen ? `${variablesPanelWidth}px` : '0px'
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
                disabled={canvasBlocks.length === 0}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  canvasBlocks.length > 0
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
        className="flex h-[calc(100vh-88px)] transition-all duration-200"
        style={{ 
          marginLeft: isVariablesPanelOpen ? `${variablesPanelWidth}px` : '0px'
        }}
      >
        {/* Canvas Area */}
        <AdvancedCanvas
          canvasBlocks={canvasBlocks}
          setCanvasBlocks={setCanvasBlocks}
          variables={variables}
          onVariablesChange={handleVariablesChange}
          showPreview={showPreview}
          onShowPreviewToggle={handleShowPreviewToggle}
          allVariables={allVariables}
          onVariablesPanelToggle={handleVariablesPanelToggle}
          isVariablesPanelOpen={isVariablesPanelOpen}
          onDragHandlersReady={handleDragHandlersReady}
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

      {/* Variables Panel */}
      <VariablesPanel
        variables={variables}
        allVariables={allVariables}
        onVariableChange={handleVariableChange}
        isOpen={isVariablesPanelOpen}
        onToggle={handleVariablesPanelToggle}
        width={variablesPanelWidth}
        onWidthChange={setVariablesPanelWidth}
      />

      {/* Status Bar */}
      <div 
        className="bg-gray-800 border-t border-gray-700 px-6 py-2 text-sm text-gray-400 transition-all duration-200"
        style={{ 
          marginLeft: isVariablesPanelOpen ? `${variablesPanelWidth}px` : '0px'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              {canvasBlocks.length} block{canvasBlocks.length !== 1 ? 's' : ''} in canvas
            </span>
            <span>•</span>
            <span>
              {canvasBlocks.filter(b => b.enabled).length} enabled
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