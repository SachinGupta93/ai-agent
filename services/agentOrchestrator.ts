// services/agentOrchestrator.ts
import { multiModelRouter, TaskContext } from './multiModelRouter';
import { webSearchService } from './webSearchService';
import { automationService } from './automationService';
import { codingAssistant } from './codingAssistant';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

export interface AgentCapability {
  name: string;
  description: string;
  category: 'search' | 'coding' | 'automation' | 'analysis' | 'creative' | 'system';
  enabled: boolean;
}

export interface AgentRequest {
  message: string;
  context?: {
    currentProject?: string;
    workingDirectory?: string;
    preferences?: any;
  };
  capabilities?: string[];
}

export interface AgentResponse {
  response: string;
  actions?: AgentAction[];
  suggestions?: string[];
  metadata: {
    modelUsed: string;
    executionTime: number;
    cost: number;
    capabilities: string[];
  };
}

export interface AgentAction {
  type: 'search' | 'code' | 'file' | 'command' | 'deploy';
  description: string;
  command?: string;
  parameters?: any;
  result?: any;
}

export class AgentOrchestrator {
  private capabilities: Map<string, AgentCapability> = new Map();
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> = [];

  constructor() {
    this.initializeCapabilities();
  }

  private initializeCapabilities() {
    const capabilities: AgentCapability[] = [
      // Search Capabilities
      { name: 'web_search', description: 'Search the web for information', category: 'search', enabled: true },
      { name: 'code_search', description: 'Search for code examples and documentation', category: 'search', enabled: true },
      { name: 'news_search', description: 'Search for recent news and updates', category: 'search', enabled: true },

      // Coding Capabilities
      { name: 'code_generation', description: 'Generate code from descriptions', category: 'coding', enabled: true },
      { name: 'code_analysis', description: 'Analyze and review code', category: 'coding', enabled: true },
      { name: 'code_debugging', description: 'Debug and fix code issues', category: 'coding', enabled: true },
      { name: 'code_optimization', description: 'Optimize code for performance', category: 'coding', enabled: true },
      { name: 'test_generation', description: 'Generate unit tests', category: 'coding', enabled: true },
      { name: 'documentation', description: 'Generate code documentation', category: 'coding', enabled: true },

      // Automation Capabilities
      { name: 'file_operations', description: 'Create, read, modify files', category: 'automation', enabled: true },
      { name: 'system_commands', description: 'Execute system commands', category: 'automation', enabled: true },
      { name: 'project_management', description: 'Build, test, deploy projects', category: 'automation', enabled: true },
      { name: 'git_operations', description: 'Git version control operations', category: 'automation', enabled: true },

      // Analysis Capabilities
      { name: 'project_analysis', description: 'Analyze project structure and code', category: 'analysis', enabled: true },
      { name: 'performance_analysis', description: 'Analyze system and code performance', category: 'analysis', enabled: true },
      { name: 'security_analysis', description: 'Security vulnerability assessment', category: 'analysis', enabled: true },

      // System Capabilities
      { name: 'system_info', description: 'Get system information', category: 'system', enabled: true },
      { name: 'process_management', description: 'Manage system processes', category: 'system', enabled: true },
      { name: 'browser_automation', description: 'Basic browser automation', category: 'system', enabled: true }
    ];

    capabilities.forEach(cap => this.capabilities.set(cap.name, cap));
  }

  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    
    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: request.message,
      timestamp: new Date()
    });

    // Analyze the request to determine intent and required capabilities
    const intent = await this.analyzeIntent(request.message);
    const requiredCapabilities = this.determineCapabilities(intent, request.capabilities);

    // Execute the request based on intent
    let response: string;
    let actions: AgentAction[] = [];
    let modelUsed: string;
    let cost: number;

    try {
      const result = await this.executeIntent(intent, request, requiredCapabilities);
      response = result.response;
      actions = result.actions || [];
      modelUsed = result.modelUsed;
      cost = result.cost;
    } catch (error: any) {
      response = `I encountered an error while processing your request: ${error.message}`;
      modelUsed = 'error-handler';
      cost = 0;
    }

    // Add response to conversation history
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    // Generate suggestions for follow-up actions
    const suggestions = this.generateSuggestions(intent, actions);

    return {
      response,
      actions,
      suggestions,
      metadata: {
        modelUsed,
        executionTime: Date.now() - startTime,
        cost,
        capabilities: requiredCapabilities
      }
    };
  }

  private async analyzeIntent(message: string): Promise<{
    type: 'search' | 'coding' | 'automation' | 'analysis' | 'creative' | 'conversational' | 'system';
    subtype?: string;
    entities: string[];
    confidence: number;
  }> {
    const context: TaskContext = {
      type: 'analytical',
      complexity: 'simple',
      urgency: 'high'
    };

    const prompt = `Analyze this user request and determine the intent:

"${message}"

Classify the intent and extract key information. Respond with JSON:
{
  "type": "search|coding|automation|analysis|creative|conversational|system",
  "subtype": "specific action type",
  "entities": ["key entities mentioned"],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Examples:
- "Search for React hooks tutorial" → {"type": "search", "subtype": "web_search", "entities": ["React", "hooks", "tutorial"], "confidence": 0.9}
- "Debug this Python code" → {"type": "coding", "subtype": "debugging", "entities": ["Python", "debug"], "confidence": 0.95}
- "Deploy my app to Vercel" → {"type": "automation", "subtype": "deployment", "entities": ["deploy", "Vercel"], "confidence": 0.9}`;

    const messages = [new HumanMessage(prompt)];
    const result = await multiModelRouter.executeTask(messages, context);

    try {
      return JSON.parse(result.response);
    } catch {
      // Fallback intent analysis
      return this.fallbackIntentAnalysis(message);
    }
  }

  private fallbackIntentAnalysis(message: string): any {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look up')) {
      return { type: 'search', subtype: 'web_search', entities: [], confidence: 0.7 };
    }
    
    if (lowerMessage.includes('code') || lowerMessage.includes('program') || lowerMessage.includes('debug')) {
      return { type: 'coding', subtype: 'general', entities: [], confidence: 0.7 };
    }
    
    if (lowerMessage.includes('deploy') || lowerMessage.includes('build') || lowerMessage.includes('run')) {
      return { type: 'automation', subtype: 'deployment', entities: [], confidence: 0.7 };
    }
    
    return { type: 'conversational', subtype: 'general', entities: [], confidence: 0.5 };
  }

  private determineCapabilities(intent: any, requestedCapabilities?: string[]): string[] {
    const capabilities: string[] = [];

    // Add capabilities based on intent
    switch (intent.type) {
      case 'search':
        capabilities.push('web_search');
        if (intent.entities.some((e: string) => ['code', 'programming', 'github'].includes(e.toLowerCase()))) {
          capabilities.push('code_search');
        }
        break;
      
      case 'coding':
        capabilities.push('code_generation', 'code_analysis');
        if (intent.subtype === 'debugging') capabilities.push('code_debugging');
        if (intent.subtype === 'testing') capabilities.push('test_generation');
        if (intent.subtype === 'documentation') capabilities.push('documentation');
        break;
      
      case 'automation':
        capabilities.push('system_commands', 'file_operations');
        if (intent.subtype === 'deployment') capabilities.push('project_management');
        if (intent.entities.some((e: string) => ['git', 'commit', 'push'].includes(e.toLowerCase()))) {
          capabilities.push('git_operations');
        }
        break;
      
      case 'analysis':
        capabilities.push('project_analysis', 'performance_analysis');
        break;
      
      case 'system':
        capabilities.push('system_info', 'process_management');
        break;
    }

    // Add requested capabilities
    if (requestedCapabilities) {
      capabilities.push(...requestedCapabilities.filter(cap => this.capabilities.has(cap)));
    }

    return [...new Set(capabilities)]; // Remove duplicates
  }

  private async executeIntent(intent: any, request: AgentRequest, capabilities: string[]): Promise<{
    response: string;
    actions?: AgentAction[];
    modelUsed: string;
    cost: number;
  }> {
    const actions: AgentAction[] = [];
    let response: string;
    let modelUsed: string;
    let cost = 0;

    switch (intent.type) {
      case 'search':
        const searchResult = await this.handleSearchRequest(request.message, intent);
        response = searchResult.response;
        actions.push(...searchResult.actions);
        modelUsed = 'search-handler';
        break;

      case 'coding':
        const codingResult = await this.handleCodingRequest(request.message, intent, request.context);
        response = codingResult.response;
        actions.push(...codingResult.actions);
        modelUsed = codingResult.modelUsed;
        cost = codingResult.cost;
        break;

      case 'automation':
        const automationResult = await this.handleAutomationRequest(request.message, intent, request.context);
        response = automationResult.response;
        actions.push(...automationResult.actions);
        modelUsed = 'automation-handler';
        break;

      case 'analysis':
        const analysisResult = await this.handleAnalysisRequest(request.message, intent, request.context);
        response = analysisResult.response;
        actions.push(...analysisResult.actions);
        modelUsed = analysisResult.modelUsed;
        cost = analysisResult.cost;
        break;

      default:
        // General conversational response
        const context: TaskContext = {
          type: 'conversational',
          complexity: 'simple',
          urgency: 'medium'
        };

        const conversationContext = this.getConversationContext();
        const messages = [
          new SystemMessage(conversationContext),
          new HumanMessage(request.message)
        ];

        const result = await multiModelRouter.executeTask(messages, context);
        response = result.response;
        modelUsed = result.modelUsed;
        cost = result.cost;
    }

    return { response, actions, modelUsed, cost };
  }

  private async handleSearchRequest(message: string, intent: any): Promise<{
    response: string;
    actions: AgentAction[];
  }> {
    const actions: AgentAction[] = [];
    
    try {
      // Determine search type
      const isCodeSearch = intent.entities.some((e: string) => 
        ['code', 'programming', 'github', 'stackoverflow'].includes(e.toLowerCase())
      );

      let searchResults;
      if (isCodeSearch) {
        const codeLanguage = intent.entities.find((e: string) => 
          ['javascript', 'python', 'java', 'typescript', 'react', 'node'].includes(e.toLowerCase())
        );
        searchResults = await webSearchService.searchCode(message, codeLanguage);
        actions.push({
          type: 'search',
          description: `Searched for code examples: ${message}`,
          parameters: { query: message, type: 'code', language: codeLanguage }
        });
      } else {
        searchResults = await webSearchService.search(message);
        actions.push({
          type: 'search',
          description: `Web search: ${message}`,
          parameters: { query: message, type: 'web' }
        });
      }

      const response = await webSearchService.summarizeSearchResults(searchResults, message);
      return { response, actions };
    } catch (error: any) {
      return {
        response: `I couldn't complete the search: ${error.message}`,
        actions
      };
    }
  }

  private async handleCodingRequest(message: string, intent: any, context?: any): Promise<{
    response: string;
    actions: AgentAction[];
    modelUsed: string;
    cost: number;
  }> {
    const actions: AgentAction[] = [];
    let response: string;
    let modelUsed: string;
    let cost = 0;

    try {
      switch (intent.subtype) {
        case 'debugging':
          // Extract code and error from message (simplified)
          const codeMatch = message.match(/```(\w+)?\n([\s\S]*?)```/);
          const code = codeMatch ? codeMatch[2] : '';
          const codeLanguage = codeMatch ? codeMatch[1] || 'javascript' : 'javascript';
          const error = message.replace(/```[\s\S]*?```/, '').trim();
          
          if (code) {
            response = await codingAssistant.debugCode(code, error, codeLanguage);
            actions.push({
              type: 'code',
              description: `Debugged ${codeLanguage} code`,
              parameters: { language: codeLanguage, action: 'debug' }
            });
          } else {
            response = "Please provide the code you'd like me to debug using code blocks (```).";
          }
          modelUsed = 'coding-assistant';
          break;

        case 'generation':
          const genLanguage = intent.entities.find((e: string) => 
            ['javascript', 'python', 'java', 'typescript'].includes(e.toLowerCase())
          ) || 'javascript';
          
          response = await codingAssistant.generateCode({
            description: message,
            language: genLanguage,
            includeComments: true
          });
          
          actions.push({
            type: 'code',
            description: `Generated ${genLanguage} code`,
            parameters: { language: genLanguage, action: 'generate' }
          });
          modelUsed = 'coding-assistant';
          break;

        default:
          // General coding assistance
          const taskContext: TaskContext = {
            type: 'coding',
            complexity: 'medium',
            urgency: 'medium'
          };

          const messages = [new HumanMessage(message)];
          const result = await multiModelRouter.executeTask(messages, taskContext);
          response = result.response;
          modelUsed = result.modelUsed;
          cost = result.cost;
      }
    } catch (error: any) {
      response = `I encountered an error with the coding request: ${error.message}`;
      modelUsed = 'error-handler';
    }

    return { response, actions, modelUsed, cost };
  }

  private async handleAutomationRequest(message: string, intent: any, context?: any): Promise<{
    response: string;
    actions: AgentAction[];
  }> {
    const actions: AgentAction[] = [];
    let response: string;

    try {
      if (intent.subtype === 'deployment') {
        const platform = intent.entities.find((e: string) => 
          ['vercel', 'netlify', 'heroku'].includes(e.toLowerCase())
        ) || 'vercel';
        
        const projectPath = context?.workingDirectory || process.cwd();
        const result = await automationService.quickDeploy(projectPath, platform as any);
        
        response = result.success 
          ? `Successfully deployed to ${platform}!\n\n${result.output}`
          : `Deployment failed: ${result.error}`;
        
        actions.push({
          type: 'deploy',
          description: `Deployed to ${platform}`,
          parameters: { platform, projectPath },
          result
        });
      } else if (intent.entities.some((e: string) => ['git', 'commit', 'push'].includes(e.toLowerCase()))) {
        // Git operations
        const operation = intent.entities.find((e: string) => 
          ['status', 'add', 'commit', 'push', 'pull'].includes(e.toLowerCase())
        ) || 'status';
        
        const projectPath = context?.workingDirectory || process.cwd();
        const result = await automationService.gitOperations(projectPath, operation as any);
        
        response = result.success 
          ? `Git ${operation} completed:\n\n${result.output}`
          : `Git ${operation} failed: ${result.error}`;
        
        actions.push({
          type: 'command',
          description: `Git ${operation}`,
          parameters: { operation, projectPath },
          result
        });
      } else {
        // General command execution
        const result = await automationService.executeCommand(message);
        response = result.success 
          ? `Command executed:\n\n${result.output}`
          : `Command failed: ${result.error}`;
        
        actions.push({
          type: 'command',
          description: `Executed: ${message}`,
          parameters: { command: message },
          result
        });
      }
    } catch (error: any) {
      response = `Automation request failed: ${error.message}`;
    }

    return { response, actions };
  }

  private async handleAnalysisRequest(message: string, intent: any, context?: any): Promise<{
    response: string;
    actions: AgentAction[];
    modelUsed: string;
    cost: number;
  }> {
    const actions: AgentAction[] = [];
    let response: string;
    let modelUsed: string;
    let cost = 0;

    try {
      if (intent.subtype === 'project_analysis') {
        const projectPath = context?.currentProject || context?.workingDirectory || process.cwd();
        response = await codingAssistant.analyzeProject(projectPath);
        
        actions.push({
          type: 'code',
          description: `Analyzed project at ${projectPath}`,
          parameters: { projectPath, action: 'analyze' }
        });
        modelUsed = 'project-analyzer';
      } else {
        // General analysis
        const taskContext: TaskContext = {
          type: 'analytical',
          complexity: 'complex',
          urgency: 'medium'
        };

        const messages = [new HumanMessage(message)];
        const result = await multiModelRouter.executeTask(messages, taskContext);
        response = result.response;
        modelUsed = result.modelUsed;
        cost = result.cost;
      }
    } catch (error: any) {
      response = `Analysis request failed: ${error.message}`;
      modelUsed = 'error-handler';
    }

    return { response, actions, modelUsed, cost };
  }

  private generateSuggestions(intent: any, actions: AgentAction[]): string[] {
    const suggestions: string[] = [];

    switch (intent.type) {
      case 'search':
        suggestions.push('Search for more specific information');
        suggestions.push('Look for code examples related to this topic');
        break;
      
      case 'coding':
        suggestions.push('Generate unit tests for this code');
        suggestions.push('Optimize the code for better performance');
        suggestions.push('Add documentation to the code');
        break;
      
      case 'automation':
        suggestions.push('Set up automated testing');
        suggestions.push('Create a deployment pipeline');
        suggestions.push('Add monitoring and logging');
        break;
    }

    return suggestions;
  }

  private getConversationContext(): string {
    const recentHistory = this.conversationHistory.slice(-6); // Last 3 exchanges
    const historyText = recentHistory.map(h => 
      `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`
    ).join('\n');

    return `You are an advanced AI assistant with multiple capabilities including web search, coding assistance, automation, and analysis. 

Recent conversation:
${historyText}

Respond helpfully and offer to use your capabilities when appropriate.`;
  }

  // Utility methods
  getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  enableCapability(name: string): boolean {
    const capability = this.capabilities.get(name);
    if (capability) {
      capability.enabled = true;
      return true;
    }
    return false;
  }

  disableCapability(name: string): boolean {
    const capability = this.capabilities.get(name);
    if (capability) {
      capability.enabled = false;
      return true;
    }
    return false;
  }

  getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> {
    return this.conversationHistory;
  }

  clearConversationHistory(): void {
    this.conversationHistory = [];
  }
}

export const agentOrchestrator = new AgentOrchestrator();