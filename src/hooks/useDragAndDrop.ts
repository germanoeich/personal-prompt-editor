import { useCallback, useState } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { CanvasBlock, Block } from '@/types';

interface UseDragAndDropProps {
  canvasBlocks: CanvasBlock[];
  setCanvasBlocks: (blocks: CanvasBlock[] | ((prev: CanvasBlock[]) => CanvasBlock[])) => void;
  onBlockAdd?: (block: Block) => void;
}

interface DragState {
  activeId: string | null;
  activeBlock: Block | CanvasBlock | null;
  isOverCanvas: boolean;
  isOverLibrary: boolean;
}

export function useDragAndDrop({ canvasBlocks, setCanvasBlocks, onBlockAdd }: UseDragAndDropProps) {
  const [dragState, setDragState] = useState<DragState>({
    activeId: null,
    activeBlock: null,
    isOverCanvas: false,
    isOverLibrary: false,
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    // Determine if dragging from library or canvas
    let activeBlock: Block | CanvasBlock | null = null;
    
    // Check if it's a library block (id format: "block-{id}")
    if (activeId.startsWith('block-')) {
      const block = active.data.current?.block as Block;
      if (block) {
        activeBlock = block;
      }
    }
    
    // Check if it's a canvas block (id format: "canvas-{canvasId}")
    if (activeId.startsWith('canvas-')) {
      const canvasId = activeId.replace('canvas-', '');
      activeBlock = canvasBlocks.find(block => block.canvasId === canvasId) || null;
    }

    setDragState({
      activeId,
      activeBlock,
      isOverCanvas: false,
      isOverLibrary: false,
    });
  }, [canvasBlocks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    setDragState(prev => ({
      ...prev,
      isOverCanvas: over?.id === 'canvas-droppable',
      isOverLibrary: over?.id === 'library-droppable',
    }));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDragState({
        activeId: null,
        activeBlock: null,
        isOverCanvas: false,
        isOverLibrary: false,
      });
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle dropping library block onto canvas
    if (activeId.startsWith('block-') && overId === 'canvas-droppable') {
      const block = active.data.current?.block as Block;
      if (block && onBlockAdd) {
        onBlockAdd(block);
      }
    }

    // Handle reordering blocks within canvas
    if (activeId.startsWith('canvas-') && overId.startsWith('canvas-')) {
      const activeCanvasId = activeId.replace('canvas-', '');
      const overCanvasId = overId.replace('canvas-', '');
      
      const activeIndex = canvasBlocks.findIndex(block => block.canvasId === activeCanvasId);
      const overIndex = canvasBlocks.findIndex(block => block.canvasId === overCanvasId);
      
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        setCanvasBlocks(prev => arrayMove(prev, activeIndex, overIndex));
      }
    }

    // Handle removing block from canvas to library
    if (activeId.startsWith('canvas-') && overId === 'library-droppable') {
      const canvasId = activeId.replace('canvas-', '');
      setCanvasBlocks(prev => prev.filter(block => block.canvasId !== canvasId));
    }

    setDragState({
      activeId: null,
      activeBlock: null,
      isOverCanvas: false,
      isOverLibrary: false,
    });
  }, [canvasBlocks, setCanvasBlocks, onBlockAdd]);

  const addBlockToCanvas = useCallback((block: Block, position?: number) => {
    const canvasBlock: CanvasBlock = {
      ...block,
      enabled: true,
      canvasId: `canvas-${block.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setCanvasBlocks(prev => {
      if (position !== undefined && position >= 0 && position <= prev.length) {
        const newBlocks = [...prev];
        newBlocks.splice(position, 0, canvasBlock);
        return newBlocks;
      }
      return [...prev, canvasBlock];
    });
  }, [setCanvasBlocks]);

  const removeBlockFromCanvas = useCallback((canvasId: string) => {
    setCanvasBlocks(prev => prev.filter(block => block.canvasId !== canvasId));
  }, [setCanvasBlocks]);

  const toggleBlockEnabled = useCallback((canvasId: string) => {
    setCanvasBlocks(prev => 
      prev.map(block => 
        block.canvasId === canvasId 
          ? { ...block, enabled: !block.enabled }
          : block
      )
    );
  }, [setCanvasBlocks]);

  const updateBlockInCanvas = useCallback((canvasId: string, updates: Partial<CanvasBlock>) => {
    setCanvasBlocks(prev => 
      prev.map(block => 
        block.canvasId === canvasId 
          ? { ...block, ...updates }
          : block
      )
    );
  }, [setCanvasBlocks]);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setCanvasBlocks(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      return arrayMove(prev, fromIndex, toIndex);
    });
  }, [setCanvasBlocks]);

  const duplicateBlock = useCallback((canvasId: string) => {
    const blockToDuplicate = canvasBlocks.find(block => block.canvasId === canvasId);
    if (blockToDuplicate) {
      const duplicatedBlock: CanvasBlock = {
        ...blockToDuplicate,
        canvasId: `canvas-${blockToDuplicate.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      
      const originalIndex = canvasBlocks.findIndex(block => block.canvasId === canvasId);
      setCanvasBlocks(prev => {
        const newBlocks = [...prev];
        newBlocks.splice(originalIndex + 1, 0, duplicatedBlock);
        return newBlocks;
      });
    }
  }, [canvasBlocks, setCanvasBlocks]);

  return {
    dragState,
    handlers: {
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
    },
    actions: {
      addBlockToCanvas,
      removeBlockFromCanvas,
      toggleBlockEnabled,
      updateBlockInCanvas,
      moveBlock,
      duplicateBlock,
    },
  };
}