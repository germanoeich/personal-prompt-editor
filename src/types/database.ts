export interface Block {
  id: number;
  title: string;
  content: string;
  type: 'preset';
  tags: string[] | null;
  categories: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface BlockVersion {
  id: number;
  block_id: number;
  content: string;
  version_number: number;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: number;
  title: string;
  content_snapshot: string;
  tags: string[] | null;
  categories: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  content_snapshot: string;
  version_number: number;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: number;
  prompt_version_id: number;
  category: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface RatingCategory {
  id: number;
  name: string;
  description: string | null;
  order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBlockData {
  title: string;
  content: string;
  type: 'preset';
  tags?: string[];
  categories?: string[];
}

export interface UpdateBlockData {
  title?: string;
  content?: string;
  tags?: string[];
  categories?: string[];
}

export interface CreatePromptData {
  title: string;
  content_snapshot: string;
  tags?: string[];
  categories?: string[];
}

export interface UpdatePromptData {
  title?: string;
  content_snapshot?: string;
  tags?: string[];
  categories?: string[];
}

export interface CreateRatingData {
  prompt_version_id: number;
  category: string;
  score: number;
}