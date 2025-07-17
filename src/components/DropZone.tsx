'use client';

import { useDroppable } from '@dnd-kit/core';
import { PlusIcon } from '@heroicons/react/24/outline';

interface DropZoneProps {
  id: string;
  afterElementId?: string;
  isVisible?: boolean;
  label?: string;
}

export function DropZone({ id, afterElementId, isVisible = true, label = "Drop block here" }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'drop-zone',
      afterElementId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        transition-all duration-200 ease-in-out
        ${isOver 
          ? 'h-16 bg-blue-900/30 border-2 border-dashed border-blue-500' 
          : isVisible 
            ? 'h-4 bg-gray-800/50 border-2 border-dashed border-gray-600'
            : 'h-2 bg-transparent border-2 border-dashed border-transparent'
        }
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        rounded-lg mx-2 flex items-center justify-center
      `}
    >
      {isOver && (
        <div className="flex items-center gap-2 text-blue-300 text-sm">
          <PlusIcon className="w-4 h-4" />
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}
