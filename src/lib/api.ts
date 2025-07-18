import { 
  Block, 
  Prompt, 
  CreatePromptRequest, 
  UpdatePromptRequest, 
  CreateBlockRequest, 
  UpdateBlockRequest,
  ApiResponse 
} from '@/types';

const API_BASE_URL = '/api';

// Generic API request function
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API request failed:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Block API functions
export const blockAPI = {
  async getAll(filters?: {
    search?: string;
    type?: string;
    tags?: string[];
    categories?: string[];
  }): Promise<ApiResponse<Block[]>> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.tags) params.append('tags', filters.tags.join(','));
    if (filters?.categories) params.append('categories', filters.categories.join(','));

    return apiRequest<Block[]>(`${API_BASE_URL}/blocks?${params}`);
  },

  async getById(id: number): Promise<ApiResponse<Block>> {
    return apiRequest<Block>(`${API_BASE_URL}/blocks/${id}`);
  },

  async create(data: CreateBlockRequest): Promise<ApiResponse<Block>> {
    return apiRequest<Block>(`${API_BASE_URL}/blocks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: UpdateBlockRequest): Promise<ApiResponse<Block>> {
    return apiRequest<Block>(`${API_BASE_URL}/blocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    return apiRequest<void>(`${API_BASE_URL}/blocks/${id}`, {
      method: 'DELETE',
    });
  },
};

// Prompt API functions
export const promptAPI = {
  async getAll(filters?: {
    search?: string;
    tags?: string[];
    categories?: string[];
  }): Promise<ApiResponse<Prompt[]>> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tags) params.append('tags', filters.tags.join(','));
    if (filters?.categories) params.append('categories', filters.categories.join(','));

    return apiRequest<Prompt[]>(`${API_BASE_URL}/prompts?${params}`);
  },

  async getById(id: number): Promise<ApiResponse<Prompt>> {
    return apiRequest<Prompt>(`${API_BASE_URL}/prompts/${id}`);
  },

  async create(data: CreatePromptRequest): Promise<ApiResponse<Prompt>> {
    return apiRequest<Prompt>(`${API_BASE_URL}/prompts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: UpdatePromptRequest): Promise<ApiResponse<Prompt>> {
    return apiRequest<Prompt>(`${API_BASE_URL}/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    return apiRequest<void>(`${API_BASE_URL}/prompts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Rating Categories API functions
export const ratingCategoryAPI = {
  async getAll(): Promise<ApiResponse<any[]>> {
    return apiRequest<any[]>(`${API_BASE_URL}/rating-categories`);
  },

  async create(data: { name: string; description?: string }): Promise<ApiResponse<any>> {
    return apiRequest<any>(`${API_BASE_URL}/rating-categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Ratings API functions
export const ratingAPI = {
  async getAll(promptId: number): Promise<ApiResponse<any[]>> {
    return apiRequest<any[]>(`${API_BASE_URL}/ratings?promptId=${promptId}`);
  },

  async create(data: {
    promptId: number;
    promptVersionId: number;
    categoryId: number;
    score: number;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return apiRequest<any>(`${API_BASE_URL}/ratings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Utility functions
export const utilityAPI = {
  async seed(): Promise<ApiResponse<void>> {
    return apiRequest<void>(`${API_BASE_URL}/seed`, {
      method: 'POST',
    });
  },
};

// Helper functions for common operations
export const apiHelpers = {
  async savePromptFromContent(
    promptContent: any[],
    variables: Record<string, string>,
    title: string,
    tags: string[] = [],
    categories: string[] = []
  ): Promise<ApiResponse<Prompt>> {
    const { convertPromptContentToText } = await import('./prompt-conversion');
    
    const contentText = convertPromptContentToText(promptContent);
    
    const data: CreatePromptRequest = {
      title,
      contentText,
      tags,
      categories,
      variables,
    };

    return promptAPI.create(data);
  },

  async updatePromptFromContent(
    promptId: number,
    promptContent: any[],
    variables: Record<string, string>,
    title?: string,
    tags?: string[],
    categories?: string[]
  ): Promise<ApiResponse<Prompt>> {
    const { convertPromptContentToText } = await import('./prompt-conversion');
    
    const contentText = convertPromptContentToText(promptContent);
    
    const data: UpdatePromptRequest = {
      contentText,
      variables,
    };

    if (title) data.title = title;
    if (tags) data.tags = tags;
    if (categories) data.categories = categories;

    return promptAPI.update(promptId, data);
  },

  async loadPromptAsContent(promptId: number): Promise<{
    promptContent: any[];
    variables: Record<string, string>;
    prompt: Prompt;
  } | null> {
    const response = await promptAPI.getById(promptId);
    
    if (response.error || !response.data) {
      console.error('Failed to load prompt:', response.error);
      return null;
    }

    const prompt = response.data;
    
    // If we have content_text, use that
    if (prompt.content_text) {
      const { parseTextToPromptContent } = await import('./prompt-conversion');
      const promptContent = parseTextToPromptContent(prompt.content_text);
      
      // Fetch block data for any block elements
      const blockElements = promptContent.filter(el => el.type === 'block');
      if (blockElements.length > 0) {
        const blockIds = [...new Set(blockElements.map(el => el.blockId))];
        const blockPromises = blockIds.map(id => blockAPI.getById(id));
        const blockResponses = await Promise.all(blockPromises);
        
        // Create a map of block ID to block data
        const blockMap = new Map();
        blockResponses.forEach((blockResponse, index) => {
          if (blockResponse.data) {
            blockMap.set(blockIds[index], blockResponse.data);
          }
        });
        
        // Populate originalBlock for each block element
        blockElements.forEach(element => {
          const blockData = blockMap.get(element.blockId);
          if (blockData) {
            element.originalBlock = blockData;
          }
        });
      }
      
      return {
        promptContent,
        variables: prompt.variables,
        prompt,
      };
    }

    // All prompts should have content_text now
    console.error('Prompt missing content_text field');
    return null;
  },
};