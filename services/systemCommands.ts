import { exec } from 'child_process';

const allowedCommands: { [key: string]: string } = {
  'open-vscode': 'code .',
  'open-chrome': 'start chrome',
  'open-notepad': 'notepad',
  'open-calculator': 'calc',
  'open-file-explorer': 'explorer .',
  'open-task-manager': 'taskmgr',
  // Add more safe commands here as needed
  // 'shutdown': 'shutdown /s /t 60', // Commented out for safety - uncomment if needed
};

export function executeSafeCommand(key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = allowedCommands[key];
    if (!command) {
      return reject('Unauthorized or unknown command.');
    }

    console.log(`Executing safe command: ${key} -> ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command execution error: ${error.message}`);
        return reject(`Execution error: ${error.message}`);
      }
      
      const output = stdout || `Command "${key}" executed successfully`;
      console.log(`Command output: ${output}`);
      return resolve(output);
    });
  });
}

export function getAvailableCommands(): string[] {
  return Object.keys(allowedCommands);
}