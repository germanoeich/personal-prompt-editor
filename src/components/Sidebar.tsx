"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  VariableIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { SidebarVariablesPanel } from "./SidebarVariablesPanel";
import { SidebarPromptsPanel } from "./SidebarPromptsPanel";
import { Prompt } from "@/types";

interface SidebarProps {
  // Variables panel props
  variables: Record<string, string>;
  allVariables: string[];
  onVariableChange: (variable: string, value: string) => void;

  // Prompts panel props
  prompts: Prompt[];
  onPromptSelect?: (prompt: Prompt) => void;
  onPromptLoad?: (prompt: Prompt) => void;
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
  const [activeTab, setActiveTab] = useState<string | null>("prompts");
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

  const tabs: SidebarTab[] = [
    {
      id: "prompts",
      title: "My Prompts",
      icon: DocumentTextIcon,
    },
    {
      id: "variables",
      title: "Variables",
      icon: VariableIcon,
    },
  ];

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (activeTab === tabId) {
        // Clicking the same tab closes the sidebar
        setActiveTab(null);
      } else {
        // Clicking a different tab opens that tab
        setActiveTab(tabId);
      }
    },
    [activeTab]
  );

  // Handle resize functionality
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      onResizeStateChange?.(true);

      const startX = e.clientX;
      const startWidth = currentWidthRef.current;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        const newWidth = Math.min(
          maxWidth,
          Math.max(minWidth, startWidth + deltaX)
        );
        setWidth(newWidth);
        currentWidthRef.current = newWidth;
        localStorage.setItem("sidebarWidth", newWidth.toString());
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        onResizeStateChange?.(false);
        // Final save to ensure it's persisted
        localStorage.setItem(
          "sidebarWidth",
          currentWidthRef.current.toString()
        );
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [minWidth, maxWidth, onResizeStateChange]
  );

  // No longer need CSS custom properties - flexbox handles layout

  // Load saved width on mount
  useEffect(() => {
    const saved = localStorage.getItem("sidebarWidth");
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
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing]);

  // VSCode-style sidebar with vertical icon tabs

  const isCollapsed = activeTab === null;

  return (
    <div className="flex flex-shrink-0">
      {/* Icon Tab Bar (Always Visible) */}
      <div className="w-12 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="flex flex-col">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full p-3 flex items-center justify-center text-gray-400 hover:text-white transition-colors ${
                activeTab === tab.id
                  ? "text-blue-400 bg-gray-700/50"
                  : "hover:bg-gray-700/30"
              }`}
              title={tab.title}
            >
              <tab.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Content Panel (Only when tab is active) */}
      {!isCollapsed && (
        <div
          ref={containerRef}
          className={`bg-gray-800 border-r border-gray-700 flex flex-col relative group ${
            isResizing ? "" : "transition-all duration-300"
          }`}
          style={{ width: `${width}px` }}
        >
          {/* Resize Handle */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-all z-10 ${
              isResizing
                ? "bg-blue-500"
                : "bg-gray-600 hover:bg-blue-500 opacity-0 group-hover:opacity-100"
            }`}
            onMouseDown={handleMouseDown}
          ></div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === "prompts" && (
              <SidebarPromptsPanel
                prompts={prompts}
                onPromptSelect={onPromptSelect}
                onPromptLoad={onPromptLoad}
                onPromptDelete={onPromptDelete}
              />
            )}
            {activeTab === "variables" && (
              <SidebarVariablesPanel
                variables={variables}
                allVariables={allVariables}
                onVariableChange={onVariableChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
