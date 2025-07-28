# quick_start.py - Quick setup and test script
import os
import asyncio
import subprocess
import sys

def install_requirements():
    """Install minimal requirements"""
    requirements = [
        "openai>=1.3.0",
        "anthropic>=0.8.0", 
        "google-generativeai>=0.3.0",
        "requests>=2.31.0",
        "beautifulsoup4>=4.12.0"
    ]
    
    print("📦 Installing requirements...")
    for req in requirements:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", req])
            print(f"✅ {req}")
        except:
            print(f"❌ Failed: {req}")

def setup_env():
    """Setup environment variables"""
    print("\n🔑 Environment Setup")
    print("Please set your API keys:")
    
    # Check existing keys
    keys_status = {
        "OPENAI_API_KEY": "✅" if os.getenv("OPENAI_API_KEY") else "❌",
        "ANTHROPIC_API_KEY": "✅" if os.getenv("ANTHROPIC_API_KEY") else "❌", 
        "GOOGLE_API_KEY": "✅" if os.getenv("GOOGLE_API_KEY") else "❌"
    }
    
    for key, status in keys_status.items():
        print(f"{status} {key}")
    
    if not os.getenv("OPENAI_API_KEY"):
        print("\n⚠️  At minimum, set OPENAI_API_KEY:")
        print("export OPENAI_API_KEY=sk-your-openai-key-here")
        return False
    
    return True

async def test_agent():
    """Test the agent"""
    try:
        from simple_agent import SimpleAIAgent
        
        print("\n🧪 Testing agent...")
        agent = SimpleAIAgent()
        
        # Test conversation
        response = await agent.process("Hello, what can you do?")
        print(f"✅ Conversation test: {response[:100]}...")
        
        # Test action
        response = await agent.process("create a file called test.txt with hello world")
        print(f"✅ Action test: {response[:100]}...")
        
        print("\n🎉 Agent is working!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def main():
    print("🚀 Quick Start - Personal AI Agent")
    print("=" * 40)
    
    # Install requirements
    install_requirements()
    
    # Setup environment
    if not setup_env():
        print("\n❌ Setup incomplete. Please set API keys and try again.")
        return
    
    # Test agent
    print("\n🧪 Testing agent...")
    try:
        result = asyncio.run(test_agent())
        if result:
            print("\n✅ Setup complete! Run: python simple_agent.py")
        else:
            print("\n❌ Tests failed. Check your API keys.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()