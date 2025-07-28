// services/langgraphAgent.ts
import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { v4 as uuidv4 } from 'uuid';

// Define the agent state interface
interface AgentState {
  messages: BaseMessage[];
  userInput: string;
  agentType: string;
  context: Record<string, any>;
  result: string;
  nextAction: string;
  sessionId: string;
}

// OpenRouter LLM wrapper for different models
class OpenRouterLLM extends ChatOpenAI {
  constructor(modelName: string = "openai/gpt-4o-mini") {
    super({
      modelName,
      openAIApiKey: process.env.OPENROUTER_API_KEY,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Personal AI Agent - LangGraph"
        }
      },
      temperature: 0.7,
      maxTokens: 1000
    });
  }
}

// Router agent - determines which specialized agent to use
async function routerAgent(state: AgentState): Promise<Partial<AgentState>> {
  const userInput = state.userInput.toLowerCase();
  
  let agentType: string;
  
  // Determine agent type based on input patterns
  if (userInput.includes('open') || userInput.includes('launch') || userInput.includes('start') || userInput.includes('run')) {
    agentType = "system";
  } else if (userInput.includes('remember') || userInput.includes('recall') || userInput.includes('memory') || userInput.includes('what did')) {
    agentType = "memory";
  } else if (userInput.includes('task') || userInput.includes('todo') || userInput.includes('schedule') || userInput.includes('remind')) {
    agentType = "task";
  } else if (userInput.includes('code') || userInput.includes('program') || userInput.includes('function') || userInput.includes('debug')) {
    agentType = "coding";
  } else {
    agentType = "chat";
  }
  
  return {
    agentType,
    nextAction: agentType,
    context: { ...state.context, routedAt: new Date().toISOString() }
  };
}

// System command agent
async function systemAgent(state: AgentState): Promise<Partial<AgentState>> {
  const llm = new OpenRouterLLM("openai/gpt-4o-mini");
  
  const systemPrompt = `You are a system command agent for a personal AI assistant. 
  Analyze the user's request and determine what system command they want to execute.
  
  Available commands:
  - open vscode: Opens Visual Studio Code
  - open chrome: Opens Chrome browser  
  - open notepad: Opens Notepad
  - open calculator: Opens Calculator
  - open file explorer: Opens File Explorer
  - open task manager: Opens Task Manager
  
  Respond with:
  1. The specific command to execute
  2. A brief confirmation message
  3. Any additional context or suggestions
  
  Keep responses concise and helpful.`;
  
  const messages = [
    new HumanMessage(`${systemPrompt}\n\nUser request: ${state.userInput}`)
  ];
  
  const response = await llm.invoke(messages);
  
  return {
    result: response.content as string,
    nextAction: "end",
    context: { ...state.context, processedBy: "system", model: "gpt-4o-mini" }
  };
}

// Memory agent
async function memoryAgent(state: AgentState): Promise<Partial<AgentState>> {
  const llm = new OpenRouterLLM("openai/gpt-4o-mini");
  
  const memoryPrompt = `You are a memory agent for a personal AI assistant.
  Help the user recall past conversations, information, or interactions.
  
  You can:
  - Search through conversation history
  - Recall specific topics or dates
  - Provide summaries of past interactions
  - Help organize and categorize memories
  
  Provide helpful and contextual responses about memory retrieval.`;
  
  const messages = [
    new HumanMessage(`${memoryPrompt}\n\nUser request: ${state.userInput}`)
  ];
  
  const response = await llm.invoke(messages);
  
  return {
    result: response.content as string,
    nextAction: "end",
    context: { ...state.context, processedBy: "memory", model: "gpt-4o-mini" }
  };
}

// Task management agent
async function taskAgent(state: AgentState): Promise<Partial<AgentState>> {
  const llm = new OpenRouterLLM("anthropic/claude-3-haiku");
  
  const taskPrompt = `You are a task management agent for a personal AI assistant.
  Help the user organize, plan, and manage their tasks and schedules.
  
  You can:
  - Create and organize task lists
  - Set priorities and deadlines
  - Break down complex projects
  - Provide productivity suggestions
  - Help with time management
  
  Provide structured, actionable responses with clear next steps.`;
  
  const messages = [
    new HumanMessage(`${taskPrompt}\n\nUser request: ${state.userInput}`)
  ];
  
  const response = await llm.invoke(messages);
  
  return {
    result: response.content as string,
    nextAction: "end",
    context: { ...state.context, processedBy: "task", model: "claude-3-haiku" }
  };
}

// Coding assistant agent
async function codingAgent(state: AgentState): Promise<Partial<AgentState>> {
  const llm = new OpenRouterLLM("openai/gpt-4o");
  
  const codingPrompt = `You are a coding assistant agent for a personal AI assistant.
  Help the user with programming tasks, code review, debugging, and technical questions.
  
  You can:
  - Write and explain code in various languages
  - Debug and fix code issues
  - Provide code reviews and suggestions
  - Explain programming concepts
  - Help with architecture and design patterns
  
  Provide clear, well-commented code examples and explanations.`;
  
  const messages = [
    new HumanMessage(`${codingPrompt}\n\nUser request: ${state.userInput}`)
  ];
  
  const response = await llm.invoke(messages);
  
  return {
    result: response.content as string,
    nextAction: "end",
    context: { ...state.context, processedBy: "coding", model: "gpt-4o" }
  };
}

// General chat agent
async function chatAgent(state: AgentState): Promise<Partial<AgentState>> {
  const llm = new OpenRouterLLM("openai/gpt-4o");
  
  const chatPrompt = `You are a helpful AI assistant for general conversation and questions.
  Provide informative, friendly, and engaging responses.
  
  You can help with:
  - General questions and explanations
  - Creative tasks and brainstorming
  - Educational content
  - Casual conversation
  - Research and information gathering
  
  Be conversational, helpful, and adapt your tone to the user's needs.`;
  
  const messages = [
    new HumanMessage(`${chatPrompt}\n\nUser: ${state.userInput}`)
  ];
  
  const response = await llm.invoke(messages);
  
  return {
    result: response.content as string,
    nextAction: "end",
    context: { ...state.context, processedBy: "chat", model: "gpt-4o" }
  };
}

// Create the LangGraph workflow
function createAgentGraph() {
  const workflow = new StateGraph<AgentState>({
    channels: {
      messages: {
        reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => []
      },
      userInput: {
        default: () => ""
      },
      agentType: {
        default: () => ""
      },
      context: {
        default: () => ({})
      },
      result: {
        default: () => ""
      },
      nextAction: {
        default: () => ""
      },
      sessionId: {
        default: () => uuidv4()
      }
    }
  });

  // Add nodes
  workflow.addNode("router", routerAgent);
  workflow.addNode("system", systemAgent);
  workflow.addNode("memory", memoryAgent);
  workflow.addNode("task", taskAgent);
  workflow.addNode("coding", codingAgent);
  workflow.addNode("chat", chatAgent);

  // Set entry point
  workflow.setEntryPoint("router");

  // Add conditional edges from router
  workflow.addConditionalEdges(
    "router",
    (state: AgentState) => state.agentType,
    {
      system: "system",
      memory: "memory", 
      task: "task",
      coding: "coding",
      chat: "chat"
    }
  );

  // All specialized agents end the workflow
  workflow.addEdge("system", END);
  workflow.addEdge("memory", END);
  workflow.addEdge("task", END);
  workflow.addEdge("coding", END);
  workflow.addEdge("chat", END);

  return workflow.compile();
}

// Main function to process user input with LangGraph
export async function processWithLangGraph(userInput: string, sessionId?: string): Promise<{
  result: string;
  agentType: string;
  context: Record<string, any>;
  sessionId: string;
}> {
  try {
    const graph = createAgentGraph();
    
    const initialState: AgentState = {
      messages: [],
      userInput,
      agentType: "",
      context: { startTime: new Date().toISOString() },
      result: "",
      nextAction: "",
      sessionId: sessionId || uuidv4()
    };

    const result = await graph.invoke(initialState);
    
    return {
      result: result.result,
      agentType: result.agentType,
      context: {
        ...result.context,
        endTime: new Date().toISOString(),
        processingTime: Date.now() - new Date(result.context.startTime).getTime()
      },
      sessionId: result.sessionId
    };
    
  } catch (error) {
    console.error('LangGraph processing error:', error);
    throw new Error(`Failed to process with LangGraph: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export individual agents for testing
export {
  routerAgent,
  systemAgent,
  memoryAgent,
  taskAgent,
  codingAgent,
  chatAgent,
  OpenRouterLLM
};