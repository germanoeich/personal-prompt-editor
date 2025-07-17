'use client';

import { useState } from 'react';
import { Block as BlockType } from '@/types/database';
import { extractVariables } from '@/lib/variables';

interface BlockProps {
  block: BlockType;
  isEnabled?: boolean;
  onToggle?: (id: number, enabled: boolean) => void;
  onEdit?: (block: BlockType) => void;
  onDelete?: (id: number) => void;
  isDragging?: boolean;
  className?: string;
}

export default function Block({
  block,
  isEnabled = true,
  onToggle,
  onEdit,
  onDelete,
  isDragging = false,
  className = ''
}: BlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const variables = extractVariables(block.content);

  return (
    <div
      className={`
        bg-white border rounded-lg shadow-sm transition-all duration-200
        ${isEnabled ? 'border-gray-200' : 'border-gray-100 opacity-60'}
        ${isDragging ? 'rotate-2 shadow-lg' : 'hover:shadow-md'}
        ${className}
      `}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {onToggle && (
              <button
                onClick={() => onToggle(block.id, !isEnabled)}
                className={`
                  w-4 h-4 rounded border-2 flex items-center justify-center
                  ${isEnabled 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-gray-300 bg-white'
                  }
                `}
              >
                {isEnabled && (
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
            <div>
              <h3 className="font-medium text-gray-900 text-sm">{block.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`
                  inline-block px-2 py-1 text-xs rounded
                  ${block.type === 'preset' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                  }
                `}>
                  {block.type}
                </span>
                {variables.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {variables.length} variable{variables.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                   viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {onEdit && (
              <button
                onClick={() => onEdit(block)}
                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                title="Edit"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
            
            {onDelete && block.type === 'one-off' && (
              <button
                onClick={() => onDelete(block.id)}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Delete"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded text-xs">
              {block.content}
            </div>
            
            {variables.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Variables:</div>
                <div className="flex flex-wrap gap-1">
                  {variables.map(variable => (
                    <span key={variable} className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {block.tags && block.tags.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Tags:</div>
                <div className="flex flex-wrap gap-1">
                  {block.tags.map(tag => (
                    <span key={tag} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}