// agent/brain.ts
import { handleSystemCommand, isSystemCommand } from './handlers/system';
import { addMemoryEntry, getRecentMemory, searchMemory } from './memory/memoryManager';
import { processWithLangGraph } from '../services/langgraphAgent';

export async function processCommandWithLangGraph(command: string, sessionId?: string): Promise<{
  result: string;
  agentType: string;
  sessionId: string;
  metadata: any;
}> {
  const startTime = Date.now();
  
  try {
    // Use LangGraph for enhanced multi-agent processing
    const langGraphResult = await processWithLangGraph(command, sessionId);
    
    // Log to memory with enhanced metadata
    addMemoryEntry({
      type: 'task',
      input: command,
      output: langGraphResult.result,
      metadata: {
        success: true,
        executionTime: Date.now() - startTime,
        agentType: langGraphResult.agentType,
        sessionId: langGraphResult.sessionId,
        processingMode: 'langgraph',
        tags: ['langgraph', langGraphResult.agentType, 'enhanced']
      }
    });

    return {
      result: langGraphResult.result,
      agentType: langGraphResult.agentType,
      sessionId: langGraphResult.sessionId,
      metadata: {
        ...langGraphResult.context,
        executionTime: Date.now() - startTime,
        processingMode: 'langgraph'
      }
    };

  } catch (error) {
    const errorMessage = `LangGraph processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    // Fallback to original processing
    console.warn('LangGraph failed, falling back to original processing:', error);
    const fallbackResult = await processCommand(command);
    
    return {
      result: fallbackResult,
      agentType: 'fallback',
      sessionId: sessionId || 'fallback-session',
      metadata: {
        executionTime: Date.now() - startTime,
        processingMode: 'fallback',
        error: errorMessage
      }
    };
  }
}

export async function processCommand(command: string): Promise<string> {
  const startTime = Date.now();
  let result: string;
  let success = true;

  try {
    // Check if it's a system command
    if (isSystemCommand(command)) {
      result = await handleSystemCommand(command);
      
      // Log system command to memory
      addMemoryEntry({
        type: 'system_command',
        input: command,
        output: result,
        metadata: {
          success: true,
          executionTime: Date.now() - startTime,
          tags: ['system', 'command']
        }
      });
      
      return result;
    }

    // Handle other commands
    if (command.toLowerCase().includes("open youtube")) {
      result = "Opening YouTube is not supported yet. But I logged it.";
    } else if (command.toLowerCase().includes("remember") || command.toLowerCase().includes("recall")) {
      // Memory search functionality
      const searchQuery = command.replace(/remember|recall|what did|tell me about/gi, '').trim();
      if (searchQuery) {
        const memories = searchMemory(searchQuery, 3);
        if (memories.length > 0) {
          result = `I found ${memories.length} relevant memories:\n\n` +
                   memories.map((m, i) => `${i + 1}. ${new Date(m.timestamp).toLocaleDateString()}: ${m.input} → ${m.output}`).join('\n\n');
        } else {
          result = `I couldn't find any memories related to "${searchQuery}".`;
        }
      } else {
        const recentMemories = getRecentMemory(3);
        result = `Here are my recent memories:\n\n` +
                 recentMemories.map((m, i) => `${i + 1}. ${new Date(m.timestamp).toLocaleDateString()}: ${m.input} → ${m.output}`).join('\n\n');
      }
    } else {
      result = `Command "${command}" received and logged. I can help you open applications like VS Code, Chrome, Notepad, Calculator, File Explorer, or Task Manager. Just ask me to "open [application name]". You can also ask me to "remember" or "recall" past conversations.`;
    }

    // Log general command to memory
    addMemoryEntry({
      type: 'task',
      input: command,
      output: result,
      metadata: {
        success,
        executionTime: Date.now() - startTime,
        tags: ['general', 'task']
      }
    });

    return result;

  } catch (error) {
    success = false;
    result = `Error processing command: ${error}`;
    
    // Log error to memory
    addMemoryEntry({
      type: 'task',
      input: command,
      output: result,
      metadata: {
        success: false,
        executionTime: Date.now() - startTime,
        tags: ['error']
      }
    });

    return result;
  }
}
