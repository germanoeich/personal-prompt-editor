'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { extractVariables } from '@/lib/variables';

interface CreateBlockModalProps {
  onClose: () => void;
  onCreate: (blockData: any) => void;
  availableTags: string[];
  availableCategories: string[];
}

export function CreateBlockModal({
  onClose,
  onCreate,
  availableTags,
  availableCategories,
}: CreateBlockModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'preset' as 'preset' | 'one-off',
    tags: '',
    categories: '',
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
        type: formData.type,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Block</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter block title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="preset"
                  checked={formData.type === 'preset'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Preset (reusable)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="one-off"
                  checked={formData.type === 'one-off'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">One-off (prompt-specific)</span>
              </label>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className={`w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.content ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter block content. Use {{variable}} for placeholders..."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
            
            {/* Variables preview */}
            {variables.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Detected variables:</p>
                <div className="flex flex-wrap gap-1">
                  {variables.map((variable, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded border"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., system, role, identity"
            />
            
            {/* Available tags */}
            {availableTags.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Available tags:</p>
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
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories (comma-separated)
            </label>
            <input
              type="text"
              value={formData.categories}
              onChange={(e) => handleInputChange('categories', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., AI Behavior, Foundation"
            />
            
            {/* Available categories */}
            {availableCategories.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Available categories:</p>
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
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
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
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Block'}
          </button>
        </div>
      </div>
    </div>
  );
}