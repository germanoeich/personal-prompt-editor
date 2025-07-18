'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  
  // Prompts panel props
  prompts: any[];
  onPromptSelect?: (prompt: any) => void;
  onPromptLoad?: (prompt: any) => void;
  onPromptDelete?: (promptId: number) => void;
  
  // Resize state callback (for disabling transitions)
  onResizeStateChange?: (isResizing: boolean) => void;
}

export interface SidebarTab {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar({
  variables,
  allVariables,
  onVariableChange,
  prompts,
  onPromptSelect,
  onPromptLoad,
  onPromptDelete,
  onResizeStateChange,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentWidthRef = useRef(width);
  const minWidth = 240; // Minimum sidebar width
  const maxWidth = 480; // Maximum sidebar width
  
  // Keep ref in sync with state
  useEffect(() => {
    currentWidthRef.current = width;
  }, [width]);
  const [activeTab, setActiveTab] = useState('variables');
  
  const tabs: SidebarTab[] = [
    {
      id: 'variables',
      title: 'Variables',
      icon: VariableIcon,
    },
    {
      id: 'prompts',
      title: 'My Prompts',
      icon: DocumentTextIcon,
    },
  ];

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const setActiveTabCallback = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // Handle resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    onResizeStateChange?.(true);
    
    const startX = e.clientX;
    const startWidth = currentWidthRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
      setWidth(newWidth);
      currentWidthRef.current = newWidth;
      localStorage.setItem('sidebarWidth', newWidth.toString());
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      onResizeStateChange?.(false);
      // Final save to ensure it's persisted
      localStorage.setItem('sidebarWidth', currentWidthRef.current.toString());
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minWidth, maxWidth, onResizeStateChange]);

  // No longer need CSS custom properties - flexbox handles layout

  // Load saved width on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebarWidth');
    if (saved) {
      const savedWidth = parseInt(saved, 10);
      if (savedWidth >= minWidth && savedWidth <= maxWidth) {
        setWidth(savedWidth);
      }
    }
  }, [minWidth, maxWidth]);

  // Prevent text selection during resize
  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // No longer need expanded panels logic

  const sidebarWidth = isCollapsed ? 60 : width;

  return (
    <div 
      ref={containerRef}
      className={`bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0 group relative ${
        isResizing ? '' : 'transition-all duration-300'
      }`}
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Resize Handle */}
      {!isCollapsed && (
        <div 
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-all z-10 ${
            isResizing ? 'bg-blue-500' : 'bg-gray-600 hover:bg-blue-500 opacity-0 group-hover:opacity-100'
          }`}
          onMouseDown={handleMouseDown}
        ></div>
      )}
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

      {/* Tab Navigation */}
      {!isCollapsed && (
        <div className="flex border-b border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabCallback(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors flex-1 ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/30'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.title}
            </button>
          ))}
        </div>
      )}

      {/* Tab Icons (when collapsed) */}
      {isCollapsed && (
        <div className="flex-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabCallback(tab.id)}
              className={`w-full p-3 flex items-center justify-center text-gray-400 hover:text-gray-300 hover:bg-gray-700 transition-colors ${
                activeTab === tab.id ? 'bg-gray-700 text-blue-400' : ''
              }`}
              title={tab.title}
            >
              <tab.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'variables' && (
            <SidebarVariablesPanel
              variables={variables}
              allVariables={allVariables}
              onVariableChange={onVariableChange}
            />
          )}
          {activeTab === 'prompts' && (
            <SidebarPromptsPanel
              prompts={prompts}
              onPromptSelect={onPromptSelect}
              onPromptLoad={onPromptLoad}
              onPromptDelete={onPromptDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}