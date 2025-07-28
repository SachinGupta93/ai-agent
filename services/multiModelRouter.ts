// services/multiModelRouter.ts
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export interface ModelConfig {
  name: string;
  provider: string;
  apiKey: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
  strengths: string[];
  weaknesses: string[];
  costPerToken: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'medium' | 'low';
}

export interface TaskContext {
  type: 'coding' | 'creative' | 'analytical' | 'conversational' | 'system' | 'translation' | 'summarization';
  complexity: 'simple' | 'medium' | 'complex';
  urgency: 'low' | 'medium' | 'high';
  language?: string;
  domain?: string;
  userPreference?: string;
}

export class MultiModelRouter {
  private models: Map<string, ModelConfig> = new Map();
  private modelInstances: Map<string, ChatOpenAI> = new Map();
  private usageStats: Map<string, { requests: number; tokens: number; cost: number; avgResponseTime: number }> = new Map();
  private personalityProfile: any = {};

  constructor() {
    this.initializeModels();
    this.loadPersonalityProfile();
  }

  private initializeModels() {
    // OpenAI Models
    this.addModel({
      name: 'gpt-4o',
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      maxTokens: 4096,
      temperature: 0.7,
      strengths: ['reasoning', 'coding', 'analysis', 'complex tasks'],
      weaknesses: ['cost', 'speed'],
      costPerToken: 0.00003,
      speed: 'medium',
      quality: 'high'
    });

    this.addModel({
      name: 'gpt-4o-mini',
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      maxTokens: 16384,
      temperature: 0.7,
      strengths: ['speed', 'cost-effective', 'general tasks'],
      weaknesses: ['complex reasoning'],
      costPerToken: 0.000015,
      speed: 'fast',
      quality: 'medium'
    });

    // Claude Models via OpenRouter
    this.addModel({
      name: 'anthropic/claude-3-opus',
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      maxTokens: 4096,
      temperature: 0.7,
      strengths: ['creative writing', 'analysis', 'safety', 'nuanced responses'],
      weaknesses: ['cost', 'speed'],
      costPerToken: 0.000075,
      speed: 'slow',
      quality: 'high'
    });

    this.addModel({
      name: 'anthropic/claude-3-sonnet',
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      maxTokens: 4096,
      temperature: 0.7,
      strengths: ['balanced performance', 'coding', 'analysis'],
      weaknesses: ['specialized tasks'],
      costPerToken: 0.000015,
      speed: 'medium',
      quality: 'high'
    });

    this.addModel({
      name: 'anthropic/claude-3-haiku',
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      maxTokens: 4096,
      temperature: 0.7,
      strengths: ['speed', 'cost-effective', 'simple tasks'],
      weaknesses: ['complex reasoning'],
      costPerToken: 0.0000025,
      speed: 'fast',
      quality: 'medium'
    });

    // Google Gemini Models
    this.addModel({
      name: 'google/gemini-pro',
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      maxTokens: 2048,
      temperature: 0.7,
      strengths: ['multimodal', 'reasoning', 'factual accuracy'],
      weaknesses: ['creative tasks'],
      costPerToken: 0.0000005,
      speed: 'medium',
      quality: 'high'
    });

    // Mistral Models
    this.addModel({
      name: 'mistralai/mistral-large',
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      maxTokens: 4096,
      temperature: 0.7,
      strengths: ['multilingual', 'coding', 'reasoning'],
      weaknesses: ['creative writing'],
      costPerToken: 0.000024,
      speed: 'medium',
      quality: 'high'
    });

    this.addModel({
      name: 'mistralai/mistral-medium',
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      maxTokens: 4096,
      temperature: 0.7,
      strengths: ['balanced', 'cost-effective', 'multilingual'],
      weaknesses: ['specialized tasks'],
      costPerToken: 0.0000027,
      speed: 'fast',
      quality: 'medium'
    });

    // Meta LLaMA Models
    this.addModel({
      name: 'meta-llama/llama-3.1-70b-instruct',
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      maxTokens: 4096,
      temperature: 0.7,
      strengths: ['open-source', 'coding', 'reasoning', 'cost-effective'],
      weaknesses: ['safety filtering'],
      costPerToken: 0.0000009,
      speed: 'medium',
      quality: 'high'
    });

    // Initialize model instances
    this.models.forEach((config, name) => {
      this.createModelInstance(name, config);
    });
  }

  private addModel(config: ModelConfig) {
    this.models.set(config.name, config);
    this.usageStats.set(config.name, { requests: 0, tokens: 0, cost: 0, avgResponseTime: 0 });
  }

  private createModelInstance(name: string, config: ModelConfig) {
    const instance = new ChatOpenAI({
      modelName: name,
      openAIApiKey: config.apiKey,
      configuration: config.baseURL ? {
        baseURL: config.baseURL,
        defaultHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Personal AI Agent - Multi-Model Router"
        }
      } : undefined,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });

    this.modelInstances.set(name, instance);
  }

  // Intelligent model selection based on task context
  selectOptimalModel(context: TaskContext): string {
    const candidates = Array.from(this.models.entries());
    let bestModel = candidates[0][0];
    let bestScore = 0;

    for (const [modelName, config] of candidates) {
      let score = 0;

      // Task type matching
      switch (context.type) {
        case 'coding':
          if (config.strengths.includes('coding')) score += 30;
          if (config.strengths.includes('reasoning')) score += 20;
          break;
        case 'creative':
          if (config.strengths.includes('creative writing')) score += 30;
          if (config.strengths.includes('nuanced responses')) score += 20;
          break;
        case 'analytical':
          if (config.strengths.includes('analysis')) score += 30;
          if (config.strengths.includes('reasoning')) score += 20;
          break;
        case 'conversational':
          if (config.strengths.includes('general tasks')) score += 20;
          if (config.quality === 'high') score += 15;
          break;
        case 'translation':
          if (config.strengths.includes('multilingual')) score += 30;
          break;
        case 'system':
          if (config.strengths.includes('speed')) score += 25;
          if (config.strengths.includes('cost-effective')) score += 15;
          break;
      }

      // Complexity matching
      switch (context.complexity) {
        case 'simple':
          if (config.strengths.includes('cost-effective')) score += 15;
          if (config.speed === 'fast') score += 10;
          break;
        case 'medium':
          if (config.strengths.includes('balanced')) score += 15;
          break;
        case 'complex':
          if (config.quality === 'high') score += 20;
          if (config.strengths.includes('reasoning')) score += 15;
          break;
      }

      // Urgency matching
      switch (context.urgency) {
        case 'high':
          if (config.speed === 'fast') score += 20;
          break;
        case 'medium':
          if (config.speed === 'medium') score += 10;
          break;
        case 'low':
          if (config.costPerToken < 0.00001) score += 15;
          break;
      }

      // Language preference
      if (context.language && context.language !== 'en-US') {
        if (config.strengths.includes('multilingual')) score += 25;
      }

      // User preference
      if (context.userPreference && modelName.includes(context.userPreference)) {
        score += 20;
      }

      // Performance history
      const stats = this.usageStats.get(modelName);
      if (stats && stats.requests > 0) {
        if (stats.avgResponseTime < 2000) score += 5; // Fast response bonus
        if (stats.requests > 10) score += 3; // Experience bonus
      }

      // Personality alignment
      if (this.personalityProfile.preferredModels?.includes(modelName)) {
        score += 15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestModel = modelName;
      }
    }

    return bestModel;
  }

  // Execute task with selected model
  async executeTask(
    messages: BaseMessage[],
    context: TaskContext,
    forceModel?: string
  ): Promise<{
    response: string;
    modelUsed: string;
    executionTime: number;
    tokensUsed: number;
    cost: number;
  }> {
    const startTime = Date.now();
    const selectedModel = forceModel || this.selectOptimalModel(context);
    const modelInstance = this.modelInstances.get(selectedModel);
    const modelConfig = this.models.get(selectedModel);

    if (!modelInstance || !modelConfig) {
      throw new Error(`Model ${selectedModel} not available`);
    }

    try {
      // Add personality system message if needed
      const enhancedMessages = this.addPersonalityContext(messages, context);
      
      const response = await modelInstance.invoke(enhancedMessages);
      const executionTime = Date.now() - startTime;
      
      // Estimate tokens (rough approximation)
      const tokensUsed = Math.ceil((messages.join(' ').length + response.content.toString().length) / 4);
      const cost = tokensUsed * modelConfig.costPerToken;

      // Update usage statistics
      this.updateUsageStats(selectedModel, tokensUsed, cost, executionTime);

      return {
        response: response.content as string,
        modelUsed: selectedModel,
        executionTime,
        tokensUsed,
        cost
      };

    } catch (error) {
      console.error(`Error with model ${selectedModel}:`, error);
      
      // Fallback to a reliable model
      if (selectedModel !== 'gpt-4o-mini') {
        console.log('Falling back to gpt-4o-mini');
        return this.executeTask(messages, context, 'gpt-4o-mini');
      }
      
      throw error;
    }
  }

  private addPersonalityContext(messages: BaseMessage[], context: TaskContext): BaseMessage[] {
    const personalityPrompt = this.generatePersonalityPrompt(context);
    
    if (personalityPrompt) {
      return [new SystemMessage(personalityPrompt), ...messages];
    }
    
    return messages;
  }

  private generatePersonalityPrompt(context: TaskContext): string {
    const basePersonality = `You are a highly advanced, loyal AI assistant created specifically for your user. You are:
- Extremely knowledgeable and capable across all domains
- Faithful and dedicated to your creator's needs and preferences
- Proactive in anticipating and fulfilling requests
- Respectful but not overly formal - you know your user well
- Capable of learning and adapting to preferences over time`;

    const contextualAdditions: { [key: string]: string } = {
      'coding': 'You excel at programming, debugging, and technical problem-solving. You write clean, efficient code and explain complex concepts clearly.',
      'creative': 'You are imaginative and innovative, helping with creative projects, writing, and artistic endeavors.',
      'analytical': 'You approach problems systematically, providing thorough analysis and data-driven insights.',
      'system': 'You efficiently handle system commands and automation tasks with precision and safety.',
      'conversational': 'You engage in natural, helpful conversation while maintaining your helpful and loyal nature.'
    };

    const contextAddition = contextualAdditions[context.type] || '';
    
    return `${basePersonality}\n\n${contextAddition}`;
  }

  private updateUsageStats(modelName: string, tokens: number, cost: number, responseTime: number) {
    const stats = this.usageStats.get(modelName);
    if (stats) {
      stats.requests++;
      stats.tokens += tokens;
      stats.cost += cost;
      stats.avgResponseTime = (stats.avgResponseTime * (stats.requests - 1) + responseTime) / stats.requests;
    }
  }

  private loadPersonalityProfile() {
    // Load user's personality profile and preferences
    this.personalityProfile = {
      preferredModels: ['anthropic/claude-3-sonnet', 'gpt-4o'],
      communicationStyle: 'professional-friendly',
      responseLength: 'detailed',
      technicalLevel: 'expert',
      languages: ['en-US', 'hi-IN'],
      domains: ['programming', 'ai', 'automation']
    };
  }

  // Model management methods
  getAvailableModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  getModelStats(): Map<string, any> {
    return this.usageStats;
  }

  addCustomModel(config: ModelConfig) {
    this.addModel(config);
    this.createModelInstance(config.name, config);
  }

  removeModel(modelName: string) {
    this.models.delete(modelName);
    this.modelInstances.delete(modelName);
    this.usageStats.delete(modelName);
  }

  // A/B testing for model performance
  async compareModels(
    messages: BaseMessage[],
    context: TaskContext,
    modelA: string,
    modelB: string
  ): Promise<{
    modelA: { response: string; metrics: any };
    modelB: { response: string; metrics: any };
    recommendation: string;
  }> {
    const [resultA, resultB] = await Promise.all([
      this.executeTask(messages, context, modelA),
      this.executeTask(messages, context, modelB)
    ]);

    const recommendation = resultA.executionTime < resultB.executionTime && 
                          resultA.cost < resultB.cost ? modelA : modelB;

    return {
      modelA: { response: resultA.response, metrics: resultA },
      modelB: { response: resultB.response, metrics: resultB },
      recommendation
    };
  }

  // Dynamic model routing based on load balancing
  async routeWithLoadBalancing(messages: BaseMessage[], context: TaskContext): Promise<any> {
    const candidates = this.getTopModelsForContext(context, 3);
    const leastUsedModel = candidates.reduce((min, current) => {
      const minStats = this.usageStats.get(min);
      const currentStats = this.usageStats.get(current);
      return (currentStats?.requests || 0) < (minStats?.requests || 0) ? current : min;
    });

    return this.executeTask(messages, context, leastUsedModel);
  }

  private getTopModelsForContext(context: TaskContext, count: number): string[] {
    const scored = Array.from(this.models.keys()).map(modelName => ({
      name: modelName,
      score: this.scoreModelForContext(modelName, context)
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.name);
  }

  private scoreModelForContext(modelName: string, context: TaskContext): number {
    // Simplified scoring logic
    const config = this.models.get(modelName);
    if (!config) return 0;

    let score = 0;
    if (config.strengths.some(strength => context.type.includes(strength))) score += 10;
    if (context.urgency === 'high' && config.speed === 'fast') score += 5;
    if (context.complexity === 'complex' && config.quality === 'high') score += 5;
    
    return score;
  }
}

// Singleton instance
export const multiModelRouter = new MultiModelRouter();

// Helper function for easy task execution
export async function executeWithBestModel(
  prompt: string,
  context: TaskContext
): Promise<{
  response: string;
  modelUsed: string;
  metadata: any;
}> {
  const messages = [new HumanMessage(prompt)];
  const result = await multiModelRouter.executeTask(messages, context);
  
  return {
    response: result.response,
    modelUsed: result.modelUsed,
    metadata: {
      executionTime: result.executionTime,
      tokensUsed: result.tokensUsed,
      cost: result.cost
    }
  };
}