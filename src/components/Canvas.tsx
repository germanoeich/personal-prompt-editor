'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block as BlockType } from '@/types/database';
import Block from './Block';
import { getAllVariables, replaceVariables } from '@/lib/variables';

interface CanvasBlock extends BlockType {
  enabled: boolean;
  canvasId: string;
}

interface SortableCanvasBlockProps {
  block: CanvasBlock;
  onToggle: (canvasId: string, enabled: boolean) => void;
  onEdit: (block: CanvasBlock) => void;
  onDelete: (canvasId: string) => void;
}

function SortableCanvasBlock({ block, onToggle, onEdit, onDelete }: SortableCanvasBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.canvasId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Block
        block={block}
        isEnabled={block.enabled}
        onToggle={(_, enabled) => onToggle(block.canvasId, enabled)}
        onEdit={() => onEdit(block)}
        onDelete={() => onDelete(block.canvasId)}
        isDragging={isDragging}
        className="mb-2"
      />
    </div>
  );
}

interface CanvasProps {
  onSavePrompt?: (title: string, content: string) => void;
  onBlockAdd?: (addBlockFn: (block: BlockType) => void) => void;
}

export default function Canvas({ onSavePrompt, onBlockAdd }: CanvasProps) {
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [promptTitle, setPromptTitle] = useState('');
  const [showVariables, setShowVariables] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  const addBlock = useCallback((block: BlockType) => {
    if (!block) {
      console.error('Cannot add block: block is null or undefined');
      return;
    }
    
    const canvasBlock: CanvasBlock = {
      ...block,
      enabled: true,
      canvasId: `canvas-${block.id || 'temp'}-${Date.now()}`,
    };
    setCanvasBlocks(prev => [...prev, canvasBlock]);
  }, []);

  useEffect(() => {
    if (onBlockAdd) {
      onBlockAdd(addBlock);
    }
  }, [onBlockAdd, addBlock]);

  const toggleBlock = (canvasId: string, enabled: boolean) => {
    setCanvasBlocks(prev =>
      prev.map(block =>
        block.canvasId === canvasId ? { ...block, enabled } : block
      )
    );
  };

  const editBlock = (block: CanvasBlock) => {
    // For now, just allow editing the title and content
    const newTitle = prompt('Edit title:', block.title);
    if (newTitle !== null) {
      const newContent = prompt('Edit content:', block.content);
      if (newContent !== null) {
        setCanvasBlocks(prev =>
          prev.map(b =>
            b.canvasId === block.canvasId
              ? { ...b, title: newTitle, content: newContent }
              : b
          )
        );
      }
    }
  };

  const deleteBlock = (canvasId: string) => {
    setCanvasBlocks(prev => prev.filter(block => block.canvasId !== canvasId));
  };

  const getEnabledBlocks = () => canvasBlocks.filter(block => block.enabled);

  const getAllBlockVariables = () => {
    const enabledBlocks = getEnabledBlocks();
    return getAllVariables(enabledBlocks.map(block => block.content));
  };

  const generatePrompt = () => {
    const enabledBlocks = getEnabledBlocks();
    let content = enabledBlocks.map(block => block.content).join('\n\n');
    
    if (Object.keys(variables).length > 0) {
      content = replaceVariables(content, variables);
    }
    
    return content;
  };

  const handleCopyToClipboard = () => {
    const prompt = generatePrompt();
    navigator.clipboard.writeText(prompt);
    // TODO: Show toast notification
  };

  const handleSavePrompt = () => {
    if (!promptTitle.trim()) {
      alert('Please enter a title for the prompt');
      return;
    }
    
    const content = generatePrompt();
    onSavePrompt?.(promptTitle, content);
    setPromptTitle('');
  };

  const allVariables = getAllBlockVariables();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Prompt Builder</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowVariables(!showVariables)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                allVariables.length > 0
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-600 cursor-not-allowed'
              }`}
              disabled={allVariables.length === 0}
            >
              Variables ({allVariables.length})
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200 transition-colors"
            >
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 transition-colors"
              disabled={canvasBlocks.length === 0}
            >
              Copy
            </button>
          </div>
        </div>
        
        {showVariables && allVariables.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Set Variables:</h3>
            <div className="space-y-2">
              {allVariables.map(variable => (
                <div key={variable} className="flex items-center gap-2">
                  <span className="text-sm text-yellow-700 w-20">{variable}:</span>
                  <input
                    type="text"
                    value={variables[variable] || ''}
                    onChange={(e) => setVariables(prev => ({
                      ...prev,
                      [variable]: e.target.value
                    }))}
                    className="flex-1 px-2 py-1 border border-yellow-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder={`Enter value for ${variable}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {showPreview && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 mb-2">Preview:</h3>
            <div className="text-sm text-green-700 whitespace-pre-wrap font-mono bg-white p-2 rounded border border-green-200 max-h-32 overflow-y-auto">
              {generatePrompt() || 'Add blocks to see preview...'}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter prompt title..."
            value={promptTitle}
            onChange={(e) => setPromptTitle(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSavePrompt}
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!promptTitle.trim() || canvasBlocks.length === 0}
          >
            Save Prompt
          </button>
        </div>
      </div>
      
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {canvasBlocks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <div className="text-lg font-medium mb-2">Drag blocks here to build your prompt</div>
              <div className="text-sm">Use the library on the right to add blocks</div>
            </div>
          </div>
        ) : (
          <SortableContext
            items={canvasBlocks.map(block => block.canvasId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {canvasBlocks.map(block => (
                <SortableCanvasBlock
                  key={block.canvasId}
                  block={block}
                  onToggle={toggleBlock}
                  onEdit={editBlock}
                  onDelete={deleteBlock}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}