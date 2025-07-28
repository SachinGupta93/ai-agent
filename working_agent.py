# working_agent.py - AI Agent that actually executes commands
import asyncio
import os
from real_executor import RealExecutor
from enhanced_multimodel_router import EnhancedMultiModelRouter

class WorkingAgent:
    def __init__(self):
        self.executor = RealExecutor()
        self.router = EnhancedMultiModelRouter()
        print("🤖 Working Agent Ready - I actually execute commands!")
    
    async def process(self, user_input: str) -> str:
        """Process user input and execute or respond"""
        
        # Check if this is an executable command
        executable_keywords = [
            "open", "launch", "start", "run",
            "close", "kill", "stop",
            "create file", "make file", "new file",
            "search", "find", "look up",
            "screenshot", "capture",
            "calculator", "notepad", "browser"
        ]
        
        is_executable = any(keyword in user_input.lower() for keyword in executable_keywords)
        
        if is_executable:
            # Execute the command
            result = self.executor.execute_command(user_input)
            return f"🔧 EXECUTED: {result}"
        else:
            # Use AI for conversation
            ai_result = await self.router.generate_response(user_input, task_type="general")
            if ai_result.get("success"):
                return f"🤖 {ai_result['model_used']}: {ai_result['response']}"
            else:
                return f"❌ AI Error: {ai_result.get('error')}"

async def main():
    agent = WorkingAgent()
    
    print("\n🚀 Working AI Agent - I Actually Do Things!")
    print("\n💡 Try these commands:")
    print("  • 'open chrome'")
    print("  • 'search linkedin'")
    print("  • 'create file test.txt'")
    print("  • 'take screenshot'")
    print("  • 'open calculator'")
    print("  • 'what is AI?' (for conversation)")
    
    while True:
        try:
            user_input = input("\n🗣️  You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not user_input:
                continue
            
            print("⚡ Executing...")
            response = await agent.process(user_input)
            print(f"\n{response}")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Install required packages
    try:
        import pyautogui
        import psutil
    except ImportError:
        print("📦 Installing required packages...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyautogui", "psutil"])
        print("✅ Packages installed!")
    
    # Check API key
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Please set OPENAI_API_KEY environment variable")
        print("export OPENAI_API_KEY=sk-your-openai-key-here")
    else:
        asyncio.run(main())