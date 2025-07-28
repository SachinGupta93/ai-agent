# api/fastapi_server.py
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional, Any, Callable
import asyncio
import json
import logging
import time
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    language: Optional[str] = "en"

class ChatResponse(BaseModel):
    response: str
    session_id: str
    model_used: str
    execution_time: float

def create_app(agent_callback: Callable) -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="Multimodal AI Agent API",
        description="Advanced AI Agent with multi-LLM routing",
        version="1.0.0"
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    logger = logging.getLogger("FastAPI")
    app.state.start_time = time.time()
    app.state.request_count = 0
    
    @app.get("/")
    async def root():
        return {"message": "Multimodal AI Agent API", "version": "1.0.0"}
    
    @app.get("/health")
    async def health_check():
        uptime = time.time() - app.state.start_time
        return {
            "status": "healthy",
            "uptime": uptime,
            "requests_processed": app.state.request_count
        }
    
    @app.post("/chat", response_model=ChatResponse)
    async def chat_endpoint(request: ChatRequest):
        try:
            start_time = time.time()
            app.state.request_count += 1
            
            agent_input = {
                "text": request.message,
                "type": "text",
                "user_context": {"session_id": request.session_id, "language": request.language}
            }
            
            response_text = await agent_callback(agent_input)
            execution_time = time.time() - start_time
            
            return ChatResponse(
                response=response_text,
                session_id=request.session_id,
                model_used="auto-selected",
                execution_time=execution_time
            )
            
        except Exception as e:
            logger.error(f"Chat endpoint error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/upload")
    async def upload_file(file: UploadFile = File(...), session_id: str = Form("default")):
        try:
            file_content = await file.read()
            
            agent_input = {
                "data": file_content,
                "type": "document",
                "filename": file.filename,
                "user_context": {"session_id": session_id}
            }
            
            response_text = await agent_callback(agent_input)
            
            return JSONResponse({
                "success": True,
                "filename": file.filename,
                "analysis": response_text,
                "session_id": session_id
            })
            
        except Exception as e:
            logger.error(f"Upload endpoint error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return app