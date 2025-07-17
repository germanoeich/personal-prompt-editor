import { PromptContent, PromptTextElement, PromptBlockElement } from '@/types';
import { extractVariables } from './variables';
import { generateElementId } from './utils';

/**
 * Escape special characters in text content to prevent parsing conflicts
 */
function escapeTextContent(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Unescape text content back to original form
 */
function unescapeTextContent(text: string): string {
  return text
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Convert PromptContent to text format for storage
 * Format:
 * - Text blocks: <text>escaped content</text>
 * - Preset blocks: <block id={blockId} />
 * - Overridden blocks: <block id={blockId}>escaped override content</block>
 */
export function convertPromptContentToText(content: PromptContent): string {
  if (!content || content.length === 0) return '';

  const sortedContent = [...content].sort((a, b) => a.order - b.order);
  
  const textParts: string[] = [];
  
  sortedContent.forEach(element => {
    if (element.type === 'text') {
      // Text blocks with proper escaping
      const textElement = element as PromptTextElement;
      if (textElement.content.trim()) {
        const escapedContent = escapeTextContent(textElement.content);
        textParts.push(`<text>${escapedContent}</text>`);
      }
    } else if (element.type === 'block') {
      // Preset blocks
      const blockElement = element as PromptBlockElement;
      
      if (blockElement.isOverridden && blockElement.overrideContent) {
        // Overridden block with escaped content: <block id={blockId}>escaped override content</block>
        const escapedContent = escapeTextContent(blockElement.overrideContent);
        textParts.push(`<block id="${blockElement.blockId}">${escapedContent}</block>`);
      } else {
        // Regular block: <block id={blockId} />
        textParts.push(`<block id="${blockElement.blockId}" />`);
      }
    }
  });
  
  return textParts.join('\n\n');
}

/**
 * Parse text format back to PromptContent
 */
export function parseTextToPromptContent(text: string): PromptContent {
  if (!text || text.trim() === '') return [];

  const content: PromptContent = [];
  let order = 0;
  
  // Split by double newlines to get sections
  const sections = text.split(/\n\n+/);
  
  sections.forEach(section => {
    const trimmedSection = section.trim();
    if (!trimmedSection) return;
    
    // Check if it's a text tag
    const textMatch = trimmedSection.match(/^<text>([\s\S]*?)<\/text>$/);
    
    // Check if it's a block tag
    const blockMatch = trimmedSection.match(/^<block\s+id="?(\d+)"?\s*\/?>$/);
    const blockWithContentMatch = trimmedSection.match(/^<block\s+id="?(\d+)"?\s*>([\s\S]*?)<\/block>$/);
    
    if (textMatch) {
      // Text tag: <text>content</text>
      const textContent = unescapeTextContent(textMatch[1]);
      const textElement: PromptTextElement = {
        id: generateElementId('text'),
        type: 'text',
        order: order++,
        content: textContent,
      };
      content.push(textElement);
    } else if (blockMatch) {
      // Self-closing block tag: <block id="123" />
      const blockId = parseInt(blockMatch[1]);
      const blockElement: PromptBlockElement = {
        id: generateElementId('block'),
        type: 'block',
        order: order++,
        blockId,
        blockType: 'preset',
        isOverridden: false,
        overrideContent: undefined,
      };
      content.push(blockElement);
    } else if (blockWithContentMatch) {
      // Block with content: <block id="123">content</block>
      const blockId = parseInt(blockWithContentMatch[1]);
      const overrideContent = unescapeTextContent(blockWithContentMatch[2]);
      
      const blockElement: PromptBlockElement = {
        id: generateElementId('block'),
        type: 'block',
        order: order++,
        blockId,
        blockType: 'preset',
        isOverridden: true,
        overrideContent,
      };
      content.push(blockElement);
    } else {
      // Fallback for legacy format or unrecognized content - treat as plain text
      console.warn('Unrecognized content format, treating as plain text:', trimmedSection);
      const textElement: PromptTextElement = {
        id: generateElementId('text'),
        type: 'text',
        order: order++,
        content: trimmedSection,
      };
      content.push(textElement);
    }
  });
  
  return content;
}

/**
 * Extract all variables from PromptContent
 */
export function extractVariablesFromPromptContent(content: PromptContent): string[] {
  const variables: string[] = [];
  
  content.forEach(element => {
    let textToAnalyze = '';
    
    if (element.type === 'text') {
      textToAnalyze = element.content;
    } else if (element.type === 'block') {
      const blockElement = element as PromptBlockElement;
      if (blockElement.isOverridden && blockElement.overrideContent) {
        textToAnalyze = blockElement.overrideContent;
      } else if (blockElement.originalBlock) {
        textToAnalyze = blockElement.originalBlock.content;
      }
    }
    
    if (textToAnalyze) {
      const elementVariables = extractVariables(textToAnalyze);
      elementVariables.forEach(variable => {
        if (!variables.includes(variable)) {
          variables.push(variable);
        }
      });
    }
  });
  
  return variables;
}

/**
 * Generate a content snapshot for preview/display
 */
export function generateContentSnapshot(
  content: PromptContent, 
  variables: Record<string, string> = {}
): string {
  const sortedContent = [...content].sort((a, b) => a.order - b.order);
  
  const textParts: string[] = [];
  
  sortedContent.forEach(element => {
    if (element.type === 'text') {
      const textElement = element as PromptTextElement;
      if (textElement.content.trim()) {
        textParts.push(replaceVariablesInText(textElement.content, variables));
      }
    } else if (element.type === 'block') {
      const blockElement = element as PromptBlockElement;
      
      let blockContent = '';
      if (blockElement.isOverridden && blockElement.overrideContent) {
        blockContent = blockElement.overrideContent;
        
        // Handle {{originalText}} replacement
        if (blockContent.includes('{{originalText}}') && blockElement.originalBlock) {
          blockContent = blockContent.replace(
            /\{\{originalText\}\}/g,
            blockElement.originalBlock.content
          );
        }
      } else if (blockElement.originalBlock) {
        blockContent = blockElement.originalBlock.content;
      }
      
      if (blockContent.trim()) {
        textParts.push(replaceVariablesInText(blockContent, variables));
      }
    }
  });
  
  return textParts.join('\n\n');
}

/**
 * Replace variables in text with their values
 */
function replaceVariablesInText(text: string, variables: Record<string, string>): string {
  let result = text;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

/**
 * Escape special characters for use in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate that a text format is valid
 */
export function validateTextFormat(text: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!text || text.trim() === '') {
    return { isValid: true, errors: [] };
  }
  
  // Check for unclosed block tags
  const blockOpenTags = text.match(/<block\s+id="?\d+"?\s*>/g) || [];
  const blockCloseTags = text.match(/<\/block>/g) || [];
  
  if (blockOpenTags.length !== blockCloseTags.length) {
    errors.push('Mismatched block tags - some blocks are not properly closed');
  }
  
  // Check for unclosed text tags
  const textOpenTags = text.match(/<text>/g) || [];
  const textCloseTags = text.match(/<\/text>/g) || [];
  
  if (textOpenTags.length !== textCloseTags.length) {
    errors.push('Mismatched text tags - some text blocks are not properly closed');
  }
  
  // Check for invalid block IDs
  const blockIds = text.match(/id="?(\d+)"?/g) || [];
  blockIds.forEach(idMatch => {
    const id = idMatch.match(/\d+/)?.[0];
    if (!id || isNaN(parseInt(id))) {
      errors.push(`Invalid block ID: ${idMatch}`);
    }
  });
  
  // Check for malformed block tags
  const malformedBlockTags = text.match(/<block(?![^>]*id=)[^>]*>/g) || [];
  malformedBlockTags.forEach(tag => {
    errors.push(`Block tag missing ID: ${tag}`);
  });
  
  // Check for nested tags (which shouldn't exist in our format)
  const nestedBlocks = text.match(/<block[^>]*>[\s\S]*?<block/g) || [];
  if (nestedBlocks.length > 0) {
    errors.push('Nested block tags detected - blocks cannot be nested');
  }
  
  const nestedText = text.match(/<text>[\s\S]*?<text/g) || [];
  if (nestedText.length > 0) {
    errors.push('Nested text tags detected - text blocks cannot be nested');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Clean up text format by removing extra whitespace and normalizing line breaks
 */
export function cleanTextFormat(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
    .trim();
}

/**
 * Get statistics about a text format
 */
export function getTextFormatStats(text: string): {
  totalBlocks: number;
  overriddenBlocks: number;
  textSections: number;
  variables: string[];
  characters: number;
  words: number;
} {
  const selfClosingBlocks = text.match(/<block\s+id="?\d+"?\s*\/>/g) || [];
  const blocksWithContent = text.match(/<block\s+id="?\d+"?\s*>[\s\S]*?<\/block>/g) || [];
  const textBlocks = text.match(/<text>[\s\S]*?<\/text>/g) || [];
  
  const totalBlocks = selfClosingBlocks.length + blocksWithContent.length;
  const overriddenBlocks = blocksWithContent.length;
  const textSections = textBlocks.length;
  
  const variables = extractVariables(text);
  const characters = text.length;
  const words = text.split(/\s+/).filter(word => word.trim()).length;
  
  return {
    totalBlocks,
    overriddenBlocks,
    textSections,
    variables,
    characters,
    words
  };
}

/**
 * Test the escaping functionality (for development/debugging)
 */
export function testEscaping(): void {
  console.log('Testing escaping functionality...');
  
  // Test basic escaping
  const testText = 'This contains <block id="123" /> and <text>some text</text> tags & ampersands';
  const escaped = escapeTextContent(testText);
  const unescaped = unescapeTextContent(escaped);
  
  console.log('Original:', testText);
  console.log('Escaped:', escaped);
  console.log('Unescaped:', unescaped);
  console.log('Round trip successful:', testText === unescaped);
  
  // Test with real content
  const testContent: PromptContent = [
    {
      id: 'text-1',
      type: 'text',
      order: 0,
      content: 'This text contains <block id="123" /> tags and <text>nested text</text> tags that should be escaped'
    },
    {
      id: 'block-1',
      type: 'block',
      order: 1,
      blockId: 123,
      blockType: 'preset',
      isOverridden: false,
      overrideContent: undefined
    },
    {
      id: 'block-2',
      type: 'block',
      order: 2,
      blockId: 456,
      blockType: 'preset',
      isOverridden: true,
      overrideContent: 'This override contains <block> and <text> tags & ampersands'
    }
  ];
  
  const textFormat = convertPromptContentToText(testContent);
  console.log('\nText format:', textFormat);
  
  const parsedContent = parseTextToPromptContent(textFormat);
  console.log('\nParsed content:', parsedContent);
  
  // Verify content preservation
  const originalText = (testContent[0] as PromptTextElement).content;
  const parsedText = (parsedContent[0] as PromptTextElement).content;
  const originalOverride = (testContent[2] as PromptBlockElement).overrideContent;
  const parsedOverride = (parsedContent[2] as PromptBlockElement).overrideContent;
  
  console.log('\nContent preservation:');
  console.log('Text preserved:', originalText === parsedText);
  console.log('Override preserved:', originalOverride === parsedOverride);
}