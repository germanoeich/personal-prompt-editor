'use client';

import { useState, useCallback } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  VariableIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface VariablesPanelProps {
  variables: Record<string, string>;
  allVariables: string[];
  onVariableChange: (variable: string, value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export function VariablesPanel({
  variables,
  allVariables,
  onVariableChange,
  isOpen,
  onToggle,
  width,
  onWidthChange,
}: VariablesPanelProps) {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, onWidthChange]);

  const handleClearVariable = useCallback((variable: string) => {
    onVariableChange(variable, '');
  }, [onVariableChange]);

  const handleClearAllVariables = useCallback(() => {
    allVariables.forEach(variable => {
      onVariableChange(variable, '');
    });
  }, [allVariables, onVariableChange]);

  const filledVariables = allVariables.filter(variable => variables[variable]?.trim());
  const emptyVariables = allVariables.filter(variable => !variables[variable]?.trim());

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed left-4 top-1/2 transform -translate-y-1/2 z-50 p-2 rounded-lg border transition-all duration-200 ${
          isOpen 
            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
        }`}
        title={isOpen ? 'Hide Variables' : 'Show Variables'}
        style={{ left: isOpen ? `${width + 16}px` : '16px' }}
      >
        {isOpen ? (
          <ChevronLeftIcon className="w-5 h-5" />
        ) : (
          <ChevronRightIcon className="w-5 h-5" />
        )}
      </button>

      {/* Variables Panel */}
      <div 
        className={`fixed left-0 top-0 h-full bg-gray-800 border-r border-gray-700 transition-transform duration-200 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: `${width}px` }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <VariableIcon className="w-5 h-5" />
                Variables
              </h2>
              <div className="flex items-center gap-2">
                {allVariables.length > 0 && (
                  <button
                    onClick={handleClearAllVariables}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-red-400 border border-gray-600 hover:border-red-600 rounded transition-colors"
                    title="Clear all variables"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={onToggle}
                  className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                  title="Close variables panel"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Summary */}
            <div className="text-sm text-gray-400">
              {allVariables.length === 0 ? (
                'No variables in use'
              ) : (
                <>
                  {filledVariables.length} of {allVariables.length} variable{allVariables.length !== 1 ? 's' : ''} set
                </>
              )}
            </div>
          </div>

          {/* Variables List */}
          <div className="flex-1 overflow-y-auto">
            {allVariables.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="text-4xl mb-2">🔤</div>
                <div className="text-sm">No variables detected</div>
                <div className="text-xs text-gray-600 mt-1">
                  Use {'{{'} and {'}}' } in your blocks to create variables
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Filled Variables */}
                {filledVariables.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-200 mb-2">
                      Filled Variables ({filledVariables.length})
                    </h3>
                    <div className="space-y-2">
                      {filledVariables.map(variable => (
                        <div key={variable} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-200">
                              {variable}
                            </label>
                            <button
                              onClick={() => handleClearVariable(variable)}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              title="Clear variable"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={variables[variable] || ''}
                            onChange={(e) => onVariableChange(variable, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-600 bg-gray-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter ${variable}...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty Variables */}
                {emptyVariables.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-200 mb-2">
                      Empty Variables ({emptyVariables.length})
                    </h3>
                    <div className="space-y-2">
                      {emptyVariables.map(variable => (
                        <div key={variable} className="bg-gray-900 rounded-lg p-3 border border-gray-600 border-dashed">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {variable}
                          </label>
                          <input
                            type="text"
                            value={variables[variable] || ''}
                            onChange={(e) => onVariableChange(variable, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-600 bg-gray-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter ${variable}...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="text-xs text-gray-500">
              Variables are automatically detected from your blocks
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors ${
            isResizing ? 'bg-blue-500' : 'bg-transparent'
          }`}
          onMouseDown={handleMouseDown}
        />
      </div>

    </>
  );
}