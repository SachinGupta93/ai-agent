# core/action_agent.py - Task-executing AI agent
import asyncio
import json
import subprocess
import os
import requests
from typing import Dict, Any, List
import openai
import anthropic
from datetime import datetime

class ActionAgent:
    def __init__(self):
        # Initialize API clients
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.claude_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY")) if os.getenv("ANTHROPIC_API_KEY") else None
        
        # Action registry
        self.actions = {
            "search_web": self.search_web,
            "write_code": self.write_code,
            "run_command": self.run_command,
            "create_file": self.create_file,
            "read_file": self.read_file,
            "analyze_data": self.analyze_data,
            "send_request": self.send_request,
            "calculate": self.calculate,
            "translate": self.translate,
            "summarize": self.summarize
        }

    async def process_request(self, user_input: str) -> str:
        """Process user request and execute actions"""
        
        # Analyze what action is needed
        action_plan = await self.analyze_intent(user_input)
        
        # Execute the action
        if action_plan["action"] in self.actions:
            result = await self.actions[action_plan["action"]](action_plan["parameters"], user_input)
            return result
        else:
            # Fallback to conversational response
            return await self.get_ai_response(user_input)

    async def analyze_intent(self, user_input: str) -> Dict[str, Any]:
        """Analyze user intent and determine action"""
        
        prompt = f"""
Analyze this request and determine the specific action needed:
"{user_input}"

Return JSON with:
{{
    "action": "search_web|write_code|run_command|create_file|read_file|analyze_data|send_request|calculate|translate|summarize|chat",
    "parameters": {{"key": "value"}},
    "reasoning": "why this action"
}}

Examples:
- "search for python tutorials" → {{"action": "search_web", "parameters": {{"query": "python tutorials"}}}}
- "create a sorting function" → {{"action": "write_code", "parameters": {{"task": "sorting function", "language": "python"}}}}
- "run ls command" → {{"action": "run_command", "parameters": {{"command": "ls"}}}}
- "create file test.txt" → {{"action": "create_file", "parameters": {{"filename": "test.txt", "content": ""}}}}
"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
        except:
            return {"action": "chat", "parameters": {}, "reasoning": "fallback"}

    async def search_web(self, params: Dict, original_query: str) -> str:
        """Search the web and return results"""
        query = params.get("query", original_query)
        
        try:
            # Use DuckDuckGo search
            import requests
            from bs4 import BeautifulSoup
            
            url = f"https://html.duckduckgo.com/html/?q={query}"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            
            response = requests.get(url, headers=headers)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            results = []
            for result in soup.find_all('a', class_='result__a')[:5]:
                title = result.get_text()
                link = result.get('href')
                results.append(f"• {title}: {link}")
            
            return f"🔍 Search results for '{query}':\n\n" + "\n".join(results)
            
        except Exception as e:
            return f"❌ Search failed: {str(e)}"

    async def write_code(self, params: Dict, original_query: str) -> str:
        """Generate and return code"""
        task = params.get("task", original_query)
        language = params.get("language", "python")
        
        prompt = f"Write {language} code for: {task}\n\nProvide only the code with brief comments."
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            
            code = response.choices[0].message.content
            
            # Save code to file
            filename = f"generated_code_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{language}"
            with open(filename, 'w') as f:
                f.write(code)
            
            return f"💻 Generated {language} code:\n\n```{language}\n{code}\n```\n\n✅ Saved to: {filename}"
            
        except Exception as e:
            return f"❌ Code generation failed: {str(e)}"

    async def run_command(self, params: Dict, original_query: str) -> str:
        """Execute system command"""
        command = params.get("command", "")
        
        if not command:
            return "❌ No command specified"
        
        # Safety check
        dangerous_commands = ["rm -rf", "del /f", "format", "shutdown", "reboot"]
        if any(danger in command.lower() for danger in dangerous_commands):
            return "❌ Dangerous command blocked for safety"
        
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
            
            output = result.stdout if result.stdout else result.stderr
            return f"💻 Command: `{command}`\n\n```\n{output}\n```"
            
        except subprocess.TimeoutExpired:
            return f"⏰ Command timed out: {command}"
        except Exception as e:
            return f"❌ Command failed: {str(e)}"

    async def create_file(self, params: Dict, original_query: str) -> str:
        """Create a file"""
        filename = params.get("filename", "new_file.txt")
        content = params.get("content", "")
        
        try:
            with open(filename, 'w') as f:
                f.write(content)
            
            return f"✅ Created file: {filename}\n📄 Content: {content[:100]}{'...' if len(content) > 100 else ''}"
            
        except Exception as e:
            return f"❌ File creation failed: {str(e)}"

    async def read_file(self, params: Dict, original_query: str) -> str:
        """Read a file"""
        filename = params.get("filename", "")
        
        if not filename:
            # Extract filename from original query
            words = original_query.split()
            for word in words:
                if "." in word:
                    filename = word
                    break
        
        try:
            with open(filename, 'r') as f:
                content = f.read()
            
            return f"📄 File: {filename}\n\n```\n{content[:1000]}{'...' if len(content) > 1000 else ''}\n```"
            
        except Exception as e:
            return f"❌ File read failed: {str(e)}"

    async def analyze_data(self, params: Dict, original_query: str) -> str:
        """Analyze data or files"""
        data_source = params.get("source", "")
        
        prompt = f"Analyze this data request: {original_query}\n\nProvide specific analysis steps and insights."
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            
            return f"📊 Data Analysis:\n\n{response.choices[0].message.content}"
            
        except Exception as e:
            return f"❌ Analysis failed: {str(e)}"

    async def send_request(self, params: Dict, original_query: str) -> str:
        """Send HTTP request"""
        url = params.get("url", "")
        method = params.get("method", "GET")
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=params.get("data", {}), timeout=10)
            
            return f"🌐 HTTP {method} to {url}\n📊 Status: {response.status_code}\n📄 Response: {response.text[:500]}..."
            
        except Exception as e:
            return f"❌ Request failed: {str(e)}"

    async def calculate(self, params: Dict, original_query: str) -> str:
        """Perform calculations"""
        expression = params.get("expression", original_query)
        
        try:
            # Safe evaluation
            import ast
            import operator
            
            # Allowed operations
            ops = {
                ast.Add: operator.add,
                ast.Sub: operator.sub,
                ast.Mult: operator.mul,
                ast.Div: operator.truediv,
                ast.Pow: operator.pow,
                ast.USub: operator.neg,
            }
            
            def eval_expr(node):
                if isinstance(node, ast.Num):
                    return node.n
                elif isinstance(node, ast.BinOp):
                    return ops[type(node.op)](eval_expr(node.left), eval_expr(node.right))
                elif isinstance(node, ast.UnaryOp):
                    return ops[type(node.op)](eval_expr(node.operand))
                else:
                    raise TypeError(node)
            
            # Parse and evaluate
            result = eval_expr(ast.parse(expression, mode='eval').body)
            return f"🧮 Calculation: {expression} = {result}"
            
        except Exception as e:
            return f"❌ Calculation failed: {str(e)}"

    async def translate(self, params: Dict, original_query: str) -> str:
        """Translate text"""
        text = params.get("text", "")
        target_lang = params.get("target", "English")
        
        prompt = f"Translate this to {target_lang}: {text}"
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            
            return f"🌐 Translation to {target_lang}:\n\n{response.choices[0].message.content}"
            
        except Exception as e:
            return f"❌ Translation failed: {str(e)}"

    async def summarize(self, params: Dict, original_query: str) -> str:
        """Summarize text or content"""
        content = params.get("content", original_query)
        
        prompt = f"Summarize this concisely:\n\n{content}"
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            
            return f"📝 Summary:\n\n{response.choices[0].message.content}"
            
        except Exception as e:
            return f"❌ Summarization failed: {str(e)}"

    async def get_ai_response(self, user_input: str) -> str:
        """Get conversational AI response"""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant that takes action. Be concise and actionable."},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"❌ AI response failed: {str(e)}"

# Simple CLI interface
async def main():
    agent = ActionAgent()
    
    print("🤖 Action Agent Ready! Type 'quit' to exit.")
    print("Examples:")
    print("- 'search for python tutorials'")
    print("- 'create a sorting function'")
    print("- 'run ls command'")
    print("- 'create file test.txt with hello world'")
    
    while True:
        try:
            user_input = input("\n💬 You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            
            if not user_input:
                continue
            
            print("🔄 Processing...")
            response = await agent.process_request(user_input)
            print(f"\n🤖 Agent: {response}")
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n👋 Goodbye!")

if __name__ == "__main__":
    asyncio.run(main())