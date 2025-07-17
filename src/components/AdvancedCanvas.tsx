'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
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
}

export function AdvancedCanvas({
  canvasBlocks,
  setCanvasBlocks,
  variables,
  onVariablesChange,
  showPreview,
  onShowPreviewToggle,
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

  // Sensors for drag and drop
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

  // Droppable setup for canvas
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
  });

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

  // Variable change handler
  const handleVariableChange = useCallback((variable: string, value: string) => {
    onVariablesChange({ ...variables, [variable]: value });
  }, [variables, onVariablesChange]);

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handlers.onDragStart}
      onDragOver={handlers.onDragOver}
      onDragEnd={handlers.onDragEnd}
    >
      <div className="flex-1 flex flex-col">
        {/* Canvas Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Prompt Builder</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {/* TODO: Show variables modal */}}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                allVariables.length > 0
                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
              disabled={allVariables.length === 0}
            >
              Variables ({allVariables.length})
            </button>
            
            <button
              onClick={onShowPreviewToggle}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                showPreview
                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            
            <button
              onClick={copyToClipboard}
              disabled={canvasBlocks.filter(b => b.enabled).length === 0}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                canvasBlocks.filter(b => b.enabled).length > 0
                  ? 'border-blue-300 bg-blue-600 text-white hover:bg-blue-700'
                  : 'border-gray-300 bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Copy Prompt
            </button>
          </div>
        </div>

        {/* Variables Section */}
        {allVariables.length > 0 && (
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Variables</h3>
            <div className="grid grid-cols-2 gap-3">
              {allVariables.map(variable => (
                <div key={variable} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 min-w-0 flex-shrink-0">
                    {variable}:
                  </label>
                  <input
                    type="text"
                    value={variables[variable] || ''}
                    onChange={(e) => handleVariableChange(variable, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter ${variable}...`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Section */}
        {showPreview && (
          <div className="p-4 border-b bg-blue-50">
            <h3 className="text-sm font-medium text-blue-700 mb-2">Preview</h3>
            <div className="text-sm text-blue-900 whitespace-pre-wrap bg-white p-3 rounded border border-blue-200 max-h-40 overflow-y-auto">
              {previewContent || 'Add blocks to see preview...'}
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <div
            ref={setNodeRef}
            className={`min-h-96 border-2 border-dashed rounded-lg transition-colors ${
              isOver && dragState.activeBlock
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            {canvasBlocks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
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

      {/* Drag Overlay */}
      <DragOverlay>
        {dragState.activeBlock && (
          <div className="opacity-75">
            {dragState.activeId?.startsWith('block-') ? (
              <BlockLibraryItem 
                block={dragState.activeBlock as Block} 
                isExpanded={false}
                onToggleExpand={() => {}}
                onEdit={() => {}}
                onDuplicate={() => {}}
                onDelete={() => {}}
              />
            ) : (
              <CanvasBlockComponent
                block={dragState.activeBlock as CanvasBlock}
                isSelected={false}
                isEditing={false}
                onSelect={() => {}}
                onEdit={() => {}}
                onSave={() => {}}
                onCancel={() => {}}
                onToggleEnabled={() => {}}
                onRemove={() => {}}
                onDuplicate={() => {}}
              />
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}