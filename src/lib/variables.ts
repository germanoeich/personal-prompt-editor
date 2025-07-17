/**
 * Extract variable names from text content that contains {{variable}} placeholders
 */
export function extractVariables(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(content)) !== null) {
    const variableName = match[1].trim();
    if (!variables.includes(variableName)) {
      variables.push(variableName);
    }
  }
  
  return variables;
}

/**
 * Replace variables in content with provided values
 */
export function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

/**
 * Get all variables from multiple content blocks
 */
export function getAllVariables(contents: string[]): string[] {
  const allVariables: string[] = [];
  
  contents.forEach(content => {
    const variables = extractVariables(content);
    variables.forEach(variable => {
      if (!allVariables.includes(variable)) {
        allVariables.push(variable);
      }
    });
  });
  
  return allVariables;
}

/**
 * Validate that all variables in content have values provided
 */
export function validateVariables(content: string, variables: Record<string, string>): {
  isValid: boolean;
  missingVariables: string[];
} {
  const requiredVariables = extractVariables(content);
  const missingVariables = requiredVariables.filter(variable => 
    !variables.hasOwnProperty(variable) || variables[variable] === ''
  );
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
}