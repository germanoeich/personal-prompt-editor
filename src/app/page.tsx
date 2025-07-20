'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CanvasBlock, Block, Prompt, PromptContent, PromptTextElement, PromptTab } from '@/types';
import { TextEditorCanvas } from '@/components/TextEditorCanvas';
import { Sidebar } from '@/components/Sidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { extractVariables } from '@/lib/variables';

export default function Home() {
  // Tab state
  const [tabs, setTabs] = useState<PromptTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  
  // Core state (for backward compatibility - will refactor later)
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  
  // Prompts state (moved up to be available for activeTab calculation)
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  
  // Block library state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  
  // Get active tab data (now prompts is available)
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const promptContent = activeTab?.content || [];
  const variables = activeTab?.variables || {};
  const currentPrompt = activeTab && !activeTab.isNew && activeTab.promptId 
    ? prompts.find(p => p.id === activeTab.promptId) || null 
    : null;
  
  // Resize state for disabling transitions
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [isRightSidebarResizing, setIsRightSidebarResizing] = useState(false);
  
  // Handle sidebar resize state changes
  const handleSidebarResizeStateChange = useCallback((isResizing: boolean) => {
    setIsSidebarResizing(isResizing);
  }, []);

  const handleRightSidebarResizeStateChange = useCallback((isResizing: boolean) => {
    setIsRightSidebarResizing(isResizing);
  }, []);

  // Load blocks from API
  const loadBlocks = useCallback(async () => {
    setIsLoadingBlocks(true);
    setBlocksError(null);
    
    try {
      const response = await fetch('/api/blocks');
      if (!response.ok) {
        throw new Error(`Failed to load blocks: ${response.statusText}`);
      }
      
      const blocksData = await response.json();
      setBlocks(blocksData);
    } catch (error) {
      console.error('Error loading blocks:', error);
      setBlocksError(error instanceof Error ? error.message : 'Failed to load blocks');
    } finally {
      setIsLoadingBlocks(false);
    }
  }, []);

  // Load prompts from API
  const loadPrompts = useCallback(async () => {
    setIsLoadingPrompts(true);
    
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error(`Failed to load prompts: ${response.statusText}`);
      }
      
      const promptsData = await response.json();
      setPrompts(promptsData);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setIsLoadingPrompts(false);
    }
  }, []);

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load blocks and prompts
        await Promise.all([loadBlocks(), loadPrompts()]);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [loadBlocks, loadPrompts]);

  // Tab management functions
  const createNewTab = useCallback(() => {
    const newTab: PromptTab = {
      id: `tab-${Date.now()}`,
      promptId: null,
      title: 'New Prompt',
      content: [],
      variables: {},
      isDirty: false,
      isNew: true,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const openPromptInTab = useCallback((prompt: Prompt) => {
    // Check if prompt is already open
    const existingTab = tabs.find(tab => tab.promptId === prompt.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Load prompt content
    const loadPromptIntoTab = async () => {
      setIsLoadingPrompt(true);
      try {
        const { apiHelpers } = await import('@/lib/api');
        const result = await apiHelpers.loadPromptAsContent(prompt.id);
        
        if (!result) {
          throw new Error('Failed to load prompt content');
        }
        
        const newTab: PromptTab = {
          id: `tab-${prompt.id}-${Date.now()}`,
          promptId: prompt.id,
          title: prompt.title,
          content: result.promptContent,
          variables: result.variables,
          isDirty: false,
          isNew: false,
        };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } catch (error) {
        console.error('Error loading prompt:', error);
        alert('Failed to load prompt: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setIsLoadingPrompt(false);
      }
    };

    loadPromptIntoTab();
  }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isDirty && !confirm('This tab has unsaved changes. Close anyway?')) {
      return;
    }

    setTabs(prev => prev.filter(t => t.id !== tabId));
    
    // If closing active tab, switch to another
    if (activeTabId === tabId) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : null);
    }
  }, [tabs, activeTabId]);

  const updateActiveTab = useCallback((updates: Partial<PromptTab>) => {
    if (!activeTabId) return;
    
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, ...updates }
        : tab
    ));
  }, [activeTabId]);

  // Block CRUD operations
  const handleBlockCreate = useCallback(async (blockData: any) => {
    try {
      const response = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create block: ${response.statusText}`);
      }

      const newBlock = await response.json();
      setBlocks(prev => [newBlock, ...prev]);
      return newBlock; // Return the created block
    } catch (error) {
      console.error('Error creating block:', error);
      throw error;
    }
  }, []);

  const handleBlockUpdate = useCallback(async (id: number, updates: any) => {
    try {
      const response = await fetch(`/api/blocks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update block: ${response.statusText}`);
      }

      const updatedBlock = await response.json();
      setBlocks(prev => prev.map(block => 
        block.id === id ? updatedBlock : block
      ));

      // Update any blocks in prompt content that reference this preset block
      setPromptContent(prev => prev.map(element => {
        if (element.type === 'block' && element.blockId === id && element.blockType === 'preset') {
          return {
            ...element,
            originalBlock: updatedBlock,
          };
        }
        return element;
      }));
    } catch (error) {
      console.error('Error updating block:', error);
      throw error;
    }
  }, []);

  const handleBlockDelete = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/blocks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete block: ${response.statusText}`);
      }

      setBlocks(prev => prev.filter(block => block.id !== id));
      
      // Remove any blocks in prompt content that reference this preset block
      setPromptContent(prev => prev.filter(element => 
        !(element.type === 'block' && element.blockId === id && element.blockType === 'preset')
      ));
    } catch (error) {
      console.error('Error deleting block:', error);
      throw error;
    }
  }, []);

  // Prompt operations
  const handleSavePrompt = useCallback(async (title: string) => {
    if (!activeTab || activeTab.content.length === 0) {
      alert('Add some content to your prompt before saving.');
      return;
    }

    try {
      const { apiHelpers } = await import('@/lib/api');
      let response;

      if (activeTab.promptId && !activeTab.isNew) {
        // Update existing prompt
        response = await apiHelpers.updatePromptFromContent(
          activeTab.promptId,
          activeTab.content,
          activeTab.variables,
          title,
          [], // tags
          []  // categories
        );
      } else {
        // Create new prompt
        response = await apiHelpers.savePromptFromContent(
          activeTab.content,
          activeTab.variables,
          title,
          [], // tags
          []  // categories
        );
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Update tab to reflect saved state
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { 
              ...tab, 
              promptId: response.data!.id,
              isNew: false,
              isDirty: false,
              title: response.data!.title
            }
          : tab
      ));
      
      // Refresh prompts list and wait for it to complete
      await loadPrompts();
      
      console.log('Prompt saved successfully:', response.data);
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [activeTab, activeTabId, loadPrompts]);

  // Load prompt functionality - now opens in tab
  const handlePromptLoad = useCallback(async (prompt: Prompt) => {
    openPromptInTab(prompt);
  }, [openPromptInTab]);

  // Delete prompt functionality
  const handlePromptDelete = useCallback(async (promptId: number) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete prompt: ${response.statusText}`);
      }

      // Refresh prompts list
      loadPrompts();
      
      // Clear current prompt if it was the deleted one
      if (currentPrompt?.id === promptId) {
        setCurrentPrompt(null);
      }
      
      console.log('Prompt deleted successfully');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Failed to delete prompt: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [currentPrompt, loadPrompts]);

  // Title change functionality
  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (!activeTabId) return;
    
    // Check if title actually changed
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (!currentTab || currentTab.title === newTitle) return;
    
    // Update tab title immediately
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        // Only mark as dirty if it's a new prompt or title actually changed
        const titleChanged = tab.title !== newTitle;
        return { ...tab, title: newTitle, isDirty: tab.isDirty || (tab.isNew && titleChanged) };
      }
      return tab;
    }));
    
    // If this is a saved prompt, update in database
    if (currentPrompt) {
      try {
        const response = await fetch(`/api/prompts/${currentPrompt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTitle,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update prompt title: ${response.statusText}`);
        }

        // Refresh prompts list to show updated title
        await loadPrompts();
        
        console.log('Prompt title updated successfully');
      } catch (error) {
        console.error('Error updating prompt title:', error);
        alert('Failed to update prompt title: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  }, [activeTabId, tabs, currentPrompt, loadPrompts]);

  // Calculate all variables needed
  const allVariables = useMemo(() => {
    const variableSet = new Set<string>();
    promptContent.forEach(element => {
      if (element.type === 'text') {
        const textVariables = extractVariables(element.content);
        textVariables.forEach(variable => variableSet.add(variable));
      } else if (element.type === 'block') {
        const blockContent = element.isOverridden 
          ? element.overrideContent || ''
          : element.originalBlock?.content || '';
        const blockVariables = extractVariables(blockContent);
        blockVariables.forEach(variable => variableSet.add(variable));
      }
    });
    return Array.from(variableSet);
  }, [promptContent]);

  // Variable management
  // Update these to work with tabs
  const setPromptContent = useCallback((contentOrUpdater: PromptContent | ((prev: PromptContent) => PromptContent)) => {
    if (!activeTabId) return;
    
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        const newContent = typeof contentOrUpdater === 'function' 
          ? contentOrUpdater(tab.content)
          : contentOrUpdater;
        // Only mark as dirty if content actually changed
        const contentChanged = JSON.stringify(newContent) !== JSON.stringify(tab.content);
        return { ...tab, content: newContent, isDirty: tab.isDirty || contentChanged };
      }
      return tab;
    }));
  }, [activeTabId]);

  const handleVariablesChange = useCallback((newVariables: Record<string, string>) => {
    if (!activeTabId) return;
    
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        // Only mark as dirty if variables actually changed
        const variablesChanged = JSON.stringify(newVariables) !== JSON.stringify(tab.variables);
        return { ...tab, variables: newVariables, isDirty: tab.isDirty || variablesChanged };
      }
      return tab;
    }));
  }, [activeTabId]);

  const handleVariableChange = useCallback((variable: string, value: string) => {
    if (!activeTabId) return;
    
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        const newVariables = { ...tab.variables, [variable]: value };
        // Only mark as dirty if variable actually changed
        const variableChanged = tab.variables[variable] !== value;
        return { ...tab, variables: newVariables, isDirty: tab.isDirty || variableChanged };
      }
      return tab;
    }));
  }, [activeTabId]);

  // Generate preview content
  const previewContent = useMemo(() => {
    const sortedContent = [...promptContent].sort((a, b) => a.order - b.order);
    
    return sortedContent.map(element => {
      if (element.type === 'text') {
        return element.content.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
          return variables[variable] || match;
        });
      } else if (element.type === 'block') {
        const blockContent = element.isOverridden 
          ? element.overrideContent || ''
          : element.originalBlock?.content || '';
        
        // Handle {{originalText}} replacement in overrides
        let finalContent = blockContent;
        if (element.isOverridden && element.overrideContent?.includes('{{originalText}}')) {
          finalContent = element.overrideContent.replace(
            /\{\{originalText\}\}/g, 
            element.originalBlock?.content || ''
          );
        }
        
        return finalContent.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
          return variables[variable] || match;
        });
      }
      return '';
    }).join('\n\n');
  }, [promptContent, variables]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag events
  const handleDragStart = useCallback((event: any) => {
    const { active } = event;
    if (active.data.current?.type === 'library-block') {
      setActiveBlock(active.data.current.block);
    }
  }, []);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    setActiveBlock(null);
    
    if (over && active.data.current?.type === 'library-block') {
      const block = active.data.current.block;
      
      // Handle different drop target types
      if (over.id === 'text-editor-droppable') {
        // Dropped on main text editor area - add to end
        const newElement = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'block' as const,
          order: promptContent.length + 1,
          blockId: block.id,
          blockType: block.type,
          originalBlock: block,
          isOverridden: false,
          overrideContent: undefined,
        };
        
        setPromptContent(prev => [...prev, newElement].sort((a, b) => a.order - b.order));
      } else if (over.data.current?.type === 'drop-zone') {
        // Dropped on a specific drop zone
        const { afterElementId } = over.data.current;
        const sortedContent = [...promptContent].sort((a, b) => a.order - b.order);
        
        let newOrder: number;
        
        if (over.id === 'drop-zone-top') {
          // Insert at the beginning
          newOrder = sortedContent.length > 0 ? sortedContent[0].order - 1 : 1;
        } else if (afterElementId) {
          // Insert after specific element
          const afterIndex = sortedContent.findIndex(el => el.id === afterElementId);
          if (afterIndex !== -1 && afterIndex < sortedContent.length - 1) {
            // Insert between two elements
            const currentOrder = sortedContent[afterIndex].order;
            const nextOrder = sortedContent[afterIndex + 1].order;
            newOrder = (currentOrder + nextOrder) / 2;
          } else {
            // Insert after the last element or element not found
            newOrder = (sortedContent[sortedContent.length - 1]?.order || 0) + 1;
          }
        } else {
          // Default to end
          newOrder = (sortedContent[sortedContent.length - 1]?.order || 0) + 1;
        }
        
        const newElement = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'block' as const,
          order: newOrder,
          blockId: block.id,
          blockType: block.type,
          originalBlock: block,
          isOverridden: false,
          overrideContent: undefined,
        };
        
        setPromptContent(prev => [...prev, newElement].sort((a, b) => a.order - b.order));
      }
    }
  }, [promptContent]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen bg-gray-900 flex flex-col">
        {/* Header - Spans Full Screen */}
        <header className="bg-gray-800 border-b border-gray-700 shadow-sm flex-shrink-0">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Visual Prompt Builder
                  </h1>
                  <p className="text-sm text-gray-400">
                    Build, organize, and version your LLM prompts
                  </p>
                </div>
                
              </div>
            </div>
        </header>

        {/* Main Content Area - Below Header */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <Sidebar
            variables={variables}
            allVariables={allVariables}
            onVariableChange={handleVariableChange}
            prompts={prompts}
            onPromptSelect={(prompt) => {
              console.log('Selected prompt:', prompt);
            }}
            onPromptLoad={handlePromptLoad}
            onPromptDelete={handlePromptDelete}
            onResizeStateChange={handleSidebarResizeStateChange}
          />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Main Content */}
            <main className="flex flex-1 min-h-0">
              {/* Canvas Area */}
              <TextEditorCanvas
                // Tab props
                tabs={tabs}
                activeTabId={activeTabId}
                onTabSelect={setActiveTabId}
                onTabClose={closeTab}
                onNewTab={createNewTab}
                
                // Content props
                promptContent={promptContent}
                setPromptContent={setPromptContent}
                variables={variables}
                onVariablesChange={handleVariablesChange}
                allVariables={allVariables}
                blocks={blocks}
                isLoading={isLoadingPrompt}
                currentPrompt={currentPrompt}
                onTitleChange={handleTitleChange}
                onBlockCreate={handleBlockCreate}
                onSavePrompt={handleSavePrompt}
                availableTags={blocks.flatMap(block => block.tags).filter((tag, index, arr) => arr.indexOf(tag) === index)}
                availableCategories={blocks.flatMap(block => block.categories).filter((cat, index, arr) => arr.indexOf(cat) === index)}
              />
            </main>

            {/* Status Bar */}
            <div className="bg-gray-800 border-t border-gray-700 px-6 py-2 text-sm text-gray-400 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span>
                    {promptContent.length} element{promptContent.length !== 1 ? 's' : ''} in prompt
                  </span>
                  <span>•</span>
                  <span>
                    {promptContent.filter(el => el.type === 'block').length} block{promptContent.filter(el => el.type === 'block').length !== 1 ? 's' : ''}, {promptContent.filter(el => el.type === 'text').length} text
                  </span>
                  {Object.keys(variables).length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {Object.keys(variables).length} variable{Object.keys(variables).length !== 1 ? 's' : ''} set
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <span>{blocks.length} blocks in library</span>
                  {currentPrompt && (
                    <>
                      <span>•</span>
                      <span>Saved as: {currentPrompt.title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <RightSidebar
            blocks={blocks}
            isLoadingBlocks={isLoadingBlocks}
            blocksError={blocksError}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
            onBlockDelete={handleBlockDelete}
            onRefreshBlocks={loadBlocks}
            previewContent={previewContent}
            onResizeStateChange={handleRightSidebarResizeStateChange}
          />
        </div>
      </div>
      
      <DragOverlay>
        {activeBlock && (
          <div className="border rounded-lg bg-gray-800 shadow-2xl border-blue-500 p-3 opacity-90 rotate-2 scale-105">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeBlock.type === 'preset' 
                  ? 'bg-blue-900/30 text-blue-300' 
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {activeBlock.type}
              </span>
              <h3 className="font-medium text-white text-sm">
                {activeBlock.title}
              </h3>
            </div>
            <div className="text-xs text-gray-400 mt-1 line-clamp-2">
              {activeBlock.content}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}