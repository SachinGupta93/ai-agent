// services/codingAssistant.ts
import { multiModelRouter, TaskContext } from './multiModelRouter';
import { webSearchService } from './webSearchService';
import { automationService } from './automationService';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CodeAnalysis {
  language: string;
  complexity: 'simple' | 'medium' | 'complex';
  issues: CodeIssue[];
  suggestions: string[];
  dependencies: string[];
  testCoverage?: number;
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'suggestion';
  line?: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  fix?: string;
}

export interface CodeGenerationRequest {
  description: string;
  language: string;
  framework?: string;
  style?: 'functional' | 'oop' | 'mixed';
  includeTests?: boolean;
  includeComments?: boolean;
}

export class CodingAssistant {
  private supportedLanguages = [
    'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go', 
    'rust', 'php', 'ruby', 'swift', 'kotlin', 'dart', 'html', 'css', 'sql'
  ];

  async generateCode(request: CodeGenerationRequest): Promise<string> {
    const context: TaskContext = {
      type: 'coding',
      complexity: 'medium',
      urgency: 'medium',
      domain: request.language
    };

    const prompt = this.buildCodeGenerationPrompt(request);
    const messages = [new HumanMessage(prompt)];

    const result = await multiModelRouter.executeTask(messages, context);
    return result.response;
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const context: TaskContext = {
      type: 'analytical',
      complexity: 'medium',
      urgency: 'low',
      domain: language
    };

    const prompt = `Analyze this ${language} code and provide a detailed analysis:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Code complexity assessment
2. Potential issues or bugs
3. Performance suggestions
4. Best practice recommendations
5. Security considerations
6. Dependencies identified

Format your response as JSON with the following structure:
{
  "complexity": "simple|medium|complex",
  "issues": [{"type": "error|warning|suggestion", "line": number, "message": "description", "severity": "low|medium|high", "fix": "suggested fix"}],
  "suggestions": ["suggestion1", "suggestion2"],
  "dependencies": ["dep1", "dep2"],
  "securityConcerns": ["concern1", "concern2"]
}`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);

    try {
      const analysis = JSON.parse(result.response);
      return {
        language,
        complexity: analysis.complexity || 'medium',
        issues: analysis.issues || [],
        suggestions: analysis.suggestions || [],
        dependencies: analysis.dependencies || []
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        language,
        complexity: 'medium',
        issues: [],
        suggestions: [result.response],
        dependencies: []
      };
    }
  }

  async debugCode(code: string, error: string, language: string): Promise<string> {
    const context: TaskContext = {
      type: 'coding',
      complexity: 'complex',
      urgency: 'high',
      domain: language
    };

    // Search for similar errors online
    const searchResults = await webSearchService.searchCode(`${language} ${error}`, language);
    const searchContext = searchResults.slice(0, 3).map(r => 
      `${r.title}: ${r.snippet}`
    ).join('\n\n');

    const prompt = `Debug this ${language} code that's producing an error:

**Code:**
\`\`\`${language}
${code}
\`\`\`

**Error:**
${error}

**Similar issues found online:**
${searchContext}

Please provide:
1. Root cause analysis
2. Step-by-step fix
3. Corrected code
4. Prevention tips for similar issues

Focus on practical, working solutions.`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);
    
    return result.response;
  }

  async optimizeCode(code: string, language: string, optimizationType: 'performance' | 'readability' | 'memory' = 'performance'): Promise<string> {
    const context: TaskContext = {
      type: 'coding',
      complexity: 'medium',
      urgency: 'low',
      domain: language
    };

    const prompt = `Optimize this ${language} code for ${optimizationType}:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Optimized version of the code
2. Explanation of changes made
3. Performance/readability improvements achieved
4. Any trade-offs to consider

Focus on ${optimizationType} optimization while maintaining functionality.`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);
    
    return result.response;
  }

  async generateTests(code: string, language: string, testFramework?: string): Promise<string> {
    const context: TaskContext = {
      type: 'coding',
      complexity: 'medium',
      urgency: 'medium',
      domain: language
    };

    const framework = testFramework || this.getDefaultTestFramework(language);

    const prompt = `Generate comprehensive unit tests for this ${language} code using ${framework}:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Complete test suite with multiple test cases
2. Edge case testing
3. Mock data where needed
4. Setup and teardown if required
5. Comments explaining test scenarios

Ensure high test coverage and follow ${framework} best practices.`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);
    
    return result.response;
  }

  async explainCode(code: string, language: string, audienceLevel: 'beginner' | 'intermediate' | 'expert' = 'intermediate'): Promise<string> {
    const context: TaskContext = {
      type: 'conversational',
      complexity: 'simple',
      urgency: 'low',
      domain: language
    };

    const prompt = `Explain this ${language} code for a ${audienceLevel} programmer:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. High-level overview of what the code does
2. Step-by-step breakdown of key parts
3. Explanation of important concepts used
4. Purpose of each function/class/method
5. How different parts work together

Adjust the technical depth for a ${audienceLevel} audience.`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);
    
    return result.response;
  }

  async refactorCode(code: string, language: string, refactorGoal: string): Promise<string> {
    const context: TaskContext = {
      type: 'coding',
      complexity: 'complex',
      urgency: 'medium',
      domain: language
    };

    const prompt = `Refactor this ${language} code with the goal: ${refactorGoal}

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Refactored code
2. Explanation of changes made
3. Benefits of the refactoring
4. Any potential risks or considerations
5. Migration steps if needed

Ensure the refactored code maintains the same functionality while achieving: ${refactorGoal}`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);
    
    return result.response;
  }

  async generateDocumentation(code: string, language: string, docType: 'api' | 'readme' | 'inline' = 'api'): Promise<string> {
    const context: TaskContext = {
      type: 'conversational',
      complexity: 'medium',
      urgency: 'low',
      domain: language
    };

    const prompt = `Generate ${docType} documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Please provide:
${docType === 'api' ? `
1. API reference with all methods/functions
2. Parameters and return types
3. Usage examples
4. Error handling information` : docType === 'readme' ? `
1. Project overview and purpose
2. Installation instructions
3. Usage examples
4. Configuration options
5. Contributing guidelines` : `
1. Inline comments explaining complex logic
2. Function/method documentation
3. Class/module descriptions
4. Parameter explanations`}

Follow ${language} documentation conventions and best practices.`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);
    
    return result.response;
  }

  async reviewCode(code: string, language: string): Promise<string> {
    const context: TaskContext = {
      type: 'analytical',
      complexity: 'complex',
      urgency: 'medium',
      domain: language
    };

    const prompt = `Perform a comprehensive code review for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Please provide a detailed review covering:
1. **Code Quality**: Structure, readability, maintainability
2. **Best Practices**: Adherence to ${language} conventions
3. **Performance**: Potential bottlenecks and optimizations
4. **Security**: Vulnerabilities and security concerns
5. **Testing**: Testability and test coverage suggestions
6. **Documentation**: Code clarity and documentation needs
7. **Refactoring**: Specific improvement recommendations

Rate each area (1-10) and provide actionable feedback.`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);
    
    return result.response;
  }

  // Project-level operations
  async analyzeProject(projectPath: string): Promise<string> {
    try {
      const files = await this.getProjectFiles(projectPath);
      const analysis = await this.analyzeProjectStructure(files);
      
      const context: TaskContext = {
        type: 'analytical',
        complexity: 'complex',
        urgency: 'low'
      };

      const prompt = `Analyze this project structure and provide insights:

**Project Files:**
${files.map(f => `- ${f.path} (${f.language})`).join('\n')}

**File Contents Summary:**
${analysis}

Please provide:
1. Project architecture assessment
2. Technology stack analysis
3. Code quality overview
4. Potential improvements
5. Security considerations
6. Performance optimization opportunities
7. Recommended next steps`;

      const messages = [new HumanMessage(prompt)];
      const result = await multiModelRouter.executeTask(messages, context);
      
      return result.response;
    } catch (error: any) {
      throw new Error(`Failed to analyze project: ${error.message}`);
    }
  }

  private buildCodeGenerationPrompt(request: CodeGenerationRequest): string {
    return `Generate ${request.language} code based on this description:

**Requirements:** ${request.description}
${request.framework ? `**Framework:** ${request.framework}` : ''}
${request.style ? `**Style:** ${request.style}` : ''}

Please provide:
1. Clean, well-structured code
2. Proper error handling
3. Clear variable/function names
4. ${request.includeComments ? 'Detailed comments explaining the logic' : 'Minimal but necessary comments'}
${request.includeTests ? '5. Basic unit tests' : ''}

Follow ${request.language} best practices and conventions.`;
  }

  private getDefaultTestFramework(language: string): string {
    const frameworks: { [key: string]: string } = {
      javascript: 'Jest',
      typescript: 'Jest',
      python: 'pytest',
      java: 'JUnit',
      csharp: 'NUnit',
      go: 'testing',
      rust: 'built-in test',
      php: 'PHPUnit',
      ruby: 'RSpec'
    };
    
    return frameworks[language.toLowerCase()] || 'appropriate testing framework';
  }

  private async getProjectFiles(projectPath: string): Promise<Array<{path: string, language: string, content: string}>> {
    const files: Array<{path: string, language: string, content: string}> = [];
    
    const readDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !this.shouldIgnoreDirectory(entry.name)) {
          await readDir(fullPath);
        } else if (entry.isFile() && this.isCodeFile(entry.name)) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const language = this.detectLanguage(entry.name);
            files.push({
              path: path.relative(projectPath, fullPath),
              language,
              content: content.slice(0, 2000) // Limit content for analysis
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    };

    await readDir(projectPath);
    return files;
  }

  private shouldIgnoreDirectory(name: string): boolean {
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'];
    return ignoreDirs.includes(name) || name.startsWith('.');
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.js', '.ts', '.py', '.java', '.cs', '.cpp', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  private detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const langMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby'
    };
    
    return langMap[ext] || 'unknown';
  }

  private async analyzeProjectStructure(files: Array<{path: string, language: string, content: string}>): Promise<string> {
    const summary = files.map(file => 
      `**${file.path}** (${file.language}):\n${file.content.slice(0, 200)}...`
    ).join('\n\n');
    
    return summary;
  }
}

export const codingAssistant = new CodingAssistant();