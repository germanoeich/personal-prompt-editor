'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { extractVariables } from '@/lib/variables';

interface CreateBlockModalProps {
  onClose: () => void;
  onCreate: (blockData: any) => void;
  availableTags: string[];
  availableCategories: string[];
  prefillData?: {
    title?: string;
    content?: string;
    tags?: string[];
    categories?: string[];
  };
}

export function CreateBlockModal({
  onClose,
  onCreate,
  availableTags,
  availableCategories,
  prefillData,
}: CreateBlockModalProps) {
  const [formData, setFormData] = useState({
    title: prefillData?.title || '',
    content: prefillData?.content || '',
    tags: prefillData?.tags?.join(', ') || '',
    categories: prefillData?.categories?.join(', ') || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus title input when modal opens
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  // Handle escape key and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const categories = formData.categories
        .split(',')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0);

      await onCreate({
        title: formData.title.trim(),
        content: formData.content,
        type: 'preset', // All created blocks are preset blocks
        tags,
        categories,
      });
    } catch (error) {
      console.error('Failed to create block:', error);
      // TODO: Add error notification
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Extract variables from content
  const variables = extractVariables(formData.content);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Create New Preset Block</h2>
            <p className="text-sm text-gray-400 mt-1">Create a reusable block that can be used across prompts</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Title *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 ${
                errors.title ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Enter block title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className={`w-full h-32 px-3 py-2 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white placeholder-gray-400 ${
                errors.content ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Enter block content. Use {{variable}} for placeholders..."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-400">{errors.content}</p>
            )}
            
            {/* Variables preview */}
            {variables.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-300 mb-1">Detected variables:</p>
                <div className="flex flex-wrap gap-1">
                  {variables.map((variable, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-yellow-900/30 text-yellow-300 rounded border border-yellow-500/30"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              placeholder="e.g., system, role, identity"
            />
            
            {/* Available tags */}
            {availableTags.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-300 mb-1">Available tags:</p>
                <div className="flex flex-wrap gap-1">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const currentTags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
                        if (!currentTags.includes(tag)) {
                          const newTags = [...currentTags, tag].join(', ');
                          handleInputChange('tags', newTags);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600 hover:bg-gray-600 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Categories (comma-separated)
            </label>
            <input
              type="text"
              value={formData.categories}
              onChange={(e) => handleInputChange('categories', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              placeholder="e.g., AI Behavior, Foundation"
            />
            
            {/* Available categories */}
            {availableCategories.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-300 mb-1">Available categories:</p>
                <div className="flex flex-wrap gap-1">
                  {availableCategories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        const currentCategories = formData.categories.split(',').map(c => c.trim()).filter(c => c);
                        if (!currentCategories.includes(category)) {
                          const newCategories = [...currentCategories, category].join(', ');
                          handleInputChange('categories', newCategories);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-blue-900/30 text-blue-300 rounded border border-blue-500/30 hover:bg-blue-900/50 transition-colors"
                    >
                      + {category}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Preset Block'}
          </button>
        </div>
      </div>
    </div>
  );
}