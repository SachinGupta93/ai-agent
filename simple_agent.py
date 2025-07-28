# simple_agent.py - Simple, focused AI agent that actually does tasks
import os
import asyncio
import json
import subprocess
import requests
from datetime import datetime
from enhanced_multimodel_router import EnhancedMultiModelRouter
from core.action_agent import ActionAgent

class SimpleAIAgent:
    def __init__(self):
        self.router = EnhancedMultiModelRouter()
        self.action_agent = ActionAgent()
        self.conversation_history = []
        
        print("🤖 Simple AI Agent Initialized")
        print(f"📡 Available models: {self.router.get_available_models()}")

    async def process(self, user_input: str) -> str:
        """Main processing function - determines if action needed or just conversation"""
        
        # Check if this requires an action
        action_keywords = [
            "search", "find", "look up", "google",
            "create", "write", "generate", "make",
            "run", "execute", "command",
            "calculate", "compute", "solve",
            "translate", "convert",
            "file", "save", "read", "open",
            "analyze", "check", "review"
        ]
        
        needs_action = any(keyword in user_input.lower() for keyword in action_keywords)
        
        if needs_action:
            # Use action agent for tasks
            result = await self.action_agent.process_request(user_input)
            self.log_interaction(user_input, result, "action")
            return result
        else:
            # Use best model for conversation
            task_type = self.determine_task_type(user_input)
            result = await self.router.generate_response(user_input, task_type=task_type)
            
            if result.get("success"):
                response = result["response"]
                self.log_interaction(user_input, response, "conversation", result["model_used"])
                return f"🤖 {result['model_used']}: {response}"
            else:
                return f"❌ Error: {result.get('error')}"

    def determine_task_type(self, user_input: str) -> str:
        """Determine the type of task based on user input"""
        input_lower = user_input.lower()
        
        if any(word in input_lower for word in ["code", "program", "function", "script", "debug"]):
            return "coding"
        elif any(word in input_lower for word in ["story", "creative", "poem", "imagine"]):
            return "creative"
        elif any(word in input_lower for word in ["analyze", "compare", "evaluate", "pros", "cons"]):
            return "analysis"
        elif any(word in input_lower for word in ["translate", "language", "spanish", "french"]):
            return "multilingual"
        else:
            return "general"

    def log_interaction(self, input_text: str, output_text: str, interaction_type: str, model_used: str = "action_agent"):
        """Log interactions for learning"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "input": input_text,
            "output": output_text[:200] + "..." if len(output_text) > 200 else output_text,
            "type": interaction_type,
            "model": model_used
        }
        
        self.conversation_history.append(log_entry)
        
        # Save to file
        try:
            with open("agent_logs.json", "a") as f:
                f.write(json.dumps(log_entry) + "\n")
        except:
            pass

    def get_stats(self) -> str:
        """Get agent statistics"""
        total_interactions = len(self.conversation_history)
        action_count = sum(1 for h in self.conversation_history if h["type"] == "action")
        conversation_count = total_interactions - action_count
        
        models_used = {}
        for h in self.conversation_history:
            model = h.get("model", "unknown")
            models_used[model] = models_used.get(model, 0) + 1
        
        return f"""📊 Agent Statistics:
• Total interactions: {total_interactions}
• Actions performed: {action_count}
• Conversations: {conversation_count}
• Models used: {models_used}
• Available models: {self.router.get_available_models()}"""

async def main():
    """Main CLI interface"""
    agent = SimpleAIAgent()
    
    print("\n🚀 Simple AI Agent Ready!")
    print("💡 I can:")
    print("  • Execute tasks (search, create files, run commands)")
    print("  • Have conversations using the best AI model")
    print("  • Switch between multiple LLMs automatically")
    print("\n📝 Examples:")
    print("  • 'search for python tutorials'")
    print("  • 'create a file called test.txt'")
    print("  • 'write a sorting function'")
    print("  • 'run ls command'")
    print("  • 'what is machine learning?'")
    print("\n💬 Type 'stats' for statistics, 'quit' to exit")
    
    while True:
        try:
            user_input = input("\n🗣️  You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if user_input.lower() == 'stats':
                print(agent.get_stats())
                continue
            
            if not user_input:
                continue
            
            print("🔄 Processing...")
            response = await agent.process(user_input)
            print(f"\n{response}")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Set up environment
    print("🔧 Setting up environment...")
    
    # Check for required API keys
    required_keys = ["OPENAI_API_KEY"]
    missing_keys = [key for key in required_keys if not os.getenv(key)]
    
    if missing_keys:
        print(f"⚠️  Missing API keys: {missing_keys}")
        print("Please set these environment variables:")
        for key in missing_keys:
            print(f"  export {key}=your-api-key-here")
        print("\nOptional keys for more models:")
        print("  export ANTHROPIC_API_KEY=your-claude-key")
        print("  export GOOGLE_API_KEY=your-gemini-key")
        print("  export COPILOT_API_KEY=your-copilot-key")
        print("  export ZENCODER_API_KEY=your-zencoder-key")
    else:
        asyncio.run(main())