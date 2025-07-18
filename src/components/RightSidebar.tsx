"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Squares2X2Icon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { AdvancedBlockLibrary } from "./AdvancedBlockLibrary";
import { Block } from "@/types";

interface RightSidebarProps {
  // Block library props
  blocks: Block[];
  isLoadingBlocks: boolean;
  blocksError: string | null;
  onBlockCreate: (blockData: any) => Promise<void>;
  onBlockUpdate: (id: number, updates: any) => Promise<void>;
  onBlockDelete: (id: number) => Promise<void>;
  onRefreshBlocks: () => void;

  // Preview props
  previewContent: string;
  showPreview: boolean;
  onShowPreviewToggle: () => void;

  // Resize state callback (for disabling transitions)
  onResizeStateChange?: (isResizing: boolean) => void;
}

export interface RightSidebarTab {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function RightSidebar({
  blocks,
  isLoadingBlocks,
  blocksError,
  onBlockCreate,
  onBlockUpdate,
  onBlockDelete,
  onRefreshBlocks,
  previewContent,
  showPreview,
  onShowPreviewToggle,
  onResizeStateChange,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<string | null>("blocks");
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentWidthRef = useRef(width);
  const minWidth = 240; // Minimum sidebar width
  const maxWidth = 600; // Maximum sidebar width

  // Keep ref in sync with state
  useEffect(() => {
    currentWidthRef.current = width;
  }, [width]);

  const tabs: RightSidebarTab[] = [
    {
      id: "blocks",
      title: "Block Library",
      icon: Squares2X2Icon,
    },
    {
      id: "preview",
      title: "Preview",
      icon: EyeIcon,
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
        const deltaX = startX - e.clientX; // Reverse direction for right sidebar
        const newWidth = Math.min(
          maxWidth,
          Math.max(minWidth, startWidth + deltaX)
        );
        setWidth(newWidth);
        currentWidthRef.current = newWidth;
        localStorage.setItem("rightSidebarWidth", newWidth.toString());
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        onResizeStateChange?.(false);
        // Final save to ensure it's persisted
        localStorage.setItem(
          "rightSidebarWidth",
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

  // Load saved width on mount
  useEffect(() => {
    const saved = localStorage.getItem("rightSidebarWidth");
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

  const isCollapsed = activeTab === null;

  return (
    <div className="flex flex-shrink-0">
      {/* Content Panel (Only when tab is active) */}
      {!isCollapsed && (
        <div
          ref={containerRef}
          className={`bg-gray-800 border-l border-gray-700 flex flex-col relative group ${
            isResizing ? "" : "transition-all duration-300"
          }`}
          style={{ width: `${width}px` }}
        >
          {/* Resize Handle */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-all z-10 ${
              isResizing
                ? "bg-blue-500"
                : "bg-gray-600 hover:bg-blue-500 opacity-0 group-hover:opacity-100"
            }`}
            onMouseDown={handleMouseDown}
          ></div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === "blocks" && (
              <AdvancedBlockLibrary
                blocks={blocks}
                isLoading={isLoadingBlocks}
                error={blocksError}
                onBlockCreate={onBlockCreate}
                onBlockUpdate={onBlockUpdate}
                onBlockDelete={onBlockDelete}
                onRefresh={onRefreshBlocks}
                disableResize={true}
              />
            )}
            {activeTab === "preview" && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Preview</h2>
                    <button
                      onClick={onShowPreviewToggle}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        showPreview
                          ? 'border-green-500 bg-green-600 text-white hover:bg-green-700'
                          : 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto min-h-0 p-4">
                  {showPreview ? (
                    <div className="text-sm text-gray-200 whitespace-pre-wrap bg-gray-900 p-3 rounded border border-gray-600">
                      {previewContent || 'Add content to see preview...'}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 min-h-32">
                      <EyeIcon className="w-12 h-12 mb-4" />
                      <div className="text-lg font-medium mb-2">Preview Disabled</div>
                      <div className="text-sm text-center">
                        Click "Show Preview" to see your prompt with variables replaced
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Icon Tab Bar (Always Visible) */}
      <div className="w-12 bg-gray-800 border-l border-gray-700 flex flex-col">
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
    </div>
  );
}