'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  FunnelIcon,
  TagIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Block, SearchFilters, CreateBlockRequest, UpdateBlockRequest } from '@/types';
import { BlockLibraryItem } from './BlockLibraryItem';
import { CreateBlockModal } from './CreateBlockModal';

interface AdvancedBlockLibraryProps {
  blocks: Block[];
  isLoading: boolean;
  error: string | null;
  onBlockCreate: (blockData: CreateBlockRequest) => Promise<void>;
  onBlockUpdate: (id: number, updates: UpdateBlockRequest) => Promise<void>;
  onBlockDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
  disableResize?: boolean; // New prop to disable resize functionality
}

export function AdvancedBlockLibrary({
  blocks,
  isLoading,
  error,
  onBlockCreate,
  onBlockUpdate,
  onBlockDelete,
  onRefresh,
  disableResize = false,
}: AdvancedBlockLibraryProps) {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    search: '',
    tags: [],
    categories: [],
    type: undefined,
  });
  
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentWidthRef = useRef(width);
  const minWidth = 256; // min-w-64
  const maxWidth = 512; // max-w-128
  
  // Keep ref in sync with state
  useEffect(() => {
    currentWidthRef.current = width;
  }, [width]);
  
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Droppable setup for removing blocks from canvas
  const { setNodeRef, isOver } = useDroppable({
    id: 'library-droppable',
  });

  // Extract all available tags and categories
  const { allTags, allCategories } = useMemo(() => {
    const tagSet = new Set<string>();
    const categorySet = new Set<string>();
    
    blocks.forEach(block => {
      block.tags.forEach(tag => tagSet.add(tag));
      block.categories.forEach(category => categorySet.add(category));
    });
    
    return {
      allTags: Array.from(tagSet).sort(),
      allCategories: Array.from(categorySet).sort(),
    };
  }, [blocks]);

  // Filter blocks based on search criteria
  const filteredBlocks = useMemo(() => {
    return blocks.filter(block => {
      // Text search
      if (searchFilters.search) {
        const searchLower = searchFilters.search.toLowerCase();
        const matchesTitle = block.title.toLowerCase().includes(searchLower);
        const matchesContent = block.content.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesContent) return false;
      }

      // Tags filter (AND logic - block must have all selected tags)
      if (selectedTags.length > 0) {
        if (!selectedTags.every(tag => block.tags.includes(tag))) {
          return false;
        }
      }

      // Categories filter (AND logic - block must have all selected categories)
      if (selectedCategories.length > 0) {
        if (!selectedCategories.every(category => block.categories.includes(category))) {
          return false;
        }
      }

      return true;
    });
  }, [blocks, searchFilters, selectedTags, selectedCategories]);

  // Sort blocks by usage count and recency
  const sortedBlocks = useMemo(() => {
    return [...filteredBlocks].sort((a, b) => {
      // First by usage count (descending)
      if (a.usage_count !== b.usage_count) {
        return b.usage_count - a.usage_count;
      }
      
      // Then by update time (most recent first)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [filteredBlocks]);

  // Handle search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchFilters(prev => ({ ...prev, search: value }));
  }, []);


  // Handle tag selection
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // Handle category selection
  const handleCategoryToggle = useCallback((category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchFilters({ search: '', tags: [], categories: [], type: undefined });
    setSelectedTags([]);
    setSelectedCategories([]);
  }, []);

  // Block actions
  const handleToggleExpand = useCallback((blockId: number) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  }, []);

  const handleBlockEdit = useCallback(async (block: Block, updates: UpdateBlockRequest) => {
    try {
      await onBlockUpdate(block.id, updates);
      // TODO: Add success notification
    } catch (error) {
      console.error('Failed to update block:', error);
      // TODO: Add error notification
    }
  }, [onBlockUpdate]);

  const handleBlockDelete = useCallback(async (blockId: number) => {
    if (window.confirm('Are you sure you want to delete this block? This action cannot be undone.')) {
      try {
        await onBlockDelete(blockId);
        // TODO: Add success notification
      } catch (error) {
        console.error('Failed to delete block:', error);
        // TODO: Add error notification
      }
    }
  }, [onBlockDelete]);

  const handleBlockDuplicate = useCallback(async (block: Block) => {
    try {
      await onBlockCreate({
        title: `${block.title} (Copy)`,
        content: block.content,
        type: block.type,
        tags: [...block.tags],
        categories: [...block.categories],
      });
      // TODO: Add success notification
    } catch (error) {
      console.error('Failed to duplicate block:', error);
      // TODO: Add error notification
    }
  }, [onBlockCreate]);

  const handleCreateBlock = useCallback(async (blockData: CreateBlockRequest) => {
    try {
      await onBlockCreate(blockData);
      setIsCreateModalOpen(false);
      // TODO: Add success notification
    } catch (error) {
      console.error('Failed to create block:', error);
      // TODO: Add error notification
    }
  }, [onBlockCreate]);

  // Handle resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = currentWidthRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX; // Subtract because we're resizing from the left
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
      setWidth(newWidth);
      currentWidthRef.current = newWidth;
      localStorage.setItem('blockLibraryWidth', newWidth.toString());
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      // Final save to ensure it's persisted
      localStorage.setItem('blockLibraryWidth', currentWidthRef.current.toString());
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minWidth, maxWidth]);

  // Load saved width on mount
  useEffect(() => {
    const saved = localStorage.getItem('blockLibraryWidth');
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

  return (
    <div 
      ref={containerRef}
      className={`bg-gray-800 flex flex-col relative group h-full ${
        disableResize ? 'flex-1' : 'border-l border-gray-700 flex-shrink-0'
      }`}
      style={disableResize ? {} : { width: `${width}px` }}
    >
      {/* Resize Handle */}
      {!disableResize && (
        <div 
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-all z-10 ${
            isResizing ? 'bg-blue-500' : 'bg-gray-600 hover:bg-blue-500 opacity-0 group-hover:opacity-100'
          }`}
          onMouseDown={handleMouseDown}
        ></div>
      )}
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Block Library</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-2 text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
            title="Create new block"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchFilters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400"
          />
        </div>

        {/* Filter Toggle and Active Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded transition-colors ${
              showFilters || selectedTags.length > 0 || selectedCategories.length > 0 
                ? 'text-blue-400 bg-gray-700' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
            title="Toggle filters"
          >
            <FunnelIcon className="w-4 h-4" />
          </button>
          
          {/* Active Category Filters */}
          {selectedCategories.map(category => (
            <span
              key={category}
              className="px-2 py-0.5 text-xs bg-blue-900/30 text-blue-300 rounded-full flex-shrink-0 whitespace-nowrap flex items-center gap-1"
            >
              {category}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryToggle(category);
                }}
                className="hover:text-blue-100 transition-colors"
                title={`Remove ${category} filter`}
              >
                ×
              </button>
            </span>
          ))}
          
          {/* Active Tag Filters */}
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full flex-shrink-0 whitespace-nowrap flex items-center gap-1"
            >
              #{tag}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagToggle(tag);
                }}
                className="hover:text-gray-100 transition-colors"
                title={`Remove ${tag} filter`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-600 space-y-3">
            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <TagIcon className="w-4 h-4 inline mr-1" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Filter */}
            {allCategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  <Squares2X2Icon className="w-4 h-4 inline mr-1" />
                  Categories
                </label>
                <div className="flex flex-wrap gap-1">
                  {allCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategoryToggle(category)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        selectedCategories.includes(category)
                          ? 'bg-green-600 text-white border-green-500'
                          : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(selectedTags.length > 0 || selectedCategories.length > 0 || searchFilters.search) && (
              <button
                onClick={handleClearFilters}
                className="w-full px-3 py-2 text-sm text-gray-300 border border-gray-600 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drop Zone for Canvas Blocks */}
      <div
        ref={setNodeRef}
        className={`transition-colors ${
          isOver ? 'bg-red-900/50 border-red-700' : ''
        }`}
      >
        {isOver && (
          <div className="p-3 text-center text-red-400 text-sm border-b border-red-700">
            Drop here to remove from canvas
          </div>
        )}
      </div>

      {/* Blocks List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-4 text-center text-gray-400">
            Loading blocks...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-400">
            <p className="mb-2">Error loading blocks:</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-2 px-3 py-1 text-sm bg-red-900/50 text-red-400 rounded hover:bg-red-900/70 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : sortedBlocks.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <div className="mb-2">No blocks found</div>
            <div className="text-sm">
              {searchFilters.search || selectedTags.length > 0 || selectedCategories.length > 0
                ? 'Try adjusting your filters'
                : 'Create your first block to get started'
              }
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {sortedBlocks.map(block => (
              <BlockLibraryItem
                key={block.id}
                block={block}
                isExpanded={expandedBlocks.has(block.id)}
                onToggleExpand={() => handleToggleExpand(block.id)}
                onEdit={(updates) => handleBlockEdit(block, updates)}
                onDuplicate={() => handleBlockDuplicate(block)}
                onDelete={() => handleBlockDelete(block.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="p-3 border-t border-gray-700 bg-gray-800 text-sm text-gray-400">
        {isLoading ? (
          'Loading...'
        ) : (
          `${sortedBlocks.length} of ${blocks.length} blocks`
        )}
      </div>

      {/* Create Block Modal */}
      {isCreateModalOpen && (
        <CreateBlockModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateBlock}
          availableTags={allTags}
          availableCategories={allCategories}
        />
      )}
    </div>
  );
}