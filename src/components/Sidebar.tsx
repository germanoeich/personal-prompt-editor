'use client';

import { useState, useCallback } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  VariableIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { SidebarVariablesPanel } from './SidebarVariablesPanel';
import { SidebarPromptsPanel } from './SidebarPromptsPanel';

interface SidebarProps {
  // Variables panel props
  variables: Record<string, string>;
  allVariables: string[];
  onVariableChange: (variable: string, value: string) => void;
  
  // Prompts panel props (mocked for now)
  prompts: any[];
  onPromptSelect?: (prompt: any) => void;
  onPromptDelete?: (promptId: string) => void;
}

export interface SidebarPanel {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  defaultHeight?: number;
}

export function Sidebar({
  variables,
  allVariables,
  onVariableChange,
  prompts,
  onPromptSelect,
  onPromptDelete,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [panels, setPanels] = useState<SidebarPanel[]>([
    {
      id: 'variables',
      title: 'Variables',
      icon: VariableIcon,
      isExpanded: false,
      defaultHeight: 400,
    },
    {
      id: 'prompts',
      title: 'My Prompts',
      icon: DocumentTextIcon,
      isExpanded: false,
      defaultHeight: 300,
    },
  ]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const togglePanel = useCallback((panelId: string) => {
    setPanels(prev => prev.map(panel => 
      panel.id === panelId 
        ? { ...panel, isExpanded: !panel.isExpanded }
        : panel
    ));
  }, []);

  const expandedPanels = panels.filter(panel => panel.isExpanded);

  const sidebarWidth = isCollapsed ? 60 : 320;

  return (
    <div 
      className="fixed left-0 top-0 h-full bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 z-50"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-white">Sidebar</h2>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Panel Icons (when collapsed) */}
      {isCollapsed && (
        <div className="flex-1 py-2">
          {panels.map(panel => (
            <button
              key={panel.id}
              onClick={() => togglePanel(panel.id)}
              className={`w-full p-3 flex items-center justify-center text-gray-400 hover:text-gray-300 hover:bg-gray-700 transition-colors ${
                panel.isExpanded ? 'bg-gray-700 text-blue-400' : ''
              }`}
              title={panel.title}
            >
              <panel.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      )}

      {/* Panels */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col min-h-0">
          {panels.map(panel => {
            if (panel.isExpanded) {
              // Expanded panel
              const totalExpandedHeight = expandedPanels.reduce((sum, p) => sum + (p.defaultHeight || 300), 0);
              const availableHeight = totalExpandedHeight;
              const panelHeight = `${((panel.defaultHeight || 300) / availableHeight) * 100}%`;

              return (
                <div
                  key={panel.id}
                  className="flex flex-col border-b border-gray-700"
                  style={{ 
                    flex: expandedPanels.length === 1 ? '1 1 auto' : '0 0 auto',
                    minHeight: expandedPanels.length === 1 ? '200px' : 'auto',
                  }}
                >
                  {/* Panel Header */}
                  <button
                    onClick={() => togglePanel(panel.id)}
                    className="flex items-center gap-3 p-3 text-gray-300 hover:bg-gray-700 border-b border-gray-700 transition-colors flex-shrink-0"
                  >
                    <panel.icon className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">{panel.title}</span>
                    <ChevronLeftIcon className="w-4 h-4 ml-auto" />
                  </button>

                  {/* Panel Content */}
                  <div className="overflow-hidden">
                    {panel.id === 'variables' && (
                      <SidebarVariablesPanel
                        variables={variables}
                        allVariables={allVariables}
                        onVariableChange={onVariableChange}
                      />
                    )}
                    {panel.id === 'prompts' && (
                      <SidebarPromptsPanel
                        prompts={prompts}
                        onPromptSelect={onPromptSelect}
                        onPromptDelete={onPromptDelete}
                      />
                    )}
                  </div>
                </div>
              );
            } else {
              // Collapsed panel header
              return (
                <button
                  key={panel.id}
                  onClick={() => togglePanel(panel.id)}
                  className="flex items-center gap-3 p-3 text-gray-300 hover:bg-gray-700 border-b border-gray-700 transition-colors"
                >
                  <panel.icon className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">{panel.title}</span>
                  <ChevronRightIcon className="w-4 h-4 ml-auto" />
                </button>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}