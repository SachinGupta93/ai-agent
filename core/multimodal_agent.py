# core/multimodal_agent.py
import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass, asdict
from enum import Enum

import torch
import transformers
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, 
    WhisperProcessor, WhisperForConditionalGeneration,
    BlipProcessor, BlipForConditionalGeneration,
    pipeline
)
from peft import LoraConfig, get_peft_model, TaskType
import speech_recognition as sr
from gtts import gTTS
import cv2
import numpy as np
from PIL import Image
import requests
from langdetect import detect
import openai
import anthropic
import google.generativeai as genai
from huggingface_hub import InferenceClient

# LangGraph imports
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
from langchain.tools import BaseTool
from langchain.schema import BaseMessage, HumanMessage, AIMessage, SystemMessage

class TaskType(Enum):
    TEXT_GENERATION = "text_generation"
    IMAGE_ANALYSIS = "image_analysis"
    SPEECH_TO_TEXT = "speech_to_text"
    TEXT_TO_SPEECH = "text_to_speech"
    TRANSLATION = "translation"
    SUMMARIZATION = "summarization"
    QUESTION_ANSWERING = "question_answering"
    CODE_GENERATION = "code_generation"
    WEB_SEARCH = "web_search"
    FILE_PROCESSING = "file_processing"

class ModelProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    HUGGINGFACE = "huggingface"
    LOCAL = "local"
    MISTRAL = "mistral"

@dataclass
class AgentState:
    messages: List[BaseMessage]
    current_task: Optional[TaskType] = None
    input_modality: str = "text"  # text, speech, image, multimodal
    detected_language: str = "en"
    user_preferences: Dict = None
    context: Dict = None
    routing_decision: Dict = None
    model_outputs: List[Dict] = None
    final_response: str = ""
    confidence_score: float = 0.0
    execution_time: float = 0.0
    tokens_used: int = 0
    cost: float = 0.0

@dataclass
class LogEntry:
    timestamp: datetime
    session_id: str
    task_type: TaskType
    input_data: Dict
    routing_decision: Dict
    model_used: str
    output: str
    confidence: float
    execution_time: float
    tokens_used: int
    cost: float
    success: bool
    error: Optional[str] = None

class MultimodalAIAgent:
    def __init__(self, config_path: str = "config/agent_config.json"):
        self.config = self.load_config(config_path)
        self.logger = self.setup_logging()
        self.session_logs: List[LogEntry] = []
        
        # Initialize models
        self.models = {}
        self.tokenizers = {}
        self.processors = {}
        
        # Initialize API clients
        self.openai_client = None
        self.anthropic_client = None
        self.gemini_client = None
        self.hf_client = None
        
        # Initialize multimodal components
        self.speech_recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        
        # Memory and context
        self.conversation_memory = []
        self.user_preferences = {}
        self.custom_instructions = ""
        
        # Initialize everything
        asyncio.run(self.initialize_all_components())

    def load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self.get_default_config()

    def get_default_config(self) -> Dict:
        """Default configuration"""
        return {
            "models": {
                "text_generation": {
                    "primary": "gpt-4",
                    "fallback": "mistral-7b-instruct",
                    "local": "microsoft/DialoGPT-medium"
                },
                "image_analysis": {
                    "primary": "gpt-4-vision",
                    "fallback": "blip-image-captioning"
                },
                "speech": {
                    "stt": "whisper-large-v2",
                    "tts": "gtts"
                }
            },
            "routing": {
                "confidence_threshold": 0.8,
                "max_retries": 3,
                "timeout": 30
            },
            "fine_tuning": {
                "enabled": True,
                "lora_config": {
                    "r": 16,
                    "lora_alpha": 32,
                    "target_modules": ["q_proj", "v_proj"],
                    "lora_dropout": 0.1
                }
            },
            "logging": {
                "level": "INFO",
                "file": "logs/agent.log",
                "json_logs": "logs/agent_logs.json"
            }
        }

    def setup_logging(self) -> logging.Logger:
        """Setup logging system"""
        os.makedirs("logs", exist_ok=True)
        
        logger = logging.getLogger("MultimodalAgent")
        logger.setLevel(getattr(logging, self.config["logging"]["level"]))
        
        # File handler
        fh = logging.FileHandler(self.config["logging"]["file"])
        fh.setLevel(logging.INFO)
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        
        logger.addHandler(fh)
        logger.addHandler(ch)
        
        return logger

    async def initialize_all_components(self):
        """Initialize all AI models and components"""
        self.logger.info("Initializing MultimodalAIAgent...")
        
        # Initialize API clients
        await self.initialize_api_clients()
        
        # Initialize local models
        await self.initialize_local_models()
        
        # Initialize multimodal processors
        await self.initialize_multimodal_processors()
        
        # Setup LangGraph workflow
        self.setup_langgraph_workflow()
        
        self.logger.info("MultimodalAIAgent initialized successfully!")

    async def initialize_api_clients(self):
        """Initialize API clients for external models"""
        try:
            if os.getenv("OPENAI_API_KEY"):
                openai.api_key = os.getenv("OPENAI_API_KEY")
                self.openai_client = openai
                
            if os.getenv("ANTHROPIC_API_KEY"):
                self.anthropic_client = anthropic.Anthropic(
                    api_key=os.getenv("ANTHROPIC_API_KEY")
                )
                
            if os.getenv("GOOGLE_API_KEY"):
                genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
                self.gemini_client = genai
                
            if os.getenv("HUGGINGFACE_API_KEY"):
                self.hf_client = InferenceClient(
                    token=os.getenv("HUGGINGFACE_API_KEY")
                )
                
        except Exception as e:
            self.logger.error(f"Error initializing API clients: {e}")

    async def initialize_local_models(self):
        """Initialize local Hugging Face models"""
        try:
            # Text generation model (Mistral/Falcon)
            model_name = "mistralai/Mistral-7B-Instruct-v0.1"
            self.tokenizers["text"] = AutoTokenizer.from_pretrained(model_name)
            self.models["text"] = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16,
                device_map="auto" if torch.cuda.is_available() else None
            )
            
            # Apply LoRA if fine-tuning is enabled
            if self.config["fine_tuning"]["enabled"]:
                lora_config = LoraConfig(
                    task_type=TaskType.CAUSAL_LM,
                    **self.config["fine_tuning"]["lora_config"]
                )
                self.models["text"] = get_peft_model(self.models["text"], lora_config)
                
        except Exception as e:
            self.logger.error(f"Error initializing local models: {e}")

    async def initialize_multimodal_processors(self):
        """Initialize multimodal processors"""
        try:
            # Speech-to-text (Whisper)
            self.processors["whisper"] = WhisperProcessor.from_pretrained("openai/whisper-large-v2")
            self.models["whisper"] = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v2")
            
            # Image analysis (BLIP)
            self.processors["blip"] = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
            self.models["blip"] = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
            
            # Translation pipeline
            self.models["translator"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-mul")
            
        except Exception as e:
            self.logger.error(f"Error initializing multimodal processors: {e}")

    def setup_langgraph_workflow(self):
        """Setup LangGraph workflow for intelligent routing"""
        
        def analyze_input(state: AgentState) -> AgentState:
            """Analyze input and determine task type"""
            if state.messages:
                last_message = state.messages[-1].content
                
                # Detect language
                try:
                    state.detected_language = detect(last_message)
                except:
                    state.detected_language = "en"
                
                # Determine task type based on content
                if "image" in last_message.lower() or "picture" in last_message.lower():
                    state.current_task = TaskType.IMAGE_ANALYSIS
                elif "translate" in last_message.lower():
                    state.current_task = TaskType.TRANSLATION
                elif "summarize" in last_message.lower():
                    state.current_task = TaskType.SUMMARIZATION
                elif "code" in last_message.lower() or "program" in last_message.lower():
                    state.current_task = TaskType.CODE_GENERATION
                else:
                    state.current_task = TaskType.TEXT_GENERATION
                    
            return state

        def route_to_model(state: AgentState) -> AgentState:
            """Route task to appropriate model"""
            routing_decision = self.intelligent_model_routing(
                state.current_task,
                state.detected_language,
                state.messages[-1].content if state.messages else ""
            )
            state.routing_decision = routing_decision
            return state

        def execute_task(state: AgentState) -> AgentState:
            """Execute the task using selected model"""
            try:
                result = asyncio.run(self.execute_with_model(
                    state.routing_decision["model"],
                    state.routing_decision["provider"],
                    state.messages[-1].content if state.messages else "",
                    state.current_task
                ))
                
                state.final_response = result["response"]
                state.confidence_score = result["confidence"]
                state.execution_time = result["execution_time"]
                state.tokens_used = result["tokens_used"]
                state.cost = result["cost"]
                
            except Exception as e:
                state.final_response = f"Error executing task: {str(e)}"
                state.confidence_score = 0.0
                
            return state

        # Create workflow
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("analyze", analyze_input)
        workflow.add_node("route", route_to_model)
        workflow.add_node("execute", execute_task)
        
        # Add edges
        workflow.add_edge("analyze", "route")
        workflow.add_edge("route", "execute")
        workflow.add_edge("execute", END)
        
        # Set entry point
        workflow.set_entry_point("analyze")
        
        # Compile workflow
        self.workflow = workflow.compile()

    def intelligent_model_routing(self, task_type: TaskType, language: str, content: str) -> Dict:
        """Intelligent model routing based on task, language, and content"""
        
        routing_scores = {}
        
        # Score models based on task type
        if task_type == TaskType.CODE_GENERATION:
            routing_scores = {
                "gpt-4": 0.9,
                "claude-3-opus": 0.85,
                "mistral-7b-instruct": 0.7,
                "codellama": 0.95
            }
        elif task_type == TaskType.TRANSLATION:
            routing_scores = {
                "gpt-4": 0.8,
                "gemini-pro": 0.85,
                "opus-mt": 0.9
            }
        elif task_type == TaskType.IMAGE_ANALYSIS:
            routing_scores = {
                "gpt-4-vision": 0.95,
                "gemini-pro-vision": 0.9,
                "blip": 0.7
            }
        else:
            routing_scores = {
                "gpt-4": 0.9,
                "claude-3-opus": 0.85,
                "gemini-pro": 0.8,
                "mistral-7b-instruct": 0.75
            }
        
        # Adjust scores based on language
        if language != "en":
            routing_scores["gemini-pro"] = routing_scores.get("gemini-pro", 0) + 0.1
            routing_scores["gpt-4"] = routing_scores.get("gpt-4", 0) + 0.05
        
        # Adjust scores based on content complexity
        complexity_score = len(content.split()) / 100  # Simple complexity measure
        if complexity_score > 1:
            routing_scores["gpt-4"] = routing_scores.get("gpt-4", 0) + 0.1
            routing_scores["claude-3-opus"] = routing_scores.get("claude-3-opus", 0) + 0.1
        
        # Select best model
        best_model = max(routing_scores.items(), key=lambda x: x[1])
        
        # Determine provider
        provider_map = {
            "gpt-4": ModelProvider.OPENAI,
            "gpt-4-vision": ModelProvider.OPENAI,
            "claude-3-opus": ModelProvider.ANTHROPIC,
            "gemini-pro": ModelProvider.GOOGLE,
            "gemini-pro-vision": ModelProvider.GOOGLE,
            "mistral-7b-instruct": ModelProvider.LOCAL,
            "codellama": ModelProvider.HUGGINGFACE,
            "blip": ModelProvider.LOCAL,
            "opus-mt": ModelProvider.LOCAL
        }
        
        return {
            "model": best_model[0],
            "provider": provider_map.get(best_model[0], ModelProvider.LOCAL),
            "confidence": best_model[1],
            "reasoning": f"Selected {best_model[0]} for {task_type.value} with confidence {best_model[1]}"
        }

    async def process_text_input(self, text: str) -> str:
        """Process text input through the LangGraph workflow"""
        
        # Create initial state
        initial_state = AgentState(
            messages=[HumanMessage(content=text)],
            user_preferences=self.user_preferences,
            context={"custom_instructions": self.custom_instructions}
        )
        
        # Execute workflow
        result = await self.workflow.ainvoke(initial_state)
        
        # Log the interaction
        self.log_interaction(
            input_data={"text": text, "type": "text"},
            result=result
        )
        
        # Update conversation memory
        self.conversation_memory.append({
            "user": text,
            "assistant": result.final_response,
            "timestamp": datetime.now().isoformat(),
            "model_used": result.routing_decision.get("model", "unknown") if result.routing_decision else "unknown"
        })
        
        return result.final_response

    def log_interaction(self, input_data: Dict, result: AgentState):
        """Log interaction to JSON file"""
        log_entry = LogEntry(
            timestamp=datetime.now(),
            session_id=getattr(self, 'session_id', 'default'),
            task_type=result.current_task or TaskType.TEXT_GENERATION,
            input_data=input_data,
            routing_decision=result.routing_decision or {},
            model_used=result.routing_decision.get("model", "unknown") if result.routing_decision else "unknown",
            output=result.final_response,
            confidence=result.confidence_score,
            execution_time=result.execution_time,
            tokens_used=result.tokens_used,
            cost=result.cost,
            success=bool(result.final_response and not result.final_response.startswith("Error"))
        )
        
        self.session_logs.append(log_entry)
        
        # Save to JSON file
        try:
            with open(self.config["logging"]["json_logs"], "a") as f:
                f.write(json.dumps(asdict(log_entry), default=str) + "\n")
        except Exception as e:
            self.logger.error(f"Error saving log: {e}")

    def get_session_stats(self) -> Dict:
        """Get session statistics"""
        if not self.session_logs:
            return {"message": "No interactions yet"}
        
        total_interactions = len(self.session_logs)
        successful_interactions = sum(1 for log in self.session_logs if log.success)
        total_cost = sum(log.cost for log in self.session_logs)
        avg_confidence = sum(log.confidence for log in self.session_logs) / total_interactions
        
        model_usage = {}
        for log in self.session_logs:
            model_usage[log.model_used] = model_usage.get(log.model_used, 0) + 1
        
        return {
            "total_interactions": total_interactions,
            "success_rate": successful_interactions / total_interactions,
            "total_cost": total_cost,
            "average_confidence": avg_confidence,
            "model_usage": model_usage,
            "conversation_length": len(self.conversation_memory)
        }