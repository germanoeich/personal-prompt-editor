'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CanvasBlock, Block } from '@/types';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { CanvasBlockComponent } from './CanvasBlockComponent';
import { BlockLibraryItem } from './BlockLibraryItem';
import { extractVariables, replaceVariables } from '@/lib/variables';

interface AdvancedCanvasProps {
  canvasBlocks: CanvasBlock[];
  setCanvasBlocks: React.Dispatch<React.SetStateAction<CanvasBlock[]>>;
  variables: Record<string, string>;
  onVariablesChange: (variables: Record<string, string>) => void;
  showPreview: boolean;
  onShowPreviewToggle: () => void;
  allVariables: string[];
  onVariablesPanelToggle: () => void;
  isVariablesPanelOpen: boolean;
  onDragHandlersReady?: (handlers: {
    onDragStart: (event: any) => void;
    onDragOver: (event: any) => void;
    onDragEnd: (event: any) => void;
  }) => void;
}

export function AdvancedCanvas({
  canvasBlocks,
  setCanvasBlocks,
  variables,
  onVariablesChange,
  showPreview,
  onShowPreviewToggle,
  allVariables,
  onVariablesPanelToggle,
  isVariablesPanelOpen,
  onDragHandlersReady,
}: AdvancedCanvasProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // Drag and drop logic
  const addBlockToCanvas = useCallback((block: Block) => {
    const canvasBlock: CanvasBlock = {
      ...block,
      enabled: true,
      canvasId: `canvas-${block.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setCanvasBlocks(prev => [...prev, canvasBlock]);
  }, [setCanvasBlocks]);

  const { dragState, handlers, actions } = useDragAndDrop({
    canvasBlocks,
    setCanvasBlocks,
    onBlockAdd: addBlockToCanvas,
  });

  // Pass drag handlers to parent (only when handlers change)
  useEffect(() => {
    if (onDragHandlersReady) {
      onDragHandlersReady(handlers);
    }
  }, [handlers, onDragHandlersReady]);

  // Droppable setup for canvas
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
  });


  // Generate preview content
  const previewContent = useMemo(() => {
    const enabledBlocks = canvasBlocks.filter(block => block.enabled);
    if (enabledBlocks.length === 0) return '';

    const content = enabledBlocks
      .map(block => block.content)
      .join('\n\n');

    return replaceVariables(content, variables);
  }, [canvasBlocks, variables]);

  // Generate final prompt content
  const finalContent = useMemo(() => {
    const enabledBlocks = canvasBlocks.filter(block => block.enabled);
    if (enabledBlocks.length === 0) return '';

    return enabledBlocks
      .map(block => replaceVariables(block.content, variables))
      .join('\n\n');
  }, [canvasBlocks, variables]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finalContent);
      // TODO: Add toast notification
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // TODO: Add error notification
    }
  }, [finalContent]);


  // Block action handlers
  const handleBlockSelect = useCallback((canvasId: string) => {
    setSelectedBlockId(canvasId === selectedBlockId ? null : canvasId);
  }, [selectedBlockId]);

  const handleBlockEdit = useCallback((canvasId: string) => {
    setEditingBlockId(canvasId);
  }, []);

  const handleBlockSave = useCallback((canvasId: string, updates: Partial<CanvasBlock>) => {
    actions.updateBlockInCanvas(canvasId, updates);
    setEditingBlockId(null);
  }, [actions]);

  const handleBlockCancel = useCallback(() => {
    setEditingBlockId(null);
  }, []);

  const itemIds = useMemo(() => 
    canvasBlocks.map(block => `canvas-${block.canvasId}`),
    [canvasBlocks]
  );

  return (
    <div className="flex-1 flex flex-col">
        {/* Canvas Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <h2 className="text-xl font-semibold text-white">Prompt Builder</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onVariablesPanelToggle}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                isVariablesPanelOpen
                  ? 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                  : allVariables.length > 0
                  ? 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                  : 'border-gray-600 bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              disabled={allVariables.length === 0}
            >
              Variables ({allVariables.length})
            </button>
            
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
              disabled={canvasBlocks.filter(b => b.enabled).length === 0}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                canvasBlocks.filter(b => b.enabled).length > 0
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
          <div className="p-4 border-b border-gray-700 bg-gray-800">
            <h3 className="text-sm font-medium text-blue-300 mb-2">Preview</h3>
            <div className="text-sm text-gray-200 whitespace-pre-wrap bg-gray-900 p-3 rounded border border-gray-600 max-h-40 overflow-y-auto">
              {previewContent || 'Add blocks to see preview...'}
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 p-4 bg-gray-900">
          <div
            ref={setNodeRef}
            className={`min-h-96 border-2 border-dashed rounded-lg transition-colors ${
              isOver && dragState.activeBlock
                ? 'border-blue-400 bg-blue-900/50'
                : 'border-gray-600 bg-gray-800'
            }`}
          >
            {canvasBlocks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="text-4xl mb-4">📋</div>
                <div className="text-lg font-medium mb-2">Drag blocks here to build your prompt</div>
                <div className="text-sm">Use the library on the right to add blocks</div>
              </div>
            ) : (
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 p-4">
                  {canvasBlocks.map((block) => (
                    <CanvasBlockComponent
                      key={block.canvasId}
                      block={block}
                      isSelected={selectedBlockId === block.canvasId}
                      isEditing={editingBlockId === block.canvasId}
                      onSelect={() => handleBlockSelect(block.canvasId)}
                      onEdit={() => handleBlockEdit(block.canvasId)}
                      onSave={(updates) => handleBlockSave(block.canvasId, updates)}
                      onCancel={handleBlockCancel}
                      onToggleEnabled={() => actions.toggleBlockEnabled(block.canvasId)}
                      onRemove={() => actions.removeBlockFromCanvas(block.canvasId)}
                      onDuplicate={() => actions.duplicateBlock(block.canvasId)}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        </div>
    </div>
  );
}