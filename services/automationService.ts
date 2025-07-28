// services/automationService.ts
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface AutomationTask {
  id: string;
  name: string;
  type: 'command' | 'script' | 'file_operation' | 'web_automation' | 'system';
  description: string;
  command?: string;
  script?: string;
  schedule?: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface TaskResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  timestamp: Date;
}

export class AutomationService {
  private tasks: Map<string, AutomationTask> = new Map();
  private runningTasks: Map<string, any> = new Map();

  constructor() {
    this.loadTasks();
  }

  // System Commands
  async executeCommand(command: string, cwd?: string): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(command, { 
        cwd: cwd || process.cwd(),
        timeout: 30000 // 30 second timeout
      });
      
      return {
        success: true,
        output: stdout || stderr,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  // File Operations
  async createFile(filePath: string, content: string): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf8');
      
      return {
        success: true,
        output: `File created: ${filePath}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  async readFile(filePath: string): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      return {
        success: true,
        output: content,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  async deleteFile(filePath: string): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      await fs.unlink(filePath);
      
      return {
        success: true,
        output: `File deleted: ${filePath}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  async listDirectory(dirPath: string): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const fileList = files.map(file => ({
        name: file.name,
        type: file.isDirectory() ? 'directory' : 'file'
      }));
      
      return {
        success: true,
        output: JSON.stringify(fileList, null, 2),
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  // Development Operations
  async runTests(projectPath: string, testCommand?: string): Promise<TaskResult> {
    const command = testCommand || 'npm test';
    return this.executeCommand(command, projectPath);
  }

  async buildProject(projectPath: string, buildCommand?: string): Promise<TaskResult> {
    const command = buildCommand || 'npm run build';
    return this.executeCommand(command, projectPath);
  }

  async installDependencies(projectPath: string, packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'): Promise<TaskResult> {
    const command = `${packageManager} install`;
    return this.executeCommand(command, projectPath);
  }

  async gitOperations(projectPath: string, operation: 'status' | 'add' | 'commit' | 'push' | 'pull', message?: string): Promise<TaskResult> {
    let command: string;
    
    switch (operation) {
      case 'status':
        command = 'git status';
        break;
      case 'add':
        command = 'git add .';
        break;
      case 'commit':
        command = `git commit -m "${message || 'Auto commit'}"`;
        break;
      case 'push':
        command = 'git push';
        break;
      case 'pull':
        command = 'git pull';
        break;
      default:
        throw new Error(`Unknown git operation: ${operation}`);
    }
    
    return this.executeCommand(command, projectPath);
  }

  // System Information
  async getSystemInfo(): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      const [cpu, memory, disk] = await Promise.all([
        this.executeCommand('wmic cpu get name'),
        this.executeCommand('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory'),
        this.executeCommand('wmic logicaldisk get size,freespace,caption')
      ]);

      const systemInfo = {
        cpu: cpu.output,
        memory: memory.output,
        disk: disk.output,
        platform: process.platform,
        nodeVersion: process.version
      };

      return {
        success: true,
        output: JSON.stringify(systemInfo, null, 2),
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  // Task Management
  addTask(task: Omit<AutomationTask, 'id'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTask: AutomationTask = { ...task, id };
    this.tasks.set(id, fullTask);
    this.saveTasks();
    return id;
  }

  async executeTask(taskId: string): Promise<TaskResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (!task.enabled) {
      throw new Error(`Task ${taskId} is disabled`);
    }

    let result: TaskResult;

    switch (task.type) {
      case 'command':
        result = await this.executeCommand(task.command!);
        break;
      case 'script':
        result = await this.executeCommand(task.script!);
        break;
      case 'file_operation':
        // Handle specific file operations based on task configuration
        result = await this.executeCommand(task.command!);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }

    // Update task last run time
    task.lastRun = new Date();
    this.tasks.set(taskId, task);
    this.saveTasks();

    return result;
  }

  getTasks(): AutomationTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): AutomationTask | undefined {
    return this.tasks.get(taskId);
  }

  removeTask(taskId: string): boolean {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      this.saveTasks();
    }
    return deleted;
  }

  // Browser Automation (basic)
  async openBrowser(url?: string): Promise<TaskResult> {
    const command = process.platform === 'win32' 
      ? `start ${url || 'chrome'}`
      : process.platform === 'darwin'
      ? `open ${url || '-a "Google Chrome"'}`
      : `xdg-open ${url || 'google-chrome'}`;
    
    return this.executeCommand(command);
  }

  // Utility Methods
  private async loadTasks(): Promise<void> {
    try {
      const tasksPath = path.join(process.cwd(), 'data', 'automation-tasks.json');
      const data = await fs.readFile(tasksPath, 'utf8');
      const tasks = JSON.parse(data);
      
      for (const task of tasks) {
        this.tasks.set(task.id, task);
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty tasks
      console.log('No existing tasks file found, starting fresh');
    }
  }

  private async saveTasks(): Promise<void> {
    try {
      const tasksPath = path.join(process.cwd(), 'data', 'automation-tasks.json');
      await fs.mkdir(path.dirname(tasksPath), { recursive: true });
      
      const tasks = Array.from(this.tasks.values());
      await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
    } catch (error) {
      console.error('Failed to save tasks:', error);
    }
  }

  // Quick Actions
  async quickDeploy(projectPath: string, platform: 'vercel' | 'netlify' | 'heroku' = 'vercel'): Promise<TaskResult> {
    const commands = {
      vercel: 'vercel --prod',
      netlify: 'netlify deploy --prod',
      heroku: 'git push heroku main'
    };

    return this.executeCommand(commands[platform], projectPath);
  }

  async quickBackup(sourcePath: string, backupPath?: string): Promise<TaskResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = backupPath || `backup_${timestamp}`;
    
    const command = process.platform === 'win32'
      ? `xcopy "${sourcePath}" "${destination}" /E /I /H /Y`
      : `cp -r "${sourcePath}" "${destination}"`;
    
    return this.executeCommand(command);
  }
}

export const automationService = new AutomationService();