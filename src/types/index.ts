// Core data types matching the database schema
export interface Block {
  id: number;
  title: string;
  content: string;
  type: 'preset' | 'one-off';
  tags: string[];
  categories: string[];
  variables: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
  current_version: number;
}

export interface BlockVersion {
  id: number;
  block_id: number;
  version_number: number;
  title: string;
  content: string;
  variables: string[];
  created_at: string;
}

export interface Prompt {
  id: number;
  title: string;
  content_snapshot: string;
  block_composition: CanvasBlock[];
  tags: string[];
  categories: string[];
  variables: Record<string, string>;
  created_at: string;
  updated_at: string;
  current_version: number;
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  version_number: number;
  title: string;
  content_snapshot: string;
  block_composition: CanvasBlock[];
  variables: Record<string, string>;
  created_at: string;
}

export interface RatingCategory {
  id: number;
  name: string;
  description: string;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: number;
  prompt_id: number;
  prompt_version_id: number;
  category_id: number;
  category_name: string;
  category_description: string;
  score: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

// UI-specific types
export interface CanvasBlock extends Block {
  enabled: boolean;
  canvasId: string;
  position?: { x: number; y: number };
}

// New types for text-editor approach
export interface PromptElement {
  id: string;
  type: 'block' | 'text';
  order: number;
}

export interface PromptTextElement extends PromptElement {
  type: 'text';
  content: string;
}

export interface PromptBlockElement extends PromptElement {
  type: 'block';
  blockId: number;
  blockType: 'preset' | 'one-off';
  originalBlock?: Block;
  isOverridden: boolean;
  overrideContent?: string;
}

export type PromptContent = (PromptTextElement | PromptBlockElement)[];

export interface DragItem {
  type: 'block';
  block: Block;
}

export interface DropResult {
  dropEffect: string;
  target?: string;
}

// Form types
export interface BlockFormData {
  title: string;
  content: string;
  type: 'preset' | 'one-off';
  tags: string[];
  categories: string[];
}

export interface PromptFormData {
  title: string;
  tags: string[];
  categories: string[];
  variables: Record<string, string>;
}

export interface VariableValidation {
  isValid: boolean;
  errors: string[];
  missingVariables: string[];
  unusedVariables: string[];
}

// Search and filter types
export interface SearchFilters {
  search: string;
  tags: string[];
  categories: string[];
  type?: 'preset' | 'one-off';
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
}

// UI state types
export interface AppState {
  canvasBlocks: CanvasBlock[];
  selectedBlock: CanvasBlock | null;
  isEditMode: boolean;
  showPreview: boolean;
  variables: Record<string, string>;
  currentPrompt: Prompt | null;
  searchFilters: SearchFilters;
  sortOption: SortOption;
}

export interface BlockLibraryState {
  blocks: Block[];
  isLoading: boolean;
  error: string | null;
  searchFilters: SearchFilters;
  expandedBlocks: Set<number>;
}

export interface PromptLibraryState {
  prompts: Prompt[];
  isLoading: boolean;
  error: string | null;
  searchFilters: SearchFilters;
  selectedPrompt: Prompt | null;
}

// API types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateBlockRequest {
  title: string;
  content: string;
  type: 'preset' | 'one-off';
  tags?: string[];
  categories?: string[];
}

export interface UpdateBlockRequest {
  title?: string;
  content?: string;
  tags?: string[];
  categories?: string[];
}

export interface CreatePromptRequest {
  title: string;
  blockComposition: CanvasBlock[];
  tags?: string[];
  categories?: string[];
  variables?: Record<string, string>;
}

export interface UpdatePromptRequest {
  title?: string;
  blockComposition?: CanvasBlock[];
  tags?: string[];
  categories?: string[];
  variables?: Record<string, string>;
}

export interface CreateRatingRequest {
  promptId: number;
  promptVersionId: number;
  categoryId: number;
  score: number;
  notes?: string;
}

// Keyboard shortcuts
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

// Export/Import types
export interface ExportData {
  version: string;
  timestamp: string;
  blocks: Block[];
  prompts: Prompt[];
  ratingCategories: RatingCategory[];
}

export interface ImportResult {
  imported: {
    blocks: number;
    prompts: number;
    categories: number;
  };
  skipped: {
    blocks: number;
    prompts: number;
    categories: number;
  };
  errors: string[];
}

// Validation types
export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export interface FieldValidation {
  isValid: boolean;
  errors: string[];
}

export interface FormValidation {
  isValid: boolean;
  fields: Record<string, FieldValidation>;
}