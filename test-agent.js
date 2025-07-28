// test-agent.js
const { agentOrchestrator } = require('./services/agentOrchestrator');

async function testAgent() {
  try {
    console.log('Testing AI Agent...');
    
    const response = await agentOrchestrator.processRequest({
      message: "Hello! Can you help me with coding?",
      context: {},
      capabilities: []
    });
    
    console.log('Response:', response.response);
    console.log('Model used:', response.metadata.modelUsed);
    console.log('Execution time:', response.metadata.executionTime + 'ms');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAgent();