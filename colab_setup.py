# colab_setup.py - Google Colab setup and fine-tuning script
import os
import sys
import subprocess
import torch
from pathlib import Path
import json
import logging
from typing import Dict, List, Any

def install_requirements():
    """Install required packages in Colab"""
    print("🔧 Installing requirements...")
    
    requirements = [
        "torch>=2.0.0",
        "transformers>=4.35.0",
        "accelerate>=0.24.0",
        "peft>=0.6.0",
        "bitsandbytes>=0.41.0",
        "datasets>=2.14.0",
        "langchain>=0.1.0",
        "langgraph>=0.0.20",
        "openai>=1.3.0",
        "anthropic>=0.8.0",
        "google-generativeai>=0.3.0",
        "huggingface-hub>=0.19.0",
        "gradio>=4.8.0",
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
        "requests>=2.31.0",
        "beautifulsoup4>=4.12.0",
        "Pillow>=10.0.0",
        "speech-recognition>=3.10.0",
        "gtts>=2.4.0",
        "langdetect>=1.0.9",
        "python-telegram-bot>=20.7"
    ]
    
    for req in requirements:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", req])
            print(f"✅ Installed {req}")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install {req}: {e}")

def setup_colab_environment():
    """Setup Colab environment"""
    print("🚀 Setting up Colab environment...")
    
    # Check GPU availability
    if torch.cuda.is_available():
        print(f"✅ GPU available: {torch.cuda.get_device_name(0)}")
        print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    else:
        print("⚠️ No GPU available, using CPU")
    
    # Create directories
    directories = ["data", "models", "logs", "config", "core", "api", "integrations"]
    for dir_name in directories:
        os.makedirs(dir_name, exist_ok=True)
        print(f"📁 Created directory: {dir_name}")
    
    # Set environment variables
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    os.environ["TRANSFORMERS_CACHE"] = "/content/models"
    
    print("✅ Environment setup complete!")

def create_colab_config():
    """Create configuration for Colab"""
    config = {
        "models": {
            "text_generation": {
                "primary": "mistralai/Mistral-7B-Instruct-v0.1",
                "fallback": "microsoft/DialoGPT-medium"
            },
            "image_analysis": {
                "primary": "Salesforce/blip-image-captioning-base"
            },
            "speech": {
                "stt": "openai/whisper-base",
                "tts": "gtts"
            }
        },
        "fine_tuning": {
            "enabled": True,
            "lora_config": {
                "r": 8,
                "lora_alpha": 16,
                "target_modules": ["q_proj", "v_proj"],
                "lora_dropout": 0.1
            }
        },
        "deployment": {
            "environment": "colab",
            "gpu_acceleration": torch.cuda.is_available(),
            "model_quantization": True
        }
    }
    
    with open("config/colab_config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("✅ Colab configuration created!")

def fine_tune_model_colab(
    model_name: str = "mistralai/Mistral-7B-Instruct-v0.1",
    dataset_path: str = None,
    output_dir: str = "fine_tuned_model"
):
    """Fine-tune model in Colab using LoRA"""
    print(f"🔥 Starting fine-tuning: {model_name}")
    
    try:
        from transformers import (
            AutoTokenizer, AutoModelForCausalLM, 
            TrainingArguments, Trainer, DataCollatorForLanguageModeling
        )
        from peft import LoraConfig, get_peft_model, TaskType
        from datasets import Dataset
        import torch
        
        # Load tokenizer and model
        print("📥 Loading model and tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # Add pad token if not present
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
            load_in_8bit=True if torch.cuda.is_available() else False
        )
        
        # Configure LoRA
        lora_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=8,
            lora_alpha=16,
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
            lora_dropout=0.1,
            bias="none"
        )
        
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()
        
        # Prepare dataset
        if dataset_path and os.path.exists(dataset_path):
            print(f"📊 Loading dataset from {dataset_path}")
            with open(dataset_path, 'r') as f:
                data = json.load(f)
        else:
            print("📊 Using sample dataset")
            data = [
                {"text": "Hello, how can I help you today?"},
                {"text": "I'm an AI assistant created to be helpful, harmless, and honest."},
                {"text": "I can help with various tasks including coding, writing, and analysis."}
            ]
        
        # Tokenize dataset
        def tokenize_function(examples):
            return tokenizer(
                examples["text"],
                truncation=True,
                padding=True,
                max_length=512,
                return_tensors="pt"
            )
        
        dataset = Dataset.from_list(data)
        tokenized_dataset = dataset.map(tokenize_function, batched=True)
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=1,
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=10,
            learning_rate=2e-4,
            fp16=torch.cuda.is_available(),
            logging_steps=10,
            save_steps=100,
            evaluation_strategy="no",
            save_total_limit=2,
            remove_unused_columns=False,
            push_to_hub=False,
            report_to=None
        )
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False
        )
        
        # Trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_dataset,
            data_collator=data_collator,
            tokenizer=tokenizer
        )
        
        # Train
        print("🚀 Starting training...")
        trainer.train()
        
        # Save model
        print(f"💾 Saving model to {output_dir}")
        trainer.save_model()
        tokenizer.save_pretrained(output_dir)
        
        print("✅ Fine-tuning completed!")
        return output_dir
        
    except Exception as e:
        print(f"❌ Fine-tuning failed: {e}")
        return None

def create_gradio_interface():
    """Create Gradio interface for Colab"""
    print("🎨 Creating Gradio interface...")
    
    try:
        import gradio as gr
        import asyncio
        
        # Import our agent (simplified for Colab)
        sys.path.append('/content')
        
        # Mock agent for demo
        class ColabAgent:
            def __init__(self):
                self.conversation_history = []
            
            async def process_input(self, message, history):
                # Simple echo for demo - replace with actual agent
                response = f"Echo: {message}"
                history.append([message, response])
                return history, ""
        
        agent = ColabAgent()
        
        def chat_fn(message, history):
            # Convert to async
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(agent.process_input(message, history))
            return result
        
        # Create interface
        with gr.Blocks(title="Multimodal AI Agent") as demo:
            gr.Markdown("# 🤖 Multimodal AI Agent")
            gr.Markdown("Advanced AI assistant with multi-LLM routing")
            
            chatbot = gr.Chatbot(height=400)
            msg = gr.Textbox(placeholder="Type your message here...", label="Message")
            clear = gr.Button("Clear")
            
            msg.submit(chat_fn, [msg, chatbot], [chatbot, msg])
            clear.click(lambda: [], None, chatbot, queue=False)
            
            # Additional tabs
            with gr.Tab("File Upload"):
                file_input = gr.File(label="Upload Document")
                file_output = gr.Textbox(label="Analysis Result")
                file_btn = gr.Button("Analyze")
                
                def analyze_file(file):
                    if file:
                        return f"File analyzed: {file.name}"
                    return "No file uploaded"
                
                file_btn.click(analyze_file, file_input, file_output)
            
            with gr.Tab("Settings"):
                model_choice = gr.Dropdown(
                    choices=["GPT-4", "Claude", "Gemini", "Mistral"],
                    label="Preferred Model",
                    value="GPT-4"
                )
                language = gr.Dropdown(
                    choices=["English", "Spanish", "French", "German"],
                    label="Language",
                    value="English"
                )
        
        print("✅ Gradio interface created!")
        return demo
        
    except Exception as e:
        print(f"❌ Failed to create Gradio interface: {e}")
        return None

def deploy_to_huggingface_spaces():
    """Deploy to Hugging Face Spaces"""
    print("🚀 Preparing for Hugging Face Spaces deployment...")
    
    # Create app.py for Spaces
    app_code = '''
import gradio as gr
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def create_demo():
    """Create the main demo interface"""
    
    def chat_fn(message, history):
        # Simple echo - replace with actual agent
        response = f"AI Response: {message}"
        history.append([message, response])
        return history, ""
    
    with gr.Blocks(title="Multimodal AI Agent") as demo:
        gr.Markdown("# 🤖 Multimodal AI Agent")
        gr.Markdown("Advanced AI assistant with multi-LLM routing capabilities")
        
        chatbot = gr.Chatbot(height=500)
        msg = gr.Textbox(placeholder="Ask me anything...", label="Your Message")
        clear = gr.Button("Clear Chat")
        
        msg.submit(chat_fn, [msg, chatbot], [chatbot, msg])
        clear.click(lambda: [], None, chatbot, queue=False)
        
        with gr.Row():
            with gr.Column():
                gr.Markdown("### Features")
                gr.Markdown("- Multi-LLM routing")
                gr.Markdown("- Web search integration")
                gr.Markdown("- Document analysis")
                gr.Markdown("- Voice processing")
                gr.Markdown("- Image analysis")
            
            with gr.Column():
                gr.Markdown("### Supported Models")
                gr.Markdown("- GPT-4 & GPT-3.5")
                gr.Markdown("- Claude 3 (Opus, Sonnet, Haiku)")
                gr.Markdown("- Gemini Pro")
                gr.Markdown("- Mistral & LLaMA")
    
    return demo

if __name__ == "__main__":
    demo = create_demo()
    demo.launch()
'''
    
    with open("app.py", "w") as f:
        f.write(app_code)
    
    # Create requirements.txt for Spaces
    spaces_requirements = [
        "gradio>=4.8.0",
        "transformers>=4.35.0",
        "torch>=2.0.0",
        "accelerate>=0.24.0",
        "peft>=0.6.0",
        "langchain>=0.1.0",
        "openai>=1.3.0",
        "requests>=2.31.0",
        "Pillow>=10.0.0"
    ]
    
    with open("requirements.txt", "w") as f:
        f.write("\n".join(spaces_requirements))
    
    # Create README for Spaces
    readme_content = '''---
title: Multimodal AI Agent
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.8.0
app_file: app.py
pinned: false
license: mit
---

# Multimodal AI Agent

Advanced AI assistant with multi-LLM routing, web search, and multimodal capabilities.

## Features

- **Multi-LLM Routing**: Intelligent routing across GPT-4, Claude, Gemini, Mistral, and LLaMA
- **Web Search**: Real-time web search and content analysis
- **Multimodal**: Text, speech, and image processing
- **Fine-tuning**: LoRA-based fine-tuning support
- **Integrations**: Telegram bot, voice assistant, API endpoints

## Usage

Simply type your message and the AI will route it to the most appropriate model based on the task type, complexity, and other factors.

## Models Supported

- OpenAI: GPT-4, GPT-3.5-Turbo
- Anthropic: Claude 3 (Opus, Sonnet, Haiku)
- Google: Gemini Pro
- Mistral: Mistral-7B-Instruct
- Meta: LLaMA 2 & Code Llama

## Configuration

The system automatically selects the best model for each task, but you can specify preferences in the settings.
'''
    
    with open("README.md", "w") as f:
        f.write(readme_content)
    
    print("✅ Hugging Face Spaces files created!")
    print("📁 Files created:")
    print("   - app.py (main application)")
    print("   - requirements.txt (dependencies)")
    print("   - README.md (documentation)")
    print("\n🚀 To deploy:")
    print("1. Create a new Space on Hugging Face")
    print("2. Upload these files to your Space repository")
    print("3. Your app will be automatically deployed!")

def main():
    """Main setup function for Colab"""
    print("🚀 Multimodal AI Agent - Colab Setup")
    print("=" * 50)
    
    # Install requirements
    install_requirements()
    
    # Setup environment
    setup_colab_environment()
    
    # Create config
    create_colab_config()
    
    # Create Gradio interface
    demo = create_gradio_interface()
    
    # Prepare for deployment
    deploy_to_huggingface_spaces()
    
    print("\n✅ Setup complete!")
    print("\n🎯 Next steps:")
    print("1. Add your API keys to the environment")
    print("2. Run fine-tuning if needed: fine_tune_model_colab()")
    print("3. Launch Gradio interface: demo.launch()")
    print("4. Deploy to Hugging Face Spaces using the generated files")
    
    return demo

# Colab-specific functions
def set_api_keys():
    """Helper to set API keys in Colab"""
    print("🔑 Setting up API keys...")
    print("Run these commands to set your API keys:")
    print()
    print("import os")
    print("os.environ['OPENAI_API_KEY'] = 'your-openai-key'")
    print("os.environ['ANTHROPIC_API_KEY'] = 'your-anthropic-key'")
    print("os.environ['GOOGLE_API_KEY'] = 'your-google-key'")
    print("os.environ['HUGGINGFACE_API_KEY'] = 'your-hf-key'")
    print("os.environ['TELEGRAM_BOT_TOKEN'] = 'your-telegram-token'")

def quick_test():
    """Quick test of the system"""
    print("🧪 Running quick test...")
    
    try:
        # Test imports
        import torch
        import transformers
        import gradio as gr
        
        print("✅ All imports successful")
        print(f"✅ PyTorch version: {torch.__version__}")
        print(f"✅ Transformers version: {transformers.__version__}")
        print(f"✅ Gradio version: {gr.__version__}")
        
        if torch.cuda.is_available():
            print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
        else:
            print("⚠️ No GPU available")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

if __name__ == "__main__":
    # Run setup
    demo = main()
    
    # Show API key setup
    set_api_keys()
    
    # Run test
    quick_test()
    
    print("\n🎉 Ready to go! Launch the demo with: demo.launch(share=True)")