# 🤖 Multimodal AI Agent System

A powerful real-time multimodal AI agent system with intelligent LLM routing, web search, automation, and comprehensive integrations.

## ✨ Features

### 🧠 Multi-LLM Intelligence
- **Intelligent Routing**: Automatically routes tasks to the best model (GPT-4, Claude, Gemini, Mistral, LLaMA)
- **LangGraph Integration**: Advanced workflow orchestration and decision-making
- **Cost Optimization**: Smart model selection based on task complexity and cost
- **Performance Tracking**: Real-time monitoring of model performance and usage

### 🌐 Multimodal Capabilities
- **Text Processing**: Advanced text generation, analysis, and conversation
- **Speech Processing**: Voice-to-text, text-to-speech, wake word detection
- **Image Analysis**: GPT-4 Vision, BLIP, and CLIP integration
- **Document Processing**: PDF, Word, text file analysis and summarization

### 🔍 Web Integration
- **Multi-Engine Search**: Tavily, SerpAPI, DuckDuckGo integration
- **Content Extraction**: Automatic web scraping and content analysis
- **Real-time Updates**: Automatic pulling of latest information
- **URL Processing**: Direct URL content analysis and summarization

### 🤖 Automation & Tools
- **System Commands**: Safe execution of system operations
- **File Operations**: Create, read, modify files programmatically
- **Git Integration**: Version control operations
- **Deployment Tools**: One-click deployment to various platforms

### 🔧 Fine-tuning & Customization
- **LoRA Fine-tuning**: Efficient fine-tuning using PEFT
- **Custom Instructions**: Personalized agent behavior
- **Memory System**: Long-term conversation memory
- **User Preferences**: Adaptive learning from user feedback

### 📱 Integrations
- **Telegram Bot**: Full-featured Telegram integration
- **Voice Assistant**: Wake word detection and voice commands
- **REST API**: Comprehensive FastAPI server
- **WebSocket**: Real-time communication
- **WhatsApp**: (Optional) WhatsApp integration

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-agent

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.template .env
```

### 2. Configuration

Add your API keys to `.env`:

```bash
# Required
OPENAI_API_KEY=sk-your-openai-key
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key

# Optional (for enhanced features)
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key
HUGGINGFACE_API_KEY=your-hf-key
TAVILY_API_KEY=tvly-your-tavily-key
SERPAPI_API_KEY=your-serpapi-key
TELEGRAM_BOT_TOKEN=your-telegram-token
```

### 3. Run the Agent

```bash
# Interactive mode
python main.py --mode interactive

# API server
python main.py --mode api --port 8000

# Telegram bot
python main.py --mode telegram

# Voice assistant
python main.py --mode voice

# All services
python main.py --mode all
```

## 🎯 Usage Examples

### Text Interaction
```python
from core.multimodal_agent import MultimodalAIAgent

agent = MultimodalAIAgent()
response = await agent.process_text_input("Write a Python function to calculate fibonacci numbers")
print(response)
```

### Web Search
```python
from core.web_tools import WebTools

async with WebTools() as web_tools:
    results = await web_tools.web_search("latest AI developments", num_results=5)
    summary = await web_tools.summarize_content(results[0]['content'])
```

### Voice Interaction
```python
from core.voice_assistant import VoiceAssistant

voice_assistant = VoiceAssistant(wake_word="hey assistant")
await voice_assistant.start_listening()
```

### API Usage
```bash
# Chat endpoint
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how can you help me?"}'

# File upload
curl -X POST "http://localhost:8000/upload" \
  -F "file=@document.pdf" \
  -F "session_id=user123"

# Image analysis
curl -X POST "http://localhost:8000/image" \
  -F "file=@image.jpg" \
  -F "prompt=What's in this image?"
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │───▶│  LangGraph       │───▶│  Model Router   │
│ (Text/Voice/    │    │  Orchestrator    │    │  (GPT/Claude/   │
│  Image/File)    │    │                  │    │   Gemini/etc)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Web Tools      │    │  Memory System   │    │  Response       │
│  (Search/       │    │  (Conversation/  │    │  Generation     │
│   Scraping)     │    │   Preferences)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Model Configuration
```json
{
  "models": {
    "text_generation": {
      "primary": "gpt-4",
      "fallback": "mistral-7b-instruct"
    },
    "image_analysis": {
      "primary": "gpt-4-vision",
      "fallback": "blip-image-captioning"
    }
  }
}
```

### Routing Configuration
```json
{
  "routing": {
    "confidence_threshold": 0.8,
    "cost_optimization": true,
    "load_balancing": true
  }
}
```

## 🎓 Google Colab Setup

For cloud training and deployment:

```python
# In Google Colab
!git clone <repository-url>
%cd ai-agent

# Run setup
exec(open('colab_setup.py').read())

# Set API keys
import os
os.environ['OPENAI_API_KEY'] = 'your-key'

# Launch interface
demo = main()
demo.launch(share=True)
```

## 🔄 Fine-tuning

### LoRA Fine-tuning
```python
from core.multimodal_agent import MultimodalAIAgent

agent = MultimodalAIAgent()

# Prepare training data
training_data = [
    {"input": "Hello", "output": "Hi there! How can I help you?"},
    # ... more examples
]

# Fine-tune
await agent.fine_tune_model(training_data, model_name="mistral-7b-instruct")
```

### Custom Instructions
```python
agent.set_custom_instructions("""
You are a helpful AI assistant specialized in software development.
Always provide code examples and explain your reasoning.
Be concise but thorough in your explanations.
""")
```

## 📊 Monitoring & Logging

### JSON Logging
All interactions are logged in structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "session_id": "user123",
  "task_type": "code_generation",
  "model_used": "gpt-4",
  "input": "Write a sorting function",
  "output": "Here's a Python sorting function...",
  "execution_time": 1.23,
  "tokens_used": 150,
  "cost": 0.0045,
  "success": true
}
```

### Performance Metrics
```python
# Get session statistics
stats = agent.get_session_stats()
print(f"Total interactions: {stats['total_interactions']}")
print(f"Success rate: {stats['success_rate']}")
print(f"Average cost: ${stats['total_cost']}")
```

## 🚀 Deployment Options

### Local Development
```bash
python main.py --mode all --host 0.0.0.0 --port 8000
```

### Docker
```dockerfile
FROM python:3.9-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "main.py", "--mode", "api"]
```

### Hugging Face Spaces
```bash
# Use the generated files from colab_setup.py
# Upload app.py, requirements.txt, and README.md to your Space
```

### Cloud Platforms
- **Google Colab**: Use `colab_setup.py`
- **Kaggle**: Similar to Colab setup
- **AWS/GCP/Azure**: Use Docker deployment

## 🔒 Security Features

- **Rate Limiting**: Configurable request limits
- **Content Filtering**: Automatic content moderation
- **Data Encryption**: Secure data handling
- **API Key Management**: Secure credential storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: [Your contact email]

## 🎉 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude
- Google for Gemini
- Hugging Face for transformers and hosting
- LangChain team for the framework
- All open-source contributors

---

**Built with ❤️ for the AI community**

*Ready to build the future of AI assistance? Let's go! 🚀*