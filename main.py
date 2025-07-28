# main.py - Main entry point for the Multimodal AI Agent
import asyncio
import logging
import os
import sys
from pathlib import Path
import argparse
from typing import Dict, Any

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from core.multimodal_agent import MultimodalAIAgent
from core.web_tools import WebTools
from core.voice_assistant import VoiceAssistant, VoiceCommandProcessor
from integrations.telegram_bot import TelegramBot
from api.fastapi_server import create_app
import uvicorn

class AIAgentOrchestrator:
    """Main orchestrator for the AI Agent system"""
    
    def __init__(self, config_path: str = "config/agent_config.json"):
        self.config_path = config_path
        self.agent = None
        self.web_tools = None
        self.voice_assistant = None
        self.telegram_bot = None
        self.api_server = None
        
        # Setup logging
        self.setup_logging()
        self.logger = logging.getLogger("AIAgentOrchestrator")

    def setup_logging(self):
        """Setup comprehensive logging"""
        # Create logs directory
        os.makedirs("logs", exist_ok=True)
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/main.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )

    async def initialize_agent(self):
        """Initialize the main AI agent"""
        self.logger.info("Initializing Multimodal AI Agent...")
        
        try:
            self.agent = MultimodalAIAgent(self.config_path)
            self.logger.info("✅ AI Agent initialized successfully")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize AI Agent: {e}")
            return False

    async def initialize_web_tools(self):
        """Initialize web tools"""
        self.logger.info("Initializing Web Tools...")
        
        try:
            self.web_tools = WebTools()
            self.logger.info("✅ Web Tools initialized successfully")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Web Tools: {e}")
            return False

    async def initialize_voice_assistant(self):
        """Initialize voice assistant"""
        self.logger.info("Initializing Voice Assistant...")
        
        try:
            self.voice_assistant = VoiceAssistant(
                wake_word="hey assistant",
                language="en"
            )
            
            # Set up command processor
            command_processor = VoiceCommandProcessor(self.process_agent_request)
            self.voice_assistant.set_response_callback(command_processor.process_command)
            
            self.logger.info("✅ Voice Assistant initialized successfully")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Voice Assistant: {e}")
            return False

    async def initialize_telegram_bot(self):
        """Initialize Telegram bot"""
        telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
        
        if not telegram_token:
            self.logger.warning("⚠️ TELEGRAM_BOT_TOKEN not found, skipping Telegram bot")
            return False
        
        self.logger.info("Initializing Telegram Bot...")
        
        try:
            self.telegram_bot = TelegramBot(telegram_token, self.process_agent_request)
            self.logger.info("✅ Telegram Bot initialized successfully")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Telegram Bot: {e}")
            return False

    async def process_agent_request(self, input_data: Dict[str, Any]) -> str:
        """Process request through the AI agent"""
        try:
            if not self.agent:
                return "AI Agent not initialized"
            
            input_type = input_data.get("type", "text")
            
            if input_type == "text":
                response = await self.agent.process_text_input(input_data["text"])
            elif input_type == "speech":
                response = await self.agent.process_multimodal_input(input_data)
            elif input_type == "image":
                response = await self.agent.process_multimodal_input(input_data)
            elif input_type == "document":
                # Process document through web tools first
                if self.web_tools:
                    # Save document temporarily and process
                    temp_path = f"temp_{input_data.get('filename', 'document')}"
                    with open(temp_path, 'wb') as f:
                        f.write(input_data["data"])
                    
                    doc_content = await self.web_tools.process_file_upload(temp_path)
                    os.unlink(temp_path)  # Clean up
                    
                    # Process through agent
                    response = await self.agent.process_text_input(
                        f"Analyze this document: {doc_content['content'][:2000]}"
                    )
                else:
                    response = "Document processing not available"
            else:
                response = await self.agent.process_text_input(str(input_data))
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing agent request: {e}")
            return f"Sorry, I encountered an error: {str(e)}"

    async def start_voice_assistant(self):
        """Start voice assistant"""
        if self.voice_assistant:
            self.logger.info("🎤 Starting Voice Assistant...")
            await self.voice_assistant.start_listening()

    async def start_telegram_bot(self):
        """Start Telegram bot"""
        if self.telegram_bot:
            self.logger.info("📱 Starting Telegram Bot...")
            await self.telegram_bot.start_bot()

    async def start_api_server(self, host: str = "0.0.0.0", port: int = 8000):
        """Start FastAPI server"""
        self.logger.info(f"🌐 Starting API Server on {host}:{port}...")
        
        app = create_app(self.process_agent_request)
        config = uvicorn.Config(app, host=host, port=port, log_level="info")
        server = uvicorn.Server(config)
        
        await server.serve()

    async def run_interactive_mode(self):
        """Run in interactive console mode"""
        self.logger.info("💬 Starting Interactive Mode...")
        self.logger.info("Type 'quit' to exit, 'help' for commands")
        
        while True:
            try:
                user_input = input("\n🤖 You: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'q']:
                    break
                elif user_input.lower() == 'help':
                    self.show_help()
                    continue
                elif user_input.lower() == 'stats':
                    stats = self.agent.get_session_stats() if self.agent else {}
                    print(f"📊 Stats: {stats}")
                    continue
                elif user_input.lower().startswith('search '):
                    query = user_input[7:]
                    if self.web_tools:
                        async with self.web_tools as wt:
                            results = await wt.web_search(query, num_results=3)
                            for i, result in enumerate(results, 1):
                                print(f"{i}. {result['title']}: {result['snippet'][:100]}...")
                    continue
                
                if not user_input:
                    continue
                
                # Process through agent
                response = await self.process_agent_request({"text": user_input, "type": "text"})
                print(f"🤖 Assistant: {response}")
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Error: {e}")
        
        print("\n👋 Goodbye!")

    def show_help(self):
        """Show help information"""
        help_text = """
🤖 **AI Agent Commands:**

**Basic Commands:**
- Just type your message to chat with the AI
- 'help' - Show this help
- 'quit' or 'exit' - Exit the program
- 'stats' - Show session statistics

**Special Commands:**
- 'search <query>' - Web search
- 'voice' - Test voice system (if available)

**Examples:**
- "Write a Python function to sort a list"
- "search latest AI news"
- "translate hello to Spanish"
- "explain quantum computing"

**Features Available:**
✅ Multi-LLM routing (GPT-4, Claude, Gemini, etc.)
✅ Web search and content analysis
✅ Code generation and debugging
✅ Language translation
✅ Document processing
✅ Voice interaction (if configured)
✅ Telegram bot (if token provided)
        """
        print(help_text)

    async def health_check(self) -> Dict[str, Any]:
        """Perform system health check"""
        health_status = {
            "timestamp": asyncio.get_event_loop().time(),
            "status": "healthy",
            "components": {}
        }
        
        # Check AI Agent
        if self.agent:
            try:
                test_response = await self.agent.process_text_input("Hello")
                health_status["components"]["ai_agent"] = {
                    "status": "healthy" if test_response else "unhealthy",
                    "last_response_length": len(test_response) if test_response else 0
                }
            except Exception as e:
                health_status["components"]["ai_agent"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        # Check Web Tools
        if self.web_tools:
            try:
                async with self.web_tools as wt:
                    test_search = await wt.web_search("test", num_results=1)
                health_status["components"]["web_tools"] = {
                    "status": "healthy" if test_search else "degraded",
                    "search_results": len(test_search) if test_search else 0
                }
            except Exception as e:
                health_status["components"]["web_tools"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        # Check Voice Assistant
        if self.voice_assistant:
            voice_stats = self.voice_assistant.get_voice_stats()
            health_status["components"]["voice_assistant"] = {
                "status": "healthy" if voice_stats["is_active"] else "inactive",
                "stats": voice_stats
            }
        
        # Check Telegram Bot
        if self.telegram_bot:
            user_sessions = self.telegram_bot.get_user_sessions()
            health_status["components"]["telegram_bot"] = {
                "status": "healthy",
                "active_users": user_sessions["total_users"]
            }
        
        return health_status

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Multimodal AI Agent")
    parser.add_argument("--mode", choices=["interactive", "api", "telegram", "voice", "all"], 
                       default="interactive", help="Run mode")
    parser.add_argument("--config", default="config/agent_config.json", help="Config file path")
    parser.add_argument("--host", default="0.0.0.0", help="API server host")
    parser.add_argument("--port", type=int, default=8000, help="API server port")
    parser.add_argument("--health-check", action="store_true", help="Run health check and exit")
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = AIAgentOrchestrator(args.config)
    
    # Initialize core components
    agent_ok = await orchestrator.initialize_agent()
    if not agent_ok:
        print("❌ Failed to initialize AI Agent. Exiting.")
        return
    
    web_tools_ok = await orchestrator.initialize_web_tools()
    voice_ok = await orchestrator.initialize_voice_assistant()
    telegram_ok = await orchestrator.initialize_telegram_bot()
    
    print(f"""
🚀 **Multimodal AI Agent System Started**

✅ AI Agent: Ready
{'✅' if web_tools_ok else '❌'} Web Tools: {'Ready' if web_tools_ok else 'Failed'}
{'✅' if voice_ok else '❌'} Voice Assistant: {'Ready' if voice_ok else 'Failed'}
{'✅' if telegram_ok else '❌'} Telegram Bot: {'Ready' if telegram_ok else 'Not configured'}

Mode: {args.mode.upper()}
    """)
    
    # Health check mode
    if args.health_check:
        health = await orchestrator.health_check()
        print(f"🏥 Health Check: {health}")
        return
    
    # Run based on mode
    try:
        if args.mode == "interactive":
            await orchestrator.run_interactive_mode()
            
        elif args.mode == "api":
            await orchestrator.start_api_server(args.host, args.port)
            
        elif args.mode == "telegram":
            if telegram_ok:
                await orchestrator.start_telegram_bot()
                # Keep running
                while True:
                    await asyncio.sleep(1)
            else:
                print("❌ Telegram bot not available")
                
        elif args.mode == "voice":
            if voice_ok:
                await orchestrator.start_voice_assistant()
                # Keep running
                while True:
                    await asyncio.sleep(1)
            else:
                print("❌ Voice assistant not available")
                
        elif args.mode == "all":
            # Start all services
            tasks = []
            
            if telegram_ok:
                tasks.append(orchestrator.start_telegram_bot())
            
            if voice_ok:
                tasks.append(orchestrator.start_voice_assistant())
            
            tasks.append(orchestrator.start_api_server(args.host, args.port))
            
            # Run all tasks concurrently
            await asyncio.gather(*tasks)
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Cleanup
        if orchestrator.telegram_bot:
            await orchestrator.telegram_bot.stop_bot()
        if orchestrator.voice_assistant:
            orchestrator.voice_assistant.stop_listening()

if __name__ == "__main__":
    asyncio.run(main())