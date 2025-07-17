'use client';

import { useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SidebarVariablesPanelProps {
  variables: Record<string, string>;
  allVariables: string[];
  onVariableChange: (variable: string, value: string) => void;
}

export function SidebarVariablesPanel({
  variables,
  allVariables,
  onVariableChange,
}: SidebarVariablesPanelProps) {
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
    <div className="flex flex-col">
      {/* Header Actions */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-400">
            {allVariables.length === 0 ? (
              'No variables in use'
            ) : (
              <>
                {filledVariables.length} of {allVariables.length} variable{allVariables.length !== 1 ? 's' : ''} set
              </>
            )}
          </div>
          {allVariables.length > 0 && (
            <button
              onClick={handleClearAllVariables}
              className="px-2 py-1 text-xs text-gray-400 hover:text-red-400 border border-gray-600 hover:border-red-600 rounded transition-colors"
              title="Clear all variables"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Variables List */}
      <div className="max-h-96 overflow-y-auto">
        {allVariables.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-3xl mb-2">🔤</div>
            <div className="text-sm">No variables detected</div>
            <div className="text-xs text-gray-600 mt-1">
              Use {'{{'} and {'}}' } in your blocks to create variables
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Filled Variables */}
            {filledVariables.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">
                  Filled ({filledVariables.length})
                </h3>
                <div className="space-y-2">
                  {filledVariables.map(variable => (
                    <div key={variable} className="bg-gray-700 rounded-lg p-2 border border-gray-600">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-200 truncate">
                          {variable}
                        </label>
                        <button
                          onClick={() => handleClearVariable(variable)}
                          className="p-0.5 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                          title="Clear variable"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={variables[variable] || ''}
                        onChange={(e) => onVariableChange(variable, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-600 bg-gray-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
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
                <h3 className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">
                  Empty ({emptyVariables.length})
                </h3>
                <div className="space-y-2">
                  {emptyVariables.map(variable => (
                    <div key={variable} className="bg-gray-900 rounded-lg p-2 border border-gray-600 border-dashed">
                      <label className="block text-xs font-medium text-gray-300 mb-1 truncate">
                        {variable}
                      </label>
                      <input
                        type="text"
                        value={variables[variable] || ''}
                        onChange={(e) => onVariableChange(variable, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-600 bg-gray-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
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
    </div>
  );
}