'use client';

import { useDroppable } from '@dnd-kit/core';
import { PlusIcon } from '@heroicons/react/24/outline';

interface DropZoneProps {
  id: string;
  afterElementId?: string;
  label?: string;
}

export function DropZone({ id, afterElementId, label = "Drop block here" }: DropZoneProps) {
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
        transition-all duration-200 ease-in-out border-dashed rounded-lg mx-4 flex items-center justify-center
        ${isOver 
          ? 'h-12 bg-blue-900/30 border-2 border-blue-500 my-1' 
          : 'h-0 bg-transparent border-0'
        }
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
