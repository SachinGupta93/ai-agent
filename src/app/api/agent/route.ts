// src/app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator } from '../../../../services/agentOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, capabilities } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const agentRequest = {
      message,
      context: context || {},
      capabilities: capabilities || []
    };

    const response = await agentOrchestrator.processRequest(agentRequest);

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error: any) {
    console.error('Agent API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const capabilities = agentOrchestrator.getCapabilities();
    const conversationHistory = agentOrchestrator.getConversationHistory();

    return NextResponse.json({
      success: true,
      data: {
        capabilities,
        conversationHistory: conversationHistory.slice(-10), // Last 10 messages
        status: 'ready'
      }
    });

  } catch (error: any) {
    console.error('Agent Status API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}