// Comprehensive API Endpoint Testing Script
// Run with: node test-endpoints.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTest(testName, success, error = null) {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    const errorMsg = typeof error === 'object' ? JSON.stringify(error, null, 2) : error;
    console.log(`   Error: ${errorMsg}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: errorMsg });
  }
}

// Helper function to make API calls
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test Suite 1: /api/agent endpoint
async function testAgentEndpoint() {
  console.log('\n🧪 Testing /api/agent endpoint...');
  
  // Test 1: Valid command
  const test1 = await makeRequest('POST', '/api/agent', { command: 'Hello, how are you?' });
  logTest('Agent - Valid command', test1.success && test1.data.reply, test1.error);
  
  // Test 2: Empty command
  const test2 = await makeRequest('POST', '/api/agent', { command: '' });
  logTest('Agent - Empty command handling', test2.status === 400, test2.error);
  
  // Test 3: Missing command field
  const test3 = await makeRequest('POST', '/api/agent', {});
  logTest('Agent - Missing command field', test3.status === 400 || test3.success, test3.error);
  
  // Test 4: System command
  const test4 = await makeRequest('POST', '/api/agent', { command: 'open calculator' });
  logTest('Agent - System command', test4.success && test4.data.status, test4.error);
  
  // Test 5: Memory command
  const test5 = await makeRequest('POST', '/api/agent', { command: 'remember this test' });
  logTest('Agent - Memory command', test5.success, test5.error);
}

// Test Suite 2: /api/chat endpoint
async function testChatEndpoint() {
  console.log('\n🧪 Testing /api/chat endpoint...');
  
  // Test 1: Valid prompt
  const test1 = await makeRequest('POST', '/api/chat', { prompt: 'What is 2+2?' });
  logTest('Chat - Valid prompt', test1.success && test1.data.result, test1.error);
  
  // Test 2: Empty prompt
  const test2 = await makeRequest('POST', '/api/chat', { prompt: '' });
  logTest('Chat - Empty prompt', test2.status === 400, test2.error);
  
  // Test 3: Missing prompt field
  const test3 = await makeRequest('POST', '/api/chat', {});
  logTest('Chat - Missing prompt field', test3.status === 400, test3.error);
  
  // Test 4: Long prompt
  const longPrompt = 'A'.repeat(1000);
  const test4 = await makeRequest('POST', '/api/chat', { prompt: longPrompt });
  logTest('Chat - Long prompt', test4.success || test4.status === 400, test4.error);
}

// Test Suite 3: /api/memory endpoint
async function testMemoryEndpoint() {
  console.log('\n🧪 Testing /api/memory endpoint...');
  
  // Test 1: Get memory stats
  const test1 = await makeRequest('GET', '/api/memory?action=stats');
  logTest('Memory - Get stats', test1.success && test1.data.data, test1.error);
  
  // Test 2: Get recent memories
  const test2 = await makeRequest('GET', '/api/memory?action=recent&limit=5');
  logTest('Memory - Get recent memories', test2.success && Array.isArray(test2.data.data), test2.error);
  
  // Test 3: Search memories
  const test3 = await makeRequest('GET', '/api/memory?action=search&query=test&limit=3');
  logTest('Memory - Search memories', test3.success && Array.isArray(test3.data.data), test3.error);
  
  // Test 4: Search without query
  const test4 = await makeRequest('GET', '/api/memory?action=search');
  logTest('Memory - Search without query', test4.status === 400, test4.error);
  
  // Test 5: Get all memories
  const test5 = await makeRequest('GET', '/api/memory?action=all');
  logTest('Memory - Get all memories', test5.success && test5.data.data, test5.error);
  
  // Test 6: Default action (no action specified)
  const test6 = await makeRequest('GET', '/api/memory');
  logTest('Memory - Default action', test6.success && test6.data.data, test6.error);
  
  // Test 7: Clear memory
  const test7 = await makeRequest('DELETE', '/api/memory');
  logTest('Memory - Clear memory', test7.success && test7.data.status === 'success', test7.error);
}

// Test Suite 4: /api/system endpoint
async function testSystemEndpoint() {
  console.log('\n🧪 Testing /api/system endpoint...');
  
  // Test 1: Get available commands
  const test1 = await makeRequest('GET', '/api/system');
  logTest('System - Get available commands', test1.success && Array.isArray(test1.data.commands), test1.error);
  
  // Test 2: Execute valid command
  const test2 = await makeRequest('POST', '/api/system', { commandKey: 'open-calculator' });
  logTest('System - Execute valid command', test2.success && test2.data.status === 'success', test2.error);
  
  // Test 3: Execute invalid command
  const test3 = await makeRequest('POST', '/api/system', { commandKey: 'invalid-command' });
  logTest('System - Execute invalid command', test3.status === 400, test3.error);
  
  // Test 4: Missing command key
  const test4 = await makeRequest('POST', '/api/system', {});
  logTest('System - Missing command key', test4.status === 400, test4.error);
  
  // Test 5: Empty command key
  const test5 = await makeRequest('POST', '/api/system', { commandKey: '' });
  logTest('System - Empty command key', test5.status === 400, test5.error);
}

// Test Suite 5: Error handling and edge cases
async function testErrorHandling() {
  console.log('\n🧪 Testing error handling and edge cases...');
  
  // Test 1: Invalid JSON
  try {
    const response = await axios.post(`${BASE_URL}/api/agent`, 'invalid json', {
      headers: { 'Content-Type': 'application/json' }
    });
    logTest('Error - Invalid JSON handling', false, 'Should have failed with invalid JSON');
  } catch (error) {
    logTest('Error - Invalid JSON handling', error.response?.status === 400, error.message);
  }
  
  // Test 2: Non-existent endpoint
  const test2 = await makeRequest('GET', '/api/nonexistent');
  logTest('Error - Non-existent endpoint', test2.status === 404, test2.error);
  
  // Test 3: Wrong HTTP method
  const test3 = await makeRequest('GET', '/api/agent');
  logTest('Error - Wrong HTTP method', test3.status === 405, test3.error);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting comprehensive API endpoint testing...\n');
  console.log(`Testing against: ${BASE_URL}`);
  
  try {
    await testAgentEndpoint();
    await testChatEndpoint();
    await testMemoryEndpoint();
    await testSystemEndpoint();
    await testErrorHandling();
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n🔍 Detailed Errors:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}`);
        console.log(`   ${error.error}`);
      });
    }
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/memory`);
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start the development server with: npm run dev');
    return false;
  }
}

// Run tests
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAllTests();
  } else {
    process.exit(1);
  }
})();