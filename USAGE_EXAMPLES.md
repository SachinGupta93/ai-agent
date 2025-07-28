# AI Agent Usage Examples

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.template .env.local

# Add your API keys to .env.local
# Start the development server
npm run dev
```

## API Usage Examples

### 1. Web Search
```javascript
// Search for information
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Search for the latest React 18 features",
    capabilities: ["web_search"]
  })
});
```

### 2. Code Generation
```javascript
// Generate code
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Create a React component for a todo list with TypeScript",
    capabilities: ["code_generation"]
  })
});
```

### 3. Code Debugging
```javascript
// Debug code
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `Debug this code:
    \`\`\`javascript
    function calculateTotal(items) {
      let total = 0;
      for (let i = 0; i <= items.length; i++) {
        total += items[i].price;
      }
      return total;
    }
    \`\`\`
    Error: Cannot read property 'price' of undefined`,
    capabilities: ["code_debugging"]
  })
});
```

### 4. Project Deployment
```javascript
// Deploy to Vercel
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Deploy my project to Vercel",
    context: {
      workingDirectory: "/path/to/your/project"
    },
    capabilities: ["project_management"]
  })
});
```

### 5. File Operations
```javascript
// Create files
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Create a new React component file called UserProfile.tsx",
    capabilities: ["file_operations", "code_generation"]
  })
});
```

### 6. Git Operations
```javascript
// Git operations
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Commit all changes with message 'Add new features'",
    capabilities: ["git_operations"]
  })
});
```

### 7. Project Analysis
```javascript
// Analyze project
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Analyze my project structure and suggest improvements",
    context: {
      currentProject: "/path/to/your/project"
    },
    capabilities: ["project_analysis"]
  })
});
```

## Direct Service Usage

### Multi-Model Router
```typescript
import { multiModelRouter, TaskContext } from './services/multiModelRouter';
import { HumanMessage } from '@langchain/core/messages';

const context: TaskContext = {
  type: 'coding',
  complexity: 'medium',
  urgency: 'high'
};

const messages = [new HumanMessage("Explain async/await in JavaScript")];
const result = await multiModelRouter.executeTask(messages, context);
console.log(`Response from ${result.modelUsed}: ${result.response}`);
```

### Web Search Service
```typescript
import { webSearchService } from './services/webSearchService';

// General search
const results = await webSearchService.search("Next.js 14 new features");

// Code search
const codeResults = await webSearchService.searchCode("React hooks useState", "javascript");

// Documentation search
const docs = await webSearchService.searchDocumentation("Express.js middleware", "express");
```

### Coding Assistant
```typescript
import { codingAssistant } from './services/codingAssistant';

// Generate code
const code = await codingAssistant.generateCode({
  description: "Create a REST API endpoint for user authentication",
  language: "typescript",
  framework: "express",
  includeTests: true
});

// Analyze code
const analysis = await codingAssistant.analyzeCode(yourCode, "javascript");
console.log("Issues found:", analysis.issues);

// Debug code
const debugSolution = await codingAssistant.debugCode(buggyCode, errorMessage, "python");
```

### Automation Service
```typescript
import { automationService } from './services/automationService';

// Execute commands
const result = await automationService.executeCommand("npm test");

// File operations
await automationService.createFile("./src/components/NewComponent.tsx", componentCode);

// Git operations
await automationService.gitOperations("./", "commit", "Add new component");

// Quick deployment
await automationService.quickDeploy("./", "vercel");
```

## Advanced Usage

### Custom Model Selection
```typescript
// Force specific model
const result = await multiModelRouter.executeTask(messages, context, "anthropic/claude-3-opus");

// Compare models
const comparison = await multiModelRouter.compareModels(
  messages, 
  context, 
  "gpt-4o", 
  "anthropic/claude-3-sonnet"
);
```

### Batch Operations
```typescript
// Analyze multiple files
const files = ["file1.js", "file2.py", "file3.ts"];
const analyses = await Promise.all(
  files.map(file => codingAssistant.analyzeCode(fileContent, getLanguage(file)))
);
```

### Custom Capabilities
```typescript
// Enable/disable capabilities
agentOrchestrator.disableCapability("system_commands");
agentOrchestrator.enableCapability("web_search");

// Get available capabilities
const capabilities = agentOrchestrator.getCapabilities();
```

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-your-openai-key
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key

# Optional (for enhanced search)
TAVILY_API_KEY=tvly-your-tavily-key
SERPAPI_API_KEY=your-serpapi-key

# Configuration
DEFAULT_MODEL=gpt-4o-mini
SYSTEM_COMMANDS_ENABLED=true
AUTOMATION_ENABLED=true
```

## Error Handling

```typescript
try {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "Your request" })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('Agent error:', data.error);
    return;
  }
  
  console.log('Response:', data.data.response);
  console.log('Actions taken:', data.data.actions);
  console.log('Suggestions:', data.data.suggestions);
  
} catch (error) {
  console.error('Request failed:', error);
}
```

## Tips for Best Results

1. **Be Specific**: Provide clear, detailed requests
2. **Use Context**: Include relevant project information
3. **Specify Language**: Mention programming languages when relevant
4. **Include Code**: Use code blocks for debugging requests
5. **Set Capabilities**: Specify which capabilities you want to use
6. **Provide Paths**: Include file/project paths for file operations

## Common Use Cases

- **Development Workflow**: Code generation → Testing → Debugging → Deployment
- **Learning**: Search for tutorials → Generate examples → Explain concepts
- **Project Management**: Analyze codebase → Identify issues → Implement fixes
- **Automation**: Build scripts → Deploy applications → Monitor systems