import { executeSafeCommand } from '@/services/systemCommands';

export async function handleSystemCommand(input: string): Promise<string> {
  const lowerInput = input.toLowerCase();
  
  try {
    // VS Code commands
    if (lowerInput.includes('vscode') || lowerInput.includes('vs code') || lowerInput.includes('code editor')) {
      await executeSafeCommand('open-vscode');
      return 'Opening VS Code...';
    }
    
    // Chrome commands
    if (lowerInput.includes('chrome') || lowerInput.includes('browser')) {
      await executeSafeCommand('open-chrome');
      return 'Opening Chrome browser...';
    }
    
    // Notepad commands
    if (lowerInput.includes('notepad') || lowerInput.includes('text editor')) {
      await executeSafeCommand('open-notepad');
      return 'Opening Notepad...';
    }
    
    // Calculator commands
    if (lowerInput.includes('calculator') || lowerInput.includes('calc')) {
      await executeSafeCommand('open-calculator');
      return 'Opening Calculator...';
    }
    
    // File Explorer commands
    if (lowerInput.includes('file explorer') || lowerInput.includes('explorer') || lowerInput.includes('files')) {
      await executeSafeCommand('open-file-explorer');
      return 'Opening File Explorer...';
    }
    
    // Task Manager commands
    if (lowerInput.includes('task manager') || lowerInput.includes('taskmgr')) {
      await executeSafeCommand('open-task-manager');
      return 'Opening Task Manager...';
    }
    
    return 'I can help you open applications like VS Code, Chrome, Notepad, Calculator, File Explorer, or Task Manager. Just ask me to "open [application name]".';
    
  } catch (error) {
    console.error('System command execution error:', error);
    return `Sorry, I couldn't execute that command: ${error}`;
  }
}

export function isSystemCommand(input: string): boolean {
  const lowerInput = input.toLowerCase();
  const systemKeywords = [
    'open', 'launch', 'start', 'run',
    'vscode', 'vs code', 'code editor',
    'chrome', 'browser',
    'notepad', 'text editor',
    'calculator', 'calc',
    'file explorer', 'explorer', 'files',
    'task manager', 'taskmgr'
  ];
  
  return systemKeywords.some(keyword => lowerInput.includes(keyword));
}