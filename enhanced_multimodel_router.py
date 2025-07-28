# enhanced_multimodel_router.py - Enhanced multi-model router with all major LLMs
import os
import asyncio
import json
from typing import Dict, Any, List, Optional
import openai
import anthropic
import google.generativeai as genai
from datetime import datetime

class EnhancedMultiModelRouter:
    def __init__(self):
        # Initialize all available models
        self.models = {}
        self.initialize_models()
        
    def initialize_models(self):
        """Initialize all available AI models"""
        
        # OpenAI Models
        if os.getenv("OPENAI_API_KEY"):
            self.models.update({
                "gpt-4": {
                    "client": openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY")),
                    "model_name": "gpt-4",
                    "strengths": ["reasoning", "coding", "analysis"],
                    "cost": 0.03,
                    "speed": "medium"
                },
                "gpt-4-turbo": {
                    "client": openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY")),
                    "model_name": "gpt-4-turbo-preview",
                    "strengths": ["reasoning", "coding", "analysis", "speed"],
                    "cost": 0.01,
                    "speed": "fast"
                },
                "gpt-3.5-turbo": {
                    "client": openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY")),
                    "model_name": "gpt-3.5-turbo",
                    "strengths": ["speed", "cost-effective", "general"],
                    "cost": 0.002,
                    "speed": "fast"
                }
            })
        
        # Claude Models
        if os.getenv("ANTHROPIC_API_KEY"):
            self.models.update({
                "claude-3-opus": {
                    "client": anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY")),
                    "model_name": "claude-3-opus-20240229",
                    "strengths": ["creative", "analysis", "safety", "reasoning"],
                    "cost": 0.075,
                    "speed": "slow"
                },
                "claude-3-sonnet": {
                    "client": anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY")),
                    "model_name": "claude-3-sonnet-20240229",
                    "strengths": ["balanced", "coding", "analysis"],
                    "cost": 0.015,
                    "speed": "medium"
                },
                "claude-3-haiku": {
                    "client": anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY")),
                    "model_name": "claude-3-haiku-20240307",
                    "strengths": ["speed", "cost-effective"],
                    "cost": 0.0025,
                    "speed": "fast"
                }
            })
        
        # Google Gemini Models
        if os.getenv("GOOGLE_API_KEY"):
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            self.models.update({
                "gemini-pro": {
                    "client": genai,
                    "model_name": "gemini-pro",
                    "strengths": ["multimodal", "reasoning", "multilingual"],
                    "cost": 0.0005,
                    "speed": "medium"
                },
                "gemini-pro-vision": {
                    "client": genai,
                    "model_name": "gemini-pro-vision",
                    "strengths": ["vision", "multimodal", "analysis"],
                    "cost": 0.0025,
                    "speed": "medium"
                }
            })
        
        # Microsoft Copilot (via OpenAI compatible endpoint)
        if os.getenv("COPILOT_API_KEY"):
            self.models.update({
                "copilot": {
                    "client": openai.OpenAI(
                        api_key=os.getenv("COPILOT_API_KEY"),
                        base_url="https://api.githubcopilot.com/chat/completions"
                    ),
                    "model_name": "gpt-4",
                    "strengths": ["coding", "development", "github"],
                    "cost": 0.02,
                    "speed": "medium"
                }
            })
        
        # Zencoder (Custom model - placeholder)
        if os.getenv("ZENCODER_API_KEY"):
            self.models.update({
                "zencoder": {
                    "client": openai.OpenAI(
                        api_key=os.getenv("ZENCODER_API_KEY"),
                        base_url=os.getenv("ZENCODER_BASE_URL", "https://api.zencoder.ai/v1")
                    ),
                    "model_name": "zencoder-v1",
                    "strengths": ["specialized", "custom"],
                    "cost": 0.01,
                    "speed": "medium"
                }
            })

    def select_best_model(self, task_type: str, complexity: str = "medium", budget: float = 1.0) -> str:
        """Select the best model based on task requirements"""
        
        if not self.models:
            return None
        
        scores = {}
        
        for model_name, model_info in self.models.items():
            score = 0
            
            # Task-specific scoring
            if task_type == "coding":
                if "coding" in model_info["strengths"]:
                    score += 30
                if "reasoning" in model_info["strengths"]:
                    score += 20
                if model_name in ["copilot", "gpt-4", "claude-3-sonnet"]:
                    score += 15
            
            elif task_type == "creative":
                if "creative" in model_info["strengths"]:
                    score += 30
                if model_name in ["claude-3-opus", "gpt-4"]:
                    score += 20
            
            elif task_type == "analysis":
                if "analysis" in model_info["strengths"]:
                    score += 30
                if "reasoning" in model_info["strengths"]:
                    score += 20
            
            elif task_type == "vision":
                if "vision" in model_info["strengths"] or "multimodal" in model_info["strengths"]:
                    score += 40
            
            elif task_type == "multilingual":
                if "multilingual" in model_info["strengths"]:
                    score += 30
                if model_name in ["gemini-pro", "gpt-4"]:
                    score += 15
            
            # Complexity scoring
            if complexity == "simple":
                if "cost-effective" in model_info["strengths"]:
                    score += 15
                if model_info["speed"] == "fast":
                    score += 10
            elif complexity == "complex":
                if model_name in ["gpt-4", "claude-3-opus"]:
                    score += 20
            
            # Budget consideration
            if model_info["cost"] <= budget:
                score += 10
            else:
                score -= 20
            
            scores[model_name] = score
        
        # Return best model
        best_model = max(scores.items(), key=lambda x: x[1])
        return best_model[0]

    async def generate_response(self, prompt: str, model_name: str = None, task_type: str = "general") -> Dict[str, Any]:
        """Generate response using specified or best model"""
        
        if not model_name:
            model_name = self.select_best_model(task_type)
        
        if not model_name or model_name not in self.models:
            return {"error": "No suitable model available"}
        
        model_info = self.models[model_name]
        start_time = datetime.now()
        
        try:
            if "openai" in str(type(model_info["client"])) or model_name in ["copilot", "zencoder"]:
                # OpenAI-compatible models
                response = model_info["client"].chat.completions.create(
                    model=model_info["model_name"],
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=2000
                )
                content = response.choices[0].message.content
                tokens_used = response.usage.total_tokens if hasattr(response, 'usage') else 0
            
            elif "anthropic" in str(type(model_info["client"])):
                # Claude models
                response = model_info["client"].messages.create(
                    model=model_info["model_name"],
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                content = response.content[0].text
                tokens_used = response.usage.input_tokens + response.usage.output_tokens
            
            elif "google" in str(model_info["client"].__name__):
                # Gemini models
                model = model_info["client"].GenerativeModel(model_info["model_name"])
                response = model.generate_content(prompt)
                content = response.text
                tokens_used = 0  # Gemini doesn't provide token count
            
            else:
                return {"error": f"Unsupported model type: {model_name}"}
            
            execution_time = (datetime.now() - start_time).total_seconds()
            cost = tokens_used * model_info["cost"] / 1000
            
            return {
                "response": content,
                "model_used": model_name,
                "execution_time": execution_time,
                "tokens_used": tokens_used,
                "cost": cost,
                "success": True
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "model_used": model_name,
                "success": False
            }

    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        return list(self.models.keys())

    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get information about a specific model"""
        return self.models.get(model_name, {})

# Usage example
async def main():
    router = EnhancedMultiModelRouter()
    
    print("🤖 Enhanced Multi-Model Router")
    print(f"Available models: {router.get_available_models()}")
    
    # Test different task types
    test_prompts = [
        ("Write a Python function to sort a list", "coding"),
        ("Write a creative story about AI", "creative"),
        ("Analyze the pros and cons of renewable energy", "analysis"),
        ("Translate 'Hello world' to Spanish", "multilingual")
    ]
    
    for prompt, task_type in test_prompts:
        print(f"\n📝 Task: {prompt}")
        print(f"🎯 Type: {task_type}")
        
        result = await router.generate_response(prompt, task_type=task_type)
        
        if result.get("success"):
            print(f"🤖 Model: {result['model_used']}")
            print(f"⏱️ Time: {result['execution_time']:.2f}s")
            print(f"💰 Cost: ${result['cost']:.4f}")
            print(f"📄 Response: {result['response'][:200]}...")
        else:
            print(f"❌ Error: {result.get('error')}")

if __name__ == "__main__":
    asyncio.run(main())