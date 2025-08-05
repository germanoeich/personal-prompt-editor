'use client';

import { useState, useCallback } from 'react';
import { 
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  StarIcon,
  ClockIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Prompt } from '@/types';

interface SidebarPromptsPanelProps {
  prompts: Prompt[];
  onPromptSelect?: (prompt: Prompt) => void;
  onPromptDelete?: (promptId: number) => void;
  onPromptLoad?: (prompt: Prompt) => void;
}

export function SidebarPromptsPanel({
  prompts,
  onPromptDelete,
  onPromptLoad,
}: SidebarPromptsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'usage' | 'name'>('recent');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Use real prompts data
  const displayPrompts = prompts.map(prompt => ({
    id: prompt.id.toString(),
    title: prompt.title,
    description: prompt.content_snapshot.substring(0, 100) + (prompt.content_snapshot.length > 100 ? '...' : ''),
    lastModified: new Date(prompt.updated_at),
    isFavorite: false, // TODO: Add favorites support
    tags: prompt.tags || [],
    usage: 0, // TODO: Add usage tracking
    prompt: prompt, // Store the full prompt object
  }));

  const filteredPrompts = displayPrompts
    .filter(prompt => {
      const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           prompt.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFavorites = !showFavoritesOnly || prompt.isFavorite;
      return matchesSearch && matchesFavorites;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.lastModified.getTime() - a.lastModified.getTime();
        case 'usage':
          return b.usage - a.usage;
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const handlePromptLoad = useCallback(async (prompt: Prompt) => {
    if (onPromptLoad) {
      await onPromptLoad(prompt);
    }
  }, [onPromptLoad]);

  const handlePromptClick = useCallback((prompt: Prompt) => {
    if (onPromptLoad) {
      handlePromptLoad(prompt);
    }
  }, [onPromptLoad, handlePromptLoad]);

  const handleMenuClick = useCallback((e: React.MouseEvent, promptId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === promptId ? null : promptId);
  }, [openMenuId]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-3 border-b border-gray-700 space-y-2 flex-shrink-0">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-600 bg-gray-700 text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'usage' | 'name')}
            className="text-xs border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="recent">Recent</option>
            <option value="usage">Most Used</option>
            <option value="name">Name</option>
          </select>
          
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`p-1.5 rounded transition-colors ${
              showFavoritesOnly 
                ? 'text-yellow-400 bg-yellow-900/20' 
                : 'text-gray-400 hover:text-yellow-400'
            }`}
            title="Show favorites only"
          >
            {showFavoritesOnly ? (
              <StarIconSolid className="w-4 h-4" />
            ) : (
              <StarIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Prompts List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredPrompts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-sm">
              {searchTerm ? 'No prompts match your search' : 'No prompts found'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {searchTerm ? 'Try a different search term' : 'Create your first prompt to get started'}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredPrompts.map(prompt => (
              <div
                key={prompt.id}
                className="relative p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-all duration-200 border border-transparent hover:border-blue-500/50 hover:shadow-lg"
                onClick={() => handlePromptClick(prompt.prompt)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {prompt.isFavorite && (
                      <StarIconSolid className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                    )}
                    <h3 className="text-sm font-medium text-white truncate">
                      {prompt.title}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => handleMenuClick(e, prompt.id)}
                    className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    <EllipsisVerticalIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-400 mb-2 overflow-hidden" style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const
                }}>
                  {prompt.description}
                </p>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    <span>{formatDate(prompt.lastModified)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {prompt.tags.length > 0 && (
                      <div className="flex gap-1">
                        {prompt.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Context Menu */}
                {openMenuId === prompt.id && (
                  <div className="absolute right-2 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement duplicate functionality
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <DocumentDuplicateIcon className="w-3 h-3" />
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPromptDelete) {
                          onPromptDelete(parseInt(prompt.id));
                        }
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <TrashIcon className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}