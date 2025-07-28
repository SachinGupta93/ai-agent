import { NextRequest, NextResponse } from 'next/server';
import { executeSafeCommand, getAvailableCommands } from '@/services/systemCommands';

export async function POST(req: NextRequest) {
  try {
    const { commandKey } = await req.json();

    if (!commandKey) {
      return NextResponse.json({ 
        status: 'error', 
        error: 'Command key is required' 
      }, { status: 400 });
    }

    console.log(`System command request: ${commandKey}`);
    
    const output = await executeSafeCommand(commandKey);
    return NextResponse.json({ 
      status: 'success', 
      output,
      commandKey 
    });
  } catch (error) {
    console.error('System command error:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: typeof error === 'string' ? error : 'Command execution failed' 
    }, { status: 400 });
  }
}

export async function GET() {
  try {
    const availableCommands = getAvailableCommands();
    return NextResponse.json({ 
      status: 'success', 
      commands: availableCommands 
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      error: 'Failed to get available commands' 
    }, { status: 500 });
  }
}