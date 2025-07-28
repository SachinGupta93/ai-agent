# integrations/telegram_bot.py
import asyncio
import logging
import os
from typing import Dict, Optional
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler, 
    CallbackQueryHandler, ContextTypes, filters
)
import json
from datetime import datetime

class TelegramBot:
    def __init__(self, token: str, agent_callback):
        self.token = token
        self.agent_callback = agent_callback
        self.application = Application.builder().token(token).build()
        self.user_sessions = {}
        self.logger = logging.getLogger("TelegramBot")
        
        # Setup handlers
        self.setup_handlers()

    def setup_handlers(self):
        """Setup bot command and message handlers"""
        
        # Command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("settings", self.settings_command))
        self.application.add_handler(CommandHandler("stats", self.stats_command))
        self.application.add_handler(CommandHandler("clear", self.clear_command))
        
        # Message handlers
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
        self.application.add_handler(MessageHandler(filters.VOICE, self.handle_voice))
        self.application.add_handler(MessageHandler(filters.PHOTO, self.handle_photo))
        self.application.add_handler(MessageHandler(filters.DOCUMENT, self.handle_document))
        
        # Callback query handler
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))

    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        user_id = update.effective_user.id
        username = update.effective_user.username or update.effective_user.first_name
        
        # Initialize user session
        self.user_sessions[user_id] = {
            "username": username,
            "conversation_history": [],
            "preferences": {"language": "en", "voice_enabled": True},
            "created_at": datetime.now().isoformat()
        }
        
        welcome_message = f"""🤖 **Welcome {username}!**

I'm your advanced multimodal AI assistant. I can:
• 💬 Chat and answer questions
• 🔍 Search the web
• 💻 Help with coding
• 🌐 Translate languages
• 📄 Analyze documents
• 🎵 Process voice messages

Send me a message to get started! 🚀"""
        
        keyboard = [
            [InlineKeyboardButton("🔍 Web Search", callback_data="mode_search")],
            [InlineKeyboardButton("💻 Code Help", callback_data="mode_code")],
            [InlineKeyboardButton("⚙️ Settings", callback_data="settings")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(welcome_message, reply_markup=reply_markup, parse_mode='Markdown')

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle text messages"""
        user_id = update.effective_user.id
        message_text = update.message.text
        
        if user_id not in self.user_sessions:
            await self.start_command(update, context)
            return
        
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        
        try:
            response = await self.process_with_agent(user_id, message_text, "text")
            await update.message.reply_text(response, parse_mode='Markdown')
        except Exception as e:
            self.logger.error(f"Error processing message: {e}")
            await update.message.reply_text("Sorry, I encountered an error. Please try again.")

    async def process_with_agent(self, user_id: int, input_data, input_type: str) -> str:
        """Process input through the AI agent"""
        try:
            agent_input = {"text": input_data, "type": input_type}
            response = await self.agent_callback(agent_input)
            
            # Update conversation history
            user_session = self.user_sessions[user_id]
            user_session["conversation_history"].append({
                "input": str(input_data)[:100],
                "response": response[:100],
                "type": input_type,
                "timestamp": datetime.now().isoformat()
            })
            
            return response
        except Exception as e:
            self.logger.error(f"Agent processing error: {e}")
            return "I encountered an error processing your request."

    async def start_bot(self):
        """Start the Telegram bot"""
        self.logger.info("Starting Telegram bot...")
        await self.application.initialize()
        await self.application.start()
        await self.application.updater.start_polling()
        self.logger.info("Telegram bot started successfully!")

    async def stop_bot(self):
        """Stop the Telegram bot"""
        await self.application.updater.stop()
        await self.application.stop()
        await self.application.shutdown()