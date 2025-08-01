"use client";

import { useCallback, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

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
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement>>({});

  const handleClearVariable = useCallback(
    (variable: string) => {
      onVariableChange(variable, "");
    },
    [onVariableChange]
  );

  const handleClearAllVariables = useCallback(() => {
    allVariables.forEach((variable) => {
      onVariableChange(variable, "");
    });
  }, [allVariables, onVariableChange]);

  const autoResizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }, []);

  const handleVariableChange = useCallback((variable: string, value: string) => {
    onVariableChange(variable, value);
    // Auto-resize after state update
    setTimeout(() => {
      const textarea = textareaRefs.current[variable];
      if (textarea) {
        autoResizeTextarea(textarea);
      }
    }, 0);
  }, [onVariableChange, autoResizeTextarea]);

  // Auto-resize all textareas when variables change
  useEffect(() => {
    Object.entries(textareaRefs.current).forEach(([, textarea]) => {
      if (textarea) {
        autoResizeTextarea(textarea);
      }
    });
  }, [variables, autoResizeTextarea]);

  const filledVariablesCount = allVariables.filter((variable) =>
    variables[variable]?.trim()
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header Actions */}
      {allVariables.length !== 0 && (
        <div className="p-3 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">
              <>
                {filledVariablesCount} of {allVariables.length} variable
                {allVariables.length !== 1 ? "s" : ""} set
              </>
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
      )}

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {allVariables.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-3xl mb-2">🔤</div>
            <div className="text-sm">No variables detected</div>
            <div className="text-xs text-gray-600 mt-1">
              Use {"{{"} and {"}}"} in your blocks to create variables
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {allVariables.map((variable) => {
              const isFilled = variables[variable]?.trim();
              return (
                <div
                  key={variable}
                  className={`rounded-lg p-2 border ${
                    isFilled 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-900 border-gray-600 border-dashed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-200 truncate">
                      {variable}
                    </label>
                    {isFilled && (
                      <button
                        onClick={() => handleClearVariable(variable)}
                        className="p-0.5 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Clear variable"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <textarea
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current[variable] = el;
                        autoResizeTextarea(el);
                      }
                    }}
                    value={variables[variable] || ""}
                    onChange={(e) =>
                      handleVariableChange(variable, e.target.value)
                    }
                    className="w-full px-2 py-1 text-xs border border-gray-600 bg-gray-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none min-h-[24px] overflow-hidden"
                    placeholder={`Enter ${variable}...`}
                    rows={1}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
