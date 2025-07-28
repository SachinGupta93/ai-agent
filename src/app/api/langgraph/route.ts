// src/app/api/langgraph/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processWithLangGraph } from '@/services/langgraphAgent';
import { addMemoryEntry } from '@/agent/memory/memoryManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, sessionId } = body;

    // Validate input
    if (!input || typeof input !== 'string' || input.trim() === '') {
      return NextResponse.json({
        error: 'Input is required and must be a non-empty string'
      }, { status: 400 });
    }

    const startTime = Date.now();

    // Process with LangGraph
    const result = await processWithLangGraph(input.trim(), sessionId);

    const executionTime = Date.now() - startTime;

    // Log to memory system
    addMemoryEntry({
      type: 'task',
      input: input.trim(),
      output: result.result,
      metadata: {
        success: true,
        executionTime,
        agentType: result.agentType,
        sessionId: result.sessionId,
        model: result.context.processedBy || 'unknown',
        tags: ['langgraph', result.agentType, 'multi-agent']
      }
    });

    return NextResponse.json({
      success: true,
      result: result.result,
      agentType: result.agentType,
      sessionId: result.sessionId,
      metadata: {
        executionTime,
        processingTime: result.context.processingTime,
        model: result.context.processedBy,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('LangGraph API error:', error);
    
    // Log error to memory
    addMemoryEntry({
      type: 'task',
      input: req.body?.input || 'unknown',
      output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        success: false,
        executionTime: 0,
        tags: ['langgraph', 'error']
      }
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to process request with LangGraph',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    status: 'healthy',
    service: 'LangGraph Multi-Agent System',
    timestamp: new Date().toISOString(),
    availableAgents: ['system', 'memory', 'task', 'coding', 'chat'],
    version: '1.0.0'
  });
}