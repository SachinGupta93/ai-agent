# core/voice_assistant.py
import asyncio
import speech_recognition as sr
from gtts import gTTS
import pygame
import io
import tempfile
import os
import logging
from typing import Optional, Dict, Callable
import threading
import queue
import time
from datetime import datetime

class VoiceAssistant:
    def __init__(self, 
                 wake_word: str = "hey assistant",
                 language: str = "en",
                 voice_speed: float = 1.0,
                 voice_volume: float = 0.8):
        
        self.wake_word = wake_word.lower()
        self.language = language
        self.voice_speed = voice_speed
        self.voice_volume = voice_volume
        
        # Initialize speech recognition
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        
        # Initialize pygame for audio playback
        pygame.mixer.init()
        
        # Voice assistant state
        self.is_listening = False
        self.is_active = False
        self.audio_queue = queue.Queue()
        self.response_callback: Optional[Callable] = None
        
        # Logging
        self.logger = logging.getLogger("VoiceAssistant")
        
        # Calibrate microphone
        self.calibrate_microphone()

    def calibrate_microphone(self):
        """Calibrate microphone for ambient noise"""
        try:
            with self.microphone as source:
                self.logger.info("Calibrating microphone for ambient noise...")
                self.recognizer.adjust_for_ambient_noise(source, duration=2)
                self.logger.info("Microphone calibrated successfully")
        except Exception as e:
            self.logger.error(f"Microphone calibration failed: {e}")

    def set_response_callback(self, callback: Callable[[str], str]):
        """Set callback function to handle voice commands"""
        self.response_callback = callback

    async def start_listening(self):
        """Start continuous listening for wake word and commands"""
        self.is_active = True
        self.logger.info(f"Voice assistant started. Wake word: '{self.wake_word}'")
        
        # Start listening thread
        listen_thread = threading.Thread(target=self._continuous_listen, daemon=True)
        listen_thread.start()
        
        # Start audio processing thread
        audio_thread = threading.Thread(target=self._process_audio_queue, daemon=True)
        audio_thread.start()
        
        return listen_thread, audio_thread

    def stop_listening(self):
        """Stop voice assistant"""
        self.is_active = False
        self.is_listening = False
        self.logger.info("Voice assistant stopped")

    def _continuous_listen(self):
        """Continuously listen for wake word and commands"""
        while self.is_active:
            try:
                with self.microphone as source:
                    # Listen for audio
                    self.logger.debug("Listening for wake word...")
                    audio = self.recognizer.listen(source, timeout=1, phrase_time_limit=5)
                    
                    # Add to processing queue
                    self.audio_queue.put(("wake_word_check", audio))
                    
            except sr.WaitTimeoutError:
                # Timeout is normal, continue listening
                continue
            except Exception as e:
                self.logger.error(f"Listening error: {e}")
                time.sleep(1)

    def _process_audio_queue(self):
        """Process audio from the queue"""
        while self.is_active:
            try:
                if not self.audio_queue.empty():
                    audio_type, audio = self.audio_queue.get(timeout=1)
                    
                    if audio_type == "wake_word_check":
                        self._check_wake_word(audio)
                    elif audio_type == "command":
                        self._process_command(audio)
                        
            except queue.Empty:
                continue
            except Exception as e:
                self.logger.error(f"Audio processing error: {e}")

    def _check_wake_word(self, audio):
        """Check if audio contains wake word"""
        try:
            # Use faster recognition for wake word detection
            text = self.recognizer.recognize_google(audio, language=self.language).lower()
            self.logger.debug(f"Heard: {text}")
            
            if self.wake_word in text:
                self.logger.info("Wake word detected!")
                self._handle_wake_word_detected()
                
        except sr.UnknownValueError:
            # Could not understand audio
            pass
        except sr.RequestError as e:
            self.logger.error(f"Speech recognition error: {e}")

    def _handle_wake_word_detected(self):
        """Handle wake word detection"""
        self.is_listening = True
        
        # Play acknowledgment sound
        asyncio.create_task(self.speak("Yes, I'm listening"))
        
        # Listen for command
        self._listen_for_command()

    def _listen_for_command(self):
        """Listen for user command after wake word"""
        try:
            with self.microphone as source:
                self.logger.info("Listening for command...")
                
                # Give user time to speak
                audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=10)
                self.audio_queue.put(("command", audio))
                
        except sr.WaitTimeoutError:
            asyncio.create_task(self.speak("I didn't hear anything. Try again."))
            self.is_listening = False
        except Exception as e:
            self.logger.error(f"Command listening error: {e}")
            self.is_listening = False

    def _process_command(self, audio):
        """Process voice command"""
        try:
            # Convert speech to text
            command_text = self.recognizer.recognize_google(audio, language=self.language)
            self.logger.info(f"Command received: {command_text}")
            
            # Process command through callback
            if self.response_callback:
                response = self.response_callback(command_text)
                asyncio.create_task(self.speak(response))
            else:
                asyncio.create_task(self.speak("I heard you, but I don't know how to respond yet."))
                
        except sr.UnknownValueError:
            asyncio.create_task(self.speak("Sorry, I couldn't understand what you said."))
        except sr.RequestError as e:
            self.logger.error(f"Speech recognition error: {e}")
            asyncio.create_task(self.speak("Sorry, there was an error processing your request."))
        finally:
            self.is_listening = False

    async def speak(self, text: str, language: Optional[str] = None):
        """Convert text to speech and play it"""
        try:
            lang = language or self.language
            
            # Create TTS
            tts = gTTS(text=text, lang=lang, slow=False)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
                tts.save(tmp_file.name)
                tmp_filename = tmp_file.name
            
            # Play audio
            pygame.mixer.music.load(tmp_filename)
            pygame.mixer.music.set_volume(self.voice_volume)
            pygame.mixer.music.play()
            
            # Wait for playback to finish
            while pygame.mixer.music.get_busy():
                await asyncio.sleep(0.1)
            
            # Clean up temporary file
            os.unlink(tmp_filename)
            
            self.logger.info(f"Spoke: {text}")
            
        except Exception as e:
            self.logger.error(f"Text-to-speech error: {e}")

    async def listen_once(self, timeout: int = 5) -> Optional[str]:
        """Listen for a single command (non-continuous mode)"""
        try:
            with self.microphone as source:
                self.logger.info("Listening for single command...")
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=10)
                
                # Convert to text
                text = self.recognizer.recognize_google(audio, language=self.language)
                self.logger.info(f"Heard: {text}")
                return text
                
        except sr.WaitTimeoutError:
            self.logger.warning("Listen timeout")
            return None
        except sr.UnknownValueError:
            self.logger.warning("Could not understand audio")
            return None
        except sr.RequestError as e:
            self.logger.error(f"Speech recognition error: {e}")
            return None

    def get_available_microphones(self) -> Dict[int, str]:
        """Get list of available microphones"""
        microphones = {}
        for index, name in enumerate(sr.Microphone.list_microphone_names()):
            microphones[index] = name
        return microphones

    def set_microphone(self, device_index: int):
        """Set specific microphone device"""
        try:
            self.microphone = sr.Microphone(device_index=device_index)
            self.calibrate_microphone()
            self.logger.info(f"Microphone set to device {device_index}")
        except Exception as e:
            self.logger.error(f"Failed to set microphone: {e}")

    def adjust_recognition_settings(self, 
                                  energy_threshold: Optional[int] = None,
                                  dynamic_energy_threshold: Optional[bool] = None,
                                  pause_threshold: Optional[float] = None):
        """Adjust speech recognition settings"""
        if energy_threshold is not None:
            self.recognizer.energy_threshold = energy_threshold
            
        if dynamic_energy_threshold is not None:
            self.recognizer.dynamic_energy_threshold = dynamic_energy_threshold
            
        if pause_threshold is not None:
            self.recognizer.pause_threshold = pause_threshold
            
        self.logger.info("Recognition settings updated")

    async def test_voice_system(self):
        """Test the voice system"""
        self.logger.info("Testing voice system...")
        
        # Test TTS
        await self.speak("Voice system test. Can you hear me?")
        
        # Test STT
        await self.speak("Please say something for the speech recognition test.")
        result = await self.listen_once(timeout=10)
        
        if result:
            await self.speak(f"I heard you say: {result}")
            return True
        else:
            await self.speak("I couldn't hear you clearly.")
            return False

    def get_voice_stats(self) -> Dict:
        """Get voice assistant statistics"""
        return {
            "is_active": self.is_active,
            "is_listening": self.is_listening,
            "wake_word": self.wake_word,
            "language": self.language,
            "voice_volume": self.voice_volume,
            "microphone_info": str(self.microphone),
            "energy_threshold": self.recognizer.energy_threshold,
            "dynamic_energy_threshold": self.recognizer.dynamic_energy_threshold
        }

class VoiceCommandProcessor:
    """Process and route voice commands"""
    
    def __init__(self, agent_callback: Callable[[str], str]):
        self.agent_callback = agent_callback
        self.logger = logging.getLogger("VoiceCommandProcessor")
        
        # Built-in voice commands
        self.voice_commands = {
            "stop listening": self._stop_listening,
            "what time is it": self._get_time,
            "what's the date": self._get_date,
            "volume up": self._volume_up,
            "volume down": self._volume_down,
            "repeat that": self._repeat_last,
            "clear conversation": self._clear_conversation
        }
        
        self.last_response = ""
        self.conversation_history = []

    def process_command(self, command: str) -> str:
        """Process voice command and return response"""
        command_lower = command.lower().strip()
        
        # Check for built-in commands first
        for trigger, handler in self.voice_commands.items():
            if trigger in command_lower:
                return handler(command)
        
        # Route to main agent
        try:
            response = self.agent_callback(command)
            self.last_response = response
            
            # Add to conversation history
            self.conversation_history.append({
                "command": command,
                "response": response,
                "timestamp": datetime.now().isoformat()
            })
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing command: {e}")
            return "Sorry, I encountered an error processing your request."

    def _stop_listening(self, command: str) -> str:
        """Stop voice assistant"""
        return "Stopping voice assistant. Goodbye!"

    def _get_time(self, command: str) -> str:
        """Get current time"""
        current_time = datetime.now().strftime("%I:%M %p")
        return f"The current time is {current_time}"

    def _get_date(self, command: str) -> str:
        """Get current date"""
        current_date = datetime.now().strftime("%A, %B %d, %Y")
        return f"Today is {current_date}"

    def _volume_up(self, command: str) -> str:
        """Increase volume"""
        # This would need to be implemented based on system
        return "Volume increased"

    def _volume_down(self, command: str) -> str:
        """Decrease volume"""
        # This would need to be implemented based on system
        return "Volume decreased"

    def _repeat_last(self, command: str) -> str:
        """Repeat last response"""
        if self.last_response:
            return f"I said: {self.last_response}"
        else:
            return "I haven't said anything yet."

    def _clear_conversation(self, command: str) -> str:
        """Clear conversation history"""
        self.conversation_history.clear()
        return "Conversation history cleared."

# Example usage
async def main():
    # Create voice assistant
    voice_assistant = VoiceAssistant(wake_word="hey assistant")
    
    # Create command processor
    def dummy_agent_callback(command: str) -> str:
        return f"You said: {command}. This is a test response."
    
    command_processor = VoiceCommandProcessor(dummy_agent_callback)
    voice_assistant.set_response_callback(command_processor.process_command)
    
    # Test voice system
    test_result = await voice_assistant.test_voice_system()
    print(f"Voice system test: {'Passed' if test_result else 'Failed'}")
    
    # Start listening (in a real application)
    # await voice_assistant.start_listening()
    
    # Keep running
    # try:
    #     while True:
    #         await asyncio.sleep(1)
    # except KeyboardInterrupt:
    #     voice_assistant.stop_listening()
    #     print("Voice assistant stopped")

if __name__ == "__main__":
    asyncio.run(main())